import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { AppShell } from '../../layouts/AppShell';
import {
  ForgotPasswordPage,
  LoginPage,
  ResetPasswordPage,
} from '../../modules/auth/AuthPages';
import {
  ContactDetailPage,
  ContactDirectoryPage,
  SellIntentWorkspacePage,
} from '../../modules/contacts/ContactPages';
import { CalendarPage } from '../../modules/calendar/CalendarPage';
import { DashboardPage } from '../../modules/dashboard/DashboardPage';
import { EntityPage } from '../../modules/entities/EntityPages';
import type { EntityKey } from '../../types/domain';

const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <AppShell /> : <Navigate to="/login" replace />;
};

const entity = (key: EntityKey) => <EntityPage key={key} entity={key} />;

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'contacts', element: <ContactDirectoryPage /> },
      { path: 'contacts/:id', element: <ContactDetailPage /> },
      {
        path: 'contacts/:id/sell-intent',
        element: <SellIntentWorkspacePage />,
      },
      { path: 'properties', element: entity('properties') },
      { path: 'tenants', element: entity('tenants') },
      { path: 'leases', element: entity('leases') },
      { path: 'payments', element: entity('payments') },
      { path: 'maintenance', element: entity('maintenance') },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'notifications', element: entity('notifications') },
      { path: 'users', element: entity('users') },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export const AppRouter = () => <RouterProvider router={router} />;
