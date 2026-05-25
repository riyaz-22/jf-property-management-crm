import {
  dashboardSummary,
  leases,
  maintenance,
  notifications,
  payments,
  properties,
  tenants,
  users,
} from '../constants/demoData';
import type {
  DashboardSummary,
  EntityKey,
  LeaseRecord,
  MaintenanceRecord,
  NotificationRecord,
  Paginated,
  PaymentRecord,
  PropertyRecord,
  TenantRecord,
  User,
} from '../types/domain';
import { apiClient, requestWithFallback } from './api';

const page = <T>(data: T[]): Paginated<T> => ({
  data,
  meta: {
    total: data.length,
    page: 1,
    limit: 10,
    totalPages: 1,
  },
});

export const entityFallbacks = {
  properties: page<PropertyRecord>(properties),
  tenants: page<TenantRecord>(tenants),
  leases: page<LeaseRecord>(leases),
  payments: page<PaymentRecord>(payments),
  maintenance: page<MaintenanceRecord>(maintenance),
  notifications: page<NotificationRecord>(notifications),
  users: page<User>(users),
};

export const crmService = {
  dashboard() {
    return requestWithFallback<DashboardSummary>(
      apiClient.get('/dashboard/summary'),
      dashboardSummary,
    );
  },
  list<T>(entity: EntityKey) {
    return requestWithFallback<Paginated<T>>(
      apiClient.get(`/${entity}`),
      entityFallbacks[entity] as Paginated<T>,
    );
  },
  create<TPayload, TResult>(entity: EntityKey, payload: TPayload) {
    return requestWithFallback<TResult>(
      apiClient.post(`/${entity}`, payload),
      payload as unknown as TResult,
    );
  },
};
