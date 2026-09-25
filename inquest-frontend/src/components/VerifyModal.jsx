import { useState } from 'react';
import { X, ShieldCheck, Upload, CheckCircle, XCircle } from 'lucide-react';
import { verifyEmployee } from '../api/client';

export default function VerifyModal({ onClose }) {
  const [employeeName, setEmployeeName] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!file) {
      setError('Please upload an ID card photo.');
      return;
    }
    setLoading(true);
    try {
      const res = await verifyEmployee({ file, employeeName, employeeEmail, adminPassword });
      setResult(res.data);
    } catch (err) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-ink-light border border-border-strong rounded-2xl w-full max-w-md p-6 shadow-lg relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted hover:text-paper cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <ShieldCheck className="w-5 h-5 text-amber" />
          <h3 className="font-display text-xl text-paper">Manual Verification</h3>
        </div>

        {!result && (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <input
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="Employee name"
              className="w-full bg-ink border border-border-strong rounded-lg px-3.5 py-2.5 text-sm text-paper placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-amber/50"
            />
            <input
              value={employeeEmail}
              onChange={(e) => setEmployeeEmail(e.target.value)}
              placeholder="Employee email"
              type="email"
              className="w-full bg-ink border border-border-strong rounded-lg px-3.5 py-2.5 text-sm text-paper placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-amber/50"
            />
            <input
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Admin password"
              type="password"
              className="w-full bg-ink border border-border-strong rounded-lg px-3.5 py-2.5 text-sm text-paper placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-amber/50"
            />

            <label className="flex items-center gap-2 border border-dashed border-border-strong rounded-lg px-3.5 py-3 text-sm text-muted cursor-pointer hover:border-amber/50 transition-colors">
              <Upload className="w-4 h-4" />
              {file ? file.name : 'Upload ID card photo'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>

            {error && (
              <p className="text-xs text-alert bg-alert-dim border border-alert/30 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber text-ink font-bold px-4 py-2.5 rounded-lg text-sm disabled:opacity-50 hover:bg-amber-light transition-colors cursor-pointer"
            >
              {loading ? 'Verifying...' : 'Verify ID Card'}
            </button>
          </form>
        )}

        {result && (
          <div className="space-y-3">
            <div className={`flex items-center gap-2 text-base font-bold ${result.verified ? 'text-verified' : 'text-alert'}`}>
              {result.verified ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {result.verified ? 'Verified' : 'Not Verified'} · {result.confidence}% confidence
            </div>
            <p className="text-sm text-muted">{result.reason}</p>
            {result.details && (result.details.institutionDetected || result.details.cardholderName || result.details.idNumber) && (
              <div className="bg-ink p-3 rounded-lg border border-border-strong space-y-1 text-xs">
                {result.details.institutionDetected && (
                  <div className="text-paper/90"><span className="text-muted">Institution:</span> {result.details.institutionDetected}</div>
                )}
                {result.details.cardholderName && (
                  <div className="text-paper/90"><span className="text-muted">Cardholder:</span> {result.details.cardholderName}</div>
                )}
                {result.details.idNumber && (
                  <div className="text-paper/90"><span className="text-muted">Roll / ID:</span> {result.details.idNumber}</div>
                )}
                {result.details.branch && (
                  <div className="text-paper/90"><span className="text-muted">Branch:</span> {result.details.branch}</div>
                )}
              </div>
            )}
            <div className="text-xs text-muted pt-2 border-t border-border">
              {result.employeeName} · {result.employeeEmail}
            </div>
            <button
              onClick={onClose}
              className="w-full bg-ink-lighter text-paper font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-ink transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
