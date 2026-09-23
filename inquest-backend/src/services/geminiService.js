const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/env');

if (!config.geminiApiKey) {
  console.warn('[geminiService] Warning: GEMINI_API_KEY not set. AI calls will fail.');
}

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

// Prefer models that fail fast or succeed. Do not include models that hang
// (gemini-3.5-flash-lite / gemini-flash-lite-latest hang until timeout).
const MODEL_CHAIN = [
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
];

const PER_MODEL_TIMEOUT_MS = 5000;
const RETRY_TIMEOUT_MS = 2000;
const OVERALL_BUDGET_MS = 6000;
const SKIP_429_MS = 2 * 60 * 1000;
const SKIP_404_MS = 24 * 60 * 60 * 1000;
const SKIP_TIMEOUT_MS = 60 * 1000;

const skipUntil = new Map();

const generationConfig = {
  temperature: 0.2,
  maxOutputTokens: 512,
  responseMimeType: 'application/json',
  thinkingConfig: { thinkingBudget: 0 },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function isQuotaError(err) {
  return /429|rate limit|quota|resource_exhausted/i.test(err.message);
}

function isTransientError(err) {
  return /503|overloaded|high demand/i.test(err.message);
}

function isUnavailableError(err) {
  return /404|not found|no longer available/i.test(err.message);
}

function isTimeoutError(err) {
  return /timed out/i.test(err.message);
}

function shouldSkip(modelName) {
  const until = skipUntil.get(modelName);
  return Boolean(until && Date.now() < until);
}

function markSkip(modelName, durationMs, reason) {
  skipUntil.set(modelName, Date.now() + durationMs);
  console.warn(`[gemini] skipping ${modelName} for ${Math.round(durationMs / 1000)}s (${reason})`);
}

async function generateContent(prompt) {
  let lastError;
  const started = Date.now();

  for (const modelName of MODEL_CHAIN) {
    if (Date.now() - started > OVERALL_BUDGET_MS) {
      break;
    }
    if (shouldSkip(modelName)) {
      continue;
    }

    const model = genAI.getGenerativeModel({ model: modelName, generationConfig });
    const remainingModels = MODEL_CHAIN.filter((name) => name !== modelName && !shouldSkip(name));
    const maxAttempts = remainingModels.length === 0 ? 2 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const timeoutMs = attempt === 1 ? PER_MODEL_TIMEOUT_MS : RETRY_TIMEOUT_MS;
        const result = await withTimeout(
          model.generateContent(prompt),
          timeoutMs,
          `Model ${modelName} timed out after ${timeoutMs}ms`
        );
        const text = result.response.text();
        console.log(`[gemini] ${modelName} ok in ${Date.now() - started} ms`);
        return text;
      } catch (err) {
        lastError = err;
        console.warn(`[gemini] ${modelName} attempt ${attempt} failed: ${err.message.slice(0, 180)}`);

        if (isQuotaError(err)) {
          markSkip(modelName, SKIP_429_MS, 'quota/429');
          break;
        }
        if (isUnavailableError(err)) {
          markSkip(modelName, SKIP_404_MS, 'unavailable/404');
          break;
        }
        if (isTimeoutError(err)) {
          markSkip(modelName, SKIP_TIMEOUT_MS, 'timeout');
          break;
        }
        if (isTransientError(err) && attempt < maxAttempts) {
          await sleep(300);
          continue;
        }
        break;
      }
    }
  }

  throw lastError || new Error('All Gemini models failed or were skipped');
}

async function generateJSON(prompt) {
  const raw = await generateContent(prompt);
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

module.exports = { generateContent, generateJSON };
