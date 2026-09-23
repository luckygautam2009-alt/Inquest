const dataStore = require('./dataStore');

function extractOrderIdHint(complaintText) {
  if (!complaintText) return null;
  const normalized = complaintText
    .replace(/[ऑओ]र्ड[रर्]/g, 'order')
    .replace(/\border\b/gi, 'order');

  const patterns = [
    /order\s*#?\s*([A-Za-z]*\d+[A-Za-z0-9]*)/i,
    /\b(ORDER\d+)\b/i,
    /#\s*(ORDER\d+|\d{2,})/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      return match[1].toUpperCase().replace(/^ORDER/, '');
    }
  }
  return null;
}

function investigate(customerId, complaintText) {
  const customer = dataStore.getCustomerById(customerId);
  if (!customer) {
    return { found: false, error: 'Customer not found' };
  }

  const orders = dataStore.getOrdersByCustomerId(customerId);
  const payments = dataStore.getPaymentsByCustomerId(customerId);
  const tickets = dataStore.getTicketsByCustomerId(customerId);
  const policies = dataStore.getAllPolicies();

  const orderHint = extractOrderIdHint(complaintText);

  let focusOrder = null;
  let focusPayments = [];
  let orderMismatch = false;

  if (orderHint) {
    focusOrder = orders.find((o) => o.id.toUpperCase().includes(orderHint)) || null;
    if (focusOrder) {
      if (focusOrder.customerId !== customerId) {
        focusOrder = null;
        focusPayments = [];
        orderMismatch = true;
      } else {
        focusPayments = payments.filter(
          (p) => p.orderId === focusOrder.id && p.customerId === customerId
        );
      }
    } else {
      orderMismatch = true;
    }
  }

  return {
    found: true,
    customer,
    orders,
    payments,
    tickets,
    policies,
    focusOrder,
    focusPayments,
    orderHintDetected: orderHint,
    orderVerified: Boolean(focusOrder),
    orderMismatch,
  };
}

module.exports = { investigate, extractOrderIdHint };
