const customersData = require('../mockData/customers.json');
const orders = require('../mockData/orders.json');
const payments = require('../mockData/payments.json');
const tickets = require('../mockData/tickets.json');
const policies = require('../mockData/policies.json');

// In-memory copy so newly added customers persist for the life of the
// server process (resets on restart — mock data has no real DB backing).
const customers = [...customersData];

function nextCustomerId() {
  const nums = customers
    .map((c) => parseInt(c.id.replace('CUST', ''), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `CUST${String(max + 1).padStart(3, '0')}`;
}

const getAllCustomers = () => customers;
const getCustomerById = (id) => customers.find((c) => c.id === id) || null;
const getOrdersByCustomerId = (id) => orders.filter((o) => o.customerId === id);
const getPaymentsByCustomerId = (id) => payments.filter((p) => p.customerId === id);
const getTicketsByCustomerId = (id) => tickets.filter((t) => t.customerId === id);
const getAllPolicies = () => policies;

function addCustomer({ name, email, tier }) {
  const customer = {
    id: nextCustomerId(),
    name,
    email,
    tier: tier || 'silver',
    joinedOn: new Date().toISOString().slice(0, 10),
  };
  customers.push(customer);
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
