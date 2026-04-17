/**
 * Parse and extract error messages from API responses
 */
export const getErrorMessage = (error) => {
  if (!error) return "An unknown error occurred";

  // API error response
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // Axios error messages
  if (error.message) {
    return error.message;
  }

  // Generic error
  return "An error occurred. Please try again.";
};

/**
 * Check if error is network-related
 */
export const isNetworkError = (error) => {
  return !error.response || error.code === "ERR_NETWORK";
};

/**
 * Check if error is authentication-related
 */
export const isAuthError = (error) => {
  return error.response?.status === 401;
};

/**
 * Check if error is a validation error
 */
export const isValidationError = (error) => {
  return error.response?.status === 400;
};
