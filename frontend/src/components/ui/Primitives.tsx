import type { HTMLAttributes, ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

let lockCount = 0;
let previousBodyOverflow = '';
let previousBodyPaddingRight = '';

export const useViewportOverlayLock = (active: boolean, onEscape?: () => void) => {
  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (lockCount === 0) {
      previousBodyOverflow = document.body.style.overflow;
      previousBodyPaddingRight = document.body.style.paddingRight;
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    lockCount += 1;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onEscape?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      lockCount = Math.max(lockCount - 1, 0);

      if (lockCount === 0) {
        document.body.style.overflow = previousBodyOverflow;
        document.body.style.paddingRight = previousBodyPaddingRight;
      }
    };
  }, [active, onEscape]);
};

export const Button = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  type = 'button',
  icon,
  onClick,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  type?: 'button' | 'submit';
  icon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <button
    type={type}
    disabled={disabled}
    onClick={onClick}
    className={cn(
      'inline-flex items-center justify-center gap-2 rounded-md border font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-60',
      size === 'sm' ? 'h-9 px-3 text-sm' : 'h-11 px-4 text-sm',
      variant === 'primary' && 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/10 hover:bg-slate-800',
      variant === 'secondary' && 'border-slate-200 bg-white text-slate-950 hover:bg-slate-50',
      variant === 'ghost' && 'border-transparent bg-transparent text-slate-600 hover:bg-slate-100',
      variant === 'danger' && 'border-red-500 bg-red-500 text-white hover:bg-red-600',
      className,
    )}
  >
    {icon}
    {children}
  </button>
);

export const Card = ({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLElement>) => (
  <section {...props} className={cn('rounded-lg border border-slate-200 bg-white shadow-sm', className)}>
    {children}
  </section>
);

export const Badge = ({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'green' | 'amber' | 'purple' | 'red' | 'blue';
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold uppercase tracking-wide',
      tone === 'slate' && 'border-slate-200 bg-slate-100 text-slate-600',
      tone === 'green' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
      tone === 'amber' && 'border-amber-200 bg-amber-50 text-amber-700',
      tone === 'purple' && 'border-violet-200 bg-violet-50 text-violet-700',
      tone === 'red' && 'border-red-200 bg-red-50 text-red-700',
      tone === 'blue' && 'border-sky-200 bg-sky-50 text-sky-700',
    )}
  >
    {children}
  </span>
);

export const TextInput = ({
  label,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
}) => (
  <label className={cn('grid gap-2 text-sm font-semibold text-slate-700', className)}>
    {label}
    <input
      {...props}
      className="h-11 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
    />
    {error ? <span className="text-xs text-red-600">{error}</span> : null}
  </label>
);

export const Modal = ({
  title,
  children,
  open,
  onClose,
}: {
  title: string;
  children: ReactNode;
  open: boolean;
  onClose: () => void;
}) => {
  useViewportOverlayLock(open, onClose);

  if (!open) {
    return null;
  }

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 grid min-h-dvh place-items-center overflow-y-auto overflow-x-hidden bg-slate-950/40 px-4 py-4 backdrop-blur-sm sm:py-6"
    >
      <Card
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden sm:max-h-[calc(100dvh-3rem)]"
      >
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <h2 id="app-modal-title" className="min-w-0 text-lg font-bold text-slate-950">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 overflow-y-auto overflow-x-hidden p-5">{children}</div>
      </Card>
    </div>
  );
};

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
};

export const DataTable = <T,>({
  rows,
  columns,
  emptyLabel = 'No records found',
}: {
  rows: T[];
  columns: Column<T>[];
  emptyLabel?: string;
}) => (
  <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="min-w-full text-left">
        <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
          <tr>
            {columns.map((column) => (
              <th key={column.header} className={cn('px-5 py-4', column.className)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="bg-white hover:bg-slate-50">
              {columns.map((column) => (
                <td key={column.header} className={cn('px-5 py-4 align-top', column.className)}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {rows.length === 0 ? (
      <div className="px-5 py-10 text-center text-sm text-slate-500">{emptyLabel}</div>
    ) : null}
  </div>
);

export const StatCard = ({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: ReactNode;
}) => (
  <Card className="p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
        <p className="mt-2 text-sm text-slate-500">{detail}</p>
      </div>
      <div className="grid h-11 w-11 place-items-center rounded-md bg-emerald-50 text-emerald-600">
        {icon}
      </div>
    </div>
  </Card>
);

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-md bg-slate-200', className)} />
);
