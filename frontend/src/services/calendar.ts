import type { CalendarAppointment } from '../types/domain';
import { apiClient, unwrap } from './api';

export const calendarService = {
  async list(params?: { start?: string; end?: string }) {
    return unwrap<{ data: CalendarAppointment[] }>(await apiClient.get('/calendar/appointments', { params }));
  },
  async create(payload: Partial<CalendarAppointment>) {
    return unwrap<CalendarAppointment>(await apiClient.post('/calendar/appointments', payload));
  },
  async update(id: string, payload: Partial<CalendarAppointment>) {
    return unwrap<CalendarAppointment>(await apiClient.patch(`/calendar/appointments/${id}`, payload));
  },
  async remove(id: string) {
    return unwrap<{ id: string }>(await apiClient.delete(`/calendar/appointments/${id}`));
  },
};
