/**
 * Decides the resolution path based on urgency, confidence, and risk —
 * NOT sentiment alone. This is the core "intelligent decoupling" logic.
 *
 * Rules:
 * - High-risk keywords (fraud/security) => always HUMAN_ESCALATION
 * - product_quality intent => never AUTO_RESOLVE, even at high confidence,
 *   because the only "evidence" is the customer's own claim (no objective
 *   system log like a payment gateway record) — physical damage claims
 *   need human/photo verification before a refund/replacement is issued.
 * - High confidence (>=85) + policy matched + not high-risk/product_quality => AUTO_RESOLVE
 * - Medium confidence (60-84) or ambiguous evidence => CUSTOMER_CONFIRM
 * - Low confidence (<60) OR no policy match => HUMAN_ESCALATION
 */

const HIGH_RISK_KEYWORDS = /fraud|unauthorized|hack|stolen|security|suspicious|account takeover|identity|login karne|kisi ne login|हैक|अनधिकृत|अकाउंट/i;

function decide(complaintText, analysis, rootCause, investigation) {
  const { confidence, matchedPolicy } = rootCause;
  const isHighRisk = HIGH_RISK_KEYWORDS.test(complaintText)
    || analysis.intent === 'account'
    || analysis.subIntent === 'account_security'
    || analysis.subIntent === 'suspicious_activity';
  const requiresPhysicalVerification = analysis.intent === 'product_quality';

  // SAFETY GUARD: Order mismatch — always escalate
  if (investigation && investigation.orderMismatch) {
    return {
      decision: 'HUMAN_ESCALATION',
      reasoning: `Referenced order #${investigation.orderHintDetected} does not belong to customer ${investigation.customer.id} — customer/order mismatch requires human verification.`,
      confidence: 0,
      sentimentNote: `Note: decision was based on evidence/confidence, not sentiment (${analysis.sentiment}) alone.`,
    };
  }

  // SAFETY GUARD: Verify evidence supports AUTO_RESOLVE before allowing it
  let evidenceSatisfied = true;
  let safetyFailureReason = '';

  if (matchedPolicy === 'POLICY7') {
    // Duplicate Payment Refund requires: verified order + known amount + multiple payments
    if (!investigation || !investigation.focusOrder || investigation.focusOrder.customerId !== investigation.customer.id) {
      evidenceSatisfied = false;
      safetyFailureReason = 'Missing verified order belonging to customer.';
    } else if (typeof investigation.focusOrder.amount !== 'number' || investigation.focusOrder.amount <= 0) {
      evidenceSatisfied = false;
      safetyFailureReason = 'Unknown monetary amount for order.';
    } else if (!investigation.focusPayments || investigation.focusPayments.length < 2) {
      evidenceSatisfied = false;
      safetyFailureReason = 'Payment evidence does not establish duplicate transactions for this order.';
    }
  }

  let decision;
  let reasoning;

  if (isHighRisk) {
    decision = 'HUMAN_ESCALATION';
    reasoning = 'Complaint contains high-risk signals (fraud/security related) — requires human judgment regardless of confidence.';
  } else if (requiresPhysicalVerification) {
    decision = confidence >= 60 ? 'CUSTOMER_CONFIRM' : 'HUMAN_ESCALATION';
    reasoning = 'Product quality/damage claims rely only on the customer\'s own account, not an objective system log — never auto-resolved without verification.';
  } else if (confidence >= 85 && matchedPolicy && evidenceSatisfied) {
    decision = 'AUTO_RESOLVE';
    reasoning = `High confidence (${confidence}%) with clear policy match (${matchedPolicy}) — safe to resolve automatically.`;
  } else if (confidence >= 60 && evidenceSatisfied) {
    decision = 'CUSTOMER_CONFIRM';
    reasoning = `Moderate confidence (${confidence}%) — system suggests a resolution but needs customer approval before acting.`;
  } else {
    decision = 'HUMAN_ESCALATION';
    reasoning = safetyFailureReason
      ? `${safetyFailureReason} Requires human investigation.`
      : `Low confidence (${confidence}%) or no clear policy match — needs human investigation.`;
  }

  return {
    decision,
    reasoning,
    confidence,
    sentimentNote: `Note: decision was based on evidence/confidence, not sentiment (${analysis.sentiment}) alone.`,
  };
}

module.exports = { decide };
