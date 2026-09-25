const db = require('../db/connection');

function rowToOrder(row) {
  return { ...row, returnRequested: !!row.returnRequested };
}

function rowToSecurityEvent(row) {
  return { ...row, flagged: !!row.flagged };
}

function nextId(table, prefix, idColumn = 'id') {
  const rows = db.prepare(`SELECT ${idColumn} as id FROM ${table}`).all();
  const nums = rows
    .map((r) => parseInt(String(r.id).replace(prefix, ''), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

const getAllCustomers = () => db.prepare('SELECT * FROM customers').all();

const getCustomerById = (id) =>
  db.prepare('SELECT * FROM customers WHERE id = ?').get(id) || null;

const getOrdersByCustomerId = (id) =>
  db.prepare('SELECT * FROM orders WHERE customerId = ?').all(id).map(rowToOrder);

const getPaymentsByCustomerId = (id) =>
  db.prepare('SELECT * FROM payments WHERE customerId = ?').all(id);

const getTicketsByCustomerId = (id) =>
  db.prepare('SELECT * FROM tickets WHERE customerId = ?').all(id);

const getRefundsByCustomerId = (id) =>
  db.prepare('SELECT * FROM refunds WHERE customerId = ?').all(id);

const getSecurityEventsByCustomerId = (id) =>
  db.prepare('SELECT * FROM security_events WHERE customerId = ?').all(id).map(rowToSecurityEvent);

const getAllPolicies = () => db.prepare('SELECT * FROM policies').all();

function addCustomer({ name, email, tier, order }) {
  const customer = {
    id: nextId('customers', 'CUST'),
    name,
    email,
    tier: tier || 'silver',
    joinedOn: new Date().toISOString().slice(0, 10),
  };

  db.prepare('INSERT INTO customers (id, name, email, tier, joinedOn) VALUES (@id, @name, @email, @tier, @joinedOn)').run(customer);

  if (order && order.product && order.amount) {
    const newOrder = {
      id: nextId('orders', 'ORDER'),
      customerId: customer.id,
      product: order.product,
      amount: Number(order.amount),
      status: order.status || 'delivered',
      deliveredOn: order.status === 'in_transit' ? null : new Date().toISOString().slice(0, 10),
      returnRequested: 0,
    };
    db.prepare('INSERT INTO orders (id, customerId, product, amount, status, deliveredOn, returnRequested) VALUES (@id, @customerId, @product, @amount, @status, @deliveredOn, @returnRequested)').run(newOrder);

    const newPayment = {
      id: nextId('payments', 'PAY'),
      orderId: newOrder.id,
      customerId: customer.id,
      amount: newOrder.amount,
      gatewayStatus: order.gatewayStatus || 'success',
      localStatus: order.localStatus || 'success',
      timestamp: new Date().toISOString(),
    };
    db.prepare('INSERT INTO payments (id, orderId, customerId, amount, gatewayStatus, localStatus, timestamp) VALUES (@id, @orderId, @customerId, @amount, @gatewayStatus, @localStatus, @timestamp)').run(newPayment);

    return { customer, order: rowToOrder(newOrder), payment: newPayment };
  }

  return { customer, order: null, payment: null };
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
  addCustomer,
};
