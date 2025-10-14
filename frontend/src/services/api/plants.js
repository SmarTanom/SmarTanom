// Plants API functions

import { apiClient } from '../apiClient.js';

/**
 * List available plants from backend catalog
 */
export async function listPlants(query = '') {
    const token = (typeof localStorage !== 'undefined') ? localStorage.getItem('authToken') : null;
    const qs = query ? `?search=${encodeURIComponent(query)}` : '';
    // Token optional: endpoint is public
    return apiClient.get(`/api/reservoirs/plants/${qs}`, token ? { authToken: token } : undefined);
}

export default { listPlants };
