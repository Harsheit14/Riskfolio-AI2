import apiClient from './apiClient';

async function getRiskReport() {
  try {
    const response = await apiClient.get('/risk/report');
    return response.data;
  } catch (error) {
    throw error;
  }
}

export { getRiskReport };
