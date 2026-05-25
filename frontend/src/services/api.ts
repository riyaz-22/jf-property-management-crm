import axios, { type AxiosResponse } from 'axios';
import { useAuthStore } from '../app/store/authStore';
import type { ApiEnvelope, AuthSession } from '../types/domain';

export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';
const ASSET_URL = API_URL.replace(/\/api\/v1\/?$/, '');

export const resolveAssetUrl = (url?: string | null) => {
  if (!url) {
    return '';
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${ASSET_URL}${url.startsWith('/') ? url : `/${url}`}`;
};

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
    const originalRequest = error.config as { _retry?: boolean; headers?: Record<string, string> };
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
        originalRequest.headers = originalRequest.headers ?? {};
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

const extractServerMessage = (payload: unknown) => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const errorPayload = payload as { error?: unknown; message?: unknown };
  if (typeof errorPayload.message === 'string') {
    return errorPayload.message;
  }

  if (errorPayload.error && typeof errorPayload.error === 'object') {
    const nested = errorPayload.error as { message?: unknown };
    if (Array.isArray(nested.message)) {
      return nested.message.join(', ');
    }
    if (typeof nested.message === 'string') {
      return nested.message;
    }
  }

  return null;
};

const toUserMessage = (message: string) => {
  if (/property .+ should not exist/i.test(message)) {
    return 'This filter is not supported for the current module. Clear filters and try again.';
  }

  return message;
};

export const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return 'Unexpected client error. Try again.';
  }

  if (!error.response) {
    return 'Backend API is unavailable. Confirm the NestJS server is running and the API URL is correct.';
  }

  const serverMessage = extractServerMessage(error.response.data);

  if (error.response.status === 401) {
    return serverMessage ? toUserMessage(serverMessage) : 'Your session expired. Sign in again.';
  }

  if (error.response.status === 403) {
    return serverMessage ? toUserMessage(serverMessage) : 'Your role is not allowed to access this module.';
  }

  if (error.response.status >= 500) {
    return serverMessage ? toUserMessage(serverMessage) : 'Backend server error. Check the API logs and retry.';
  }

  return serverMessage ? toUserMessage(serverMessage) : 'Request failed. Check the submitted data and retry.';
};
