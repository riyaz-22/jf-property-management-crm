import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Badge,
  Button,
  DataTable,
  Modal,
  Skeleton,
  TextInput,
  type Column,
} from '../../components/ui/Primitives';
import { crmService } from '../../services/crm';
import type { EntityKey, Paginated } from '../../types/domain';
import { formatCurrency, formatDate } from '../../utils/cn';

type EntityRow = {
  id: string;
  [key: string]: unknown;
};

type EntityConfig = {
  key: EntityKey;
  title: string;
  eyebrow: string;
  description: string;
  createLabel: string;
  columns: Column<EntityRow>[];
};

const statusTone = (status: string) => {
  if (['ACTIVE', 'PAID', 'OCCUPIED', 'COMPLETED', 'AVAILABLE'].includes(status)) {
    return 'green';
  }
  if (['PENDING', 'EXPIRING', 'ASSIGNED', 'UNDER_MAINTENANCE'].includes(status)) {
    return 'amber';
  }
  if (['OVERDUE', 'FAILED', 'URGENT'].includes(status)) {
    return 'red';
  }
  return 'slate';
};

const nameOf = (row: EntityRow) => {
  const firstName = String(row.firstName ?? '');
  const lastName = String(row.lastName ?? '');
  return `${firstName} ${lastName}`.trim();
};

const nestedTitle = (row: EntityRow, key: string) => {
  const value = row[key] as { title?: string; firstName?: string; lastName?: string } | undefined;
  if (!value) {
    return '-';
  }
  return value.title ?? `${value.firstName ?? ''} ${value.lastName ?? ''}`.trim();
};

const entityConfigs: Record<EntityKey, EntityConfig> = {
  properties: {
    key: 'properties',
    title: 'Properties',
    eyebrow: 'Portfolio',
    description: 'CRUD-ready property inventory with search, filters, sort, and pagination APIs.',
    createLabel: 'Add property',
    columns: [
      { header: 'Reference', cell: (row) => <span className="font-black">{String(row.reference)}</span> },
      { header: 'Property', cell: (row) => <span className="font-bold">{String(row.title)}</span> },
      { header: 'City', cell: (row) => String(row.city) },
      { header: 'Rent', cell: (row) => formatCurrency(Number(row.rentAmount ?? 0)) },
      { header: 'Status', cell: (row) => <Badge tone={statusTone(String(row.status))}>{String(row.status)}</Badge> },
    ],
  },
  tenants: {
    key: 'tenants',
    title: 'Tenants',
    eyebrow: 'Resident records',
    description: 'Tenant CRUD, lease assignment, contact information, and property mapping.',
    createLabel: 'Add tenant',
    columns: [
      { header: 'Name', cell: (row) => <span className="font-black">{nameOf(row)}</span> },
      { header: 'Email', cell: (row) => String(row.email) },
      { header: 'Phone', cell: (row) => String(row.phone ?? '-') },
      { header: 'Property', cell: (row) => nestedTitle(row, 'currentProperty') },
      { header: 'Status', cell: (row) => <Badge tone={statusTone(String(row.status))}>{String(row.status)}</Badge> },
    ],
  },
  leases: {
    key: 'leases',
    title: 'Leases',
    eyebrow: 'Lifecycle',
    description: 'Lease lifecycle management, renewals, expiry tracking, and rent terms.',
    createLabel: 'Create lease',
    columns: [
      { header: 'Property', cell: (row) => nestedTitle(row, 'property') },
      { header: 'Tenant', cell: (row) => nestedTitle(row, 'tenant') },
      { header: 'Rent', cell: (row) => formatCurrency(Number(row.rentAmount ?? 0)) },
      { header: 'Ends', cell: (row) => formatDate(String(row.endDate)) },
      { header: 'Status', cell: (row) => <Badge tone={statusTone(String(row.status))}>{String(row.status)}</Badge> },
    ],
  },
  payments: {
    key: 'payments',
    title: 'Payments',
    eyebrow: 'Finance',
    description: 'Payment tracking, transactions, reconciliations, and due reminders.',
    createLabel: 'Record payment',
    columns: [
      { header: 'Reference', cell: (row) => <span className="font-black">{String(row.reference)}</span> },
      { header: 'Tenant', cell: (row) => nestedTitle(row, 'tenant') },
      { header: 'Amount', cell: (row) => formatCurrency(Number(row.amount ?? 0)) },
      { header: 'Due', cell: (row) => formatDate(String(row.dueDate)) },
      { header: 'Status', cell: (row) => <Badge tone={statusTone(String(row.status))}>{String(row.status)}</Badge> },
    ],
  },
  maintenance: {
    key: 'maintenance',
    title: 'Maintenance',
    eyebrow: 'Ticket desk',
    description: 'Ticket assignment workflow, status tracking, priorities, and upload-ready APIs.',
    createLabel: 'Open ticket',
    columns: [
      { header: 'Ticket', cell: (row) => <span className="font-black">{String(row.title)}</span> },
      { header: 'Property', cell: (row) => nestedTitle(row, 'property') },
      { header: 'Priority', cell: (row) => <Badge tone={statusTone(String(row.priority))}>{String(row.priority)}</Badge> },
      { header: 'Status', cell: (row) => <Badge tone={statusTone(String(row.status))}>{String(row.status)}</Badge> },
      { header: 'Due', cell: (row) => (row.dueDate ? formatDate(String(row.dueDate)) : '-') },
    ],
  },
  notifications: {
    key: 'notifications',
    title: 'Notifications',
    eyebrow: 'Notification center',
    description: 'Alerts, reminders, task notifications, and read/unread status.',
    createLabel: 'Create alert',
    columns: [
      { header: 'Title', cell: (row) => <span className="font-black">{String(row.title)}</span> },
      { header: 'Message', cell: (row) => String(row.message) },
      { header: 'Type', cell: (row) => <Badge tone="blue">{String(row.type)}</Badge> },
      { header: 'Created', cell: (row) => formatDate(String(row.createdAt)) },
      { header: 'Read', cell: (row) => (row.readAt ? 'Read' : 'Unread') },
    ],
  },
  users: {
    key: 'users',
    title: 'User Management',
    eyebrow: 'RBAC',
    description: 'Roles, permissions, user profiles, activation state, and secure admin APIs.',
    createLabel: 'Invite user',
    columns: [
      { header: 'Name', cell: (row) => <span className="font-black">{nameOf(row)}</span> },
      { header: 'Email', cell: (row) => String(row.email) },
      { header: 'Role', cell: (row) => <Badge tone="purple">{String(row.role)}</Badge> },
      { header: 'Phone', cell: (row) => String(row.phone ?? '-') },
      { header: 'Status', cell: (row) => <Badge tone={row.isActive ? 'green' : 'red'}>{row.isActive ? 'Active' : 'Disabled'}</Badge> },
    ],
  },
};

