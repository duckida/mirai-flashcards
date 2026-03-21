/**
 * Image Service
 * Handles AI image generation for quiz questions using Vercel AI Gateway.
 * Includes in-memory caching to avoid regenerating images for the same
 * flashcard within a session window.
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
 * In-memory image cache.
 * Keys are `flashcardId|questionHash` so different rephrasings of the
 * same flashcard can have distinct images while still caching repeats.
 * Entries expire after IMAGE_CACHE_TTL_MS (default 30 minutes).
 */
const imageCache = new Map();
const IMAGE_CACHE_TTL_MS = parseInt(process.env.IMAGE_CACHE_TTL_MS, 10) || 30 * 60 * 1000;

/**
 * Build a cache key from a flashcard ID and question text
 * @param {string} flashcardId
 * @param {string} question
 * @returns {string}
 */
function buildCacheKey(flashcardId, question) {
  const hash = question.length + ':' + question.substring(0, 60);
  return `${flashcardId}|${hash}`;
}

/**
 * Retrieve a cached image result
 * @param {string} flashcardId
 * @param {string} question
 * @returns {ImageGenerationResult|null}
 */
function getCachedImage(flashcardId, question) {
  const key = buildCacheKey(flashcardId, question);
  const entry = imageCache.get(key);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > IMAGE_CACHE_TTL_MS) {
    imageCache.delete(key);
    return null;
  }

  return entry.result;
}

/**
 * Store an image result in cache
 * @param {string} flashcardId
 * @param {string} question
 * @param {ImageGenerationResult} result
 */
function cacheImage(flashcardId, question, result) {
  const key = buildCacheKey(flashcardId, question);
  imageCache.set(key, { result, timestamp: Date.now() });

  // Evict stale entries if cache grows large
  if (imageCache.size > 200) {
    const now = Date.now();
    for (const [k, v] of imageCache.entries()) {
      if (now - v.timestamp > IMAGE_CACHE_TTL_MS) {
        imageCache.delete(k);
      }
    }
  }
}

/**
 * Clear the entire image cache (useful for testing)
 */
function clearImageCache() {
  imageCache.clear();
}

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
 * Generates an image for a quiz question.
 * Checks the in-memory cache first; on cache miss generates via the API.
 * @param {string} question - The quiz question text
 * @param {Object} [options] - Generation options
 * @param {string} [options.context] - Additional context (module topic)
 * @param {string} [options.questionId] - Question ID for tracking
 * @param {string} [options.flashcardId] - Flashcard ID for caching
 * @param {string} [options.size] - Image size (e.g., '1024x1024')
 * @param {string} [options.quality] - Image quality ('standard' or 'hd')
 * @returns {Promise<ImageGenerationResult>}
 */
async function generateQuizImage(question, options = {}) {
  // Check cache first
  if (options.flashcardId) {
    const cached = getCachedImage(options.flashcardId, question);
    if (cached) {
      console.log('Image cache hit for flashcard:', options.flashcardId);
      return cached;
    }
  }

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

    const imageResult = {
      success: true,
      image: {
        url: dataUrl,
        prompt,
        questionId: options.questionId || null,
      },
    };

    // Store in cache
    if (options.flashcardId) {
      cacheImage(options.flashcardId, question, imageResult);
    }

    return imageResult;

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
  getCachedImage,
  cacheImage,
  clearImageCache,
  IMAGE_CONFIG,
};

export default {
  generateQuizImage,
  batchGenerateImages,
  buildImagePrompt,
  checkConfiguration,
  getCachedImage,
  cacheImage,
  clearImageCache,
  IMAGE_CONFIG,
};
