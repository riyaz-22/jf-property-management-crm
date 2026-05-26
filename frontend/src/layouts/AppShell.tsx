import {
  Bell,
  Building2,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  HelpCircle,
  Home,
  Inbox,
  LayoutDashboard,
  LogOut,
  Mail,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';
import { useAuthStore } from '../app/store/authStore';
import { cn } from '../utils/cn';
import { Button } from '../components/ui/Primitives';
import { resolveAssetUrl } from '../services/api';
import { userService } from '../services/users';
import { AddContactModal } from '../modules/contacts/ContactPages';

const navigation = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Tasks', path: '/maintenance', icon: ClipboardCheck },
  { label: 'Properties', path: '/properties', icon: Home },
  { label: 'Portfolio', path: '/leases', icon: Building2 },
  { label: 'Contacts', path: '/contacts', icon: UserRound },
  { label: 'Calendar', path: '/contacts/marcus-sterling/sell-intent', icon: CalendarDays },
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

export const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarError, setAvatarError] = useState('');
  const [quickOpen, setQuickOpen] = useState(false);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [quickActionMessage, setQuickActionMessage] = useState('');
  const { user, refreshToken, logout, updateUser } = useAuthStore();
  const activeNavPath = getActiveNavPath(location.pathname);

  const handleLogout = () => {
    void authService.logout(refreshToken);
    logout();
    navigate('/login');
  };

  const handleAvatarFile = async (file?: File) => {
    setAvatarError('');

    if (!file) {
      return;
    }

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

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : 'JF';
  const avatarUrl = resolveAssetUrl(user?.avatarUrl);
  const quickActions = [
    { label: 'Add Contact', action: () => setAddContactOpen(true) },
    { label: 'Add Property', action: () => navigate('/properties') },
    { label: 'Add Tenant', action: () => navigate('/tenants') },
    { label: 'Add Vendor', action: () => { setAddContactOpen(true); } },
    { label: 'Create Sell Intent', action: () => navigate('/contacts/marcus-sterling/sell-intent') },
    { label: 'Schedule Valuation', action: () => navigate('/contacts/marcus-sterling/sell-intent') },
    { label: 'Upload Document', action: () => navigate('/contacts/marcus-sterling') },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-20 flex-col items-center bg-slate-950 py-6 text-slate-400 shadow-xl md:flex">
        <button
          type="button"
          aria-label="Dashboard"
          onClick={() => navigate('/')}
          className="grid h-14 w-14 place-items-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-xl font-black text-white"
        >
          JF
        </button>
        <nav className="mt-10 flex flex-1 flex-col gap-3">
          {navigation.map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              title={label}
              className={cn(
                'relative grid h-11 w-11 place-items-center rounded-lg transition hover:bg-white/10 hover:text-white',
                activeNavPath === path && 'bg-white/10 text-emerald-300 before:absolute before:-left-3 before:h-7 before:w-1 before:rounded-r before:bg-emerald-400',
              )}
            >
              <Icon size={21} />
            </Link>
          ))}
        </nav>
        <div className="grid gap-3">
          <button type="button" aria-label="Settings" className="grid h-11 w-11 place-items-center rounded-lg hover:bg-white/10">
            <Settings size={21} />
          </button>
          <button type="button" aria-label="Help" className="grid h-11 w-11 place-items-center rounded-lg hover:bg-white/10">
            <HelpCircle size={21} />
          </button>
          <button
            type="button"
            aria-label="Log out"
            onClick={handleLogout}
            className="grid h-11 w-11 place-items-center rounded-lg border border-emerald-400/30 bg-emerald-400/10 text-white hover:bg-emerald-400/20"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className="min-w-0 md:pl-20">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-20 min-w-0 items-center gap-3 px-4 sm:gap-4 sm:px-5 md:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="relative hidden w-full max-w-xl sm:block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  className="h-12 w-full rounded-lg border border-transparent bg-slate-100 pl-11 pr-4 text-sm font-medium outline-none placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white"
                  placeholder="Search contact intelligence..."
                />
              </div>
            </div>
            <button type="button" className="hidden shrink-0 items-center gap-4 rounded-lg bg-slate-100 px-4 py-3 text-sm font-bold md:flex">
              <span className="text-xs uppercase text-slate-500">Branch</span>
              All Branches
              <ChevronDown size={16} />
            </button>
            <button type="button" aria-label="Notifications" className="grid h-11 w-11 place-items-center rounded-md text-slate-500 hover:bg-slate-100">
              <Bell size={21} />
            </button>
            <button type="button" aria-label="Inbox" className="grid h-11 w-11 place-items-center rounded-md text-slate-500 hover:bg-slate-100">
              <Mail size={21} />
            </button>
            <span className="hidden h-8 w-px bg-slate-200 lg:block" />
            <button type="button" className="hidden text-sm font-semibold text-slate-500 lg:block">
              Help Center
            </button>
            <div className="relative shrink-0">
              <Button icon={<Plus size={18} />} onClick={() => setQuickOpen((open) => !open)}>
                <span className="hidden sm:inline">Quick Action</span>
                <ChevronDown size={15} />
              </Button>
              {quickOpen ? (
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
              ) : null}
            </div>
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
              {avatarError ? (
                <span className="absolute right-0 top-12 w-52 rounded-md bg-red-50 p-2 text-xs font-semibold text-red-700 shadow-sm">
                  {avatarError}
                </span>
              ) : null}
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-80px)] min-w-0 pb-20 md:pb-0">
          <Outlet />
        </main>
      </div>

      <button
        type="button"
        aria-label="AI assistant"
        className="fixed bottom-7 right-7 z-40 grid h-16 w-16 place-items-center rounded-full bg-emerald-400 text-slate-950 shadow-2xl shadow-emerald-300/60"
      >
        <Inbox size={24} />
        <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-rose-500 text-xs font-black text-white">
          3
        </span>
      </button>
      {quickActionMessage ? (
        <div className="fixed right-6 top-24 z-50 max-w-sm rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 shadow-lg">
          {quickActionMessage}
        </div>
      ) : null}
      {addContactOpen ? (
        <AddContactModal
          onClose={() => setAddContactOpen(false)}
          onSaved={(contact) => navigate(`/contacts/${contact.slug ?? contact.id}`)}
          onSuccess={(message) => {
            setQuickActionMessage(message);
            window.setTimeout(() => setQuickActionMessage(''), 4000);
          }}
        />
      ) : null}

      <div className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white md:hidden">
        {navigation.slice(0, 5).map(({ label, path, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={cn(
              'grid place-items-center gap-1 py-3 text-xs font-bold text-slate-500',
              activeNavPath === path && 'text-emerald-600',
            )}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
};
