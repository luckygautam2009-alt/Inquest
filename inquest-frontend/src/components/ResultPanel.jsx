const DECISION_STYLES = {
  AUTO_RESOLVE: 'bg-verified/15 border-verified text-verified',
  CUSTOMER_CONFIRM: 'bg-amber/15 border-amber text-amber',
  HUMAN_ESCALATION: 'bg-alert/15 border-alert text-alert',
};

export default function ResultPanel({ data }) {
  const { analysis, rootCause, decision, handoff } = data;

  return (
    <div className="space-y-6">
      <section className="bg-paper text-ink rounded-lg p-6">
        <h2 className="font-display text-xl mb-3">Analysis</h2>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted text-xs uppercase tracking-wide">Intent</div>
            <div className="font-medium">{analysis.intent}</div>
          </div>
          <div>
            <div className="text-muted text-xs uppercase tracking-wide">Sentiment</div>
            <div className="font-medium">{analysis.sentiment}</div>
          </div>
          <div>
            <div className="text-muted text-xs uppercase tracking-wide">Urgency</div>
            <div className="font-medium">{analysis.urgency}</div>
          </div>
        </div>
      </section>

      <section className="bg-paper text-ink rounded-lg p-6">
        <h2 className="font-display text-xl mb-2">Root Cause</h2>
        <p className="text-sm leading-relaxed">{rootCause.rootCause}</p>
        <div className="mt-3 text-sm text-muted">
          Confidence: <span className="font-semibold text-ink">{rootCause.confidence}%</span>
          {rootCause.matchedPolicy && <span> · Policy: {rootCause.matchedPolicy}</span>}
        </div>
      </section>

      <section className={`rounded-lg p-6 border-2 ${DECISION_STYLES[decision.decision] || ''}`}>
        <h2 className="font-display text-xl mb-2">{decision.decision.replace('_', ' ')}</h2>
        <p className="text-sm">{decision.reasoning}</p>
      </section>

      <section className="bg-paper text-ink rounded-lg p-6">
        <h2 className="font-display text-xl mb-2">Handoff</h2>
        {handoff.type === 'AUTO_RESOLVE' && (
          <>
            <p className="text-sm font-medium">{handoff.actionTaken}</p>
            <p className="text-sm text-muted mt-2">{handoff.customerMessage}</p>
          </>
        )}
        {handoff.type === 'CUSTOMER_CONFIRM' && (
          <>
            <p className="text-sm font-medium">{handoff.suggestedAction}</p>
            <p className="text-sm text-muted mt-2">{handoff.customerMessage}</p>
          </>
        )}
        {handoff.type === 'HUMAN_ESCALATION' && (
          <div className="text-sm space-y-1">
            <p><span className="text-muted">Issue:</span> {handoff.agentSummary.issue}</p>
            <p><span className="text-muted">Recommended:</span> {handoff.agentSummary.recommendedAction}</p>
          </div>
        )}
      </section>
    </div>
  );
}
