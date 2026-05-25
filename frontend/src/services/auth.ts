import axios from 'axios';
import { apiClient, unwrap } from './api';
import { demoUser } from '../constants/demoData';
import type { AuthSession } from '../types/domain';

export type LoginPayload = {
  email: string;
  password: string;
};

const demoSession = (): AuthSession => ({
  user: demoUser,
  accessToken: 'demo-access-token',
  refreshToken: 'demo-refresh-token',
  refreshTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
});

export const authService = {
  async login(payload: LoginPayload) {
    try {
      return unwrap<AuthSession>(await apiClient.post('/auth/login', payload));
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        return demoSession();
      }

      throw error;
    }
  },
  async forgotPassword(email: string) {
    return unwrap<{ message: string; resetToken?: string }>(
      await apiClient.post('/auth/forgot-password', { email }),
    );
  },
  async resetPassword(token: string, password: string) {
    return unwrap<{ message: string }>(
      await apiClient.post('/auth/reset-password', { token, password }),
    );
  },
  async logout(refreshToken?: string | null) {
    try {
      await apiClient.post('/auth/logout', { refreshToken });
    } catch {
      return;
    }
  },
};
