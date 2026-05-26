import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Eye,
  Image,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Badge,
  Button,
  DataTable,
  Modal,
  Skeleton,
  TextInput,
  type Column,
} from '../../components/ui/Primitives';
import { crmService, type ListParams } from '../../services/crm';
import { getApiErrorMessage, resolveAssetUrl } from '../../services/api';
import { userService } from '../../services/users';
import { useAuthStore } from '../../app/store/authStore';
import type { EntityKey, Paginated } from '../../types/domain';
import { formatCurrency, formatDate } from '../../utils/cn';

type EntityRow = {
  id: string;
  [key: string]: unknown;
};

type FieldOption = {
  label: string;
  value: string;
};

type FieldConfig = {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'number' | 'date' | 'password' | 'textarea' | 'select';
  required?: boolean;
  options?: FieldOption[];
  optionSource?: EntityKey | 'users';
  getOptionLabel?: (row: EntityRow) => string;
};

type EntityConfig = {
  key: EntityKey;
  title: string;
  eyebrow: string;
  description: string;
  createLabel: string;
  defaultSort: string;
  statusFilter?: FieldOption[];
  activeFilter?: FieldOption[];
  activeFilterParam?: 'isActive' | 'activeState';
  sortOptions?: FieldOption[];
  fields: FieldConfig[];
  columns: Column<EntityRow>[];
  mapPayload: (values: Record<string, string>, mode: 'create' | 'edit') => Record<string, unknown>;
  getDefaults: (row?: EntityRow) => Record<string, string>;
};

const enumOptions = {
  propertyType: ['FLAT', 'HOUSE', 'TOWNHOUSE', 'COMMERCIAL', 'LAND'],
  propertyStatus: ['DRAFT', 'AVAILABLE', 'OCCUPIED', 'UNDER_MAINTENANCE', 'SOLD', 'ARCHIVED'],
  leaseStatus: ['DRAFT', 'ACTIVE', 'EXPIRING', 'RENEWED', 'TERMINATED'],
  paymentStatus: ['PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'FAILED', 'REFUNDED'],
  paymentMethod: ['CASH', 'BANK_TRANSFER', 'CARD', 'DIRECT_DEBIT'],
  maintenancePriority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
  maintenanceStatus: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_TENANT', 'COMPLETED', 'CANCELLED'],
  notificationType: ['INFO', 'SUCCESS', 'WARNING', 'ERROR', 'TASK'],
  roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'AGENT', 'ACCOUNTANT', 'MAINTENANCE', 'VIEWER'],
};

const toOptions = (values: readonly string[]) =>
  values.map((value) => ({ label: value.replaceAll('_', ' '), value }));

const defaultSortOptions = [
  { label: 'Default sort', value: '' },
  { label: 'Created date', value: 'createdAt' },
  { label: 'Updated date', value: 'updatedAt' },
];

const toNumber = (value?: string) => (value ? Number(value) : undefined);
const emptyToUndefined = (value?: string) => (value?.trim() ? value.trim() : undefined);

const statusTone = (status: string) => {
  if (['ACTIVE', 'PAID', 'OCCUPIED', 'COMPLETED', 'AVAILABLE', 'SUCCESS'].includes(status)) {
    return 'green';
  }
  if (['PENDING', 'EXPIRING', 'ASSIGNED', 'UNDER_MAINTENANCE', 'WARNING'].includes(status)) {
    return 'amber';
  }
  if (['OVERDUE', 'FAILED', 'URGENT', 'ERROR'].includes(status)) {
    return 'red';
  }
  return 'slate';
};

const nameOf = (row: EntityRow) =>
  `${String(row.firstName ?? '')} ${String(row.lastName ?? '')}`.trim();

const nestedValue = (row: EntityRow, key: string) =>
  row[key] as { id?: string; title?: string; firstName?: string; lastName?: string } | undefined;

const nestedTitle = (row: EntityRow, key: string) => {
  const value = nestedValue(row, key);
  if (!value) {
    return '-';
  }
  return value.title ?? `${value.firstName ?? ''} ${value.lastName ?? ''}`.trim();
};

const textValue = (row: EntityRow | undefined, key: string) =>
  row?.[key] == null ? '' : String(row[key]);

const dateValue = (row: EntityRow | undefined, key: string) =>
  row?.[key] ? String(row[key]).slice(0, 10) : '';

const relationId = (row: EntityRow | undefined, key: string) => nestedValue(row ?? { id: '' }, key)?.id ?? '';

const avatarFor = (row: EntityRow) => resolveAssetUrl(String(row.avatarUrl ?? ''));

const UserAvatar = ({ row }: { row: EntityRow }) => {
  const avatarUrl = avatarFor(row);
  const initials = `${String(row.firstName ?? 'U')[0] ?? 'U'}${String(row.lastName ?? '')[0] ?? ''}`.toUpperCase();

  return (
    <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-md bg-emerald-50 text-xs font-black text-emerald-800">
      {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initials}
    </span>
  );
};

const mapBase = (values: Record<string, string>, fields: string[]) =>
  fields.reduce<Record<string, unknown>>((payload, field) => {
    payload[field] = emptyToUndefined(values[field]);
    return payload;
  }, {});

