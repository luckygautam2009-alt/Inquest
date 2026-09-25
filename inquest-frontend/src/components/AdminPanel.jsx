import { useState, useEffect } from 'react';
import { X, Lock, Upload, Database, CheckCircle, XCircle } from 'lucide-react';
import { getAdminOverview, uploadReferenceIdCard, verifyEmployee, getReferenceStatus } from '../api/client';
import IDScanner from './IDScanner';

const TABLES = ['customers', 'orders', 'payments', 'refunds', 'tickets', 'securityEvents', 'policies'];

export default function AdminPanel({ onClose }) {
  const [refConfigured, setRefConfigured] = useState(null); // null = checking
  const [setupPassword, setSetupPassword] = useState('');
  const [setupFile, setSetupFile] = useState(null);
  const [setupError, setSetupError] = useState(null);
  const [setupLoading, setSetupLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [scanning, setScanning] = useState(false);

  const [unlocked, setUnlocked] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [activeTable, setActiveTable] = useState('customers');

  const [refFile, setRefFile] = useState(null);
  const [refMsg, setRefMsg] = useState(null);

  function handleStartScan(e) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Name, email, and admin password are all required.');
      return;
    }
    setScanning(true);
  }

  async function handleVerified(verifyData) {
    setVerifyResult(verifyData);
    setLoading(true);
    try {
      const overviewRes = await getAdminOverview(password);
      setData(overviewRes.data);
      setUnlocked(true);
    } catch (err) {
      setError(err.message || 'Could not load admin data');
      setScanning(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getReferenceStatus()
      .then((res) => setRefConfigured(res.data.configured))
      .catch(() => setRefConfigured(false));
  }, []);

  async function handleSetupReference(e) {
    e.preventDefault();
    setSetupError(null);
    if (!setupPassword.trim()) {
      setSetupError('Admin password is required.');
      return;
    }
    if (!setupFile) {
      setSetupError('Please upload the reference NIET ID card image.');
      return;
    }
    setSetupLoading(true);
    try {
      await uploadReferenceIdCard({ file: setupFile, adminPassword: setupPassword });
      setRefConfigured(true);
    } catch (err) {
      setSetupError(err.message || 'Could not save reference ID card');
    } finally {
      setSetupLoading(false);
    }
  }

  async function handleUploadReference() {
    if (!refFile) return;
    setRefMsg(null);
    try {
      await uploadReferenceIdCard({ file: refFile, adminPassword: password });
      setRefMsg('Reference ID card saved successfully.');
    } catch (err) {
      setRefMsg(err.message || 'Upload failed');
    }
  }

  const rows = data?.[activeTable] || [];
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-ink-light border border-border-strong rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-lg relative">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-amber" />
            <h3 className="font-display text-xl text-paper">Admin Panel</h3>
          </div>
          <button onClick={onClose} className="text-muted hover:text-paper cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {refConfigured === null ? (
          <div className="p-10 text-center text-sm text-muted">Checking reference status...</div>
        ) : !refConfigured ? (
          <form onSubmit={handleSetupReference} className="p-6 space-y-4 max-w-md mx-auto w-full">
            <div className="flex items-center gap-2 text-sm text-muted mb-1">
              <Lock className="w-4 h-4" /> One-time setup: upload the reference NIET ID card
            </div>
            <p className="text-xs text-muted">
              No reference ID card is configured yet. An admin must upload one photo of a valid
              NIET ID card once — all future verification scans will be compared against it.
            </p>
            <input
              value={setupPassword}
              onChange={(e) => setSetupPassword(e.target.value)}
              type="password"
              placeholder="Admin password"
              className="w-full bg-ink border border-border-strong rounded-lg px-3.5 py-2.5 text-sm text-paper placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-amber/50"
            />
            <label className="flex items-center gap-2 border border-dashed border-border-strong rounded-lg px-3.5 py-3 text-sm text-muted cursor-pointer hover:border-amber/50 transition-colors">
              <Upload className="w-4 h-4" />
              {setupFile ? setupFile.name : 'Upload reference NIET ID card photo'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setSetupFile(e.target.files?.[0] || null)} />
            </label>
            {setupError && <p className="text-xs text-alert">{setupError}</p>}
            <button
              type="submit"
              disabled={setupLoading}
              className="w-full bg-amber text-ink font-bold px-4 py-2.5 rounded-lg text-sm disabled:opacity-50 cursor-pointer"
            >
              {setupLoading ? 'Saving...' : 'Save Reference & Continue'}
            </button>
          </form>
        ) : !unlocked ? (
          loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3 text-center">
              <span className="w-7 h-7 border-2 border-amber/40 border-t-amber rounded-full animate-spin" />
              <p className="text-sm font-semibold text-paper">Unlocking admin console…</p>
            </div>
          ) : scanning ? (
            <div className="p-6 max-w-md mx-auto w-full">
              <IDScanner
                name={name.trim()}
                email={email.trim()}
                adminPassword={password}
                onVerified={handleVerified}
                onCancel={() => setScanning(false)}
              />
            </div>
          ) : (
            <form onSubmit={handleStartScan} className="p-6 space-y-4 overflow-y-auto max-w-md mx-auto w-full">
              <div className="flex items-center gap-2 text-sm text-muted mb-1">
                <Lock className="w-4 h-4" /> Identity verification required to access admin data
              </div>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full bg-ink border border-border-strong rounded-lg px-3.5 py-2.5 text-sm text-paper placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-amber/50"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Email"
                className="w-full bg-ink border border-border-strong rounded-lg px-3.5 py-2.5 text-sm text-paper placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-amber/50"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Admin password"
                className="w-full bg-ink border border-border-strong rounded-lg px-3.5 py-2.5 text-sm text-paper placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-amber/50"
              />

              {error && <p className="text-xs text-alert">{error}</p>}

              <button
                type="submit"
                className="w-full bg-amber text-ink font-bold px-4 py-2.5 rounded-lg text-sm cursor-pointer"
              >
                Start ID Scan
              </button>
            </form>
          )
        ) : (
          <div className="flex flex-col overflow-hidden flex-1">
            <div className="px-6 py-3 border-b border-border flex items-center gap-2 text-xs text-verified">
              <CheckCircle className="w-4 h-4" />
              Verified — {name}
            </div>

            <div className="px-6 py-4 border-b border-border flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 border border-dashed border-border-strong rounded-lg px-3.5 py-2 text-xs text-muted cursor-pointer hover:border-amber/50">
                <Upload className="w-4 h-4" />
                {refFile ? refFile.name : 'Upload new reference NIET ID card'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setRefFile(e.target.files?.[0] || null)} />
              </label>
              <button
                onClick={handleUploadReference}
                className="text-xs font-bold bg-ink-lighter text-paper px-3.5 py-2 rounded-lg border border-border-strong cursor-pointer"
              >
                Save Reference
              </button>
              {refMsg && <span className="text-xs text-muted">{refMsg}</span>}
            </div>

            <div className="px-6 py-3 border-b border-border flex flex-wrap gap-2">
              {TABLES.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTable(t)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                    activeTable === t
                      ? 'bg-amber text-ink border-amber'
                      : 'bg-ink-lighter text-muted border-border-strong hover:text-paper'
                  }`}
                >
                  {t} ({data?.[t]?.length || 0})
                </button>
              ))}
            </div>

            <div className="overflow-auto flex-1 p-6">
              {rows.length === 0 ? (
                <p className="text-sm text-muted">No rows in {activeTable}.</p>
              ) : (
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border-strong">
                      {columns.map((c) => (
                        <th key={c} className="text-left py-2 pr-4 text-muted font-bold uppercase tracking-wide">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-b border-border">
                        {columns.map((c) => (
                          <td key={c} className="py-2 pr-4 text-paper whitespace-nowrap">{String(row[c] ?? '—')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
