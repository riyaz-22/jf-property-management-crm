import type { ReactNode } from 'react';
import { Building2 } from 'lucide-react';

export const AuthLayout = ({ children }: { children: ReactNode }) => (
  <main className="grid min-h-screen grid-cols-1 bg-slate-50 lg:grid-cols-[1fr_1.1fr]">
    <section className="hidden border-r border-slate-200 bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-lg border border-emerald-400/40 bg-emerald-400/10 text-lg font-black">
          JF
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-emerald-300">
            Property Management
          </p>
          <h1 className="text-2xl font-black">CRM Operations</h1>
        </div>
      </div>
      <div className="max-w-lg">
        <Building2 className="mb-6 text-emerald-300" size={42} />
        <p className="text-4xl font-black leading-tight">
          Manage instructions, tenancies, payments, and service workflows from one secure desk.
        </p>
      </div>
    </section>
    <section className="grid place-items-center px-5 py-10">{children}</section>
  </main>
);
