import type { User } from '../types/domain';
import { apiClient, unwrap } from './api';

export const userService = {
  async uploadAvatar(userId: string, file: File) {
    const body = new FormData();
    body.append('avatar', file);

    return unwrap<User>(
      await apiClient.post(`/users/${userId}/avatar`, body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
  },
  async uploadMyAvatar(file: File) {
    const body = new FormData();
    body.append('avatar', file);

    return unwrap<User>(
      await apiClient.post('/users/me/avatar', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    );
  },
  async removeAvatar(userId: string) {
    return unwrap<User>(await apiClient.delete(`/users/${userId}/avatar`));
  },
  async removeMyAvatar() {
    return unwrap<User>(await apiClient.delete('/users/me/avatar'));
  },
};
