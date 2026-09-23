const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/env');

if (!config.geminiApiKey) {
  console.warn('[geminiService] Warning: GEMINI_API_KEY not set. AI calls will fail.');
}

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

// Fastest available models in prioritized order.
const MODEL_CHAIN = [
  'gemini-3.6-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
];

const PER_MODEL_TIMEOUT_MS = 2500;
const OVERALL_BUDGET_MS = 3000;
const SKIP_429_MS = 2 * 60 * 1000;
const SKIP_404_MS = 24 * 60 * 60 * 1000;
const SKIP_TIMEOUT_MS = 60 * 1000;

const skipUntil = new Map();

const generationConfig = {
  temperature: 0.1,
  maxOutputTokens: 512,
  responseMimeType: 'application/json',
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
    const maxAttempts = 1; // Never retry on 429, fast fail-forward

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const timeoutMs = Math.min(PER_MODEL_TIMEOUT_MS, Math.max(800, OVERALL_BUDGET_MS - (Date.now() - started)));
        const result = await withTimeout(
          model.generateContent(prompt),
          timeoutMs,
          `Model ${modelName} timed out after ${timeoutMs}ms`
        );
        const text = result.response.text();
        console.log(`[gemini] ${modelName} succeeded in ${Date.now() - started} ms`);
        return text;
      } catch (err) {
        lastError = err;
        console.warn(`[gemini] ${modelName} failed: ${err.message.slice(0, 140)}`);

        if (isQuotaError(err)) {
          markSkip(modelName, SKIP_429_MS, 'quota/429');
          break; // Skip immediately without backoff
        }
        if (isUnavailableError(err)) {
          markSkip(modelName, SKIP_404_MS, 'unavailable/404');
          break;
        }
        if (isTimeoutError(err)) {
          markSkip(modelName, SKIP_TIMEOUT_MS, 'timeout');
          break;
        }
        if (isTransientError(err)) {
          // If transient 503, brief pause
          await sleep(150);
          continue;
        }
        break;
      }
    }
  }

  throw lastError || new Error('All Gemini models skipped or quota exhausted');
}

async function generateJSON(prompt) {
  const raw = await generateContent(prompt);
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned);
}

module.exports = { generateContent, generateJSON };
