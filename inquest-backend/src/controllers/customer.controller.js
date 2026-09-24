const dataStore = require('../services/dataStore');

function listCustomers(req, res) {
  res.status(200).json({ success: true, data: dataStore.getAllCustomers() });
}

function createCustomer(req, res) {
  const { name, email, tier } = req.body;
  const customer = dataStore.addCustomer({ name, email, tier });
  res.status(201).json({ success: true, data: customer });
}

module.exports = { listCustomers, createCustomer };
