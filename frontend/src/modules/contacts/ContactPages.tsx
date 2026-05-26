import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardPlus,
  Download,
  Edit3,
  ExternalLink,
  Filter,
  Home,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Search,
  Send,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { contacts as demoContacts } from '../../constants/demoData';
import type {
  ContactInsight,
  ContactRecord,
  ContactRole,
  ContactRoleCode,
  ContactTimelineEntry,
  Paginated,
  SellIntentRecord,
  ValuationAppointment,
} from '../../types/domain';
import { Badge, Button, Card, useViewportOverlayLock } from '../../components/ui/Primitives';
import { cn } from '../../utils/cn';
import { getApiErrorMessage, resolveAssetUrl } from '../../services/api';
import { crmService } from '../../services/crm';

const roleTone = (role: ContactRole) => {
  if (role === 'Vendor' || role === 'Landlord' || role === 'High Urgency') return 'green';
  if (role === 'Purchaser') return 'amber';
  if (role === 'Tenant') return 'purple';
  return 'blue';
};

const pendingClass = {
  danger: 'text-red-700',
  warning: 'text-amber-700',
  success: 'text-emerald-700',
  neutral: 'text-slate-500',
};

const roleLabels: Record<ContactRoleCode, ContactRole> = {
  PURCHASER: 'Purchaser',
  VENDOR: 'Vendor',
  TENANT: 'Tenant',
  LANDLORD: 'Landlord',
  COMPANY_VENDOR: 'Company / Vendor',
  HIGH_URGENCY: 'High Urgency',
};

const roleCodes = Object.entries(roleLabels).map(([value, label]) => ({ value: value as ContactRoleCode, label }));

const toRoleLabel = (role: ContactRoleCode | ContactRole): ContactRole =>
  roleLabels[role as ContactRoleCode] ?? (role as ContactRole);

const toRoleCode = (role: ContactRoleCode | ContactRole): ContactRoleCode => {
  const found = roleCodes.find((item) => item.label === role || item.value === role);
  return found?.value ?? 'PURCHASER';
};

type RawContact = Partial<ContactRecord> & {
  firstName?: string;
  lastName?: string;
  role?: ContactRole | ContactRoleCode;
  secondaryRoles?: Array<ContactRole | ContactRoleCode>;
  mobile?: string;
  lastActivityAt?: string;
  pendingTone?: string;
};

const initialsFor = (firstName?: string, lastName?: string, name?: string) => {
  const parts = name ? name.split(/\s+/) : [firstName, lastName];
  return parts.filter(Boolean).slice(0, 2).map((part) => part?.[0]?.toUpperCase()).join('') || 'CI';
};

const formatDate = (value?: string) => {
  if (!value) return 'Today';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });
};

const normalizeContact = (contact: RawContact): ContactRecord => {
  const firstName = contact.firstName ?? contact.name?.split(' ')[0] ?? '';
  const lastName = contact.lastName ?? contact.name?.split(' ').slice(1).join(' ') ?? '';
  const name = contact.name ?? `${firstName} ${lastName}`.trim();
  const role = toRoleLabel(contact.role ?? 'PURCHASER');
  const secondaryRoles = (contact.secondaryRoles ?? []).map(toRoleLabel);

  return {
    id: contact.id ?? contact.slug ?? name.toLowerCase().replace(/\s+/g, '-'),
    slug: contact.slug,
    initials: contact.initials ?? initialsFor(firstName, lastName, name),
    name,
    role,
    roleCode: toRoleCode(role),
    secondaryRoles,
    secondaryRoleCodes: secondaryRoles.map(toRoleCode),
    address: contact.address ?? [contact.city, contact.postcode].filter(Boolean).join(', '),
    city: contact.city,
    postcode: contact.postcode,
    country: contact.country ?? 'United Kingdom',
    email: contact.email ?? '',
    phone: contact.phone ?? contact.mobile ?? '',
    mobile: contact.mobile ?? contact.phone,
    company: contact.company,
    notes: contact.notes,
    tags: contact.tags ?? [],
    avatarUrl: contact.avatarUrl,
    assignedAgent: contact.assignedAgent,
    lastActivity: contact.lastActivity ?? formatDate(contact.lastActivityAt),
    lastActivityNote: contact.lastActivityNote ?? 'Contact intelligence updated',
    pendingAction: contact.pendingAction ?? 'None Pending',
    pendingTone: ((contact.pendingTone ?? 'neutral').toLowerCase() as ContactRecord['pendingTone']),
    sellIntents: contact.sellIntents ?? [],
    aiInsights: contact.aiInsights ?? [],
    timeline: contact.timeline ?? [],
    documents: contact.documents ?? [],
    valuationAppointments: contact.valuationAppointments ?? [],
  };
};

const demoDirectory = demoContacts.map((contact) => normalizeContact(contact as RawContact));

