import { VALIDATION_RULES } from "../constants/validation";

/**
 * Validates email format
 */
export const validateEmail = (email) => {
  return VALIDATION_RULES.EMAIL.pattern.test(email);
};

/**
 * Validates password length and strength
 */
export const validatePassword = (password) => {
  const minLength = VALIDATION_RULES.PASSWORD.minLength;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber
  );
};

/**
 * Validates quantity (decimal number)
 */
export const validateQuantity = (quantity) => {
  const num = parseFloat(quantity);
  return !isNaN(num) && num > 0;
};

/**
 * Validates price (decimal number with max 2 decimals)
 */
export const validatePrice = (price) => {
  const num = parseFloat(price);
  return !isNaN(num) && num > 0 && (num.toString().split(".")[1]?.length || 0) <= 2;
};

/**
 * Generic form validation
 */
export const validateForm = (formData, rules) => {
  const errors = {};

  Object.keys(rules).forEach((field) => {
    const value = formData[field];
    const rule = rules[field];

    if (rule.required && !value) {
      errors[field] = `${field} is required`;
      return;
    }

    if (rule.validate && value) {
      const isValid = rule.validate(value);
      if (!isValid) {
        errors[field] = rule.message;
      }
    }
  });

  return errors;
};
