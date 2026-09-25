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

async function requestMultipart(path, formData, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data.details?.length
        ? `${data.error}: ${data.details.map((d) => d.message).join(', ')}`
        : data.error || 'Request failed';
      const err = new Error(msg);
      err.status = res.status;
      err.details = data.details;
      throw err;
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Verification timed out — please try again.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
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

// ── Verification ──
export function getReferenceStatus() {
  return request('/verify/reference/status');
}

export function uploadReferenceIdCard({ file, adminPassword }) {
  const fd = new FormData();
  fd.append('idCard', file);
  fd.append('adminPassword', adminPassword);
  return requestMultipart('/verify/reference', fd);
}

export function verifyEmployee({ file, employeeName, employeeEmail, adminPassword }) {
  const fd = new FormData();
  fd.append('idCard', file);
  fd.append('employeeName', employeeName);
  fd.append('employeeEmail', employeeEmail);
  fd.append('adminPassword', adminPassword);
  return requestMultipart('/verify', fd);
}

// ── Admin ──
export function getAdminOverview(adminPassword) {
  return request('/admin/overview', {
    method: 'POST',
    body: JSON.stringify({ adminPassword }),
  });
}
