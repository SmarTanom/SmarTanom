// Frontend-only API placeholders for integration with Django backend
// All functions below should be implemented by backend team; keep signatures stable.

/**
 * Request verification code to be sent to user's email
 * @param {{ email: string, mode: 'signin'|'signup' }} params
 */
export async function requestCode(params) {
  // TODO: Call backend endpoint POST /api/auth/request-code
  // return fetch('/api/auth/request-code', { method: 'POST', body: JSON.stringify(params) })
  throw new Error('Not implemented: backend integration');
}

/**
 * Verify a 6-digit code for given email
 * @param {{ email: string, code: string, mode: 'signin'|'signup' }} params
 */
export async function verifyCode(params) {
  // TODO: Call backend endpoint POST /api/auth/verify-code
  // Expected return: { success: boolean, tokens?: { access, refresh } }
  throw new Error('Not implemented: backend integration');
}

/**
 * Check username availability
 * @param {string} username
 */
export async function checkUsername(username) {
  // TODO: GET /api/auth/username-availability?u=...
  // return { available: boolean }
  throw new Error('Not implemented: backend integration');
}

/**
 * Finish signup by creating account with email -> username mapping
 * @param {{ email: string, username: string }} params
 */
export async function finishSignup(params) {
  // TODO: POST /api/auth/finish-signup
  throw new Error('Not implemented: backend integration');
}
