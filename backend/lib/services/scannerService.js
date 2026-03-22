/**
 * Scanner Service
 * Handles OCR extraction of raw text content from flashcard images
 */

import { gateway, generateText } from 'ai';

/**
 * @typedef {Object} ExtractedContent
 * @property {string} content - Raw OCR text from the card with drawing descriptions
 * @property {string[]} drawingDescriptions - Brief descriptions of any drawings/diagrams
 * @property {number} confidence - 0-1
 * @property {string} sourceImageUrl
 */

/**
 * Configuration for Vercel AI Gateway
 */
const GATEWAY_CONFIG = {
  model: process.env.VISION_MODEL || 'alibaba/qwen3-vl-instruct',
  maxTokens: 4096,
};

/**
 * System prompt for raw OCR extraction with drawing descriptions
 */
const OCR_PROMPT = `You are an OCR system. Your task is to extract ALL visible text AND describe any drawings/diagrams from this image of a flashcard.

CRITICAL RULES:
1. Extract EVERY piece of text exactly as written
2. Preserve the original formatting, line breaks, and structure
3. For any drawings, diagrams, charts, or visual elements: include a brief description in brackets like [Drawing: description]
4. Do NOT interpret, rephrase, summarize, or reorganize the content
5. Do NOT add any text that isn't in the image
6. Do NOT create questions or answers - just extract raw content
7. Ignore decorative borders, stains, or non-content graphics

Return ONLY the extracted content in JSON format:
{
  "content": "all the raw text from the card, with drawing descriptions in [brackets]",
  "drawingDescriptions": ["Brief description of each drawing/diagram found"],
  "confidence": 0.9
}

Only return valid JSON.`;

/**
 * Extracts raw OCR text from an image
 * @param {string} imageUrl - URL of the image to analyze
 * @returns {Promise<ExtractedContent>} - Extracted content
 */
async function extractContent(imageUrl) {
  try {
    console.log('Starting OCR extraction from:', imageUrl);

    const { text } = await generateText({
      model: gateway(GATEWAY_CONFIG.model),
      messages: [
        {
          role: 'system',
          content: OCR_PROMPT,
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract all text from this flashcard image:' },
            { type: 'image', image: new URL(imageUrl) },
          ],
        },
      ],
      maxTokens: GATEWAY_CONFIG.maxTokens,
    });

    console.log('OCR response received:', text.substring(0, 200) + '...');

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
      console.error('Failed to parse OCR response:', parseError);
      console.error('Raw response:', text);
      throw new Error('Failed to parse OCR response.');
    }

    const extractedContent = {
      content: parsedResponse.content?.trim() || '',
      drawingDescriptions: parsedResponse.drawingDescriptions || [],
      confidence: Math.min(Math.max(parsedResponse.confidence || 0.7, 0), 1),
      sourceImageUrl: imageUrl,
    };

    if (!extractedContent.content) {
      throw new Error('No text content was extracted from the image');
    }

    console.log(`Extracted ${extractedContent.content.length} characters, ${extractedContent.drawingDescriptions.length} drawings`);
    return extractedContent;

  } catch (error) {
    console.error('OCR extraction failed:', error);

    if (error.message.includes('API key') || error.message.includes('configured')) {
      throw new Error('AI Vision API is not properly configured.');
    } else if (error.message.includes('rate limit')) {
      throw new Error('AI Vision API rate limit exceeded.');
    }

    throw new Error(`OCR extraction failed: ${error.message}`);
  }
}

/**
 * Validates extracted content
 * @param {ExtractedContent} content - Extracted content
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateContent(content) {
  const errors = [];

  if (!content || !content.content) {
    errors.push('No content extracted');
    return { isValid: false, errors };
  }

  if (content.content.trim().length < 3) {
    errors.push('Extracted content is too short');
  }

  if (typeof content.confidence !== 'number' || content.confidence < 0 || content.confidence > 1) {
    errors.push('Invalid confidence score');
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Main function to process an image and extract raw text content
 * @param {string} imageUrl - URL of the image to process
 * @param {Object} options - Processing options
 * @param {number} options.confidenceThreshold - Minimum confidence score (default: 0.3)
 * @returns {Promise<{success: boolean, flashcards?: ExtractedContent[], error?: string}>}
 */
async function processImage(imageUrl, options = {}) {
  const confidenceThreshold = options.confidenceThreshold || 0.3;

  try {
    const extractedContent = await extractContent(imageUrl);

    if (extractedContent.confidence < confidenceThreshold) {
      return {
        success: false,
        error: `Content confidence (${extractedContent.confidence}) below threshold (${confidenceThreshold})`,
      };
    }

    const validation = validateContent(extractedContent);

    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    return {
      success: true,
      flashcards: [extractedContent],
    };

  } catch (error) {
    console.error('Image processing failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export {
  extractContent,
  validateContent,
  processImage,
  GATEWAY_CONFIG,
};

export default {
  extractContent,
  validateContent,
  processImage,
  GATEWAY_CONFIG,
};
