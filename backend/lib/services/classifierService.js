/**
 * Classifier Service
 * Handles AI classification of flashcards into topic modules using Vercel AI Gateway
 */

import { gateway, generateObject } from 'ai';
import { z } from 'zod';

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
  model: process.env.CLASSIFICATION_MODEL || 'openai/gpt-4o',
  maxTokens: 1024,
};

/**
 * Zod schema for classification response
 */
const classificationSchema = z.object({
  moduleName: z.string().describe('The topic or module name that best categorizes this flashcard'),
  action: z.enum(['existing', 'new']).describe('"existing" if a matching module already exists, "new" if a new module should be created'),
  confidence: z.number().min(0).max(1).describe('Confidence score between 0 and 1'),
  reason: z.string().describe('Brief explanation for why this module was chosen'),
});

/**
 * Builds the classification system prompt
 * @param {string[]} existingModuleNames - List of existing module names
 * @returns {string}
 */
function buildSystemPrompt(existingModuleNames) {
  let prompt = `You are an expert educational content classifier. Your task is to categorize flashcards into topic modules.

Given a flashcard's question and answer, determine the most appropriate topic module.

Guidelines:
1. Use concise, clear module names (2-5 words)
2. Match existing modules when the topic clearly aligns
3. Create new modules when the topic is genuinely distinct
4. Be specific enough to group related cards, but broad enough to be useful
5. For scientific topics, use the specific field (e.g., "Cell Biology", "Organic Chemistry")
6. For language learning, use the language and skill area (e.g., "Spanish Vocabulary", "French Grammar")`;

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
 * @param {string} flashcard.question - The question text
 * @param {string} flashcard.answer - The answer text
 * @param {string[]} [existingModuleNames=[]] - Names of existing modules
 * @returns {Promise<ClassificationResult>}
 */
async function classifyFlashcard(flashcard, existingModuleNames = []) {
  try {
    console.log('Classifying flashcard:', flashcard.question?.substring(0, 80) + '...');

    const systemPrompt = buildSystemPrompt(existingModuleNames);

    const { object } = await generateObject({
      model: gateway(CLASSIFICATION_CONFIG.model),
      system: systemPrompt,
      prompt: `Classify this flashcard into the most appropriate module:

Question: "${flashcard.question}"
Answer: "${flashcard.answer}"`,
      schema: classificationSchema,
    });

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
