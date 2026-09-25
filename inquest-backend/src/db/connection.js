const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../inquest.db');
const isNewDb = !fs.existsSync(DB_PATH);

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    tier TEXT NOT NULL,
    joinedOn TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customerId TEXT NOT NULL,
    product TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL,
    deliveredOn TEXT,
    returnRequested INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    orderId TEXT NOT NULL,
    customerId TEXT NOT NULL,
    amount REAL NOT NULL,
    gatewayStatus TEXT NOT NULL,
    localStatus TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    customerId TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL,
    resolvedOn TEXT,
    resolution TEXT
  );

  CREATE TABLE IF NOT EXISTS policies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    condition TEXT NOT NULL,
    eligibleWithinDays INTEGER,
    description TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS refunds (
    id TEXT PRIMARY KEY,
    orderId TEXT NOT NULL,
    customerId TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL,
    initiatedAt TEXT NOT NULL,
    completedAt TEXT,
    reason TEXT,
    gatewayRef TEXT
  );

  CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY,
    customerId TEXT NOT NULL,
    eventType TEXT NOT NULL,
    ip TEXT,
    location TEXT,
    device TEXT,
    timestamp TEXT NOT NULL,
    flagged INTEGER NOT NULL DEFAULT 0,
    alert TEXT
  );
`);

function seedIfEmpty(table, jsonPath, insertSql, transform = (x) => x) {
  const count = db.prepare(`SELECT COUNT(*) as n FROM ${table}`).get().n;
  if (count === 0) {
    const data = require(jsonPath);
    const insert = db.prepare(insertSql);
    const run = db.transaction(() => data.forEach((row) => insert.run(transform(row))));
    run();
    console.log(`[db] Seeded ${table} (${data.length} rows)`);
  }
}

seedIfEmpty(
  'customers', '../mockData/customers.json',
  'INSERT INTO customers (id, name, email, tier, joinedOn) VALUES (@id, @name, @email, @tier, @joinedOn)'
);
seedIfEmpty(
  'orders', '../mockData/orders.json',
  'INSERT INTO orders (id, customerId, product, amount, status, deliveredOn, returnRequested) VALUES (@id, @customerId, @product, @amount, @status, @deliveredOn, @returnRequested)',
  (o) => ({ ...o, returnRequested: o.returnRequested ? 1 : 0 })
);
seedIfEmpty(
  'payments', '../mockData/payments.json',
  'INSERT INTO payments (id, orderId, customerId, amount, gatewayStatus, localStatus, timestamp) VALUES (@id, @orderId, @customerId, @amount, @gatewayStatus, @localStatus, @timestamp)'
);
seedIfEmpty(
  'tickets', '../mockData/tickets.json',
  'INSERT INTO tickets (id, customerId, subject, status, resolvedOn, resolution) VALUES (@id, @customerId, @subject, @status, @resolvedOn, @resolution)'
);
seedIfEmpty(
  'refunds', '../mockData/refunds.json',
  'INSERT INTO refunds (id, orderId, customerId, amount, status, initiatedAt, completedAt, reason, gatewayRef) VALUES (@id, @orderId, @customerId, @amount, @status, @initiatedAt, @completedAt, @reason, @gatewayRef)',
  (r) => ({ completedAt: null, reason: null, gatewayRef: null, ...r })
);
seedIfEmpty(
  'security_events', '../mockData/securityEvents.json',
  'INSERT INTO security_events (id, customerId, eventType, ip, location, device, timestamp, flagged, alert) VALUES (@id, @customerId, @eventType, @ip, @location, @device, @timestamp, @flagged, @alert)',
  (s) => ({ alert: null, ...s, flagged: s.flagged ? 1 : 0 })
);

// Policies are static config, not user data — always resync to latest
// definitions on startup rather than only seeding once.
const policies = require('../mockData/policies.json');
db.exec('DELETE FROM policies');
const insertPolicy = db.prepare('INSERT INTO policies (id, title, condition, eligibleWithinDays, description) VALUES (@id, @title, @condition, @eligibleWithinDays, @description)');
const resyncPolicies = db.transaction(() => {
  policies.forEach((p) => insertPolicy.run({ ...p, eligibleWithinDays: p.eligibleWithinDays ?? null }));
});
resyncPolicies();
console.log(`[db] Policies synced (${policies.length})`);

module.exports = db;
