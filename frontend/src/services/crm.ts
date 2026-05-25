import type {
  DashboardSummary,
  EntityKey,
  Paginated,
} from '../types/domain';
import { apiClient, unwrap } from './api';

export type ListParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  [key: string]: string | number | undefined;
};

export const crmService = {
  async dashboard() {
    return unwrap<DashboardSummary>(await apiClient.get('/dashboard/summary'));
  },
  async list<T>(entity: EntityKey, params?: ListParams) {
    return unwrap<Paginated<T>>(await apiClient.get(`/${entity}`, { params }));
  },
  async detail<T>(entity: EntityKey, id: string) {
    return unwrap<T>(await apiClient.get(`/${entity}/${id}`));
  },
  async create<TPayload, TResult>(entity: EntityKey, payload: TPayload) {
    return unwrap<TResult>(await apiClient.post(`/${entity}`, payload));
  },
  async update<TPayload, TResult>(entity: EntityKey, id: string, payload: TPayload) {
    return unwrap<TResult>(await apiClient.patch(`/${entity}/${id}`, payload));
  },
  async remove<T>(entity: EntityKey, id: string) {
    return unwrap<T>(await apiClient.delete(`/${entity}/${id}`));
  },
};
