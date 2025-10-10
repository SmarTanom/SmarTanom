# SmarTanom Frontend

This is the React web frontend for the SmarTanom smart hydroponic monitoring system.

# Frontend

This is the React (Vite) frontend.

## Development Quick Start

1. Start backend (Django) first so proxy targets are live:
   - In `backend/`: create venv, install requirements, run migrations, then: `python manage.py runserver 0.0.0.0:8000`
2. Start frontend:
   - In `frontend/`: `npm install` (first time) then `npm run dev`.
3. Visit the printed Vite URL (default http://localhost:5173).

## Backend Integration

API calls are proxied during development via `vite.config.js` so that any request to `/api/...` is forwarded to `http://localhost:8000`. This allows the frontend code to simply call relative paths (or rely on the apiClient base) without hard‑coding ports.

- If you want to point to a remote backend, create `.env.development` with:
  ```env
  VITE_API_BASE_URL=https://your.remote.backend
  ```
  Then restart `npm run dev`.
- If `VITE_API_BASE_URL` is unset, the code falls back to `window.location.origin` and depends on the dev proxy.

## API Client

`src/services/apiClient.js` centralizes fetch logic, handling:
- Base URL resolution
- JSON parse fallbacks
- Attaching auth token headers
- Unified error object with `status`

Auth helpers: `authApi.requestOtp`, `authApi.verifyOtp`, `authApi.finalizeAccount`, `authApi.checkUsername`.

## OTP / Auth Flow (Dev)

1. User enters email (Step 3 of setup) → `authApi.requestOtp(email,'login')`.
2. Server silently remaps purpose if needed (enumeration-safe).
3. User enters 6-digit code; component attempts `login` then `register` fallback.
4. Token stored in `localStorage` as `auth_token`.
5. Username finalization calls `finalize-account` with auth token.

In DEBUG backend mode, `debug_code` is logged to the console for rapid testing.

## Health Probe

`src/services/healthProbe.js` exposes `probeHealth()`—you can run it in a component `useEffect` or manually in DevTools:
```js
import { probeHealth } from './services/healthProbe';
probeHealth();
```

## Common Issues

| Symptom | Likely Cause | Fix |
|--------|--------------|-----|
| 404 on /api/* | Proxy not pointing to 8000 | Update `vite.config.js` / restart dev server |
| CORS error (production only) | Missing allowed origin | Configure Django CORS settings for deployed host |
| OTP code not advancing | Non-200 response | Check browser console `[sendCode] failed` log |
| Username finalize fails | Missing token | Ensure OTP verify succeeded and token stored |

## Building for Production

Use `npm run build` which outputs to `dist/`. A production deployment would typically serve these assets behind the Django app or a separate static host (not yet wired in repo Docker).
