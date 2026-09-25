const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/env');

if (!config.geminiApiKey) {
  console.warn('[geminiService] Warning: GEMINI_API_KEY not set. AI calls will fail.');
}

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const MODEL_CHAIN = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest'];
const VISION_MODEL_CHAIN = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest'];
const CALL_TIMEOUT_MS = 12000;
const VISION_TIMEOUT_MS = 20000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientError(err) {
  return /503|overloaded|high demand|429|rate limit|quota|resource_exhausted/i.test(err.message);
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms)),
  ]);
}

async function generateContent(prompt) {
  let lastError;
  for (const modelName of MODEL_CHAIN) {
    const model = genAI.getGenerativeModel({ model: modelName });
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const result = await withTimeout(model.generateContent(prompt), CALL_TIMEOUT_MS);
        return result.response.text();
      } catch (err) {
        lastError = err;
        if (isTransientError(err) && attempt === 1) {
          await sleep(400);
          continue;
        }
        break;
      }
    }
  }
  throw lastError;
}

/**
 * Vision calls (ID verification) use a shorter model chain and a hard
 * per-attempt timeout, since this path is on the critical path of a
 * live scanning UI — it must fail fast rather than hang.
 */
async function generateVisionContent(prompt, images) {
  let lastError;
  const parts = [
    { text: prompt },
    ...images.map((img) => ({ inlineData: { data: img.data, mimeType: img.mimeType } })),
  ];

  for (const modelName of VISION_MODEL_CHAIN) {
    const model = genAI.getGenerativeModel({ model: modelName });
    try {
      const result = await withTimeout(model.generateContent(parts), VISION_TIMEOUT_MS);
      return result.response.text();
    } catch (err) {
      lastError = err;
      continue; // try next model immediately, no retry-within-model for vision
    }
  }
  throw lastError;
}

function extractJSON(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Empty response from AI model');
  }
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (initialErr) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = cleaned.substring(firstBrace, lastBrace + 1);
      return JSON.parse(candidate);
    }
    throw initialErr;
  }
}

async function generateJSON(prompt) {
  const raw = await generateContent(prompt);
  return extractJSON(raw);
}

async function generateVisionJSON(prompt, images) {
  const raw = await generateVisionContent(prompt, images);
  return extractJSON(raw);
}

module.exports = { generateContent, generateJSON, generateVisionContent, generateVisionJSON };
