import { apiClient } from '../apiClient';

/**
 * Notification Preferences API Service
 * Handles user notification preferences (alert severity settings)
 */

/**
 * Get user notification preferences
 * @returns {Promise<Object>}
 */
export const getNotificationPreferences = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await apiClient.get('/api/notifications/preferences/', {
      authToken: token
    });
    // API returns array, get first item
    return Array.isArray(response) ? response[0] : response;
  } catch (error) {
    console.error('Failed to fetch notification preferences:', error);
    throw error;
  }
};

/**
 * Update notification preferences
 * @param {Object} preferences - Preference settings
 * @param {boolean} preferences.critical_alerts - Receive critical alerts
 * @param {boolean} preferences.warnings - Receive warnings
 * @param {boolean} preferences.info - Receive info notifications
 * @param {boolean} preferences.email_enabled - Receive email notifications
 * @param {boolean} preferences.quiet_hours_enabled - Enable quiet hours
 * @param {string} preferences.quiet_hours_start - Quiet hours start time (HH:MM)
 * @param {string} preferences.quiet_hours_end - Quiet hours end time (HH:MM)
 * @returns {Promise<Object>}
 */
export const updateNotificationPreferences = async (preferences) => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await apiClient.post('/api/notifications/preferences/', preferences, {
      authToken: token
    });
    return response;
  } catch (error) {
    console.error('Failed to update notification preferences:', error);
    throw error;
  }
};

export default {
  getNotificationPreferences,
  updateNotificationPreferences,
};
