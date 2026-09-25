const dataStore = require('../services/dataStore');

function listCustomers(req, res) {
  res.status(200).json({ success: true, data: dataStore.getAllCustomers() });
}

function createCustomer(req, res) {
  const { name, email, tier, order } = req.body;
  const result = dataStore.addCustomer({ name, email, tier, order });
  res.status(201).json({ success: true, data: result });
}

module.exports = { listCustomers, createCustomer };
