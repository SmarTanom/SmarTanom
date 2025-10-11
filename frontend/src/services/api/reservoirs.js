// Reservoirs API functions

import { apiClient } from '../apiClient.js';

/**
 * Get all reservoirs for authenticated user
 */
export async function getUserReservoirs() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return apiClient.get('/api/reservoirs/reservoirs/', {
    authToken: token
  });
}

/**
 * Get reservoirs for a specific device
 */
export async function getDeviceReservoirs(deviceId) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return apiClient.get(`/api/reservoirs/reservoirs/?device=${deviceId}`, {
    authToken: token
  });
}

/**
 * Get reservoir details by ID
 */
export async function getReservoirById(reservoirId) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return apiClient.get(`/api/reservoirs/reservoirs/${reservoirId}/`, {
    authToken: token
  });
}

// Export as default object
export default {
  getUserReservoirs,
  getDeviceReservoirs,
  getReservoirById
};
