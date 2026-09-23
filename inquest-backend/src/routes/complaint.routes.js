const express = require('express');
const router = express.Router();
const { submitComplaint } = require('../controllers/complaint.controller');
const { complaintValidationRules } = require('../middleware/validators/complaintValidator');
const { validate } = require('../middleware/validate');

router.post('/', complaintValidationRules, validate, submitComplaint);

module.exports = router;