const useContacts = (params: { search?: string; role?: ContactRoleCode; page?: number }) => {
  const [contacts, setContacts] = useState<ContactRecord[]>(demoDirectory);
  const [meta, setMeta] = useState({ total: demoDirectory.length, page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    crmService
      .list<RawContact>('contacts', { page: params.page ?? 1, limit: 10, search: params.search, role: params.role })
      .then((result: Paginated<RawContact>) => {
        if (!mounted) return;
        setContacts(result.data.map(normalizeContact));
        setMeta(result.meta);
        setError('');
      })
      .catch((apiError) => {
        if (!mounted) return;
        const filtered = demoDirectory.filter((contact) => {
          const matchesSearch = params.search
            ? `${contact.name} ${contact.email} ${contact.address}`.toLowerCase().includes(params.search.toLowerCase())
            : true;
          const matchesRole = params.role ? contact.roleCode === params.role : true;
          return matchesSearch && matchesRole;
        });
        setContacts(filtered);
        setMeta({ total: filtered.length, page: 1, limit: 10, totalPages: 1 });
        setError(getApiErrorMessage(apiError));
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [params.page, params.role, params.search]);

  return { contacts, meta, loading, error };
};

const ContactAvatar = ({ contact, large = false }: { contact: ContactRecord; large?: boolean }) => {
  const avatarUrl = resolveAssetUrl(contact.avatarUrl);
  return (
    <div
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-lg bg-blue-100 font-black text-slate-950',
        large ? 'h-20 w-20 text-2xl shadow-md ring-4 ring-white' : 'h-14 w-14 text-lg',
        contact.role === 'Tenant' && 'bg-emerald-200',
        contact.role === 'Company / Vendor' && 'bg-violet-600 text-white',
      )}
    >
      {avatarUrl ? <img src={avatarUrl} alt={contact.name} className="h-full w-full object-cover" /> : contact.initials}
    </div>
  );
};

const emptyInsights: ContactInsight[] = [
  { id: 'follow-up', title: 'Follow-up risk', body: 'No follow-up in 4 days. Recommend contacting vendor to maintain valuation momentum.', icon: 'alarm', tone: 'green' },
  { id: 'comps', title: 'Comparable demand', body: 'Comparable band suggests strongest demand between £3.95M and £4.10M this week.', icon: 'trend', tone: 'green' },
  { id: 'engagement', title: 'Engagement channel', body: 'Engagement is high. Vendor replies faster to SMS than email for scheduling updates.', icon: 'message', tone: 'green' },
];

const InsightsPanel = ({ insights = emptyInsights, compact = false }: { insights?: ContactInsight[]; compact?: boolean }) => (
  <Card className={cn('bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300', compact && 'p-5')}>
    <div className="mb-5 flex items-center gap-3">
      <Zap className="text-emerald-300" size={22} />
      <h2 className="text-xl font-black">AI Co-Pilot Insights</h2>
    </div>
    <div className="grid gap-4">
      {(insights.length ? insights : emptyInsights).map((item) => (
        <div key={item.id} className="rounded-md border border-white/10 bg-white/8 p-4 text-sm font-semibold leading-6 text-slate-100">
          {item.body}
        </div>
      ))}
    </div>
  </Card>
);

type ContactFormState = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  role: ContactRoleCode;
  company: string;
  address: string;
  city: string;
  postcode: string;
  country: string;
  notes: string;
  assignedAgentId: string;
  tags: string;
};

const blankForm: ContactFormState = {
  firstName: '',
  lastName: '',
  email: '',
  mobile: '',
  role: 'PURCHASER',
  company: '',
  address: '',
  city: '',
  postcode: '',
  country: 'United Kingdom',
  notes: '',
  assignedAgentId: '',
  tags: '',
};

