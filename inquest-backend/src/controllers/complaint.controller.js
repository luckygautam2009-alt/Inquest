const { analyzeComplaint } = require('../services/intentEngine');
const { investigate } = require('../services/investigationEngine');
const { findRootCause } = require('../services/rootCauseEngine');
const { decide } = require('../services/decisionEngine');
const { buildHandoff } = require('../services/handoffEngine');
const { buildEvidenceGraph } = require('../services/graphBuilder');

async function submitComplaint(req, res) {
  const { complaintText, customerId } = req.body;
  const totalStart = Date.now();

  const t0 = Date.now();
  const investigation = investigate(customerId, complaintText);
  const investigationMs = Date.now() - t0;

  if (!investigation.found) {
    return res.status(404).json({ success: false, error: investigation.error });
  }

  const t1 = Date.now();
  const analysis = await analyzeComplaint(complaintText);
  const intentMs = Date.now() - t1;

  const t2 = Date.now();
  const rootCause = await findRootCause(complaintText, analysis, investigation);
  const rootCauseMs = Date.now() - t2;

  const t3 = Date.now();
  const decision = decide(complaintText, analysis, rootCause, investigation);
  const decisionMs = Date.now() - t3;

  const t4 = Date.now();
  const handoff = buildHandoff(investigation, rootCause, decision);
  const handoffMs = Date.now() - t4;

  const t5 = Date.now();
  const evidenceGraph = buildEvidenceGraph(investigation, rootCause, decision);
  const graphMs = Date.now() - t5;

  const totalMs = Date.now() - totalStart;

  console.log(`[complaint] investigation: ${investigationMs} ms`);
  console.log(`[complaint] intent AI: ${intentMs} ms`);
  console.log(`[complaint] root cause AI: ${rootCauseMs} ms`);
  console.log(`[complaint] decision: ${decisionMs} ms`);
  console.log(`[complaint] handoff: ${handoffMs} ms`);
  console.log(`[complaint] evidence graph: ${graphMs} ms`);
  console.log(`[complaint] total: ${totalMs} ms`);

  res.status(200).json({
    success: true,
    data: {
      customerId,
      complaintText,
      analysis,
      investigation,
      rootCause,
      decision,
      handoff,
      evidenceGraph,
    },
  });
}

module.exports = { submitComplaint };
