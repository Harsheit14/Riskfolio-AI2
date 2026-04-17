/**
 * Format currency values
 */
export const formatCurrency = (value, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
};

/**
 * Format percentage values
 */
export const formatPercentage = (value, decimals = 2) => {
  return `${(value || 0).toFixed(decimals)}%`;
};

/**
 * Format numbers with thousand separators
 */
export const formatNumber = (value, decimals = 2) => {
  return Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Format date to readable format
 */
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Format date and time
 */
export const formatDateTime = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
