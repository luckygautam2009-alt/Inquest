const { generateJSON } = require('./geminiService');

function verifiedDuplicatePayments(investigation) {
  const order = investigation.focusOrder;
  const customer = investigation.customer;
  if (!order || order.customerId !== customer.id) return [];
  if (typeof order.amount !== 'number' || order.amount <= 0) return [];
  return (investigation.focusPayments || []).filter(
    (p) => p.orderId === order.id && p.customerId === customer.id
  );
}

function evidenceBasedDuplicateRootCause(investigation) {
  const pays = verifiedDuplicatePayments(investigation);
  if (pays.length < 2) return null;
  const order = investigation.focusOrder;
  const policy = (investigation.policies || []).find((p) => p.id === 'POLICY7') || null;
  return {
    rootCause: `Verified duplicate payment on ${order.id} for customer ${investigation.customer.id}: ${pays.map((p) => p.id).join(' and ')} both exist against the same order (amount ₹${order.amount}).`,
    evidenceUsed: [
      `Order ${order.id} belongs to ${investigation.customer.id}`,
      ...pays.map((p) => `Payment ${p.id} gateway=${p.gatewayStatus}/local=${p.localStatus}`),
    ],
    matchedPolicy: policy ? policy.id : null,
    confidence: policy ? 92 : 70,
    confidenceReasoning: 'Root cause taken from verified order and payment records for this customer only, not from the complaint text.',
    source: 'evidence',
  };
}

async function findRootCause(complaintText, analysis, investigation) {
  if (investigation.orderMismatch) {
    return {
      rootCause: `Referenced order #${investigation.orderHintDetected} could not be verified for customer ${investigation.customer.name} (${investigation.customer.id}). The order does not exist in this customer's records and requires manual verification.`,
      evidenceUsed: [`Customer ${investigation.customer.id} has no order matching #${investigation.orderHintDetected}`],
      matchedPolicy: null,
      confidence: 0,
      confidenceReasoning: `Order #${investigation.orderHintDetected} does not belong to customer ${investigation.customer.id}. Cannot determine root cause without verified order and payment evidence.`,
      source: 'investigation',
    };
  }

  const evidenceSummary = {
    customer: {
      id: investigation.customer.id,
      tier: investigation.customer.tier,
      joinedOn: investigation.customer.joinedOn,
    },
    focusOrder: investigation.focusOrder,
    focusPayments: investigation.focusPayments,
    priorTickets: investigation.tickets,
    relevantPolicies: investigation.policies,
  };

  const prompt = `You are the Root Cause Engine of an AI customer support investigation system.
You are given a customer complaint (which may be English, Hindi, or Hinglish), its intent analysis, and verified evidence gathered from company systems for customer ${investigation.customer.id} (${investigation.customer.name}).

STRICT ACCURACY RULES:
- You must reason ONLY from the verified evidence provided below.
- Do NOT assume, infer, or fabricate any orders, payments, or transactions that are not explicitly present in the Evidence object.
- If focusOrder is null or focusPayments is empty, you MUST NOT claim a duplicate payment or any transaction-related root cause.
- If evidence is insufficient, state that clearly and set confidence accordingly.
- Understand Hindi/Hinglish complaint meaning, but never let the complaint override missing evidence.

Your job: explain WHY this issue actually happened based on verified evidence only.

Complaint: """${complaintText}"""

Intent analysis: ${JSON.stringify(analysis)}

Evidence: ${JSON.stringify(evidenceSummary)}

Return ONLY a valid JSON object (no markdown, no explanation outside JSON) with this exact structure:

{
  "rootCause": "one or two sentences explaining the actual underlying cause, referencing specific evidence (order IDs, payment IDs, statuses)",
  "evidenceUsed": ["short label of each evidence point used, e.g. 'Payment PAY123 gateway=success/local=failed'"],
  "matchedPolicy": "policy id if one clearly applies, or null",
  "confidence": <number between 0 and 100>,
  "confidenceReasoning": "one sentence explaining what drove this confidence score (evidence weight, policy match, historical pattern)"
}

Return ONLY the JSON object.`;

  try {
    const result = await generateJSON(prompt);
    const aiResult = {
      rootCause: result.rootCause || 'Unable to determine root cause automatically',
      evidenceUsed: result.evidenceUsed || [],
      matchedPolicy: result.matchedPolicy || null,
      confidence: typeof result.confidence === 'number' ? result.confidence : 0,
      confidenceReasoning: result.confidenceReasoning || 'Not specified',
      source: 'ai',
    };

    if (!aiResult.matchedPolicy) {
      const evidenceResult = evidenceBasedDuplicateRootCause(investigation);
      if (evidenceResult) return evidenceResult;
    }
    return aiResult;
  } catch (err) {
    console.error('[rootCauseEngine] AI analysis failed, using fallback:', err.message);
    const evidenceResult = evidenceBasedDuplicateRootCause(investigation);
    if (evidenceResult) return evidenceResult;
    return {
      rootCause: 'Could not determine root cause automatically — requires manual review',
      evidenceUsed: [],
      matchedPolicy: null,
      confidence: 0,
      confidenceReasoning: 'Fallback default due to analysis failure',
      source: 'fallback',
    };
  }
}

module.exports = { findRootCause };