const entityConfigs: Record<EntityKey, EntityConfig> = {
  properties: {
    key: 'properties',
    title: 'Properties',
    eyebrow: 'Portfolio',
    description: 'Live PostgreSQL property inventory with create, edit, delete, search, filters, sorting, and pagination.',
    createLabel: 'Add property',
    defaultSort: 'createdAt',
    statusFilter: toOptions(enumOptions.propertyStatus),
    fields: [
      { name: 'reference', label: 'Reference', required: true },
      { name: 'title', label: 'Property title', required: true },
      { name: 'type', label: 'Type', type: 'select', required: true, options: toOptions(enumOptions.propertyType) },
      { name: 'status', label: 'Status', type: 'select', required: true, options: toOptions(enumOptions.propertyStatus) },
      { name: 'addressLine1', label: 'Address line 1', required: true },
      { name: 'city', label: 'City', required: true },
      { name: 'postcode', label: 'Postcode', required: true },
      { name: 'bedrooms', label: 'Bedrooms', type: 'number', required: true },
      { name: 'bathrooms', label: 'Bathrooms', type: 'number', required: true },
      { name: 'rentAmount', label: 'Monthly rent', type: 'number', required: true },
      { name: 'depositAmount', label: 'Deposit', type: 'number', required: true },
      { name: 'askingPrice', label: 'Asking price', type: 'number' },
      { name: 'ownerName', label: 'Owner name' },
      { name: 'ownerEmail', label: 'Owner email', type: 'email' },
      { name: 'managerId', label: 'Manager', type: 'select', optionSource: 'users', getOptionLabel: nameOf },
    ],
    columns: [
      { header: 'Reference', cell: (row) => <span className="font-black">{String(row.reference)}</span> },
      { header: 'Property', cell: (row) => <span className="font-bold">{String(row.title)}</span> },
      { header: 'City', cell: (row) => String(row.city) },
      { header: 'Rent', cell: (row) => formatCurrency(Number(row.rentAmount ?? 0)) },
      { header: 'Status', cell: (row) => <Badge tone={statusTone(String(row.status))}>{String(row.status)}</Badge> },
    ],
    mapPayload: (values) => ({
      ...mapBase(values, ['reference', 'title', 'type', 'status', 'addressLine1', 'city', 'postcode', 'ownerName', 'ownerEmail', 'managerId']),
      bedrooms: Number(values.bedrooms),
      bathrooms: Number(values.bathrooms),
      rentAmount: Number(values.rentAmount),
      depositAmount: Number(values.depositAmount),
      askingPrice: toNumber(values.askingPrice),
    }),
    getDefaults: (row) => ({
      reference: textValue(row, 'reference'),
      title: textValue(row, 'title'),
      type: textValue(row, 'type') || 'FLAT',
      status: textValue(row, 'status') || 'DRAFT',
      addressLine1: textValue(row, 'addressLine1'),
      city: textValue(row, 'city'),
      postcode: textValue(row, 'postcode'),
      bedrooms: textValue(row, 'bedrooms') || '1',
      bathrooms: textValue(row, 'bathrooms') || '1',
      rentAmount: textValue(row, 'rentAmount') || '1000',
      depositAmount: textValue(row, 'depositAmount') || '2000',
      askingPrice: textValue(row, 'askingPrice'),
      ownerName: textValue(row, 'ownerName'),
      ownerEmail: textValue(row, 'ownerEmail'),
      managerId: relationId(row, 'manager'),
    }),
  },
  tenants: {
    key: 'tenants',
    title: 'Tenants',
    eyebrow: 'Resident records',
    description: 'Tenant records are persisted in PostgreSQL and can be assigned to active properties.',
    createLabel: 'Add tenant',
    defaultSort: 'moveInDate',
    statusFilter: toOptions(['ACTIVE', 'APPLICANT', 'NOTICE_GIVEN', 'ARCHIVED']),
    activeFilter: [{ label: 'Active tenants', value: 'active' }, { label: 'Inactive tenants', value: 'inactive' }],
    activeFilterParam: 'activeState',
    sortOptions: [
      { label: 'Default sort', value: '' },
      { label: 'Created date', value: 'createdAt' },
      { label: 'First name', value: 'firstName' },
      { label: 'Last name', value: 'lastName' },
      { label: 'Move-in date', value: 'moveInDate' },
      { label: 'Status', value: 'status' },
    ],
    fields: [
      { name: 'firstName', label: 'First name', required: true },
      { name: 'lastName', label: 'Last name', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'phone', label: 'Phone' },
      { name: 'status', label: 'Status', type: 'select', required: true, options: toOptions(['ACTIVE', 'APPLICANT', 'NOTICE_GIVEN', 'ARCHIVED']) },
      { name: 'currentPropertyId', label: 'Current property', type: 'select', optionSource: 'properties', getOptionLabel: (row) => String(row.title) },
    ],
    columns: [
      { header: 'Photo', cell: (row) => <UserAvatar row={row} /> },
      { header: 'Name', cell: (row) => <span className="font-black">{nameOf(row)}</span> },
      { header: 'Email', cell: (row) => String(row.email) },
      { header: 'Phone', cell: (row) => String(row.phone ?? '-') },
      { header: 'Property', cell: (row) => nestedTitle(row, 'currentProperty') },
      { header: 'Status', cell: (row) => <Badge tone={statusTone(String(row.status))}>{String(row.status)}</Badge> },
    ],
    mapPayload: (values) => mapBase(values, ['firstName', 'lastName', 'email', 'phone', 'status', 'currentPropertyId']),
    getDefaults: (row) => ({
      firstName: textValue(row, 'firstName'),
      lastName: textValue(row, 'lastName'),
      email: textValue(row, 'email'),
      phone: textValue(row, 'phone'),
      status: textValue(row, 'status') || 'ACTIVE',
      currentPropertyId: relationId(row, 'currentProperty'),
    }),
  },
  leases: {
    key: 'leases',
    title: 'Leases',
    eyebrow: 'Lifecycle',
    description: 'Lease lifecycle management with renewal, expiry, and rent tracking.',
    createLabel: 'Create lease',
    defaultSort: 'endDate',
    statusFilter: toOptions(enumOptions.leaseStatus),
    fields: [
      { name: 'propertyId', label: 'Property', type: 'select', required: true, optionSource: 'properties', getOptionLabel: (row) => String(row.title) },
      { name: 'tenantId', label: 'Tenant', type: 'select', required: true, optionSource: 'tenants', getOptionLabel: nameOf },
      { name: 'startDate', label: 'Start date', type: 'date', required: true },
      { name: 'endDate', label: 'End date', type: 'date', required: true },
      { name: 'rentAmount', label: 'Rent amount', type: 'number', required: true },
      { name: 'depositAmount', label: 'Deposit amount', type: 'number', required: true },
      { name: 'status', label: 'Status', type: 'select', required: true, options: toOptions(enumOptions.leaseStatus) },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: [
      { header: 'Property', cell: (row) => nestedTitle(row, 'property') },
      { header: 'Tenant', cell: (row) => nestedTitle(row, 'tenant') },
      { header: 'Rent', cell: (row) => formatCurrency(Number(row.rentAmount ?? 0)) },
      { header: 'Ends', cell: (row) => formatDate(String(row.endDate)) },
      { header: 'Status', cell: (row) => <Badge tone={statusTone(String(row.status))}>{String(row.status)}</Badge> },
    ],
    mapPayload: (values) => ({
      ...mapBase(values, ['propertyId', 'tenantId', 'startDate', 'endDate', 'status', 'notes']),
      rentAmount: Number(values.rentAmount),
      depositAmount: Number(values.depositAmount),
    }),
    getDefaults: (row) => ({
      propertyId: relationId(row, 'property'),
      tenantId: relationId(row, 'tenant'),
      startDate: dateValue(row, 'startDate'),
      endDate: dateValue(row, 'endDate'),
      rentAmount: textValue(row, 'rentAmount') || '1000',
      depositAmount: textValue(row, 'depositAmount') || '2000',
      status: textValue(row, 'status') || 'DRAFT',
      notes: textValue(row, 'notes'),
    }),
  },
  payments: {
    key: 'payments',
    title: 'Payments',
    eyebrow: 'Finance',
    description: 'Payment tracking, due reminders, reconciliation, and transaction status.',
    createLabel: 'Record payment',
    defaultSort: 'dueDate',
    statusFilter: toOptions(enumOptions.paymentStatus),
    fields: [
      { name: 'reference', label: 'Reference', required: true },
      { name: 'propertyId', label: 'Property', type: 'select', required: true, optionSource: 'properties', getOptionLabel: (row) => String(row.title) },
      { name: 'tenantId', label: 'Tenant', type: 'select', required: true, optionSource: 'tenants', getOptionLabel: nameOf },
      { name: 'leaseId', label: 'Lease', type: 'select', optionSource: 'leases', getOptionLabel: (row) => `${nestedTitle(row, 'property')} / ${nestedTitle(row, 'tenant')}` },
      { name: 'amount', label: 'Amount', type: 'number', required: true },
      { name: 'dueDate', label: 'Due date', type: 'date', required: true },
      { name: 'status', label: 'Status', type: 'select', required: true, options: toOptions(enumOptions.paymentStatus) },
      { name: 'method', label: 'Method', type: 'select', options: toOptions(enumOptions.paymentMethod) },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
    columns: [
      { header: 'Reference', cell: (row) => <span className="font-black">{String(row.reference)}</span> },
      { header: 'Tenant', cell: (row) => nestedTitle(row, 'tenant') },
      { header: 'Amount', cell: (row) => formatCurrency(Number(row.amount ?? 0)) },
      { header: 'Due', cell: (row) => formatDate(String(row.dueDate)) },
      { header: 'Status', cell: (row) => <Badge tone={statusTone(String(row.status))}>{String(row.status)}</Badge> },
    ],
    mapPayload: (values) => ({
      ...mapBase(values, ['reference', 'propertyId', 'tenantId', 'leaseId', 'dueDate', 'status', 'method', 'notes']),
      amount: Number(values.amount),
    }),
    getDefaults: (row) => ({
      reference: textValue(row, 'reference'),
      propertyId: relationId(row, 'property'),
      tenantId: relationId(row, 'tenant'),
      leaseId: relationId(row, 'lease'),
      amount: textValue(row, 'amount') || '1000',
      dueDate: dateValue(row, 'dueDate'),
      status: textValue(row, 'status') || 'PENDING',
      method: textValue(row, 'method'),
      notes: textValue(row, 'notes'),
    }),
  },
  maintenance: {
    key: 'maintenance',
    title: 'Maintenance',
    eyebrow: 'Ticket desk',
    description: 'Ticket assignment workflow with priorities, statuses, and assignee tracking.',
    createLabel: 'Open ticket',
    defaultSort: 'createdAt',
    statusFilter: toOptions(enumOptions.maintenanceStatus),
    fields: [
      { name: 'propertyId', label: 'Property', type: 'select', required: true, optionSource: 'properties', getOptionLabel: (row) => String(row.title) },
      { name: 'tenantId', label: 'Tenant', type: 'select', optionSource: 'tenants', getOptionLabel: nameOf },
      { name: 'assigneeId', label: 'Assignee', type: 'select', optionSource: 'users', getOptionLabel: nameOf },
      { name: 'title', label: 'Title', required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: true },
      { name: 'priority', label: 'Priority', type: 'select', required: true, options: toOptions(enumOptions.maintenancePriority) },
      { name: 'status', label: 'Status', type: 'select', required: true, options: toOptions(enumOptions.maintenanceStatus) },
      { name: 'dueDate', label: 'Due date', type: 'date' },
      { name: 'cost', label: 'Estimated cost', type: 'number' },
    ],
    columns: [
      { header: 'Ticket', cell: (row) => <span className="font-black">{String(row.title)}</span> },
      { header: 'Property', cell: (row) => nestedTitle(row, 'property') },
      { header: 'Priority', cell: (row) => <Badge tone={statusTone(String(row.priority))}>{String(row.priority)}</Badge> },
      { header: 'Status', cell: (row) => <Badge tone={statusTone(String(row.status))}>{String(row.status)}</Badge> },
      { header: 'Due', cell: (row) => (row.dueDate ? formatDate(String(row.dueDate)) : '-') },
    ],
    mapPayload: (values) => ({
      ...mapBase(values, ['propertyId', 'tenantId', 'assigneeId', 'title', 'description', 'priority', 'status', 'dueDate']),
      cost: toNumber(values.cost),
    }),
    getDefaults: (row) => ({
      propertyId: relationId(row, 'property'),
      tenantId: relationId(row, 'tenant'),
      assigneeId: relationId(row, 'assignee'),
      title: textValue(row, 'title'),
      description: textValue(row, 'description'),
      priority: textValue(row, 'priority') || 'MEDIUM',
      status: textValue(row, 'status') || 'OPEN',
      dueDate: dateValue(row, 'dueDate'),
      cost: textValue(row, 'cost'),
    }),
  },
  notifications: {
    key: 'notifications',
    title: 'Notifications',
    eyebrow: 'Notification center',
    description: 'Persisted alerts, reminders, and task notifications scoped to users.',
    createLabel: 'Create alert',
    defaultSort: 'createdAt',
    fields: [
      { name: 'userId', label: 'Recipient', type: 'select', required: true, optionSource: 'users', getOptionLabel: nameOf },
      { name: 'title', label: 'Title', required: true },
      { name: 'message', label: 'Message', type: 'textarea', required: true },
      { name: 'type', label: 'Type', type: 'select', required: true, options: toOptions(enumOptions.notificationType) },
      { name: 'link', label: 'Link' },
    ],
    columns: [
      { header: 'Title', cell: (row) => <span className="font-black">{String(row.title)}</span> },
      { header: 'Message', cell: (row) => String(row.message) },
      { header: 'Type', cell: (row) => <Badge tone={statusTone(String(row.type))}>{String(row.type)}</Badge> },
      { header: 'Created', cell: (row) => formatDate(String(row.createdAt)) },
      { header: 'Read', cell: (row) => (row.readAt ? 'Read' : 'Unread') },
    ],
    mapPayload: (values) => mapBase(values, ['userId', 'title', 'message', 'type', 'link']),
    getDefaults: (row) => ({
      userId: textValue(row, 'userId'),
      title: textValue(row, 'title'),
      message: textValue(row, 'message'),
      type: textValue(row, 'type') || 'INFO',
      link: textValue(row, 'link'),
    }),
  },
  users: {
    key: 'users',
    title: 'User Management',
    eyebrow: 'RBAC',
    description: 'Users, roles, activation state, profile data, and admin-only account management.',
    createLabel: 'Add user',
    defaultSort: 'createdAt',
    statusFilter: toOptions(enumOptions.roles),
    activeFilter: [{ label: 'Active users', value: 'true' }, { label: 'Disabled users', value: 'false' }],
    activeFilterParam: 'isActive',
    sortOptions: [
      { label: 'Default sort', value: '' },
      { label: 'Role', value: 'role' },
      { label: 'Email', value: 'email' },
      { label: 'First name', value: 'firstName' },
      { label: 'Last name', value: 'lastName' },
      { label: 'Created date', value: 'createdAt' },
      { label: 'Updated date', value: 'updatedAt' },
    ],
    fields: [
      { name: 'firstName', label: 'First name', required: true },
      { name: 'lastName', label: 'Last name', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'password', label: 'Password', type: 'password', required: true },
      { name: 'phone', label: 'Phone' },
      { name: 'role', label: 'Role', type: 'select', required: true, options: toOptions(enumOptions.roles) },
      { name: 'isActive', label: 'Status', type: 'select', required: true, options: [{ label: 'Active', value: 'true' }, { label: 'Disabled', value: 'false' }] },
    ],
    columns: [
      { header: 'Name', cell: (row) => <span className="font-black">{nameOf(row)}</span> },
      { header: 'Email', cell: (row) => String(row.email) },
      { header: 'Role', cell: (row) => <Badge tone="purple">{String(row.role)}</Badge> },
      { header: 'Phone', cell: (row) => String(row.phone ?? '-') },
      { header: 'Status', cell: (row) => <Badge tone={row.isActive ? 'green' : 'red'}>{row.isActive ? 'Active' : 'Disabled'}</Badge> },
    ],
    mapPayload: (values, mode) => ({
      ...mapBase(values, ['firstName', 'lastName', 'email', 'phone', 'role']),
      ...(values.password || mode === 'create' ? { password: values.password } : {}),
      ...(mode === 'edit' ? { isActive: values.isActive === 'true' } : {}),
    }),
    getDefaults: (row) => ({
      firstName: textValue(row, 'firstName'),
      lastName: textValue(row, 'lastName'),
      email: textValue(row, 'email'),
      password: '',
      phone: textValue(row, 'phone'),
      role: textValue(row, 'role') || 'STAFF',
      isActive: row?.isActive === false ? 'false' : 'true',
    }),
  },
};

const relationKeys: EntityKey[] = ['properties', 'tenants', 'leases', 'users'];

const EntityForm = ({
  config,
  mode,
  record,
  options,
  onSubmit,
  onCancel,
  isSaving,
}: {
  config: EntityConfig;
  mode: 'create' | 'edit';
  record?: EntityRow;
  options: Partial<Record<EntityKey | 'users', EntityRow[]>>;
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
  isSaving: boolean;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Record<string, string>>({
    defaultValues: config.getDefaults(record),
  });

  return (
    <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        {config.fields.map((field) => {
          const validation = {
            required:
              field.required && !(field.name === 'password' && mode === 'edit')
                ? `${field.label} is required`
                : false,
          };
          const error = errors[field.name]?.message as string | undefined;

          if (field.type === 'textarea') {
            return (
              <label key={field.name} className="grid gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
                {field.label}
                <textarea
                  className="min-h-28 rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  {...register(field.name, validation)}
                />
                {error ? <span className="text-xs text-red-600">{error}</span> : null}
              </label>
            );
          }

          if (field.type === 'select') {
            const fieldOptions =
              field.options ??
              (field.optionSource
                ? (options[field.optionSource] ?? []).map((row) => ({
                  label: field.getOptionLabel?.(row) ?? String(row.id),
                  value: row.id,
                }))
                : []);

            return (
              <label key={field.name} className="grid gap-2 text-sm font-semibold text-slate-700">
                {field.label}
                <select
                  className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  {...register(field.name, validation)}
                >
                  <option value="">Select {field.label.toLowerCase()}</option>
                  {fieldOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {error ? <span className="text-xs text-red-600">{error}</span> : null}
              </label>
            );
          }

          return (
            <TextInput
              key={field.name}
              label={field.label}
              type={field.type ?? 'text'}
              error={error}
              {...register(field.name, validation)}
            />
          );
        })}
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save record'}</Button>
      </div>
    </form>
  );
};

const AvatarUploadPanel = ({
  record,
  isSaving,
  onUpload,
  onRemove,
  onCancel,
}: {
  record: EntityRow;
  isSaving: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onCancel: () => void;
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(avatarFor(record));
  const [error, setError] = useState('');

  const chooseFile = (selected?: File) => {
    setError('');
    if (!selected) {
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('Use a JPG, PNG, or WEBP image.');
      return;
    }

    if (selected.size > 2 * 1024 * 1024) {
      setError('Profile image must be 2 MB or smaller.');
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  return (
    <div className="grid gap-5">
      <div className="flex items-center gap-4">
        <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-md bg-emerald-50 text-lg font-black text-emerald-800">
          {preview ? <img src={preview} alt="Profile preview" className="h-full w-full object-cover" /> : nameOf(record).slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-black text-slate-950">{nameOf(record)}</p>
          <p className="text-sm text-slate-500">{String(record.email ?? '')}</p>
        </div>
      </div>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Upload image
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="rounded-md border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950"
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />
      </label>
      {error ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="secondary" disabled={isSaving || !record.avatarUrl} onClick={onRemove}>Remove image</Button>
        <Button disabled={isSaving || !file} onClick={() => file && onUpload(file)}>
          {isSaving ? 'Saving...' : 'Save image'}
        </Button>
      </div>
    </div>
  );
};

export const EntityPage = ({ entity }: { entity: EntityKey }) => {
  const queryClient = useQueryClient();
  const config = entityConfigs[entity];
  const [modal, setModal] = useState<
    | { type: 'create' }
    | { type: 'edit'; record: EntityRow }
    | { type: 'view'; record: EntityRow }
    | { type: 'delete'; record: EntityRow }
    | { type: 'avatar'; record: EntityRow }
    | null
  >(null);
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const updateCurrentUser = useAuthStore((state) => state.updateUser);
  const currentUser = useAuthStore((state) => state.user);
  const [searchDraft, setSearchDraft] = useState('');
  const [params, setParams] = useState<ListParams>({
    page: 1,
    limit: 10,
    sortBy: config.defaultSort,
    sortOrder: 'desc',
  });

  useEffect(() => {
    setSearchDraft('');
    setParams({
      page: 1,
      limit: 10,
      sortBy: config.defaultSort,
      sortOrder: 'desc',
    });
    setModal(null);
  }, [entity, config.defaultSort]);
  const primaryFilterValue = entity === 'users' ? String(params.role ?? '') : String(params.status ?? '');
  const activeFilterParam = config.activeFilterParam;
  const activeFilterValue = activeFilterParam ? String(params[activeFilterParam] ?? '') : '';
  const tenantPropertyValue = String(params.propertyId ?? '');
  const tenantLeaseStatusValue = String(params.leaseStatus ?? '');
  const sortOptions = config.sortOptions ?? defaultSortOptions;

  const setPrimaryFilter = (value: string) => {
    setParams((current) => {
      const { status: _status, role: _role, ...rest } = current;
      return entity === 'users'
        ? { ...rest, page: 1, role: value || undefined }
        : { ...rest, page: 1, status: value || undefined };
    });
  };

  const setActiveFilter = (value: string) => {
    if (!activeFilterParam) {
      return;
    }

    setParams((current) => ({ ...current, page: 1, [activeFilterParam]: value || undefined }));
  };

  const setTenantPropertyFilter = (value: string) => {
    setParams((current) => ({ ...current, page: 1, propertyId: value || undefined }));
  };

  const setTenantLeaseStatusFilter = (value: string) => {
    setParams((current) => ({ ...current, page: 1, leaseStatus: value || undefined }));
  };

  const listQuery = useQuery({
    queryKey: [entity, params],
    queryFn: () => crmService.list<EntityRow>(entity, params),
    retry: (failureCount, error) => {
      const message = getApiErrorMessage(error);
      return failureCount < 2 && !message.includes('role is not') && !message.includes('session expired');
    },
  });

  const optionQueries = useQueries({
    queries: relationKeys.map((key) => ({
      queryKey: ['options', key],
      queryFn: () => crmService.list<EntityRow>(key, { page: 1, limit: 100, sortBy: 'createdAt', sortOrder: 'desc' }),
      staleTime: 1000 * 60 * 5,
    })),
  });

  const options = useMemo(() => {
    return relationKeys.reduce<Partial<Record<EntityKey | 'users', EntityRow[]>>>((acc, key, index) => {
      acc[key] = optionQueries[index].data?.data ?? [];
      return acc;
    }, {});
  }, [optionQueries]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: [entity] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    if (relationKeys.includes(entity)) {
      await queryClient.invalidateQueries({ queryKey: ['options', entity] });
    }
  };

  const createRecord = useMutation({
    mutationFn: (values: Record<string, string>) =>
      crmService.create<Record<string, unknown>, EntityRow>(entity, config.mapPayload(values, 'create')),
    onSuccess: async () => {
      setModal(null);
      setToast({ tone: 'success', message: `${config.title} record created.` });
      await invalidate();
    },
    onError: (error) => setToast({ tone: 'error', message: getApiErrorMessage(error) }),
  });

  const updateRecord = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Record<string, string> }) =>
      crmService.update<Record<string, unknown>, EntityRow>(entity, id, config.mapPayload(values, 'edit')),
    onSuccess: async () => {
      setModal(null);
      setToast({ tone: 'success', message: `${config.title} record updated.` });
      await invalidate();
    },
    onError: (error) => setToast({ tone: 'error', message: getApiErrorMessage(error) }),
  });

  const deleteRecord = useMutation({
    mutationFn: (id: string) => crmService.remove<EntityRow>(entity, id),
    onSuccess: async () => {
      setModal(null);
      setToast({
        tone: 'success',
        message: entity === 'users' ? 'User deactivated.' : `${config.title} record deleted safely.`,
      });
      await invalidate();
    },
    onError: (error) => setToast({ tone: 'error', message: getApiErrorMessage(error) }),
  });

  const uploadAvatar = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => userService.uploadAvatar(id, file),
    onSuccess: async (user) => {
      setModal(null);
      setToast({ tone: 'success', message: 'Profile photo updated.' });
      if (currentUser?.id === user.id) {
        updateCurrentUser(user);
      }
      await invalidate();
    },
    onError: (error) => setToast({ tone: 'error', message: getApiErrorMessage(error) }),
  });

  const removeAvatar = useMutation({
    mutationFn: (id: string) => userService.removeAvatar(id),
    onSuccess: async (user) => {
      setModal(null);
      setToast({ tone: 'success', message: 'Profile photo removed.' });
      if (currentUser?.id === user.id) {
        updateCurrentUser(user);
      }
      await invalidate();
    },
    onError: (error) => setToast({ tone: 'error', message: getApiErrorMessage(error) }),
  });

  const data = listQuery.data as Paginated<EntityRow> | undefined;
  const rows = data?.data ?? [];
  const meta = data?.meta;
  const canPrevious = Number(meta?.page ?? 1) > 1;
  const canNext = Number(meta?.page ?? 1) < Number(meta?.totalPages ?? 1);

  const columns: Column<EntityRow>[] = [
    ...config.columns,
    {
      header: 'Actions',
      className: 'w-44',
      cell: (row) => (
        <div className="flex gap-2">
          <button type="button" aria-label="View" onClick={() => setModal({ type: 'view', record: row })} className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 hover:bg-slate-50">
            <Eye size={16} />
          </button>
          <button type="button" aria-label="Edit" onClick={() => setModal({ type: 'edit', record: row })} className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 hover:bg-slate-50">
            <Pencil size={16} />
          </button>
          {entity === 'users' ? (
            <button type="button" aria-label="Profile photo" onClick={() => setModal({ type: 'avatar', record: row })} className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 hover:bg-slate-50">
              <Image size={16} />
            </button>
          ) : null}
          <button type="button" aria-label="Delete" onClick={() => setModal({ type: 'delete', record: row })} className="grid h-9 w-9 place-items-center rounded-md border border-red-200 text-red-600 hover:bg-red-50">
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const applySearch = () => {
    setParams((current) => ({ ...current, page: 1, search: searchDraft || undefined }));
  };

  return (
    <div className="grid gap-6 p-5 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">{config.eyebrow}</p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">{config.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">{config.description}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon={<SlidersHorizontal size={18} />} onClick={applySearch}>Apply filters</Button>
          <Button onClick={() => setModal({ type: 'create' })} icon={<Plus size={18} />}>{config.createLabel}</Button>
        </div>
      </div>

      {toast ? (
        <div className={toast.tone === 'success' ? 'rounded-md bg-emerald-50 p-4 text-sm font-bold text-emerald-700' : 'rounded-md bg-red-50 p-4 text-sm font-bold text-red-700'}>
          {toast.message}
        </div>
      ) : null}

      <div className={`grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${config.activeFilter
        ? entity === 'tenants'
          ? 'lg:grid-cols-[1fr_150px_150px_180px_160px_150px]'
          : 'lg:grid-cols-[1fr_180px_150px_160px_150px]'
        : 'lg:grid-cols-[1fr_220px_180px_180px]'
        }`}>
        <label className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            className="h-11 w-full rounded-md border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
            placeholder={`Search ${config.title.toLowerCase()}...`}
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                applySearch();
              }
            }}
          />
        </label>
        <select
          className="h-11 rounded-md border border-slate-200 bg-white px-3 pr-7 text-sm font-semibold outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_10px_center]"
          value={primaryFilterValue}
          onChange={(event) => setPrimaryFilter(event.target.value)}
        >
          <option value="">{entity === 'users' ? 'All roles' : 'All statuses'}</option>
          {config.statusFilter?.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        {config.activeFilter ? (
          <select
            className="h-11 rounded-md border border-slate-200 bg-white px-3 pr-7 text-sm font-semibold outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_10px_center]"
            value={activeFilterValue}
            onChange={(event) => setActiveFilter(event.target.value)}
          >
            <option value="">{entity === 'users' ? 'All account states' : 'All tenant states'}</option>
            {config.activeFilter?.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : null}
        {entity === 'tenants' ? (
          <>
            <select
              className="h-11 rounded-md border border-slate-200 bg-white px-3 pr-7 text-sm font-semibold outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_10px_center]"
              value={tenantPropertyValue}
              onChange={(event) => setTenantPropertyFilter(event.target.value)}
            >
              <option value="">All properties</option>
              {(options.properties ?? []).map((property) => (
                <option key={property.id} value={property.id}>{String(property.title)}</option>
              ))}
            </select>
            <select
              className="h-11 rounded-md border border-slate-200 bg-white px-3 pr-7 text-sm font-semibold outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_10px_center]"
              value={tenantLeaseStatusValue}
              onChange={(event) => setTenantLeaseStatusFilter(event.target.value)}
            >
              <option value="">All lease states</option>
              {toOptions(enumOptions.leaseStatus).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </>
        ) : null}
        <select
          className="h-11 rounded-md border border-slate-200 bg-white px-3 pr-7 text-sm font-semibold outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_10px_center]"
          value={String(params.sortBy)}
          onChange={(event) => setParams((current) => ({ ...current, sortBy: event.target.value || config.defaultSort }))}
        >
          {sortOptions.map((option) => (
            <option key={option.label} value={option.value || config.defaultSort}>{option.label}</option>
          ))}
        </select>
        <select
          className="h-11 rounded-md border border-slate-200 bg-white px-3 pr-7 text-sm font-semibold outline-none appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%236b7280%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_10px_center]"
          value={String(params.sortOrder)}
          onChange={(event) => setParams((current) => ({ ...current, sortOrder: event.target.value as 'asc' | 'desc' }))}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>
      </div>

      {listQuery.isError ? (
        <div className="grid gap-4 rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
          <p>{getApiErrorMessage(listQuery.error)}</p>
          <div>
            <Button variant="secondary" onClick={() => void listQuery.refetch()}>
              Retry
            </Button>
          </div>
        </div>
      ) : listQuery.isLoading ? (
        <Skeleton className="h-80" />
      ) : (
        <DataTable rows={rows} columns={columns} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">
          Showing page {meta?.page ?? 1} of {meta?.totalPages ?? 1} ({meta?.total ?? 0} records)
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={!canPrevious}
            onClick={() => setParams((current) => ({ ...current, page: Number(current.page ?? 1) - 1 }))}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={!canNext}
            onClick={() => setParams((current) => ({ ...current, page: Number(current.page ?? 1) + 1 }))}
          >
            Next
          </Button>
        </div>
      </div>

      <Modal
        title={modal?.type === 'edit' ? `Edit ${config.title}` : config.createLabel}
        open={modal?.type === 'create' || modal?.type === 'edit'}
        onClose={() => setModal(null)}
      >
        {modal?.type === 'create' || modal?.type === 'edit' ? (
          <EntityForm
            key={modal.type === 'edit' ? modal.record.id : 'create'}
            config={config}
            mode={modal.type}
            record={modal.type === 'edit' ? modal.record : undefined}
            options={options}
            onSubmit={(values) =>
              modal.type === 'edit'
                ? updateRecord.mutate({ id: modal.record.id, values })
                : createRecord.mutate(values)
            }
            onCancel={() => setModal(null)}
            isSaving={createRecord.isPending || updateRecord.isPending}
          />
        ) : null}
      </Modal>

      <Modal
        title={`${config.title} details`}
        open={modal?.type === 'view'}
        onClose={() => setModal(null)}
      >
        {modal?.type === 'view' ? (
          entity === 'payments' ? (
            <div className="grid gap-6">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100 shadow-sm">
                <div className="flex flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                      Payment Reference
                    </p>

                    <h2
                      className="mt-2 truncate text-2xl font-black text-slate-950 md:text-3xl"
                      title={String(modal.record.reference ?? '-')}
                    >
                      {String(modal.record.reference ?? '-')}
                    </h2>

                    <p className="mt-3 text-sm text-slate-500">
                      Enterprise payment transaction overview
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center">
                    <Badge tone={statusTone(String(modal.record.status ?? 'PENDING'))}>
                      {String(modal.record.status ?? 'PENDING')}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-200 bg-white/70 p-4 xl:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Amount
                    </p>

                    <p className="mt-2 whitespace-nowrap text-2xl font-black text-emerald-700">
                      {formatCurrency(Number(modal.record.amount ?? 0))}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Due Date
                    </p>

                    <p className="mt-2 text-base font-bold text-slate-950">
                      {modal.record.dueDate
                        ? formatDate(String(modal.record.dueDate))
                        : '-'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Payment Method
                    </p>

                    <p className="mt-2 text-base font-bold text-slate-950">
                      {modal.record.method
                        ? String(modal.record.method).replaceAll('_', ' ')
                        : 'Not Provided'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Paid Date
                    </p>

                    <p className="mt-2 text-base font-bold text-slate-950">
                      {modal.record.paidAt
                        ? formatDate(String(modal.record.paidAt))
                        : 'Pending'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {Object.entries(modal.record).map(([key, value]) => {
                const isObject =
                  typeof value === 'object' &&
                  value !== null &&
                  !Array.isArray(value);

                const isArray = Array.isArray(value);

                return (
                  <div
                    key={key}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                      {key}
                    </p>

                    {!isObject && !isArray && (
                      <p className="mt-2 break-words text-sm font-semibold text-slate-900">
                        {String(value ?? '-')}
                      </p>
                    )}

                    {isObject && (
                      <div className="mt-3 grid gap-3">
                        {Object.entries(value as Record<string, unknown>).map(
                          ([nestedKey, nestedValue]) => (
                            <div
                              key={nestedKey}
                              className="rounded-lg bg-slate-50 p-3"
                            >
                              <p className="text-[11px] font-bold uppercase text-slate-400">
                                {nestedKey}
                              </p>

                              <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                                {String(nestedValue ?? '-')}
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                    )}

                    {isArray && (
                      <div className="mt-3 grid gap-3">
                        {(value as unknown[]).map((item, index) => (
                          <div
                            key={index}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                          >
                            {typeof item === 'object' && item !== null ? (
                              <div className="grid gap-2">
                                {Object.entries(item as Record<string, unknown>).map(
                                  ([arrayKey, arrayValue]) => (
                                    <div key={arrayKey}>
                                      <p className="text-[11px] font-bold uppercase text-slate-400">
                                        {arrayKey}
                                      </p>

                                      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                                        {String(arrayValue ?? '-')}
                                      </p>
                                    </div>
                                  ),
                                )}
                              </div>
                            ) : (
                              <p className="text-sm font-semibold text-slate-900">
                                {String(item)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : null}
      </Modal>

      <Modal title="Profile photo" open={modal?.type === 'avatar'} onClose={() => setModal(null)}>
        {modal?.type === 'avatar' ? (
          <AvatarUploadPanel
            record={modal.record}
            isSaving={uploadAvatar.isPending || removeAvatar.isPending}
            onUpload={(file) => uploadAvatar.mutate({ id: modal.record.id, file })}
            onRemove={() => removeAvatar.mutate(modal.record.id)}
            onCancel={() => setModal(null)}
          />
        ) : null}
      </Modal>

      <Modal title={entity === 'users' ? 'Deactivate user' : `Delete ${config.title} record`} open={modal?.type === 'delete'} onClose={() => setModal(null)}>
        {modal?.type === 'delete' ? (
          <div className="grid gap-5">
            <p className="text-sm text-slate-600">
              {entity === 'users'
                ? 'This will deactivate the selected user and prevent future logins. Existing historical data is preserved.'
                : 'This will safely delete the selected record using the backend API. Related historical data is preserved by the database rules.'}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button variant="danger" disabled={deleteRecord.isPending} onClick={() => deleteRecord.mutate(modal.record.id)}>
                {deleteRecord.isPending
                  ? entity === 'users' ? 'Deactivating...' : 'Deleting...'
                  : entity === 'users' ? 'Deactivate user' : 'Delete record'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};
