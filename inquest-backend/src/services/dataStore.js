const fs = require('fs');
const path = require('path');

const customersPath = path.join(__dirname, '../mockData/customers.json');
const ordersPath = path.join(__dirname, '../mockData/orders.json');
const paymentsPath = path.join(__dirname, '../mockData/payments.json');
const ticketsPath = path.join(__dirname, '../mockData/tickets.json');
const policiesPath = path.join(__dirname, '../mockData/policies.json');
const refundsPath = path.join(__dirname, '../mockData/refunds.json');
const securityEventsPath = path.join(__dirname, '../mockData/securityEvents.json');

function readJsonSafe(filePath, defaultVal = []) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error(`[dataStore] Error reading ${filePath}:`, err.message);
  }
  return defaultVal;
}

let customers = readJsonSafe(customersPath, []);
let orders = readJsonSafe(ordersPath, []);
let payments = readJsonSafe(paymentsPath, []);
let tickets = readJsonSafe(ticketsPath, []);
let policies = readJsonSafe(policiesPath, []);
let refunds = readJsonSafe(refundsPath, []);
let securityEvents = readJsonSafe(securityEventsPath, []);

function persistCustomers() {
  fs.writeFileSync(customersPath, `${JSON.stringify(customers, null, 2)}\n`);
}

function persistOrders() {
  fs.writeFileSync(ordersPath, `${JSON.stringify(orders, null, 2)}\n`);
}

function persistPayments() {
  fs.writeFileSync(paymentsPath, `${JSON.stringify(payments, null, 2)}\n`);
}

function persistTickets() {
  fs.writeFileSync(ticketsPath, `${JSON.stringify(tickets, null, 2)}\n`);
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
const getRefundsByCustomerId = (id) => refunds.filter((r) => r.customerId === id);
const getSecurityEventsByCustomerId = (id) => securityEvents.filter((s) => s.customerId === id);
const getAllPolicies = () => policies.slice();
const getPolicyById = (id) => policies.find((p) => p.id === id) || null;

function addCustomer({ id, name, email, tier, joinedDate, joinedOn, orders: newOrders, payments: newPayments, tickets: newTickets }) {
  const finalId = id ? String(id).trim().toUpperCase() : nextCustomerId();

  if (customers.some((c) => c.id.toUpperCase() === finalId)) {
    throw new Error(`Customer with ID ${finalId} already exists`);
  }

  const joinDate = joinedDate || joinedOn || new Date().toISOString().slice(0, 10);
  const customer = {
    id: finalId,
    name: name.trim(),
    email: email.trim(),
    tier: tier || 'silver',
    joinedDate: joinDate,
    joinedOn: joinDate,
  };

  if (Array.isArray(newOrders) && newOrders.length > 0) {
    for (const ord of newOrders) {
      if (!ord.id) {
        throw new Error('All new customer orders must have a valid id');
      }
      if (orders.some((existing) => existing.id.toUpperCase() === ord.id.toUpperCase())) {
        throw new Error(`Order with ID ${ord.id} already exists`);
      }
      orders.push({
        ...ord,
        customerId: finalId,
      });
    }
    persistOrders();
  }

  if (Array.isArray(newPayments) && newPayments.length > 0) {
    for (const pay of newPayments) {
      payments.push({
        ...pay,
        customerId: finalId,
      });
    }
    persistPayments();
  }

  if (Array.isArray(newTickets) && newTickets.length > 0) {
    for (const tkt of newTickets) {
      tickets.push({
        ...tkt,
        customerId: finalId,
      });
    }
    persistTickets();
  }

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
  getRefundsByCustomerId,
  getSecurityEventsByCustomerId,
  getAllPolicies,
  getPolicyById,
  addCustomer,
};
