const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed');
    err.details = data.details;
    err.status = res.status;
    throw err;
  }
  return data;
}

export function submitComplaint(customerId, complaintText) {
  return request('/complaints', {
    method: 'POST',
    body: JSON.stringify({ customerId, complaintText }),
  });
}

export function getCustomers() {
  return request('/customers');
}

export function createCustomer(payload) {
  return request('/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getCustomerContext(customerId) {
  return request(`/customers/${customerId}/context`);
}

export function checkHealth() {
  return request('/health');
}
