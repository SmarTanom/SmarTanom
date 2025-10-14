/**
 * Admin Dashboard API Service
 * Provides methods to fetch admin statistics and data
 */

import { apiClient } from '../apiClient.js';

/**
 * Fetch comprehensive admin dashboard statistics
 * Includes device stats, user stats, trends, alerts, and performance metrics
 * @returns {Promise<Object>} Dashboard statistics object
 */
export const getAdminStats = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await apiClient.get('/api/admin/dashboard/stats/', {
      authToken: token
    });
    return response;
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    throw error;
  }
};

/**
 * Fetch recent admin activity/events
 * @returns {Promise<Array>} Array of recent activity items
 */
export const getRecentActivity = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await apiClient.get('/api/admin/dashboard/activity/', {
      authToken: token
    });
    return response;
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    throw error;
  }
};

/**
 * Fetch all devices for admin management
 * @returns {Promise<Array>} Array of device objects
 */
export const getAdminDevices = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await apiClient.get('/api/admin/dashboard/devices/', {
      authToken: token
    });

    // Handle different response structures
    if (Array.isArray(response)) {
      return response;
    } else if (response && Array.isArray(response.results)) {
      return response.results;
    } else if (response && typeof response === 'object') {
      console.warn('Unexpected device response structure:', response);
      return [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching admin devices:', error);
    throw error;
  }
};

/**
 * Fetch all users for admin management
 * @returns {Promise<Array>} Array of user objects with device counts
 */
export const getAdminUsers = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await apiClient.get('/api/admin/dashboard/users/', {
      authToken: token
    });
    return response;
  } catch (error) {
    console.error('Error fetching admin users:', error);
    throw error;
  }
};

/**
 * Create a new device (admin only)
 * @param {Object} deviceData - Device data (device_name, location, status)
 * @returns {Promise<Object>} Created device object
 */
export const createDevice = async (deviceData) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await apiClient.post('/api/admin/dashboard/create_device/', deviceData, {
      authToken: token
    });
    return response;
  } catch (error) {
    console.error('Error creating device:', error);
    throw error;
  }
};

/**
 * Get current admin profile and settings
 * @returns {Promise<Object>} Profile and preferences object
 */
export const getAdminProfile = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await apiClient.get('/api/admin/dashboard/profile/', {
      authToken: token
    });
    return response;
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    throw error;
  }
};

/**
 * Update admin profile
 * @param {Object} profileData - Profile data (first_name, last_name only)
 * @returns {Promise<Object>} Updated profile object
 */
export const updateAdminProfile = async (profileData) => {
  try {
    const token = localStorage.getItem('authToken');
    // Only send first_name and last_name
    const cleanData = {
      first_name: profileData.first_name,
      last_name: profileData.last_name
    };
    const response = await apiClient.patch('/api/admin/dashboard/update_profile/', cleanData, {
      authToken: token
    });
    return response;
  } catch (error) {
    console.error('Error updating admin profile:', error);
    throw error;
  }
};

/**
 * Update admin preferences/settings
 * @param {Object} preferences - Preferences object
 * @returns {Promise<Object>} Updated preferences object
 */
export const updateAdminPreferences = async (preferences) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await apiClient.patch('/api/admin/dashboard/update_preferences/', preferences, {
      authToken: token
    });
    return response;
  } catch (error) {
    console.error('Error updating admin preferences:', error);
    throw error;
  }
};

/**
 * Fetch devices for a specific user (admin only)
 * @param {number} userId - User ID
 * @returns {Promise<Object>} User devices data
 */
export const getUserDevices = async (userId) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await apiClient.get(`/api/devices/users/${userId}/devices/`, {
      authToken: token
    });
    return response;
  } catch (error) {
    console.error('Error fetching user devices:', error);
    throw error;
  }
};

/**
 * Delete a user (admin only)
 * @param {number} userId - User ID to delete
 * @returns {Promise<Object>} Deletion confirmation
 */
export const deleteUser = async (userId) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await apiClient.delete(`/api/auth/users/${userId}/delete/`, {
      authToken: token
    });
    return response;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

export default {
  getAdminStats,
  getRecentActivity,
  getAdminDevices,
  getAdminUsers,
  createDevice,
  getAdminProfile,
  updateAdminProfile,
  updateAdminPreferences,
  getUserDevices,
  deleteUser
};
