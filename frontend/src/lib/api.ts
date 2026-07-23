import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({ baseURL: API_BASE });

export function getAccessToken() { return localStorage.getItem('accessToken'); }
export function getRefreshToken() { return localStorage.getItem('refreshToken'); }
export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
}
export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

// ---------- Impersonation (owner viewing as teacher/parent) ----------
// Teachers/parents share the same token storage as the owner, so we stash
// the owner's real tokens aside in sessionStorage (cleared when the tab
// closes) and restore them when the owner returns to their own account.

export function saveImpersonationOriginal(user: any) {
  sessionStorage.setItem('impersonationOriginal', JSON.stringify({
    accessToken: getAccessToken(),
    refreshToken: getRefreshToken(),
    user,
  }));
}
export function getImpersonationOriginal(): { accessToken: string; refreshToken: string; user: any } | null {
  const raw = sessionStorage.getItem('impersonationOriginal');
  return raw ? JSON.parse(raw) : null;
}
export function clearImpersonationOriginal() {
  sessionStorage.removeItem('impersonationOriginal');
}
/** Impersonation tokens are short-lived (30 min) and intentionally have no
 * refresh token - letting the session simply expire is safer than silently
 * refreshing back into the owner's identity via a leftover refresh token. */
export function setImpersonatedSession(accessToken: string, user: any) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.removeItem('refreshToken');
  localStorage.setItem('user', JSON.stringify(user));
}

api.interceptors.request.use(config => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401, then retry the original request once
let isRefreshing = false;
let queue: Array<() => void> = [];

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        await new Promise<void>(resolve => queue.push(resolve));
        return api(original);
      }

      isRefreshing = true;
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error('no refresh token');
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        setTokens(data.accessToken, data.refreshToken);
        queue.forEach(resolve => resolve());
        queue = [];
        return api(original);
      } catch {
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  },
);
