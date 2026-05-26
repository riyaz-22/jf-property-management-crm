import type { NotificationRecord, Paginated } from '../types/domain';
import { apiClient, unwrap } from './api';

export const notificationService = {
  async list(limit = 20) {
    return unwrap<Paginated<NotificationRecord>>(
      await apiClient.get('/notifications', { params: { page: 1, limit } }),
    );
  },
  async unreadCount() {
    return unwrap<{ count: number }>(await apiClient.get('/notifications/unread-count'));
  },
  async markRead(id: string) {
    return unwrap<NotificationRecord>(await apiClient.patch(`/notifications/${id}/read`));
  },
  async markAllRead() {
    return unwrap<{ count: number }>(await apiClient.patch('/notifications/read-all'));
  },
};
