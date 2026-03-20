/**
 * Scanner Service
 * Handles AI vision extraction of Q&A pairs from images using Vercel AI Gateway
 */

import { gateway, generateText } from 'ai';

/**
 * @typedef {Object} ExtractedFlashcard
 * @property {string} question
 * @property {string} answer
 * @property {number} confidence - 0-1
 * @property {string} sourceImageUrl
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid
 * @property {string[]} errors
 * @property {ExtractedFlashcard[]} validFlashcards
 */

/**
 * Configuration for Vercel AI Gateway
 */
const GATEWAY_CONFIG = {
  model: process.env.VISION_MODEL || 'openai/gpt-4o',
  maxTokens: 4096,
};

/**
 * System prompt for flashcard extraction
 */
const EXTRACTION_PROMPT = `You are an expert at extracting educational content from images of notes.
Your task is to identify question and answer pairs from the provided image.

Guidelines:
1. Look for clear question/answer pairs, definitions, or concepts
2. Each flashcard should have a clear question and a corresponding answer
3. Ignore irrelevant text, headers, page numbers, or decorative elements
4. If text appears in bullet points or lists, extract each as a separate flashcard
5. For definitions: question = "What is [term]?", answer = definition
6. For concepts: question = "Explain [concept]", answer = explanation
7. For facts: question = "What is [fact]?", answer = the fact

Return the extracted flashcards in JSON format with the following structure:
{
  "flashcards": [
    {
      "question": "The question text",
      "answer": "The answer text",
      "confidence": 0.9
    }
  ]
}

Only return valid JSON.`;

/**
 * Extracts flashcards from an image using AI vision via Vercel AI Gateway
 * @param {string} imageUrl - URL of the image to analyze
 * @returns {Promise<ExtractedFlashcard[]>} - Array of extracted flashcards
 */
async function extractFlashcards(imageUrl) {
  try {
    console.log('Starting flashcard extraction from:', imageUrl);

    const { text } = await generateText({
      model: gateway(GATEWAY_CONFIG.model),
      prompt: EXTRACTION_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract flashcards from this image:' },
            { type: 'image', image: new URL(imageUrl) },
          ],
        },
      ],
      maxTokens: GATEWAY_CONFIG.maxTokens,
    });

    console.log('AI response received:', text.substring(0, 200) + '...');

    // Parse the JSON response
    let parsedResponse;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        parsedResponse = JSON.parse(text);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw response:', text);
      throw new Error('Failed to parse AI response. The model may have returned invalid JSON.');
    }

    // Validate and transform the response
    if (!parsedResponse.flashcards || !Array.isArray(parsedResponse.flashcards)) {
      throw new Error('Invalid response format: missing flashcards array');
    }

    const extractedFlashcards = parsedResponse.flashcards.map((card, index) => ({
      question: card.question?.trim() || `Question ${index + 1}`,
      answer: card.answer?.trim() || `Answer ${index + 1}`,
      confidence: Math.min(Math.max(card.confidence || 0.7, 0), 1),
      sourceImageUrl: imageUrl,
    }));

    console.log(`Extracted ${extractedFlashcards.length} flashcards`);
    return extractedFlashcards;

  } catch (error) {
    console.error('Flashcard extraction failed:', error);

    if (error.message.includes('API key') || error.message.includes('configured')) {
      throw new Error('AI Vision API is not properly configured. Please check your AI_GATEWAY_API_KEY environment variable.');
    } else if (error.message.includes('rate limit')) {
      throw new Error('AI Vision API rate limit exceeded. Please try again in a moment.');
    } else if (error.message.includes('parse')) {
      throw new Error('Failed to process the image content. The AI model returned an unexpected response.');
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      throw new Error('Network error while communicating with AI Vision service. Please check your connection.');
    }

    throw new Error(`Flashcard extraction failed: ${error.message}`);
  }
}

/**
 * Validates extracted flashcards
 * @param {ExtractedFlashcard[]} flashcards - Array of extracted flashcards
 * @returns {ValidationResult} - Validation result
 */
