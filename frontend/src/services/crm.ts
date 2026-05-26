import type {
  ContactRecord,
  DashboardSummary,
  EntityKey,
  Paginated,
  SellIntentRecord,
  ValuationAppointment,
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

type CrmResource = EntityKey | 'contacts';

export const crmService = {
  async dashboard() {
    return unwrap<DashboardSummary>(await apiClient.get('/dashboard/summary'));
  },
  async list<T>(entity: CrmResource, params?: ListParams) {
    return unwrap<Paginated<T>>(await apiClient.get(`/${entity}`, { params }));
  },
  async detail<T>(entity: CrmResource, id: string) {
    return unwrap<T>(await apiClient.get(`/${entity}/${id}`));
  },
  async create<TPayload, TResult>(entity: CrmResource, payload: TPayload) {
    return unwrap<TResult>(await apiClient.post(`/${entity}`, payload));
  },
  async update<TPayload, TResult>(entity: CrmResource, id: string, payload: TPayload) {
    return unwrap<TResult>(await apiClient.patch(`/${entity}/${id}`, payload));
  },
  async remove<T>(entity: CrmResource, id: string) {
    return unwrap<T>(await apiClient.delete(`/${entity}/${id}`));
  },
  async uploadContactAvatar(id: string, file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    return unwrap<ContactRecord>(await apiClient.post(`/contacts/${id}/avatar`, formData));
  },
  async removeContactAvatar(id: string) {
    return unwrap<ContactRecord>(await apiClient.delete(`/contacts/${id}/avatar`));
  },
  async sellIntent(contactId: string) {
    return unwrap<SellIntentRecord>(await apiClient.get(`/contacts/${contactId}/sell-intent`));
  },
  async updateSellIntentChecklist(contactId: string, label: string, completed: boolean) {
    return unwrap<SellIntentRecord>(
      await apiClient.patch(`/contacts/${contactId}/sell-intent/checklist`, { label, completed }),
    );
  },
  async scheduleValuation(contactId: string, payload: {
    scheduledAt: string;
    agentId?: string;
    notes?: string;
    competingAgents?: string;
    durationMinutes?: number;
  }) {
    return unwrap<ValuationAppointment>(await apiClient.post(`/contacts/${contactId}/appointments`, payload));
  },
};
