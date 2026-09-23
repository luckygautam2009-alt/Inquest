/**
 * Builds the final output shown to either the agent (escalation) or
 * the system (auto-resolve action). Pure formatting — no AI call needed,
 * since all reasoning has already happened in rootCause + decision.
 */
function buildHandoff(investigation, rootCause, decision) {
  const base = {
    customerName: investigation.customer.name,
    customerTier: investigation.customer.tier,
    orderId: investigation.focusOrder ? investigation.focusOrder.id : null,
    rootCause: rootCause.rootCause,
    confidence: rootCause.confidence,
    matchedPolicy: rootCause.matchedPolicy,
  };

  if (decision.decision === 'AUTO_RESOLVE') {
    return {
      ...base,
      type: 'AUTO_RESOLVE',
      actionTaken: rootCause.matchedPolicy
        ? `Refund of ₹${investigation.focusOrder?.amount ?? 'N/A'} initiated under policy ${rootCause.matchedPolicy}`
        : 'Resolution applied automatically',
      customerMessage: `Hi ${investigation.customer.name}, we found the issue and resolved it — ${rootCause.rootCause}`,
    };
  }

  if (decision.decision === 'CUSTOMER_CONFIRM') {
    return {
      ...base,
      type: 'CUSTOMER_CONFIRM',
      suggestedAction: rootCause.matchedPolicy
        ? `Refund/resolution under policy ${rootCause.matchedPolicy} — awaiting customer approval`
        : 'Suggested resolution pending customer approval',
      customerMessage: `Hi ${investigation.customer.name}, here's what we found — ${rootCause.rootCause}. Would you like us to proceed?`,
    };
  }

  // HUMAN_ESCALATION
  return {
    ...base,
    type: 'HUMAN_ESCALATION',
    agentSummary: {
      issue: investigation.orderMismatch
        ? `Customer/order mismatch: Order #${investigation.orderHintDetected} not found for customer ${investigation.customer.id}`
        : (investigation.orderHintDetected ? `Issue related to order #${investigation.orderHintDetected}` : 'General issue'),
      rootCause: rootCause.rootCause,
      evidenceUsed: rootCause.evidenceUsed,
      actionsAlreadyTaken: ['Evidence gathered', 'Root cause analyzed', 'Policy checked'],
      recommendedAction: investigation.orderMismatch
        ? `Verify order number with customer ${investigation.customer.name} — referenced order does not exist in their account`
        : (rootCause.matchedPolicy
          ? `Consider applying policy ${rootCause.matchedPolicy}`
          : 'Manual investigation required — no clear policy match'),
      confidence: rootCause.confidence,
    },
  };
}

module.exports = { buildHandoff };
