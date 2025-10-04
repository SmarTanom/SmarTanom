/**
 * Authentication API Service
 * Handles all authentication-related API calls
 * 
 * TODO: Replace mock implementations with actual backend API calls
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const AUTH_BASE = `${API_BASE_URL}/auth`;

/**
 * Request a verification code to be sent to the user's email
 * @param {string} email - User's email address
 * @param {string} mode - 'signin' or 'signup'
 * @returns {Promise<Object>} Response with status and message
 */
export async function requestCode(email, mode = 'signin') {
  try {
    const purpose = mode === 'signup' ? 'register' : 'login';
    const response = await fetch(`${AUTH_BASE}/request-code/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Failed to send code');
    return data;
  } catch (error) {
    console.error('Request code error:', error);
    throw error;
  }
}

/**
 * Verify the code entered by the user
 * @param {string} email - User's email address
 * @param {string} code - 6-digit verification code
 * @param {string} mode - 'signin' or 'signup'
 * @returns {Promise<Object>} Response with user data and token
 */
export async function verifyCode(email, code, mode = 'signin') {
  try {
    const purpose = mode === 'signup' ? 'register' : 'login';
    const response = await fetch(`${AUTH_BASE}/verify-code/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, purpose }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Invalid code');
    return data;
  } catch (error) {
    console.error('Verify code error:', error);
    throw error;
  }
}

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
export async function signOut() {
  try {
    const token = JSON.parse(localStorage.getItem('smartanom_user') || '{}')?.token;
    const response = await fetch(`${AUTH_BASE}/logout/`, {
      method: 'POST',
      headers: token ? { Authorization: `Token ${token}` } : {},
    });
    if (!response.ok) throw new Error('Sign out failed');
    return await response.json();
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

/**
 * Check current authentication status
 * @returns {Promise<Object|null>} User data if authenticated, null otherwise
 */
export async function checkAuth() {
  try {
    const token = JSON.parse(localStorage.getItem('smartanom_user') || '{}')?.token;
    const response = await fetch(`${AUTH_BASE}/status/`, {
      method: 'GET',
      headers: token ? { Authorization: `Token ${token}` } : {},
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Check auth error:', error);
    return null;
  }
}

/**
 * Complete user setup (final step)
 * @param {Object} setupData - Setup data from the 6-step wizard
 * @returns {Promise<Object>} User data with token
 */
export async function completeSetup(setupData) {
  try {
    const token = JSON.parse(localStorage.getItem('smartanom_user') || '{}')?.token;
    const response = await fetch(`${AUTH_BASE}/complete-setup/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Token ${token}` } : {}),
      },
      body: JSON.stringify(setupData),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || data.message || 'Setup failed');
    return data;
  } catch (error) {
    console.error('Complete setup error:', error);
    throw error;
  }
}

/**
 * Check if username is available
 * @param {string} username - Username to check
 * @returns {Promise<boolean>} True if available, false if taken
 */
export async function checkUsernameAvailability(username) {
  try {
    const response = await fetch(`${AUTH_BASE}/check-username/?username=${encodeURIComponent(username)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Username check failed');
    return data.available;
  } catch (error) {
    console.error('Check username error:', error);
    throw error;
  }
}
