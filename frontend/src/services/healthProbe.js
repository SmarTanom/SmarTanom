// Simple health probe for development; can be imported and invoked manually.
import { apiClient } from './apiClient';

export async function probeHealth() {
  try {
    const data = await apiClient.get('/api/health/');
    // eslint-disable-next-line no-console
    console.log('[healthProbe] API health OK', data);
    return { ok: true, data };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[healthProbe] API health FAIL', e);
    return { ok: false, error: e.message };
  }
}