function validateExtraction(flashcards) {
  const errors = [];
  const validFlashcards = [];

  if (!flashcards || !Array.isArray(flashcards)) {
    errors.push('No flashcards provided for validation');
    return { isValid: false, errors, validFlashcards };
  }

  if (flashcards.length === 0) {
    errors.push('No flashcards were extracted from the image');
    return { isValid: false, errors, validFlashcards };
  }

  flashcards.forEach((card, index) => {
    const cardErrors = [];

    if (!card.question || card.question.trim().length === 0) {
      cardErrors.push('Question is empty');
    } else if (card.question.trim().length < 3) {
      cardErrors.push('Question is too short (minimum 3 characters)');
    }

    if (!card.answer || card.answer.trim().length === 0) {
      cardErrors.push('Answer is empty');
    } else if (card.answer.trim().length < 3) {
      cardErrors.push('Answer is too short (minimum 3 characters)');
    }

    if (typeof card.confidence !== 'number' || card.confidence < 0 || card.confidence > 1) {
      cardErrors.push('Invalid confidence score (must be between 0 and 1)');
    }

    const isDuplicate = validFlashcards.some(
      existingCard =>
        existingCard.question.toLowerCase() === card.question.toLowerCase() ||
        existingCard.answer.toLowerCase() === card.answer.toLowerCase()
    );

    if (isDuplicate) {
      cardErrors.push('Duplicate content detected');
    }

    if (cardErrors.length === 0) {
      validFlashcards.push(card);
    } else {
      errors.push(`Flashcard ${index + 1}: ${cardErrors.join(', ')}`);
    }
  });

  if (validFlashcards.length > 0) {
    console.log(`Validation: ${validFlashcards.length} valid, ${errors.length} invalid flashcards`);
  }

  return { isValid: validFlashcards.length > 0, errors, validFlashcards };
}

/**
 * Filters flashcards by confidence threshold
 * @param {ExtractedFlashcard[]} flashcards - Array of extracted flashcards
 * @param {number} threshold - Minimum confidence score (0-1)
 * @returns {ExtractedFlashcard[]} - Filtered flashcards
 */
function filterByConfidence(flashcards, threshold = 0.5) {
  return flashcards.filter(card => card.confidence >= threshold);
}

/**
 * Main function to process an image and extract validated flashcards
 * @param {string} imageUrl - URL of the image to process
 * @param {Object} options - Processing options
 * @param {number} options.confidenceThreshold - Minimum confidence score (default: 0.5)
 * @returns {Promise<{success: boolean, flashcards?: ExtractedFlashcard[], error?: string, validation?: ValidationResult}>}
 */
async function processImage(imageUrl, options = {}) {
  const confidenceThreshold = options.confidenceThreshold || 0.5;

  try {
    const extractedFlashcards = await extractFlashcards(imageUrl);

    const filteredFlashcards = filterByConfidence(extractedFlashcards, confidenceThreshold);

    if (filteredFlashcards.length === 0) {
      return {
        success: false,
        error: `No flashcards met the confidence threshold of ${confidenceThreshold}. Highest confidence: ${Math.max(...extractedFlashcards.map(c => c.confidence))}`,
        validation: { isValid: false, errors: ['No high-confidence flashcards found'], validFlashcards: [] }
      };
    }

    const validation = validateExtraction(filteredFlashcards);

    if (!validation.isValid && validation.validFlashcards.length === 0) {
      return {
        success: false,
        error: 'No valid flashcards could be extracted from the image.',
        validation
      };
    }

    return {
      success: true,
      flashcards: validation.validFlashcards,
      validation,
      stats: {
        totalExtracted: extractedFlashcards.length,
        afterConfidenceFilter: filteredFlashcards.length,
        afterValidation: validation.validFlashcards.length,
        averageConfidence: validation.validFlashcards.reduce((sum, card) => sum + card.confidence, 0) / validation.validFlashcards.length
      }
    };

  } catch (error) {
    console.error('Image processing failed:', error);
    return {
      success: false,
      error: error.message,
      validation: { isValid: false, errors: [error.message], validFlashcards: [] }
    };
  }
}

/**
 * Batch process multiple images
 * @param {string[]} imageUrls - Array of image URLs to process
 * @param {Object} options - Processing options
 * @returns {Promise<Array<{imageUrl: string, result: any}>>}
 */
async function batchProcessImages(imageUrls, options = {}) {
  const results = [];

  for (const imageUrl of imageUrls) {
    try {
      const result = await processImage(imageUrl, options);
      results.push({ imageUrl, result });
    } catch (error) {
      results.push({ imageUrl, result: { success: false, error: error.message } });
    }
  }

  return results;
}

export {
  extractFlashcards,
  validateExtraction,
  filterByConfidence,
  processImage,
  batchProcessImages,
  GATEWAY_CONFIG,
};

export default {
  extractFlashcards,
  validateExtraction,
  filterByConfidence,
  processImage,
  batchProcessImages,
  GATEWAY_CONFIG,
};
