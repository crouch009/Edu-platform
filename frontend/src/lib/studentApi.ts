import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const studentApi = axios.create({ baseURL: API_BASE });

export function getStudentAccessToken() { return localStorage.getItem('studentAccessToken'); }
export function getStudentRefreshToken() { return localStorage.getItem('studentRefreshToken'); }
export function setStudentTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('studentAccessToken', accessToken);
  localStorage.setItem('studentRefreshToken', refreshToken);
}
export function clearStudentTokens() {
  localStorage.removeItem('studentAccessToken');
  localStorage.removeItem('studentRefreshToken');
  localStorage.removeItem('studentInfo');
}

studentApi.interceptors.request.use(config => {
  const token = getStudentAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let queue: Array<() => void> = [];

studentApi.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        await new Promise<void>(resolve => queue.push(resolve));
        return studentApi(original);
      }

      isRefreshing = true;
      try {
        const refreshToken = getStudentRefreshToken();
        if (!refreshToken) throw new Error('no refresh token');
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
        setStudentTokens(data.accessToken, data.refreshToken);
        queue.forEach(resolve => resolve());
        queue = [];
        return studentApi(original);
      } catch {
        clearStudentTokens();
        window.location.href = '/student/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  },
);