export const AddContactModal = ({
  contact,
  onClose,
  onSaved,
  onSuccess,
}: {
  contact?: ContactRecord | null;
  onClose: () => void;
  onSaved?: (contact: ContactRecord) => void;
  onSuccess?: (message: string) => void;
}) => {
  useViewportOverlayLock(true, onClose);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState<ContactFormState>(() => contact
    ? {
        firstName: contact.name.split(' ')[0] ?? '',
        lastName: contact.name.split(' ').slice(1).join(' '),
        email: contact.email,
        mobile: contact.mobile ?? contact.phone,
        role: contact.roleCode ?? toRoleCode(contact.role),
        company: contact.company ?? '',
        address: contact.address,
        city: contact.city ?? '',
        postcode: contact.postcode ?? '',
        country: contact.country ?? 'United Kingdom',
        notes: contact.notes ?? '',
        assignedAgentId: contact.assignedAgent?.id ?? '',
        tags: contact.tags?.join(', ') ?? '',
      }
    : blankForm);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState(resolveAssetUrl(contact?.avatarUrl));
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ContactFormState, string>>>({});

  const setValue = (field: keyof ContactFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError('');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Use a JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Profile image must be 2 MB or smaller.');
      return;
    }
    setAvatarFile(file);
    setRemoveAvatar(false);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof ContactFormState, string>> = {};
    if (!form.firstName.trim()) nextErrors.firstName = 'First name is required.';
    if (!form.lastName.trim()) nextErrors.lastName = 'Last name is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (form.assignedAgentId.trim() && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(form.assignedAgentId.trim())) {
      nextErrors.assignedAgentId = 'Use a valid agent UUID or leave this blank.';
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setError('Fix the highlighted fields before saving.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        mobile: form.mobile.trim() || undefined,
        role: form.role,
        company: form.company.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        postcode: form.postcode.trim() || undefined,
        country: form.country.trim() || 'United Kingdom',
        notes: form.notes.trim() || undefined,
        tags: form.tags.split(',').map((item) => item.trim()).filter(Boolean),
        assignedAgentId: form.assignedAgentId.trim() || undefined,
        pendingAction: contact?.pendingAction ?? 'None Pending',
        pendingTone: (contact?.pendingTone?.toUpperCase() ?? 'NEUTRAL') as string,
      };
      const saved = contact
        ? await crmService.update<typeof payload, RawContact>('contacts', contact.slug ?? contact.id, payload)
        : await crmService.create<typeof payload, RawContact>('contacts', payload);
      let updated = normalizeContact(saved);
      if (avatarFile) {
        updated = normalizeContact(await crmService.uploadContactAvatar(updated.slug ?? updated.id, avatarFile) as RawContact);
      } else if (removeAvatar && contact) {
        updated = normalizeContact(await crmService.removeContactAvatar(contact.slug ?? contact.id) as RawContact);
      }
      onSaved?.(updated);
      onSuccess?.(`${updated.name} was saved successfully.`);
      onClose();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 grid min-h-dvh place-items-center overflow-y-auto overflow-x-hidden bg-slate-950/40 p-4 backdrop-blur-sm"
    >
      <motion.form
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={save}
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Contact Intelligence</p>
            <h2 id="contact-modal-title" className="text-2xl font-black">{contact ? 'Edit Contact' : 'Add Contact'}</h2>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-md hover:bg-slate-100">
            <X size={20} />
          </button>
        </header>
        <div className="grid min-h-0 gap-6 overflow-y-auto overflow-x-hidden p-5 sm:p-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <section>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatar} />
            <div className="grid place-items-center rounded-lg border border-slate-200 bg-slate-50 p-5 text-center">
              <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-lg bg-blue-100 text-3xl font-black">
                {avatarPreview && !removeAvatar ? <img src={avatarPreview} alt="Preview" className="h-full w-full object-cover" /> : initialsFor(form.firstName, form.lastName)}
              </div>
              <Button type="button" variant="secondary" className="mt-4 w-full" icon={<Upload size={16} />} onClick={() => fileInputRef.current?.click()}>
                Upload
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="mt-2 w-full text-red-600"
                icon={<Trash2 size={16} />}
                onClick={() => {
                  setAvatarFile(null);
                  setAvatarPreview('');
                  setRemoveAvatar(true);
                }}
              >
                Remove
              </Button>
            </div>
          </section>
          <section className="grid min-w-0 gap-4 md:grid-cols-2">
            {[
              ['firstName', 'First name'],
              ['lastName', 'Last name'],
              ['email', 'Email'],
              ['mobile', 'Mobile'],
              ['company', 'Company'],
              ['city', 'City'],
              ['postcode', 'Postcode'],
              ['country', 'Country'],
              ['assignedAgentId', 'Assigned agent ID'],
              ['tags', 'Tags'],
            ].map(([field, label]) => (
              <label key={field} className="grid gap-2 text-sm font-bold text-slate-700">
                {label}
                <input
                  required={['firstName', 'lastName', 'email'].includes(field)}
                  type={field === 'email' ? 'email' : 'text'}
                  value={form[field as keyof ContactFormState]}
                  onChange={(event) => setValue(field as keyof ContactFormState, event.target.value)}
                  aria-invalid={Boolean(fieldErrors[field as keyof ContactFormState])}
                  className={cn(
                    'h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-emerald-400',
                    fieldErrors[field as keyof ContactFormState] && 'border-red-300 bg-red-50',
                  )}
                />
                {fieldErrors[field as keyof ContactFormState] ? (
                  <span className="text-xs font-semibold text-red-600">{fieldErrors[field as keyof ContactFormState]}</span>
                ) : null}
              </label>
            ))}
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Role
              <select value={form.role} onChange={(event) => setValue('role', event.target.value)} className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-emerald-400">
                {roleCodes.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">
              Address
              <input value={form.address} onChange={(event) => setValue('address', event.target.value)} className="h-11 rounded-md border border-slate-200 px-3 outline-none focus:border-emerald-400" />
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">
              Notes
              <textarea value={form.notes} onChange={(event) => setValue('notes', event.target.value)} className="min-h-28 rounded-md border border-slate-200 p-3 outline-none focus:border-emerald-400" />
            </label>
          </section>
        </div>
        {error ? <p className="mx-5 mb-4 shrink-0 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700 sm:mx-6">{error}</p> : null}
        <footer className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-200 bg-white p-5">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving} icon={<Check size={18} />}>{saving ? 'Saving...' : 'Save Contact'}</Button>
        </footer>
      </motion.form>
    </div>
  );
};

