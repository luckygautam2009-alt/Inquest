/**
 * Transforms investigation + rootCause + decision into a generic
 * node/edge graph structure for frontend visualization (React Flow, D3, etc).
 * No AI call — pure formatting of already-computed evidence.
 */
function buildEvidenceGraph(investigation, rootCause, decision) {
  const nodes = [];
  const edges = [];
  let order = 0;

  function addNode(id, type, label, status, data = {}) {
    nodes.push({ id, type, label, status, order: order++, data });
    return id;
  }
  function addEdge(from, to) {
    edges.push({ id: `${from}->${to}`, source: from, target: to });
  }

  // 1. Complaint (root node)
  const complaintId = addNode('complaint', 'complaint', 'Customer Complaint', 'found');
  let lastId = complaintId;

  // 2. Prior tickets (if any)
  investigation.tickets.forEach((ticket, i) => {
    const id = `ticket-${ticket.id}`;
    addNode(id, 'ticket', `Previous Ticket: ${ticket.subject}`, 'found', ticket);
    addEdge(lastId, id);
    lastId = id; // chain sequentially
  });

  // 3. Focus payments (the core evidence for billing-type issues)
  investigation.focusPayments.forEach((payment) => {
    const id = `payment-${payment.id}`;
    const mismatch = payment.gatewayStatus !== payment.localStatus;
    addNode(
      id,
      'payment',
      `Payment ${payment.id}`,
      mismatch ? 'flagged' : 'verified',
      payment
    );
    addEdge(lastId, id);
    lastId = id;
  });

  // 4. Focus order
  if (investigation.focusOrder) {
    const id = `order-${investigation.focusOrder.id}`;
    addNode(id, 'order', `Order ${investigation.focusOrder.id}`, 'found', investigation.focusOrder);
    addEdge(lastId, id);
    lastId = id;
  }

  // 5. Matched policy
  if (rootCause.matchedPolicy) {
    const policy = investigation.policies.find((p) => p.id === rootCause.matchedPolicy);
    const id = `policy-${rootCause.matchedPolicy}`;
    addNode(id, 'policy', policy ? policy.title : rootCause.matchedPolicy, 'matched', policy || {});
    addEdge(lastId, id);
    lastId = id;
  }

  // 6. Root cause (the "analyzed" node)
  const rootCauseId = addNode('root-cause', 'rootCause', 'Root Cause', 'analyzed', {
    rootCause: rootCause.rootCause,
    confidence: rootCause.confidence,
  });
  addEdge(lastId, rootCauseId);

  // 7. Recommended action / decision
  const actionId = addNode('recommended-action', 'action', 'Recommended Action', decision.decision, {
    decision: decision.decision,
    reasoning: decision.reasoning,
  });
  addEdge(rootCauseId, actionId);

  return { nodes, edges };
}

module.exports = { buildEvidenceGraph };
