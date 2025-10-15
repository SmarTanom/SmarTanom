import { apiClient } from '../apiClient';

/**
 * User Alerts API Service
 * Handles fetching and managing user alerts from backend
 */

/**
 * Get user alerts from backend
 * @param {Object} params - Query parameters (type, device, limit, page)
 * @returns {Promise<Object>} Alerts data with count and alerts array
 */
export const getUserAlerts = async (params = {}) => {
  try {
    const token = localStorage.getItem('authToken');
    const queryParams = new URLSearchParams();

    if (params.type) queryParams.append('type', params.type);
    if (params.device) queryParams.append('device', params.device);
    if (params.status) queryParams.append('status', params.status);
    if (params.limit) queryParams.append('limit', params.limit);

    const queryString = queryParams.toString();
    const url = `/api/notifications/logs/alerts/${queryString ? '?' + queryString : ''}`;

    const response = await apiClient.get(url, {
      authToken: token
    });
    return response;
  } catch (error) {
    console.error('Error fetching user alerts:', error);
    throw error;
  }
};

/**
 * Mark specific alerts as read
 * @param {Array} alertIds - Array of alert IDs to mark as read
 * @returns {Promise<Object>} Response with updated count
 */
export const markAlertsAsRead = async (alertIds) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await apiClient.post('/api/notifications/logs/mark_read/', {
      alert_ids: alertIds
    }, {
      authToken: token
    });
    return response;
  } catch (error) {
    console.error('Error marking alerts as read:', error);
    throw error;
  }
};

/**
 * Mark all alerts as read for the user
 * @returns {Promise<Object>} Response with updated count
 */
export const markAllAlertsAsRead = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await apiClient.post('/api/notifications/logs/mark_all_read/', {}, {
      authToken: token
    });
    return response;
  } catch (error) {
    console.error('Error marking all alerts as read:', error);
    throw error;
  }
};

export default {
  getUserAlerts,
  markAlertsAsRead,
  markAllAlertsAsRead,
};
