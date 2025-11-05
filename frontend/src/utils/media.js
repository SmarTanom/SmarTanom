// Utility helpers for resolving media/image URLs so they work in production (Netlify) and locally.
// - If given an absolute URL (http/https), return as-is
// - If given a root-relative path like /media/... or /static/..., prefix the API base
// - Otherwise, return the string unchanged

import { apiClient } from '../services/apiClient';

export function resolveMediaUrl(input) {
  if (!input) return null;
  try {
    const s = String(input).trim();
    if (!s) return null;
    if (/^https?:\/\//i.test(s)) return s; // already absolute
    if (s.startsWith('/')) {
      // Prefix with backend/API base so Netlify serves from the correct origin
      return `${apiClient.base}${s}`;
    }
    // Relative or data URL; let the browser resolve it
    return s;
  } catch (_) {
    return null;
  }
}

// Attach a robust onError fallback to an <img> element
export function withImgFallback(e, fallbackSrc) {
  if (!e || !e.currentTarget) return;
  const img = e.currentTarget;
  if (img.__smartanomErrored) return; // prevent infinite loop
  img.__smartanomErrored = true;
  if (fallbackSrc) {
    img.src = fallbackSrc;
  }
}
