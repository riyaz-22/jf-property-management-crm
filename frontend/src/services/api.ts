import axios, { type AxiosResponse } from 'axios';
import { useAuthStore } from '../app/store/authStore';
import type { ApiEnvelope, AuthSession } from '../types/domain';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as { _retry?: boolean; headers: Record<string, string> };
    const refreshToken = useAuthStore.getState().refreshToken;

    if (error.response?.status === 401 && refreshToken && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post<ApiEnvelope<AuthSession>>(
          `${API_URL}/auth/refresh`,
          { refreshToken },
          { withCredentials: true },
        );
        const session = response.data.data;
        useAuthStore.getState().setSession(session);
        originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;
        return apiClient(originalRequest);
      } catch {
        useAuthStore.getState().logout();
      }
    }

    return Promise.reject(error);
  },
);

export const unwrap = <T>(response: AxiosResponse<ApiEnvelope<T> | T>): T => {
  const payload = response.data;
  return typeof payload === 'object' && payload !== null && 'success' in payload
    ? (payload as ApiEnvelope<T>).data
    : (payload as T);
};

export const requestWithFallback = async <T>(
  request: Promise<AxiosResponse<ApiEnvelope<T> | T>>,
  fallback: T,
): Promise<T> => {
  try {
    return unwrap(await request);
  } catch {
    return fallback;
  }
};
