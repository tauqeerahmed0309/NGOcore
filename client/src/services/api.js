import axios from 'axios';

const getBaseURL = () => {
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').trim();
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api/v1') && !url.includes('/api/')) {
    url = `${url}/api/v1`;
  }
  return url;
};

const baseURL = getBaseURL();
const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    const authEndpoint = /\/auth\/(login|student\/login|google|refresh|logout(?!-all)|password\/(?:forgot|reset|setup)|signup(?:\/(?:verify|resend))?|onboarding(?:\/document)?)$/
      .test(originalRequest?.url || '');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !authEndpoint) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshClient.post('/auth/refresh')
            .finally(() => { refreshPromise = null; });
        }
        await refreshPromise;
        return api(originalRequest);
      } catch (refreshError) {
        window.dispatchEvent(new Event('auth:unauthorized'));
        return Promise.reject(
          refreshError.response?.data || {
            success: false,
            message: refreshError.message || 'Your session has expired. Please sign in again.',
            data: null,
            errors: null
          }
        );
      }
    }

    if (error.response?.status === 401 && !authEndpoint) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(
      error.response?.data || {
        success: false,
        message: error.message || 'Network error occurred',
        data: null,
        errors: null
      }
    );
  }
);

export default api;
