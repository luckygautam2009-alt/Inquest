import { useState } from 'react';
import { submitComplaint } from './api/client';
import ComplaintForm from './components/ComplaintForm';
import ResultPanel from './components/ResultPanel';
import EvidenceGraph from './components/EvidenceGraph';
import LoadingSkeleton from './components/LoadingSkeleton';
import { useTheme } from './hooks/useTheme';
import { Scale, Activity, ChevronRight, Sun, Moon } from 'lucide-react';

export default function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [caseId] = useState(() => `CASE-${Date.now().toString(36).toUpperCase()}`);
  const { theme, toggleTheme } = useTheme();

  async function handleSubmit(customerId, complaintText) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await submitComplaint(customerId, complaintText);
      setResult(res.data);
    } catch (err) {
      setError(err.message || 'Something went wrong. Ensure the backend is running on port 5001.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink text-paper selection:bg-amber/30 transition-colors duration-200">

      {/* ── Top nav ── */}
      <header
        className="sticky top-0 z-50 border-b border-border backdrop-blur-md transition-colors"
        style={{ background: 'var(--header-glass)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-amber-dim border border-amber/40 flex items-center justify-center shadow-xs">
              <Scale className="w-4 h-4 text-amber" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-bold tracking-tight text-paper">INQUEST</span>
              <span className="text-border-strong text-sm select-none">/</span>
              <span className="text-xs sm:text-sm text-muted font-medium">RootCause AI</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {result && (
              <div className="hidden md:flex items-center gap-2 text-xs bg-ink-light px-3 py-1.5 rounded-full border border-border">
                <Activity className="w-3.5 h-3.5 text-verified animate-pulse" />
                <span className="text-verified font-bold">Investigation Complete</span>
                <span className="text-muted font-mono">· {caseId}</span>
              </div>
            )}

            {/* Theme Toggle Button */}
            <button
              type="button"
              id="theme-toggle-btn"
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-ink-light hover:bg-ink-lighter border border-border-strong text-paper text-xs font-semibold transition-all duration-150 cursor-pointer shadow-xs"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle color theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-light" />
                  <span className="hidden sm:inline">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-500" />
                  <span className="hidden sm:inline">Dark Mode</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 text-xs text-muted" title="Backend service connected">
              <span className="w-2.5 h-2.5 rounded-full bg-verified animate-pulse" />
              <span className="hidden sm:inline font-medium text-verified">Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero tagline — only when no result ── */}
      {!result && !loading && (
        <div className="border-b border-border bg-ink-light/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 sm:py-14">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-dim border border-amber/30 text-amber text-xs font-bold uppercase tracking-widest mb-4">
                <span>Autonomous Investigation System</span>
              </div>
              <h1 className="font-display text-3xl sm:text-5xl text-paper leading-[1.15] font-normal">
                Every customer complaint is investigated<br className="hidden sm:block" />
                <span className="text-muted font-light"> with connected evidence before a verdict.</span>
              </h1>
              <p className="mt-4 text-base sm:text-lg text-muted leading-relaxed max-w-2xl font-sans">
                INQUEST autonomously audits order records, payment gateways, ticket history,
                and business policies — synthesizing root causes and actionable resolutions.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-10">
        <div className={`grid gap-8 sm:gap-10 ${result || loading ? 'lg:grid-cols-[400px_1fr]' : 'lg:grid-cols-[440px_1fr]'}`}>

          {/* ── Left: Intake form ── */}
          <aside className="lg:self-start lg:sticky lg:top-24 space-y-6">
            <div className="rounded-2xl border border-border-strong p-6 sm:p-7 bg-ink-light shadow-sm backdrop-blur-xs">
              <ComplaintForm onSubmit={handleSubmit} loading={loading} />
            </div>

            {/* How it works — visible when idle */}
            {!result && !loading && (
              <div className="rounded-2xl border border-border p-6 bg-ink-light/60 space-y-4 shadow-xs">
                <div className="text-xs font-bold text-muted uppercase tracking-wider">
                  How INQUEST Works
                </div>
                {[
                  ['1. Intent & Sentiment', 'Extracts exact problem domain, emotion, and urgency from text (multilingual/Hinglish).'],
                  ['2. Evidence Gathering', 'Cross-references customer purchase history, payment gateway statuses, and prior tickets.'],
                  ['3. Policy Evaluation', 'Validates issue against company SLA policies and refund/replacement criteria.'],
                  ['4. Verdict & Handoff', 'Issues automated resolution (AUTO_RESOLVE, CONFIRM, or ESCALATE with ready brief).'],
                ].map(([step, desc], i) => (
                  <div key={i} className="flex items-start gap-3.5 pt-1">
                    <div className="w-6 h-6 rounded-lg bg-amber-dim border border-amber/30 flex items-center justify-center text-xs font-bold text-amber shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-paper">{step.replace(/^\d+\.\s*/, '')}</div>
                      <div className="text-xs text-muted mt-1 leading-relaxed">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>

          {/* ── Right: Results ── */}
          <div className="space-y-8 min-w-0">

            {/* Error state */}
            {error && (
              <div className="border border-alert/30 bg-alert-dim text-alert px-5 py-4 rounded-xl text-base flex items-start gap-3 fade-up font-medium">
                <span className="text-lg">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Loading skeleton */}
            {loading && <LoadingSkeleton />}

            {/* Results */}
            {result && !loading && (
              <div className="space-y-8">
                {/* Breadcrumb header */}
                <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-border">
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-muted">
                    <span className="font-semibold text-muted">Active Case</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-paper font-mono font-bold bg-ink-light px-2.5 py-1 rounded-md border border-border">
                      {caseId}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-paper font-semibold">{result.customerId}</span>
                  </div>

                  <span className="text-xs text-muted bg-ink-lighter px-3 py-1 rounded-full border border-border">
                    {result.analysis?.source === 'gemini' ? 'Gemini 2.5 Flash' : 'Rule Engine Analysis'}
                  </span>
                </div>

                {/* ── Evidence Graph — centrepiece ── */}
                <div className="rounded-2xl border border-border-strong overflow-hidden bg-ink-light shadow-sm">
                  <div className="px-6 py-4.5 border-b border-border flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-6 bg-amber rounded-full" />
                      <div>
                        <h2 className="font-display text-xl text-paper font-semibold">Evidence Graph</h2>
                        <p className="text-xs text-muted">End-to-end timeline from complaint intake to verdict</p>
                      </div>
                    </div>
                    <div className="text-xs font-semibold text-muted bg-ink-lighter px-3 py-1.5 rounded-lg border border-border">
                      {result.evidenceGraph?.nodes?.length || 0} nodes ·{' '}
                      {result.evidenceGraph?.edges?.length || 0} connections
                    </div>
                  </div>
                  <div className="p-4 sm:p-6">
                    <EvidenceGraph evidenceGraph={result.evidenceGraph} />
                  </div>
                </div>

                {/* ── Analysis, Root Cause, Decision, Handoff cards ── */}
                <ResultPanel data={result} />
              </div>
            )}

            {/* Empty idle state in the right column */}
            {!result && !loading && !error && (
              <div className="hidden lg:flex flex-col items-center justify-center h-96 rounded-2xl border-2 border-dashed border-border bg-ink-light/40 text-center px-10 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-amber-dim border border-amber/30 flex items-center justify-center mb-4">
                  <Scale className="w-7 h-7 text-amber" />
                </div>
                <h3 className="font-display text-xl text-paper font-semibold">Investigation Board Ready</h3>
                <p className="text-muted text-sm mt-2 max-w-md leading-relaxed">
                  Select a customer or register a new one, enter or paste a complaint, and trigger the AI investigation.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-border mt-20 py-8 px-8 bg-ink-light/40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs text-muted">
          <div className="flex items-center gap-2.5">
            <Scale className="w-4 h-4 text-amber" />
            <span className="font-display font-semibold text-paper">INQUEST</span>
            <span>· RootCause AI · Autonomous Complaint Resolution</span>
          </div>
          <span>Built with Node.js · Google Gemini · React · ReactFlow</span>
        </div>
      </footer>
    </div>
  );
}
