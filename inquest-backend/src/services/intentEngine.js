const { generateJSON } = require('./geminiService');

const HINGLISH_MARKERS = /\b(bhai|yaar|nahi|nahin|gya|gyi|gaya|baar|kat|dekh|lo|mera|meri|kisi|abhi|tak|aaya|aayi|karne|do\s*baar|2\s*baar)\b/i;
const DEVANAGARI = /[\u0900-\u097F]/;

function detectLanguage(complaintText) {
  const hasHindiScript = DEVANAGARI.test(complaintText);
  const hasLatin = /[A-Za-z]/.test(complaintText);
  if (hasHindiScript && hasLatin) return 'mixed';
  if (hasHindiScript) return 'hi';
  if (HINGLISH_MARKERS.test(complaintText)) return 'hinglish';
  return 'en';
}

function fallbackAnalysis(complaintText) {
  const text = complaintText.toLowerCase();
  const detectedLanguage = detectLanguage(complaintText);

  let intent = 'other';
  let subIntent = null;
  let intentSummary = 'Could not analyze automatically';
  let urgency = 'medium';
  let sentiment = 'frustrated';

  const duplicatePayment =
    /twice|duplicate|double\s*charg|charged\s*twice|2\s*baar|do\s*baar|दो\s*बार|kat g|कट गया|कट गयी/.test(text)
    && /pay|payment|charged|debit|kat|पेमेंट|पेमेन्ट/.test(text);
  const refund = /refund|वापस|रिफंड/.test(text);
  const delivery = /deliver|in transit|nahi aaya|नहीं आया|अभी तक नहीं|shipping/.test(text);
  const account = /account|login|hack|unauthorized|suspicious|kisi ne login|हैक|अकाउंट/.test(text);
  const cancel = /cancel|रद्द/.test(text);
  const ret = /return|वापस कर/.test(text) && !refund;

  if (duplicatePayment || (/pay|billing|charged|पेमेंट/.test(text) && /twice|duplicate|2\s*baar|दो\s*बार/.test(text))) {
    intent = 'billing';
    subIntent = 'duplicate_payment';
    intentSummary = 'Duplicate or incorrect payment on an order';
    urgency = 'high';
  } else if (refund) {
    intent = 'billing';
    subIntent = 'refund';
    intentSummary = 'Refund not received';
    urgency = 'high';
  } else if (account) {
    intent = 'account';
    subIntent = 'suspicious_activity';
    intentSummary = 'Possible unauthorized account activity';
    urgency = 'high';
    sentiment = 'angry';
  } else if (delivery) {
    intent = 'delivery';
    subIntent = 'order_status';
    intentSummary = 'Order not delivered or delayed';
  } else if (ret) {
    intent = 'product_quality';
    subIntent = 'return';
    intentSummary = 'Return related issue';
  } else if (cancel) {
    intent = 'other';
    subIntent = 'cancellation';
    intentSummary = 'Cancellation request';
  } else if (/pay|billing|charged|पेमेंट/.test(text)) {
    intent = 'billing';
    intentSummary = 'Billing or payment issue';
  }

  const orderMatch = complaintText.match(/order\s*#?\s*([A-Za-z]*\d+)/i)
    || complaintText.match(/[ऑओ]र्ड[रर्]\s*#?\s*(\d+)/i)
    || complaintText.match(/\b(ORDER\d+)\b/i);

  return {
    intent,
    intentSummary,
    sentiment,
    urgency,
    urgencyReason: 'Inferred from complaint language and issue type',
    source: 'fallback',
    detectedLanguage,
    subIntent,
    entities: {
      orderReferences: orderMatch ? [orderMatch[1]] : [],
      paymentReferences: [],
      amounts: [],
      dates: [],
    },
  };
}

async function analyzeComplaint(complaintText) {
  const prompt = `You are an AI system analyzing customer support complaints for an e-commerce platform.

The complaint may be in English, Hindi (Devanagari), Hinglish, or mixed Hindi-English.
Understand meaning, intent, and entities from the original text. Do NOT merely translate.
Preserve the original wording in your understanding. Examples of meaning (do not treat these as the only valid sentences):
- "bhai payment 2 baar kat gyi order 456 ki" → billing / duplicate payment, order 456
- "refund abhi tak nahi aaya yaar" → refund
- "mera account kisi ne login karne ki try ki" → account security / suspicious activity
- "order abhi tak nahi aaya" → delivery / order status
- "मेरे ऑर्डर 456 का पेमेंट दो बार कट गया।" → billing / duplicate payment, order 456

Analyze the following customer complaint and return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:

{
  "intent": "billing" | "technical" | "delivery" | "product_quality" | "account" | "other",
  "subIntent": "duplicate_payment" | "refund" | "delivery" | "return" | "cancellation" | "account_security" | "suspicious_activity" | "order_status" | null,
  "intentSummary": "one short sentence describing the issue in English",
  "sentiment": "calm" | "frustrated" | "angry",
  "urgency": "low" | "medium" | "high",
  "urgencyReason": "one short sentence explaining why",
  "detectedLanguage": "en" | "hi" | "hinglish" | "mixed",
  "entities": {
    "orderReferences": ["order ids or numbers mentioned, e.g. 456 or ORDER456"],
    "paymentReferences": [],
    "amounts": [],
    "dates": []
  }
}

Customer complaint:
"""${complaintText}"""

Return ONLY the JSON object.`;

  try {
    const result = await generateJSON(prompt);
    const fallback = fallbackAnalysis(complaintText);
    return {
      intent: result.intent || fallback.intent,
      intentSummary: result.intentSummary || fallback.intentSummary,
      sentiment: result.sentiment || 'calm',
      urgency: result.urgency || 'medium',
      urgencyReason: result.urgencyReason || 'Not specified',
      source: 'ai',
      detectedLanguage: result.detectedLanguage || fallback.detectedLanguage,
      subIntent: result.subIntent || fallback.subIntent,
      entities: {
        orderReferences: result.entities?.orderReferences?.length
          ? result.entities.orderReferences
          : fallback.entities.orderReferences,
        paymentReferences: result.entities?.paymentReferences || [],
        amounts: result.entities?.amounts || [],
        dates: result.entities?.dates || [],
      },
    };
  } catch (err) {
    console.error('[intentEngine] AI analysis failed, using fallback:', err.message);
    return fallbackAnalysis(complaintText);
  }
}

module.exports = { analyzeComplaint };
