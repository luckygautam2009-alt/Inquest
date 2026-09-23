const fs = require('fs');
const path = require('path');

const customersPath = path.join(__dirname, '../mockData/customers.json');

let customers = JSON.parse(fs.readFileSync(customersPath, 'utf8'));
const orders = require('../mockData/orders.json');
const payments = require('../mockData/payments.json');
const tickets = require('../mockData/tickets.json');
const policies = require('../mockData/policies.json');

function persistCustomers() {
  fs.writeFileSync(customersPath, `${JSON.stringify(customers, null, 2)}\n`);
}

function nextCustomerId() {
  const nums = customers.map((c) => {
    const match = /^CUST(\d+)$/i.exec(c.id);
    return match ? Number(match[1]) : 0;
  });
  const next = Math.max(0, ...nums) + 1;
  return `CUST${String(next).padStart(3, '0')}`;
}

const getAllCustomers = () => customers.slice();
const getCustomerById = (id) => customers.find((c) => c.id === id) || null;
const getOrdersByCustomerId = (id) => orders.filter((o) => o.customerId === id);
const getPaymentsByCustomerId = (id) => payments.filter((p) => p.customerId === id);
const getTicketsByCustomerId = (id) => tickets.filter((t) => t.customerId === id);
const getAllPolicies = () => policies;

function addCustomer({ name, email, tier, joinedOn }) {
  const customer = {
    id: nextCustomerId(),
    name,
    email,
    joinedOn: joinedOn || new Date().toISOString().slice(0, 10),
    tier: tier || 'silver',
  };
  customers.push(customer);
  persistCustomers();
  return customer;
}

module.exports = {
  getAllCustomers,
  getCustomerById,
  getOrdersByCustomerId,
  getPaymentsByCustomerId,
  getTicketsByCustomerId,
  getAllPolicies,
  addCustomer,
};
