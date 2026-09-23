const dataStore = require('../services/dataStore');

function listCustomers(req, res) {
  const customers = dataStore.getAllCustomers().map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    tier: c.tier,
    joinedOn: c.joinedOn,
  }));
  res.status(200).json({ success: true, data: customers });
}

function createCustomer(req, res) {
  const { name, email, tier, joinedOn } = req.body;
  const customer = dataStore.addCustomer({ name, email, tier, joinedOn });
  res.status(201).json({ success: true, data: customer });
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
  const policies = dataStore.getAllPolicies();

  res.status(200).json({
    success: true,
    data: { customer, orders, payments, tickets, policies },
  });
}

module.exports = { listCustomers, createCustomer, getCustomerContext };