const ContactHeader = ({ contact, compact = false }: { contact: ContactRecord; compact?: boolean }) => (
  <Card className={cn('p-5 md:p-8', compact && 'rounded-none border-x-0 border-t-0 shadow-none')}>
    <div className="flex min-w-0 flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 flex-col gap-5 sm:flex-row">
        <ContactAvatar contact={contact} large />
        <div className="min-w-0">
          <h1 className="break-words text-3xl font-black text-slate-950">{contact.name}</h1>
          <p className="mt-1 text-sm font-black uppercase text-slate-950">{contact.role}</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-600">
            <span className="inline-flex min-w-0 items-center gap-2"><Phone size={15} className="shrink-0" /> <span className="break-all">{contact.phone || 'No mobile'}</span></span>
            <span className="inline-flex min-w-0 items-center gap-2"><Mail size={15} className="shrink-0" /> <span className="break-all">{contact.email}</span></span>
            <span className="inline-flex items-center gap-2"><UserRound size={15} /> Assigned: {contact.assignedAgent ? `${contact.assignedAgent.firstName} ${contact.assignedAgent.lastName}` : 'Alexander Thorne'}</span>
            <span className="inline-flex items-center gap-2"><MapPin size={15} /> {contact.address}</span>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Associated contacts:</span>
            <Badge tone="green">Victoria Sterling <span className="rounded bg-emerald-100 px-1">Co-owner</span></Badge>
            <Badge tone="blue">Preston Conveyancing <span className="rounded bg-blue-100 px-1">Solicitor</span></Badge>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button variant="secondary" icon={<Send size={17} />}>Email</Button>
        <Button variant="secondary" icon={<MessageSquare size={17} />}>SMS</Button>
        <Button icon={<CalendarCheck size={17} />}>Task</Button>
        <Button variant="secondary" icon={<ClipboardPlus size={17} />}>Add Notes</Button>
      </div>
    </div>
  </Card>
);

const ContactDrawer = ({ contact, onClose, onEdit }: { contact: ContactRecord; onClose: () => void; onEdit: () => void }) => {
  useViewportOverlayLock(true, onClose);

  return (
  <div
    role="presentation"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    }}
    className="fixed inset-0 z-50 overflow-hidden bg-slate-950/35 backdrop-blur-sm"
  >
    <motion.aside
      role="dialog"
      aria-modal="true"
      aria-label={`${contact.name} contact details`}
      initial={{ x: 520 }}
      animate={{ x: 0 }}
      className="absolute right-0 top-0 h-dvh max-h-dvh w-full max-w-[min(36rem,100vw)] overflow-y-auto overflow-x-hidden bg-white p-5 shadow-2xl sm:p-6"
    >
      <header className="flex min-w-0 items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <ContactAvatar contact={contact} large />
          <div className="min-w-0">
            <h2 className="break-words text-2xl font-black text-slate-950">{contact.name}</h2>
            <p className="mt-1 text-sm font-black text-emerald-600">Sole Vendor · Prime Listing</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" aria-label="Edit" onClick={onEdit} className="grid h-10 w-10 place-items-center rounded-md hover:bg-slate-100"><Edit3 size={20} /></button>
          <button type="button" aria-label="Close" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-md hover:bg-slate-100"><X size={22} /></button>
        </div>
      </header>
      <section className="mt-8 rounded-lg bg-slate-900 p-6 text-white">
        <div className="mb-6 flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-400">
          <Sparkles size={18} className="text-emerald-300" /> Curator AI insights
        </div>
        <p className="text-xl font-semibold leading-8">
          {contact.name} has <span className="font-black text-emerald-300">instructed sole agency</span> on The Glass House.
          Portal saves are up 22% week-on-week; serious applicants are clustering in the £3.8M-£4.2M band.
        </p>
        <div className="mt-5 flex gap-2"><Badge tone="slate">Sole mandate</Badge><Badge tone="slate">Chain free</Badge></div>
      </section>
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-emerald-700">Active intent: {contact.role}</h3>
          <Badge tone="green">Marketing Stage</Badge>
        </div>
        <Card className="border-emerald-200 p-5 shadow-emerald-100">
          {[
            ['Asking Price', '£4.00M'],
            ['Instruction', 'Sole Agency · Signed'],
            ['Property Address', 'The Glass House, Surrey'],
            ['Marketing', 'Live · Premium pack'],
            ['Target Exchange', 'Q1 (12-week window)'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
              <span className="font-semibold text-slate-500">{label}</span>
              <span className="text-right font-black text-slate-950">{value}</span>
            </div>
          ))}
          <Link to={`/contacts/${contact.slug ?? contact.id}/sell-intent`} className="mt-5 flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-500 text-sm font-black text-white shadow-lg shadow-emerald-200">
            <ExternalLink size={16} /> View Sell Mandate <ArrowRight size={17} />
          </Link>
        </Card>
      </section>
      <section className="mt-8">
        <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-500">Contact essentials</h3>
        <div className="grid gap-3">
          <Card className="p-4"><p className="text-xs font-black uppercase text-slate-400">Mobile</p><p className="mt-1 text-lg font-black">{contact.phone || 'Not recorded'}</p></Card>
          <Card className="p-4"><p className="text-xs font-black uppercase text-slate-400">Email</p><p className="mt-1 text-lg font-black">{contact.email}</p></Card>
        </div>
      </section>
    </motion.aside>
  </div>
  );
};

