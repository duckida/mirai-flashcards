/**
 * Classifier Service
 * Handles AI classification of flashcards into topic modules using Vercel AI Gateway
 */

import { gateway, generateText } from 'ai';

/**
 * @typedef {Object} ModuleAssignment
 * @property {string} moduleName - Name of the matched or suggested module
 * @property {string} action - 'existing' if matched existing module, 'new' if creating new
 * @property {number} confidence - 0-1 confidence score
 * @property {string} [reason] - Explanation for the assignment
 */

/**
 * @typedef {Object} ClassificationResult
 * @property {boolean} success
 * @property {ModuleAssignment} [assignment]
 * @property {string} [error]
 */

/**
 * Configuration for AI classification via Vercel AI Gateway
 */
const CLASSIFICATION_CONFIG = {
  model: process.env.CLASSIFICATION_MODEL || 'alibaba/qwen3-vl-instruct',
  maxTokens: 1024,
};

/**
 * Builds the classification system prompt
 * @param {string[]} existingModuleNames - List of existing module names
 * @returns {string}
 */
function buildSystemPrompt(existingModuleNames) {
  let prompt = `You are an expert educational content classifier. Your task is to categorize flashcards into top-level subject modules.

Given a flashcard's content, determine the most appropriate top-level subject module.

Guidelines:
1. Always classify by broad, top-level subject area — NOT by sub-topic or chapter
2. Use these common top-level categories when applicable: Biology, Chemistry, Physics, Mathematics, Computer Science, English, History, Geography, Economics, Psychology, Philosophy, Art, Music, Literature, Engineering, Medicine, Law, Political Science, Sociology, Statistics, Astronomy, Environmental Science
3. For language learning, use just the language name (e.g., "Spanish", "French", "Japanese")
4. Match existing modules when the top-level subject clearly aligns
5. Only create a new module if no existing module covers the same top-level subject
6. NEVER use sub-fields or specific topics as module names (e.g., do NOT use "Cell Biology", "Organic Chemistry", "Linear Algebra" — use "Biology", "Chemistry", "Mathematics" instead)

Respond ONLY with valid JSON in this exact format, no other text:
{"moduleName":"...","action":"existing or new","confidence":0.0-1.0,"reason":"..."}`;

  if (existingModuleNames.length > 0) {
    prompt += `\n\nExisting modules in this user's account:\n${existingModuleNames.map(n => `- ${n}`).join('\n')}\n\nIf the flashcard clearly fits one of these existing modules, set action to "existing" and use that module name. If it doesn't fit well, set action to "new" and suggest a new module name.`;
  } else {
    prompt += '\n\nThis user has no existing modules yet. Set action to "new" and suggest an appropriate module name.';
  }

  return prompt;
}

/**
 * Classifies a single flashcard into a module
 * @param {Object} flashcard - The flashcard to classify
 * @param {string} [flashcard.content] - Raw text content (from OCR scan)
 * @param {string} [flashcard.question] - The question text
 * @param {string} [flashcard.answer] - The answer text
 * @param {string[]} [existingModuleNames=[]] - Names of existing modules
 * @returns {Promise<ClassificationResult>}
 */
async function classifyFlashcard(flashcard, existingModuleNames = []) {
  try {
    const contentText = flashcard.content || flashcard.question || '';
    console.log('Classifying flashcard:', contentText.substring(0, 80) + '...');

    const systemPrompt = buildSystemPrompt(existingModuleNames);

    const hasQA = flashcard.question && flashcard.answer;
    const userPrompt = hasQA
      ? `Classify this flashcard into the most appropriate module:

Question: "${flashcard.question}"
Answer: "${flashcard.answer}"`
      : `Classify this flashcard content into the most appropriate top-level subject module:

Content: "${contentText}"`;

    const { text } = await generateText({
      model: gateway(CLASSIFICATION_CONFIG.model),
      system: systemPrompt,
      prompt: userPrompt,
    });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in classifier response:', text);
      return { success: false, error: 'Classifier returned invalid response' };
    }

    const object = JSON.parse(jsonMatch[0]);

    if (!object.moduleName || !object.action) {
      console.error('Missing fields in classifier response:', object);
      return { success: false, error: 'Classifier returned incomplete response' };
    }

    console.log(`Classified as: "${object.moduleName}" (${object.action}, confidence: ${object.confidence})`);

    return {
      success: true,
      assignment: {
        moduleName: object.moduleName,
        action: object.action,
        confidence: Math.min(Math.max(object.confidence, 0), 1),
        reason: object.reason,
      },
    };

  } catch (error) {
    console.error('Classification failed:', error);

    if (error.message.includes('API key') || error.message.includes('configured')) {
      return { success: false, error: 'Classification service is not configured. Please check your AI_GATEWAY_API_KEY environment variable.' };
    } else if (error.message.includes('rate limit')) {
      return { success: false, error: 'Classification rate limit exceeded. Please try again in a moment.' };
    }

    return { success: false, error: `Classification failed: ${error.message}` };
  }
}

/**
 * Classifies multiple flashcards in batch
 * @param {Array<{question: string, answer: string}>} flashcards
 * @param {string[]} [existingModuleNames=[]]
 * @returns {Promise<ClassificationResult[]>}
 */
async function batchClassifyFlashcards(flashcards, existingModuleNames = []) {
  const results = [];
  let updatedModules = [...existingModuleNames];

  for (const flashcard of flashcards) {
    const result = await classifyFlashcard(flashcard, updatedModules);
    results.push(result);

    if (result.success && result.assignment.action === 'new') {
      updatedModules.push(result.assignment.moduleName);
    }
  }

  return results;
}

/**
 * Finds the best matching module for a flashcard from existing modules
 * @param {Object} flashcard - The flashcard to match
 * @param {Array<{id: string, name: string}>} modules - Existing modules with IDs
 * @returns {Promise<{moduleId: string | null, moduleName: string, confidence: number, shouldCreateNew: boolean}>}
 */
async function findMatchingModule(flashcard, modules) {
  const moduleNames = modules.map(m => m.name);
  const result = await classifyFlashcard(flashcard, moduleNames);

  if (!result.success) {
    return { moduleId: null, moduleName: 'Uncategorized', confidence: 0, shouldCreateNew: true };
  }

  if (result.assignment.action === 'existing') {
    const matchedModule = modules.find(m => m.name === result.assignment.moduleName);
    if (matchedModule) {
      return {
        moduleId: matchedModule.id,
        moduleName: matchedModule.name,
        confidence: result.assignment.confidence,
        shouldCreateNew: false,
      };
    }
  }

  return {
    moduleId: null,
    moduleName: result.assignment.moduleName,
    confidence: result.assignment.confidence,
    shouldCreateNew: true,
  };
}

/**
 * Checks if the classification service is properly configured
 * @returns {{ configured: boolean, model: string }}
 */
function checkConfiguration() {
  return {
    configured: true,
    model: CLASSIFICATION_CONFIG.model,
  };
}

export {
  classifyFlashcard,
  batchClassifyFlashcards,
  findMatchingModule,
  checkConfiguration,
  CLASSIFICATION_CONFIG,
};

export default {
  classifyFlashcard,
  batchClassifyFlashcards,
  findMatchingModule,
  checkConfiguration,
  CLASSIFICATION_CONFIG,
};
