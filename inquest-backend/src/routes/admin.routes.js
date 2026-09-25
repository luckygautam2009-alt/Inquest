const express = require('express');
const router = express.Router();
const { requireAdminPassword } = require('../middleware/adminAuth');
const { getOverview } = require('../controllers/admin.controller');

router.post('/overview', requireAdminPassword, getOverview);

module.exports = router;
