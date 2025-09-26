// Frontend-only API placeholders for integration with Django backend
// All functions below should be implemented by backend team; keep signatures stable.

/**
 * Request verification code to be sent to user's email
 * @param {{ email: string, mode: 'signin'|'signup' }} params
 */
export async function requestCode(params) {
  const res = await fetch('/api/auth/request-code/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: params.email, purpose: params.mode === 'signup' ? 'register' : 'login' }),
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || 'Failed to send verification code';
    const err = new Error(msg);
    err.details = data;
    throw err;
  }
  return data;
}

/**
 * Verify a 6-digit code for given email
 * @param {{ email: string, code: string, mode: 'signin'|'signup' }} params
 */
export async function verifyCode(params) {
  const res = await fetch('/api/auth/verify-code/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: params.email, code: params.code, purpose: params.mode === 'signup' ? 'register' : 'login' }),
    credentials: 'include',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || 'Verification failed';
    const err = new Error(msg);
    err.details = data;
    throw err;
  }
  return data; // { message, token, user }
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
