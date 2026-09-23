const dataStore = require('../services/dataStore');

function listCustomers(req, res) {
  const customers = dataStore.getAllCustomers().map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    tier: c.tier,
    joinedDate: c.joinedDate || c.joinedOn,
    joinedOn: c.joinedOn || c.joinedDate,
  }));
  res.status(200).json({ success: true, data: customers });
}

function createCustomer(req, res) {
  try {
    const { id, name, email, tier, joinedDate, joinedOn, orders, payments, tickets } = req.body;
    const customer = dataStore.addCustomer({
      id,
      name,
      email,
      tier,
      joinedDate,
      joinedOn,
      orders,
      payments,
      tickets,
    });
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

function getCustomerContext(req, res) {
  const { customerId } = req.params;

  const customer = dataStore.getCustomerById(customerId);
  if (!customer) {
    return res.status(404).json({ success: false, error: 'Customer not found' });
  }

  const orders = dataStore.getOrdersByCustomerId(customerId);
  const payments = dataStore.getPaymentsByCustomerId(customerId);
  const tickets = dataStore.getTicketsByCustomerId(customerId);
  const refunds = dataStore.getRefundsByCustomerId(customerId);
  const securityEvents = dataStore.getSecurityEventsByCustomerId(customerId);
  const policies = dataStore.getAllPolicies();

  res.status(200).json({
    success: true,
    data: {
      customer,
      orders,
      payments,
      tickets,
      refunds,
      securityEvents,
      policies,
    },
  });
}

module.exports = { listCustomers, createCustomer, getCustomerContext };
