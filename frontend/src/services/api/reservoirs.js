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

/**
 * Create a reservoir for a device.
 * @param {Object} payload
 * @param {number} payload.device - Device primary key ID
 * @param {string} payload.reservoir_name
 * @param {number} payload.plant_id
 * @param {string} payload.start_date - YYYY-MM-DD
 * @param {string} payload.end_date - YYYY-MM-DD
 */
export async function createReservoir(payload) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return apiClient.post('/api/reservoirs/reservoirs/', payload, {
    authToken: token
  });
}

/**
 * Update an existing reservoir by ID (partial update).
 * @param {number} reservoirId
 * @param {Object} payload - any of { reservoir_name, plant_id, start_date, end_date }
 */
export async function updateReservoir(reservoirId, payload) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }
  return apiClient.patch(`/api/reservoirs/reservoirs/${reservoirId}/`, payload, {
    authToken: token
  });
}

// Export as default object
export default {
  getUserReservoirs,
  getDeviceReservoirs,
  getReservoirById,
  createReservoir,
  updateReservoir
};
