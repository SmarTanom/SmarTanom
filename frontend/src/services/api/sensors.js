// Sensors API functions

import { apiClient } from '../apiClient.js';

/**
 * Get all sensors for authenticated user
 */
export async function getUserSensors() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return apiClient.get('/api/sensors/sensors/', {
    authToken: token
  });
}

/**
 * Get sensors for a specific device
 */
export async function getDeviceSensors(deviceId) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return apiClient.get(`/api/sensors/sensors/?device=${deviceId}`, {
    authToken: token
  });
}

/**
 * Get sensor data for a specific sensor
 */
export async function getSensorData(sensorId, limit = 50) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return apiClient.get(`/api/sensors/sensor-data/?sensor=${sensorId}&limit=${limit}`, {
    authToken: token
  });
}

/**
 * Get recent sensor data for multiple sensors
 */
export async function getRecentSensorData(sensorIds, limit = 10) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const sensorIdsParam = sensorIds.join(',');
  return apiClient.get(`/api/sensors/sensor-data/?sensor__in=${sensorIdsParam}&limit=${limit}`, {
    authToken: token
  });
}

// Export as default object
export default {
  getUserSensors,
  getDeviceSensors,
  getSensorData,
  getRecentSensorData
};
