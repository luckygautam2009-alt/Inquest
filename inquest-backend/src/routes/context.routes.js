const express = require('express');
const router = express.Router();
const { getCustomerContext, listCustomers, createCustomer } = require('../controllers/context.controller');
const { customerIdParamRules, createCustomerRules } = require('../middleware/validators/customerValidator');
const { validate } = require('../middleware/validate');

router.get('/', listCustomers);
router.post('/', createCustomerRules, validate, createCustomer);
router.get('/:customerId/context', customerIdParamRules, validate, getCustomerContext);

module.exports = router;