export const ContactDirectoryPage = () => {
  const [selected, setSelected] = useState<ContactRecord | null>(null);
  const [editing, setEditing] = useState<ContactRecord | null>(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<ContactRoleCode | ''>('');
  const [page, setPage] = useState(1);
  const [success, setSuccess] = useState('');
  const { contacts, meta, loading, error } = useContacts({ search, role: role || undefined, page });

  const exportContacts = () => {
    const rows = contacts.map((contact) => [contact.name, contact.role, contact.email, contact.phone, contact.address, contact.pendingAction]);
    const csv = ['Name,Role,Email,Mobile,Address,Pending action', ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'contact-directory.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-w-0 p-5 md:p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Network &gt; Contact intelligence</p>
          <h1 className="mt-4 break-words text-4xl font-black text-slate-950 sm:text-5xl">Contact Directory</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" icon={<Filter size={18} />} onClick={() => setRole(role ? '' : 'VENDOR')}>Filters</Button>
          <Button variant="secondary" icon={<Download size={18} />} onClick={exportContacts}>Export</Button>
        </div>
      </div>

      <div className="mb-5 grid gap-3 lg:grid-cols-[1fr_220px]">
        <label className="relative block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search contact intelligence..." className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold outline-none focus:border-emerald-300" />
        </label>
        <select value={role} onChange={(event) => { setRole(event.target.value as ContactRoleCode | ''); setPage(1); }} className="h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-emerald-300">
          <option value="">All roles</option>
          {roleCodes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      {success ? (
        <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{success}</p>
      ) : null}
      {error ? <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-700">{error} Showing local demo contacts.</p> : null}

      <Card className="min-w-0 overflow-hidden">
        <div className="hidden grid-cols-[48px_1.5fr_1fr_0.8fr_1fr_60px] bg-slate-100 px-5 py-5 text-xs font-black uppercase tracking-widest text-slate-500 lg:grid">
          <span /><span>Name & address</span><span>Communication</span><span>Last activity</span><span>Pending actions</span><span>Action</span>
        </div>
        <div className="divide-y divide-slate-100">
          {loading ? Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="grid gap-4 px-5 py-7 lg:grid-cols-[48px_1.5fr_1fr_0.8fr_1fr_60px]">
              <span className="h-5 w-5 rounded bg-slate-100" />
              <span className="h-14 rounded bg-slate-100" />
              <span className="h-14 rounded bg-slate-100" />
              <span className="h-14 rounded bg-slate-100" />
              <span className="h-14 rounded bg-slate-100" />
              <span className="h-8 rounded bg-slate-100" />
            </div>
          )) : null}
          {!loading && contacts.length === 0 ? (
            <div className="grid place-items-center gap-3 px-5 py-16 text-center">
              <UserRound size={34} className="text-slate-300" />
              <p className="text-lg font-black">No contacts found</p>
              <p className="max-w-md text-sm text-slate-500">Adjust your search or add a new contact to start the Contact Intelligence workflow.</p>
            </div>
          ) : null}
          {!loading && contacts.map((contact) => (
            <button key={contact.id} type="button" onClick={() => setSelected(contact)} className="grid w-full min-w-0 gap-4 px-5 py-7 text-left hover:bg-slate-50 lg:grid-cols-[48px_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)_60px] lg:items-center">
              <span className="hidden h-5 w-5 rounded border border-slate-300 bg-white lg:block" />
              <span className="flex min-w-0 items-center gap-5">
                <ContactAvatar contact={contact} />
                <span className="min-w-0">
                  <span className="flex min-w-0 flex-wrap items-center gap-2 text-xl font-black text-slate-950">
                    {contact.name}
                    <Badge tone={roleTone(contact.role)}>{contact.role}</Badge>
                    {contact.secondaryRoles.map((secondaryRole) => <Badge key={secondaryRole} tone={roleTone(secondaryRole)}>{secondaryRole}</Badge>)}
                  </span>
                  <span className="mt-1 block break-words font-semibold text-slate-500">{contact.address || 'Address not recorded'}</span>
                </span>
              </span>
              <span className="grid min-w-0 gap-2 font-semibold text-slate-700">
                <span className="inline-flex min-w-0 items-center gap-2"><Mail size={16} className="shrink-0" /><span className="break-all">{contact.email}</span></span>
                <span className="inline-flex min-w-0 items-center gap-2"><Phone size={16} className="shrink-0" /><span className="break-all">{contact.phone || 'No mobile'}</span></span>
              </span>
              <span><span className="font-black text-slate-950">{contact.lastActivity}</span><span className="mt-1 block text-sm font-medium italic text-slate-500">{contact.lastActivityNote}</span></span>
              <span className={cn('font-black', pendingClass[contact.pendingTone])}>{contact.pendingAction}</span>
              <ArrowRight className="justify-self-end text-slate-500" />
            </button>
          ))}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm font-semibold text-slate-500">
          <span>{meta.total} contacts · Page {meta.page} of {meta.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))}>Previous</Button>
            <Button variant="secondary" disabled={page >= meta.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </div>
        </footer>
      </Card>
      {selected ? <ContactDrawer contact={selected} onClose={() => setSelected(null)} onEdit={() => setEditing(selected)} /> : null}
      {editing ? (
        <AddContactModal
          contact={editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => setSelected(saved)}
          onSuccess={(message) => setSuccess(message)}
        />
      ) : null}
    </div>
  );
};

const fallbackContact = normalizeContact({
  id: 'marcus-sterling',
  slug: 'marcus-sterling',
  firstName: 'Marcus',
  lastName: 'Sterling',
  email: 'sterling@marcus.io',
  mobile: '+44 7700 900 456',
  role: 'Vendor',
  address: '14 Cheltenham Place, Wilmslow, SK9 4AA',
});

const useContactDetail = (id = 'marcus-sterling') => {
  const [contact, setContact] = useState<ContactRecord>(fallbackContact);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    crmService.detail<RawContact>('contacts', id)
      .then((result) => mounted && setContact(normalizeContact(result)))
      .catch((apiError) => mounted && setError(getApiErrorMessage(apiError)))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [id]);
  return { contact, setContact, loading, error };
};

