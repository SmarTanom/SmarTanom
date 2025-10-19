// Alerts API functions

import { apiClient } from '../apiClient.js';

/**
 * List alerts scoped to the authenticated user (owned + shared devices).
 * Supports optional filtering and ordering.
 */
export async function listAlerts({
    deviceId,
    is_acknowledged,
    is_resolved,
    severity,
    ordering = '-created_at',
    page,
} = {}) {
    const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('authToken') : null;
    if (!token) throw new Error('No authentication token found');

    const params = new URLSearchParams();
    if (deviceId) params.set('device', String(deviceId));
    if (typeof is_acknowledged === 'boolean') params.set('is_acknowledged', String(is_acknowledged));
    if (typeof is_resolved === 'boolean') params.set('is_resolved', String(is_resolved));
    if (severity) params.set('severity', severity);
    if (ordering) params.set('ordering', ordering);
    if (page) params.set('page', String(page));

    const qs = params.toString();
    const path = `/api/sensors/alerts/${qs ? `?${qs}` : ''}`;
    return apiClient.get(path, { authToken: token });
}

export default { listAlerts };
