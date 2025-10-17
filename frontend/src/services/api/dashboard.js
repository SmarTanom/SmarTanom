// Dashboard aggregated API

import { apiClient } from '../apiClient.js';

/**
 * Fetch combined initial dashboard data in one request.
 * Optional params: { reading_limit?: number, alert_limit?: number }
 */
export async function getInitialDashboard(params = {}) {
    const token = localStorage.getItem('authToken');
    if (!token) throw new Error('No authentication token found');

    const usp = new URLSearchParams();
    if (params.reading_limit) usp.set('reading_limit', String(params.reading_limit));
    if (params.alert_limit) usp.set('alert_limit', String(params.alert_limit));
    const query = usp.toString();

    return apiClient.get(`/api/devices/dashboard/initial/${query ? `?${query}` : ''}`, {
        authToken: token
    });
}

export default { getInitialDashboard };
