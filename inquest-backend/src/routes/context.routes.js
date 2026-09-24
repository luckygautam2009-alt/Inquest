const express = require('express');
const router = express.Router();
const { getCustomerContext } = require('../controllers/context.controller');
const { listCustomers, createCustomer } = require('../controllers/customer.controller');
const { customerIdParamRules } = require('../middleware/validators/customerValidator');
const { newCustomerValidationRules } = require('../middleware/validators/newCustomerValidator');
const { validate } = require('../middleware/validate');

router.get('/', listCustomers);
router.post('/', newCustomerValidationRules, validate, createCustomer);
router.get('/:customerId/context', customerIdParamRules, validate, getCustomerContext);

module.exports = router;
