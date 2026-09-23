import { useEffect, useState } from 'react';
import { createCustomer, getCustomers } from '../api/client';

const FALLBACK_CUSTOMERS = [
  { id: 'CUST001', name: 'Ravi Sharma' },
  { id: 'CUST002', name: 'Priya Mehta' },
  { id: 'CUST003', name: 'Aman Verma' },
  { id: 'CUST004', name: 'Sneha Kapoor' },
];

export default function ComplaintForm({ onSubmit, loading }) {
  const [customers, setCustomers] = useState(FALLBACK_CUSTOMERS);
  const [customerId, setCustomerId] = useState('CUST001');
  const [complaintText, setComplaintText] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newTier, setNewTier] = useState('silver');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  async function loadCustomers(selectId) {
    try {
      const res = await getCustomers();
      const list = res.data || [];
      if (list.length) {
        setCustomers(list);
        if (selectId) setCustomerId(selectId);
        else if (!list.some((c) => c.id === customerId)) setCustomerId(list[0].id);
      }
    } catch {
      setCustomers(FALLBACK_CUSTOMERS);
    }
  }

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (complaintText.trim().length < 5) return;
    onSubmit(customerId, complaintText.trim());
  }

  async function handleAddCustomer(e) {
    e.preventDefault();
    setFormError(null);
    if (newName.trim().length < 2 || !newEmail.trim()) {
      setFormError('Name and email are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await createCustomer({
        name: newName.trim(),
        email: newEmail.trim(),
        tier: newTier,
      });
      const created = res.data;
      setNewName('');
      setNewEmail('');
      setNewTier('silver');
      setShowAdd(false);
      await loadCustomers(created.id);
    } catch (err) {
      setFormError(err.message || 'Could not add customer');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-paper text-ink rounded-lg p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Customer</label>
        <select
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="w-full border border-black/10 rounded-md px-3 py-2 bg-white text-sm"
        >
          {customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="mt-2 text-sm text-muted underline"
        >
          {showAdd ? 'Cancel' : '+ Add Customer'}
        </button>
      </div>

      {showAdd && (
        <div className="border border-black/10 rounded-md p-3 space-y-2">
          <div className="text-sm font-medium">New customer</div>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            className="w-full border border-black/10 rounded-md px-3 py-2 text-sm bg-white"
          />
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Email"
            type="email"
            className="w-full border border-black/10 rounded-md px-3 py-2 text-sm bg-white"
          />
          <select
            value={newTier}
            onChange={(e) => setNewTier(e.target.value)}
            className="w-full border border-black/10 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="silver">silver</option>
            <option value="gold">gold</option>
            <option value="platinum">platinum</option>
          </select>
          {formError && <p className="text-sm text-alert">{formError}</p>}
          <button
            type="button"
            disabled={saving}
            onClick={handleAddCustomer}
            className="bg-ink text-paper px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Customer'}
          </button>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Complaint</label>
        <textarea
          value={complaintText}
          onChange={(e) => setComplaintText(e.target.value)}
          rows={3}
          placeholder="Describe the issue..."
          className="w-full border border-black/10 rounded-md px-3 py-2 text-sm resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-ink text-paper px-5 py-2 rounded-md text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Investigating...' : 'Submit Complaint'}
      </button>
    </form>
  );
}
