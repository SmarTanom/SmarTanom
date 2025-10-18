// Device binding API functions

import { apiClient } from '../apiClient.js';

/**
 * Check if a device exists and can be bound
 */
export async function checkDevice(serialNumber) {
  const payload = { serial_number: serialNumber };
  // Diagnostic logging
  // eslint-disable-next-line no-console
  console.log('[checkDevice] → POST /api/devices/check/ payload=', payload, 'token=', localStorage.getItem('authToken'));
  try {
    const res = await apiClient.post('/api/devices/check/', payload);
    // eslint-disable-next-line no-console
    console.log('[checkDevice] ← 200 response', res);
    return res;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[checkDevice] ← error status=', err.status, 'message=', err.message, 'data=', err.data);
    throw err;
  }
}

/**
 * Request OTP for device binding
 */
export async function requestDeviceOTP(serialNumber, email) {
  return apiClient.post('/api/devices/request-otp/', {
    serial_number: serialNumber,
    email: email
  });
}

/**
 * Verify OTP and bind device
 */
export async function verifyDeviceOTP(serialNumber, email, code, extras = {}) {
  // extras may include optional fields such as { location, device_name }
  return apiClient.post('/api/devices/verify-otp/', {
    serial_number: serialNumber,
    email: email,
    code: code,
    ...extras
  });
}

/**
 * Get user's bound devices
 */
export async function getUserDevices() {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return apiClient.get('/api/devices/', {
    authToken: token
  });
}

/**
 * Get device details by ID
 */
export async function getDeviceById(deviceId) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return apiClient.get(`/api/devices/${deviceId}/`, {
    authToken: token
  });
}

/**
 * Upload or update plant photo for a device
 */
export async function uploadPlantPhoto(deviceId, photoFile, plantName = '') {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const formData = new FormData();
  formData.append('plant_photo', photoFile);
  if (plantName) {
    formData.append('plant_name', plantName);
  }

  // Don't set Content-Type header - browser will set it automatically with boundary
  return apiClient.post(`/api/devices/${deviceId}/upload-photo/`, formData, {
    authToken: token,
    json: false // Important: tells apiClient not to set JSON headers
  });
}

/**
 * Trigger WiFi reset for a device
 * Resets the device's WiFi configuration and restarts it in AP mode
 */
export async function resetDeviceWiFi(deviceId) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  return apiClient.post(`/api/devices/${deviceId}/reset-wifi/`, {}, {
    authToken: token
  });
}

// Export as default object for consistency with auth.js
export default {
  checkDevice,
  requestDeviceOTP,
  verifyDeviceOTP,
  getUserDevices,
  getDeviceById,
  uploadPlantPhoto,
  resetDeviceWiFi
};
