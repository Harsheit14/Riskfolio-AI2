/**
 * ✅ INPUT VALIDATION MIDDLEWARE
 * 
 * Purpose: Validate request bodies using Joi schemas
 * Strategy: Define schemas per endpoint, validate before controller
 * 
 * Validation patterns:
 * - Email: valid format
 * - Password: min 8 chars, numbers, uppercase
 * - Quantity: positive number
 * - Price: positive number
 * - Asset symbol: uppercase, 1-10 chars
 */

import Joi from "joi";

// ═══════════════════════════════════════════════════════
// AUTH SCHEMAS
// ═══════════════════════════════════════════════════════

export const authRegisterSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      "string.email": "Invalid email address",
      "any.required": "Email is required",
    }),
  password: Joi.string()
    .min(8)
    .pattern(/[A-Z]/)
    .pattern(/[0-9]/)
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters",
      "string.pattern.base": "Password must contain uppercase letter and number",
      "any.required": "Password is required",
    }),
});

export const authLoginSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .required()
    .messages({
      "string.email": "Invalid email address",
      "any.required": "Email is required",
    }),
  password: Joi.string()
    .required()
    .messages({
      "any.required": "Password is required",
    }),
});

// ═══════════════════════════════════════════════════════
// TRANSACTION SCHEMAS
// ═══════════════════════════════════════════════════════

export const createTransactionSchema = Joi.object({
  asset: Joi.string()
    .uppercase()
    .min(1)
    .max(10)
    .required()
    .messages({
      "string.max": "Asset symbol must be 1-10 characters",
      "any.required": "Asset is required",
    }),
  type: Joi.string()
    .valid("BUY", "SELL")
    .required()
    .messages({
      "any.only": "Type must be BUY or SELL",
      "any.required": "Type is required",
    }),
  quantity: Joi.number()
    .positive()
    .precision(8)
    .required()
    .messages({
      "number.positive": "Quantity must be greater than 0",
      "any.required": "Quantity is required",
    }),
  price: Joi.number()
    .positive()
    .precision(2)
    .required()
    .messages({
      "number.positive": "Price must be greater than 0",
      "any.required": "Price is required",
    }),
});

export const updateTransactionSchema = Joi.object({
  quantity: Joi.number()
    .positive()
    .precision(8)
    .optional()
    .messages({
      "number.positive": "Quantity must be greater than 0",
    }),
  price: Joi.number()
    .positive()
    .precision(2)
    .optional()
    .messages({
      "number.positive": "Price must be greater than 0",
    }),
});

// ═══════════════════════════════════════════════════════
// VALIDATION MIDDLEWARE FACTORY
// ═══════════════════════════════════════════════════════

/**
 * Create validation middleware
 * 
 * @param {object} schema - Joi schema
 * @param {string} source - Where to validate (body, query, params)
 * @returns {function} Middleware function
 */
export function validate(schema, source = "body") {
  return (req, res, next) => {
    const data = req[source];

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      convert: true,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((d) => ({
        field: d.path.join("."),
        message: d.message,
      }));

      return res.status(400).json({
        error: "Validation failed",
        details: messages,
      });
    }

    // Replace request data with validated value
    req[source] = value;
    next();
  };
}

export default {
  authRegisterSchema,
  authLoginSchema,
  createTransactionSchema,
  updateTransactionSchema,
  validate,
};
