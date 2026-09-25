const db = require('../db/connection');

function getOverview(req, res) {
  const data = {
    customers: db.prepare('SELECT * FROM customers').all(),
    orders: db.prepare('SELECT * FROM orders').all(),
    payments: db.prepare('SELECT * FROM payments').all(),
    tickets: db.prepare('SELECT * FROM tickets').all(),
    refunds: db.prepare('SELECT * FROM refunds').all(),
    securityEvents: db.prepare('SELECT * FROM security_events').all(),
    policies: db.prepare('SELECT * FROM policies').all(),
  };
  res.status(200).json({ success: true, data });
}

module.exports = { getOverview };
