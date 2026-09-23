import { useState } from 'react';
import { submitComplaint } from './api/client';
import ComplaintForm from './components/ComplaintForm';
import ResultPanel from './components/ResultPanel';

export default function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(customerId, complaintText) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await submitComplaint(customerId, complaintText);
      setResult(res.data);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink text-paper">
      <header className="border-b border-white/10 px-8 py-6">
        <h1 className="font-display text-3xl tracking-tight">INQUEST</h1>
        <p className="text-muted text-sm mt-1">Every complaint is investigated before a human sees it.</p>
      </header>

      <main className="max-w-5xl mx-auto px-8 py-10 space-y-10">
        <ComplaintForm onSubmit={handleSubmit} loading={loading} />

        {error && (
          <div className="border border-alert/40 bg-alert/10 text-alert px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {result && <ResultPanel data={result} />}
      </main>
    </div>
  );
}
