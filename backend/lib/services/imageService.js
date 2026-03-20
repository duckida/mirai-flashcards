/**
 * Image Service
 * Handles AI image generation for quiz questions using Vercel AI Gateway
 */

import { openai } from '@ai-sdk/openai';
import { generateImage } from 'ai';

/**
 * @typedef {Object} GeneratedImage
 * @property {string} url - Base64 data URL of the generated image
 * @property {string} prompt - The prompt used to generate the image
 * @property {string} questionId - The question ID this image was generated for
 */

/**
 * @typedef {Object} ImageGenerationResult
 * @property {boolean} success
 * @property {GeneratedImage} [image]
 * @property {string} [error]
 */

/**
 * Configuration for AI image generation via Vercel AI Gateway
 */
const IMAGE_CONFIG = {
  model: process.env.IMAGE_GENERATION_MODEL || 'dall-e-3',
  size: '1024x1024',
  quality: 'standard',
};

/**
 * Creates the image model client routed through Vercel AI Gateway
 * @returns {import('ai').ImageModel}
 */
function getImageModel() {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  const baseURL = process.env.AI_GATEWAY_BASE_URL;

  const providerOptions = apiKey ? { apiKey } : {};
  if (baseURL) {
    providerOptions.baseURL = baseURL;
  }

  const provider = openai(providerOptions);
  return provider.image(IMAGE_CONFIG.model);
}

/**
 * Builds an image generation prompt from a quiz question and module context
 * @param {string} question - The quiz question text
 * @param {string} [context] - Additional context (module topic, answer hints)
 * @returns {string} - The formatted prompt for image generation
 */
function buildImagePrompt(question, context) {
  let prompt = `Create an educational, visually clear illustration that helps explain the concept related to this question: "${question}"`;
  if (context) {
    prompt += ` Context: ${context}`;
  }
  prompt += ' The image should be educational, clear, and suitable for a study flashcard app. Use simple, clean visual style.';
  return prompt;
}

/**
 * Generates an image for a quiz question
 * @param {string} question - The quiz question text
 * @param {Object} [options] - Generation options
 * @param {string} [options.context] - Additional context (module topic)
 * @param {string} [options.questionId] - Question ID for tracking
 * @param {string} [options.size] - Image size (e.g., '1024x1024')
 * @param {string} [options.quality] - Image quality ('standard' or 'hd')
 * @returns {Promise<ImageGenerationResult>}
 */
async function generateQuizImage(question, options = {}) {
  try {
    const prompt = buildImagePrompt(question, options.context);
    console.log('Generating image for question:', question.substring(0, 80) + '...');

    const model = getImageModel();

    const result = await generateImage({
      model,
      prompt,
      size: options.size || IMAGE_CONFIG.size,
      providerOptions: {
        openai: {
          quality: options.quality || IMAGE_CONFIG.quality,
        },
      },
    });

    const imageBase64 = result.image.base64;
    const dataUrl = `data:${result.image.mimeType};base64,${imageBase64}`;

    console.log('Image generated successfully');

    return {
      success: true,
      image: {
        url: dataUrl,
        prompt,
        questionId: options.questionId || null,
      },
    };

  } catch (error) {
    console.error('Image generation failed:', error);

    if (error.message.includes('API key') || error.message.includes('configured')) {
      return { success: false, error: 'Image generation service is not configured. Please check your AI_GATEWAY_API_KEY environment variable.' };
    } else if (error.message.includes('rate limit')) {
      return { success: false, error: 'Image generation rate limit exceeded. Please try again in a moment.' };
    } else if (error.message.includes('content_policy') || error.message.includes('safety')) {
      return { success: false, error: 'The requested image could not be generated due to content policy restrictions.' };
    }

    return { success: false, error: `Image generation failed: ${error.message}` };
  }
}

/**
 * Generates images for multiple quiz questions
 * @param {Array<{question: string, context?: string, questionId?: string}>} questions
 * @param {Object} [options] - Generation options
 * @returns {Promise<ImageGenerationResult[]>}
 */
async function batchGenerateImages(questions, options = {}) {
  const results = [];

  for (const q of questions) {
    try {
      const result = await generateQuizImage(q.question, {
        context: q.context,
        questionId: q.questionId,
        ...options,
      });
      results.push(result);
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }

  return results;
}

/**
 * Checks if the image generation service is properly configured
 * @returns {{ configured: boolean, model: string }}
 */
function checkConfiguration() {
  return {
    configured: true,
    model: IMAGE_CONFIG.model,
  };
}

export {
  generateQuizImage,
  batchGenerateImages,
  buildImagePrompt,
  checkConfiguration,
  IMAGE_CONFIG,
};

export default {
  generateQuizImage,
  batchGenerateImages,
  buildImagePrompt,
  checkConfiguration,
  IMAGE_CONFIG,
};
