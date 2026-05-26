import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileText,
  HelpCircle,
  Home,
  Inbox,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MessageSquare,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ComponentType, type RefObject } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { useAuthStore } from '../app/store/authStore';
import { cn } from '../utils/cn';
import { Button } from '../components/ui/Primitives';
import { resolveAssetUrl } from '../services/api';
import { userService } from '../services/users';
import { AddContactModal } from '../modules/contacts/ContactPages';
import { notificationService } from '../services/notifications';
import { aiChatService } from '../services/aiChat';
import type { AiChatMessage, NotificationRecord } from '../types/domain';

const navigation = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Tasks', path: '/maintenance', icon: ClipboardCheck },
  { label: 'Properties', path: '/properties', icon: Home },
  { label: 'Portfolio', path: '/leases', icon: Building2 },
  { label: 'Contacts', path: '/contacts', icon: UserRound },
  { label: 'Calendar', path: '/calendar', icon: CalendarDays },
  { label: 'Payments', path: '/payments', icon: CreditCard },
  { label: 'Tenants', path: '/tenants', icon: Users },
  { label: 'Users', path: '/users', icon: ShieldCheck },
];

const isRouteMatch = (pathname: string, path: string) =>
  path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`);

const getActiveNavPath = (pathname: string) =>
  navigation
    .filter((item) => isRouteMatch(pathname, item.path))
    .sort((a, b) => b.path.length - a.path.length)[0]?.path;

// Width tokens — keep in sync between sidebar and main offset
const SIDEBAR_EXPANDED = 'w-56';
const SIDEBAR_COLLAPSED = 'w-16';
const MAIN_EXPANDED = 'pl-56';
const MAIN_COLLAPSED = 'pl-16';

const notificationIcons: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  'badge-check': BadgeCheck,
  'calendar-check': CalendarCheck,
  'clipboard-check': ClipboardCheck,
  'file-text': FileText,
  'shield-alert': ShieldAlert,
  'user-round': UserRound,
  users: Users,
};

const AiAssistantPanel = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const session = useQuery({ queryKey: ['ai-chat-session'], queryFn: aiChatService.session, enabled: open });
  const messages = useQuery({ queryKey: ['ai-chat-messages', session.data?.id], queryFn: () => aiChatService.messages(session.data!.id), enabled: open && Boolean(session.data?.id) });
  const send = useMutation({
    mutationFn: (content: string) => aiChatService.send(session.data!.id, content),
    onMutate: async (content) => {
      setDraft('');
      await queryClient.cancelQueries({ queryKey: ['ai-chat-messages', session.data?.id] });
      const previous = queryClient.getQueryData<AiChatMessage[]>(['ai-chat-messages', session.data?.id]) ?? [];
      queryClient.setQueryData<AiChatMessage[]>(['ai-chat-messages', session.data?.id], [
        ...previous,
        { id: `local-${Date.now()}`, sessionId: session.data?.id ?? '', role: 'USER', content, createdAt: new Date().toISOString() },
      ]);
      return { previous };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-chat-messages', session.data?.id] }),
  });
  const prompts = ['Summarise today', 'Help schedule valuation', 'Property workflow', 'Reminder ideas'];
  if (!open) return null;
  return (
    <div className="fixed bottom-24 right-5 z-50 flex h-[min(620px,calc(100dvh-8rem))] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div><h2 className="text-sm font-black">AI assistant</h2><p className="text-xs font-semibold text-slate-500">Lightweight CRM help</p></div>
        <button type="button" aria-label="Close assistant" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md hover:bg-slate-100"><X size={18} /></button>
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 flex flex-wrap gap-2">{prompts.map((prompt) => <button key={prompt} type="button" onClick={() => send.mutate(prompt)} className="rounded-md bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">{prompt}</button>)}</div>
        <div className="grid gap-3">
          {(messages.data ?? []).map((message) => (
            <div key={message.id} className={cn('max-w-[85%] rounded-lg px-3 py-2 text-sm font-semibold leading-5', message.role === 'USER' ? 'ml-auto bg-emerald-500 text-white' : 'bg-slate-100 text-slate-800')}>
              {message.content}
            </div>
          ))}
          {session.isLoading || messages.isLoading ? <p className="text-sm font-semibold text-slate-500">Loading assistant history...</p> : null}
        </div>
      </div>
      <form className="flex gap-2 border-t border-slate-100 p-3" onSubmit={(event) => { event.preventDefault(); if (draft.trim() && session.data?.id) send.mutate(draft.trim()); }}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} className="h-11 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-emerald-300" placeholder="Ask for CRM help..." />
        <Button type="submit" disabled={!draft.trim() || !session.data?.id || send.isPending}>Send</Button>
      </form>
    </div>
  );
};

const formatNotificationTime = (value: string) => {
  const timestamp = new Date(value).getTime();
  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (Number.isNaN(timestamp)) return '';
  if (diff < minute) return 'Just now';
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;

  return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short' }).format(timestamp);
};

const getNotificationTone = (notification: NotificationRecord) => {
  if (notification.priority === 'URGENT' || notification.type === 'ERROR') {
    return 'bg-rose-50 text-rose-700 ring-rose-100';
  }
  if (notification.priority === 'HIGH' || notification.type === 'WARNING' || notification.type === 'TASK') {
    return 'bg-amber-50 text-amber-700 ring-amber-100';
  }
  if (notification.type === 'SUCCESS') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  }
  return 'bg-slate-100 text-slate-600 ring-slate-200';
};

const NotificationPanel = ({
  anchorRef,
  open,
  loading,
  error,
  notifications,
  unreadCount,
  onClose,
  onRefresh,
  onMarkRead,
  onMarkAllRead,
}: {
  anchorRef: RefObject<HTMLButtonElement | null>;
  open: boolean;
  loading: boolean;
  error: string;
  notifications: NotificationRecord[];
  unreadCount: number;
  onClose: () => void;
  onRefresh: () => void;
  onMarkRead: (notification: NotificationRecord) => void;
  onMarkAllRead: () => void;
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ top: 72, right: 16 });

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;

      const panelWidth = Math.min(384, window.innerWidth - 24);
      const right = Math.max(12, window.innerWidth - rect.right - 4);
      setPosition({
        top: Math.min(rect.bottom + 10, window.innerHeight - 120),
        right: Math.min(right, Math.max(12, window.innerWidth - panelWidth - 12)),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) {
        return;
      }
      onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [anchorRef, onClose, open]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-50 w-[calc(100vw-24px)] max-w-sm overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl shadow-slate-900/15"
      style={{ top: position.top, right: position.right }}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-black text-slate-950">Notifications</h2>
          <p className="text-xs font-semibold text-slate-500">
            {unreadCount ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Refresh notifications"
            onClick={onRefresh}
            className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
          >
            {loading ? <Loader2 size={17} className="animate-spin" /> : <Inbox size={17} />}
          </button>
          <button
            type="button"
            aria-label="Mark all as read"
            onClick={onMarkAllRead}
            disabled={!unreadCount}
            className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <CheckCheck size={17} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-3 mt-3 flex gap-2 rounded-md bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          <AlertTriangle size={16} className="shrink-0" />
          {error}
        </div>
      )}

      <div className="max-h-[min(520px,calc(100vh-150px))] overflow-y-auto overscroll-contain py-2">
        {loading && notifications.length === 0 && (
          <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm font-bold text-slate-500">
            <Loader2 size={18} className="animate-spin" />
            Loading notifications
          </div>
        )}

        {!loading && notifications.length === 0 && !error && (
          <div className="px-6 py-10 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-slate-100 text-slate-400">
              <Bell size={22} />
            </div>
            <p className="mt-3 text-sm font-black text-slate-800">No notifications</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              New CRM activity will appear here.
            </p>
          </div>
        )}

        {notifications.map((notification) => {
          const Icon = notificationIcons[notification.icon ?? ''] ?? Bell;
          const isUnread = !notification.readAt;
          const url = notification.actionUrl ?? notification.link;

          return (
            <button
              key={notification.id}
              type="button"
              onClick={() => onMarkRead(notification)}
              className={cn(
                'flex w-full gap-3 px-4 py-3 text-left transition hover:bg-slate-50',
                isUnread && 'bg-emerald-50/45',
              )}
            >
              {notification.avatarUrl ? (
                <img
                  src={resolveAssetUrl(notification.avatarUrl)}
                  alt=""
                  className="mt-0.5 h-10 w-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span
                  className={cn(
                    'mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg ring-1',
                    getNotificationTone(notification),
                  )}
                >
                  <Icon size={18} />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-3">
                  <span className="line-clamp-1 text-sm font-black text-slate-900">
                    {notification.title}
                  </span>
                  {isUnread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                </span>
                <span className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-600">
                  {notification.message}
                </span>
                <span className="mt-2 flex items-center justify-between gap-2 text-[11px] font-bold uppercase text-slate-400">
                  <span>{formatNotificationTime(notification.createdAt)}</span>
                  {url && <span className="truncate normal-case text-emerald-700">Open</span>}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const notificationButtonRef = useRef<HTMLButtonElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarError, setAvatarError] = useState('');
  const [quickOpen, setQuickOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [quickActionMessage, setQuickActionMessage] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const notificationFetchRef = useRef<Promise<void> | null>(null);
  const { user, refreshToken, logout, updateUser } = useAuthStore();
  const activeNavPath = getActiveNavPath(location.pathname);

  const fetchNotifications = (force = false) => {
    if (notificationFetchRef.current) {
      return notificationFetchRef.current;
    }
    if (!force && notifications.length > 0) {
      return Promise.resolve();
    }

    setNotificationLoading(true);
    setNotificationError('');

    const request = Promise.all([
      notificationService.list(20),
      notificationService.unreadCount(),
    ])
      .then(([list, unread]) => {
        setNotifications(list.data);
        setNotificationCount(unread.count);
      })
      .catch(() => {
        setNotificationError('Could not load notifications. Try again.');
      })
      .finally(() => {
        setNotificationLoading(false);
        notificationFetchRef.current = null;
      });

    notificationFetchRef.current = request;
    return request;
  };

  useEffect(() => {
    void notificationService
      .unreadCount()
      .then(({ count }) => setNotificationCount(count))
      .catch(() => undefined);
  }, []);

  const handleLogout = () => {
    void authService.logout(refreshToken);
    logout();
    navigate('/login');
  };

  const handleAvatarFile = async (file?: File) => {
    setAvatarError('');
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Use a JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Profile image must be 2 MB or smaller.');
      return;
    }
    try {
      const updated = await userService.uploadMyAvatar(file);
      updateUser(updated);
    } catch {
      setAvatarError('Profile image could not be uploaded.');
    }
  };

  const handleNotificationClick = () => {
    setNotificationOpen((open) => !open);
    void fetchNotifications(true);
  };

  const handleMarkNotificationRead = (notification: NotificationRecord) => {
    const actionUrl = notification.actionUrl ?? notification.link;

    if (!notification.readAt) {
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, readAt } : item)),
      );
      setNotificationCount((count) => Math.max(0, count - 1));
      void notificationService.markRead(notification.id).catch(() => {
        setNotifications((current) =>
          current.map((item) => (item.id === notification.id ? { ...item, readAt: undefined } : item)),
        );
        setNotificationCount((count) => count + 1);
        setNotificationError('Could not mark the notification as read.');
      });
    }

    if (actionUrl) {
      setNotificationOpen(false);
      navigate(actionUrl);
    }
  };

  const handleMarkAllNotificationsRead = () => {
    if (!notificationCount) return;

    const previous = notifications;
    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
    setNotificationCount(0);

    void notificationService.markAllRead().catch(() => {
      setNotifications(previous);
      setNotificationCount(previous.filter((item) => !item.readAt).length);
      setNotificationError('Could not mark all notifications as read.');
    });
  };

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : 'JF';
  const avatarUrl = resolveAssetUrl(user?.avatarUrl);

  const quickActions = [
    { label: 'Add Contact', action: () => setAddContactOpen(true) },
    { label: 'Add Property', action: () => navigate('/properties') },
    { label: 'Add Tenant', action: () => navigate('/tenants') },
    { label: 'Add Vendor', action: () => { setAddContactOpen(true); } },
    { label: 'Create Sell Intent', action: () => navigate('/contacts') },
    { label: 'Schedule Valuation', action: () => navigate('/calendar') },
    { label: 'Upload Document', action: () => navigate('/contacts') },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-slate-950 py-6 text-slate-400 shadow-xl',
          'transition-[width] duration-300 ease-in-out',
          collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
        )}
      >
        {/* Brand / logo */}
        <div className={cn('flex items-center px-3', collapsed ? 'justify-center' : 'gap-3 pr-3')}>
          <button
            type="button"
            aria-label="Dashboard"
            onClick={() => navigate('/')}
            className={cn(
              'flex shrink-0 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 font-black text-white transition',
              collapsed ? 'h-10 w-10 text-sm' : 'h-10 w-10 text-sm',
            )}
          >
            JF
          </button>
          {!collapsed && (
            <span className="truncate text-sm font-bold tracking-wide text-white">
              JF Platform
            </span>
          )}
        </div>

        {/* Nav items */}
        <nav className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto px-2">
          {navigation.map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              title={collapsed ? label : undefined}
              className={cn(
                'relative flex items-center rounded-lg px-2 py-2.5 text-sm font-semibold transition hover:bg-white/10 hover:text-white',
                collapsed ? 'justify-center gap-0' : 'gap-3',
                activeNavPath === path &&
                'bg-white/10 text-emerald-300 before:absolute before:-left-2 before:h-6 before:w-1 before:rounded-r before:bg-emerald-400',
              )}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="flex flex-col gap-1 px-2">
          <button
            type="button"
            title={collapsed ? 'Settings' : undefined}
            className={cn(
              'flex items-center rounded-lg px-2 py-2.5 text-sm font-semibold hover:bg-white/10 hover:text-white',
              collapsed ? 'justify-center' : 'gap-3',
            )}
          >
            <Settings size={18} className="shrink-0" />
            {!collapsed && 'Settings'}
          </button>
          <button
            type="button"
            title={collapsed ? 'Help' : undefined}
            className={cn(
              'flex items-center rounded-lg px-2 py-2.5 text-sm font-semibold hover:bg-white/10 hover:text-white',
              collapsed ? 'justify-center' : 'gap-3',
            )}
          >
            <HelpCircle size={18} className="shrink-0" />
            {!collapsed && 'Help'}
          </button>
          <button
            type="button"
            title={collapsed ? 'Log out' : undefined}
            onClick={handleLogout}
            className={cn(
              'flex items-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400/20',
              collapsed ? 'justify-center' : 'gap-3',
            )}
          >
            <LogOut size={18} className="shrink-0" />
            {!collapsed && 'Log Out'}
          </button>
        </div>

        {/* Collapse toggle — sits on the right edge of the sidebar */}
        <button
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            'absolute -right-3 top-[72px] z-50 grid h-6 w-6 place-items-center rounded-full border border-slate-700 bg-slate-900 text-slate-400 shadow-md transition hover:bg-slate-800 hover:text-white',
          )}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </aside>

      {/* ── Main content ── */}
      <div
        className={cn(
          'min-w-0 transition-[padding-left] duration-300 ease-in-out',
          collapsed ? MAIN_COLLAPSED : MAIN_EXPANDED,
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-20 min-w-0 items-center gap-3 px-4 sm:gap-4 sm:px-5 md:px-8">
            {/* Search */}
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="relative w-full max-w-xl">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  className="h-12 w-full rounded-lg border border-transparent bg-slate-100 pl-11 pr-4 text-sm font-medium outline-none placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white"
                  placeholder="Search contact intelligence..."
                />
              </div>
            </div>

            {/* Branch picker */}
            <button
              type="button"
              className="hidden shrink-0 items-center gap-4 rounded-lg bg-slate-100 px-4 py-3 text-sm font-bold sm:flex"
            >
              <span className="text-xs uppercase text-slate-500">Branch</span>
              All Branches
              <ChevronDown size={16} />
            </button>

            <button
              ref={notificationButtonRef}
              type="button"
              aria-label="Notifications"
              aria-expanded={notificationOpen}
              onClick={handleNotificationClick}
              className="relative grid h-11 w-11 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
            >
              <Bell size={21} />
              {notificationCount > 0 && (
                <span className="absolute right-1.5 top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black leading-none text-white ring-2 ring-white">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            <button
              type="button"
              aria-label="Inbox"
              className="grid h-11 w-11 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
            >
              <Mail size={21} />
            </button>

            <span className="hidden h-8 w-px bg-slate-200 lg:block" />
            <button type="button" className="hidden text-sm font-semibold text-slate-500 lg:block">
              Help Center
            </button>

            {/* Quick Action */}
            <div className="relative shrink-0">
              <Button icon={<Plus size={18} />} onClick={() => setQuickOpen((open) => !open)}>
                <span className="hidden sm:inline">Quick Action</span>
                <ChevronDown size={15} />
              </Button>
              {quickOpen && (
                <div className="absolute right-0 top-14 z-50 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-2 text-sm font-bold shadow-xl">
                  {quickActions.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className="block w-full px-4 py-3 text-left text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        setQuickOpen(false);
                        item.action();
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Avatar */}
            <div className="relative hidden sm:block">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  void handleAvatarFile(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              <button
                type="button"
                title="Upload profile photo"
                onClick={() => avatarInputRef.current?.click()}
                className="flex h-11 min-w-11 items-center justify-center overflow-hidden rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-black text-emerald-800"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="h-11 w-11 object-cover" />
                ) : (
                  initials
                )}
              </button>
              {avatarError && (
                <span className="absolute right-0 top-12 w-52 rounded-md bg-red-50 p-2 text-xs font-semibold text-red-700 shadow-sm">
                  {avatarError}
                </span>
              )}
            </div>
          </div>
        </header>

        <NotificationPanel
          anchorRef={notificationButtonRef}
          open={notificationOpen}
          loading={notificationLoading}
          error={notificationError}
          notifications={notifications}
          unreadCount={notificationCount}
          onClose={() => setNotificationOpen(false)}
          onRefresh={() => void fetchNotifications(true)}
          onMarkRead={handleMarkNotificationRead}
          onMarkAllRead={handleMarkAllNotificationsRead}
        />

        {/* Page content */}
        <main className="min-h-[calc(100vh-80px)] min-w-0 pb-20">
          <Outlet />
        </main>
      </div>

      {/* AI assistant FAB */}
      <div className="fixed bottom-7 right-7 z-40">
        {!assistantOpen && (
          <div className="absolute -top-12 right-0 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
            Hi! How can I help?
            <span className="absolute -bottom-1 right-5 h-2 w-2 rotate-45 bg-slate-900" />
          </div>
        )}
        <button
          type="button"
          aria-label="AI assistant"
          aria-expanded={assistantOpen}
          onClick={() => setAssistantOpen((open) => !open)}
          className="grid h-16 w-16 place-items-center rounded-full bg-emerald-400 text-slate-950 shadow-2xl shadow-emerald-300/60"
        >
          <MessageSquare size={24} />
        </button>
      </div>
      <AiAssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
      {/* Toast */}
      {quickActionMessage && (
        <div className="fixed right-6 top-24 z-50 max-w-sm rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-lg">
          {quickActionMessage}
        </div>
      )}

      {/* Add Contact modal */}
      {addContactOpen && (
        <AddContactModal
          onClose={() => setAddContactOpen(false)}
          onSaved={() => navigate('/contacts')}
          onSuccess={(message) => {
            setQuickActionMessage(message);
            window.setTimeout(() => setQuickActionMessage(''), 4000);
          }}
        />
      )}
    </div>
  );
};
