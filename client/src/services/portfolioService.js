import apiClient from './apiClient';

async function getPortfolio() {
  try {
    const response = await apiClient.get('/portfolio');
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function addTransaction(data) {
  try {
    const response = await apiClient.post('/portfolio', data);
    return response.data;
  } catch (error) {
    throw error;
  }
}

export { getPortfolio, addTransaction };