const createSchema = z.object({
  title: z.string().min(2, 'Enter at least 2 characters'),
  reference: z.string().min(2, 'Enter a reference'),
});

type CreateForm = z.infer<typeof createSchema>;

export const EntityPage = ({ entity }: { entity: EntityKey }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const config = entityConfigs[entity];
  const { data, isLoading } = useQuery({
    queryKey: [entity],
    queryFn: () => crmService.list<EntityRow>(entity),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  const createRecord = useMutation({
    mutationFn: (values: CreateForm) => crmService.create<CreateForm, EntityRow>(entity, values),
    onSuccess: () => {
      reset();
      setModalOpen(false);
    },
  });

  const rows = ((data as Paginated<EntityRow> | undefined)?.data ?? []) as EntityRow[];

  return (
    <div className="grid gap-6 p-5 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">{config.eyebrow}</p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">{config.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">{config.description}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon={<SlidersHorizontal size={18} />}>Filters</Button>
          <Button onClick={() => setModalOpen(true)} icon={<Plus size={18} />}>{config.createLabel}</Button>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
          placeholder={`Search ${config.title.toLowerCase()}...`}
        />
      </div>

      {isLoading ? <Skeleton className="h-80" /> : <DataTable rows={rows} columns={config.columns} />}

      <Modal title={config.createLabel} open={modalOpen} onClose={() => setModalOpen(false)}>
        <form className="grid gap-4" onSubmit={handleSubmit((values) => createRecord.mutate(values))}>
          <TextInput label="Title or name" error={errors.title?.message} {...register('title')} />
          <TextInput label="Reference" error={errors.reference?.message} {...register('reference')} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createRecord.isPending}>Save record</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
