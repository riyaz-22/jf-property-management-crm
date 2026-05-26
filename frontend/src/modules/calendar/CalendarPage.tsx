import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Button, Card, Modal } from '../../components/ui/Primitives';
import { calendarService } from '../../services/calendar';
import { crmService } from '../../services/crm';
import type { CalendarAppointment, User } from '../../types/domain';
import { cn } from '../../utils/cn';

type ViewMode = 'month' | 'week' | 'day';

const dayMs = 86400000;
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * dayMs);
const fmt = (date: Date, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-GB', options).format(date);
const inputDateTime = (date: Date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

const statusTone = (status: string) => {
  if (status === 'CONFIRMED' || status === 'COMPLETED') return 'green';
  if (status === 'PENDING') return 'amber';
  if (status === 'CANCELLED') return 'red';
  return 'slate';
};

const rangeFor = (cursor: Date, mode: ViewMode) => {
  if (mode === 'month') return { start: new Date(cursor.getFullYear(), cursor.getMonth(), 1), end: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1) };
  if (mode === 'week') {
    const start = addDays(startOfDay(cursor), -((cursor.getDay() + 6) % 7));
    return { start, end: addDays(start, 7) };
  }
  const start = startOfDay(cursor);
  return { start, end: addDays(start, 1) };
};

const AppointmentForm = ({ appointment, agents, onSave, onDelete, onClose, saving }: {
  appointment?: CalendarAppointment | null;
  agents: User[];
  onSave: (payload: Partial<CalendarAppointment>) => void;
  onDelete?: () => void;
  onClose: () => void;
  saving: boolean;
}) => {
  const start = appointment?.startsAt ? new Date(appointment.startsAt) : new Date();
  start.setMinutes(0, 0, 0);
  const [form, setForm] = useState({
    title: appointment?.title ?? 'Property valuation',
    startsAt: inputDateTime(start),
    durationMinutes: String(appointment?.durationMinutes ?? 60),
    agentId: appointment?.agentId ?? '',
    reference: appointment?.reference ?? '',
    status: appointment?.status ?? 'CONFIRMED',
    notes: appointment?.notes ?? '',
  });
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const save = () => {
    const startsAt = new Date(form.startsAt);
    const durationMinutes = Number(form.durationMinutes || 60);
    onSave({
      title: form.title,
      startsAt: startsAt.toISOString(),
      endsAt: new Date(startsAt.getTime() + durationMinutes * 60000).toISOString(),
      durationMinutes,
      agentId: form.agentId || undefined,
      reference: form.reference || undefined,
      status: form.status,
      notes: form.notes || undefined,
    });
  };

  return (
    <div className="grid gap-4">
      <input className="h-11 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none" value={form.title} onChange={(event) => set('title', event.target.value)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input type="datetime-local" className="h-11 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none" value={form.startsAt} onChange={(event) => set('startsAt', event.target.value)} />
        <select className="h-11 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none" value={form.durationMinutes} onChange={(event) => set('durationMinutes', event.target.value)}>
          {[30, 45, 60, 90, 120].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutes</option>)}
        </select>
        <select className="h-11 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none" value={form.agentId} onChange={(event) => set('agentId', event.target.value)}>
          <option value="">Unassigned agent</option>
          {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.firstName} {agent.lastName}</option>)}
        </select>
        <select className="h-11 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none" value={form.status} onChange={(event) => set('status', event.target.value)}>
          {['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((status) => <option key={status}>{status}</option>)}
        </select>
      </div>
      <input className="h-11 rounded-md border border-slate-200 px-3 text-sm font-semibold outline-none" placeholder="Property reference" value={form.reference} onChange={(event) => set('reference', event.target.value)} />
      <textarea className="min-h-24 rounded-md border border-slate-200 p-3 text-sm font-semibold outline-none" placeholder="Appointment notes" value={form.notes} onChange={(event) => set('notes', event.target.value)} />
      <div className="flex flex-wrap justify-between gap-3">
        <div>{onDelete ? <Button variant="danger" icon={<Trash2 size={16} />} onClick={onDelete}>Delete</Button> : null}</div>
        <div className="flex gap-3"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save'}</Button></div>
      </div>
    </div>
  );
};

export const CalendarPage = ({ embedded = false, onClose }: { embedded?: boolean; onClose?: () => void }) => {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<ViewMode>('week');
  const [cursor, setCursor] = useState(new Date());
  const [modal, setModal] = useState<CalendarAppointment | null | 'new'>(null);
  const [error, setError] = useState('');
  const range = rangeFor(cursor, mode);
  const appointments = useQuery({ queryKey: ['calendar', range.start.toISOString(), range.end.toISOString()], queryFn: () => calendarService.list({ start: range.start.toISOString(), end: range.end.toISOString() }) });
  const agents = useQuery({ queryKey: ['calendar-agents'], queryFn: () => crmService.list<User>('users', { page: 1, limit: 100, sortBy: 'firstName', sortOrder: 'asc' }) });
  const rows = appointments.data?.data ?? [];
  const agentRows = agents.data?.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['calendar'] });
  const save = useMutation({
    mutationFn: (payload: Partial<CalendarAppointment>) => modal === 'new' ? calendarService.create(payload) : calendarService.update((modal as CalendarAppointment).id, payload),
    onSuccess: () => { setModal(null); setError(''); void invalidate(); },
    onError: (apiError) => setError(apiError instanceof Error ? apiError.message : 'Appointment could not be saved.'),
  });
  const remove = useMutation({
    mutationFn: (id: string) => calendarService.remove(id),
    onSuccess: () => { setModal(null); void invalidate(); },
  });
  const days = mode === 'month'
    ? Array.from({ length: 42 }, (_, index) => addDays(new Date(cursor.getFullYear(), cursor.getMonth(), 1 - ((new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay() + 6) % 7)), index))
    : Array.from({ length: mode === 'week' ? 7 : 1 }, (_, index) => addDays(range.start, index));

  const grouped = useMemo(() => days.map((day) => ({
    day,
    items: rows.filter((item) => startOfDay(new Date(item.startsAt)).getTime() === startOfDay(day).getTime()),
  })), [days, rows]);
  const upcoming = rows.filter((item) => new Date(item.startsAt) >= new Date()).slice(0, 4);

  return (
    <div className={cn('grid min-w-0 gap-5', embedded ? 'p-0' : 'p-5 md:p-8')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Scheduling</p>
          <h1 className="mt-1 text-3xl font-black">Calendar</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['month', 'week', 'day'] as ViewMode[]).map((value) => <Button key={value} variant={mode === value ? 'primary' : 'secondary'} onClick={() => setMode(value)}>{value}</Button>)}
          <Button variant="secondary" icon={<ChevronLeft size={16} />} onClick={() => setCursor(addDays(cursor, mode === 'month' ? -31 : mode === 'week' ? -7 : -1))}>Prev</Button>
          <Button variant="secondary" icon={<ChevronRight size={16} />} onClick={() => setCursor(addDays(cursor, mode === 'month' ? 31 : mode === 'week' ? 7 : 1))}>Next</Button>
          <Button icon={<Plus size={17} />} onClick={() => setModal('new')}>Create</Button>
          {onClose ? <Button variant="secondary" icon={<X size={17} />} onClick={onClose}>Close</Button> : null}
        </div>
      </div>
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0 overflow-hidden">
          <div className={cn('grid bg-slate-100 text-xs font-black uppercase tracking-widest text-slate-500', mode === 'day' ? 'grid-cols-1' : 'grid-cols-7')}>
            {grouped.map(({ day }) => <div key={day.toISOString()} className="px-3 py-3">{fmt(day, { weekday: 'short', day: '2-digit', month: 'short' })}</div>)}
          </div>
          <div className={cn('grid min-h-[520px]', mode === 'day' ? 'grid-cols-1' : 'grid-cols-7')}>
            {grouped.map(({ day, items }) => {
              const today = startOfDay(day).getTime() === startOfDay(new Date()).getTime();
              return (
                <div key={day.toISOString()} className={cn('min-h-32 border-r border-t border-slate-100 p-2 last:border-r-0', today && 'bg-emerald-50/50')}>
                  <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-500"><span>{day.getDate()}</span>{today ? <Badge tone="green">Today</Badge> : null}</div>
                  <div className="grid gap-2">
                    {items.map((item) => (
                      <button key={item.id} draggable onDragEnd={(event) => {
                        if (event.clientY > 0) {
                          const next = new Date(item.startsAt); next.setHours(Math.max(8, Math.min(18, Math.round((event.clientY / window.innerHeight) * 12) + 7)), 0, 0, 0);
                          save.mutate({ ...item, startsAt: next.toISOString(), endsAt: new Date(next.getTime() + item.durationMinutes * 60000).toISOString() });
                        }
                      }} onClick={() => setModal(item)} className="rounded-md border border-emerald-200 bg-white p-2 text-left text-xs shadow-sm hover:border-emerald-400">
                        <span className="flex items-center gap-1 font-black"><Clock size={12} />{fmt(new Date(item.startsAt), { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="mt-1 block font-bold text-slate-900">{item.title}</span>
                        <span className="mt-1 block text-slate-500">{item.agent ? `${item.agent.firstName} ${item.agent.lastName}` : 'Unassigned'} · {item.reference ?? item.property?.reference ?? 'No ref'}</span>
                        <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <aside className="grid gap-4 self-start">
          <Card className="p-5"><h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-500"><CalendarDays size={16} />Upcoming reminders</h2><div className="grid gap-3">{upcoming.map((item) => <button key={item.id} onClick={() => setModal(item)} className="rounded-md bg-slate-50 p-3 text-left text-sm font-bold">{fmt(new Date(item.startsAt), { weekday: 'short', hour: '2-digit', minute: '2-digit' })}<span className="block text-slate-500">{item.title}</span></button>)}</div></Card>
        </aside>
      </div>
      <Modal title={modal === 'new' ? 'Create appointment' : 'Appointment details'} open={Boolean(modal)} onClose={() => setModal(null)}>
        {modal ? <AppointmentForm appointment={modal === 'new' ? null : modal} agents={agentRows} saving={save.isPending || remove.isPending} onClose={() => setModal(null)} onSave={(payload) => save.mutate(payload)} onDelete={modal === 'new' ? undefined : () => remove.mutate(modal.id)} /> : null}
      </Modal>
    </div>
  );
};
