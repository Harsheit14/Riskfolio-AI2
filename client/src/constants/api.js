// API Endpoints
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: "/auth/login",
  AUTH_REGISTER: "/auth/register",
  AUTH_LOGOUT: "/auth/logout",

  // Transactions
  TRANSACTIONS_GET_ALL: "/transactions",
  TRANSACTIONS_CREATE: "/transactions",
  TRANSACTIONS_GET_ONE: (id) => `/transactions/${id}`,
  TRANSACTIONS_UPDATE: (id) => `/transactions/${id}`,
  TRANSACTIONS_DELETE: (id) => `/transactions/${id}`,

  // Portfolio
  PORTFOLIO_VALUE: "/portfolio/value",
  PORTFOLIO_HOLDINGS: "/portfolio/holdings",
  PORTFOLIO_PERFORMANCE: "/portfolio/performance",

  // Risk
  RISK_REPORT: "/risk",

  // Health
  HEALTH: "/health",
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
};
