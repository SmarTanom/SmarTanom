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

export default {
  getAdminStats,
  getRecentActivity,
};
