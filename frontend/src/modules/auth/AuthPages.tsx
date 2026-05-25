import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, LockKeyhole, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useAuthStore } from '../../app/store/authStore';
import { Button, Card, TextInput } from '../../components/ui/Primitives';
import { authService } from '../../services/auth';
import { AuthLayout } from '../../layouts/AuthLayout';

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'Use at least 8 characters'),
});

const emailSchema = z.object({
  email: z.email(),
});

const resetSchema = z.object({
  token: z.string().min(10, 'Paste the reset token'),
  password: z.string().min(8, 'Use at least 8 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;
type EmailForm = z.infer<typeof emailSchema>;
type ResetForm = z.infer<typeof resetSchema>;

export const LoginPage = () => {
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: 'admin@jfcrm.local',
      password: 'Password123!',
    },
  });

  const login = useMutation({
    mutationFn: authService.login,
    onSuccess: (session) => {
      setSession(session);
      navigate('/');
    },
  });

  return (
    <AuthLayout>
      <Card className="w-full max-w-md p-8">
        <div className="mb-8">
          <div className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-white">
            <LockKeyhole size={22} />
          </div>
          <h1 className="text-3xl font-black text-slate-950">Sign in</h1>
          <p className="mt-2 text-sm text-slate-500">
            Access the JF Property Management CRM workspace.
          </p>
        </div>
        <form className="grid gap-4" onSubmit={handleSubmit((values) => login.mutate(values))}>
          <TextInput
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <TextInput
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" disabled={login.isPending} icon={<KeyRound size={18} />}>
            {login.isPending ? 'Signing in...' : 'Sign in securely'}
          </Button>
          <Link className="text-sm font-semibold text-emerald-700 hover:text-emerald-800" to="/forgot-password">
            Forgot password?
          </Link>
        </form>
      </Card>
    </AuthLayout>
  );
};

export const ForgotPasswordPage = () => {
  const [message, setMessage] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
  });

  const forgotPassword = useMutation({
    mutationFn: (values: EmailForm) => authService.forgotPassword(values.email),
    onSuccess: (response) => {
      setMessage(
        response.resetToken
          ? `Reset token generated: ${response.resetToken}`
          : response.message,
      );
    },
    onError: () => setMessage('Reset service is unavailable. Try again after the API starts.'),
  });

  return (
    <AuthLayout>
      <Card className="w-full max-w-md p-8">
        <Mail className="mb-5 text-emerald-600" size={34} />
        <h1 className="text-3xl font-black text-slate-950">Forgot password</h1>
        <p className="mt-2 text-sm text-slate-500">Enter the account email to create a reset token.</p>
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit((values) => forgotPassword.mutate(values))}>
          <TextInput label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Button type="submit" disabled={forgotPassword.isPending}>
            Send reset instructions
          </Button>
          {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{message}</p> : null}
          <Link className="text-sm font-semibold text-slate-600" to="/login">
            Back to sign in
          </Link>
        </form>
      </Card>
    </AuthLayout>
  );
};

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      token: searchParams.get('token') ?? '',
    },
  });

  const resetPassword = useMutation({
    mutationFn: (values: ResetForm) => authService.resetPassword(values.token, values.password),
    onSuccess: (response) => setMessage(response.message),
    onError: () => setMessage('Reset token could not be verified.'),
  });

  return (
    <AuthLayout>
      <Card className="w-full max-w-md p-8">
        <KeyRound className="mb-5 text-emerald-600" size={34} />
        <h1 className="text-3xl font-black text-slate-950">Reset password</h1>
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit((values) => resetPassword.mutate(values))}>
          <TextInput label="Reset token" error={errors.token?.message} {...register('token')} />
          <TextInput label="New password" type="password" error={errors.password?.message} {...register('password')} />
          <Button type="submit" disabled={resetPassword.isPending}>
            Update password
          </Button>
          {message ? <p className="rounded-md bg-slate-100 p-3 text-sm font-medium text-slate-700">{message}</p> : null}
          <Link className="text-sm font-semibold text-slate-600" to="/login">
            Back to sign in
          </Link>
        </form>
      </Card>
    </AuthLayout>
  );
};
