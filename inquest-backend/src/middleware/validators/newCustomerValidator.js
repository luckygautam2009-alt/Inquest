const { body } = require('express-validator');

const newCustomerValidationRules = [
  body('name')
    .exists({ checkFalsy: true }).withMessage('name is required')
    .bail()
    .isString().withMessage('name must be a string')
    .trim()
    .isLength({ min: 2, max: 80 }).withMessage('name must be 2-80 characters'),

  body('email')
    .exists({ checkFalsy: true }).withMessage('email is required')
    .bail()
    .isEmail().withMessage('email must be valid')
    .normalizeEmail(),

  body('tier')
    .optional()
    .isIn(['silver', 'gold', 'platinum']).withMessage('tier must be silver, gold, or platinum'),
];

module.exports = { newCustomerValidationRules };
