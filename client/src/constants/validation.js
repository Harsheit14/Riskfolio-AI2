// Form Validation Rules
export const VALIDATION_RULES = {
  EMAIL: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Please enter a valid email address",
  },
  PASSWORD: {
    minLength: 6,
    message: "Password must be at least 6 characters",
  },
  QUANTITY: {
    pattern: /^\d+(\.\d{1,8})?$/,
    message: "Quantity must be a positive number",
  },
  PRICE: {
    pattern: /^\d+(\.\d{1,2})?$/,
    message: "Price must be a valid number with up to 2 decimals",
  },
};

export const TRANSACTION_TYPES = ["BUY", "SELL"];

export const DEFAULT_CURRENCY = "USD";
