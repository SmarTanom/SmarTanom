// Device binding API functions

import { apiClient } from '../apiClient.js';

/**
 * Check if a device exists and can be bound
 */
export async function checkDevice(serialNumber) {
  return apiClient.post('/api/devices/check/', {
    serial_number: serialNumber
  });
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
export async function verifyDeviceOTP(serialNumber, email, code) {
  return apiClient.post('/api/devices/verify-otp/', {
    serial_number: serialNumber,
    email: email,
    code: code
  });
}

// Export as default object for consistency with auth.js
export default {
  checkDevice,
  requestDeviceOTP,
  verifyDeviceOTP
};
