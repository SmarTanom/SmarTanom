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

/**
 * Fetch all alert pages for a device (or current user scope when no deviceId).
 * Iterates DRF pagination until all results are gathered or maxTotal reached.
 */
export async function listAlertsAll({ deviceId, ordering = '-created_at', pageSize = 100, maxTotal = 5000 } = {}) {
    const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('authToken') : null;
    if (!token) throw new Error('No authentication token found');

    const params = new URLSearchParams();
    if (deviceId) params.set('device', String(deviceId));
    if (ordering) params.set('ordering', ordering);
    // PageNumberPagination ignores page_size by default; backend uses PAGE_SIZE.
    // We'll still include a hint; DRF will ignore if not configured.
    params.set('page_size', String(pageSize));

    let url = `/api/sensors/alerts/${params.toString() ? `?${params.toString()}` : ''}`;
    const items = [];
    let guard = 0;
    while (url && items.length < maxTotal && guard < 200) {
        const page = await apiClient.get(url, { authToken: token });
        const pageItems = Array.isArray(page?.results) ? page.results : (Array.isArray(page) ? page : []);
        items.push(...pageItems);
        url = page?.next || null; // DRF next is absolute; apiClient supports absolute URLs
        guard += 1;
    }
    return items;
}

/** Mark a single alert as read/unread */
export async function markAlertRead(alertId, is_read = true) {
    const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('authToken') : null;
    if (!token) throw new Error('No authentication token found');
    const path = `/api/sensors/alerts/${alertId}/`;
    return apiClient.patch(path, { is_read }, { authToken: token });
}

/** Bulk mark all alerts read/unread, optionally scoped to a device */
export async function markAllAlertsRead({ deviceId, is_read = true } = {}) {
    const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('authToken') : null;
    if (!token) throw new Error('No authentication token found');
    const path = `/api/sensors/alerts/mark-all-read/`;
    const body = {};
    if (deviceId) body.device = deviceId;
    body.is_read = is_read;
    return apiClient.post(path, body, { authToken: token });
}

export default { listAlerts };
