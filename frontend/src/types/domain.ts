export type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'STAFF'
  | 'AGENT'
  | 'ACCOUNTANT'
  | 'MAINTENANCE'
  | 'VIEWER';

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
};

export type AuthSession = {
  user: User;
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  timestamp: string;
};

export type Paginated<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type PropertyRecord = {
  id: string;
  reference: string;
  title: string;
  type: string;
  status: string;
  addressLine1: string;
  city: string;
  postcode: string;
  bedrooms: number;
  bathrooms: number;
  rentAmount: number;
  depositAmount: number;
  askingPrice?: number;
  ownerName?: string;
  manager?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
};

export type TenantRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: string;
  currentProperty?: PropertyRecord;
};

export type LeaseRecord = {
  id: string;
  property: PropertyRecord;
  tenant: TenantRecord;
  startDate: string;
  endDate: string;
  rentAmount: number;
  status: string;
};

export type PaymentRecord = {
  id: string;
  reference: string;
  property: PropertyRecord;
  tenant: TenantRecord;
  amount: number;
  dueDate: string;
  paidAt?: string;
  status: string;
  method?: string;
};

export type MaintenanceRecord = {
  id: string;
  title: string;
  description: string;
  property: PropertyRecord;
  tenant?: TenantRecord;
  assignee?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'role'>;
  priority: string;
  status: string;
  dueDate?: string;
};

export type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  type: string;
  readAt?: string;
  createdAt: string;
  link?: string;
};

export type DashboardSummary = {
  kpis: {
    properties: number;
    occupiedProperties: number;
    occupancyRate: number;
    activeLeases: number;
    expiringLeases: number;
    overduePayments: number;
    monthlyRevenue: number;
    openTickets: number;
  };
  analytics: {
    revenueTrend: Array<{ label: string; value: number }>;
    maintenanceByStatus: Array<{ label: string; value: number }>;
  };
  recentActivity: Array<{
    id: string;
    title: string;
    message: string;
    type: string;
    createdAt: string;
  }>;
};

export type ContactRole =
  | 'Purchaser'
  | 'Vendor'
  | 'Tenant'
  | 'Landlord'
  | 'Company / Vendor'
  | 'High Urgency';

export type ContactRecord = {
  id: string;
  initials: string;
  name: string;
  role: ContactRole;
  secondaryRoles: ContactRole[];
  address: string;
  email: string;
  phone: string;
  lastActivity: string;
  lastActivityNote: string;
  pendingAction: string;
  pendingTone: 'danger' | 'warning' | 'success' | 'neutral';
};

export type EntityKey =
  | 'properties'
  | 'tenants'
  | 'leases'
  | 'payments'
  | 'maintenance'
  | 'notifications'
  | 'users';
