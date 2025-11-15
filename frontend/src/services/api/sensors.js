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
export async function getSensorData(sensorId, limit = 50, opts = {}) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }
  // Include device_serial for strict backend scoping
  const deviceSerial = localStorage.getItem('activeDeviceSerial') || '';
  const serialParam = deviceSerial ? `&device_serial=${encodeURIComponent(deviceSerial)}` : '';
  const startParam = opts.start ? `&start=${encodeURIComponent(opts.start)}` : '';
  const endParam = opts.end ? `&end=${encodeURIComponent(opts.end)}` : '';
  return apiClient.get(`/api/sensors/sensor-data/?sensor=${sensorId}&limit=${limit}${serialParam}${startParam}${endParam}`, {
    authToken: token
  });
}

// Multi-sensor convenience: until backend sensor__in is fully supported,
// perform parallel single-sensor requests and merge. Avoid silent backend ignore.
export async function getRecentSensorData(sensorIds, limit = 10) {
  if (!Array.isArray(sensorIds) || sensorIds.length === 0) return {};
  const results = await Promise.all(sensorIds.map(id => getSensorData(id, limit).catch(() => ({ results: [] }))));
  const merged = {};
  sensorIds.forEach((id, idx) => {
    const payload = results[idx];
    const items = Array.isArray(payload?.results) ? payload.results : (Array.isArray(payload) ? payload : []);
    merged[id] = items;
  });
  return merged;
}

// Latest readings polling fallback (ETag aware not implemented here for simplicity)
export async function getLatestReadings(deviceId) {
  const token = localStorage.getItem('authToken');
  if (!token) throw new Error('No authentication token found');
  const data = await apiClient.get(`/api/sensors/latest/?device=${deviceId}`, { authToken: token });
  return data; // array of {sensor_id, value, status, updated_at}
}

// Export as default object
export default {
  getUserSensors,
  getDeviceSensors,
  getSensorData,
  getRecentSensorData,
  getLatestReadings
};
