import apiClient from './apiClient';

async function getPortfolio() {
  try {
    const response = await apiClient.get('/portfolio');
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function getHoldings() {
  try {
    const response = await apiClient.get('/portfolio/holdings');
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function getPortfolioValue() {
  try {
    const response = await apiClient.get('/portfolio/value');
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function getPortfolioPerformance() {
  try {
    const response = await apiClient.get('/portfolio/performance');
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function getPortfolioSummary() {
  try {
    const response = await apiClient.get('/portfolio/summary');
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function addTransaction(type, asset, quantity, price) {
  try {
    // Map symbol to asset field for backend compatibility
    const response = await apiClient.post('/transactions', {
      type,
      asset,
      quantity,
      price,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function deleteTransaction(transactionId) {
  try {
    const response = await apiClient.delete(`/transactions/${transactionId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function getTransactions() {
  try {
    const response = await apiClient.get('/transactions');
    return response.data;
  } catch (error) {
    throw error;
  }
}

export { getPortfolio, getHoldings, getPortfolioValue, getPortfolioPerformance, getPortfolioSummary, addTransaction, deleteTransaction, getTransactions };