const stageNames = ['New enquiry', 'Qualified', 'Valuation', 'Instruction', 'Compliance', 'Listing', 'Live', 'Agreed', 'Completed'];

export const ContactDetailPage = () => {
  const { id = 'marcus-sterling' } = useParams();
  const { contact, error } = useContactDetail(id);
  const intent = contact.sellIntents?.[0];
  const timeline = contact.timeline?.length ? contact.timeline : [
    { id: '1', step: 'Qualified', activity: 'Stage: Qualified', description: 'Vendor motivation and fee expectation recorded; Glass House flagged for sole mandate track.', agentName: 'Alexander Thorne', occurredAt: '2023-10-19T10:05:00Z' },
    { id: '2', step: 'Valuation', activity: 'Valuation booked', description: 'Property valuation visit scheduled. Open Sell intent to capture details.', agentName: 'Julian Vane', occurredAt: '2026-01-14T14:30:00Z' },
  ] as ContactTimelineEntry[];

  return (
    <div className="mx-auto max-w-6xl p-5 md:p-8">
      {error ? <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-700">{error} Showing local contact workspace.</p> : null}
      <ContactHeader contact={contact} compact />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between"><h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Sales intent pipeline</h2><Badge tone="green">Active mandate</Badge></div>
            <div className="grid grid-cols-3 gap-3 text-center text-[10px] font-black uppercase text-slate-400 sm:grid-cols-5 lg:grid-cols-9">
              {stageNames.map((stage, index) => <div key={stage} className="grid gap-2"><span className={cn('mx-auto grid h-7 w-7 place-items-center rounded-full border', index <= 2 ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200')}>{index <= 2 ? <Check size={14} /> : null}</span>{stage}</div>)}
            </div>
          </Card>
          <Card className="overflow-hidden bg-slate-900 text-white">
            <div className="p-7">
              <h2 className="text-2xl font-black">Active Selling Intent</h2>
              <p className="mt-2 font-bold text-emerald-300">{intent?.propertyTitle ?? 'The Glass House'} · Sole mandate · Surrey</p>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">Open the Sell intent workspace for valuation through reconciliation. Use Property valuation to jump straight to the valuation form.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to={`/contacts/${contact.slug ?? contact.id}/sell-intent`} className="rounded-md bg-emerald-500 px-4 py-3 text-sm font-black text-white">Open sell intent</Link>
                <Link to={`/contacts/${contact.slug ?? contact.id}/sell-intent`} className="rounded-md border border-white/20 px-4 py-3 text-sm font-black text-white">Property valuation</Link>
              </div>
              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                {[['Expected price', '£4.00M'], ['Stage', intent?.currentStage ?? 'Valuation'], ['Total views scheduled', '8'], ['Views completed', '3'], ['Views pending', '5'], ['Max offer', '£4.08M']].map(([label, value]) => <div key={label}><p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>)}
              </div>
            </div>
          </Card>
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Mandate timeline</h2></div>
            {timeline.map((item) => <div key={item.id} className="grid gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:grid-cols-[140px_1fr]"><span className="font-black text-slate-950">{formatDate(item.occurredAt)}</span><span><span className="font-black text-slate-950">{item.activity}</span><span className="block text-sm text-slate-500">{item.description}</span></span></div>)}
          </Card>
        </div>
        <div className="grid gap-6 self-start">
          <InsightsPanel insights={contact.aiInsights} />
          <Card className="p-5"><h2 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-500">Next actions</h2><div className="grid gap-3">{['Add property to inventory', 'Complete sell intent workspace'].map((item) => <label key={item} className="flex gap-3 rounded-md border border-slate-200 p-4 text-sm font-bold"><input type="checkbox" className="mt-1" /> {item}</label>)}</div></Card>
          <Card className="p-5"><h2 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-500">Vendor vault</h2><div className="grid gap-3">{(contact.documents ?? []).map((doc) => <a key={doc.id} href={resolveAssetUrl(doc.url)} className="rounded-md bg-slate-100 p-3 text-sm font-black">{doc.name}</a>)}<Button variant="secondary" icon={<Upload size={16} />}>Upload document</Button></div></Card>
        </div>
      </div>
    </div>
  );
};

const defaultChecklist = [
  'Run portal comparables (Rightmove / Zoopla)',
  'Check recent sold prices (Land Registry)',
  'Review local demand & stock levels',
  'Confirm tenure type (Freehold/Leasehold)',
  'Confirm access / key arrangements with vendor',
  'Note EPC requirement (needed before listing)',
  'Note any competing agents (if known)',
  'Agent preparation complete - ready to attend',
].map((label) => ({ label, completed: false }));

const defaultStages = [
  'Property Valuation', 'Fee Structure', 'Instruction Document', 'Instruction Agreed', 'Compliance & AML Pack Issued', 'Vendor AML & Risk Assessment', 'Add Property', 'Publish Property', 'Viewings & Buyer Engagement', 'Offer Received', 'Memorandum of Sale Issued', 'Sales Progression (Post-Agreement)', 'Exchange of Contracts', 'Completion & Payment',
].map((label, index) => ({ label, active: index === 0, completed: index < 2 }));

const useSellIntent = (contactId: string) => {
  const [intent, setIntent] = useState<SellIntentRecord | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    crmService.sellIntent(contactId)
      .then((result) => mounted && setIntent(result))
      .catch((apiError) => {
        if (!mounted) return;
        setIntent({
          id: 'fallback',
          contactId,
          propertyTitle: 'The Glass House',
          propertyAddress: '14 Cheltenham Place, Wilmslow, SK9 4AA',
          askingPrice: 4000000,
          instruction: 'Sole Agency · Signed',
          marketingStatus: 'Valuation pending',
          targetExchange: 'Q1 (12-week window)',
          currentStage: 'Property Valuation',
          stages: defaultStages,
          checklist: defaultChecklist,
          workflowProgress: 0,
        });
        setError(getApiErrorMessage(apiError));
      });
    return () => { mounted = false; };
  }, [contactId]);
  return { intent, setIntent, error };
};

const SchedulePanel = ({ contact, onClose, onConfirmed }: { contact: ContactRecord; onClose: () => void; onConfirmed: (appointment: ValuationAppointment) => void }) => {
  useViewportOverlayLock(true, onClose);
  const [selected, setSelected] = useState('');
  const [notes, setNotes] = useState('');
  const [competingAgents, setCompetingAgents] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const slots = ['08:00', '09:00', '10:30', '11:30', '14:00', '16:00'];
  const days = ['Mon 25', 'Tue 26', 'Wed 27', 'Thu 28', 'Fri 29', 'Sat 30'];
  const confirm = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const appointment = await crmService.scheduleValuation(contact.slug ?? contact.id, { scheduledAt: selected, notes, competingAgents, agentId: contact.assignedAgent?.id });
      onConfirmed(appointment);
      onClose();
    } catch (apiError) {
      setError(getApiErrorMessage(apiError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 overflow-hidden bg-slate-950/35 backdrop-blur-sm"
    >
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label="Schedule valuation appointment"
        initial={{ x: 900 }}
        animate={{ x: 0 }}
        className="absolute right-0 top-0 flex h-dvh max-h-dvh w-full max-w-[min(64rem,100vw)] flex-col overflow-hidden bg-white shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6 sm:py-5"><div className="min-w-0"><p className="text-xs font-black uppercase tracking-widest text-slate-500">Property valuation</p><h2 className="break-words text-xl font-black">Schedule Valuation Appointment</h2></div><button type="button" aria-label="Close" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-md hover:bg-slate-100"><X size={20} /></button></header>
        <div className="shrink-0 break-words border-b border-emerald-100 bg-emerald-50 px-5 py-3 text-sm font-black text-emerald-800 sm:px-6">{contact.name} · {contact.address} · Agent: {contact.assignedAgent ? `${contact.assignedAgent.firstName} ${contact.assignedAgent.lastName}` : 'Alexander Thorne'}</div>
        <div className="flex flex-1 overflow-hidden max-lg:flex-col">
          <aside className="w-72 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-5 max-lg:max-h-[45dvh] max-lg:w-full"><p className="mb-4 text-sm font-black uppercase tracking-widest text-slate-500">Quick select</p><div className="rounded-lg bg-white p-4 shadow-sm"><div className="mb-4 flex items-center justify-between font-black"><ChevronLeft size={16} /> May 2026 <ChevronRight size={16} /></div><div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-slate-500">{['M', 'T', 'W', 'T', 'F', 'S', 'S', ...Array.from({ length: 31 }, (_, index) => String(index + 1))].map((day, index) => <button key={`${day}-${index}`} type="button" className={cn('h-8 rounded-md', index > 6 && 'border border-slate-200 bg-white text-slate-950')}>{day}</button>)}</div></div><textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-5 h-28 w-full rounded-md border border-slate-200 p-3 text-sm outline-none" placeholder="Key notes for the attending agent..." /><input value={competingAgents} onChange={(event) => setCompetingAgents(event.target.value)} className="mt-4 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none" placeholder="e.g. Savills attending..." /></aside>
          <section className="min-w-0 flex-1 overflow-auto p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-black">May 25 - May 31</h3><Badge tone="green">{selected ? new Date(selected).toLocaleString('en-GB') : 'No slot selected yet'}</Badge></div><div className="min-w-[720px] overflow-hidden rounded-lg border border-slate-200"><div className="grid grid-cols-[90px_repeat(6,minmax(100px,1fr))] text-sm">{['Time', ...days].map((head) => <div key={head} className="bg-slate-100 px-3 py-3 font-black uppercase text-slate-500">{head}</div>)}{slots.flatMap((time) => [<div key={time} className="border-t border-slate-200 px-3 py-3 font-black">{time}</div>, ...days.map((day, index) => { const iso = `2026-05-${25 + index}T${time}:00.000Z`; return <button key={`${time}-${day}`} type="button" onClick={() => setSelected(iso)} className={cn('border-l border-t border-slate-200 px-3 py-3 font-semibold hover:bg-emerald-50', selected === iso && 'bg-emerald-100 text-emerald-800')}>Available</button>; })])}</div></div></section>
        </div>
        {error ? <p className="mx-5 mb-4 shrink-0 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <footer className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-200 p-5"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!selected || saving} onClick={confirm} icon={<CalendarCheck size={18} />}>{saving ? 'Confirming...' : 'Confirm Appointment'}</Button></footer>
      </motion.aside>
    </div>
  );
};

export const SellIntentWorkspacePage = () => {
  const { id = 'marcus-sterling' } = useParams();
  const navigate = useNavigate();
  const { contact } = useContactDetail(id);
  const { intent, setIntent, error } = useSellIntent(id);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const checklistDone = useMemo(() => (intent?.checklist ?? defaultChecklist).filter((item) => item.completed).length, [intent]);
  const toggleChecklist = async (label: string, completed: boolean) => {
    setIntent((current) => current ? { ...current, checklist: current.checklist.map((item) => item.label === label ? { ...item, completed } : item) } : current);
    try {
      const updated = await crmService.updateSellIntentChecklist(id, label, completed);
      setIntent(updated);
    } catch {
      setIntent((current) => current ? { ...current, checklist: current.checklist.map((item) => item.label === label ? { ...item, completed: !completed } : item) } : current);
    }
  };

  return (
    <div className="min-w-0 p-5 md:p-8">
      <div className="mb-6"><button type="button" onClick={() => navigate(`/contacts/${contact.slug ?? contact.id}`)} className="mb-4 inline-flex items-center gap-2 text-sm font-black text-slate-950"><ArrowLeft size={18} /> Marcus contact</button><ContactHeader contact={contact} /></div>
      {error ? <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-700">{error} Showing local sell intent workspace.</p> : null}
      <h1 className="mb-4 break-words text-4xl font-black">Sell intent workspace</h1>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(280px,380px)_minmax(0,1fr)_minmax(320px,420px)]">
        <Card className="self-start p-5"><div className="mb-5 flex items-center justify-between"><h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Mandate stages</h2><button type="button" aria-label="Collapse" className="grid h-9 w-9 place-items-center rounded-md border border-slate-200"><ChevronLeft size={17} /></button></div><p className="mb-4 text-sm text-slate-500">New enquiry & qualified are complete on the contact record.</p><div className="grid gap-2">{(intent?.stages ?? defaultStages).map((stage) => <button key={stage.label} type="button" className={cn('h-11 rounded-md border border-slate-200 bg-slate-100 px-4 text-left text-sm font-black text-slate-700', stage.active && 'border-emerald-400 bg-slate-950 text-white')}>{stage.label}</button>)}</div></Card>
        <Card className="overflow-hidden"><div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-8"><div><Badge tone="amber">Valuation pending</Badge><h2 className="mt-5 text-3xl font-black">Property Valuation</h2><p className="mt-2 max-w-xl text-slate-600">Schedule an on-site valuation to assess the property and set a realistic asking price for {contact.name}.</p></div><Button onClick={() => setScheduleOpen(true)} icon={<CalendarCheck size={18} />}>Schedule Valuation</Button></div><div className="p-8"><div className="mb-6 flex items-center justify-between"><h3 className="text-sm font-black uppercase tracking-widest text-slate-600">Pre-valuation checklist</h3><Badge tone="green">{checklistDone} / {(intent?.checklist ?? defaultChecklist).length} done</Badge></div><div className="grid gap-6">{(intent?.checklist ?? defaultChecklist).map((item) => <label key={item.label} className="flex items-center gap-4 text-base font-semibold"><input type="checkbox" checked={Boolean(item.completed)} onChange={(event) => void toggleChecklist(item.label, event.target.checked)} className="h-5 w-5 rounded border-slate-300" /> <span className={cn(item.completed && 'text-slate-400 line-through')}>{item.label}</span></label>)}</div><button type="button" className="mt-8 flex h-14 w-full items-center justify-between rounded-md border border-indigo-200 bg-indigo-50 px-5 text-sm font-black uppercase tracking-widest text-indigo-700"><span className="inline-flex items-center gap-2"><Home size={17} /> Property info (from sell intent)</span><ChevronDown size={18} /></button></div></Card>
        <InsightsPanel insights={contact.aiInsights} />
      </div>
      {scheduleOpen ? <SchedulePanel contact={contact} onClose={() => setScheduleOpen(false)} onConfirmed={(appointment) => setIntent((current) => current ? { ...current, appointments: [appointment, ...(current.appointments ?? [])] } : current)} /> : null}
    </div>
  );
};
