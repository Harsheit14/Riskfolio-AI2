import apiClient from './apiClient';

async function getPrices() {
  try {
    const response = await apiClient.get('/prices');
    return response.data;
  } catch (error) {
    throw error;
  }
}

export { getPrices };
