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
 * Get ALL sensors for authenticated user (follows pagination)
 * Returns a flat array of sensor objects.
 */
export async function getAllUserSensors(maxPages = 200) {
  const token = localStorage.getItem('authToken');
  if (!token) throw new Error('No authentication token found');

  let url = '/api/sensors/sensors/?page_size=100';
  const items = [];
  let guard = 0;
  while (url && guard < maxPages) {
    // apiClient accepts absolute next URLs too
    const page = await apiClient.get(url, { authToken: token });
    const rows = Array.isArray(page?.results) ? page.results : (Array.isArray(page) ? page : []);
    items.push(...rows);
    url = page?.next || null;
    guard += 1;
  }
  return items;
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
  const deviceSerial = opts.ignoreDeviceSerial ? '' : (localStorage.getItem('activeDeviceSerial') || '');
  const serialParam = deviceSerial ? `&device_serial=${encodeURIComponent(deviceSerial)}` : '';
  const startParam = opts.start ? `&start=${encodeURIComponent(opts.start)}` : '';
  const endParam = opts.end ? `&end=${encodeURIComponent(opts.end)}` : '';
  return apiClient.get(`/api/sensors/sensor-data/?sensor=${sensorId}&limit=${limit}${serialParam}${startParam}${endParam}`, {
    authToken: token
  });
}

/**
 * Fetch all sensor data pages for a specific sensor within optional date range.
 * Returns a flat array of items. Caps total items to maxTotal for safety.
 */
export async function getSensorDataAll(sensorId, limit = 100, opts = {}, maxTotal = 5000) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }
  const deviceSerial = localStorage.getItem('activeDeviceSerial') || '';
  const serialParam = deviceSerial ? `&device_serial=${encodeURIComponent(deviceSerial)}` : '';
  const startParam = opts.start ? `&start=${encodeURIComponent(opts.start)}` : '';
  const endParam = opts.end ? `&end=${encodeURIComponent(opts.end)}` : '';

  let url = `/api/sensors/sensor-data/?sensor=${sensorId}&limit=${limit}${serialParam}${startParam}${endParam}`;
  const items = [];
  let guard = 0;
  while (url && items.length < maxTotal && guard < 200) {
    const page = await apiClient.get(url, { authToken: token });
    const pageItems = Array.isArray(page?.results) ? page.results : (Array.isArray(page) ? page : []);
    items.push(...pageItems);
    url = page?.next || null; // DRF next is absolute; apiClient accepts absolute URLs
    guard += 1;
  }
  return items;
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

// Latest readings for ALL sensors visible to the current user (admin sees all)
export async function getLatestReadingsAll() {
  const token = localStorage.getItem('authToken');
  if (!token) throw new Error('No authentication token found');
  const data = await apiClient.get(`/api/sensors/latest/`, { authToken: token });
  return data; // array of {sensor_id, value, status, updated_at}
}

// Export as default object
export default {
  getUserSensors,
  getDeviceSensors,
  getAllUserSensors,
  getSensorData,
  getSensorDataAll,
  getRecentSensorData,
  getLatestReadings,
  getLatestReadingsAll
};
