import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Banknote,
  Building2,
  CalendarClock,
  Home,
  LineChart,
  Wrench,
} from 'lucide-react';
import { Badge, Card, Skeleton, StatCard } from '../../components/ui/Primitives';
import { crmService } from '../../services/crm';
import { formatCurrency } from '../../utils/cn';

export const DashboardPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: crmService.dashboard,
  });

  if (isLoading || !data) {
    return (
      <div className="grid gap-5 p-5 md:p-8">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36" />
          ))}
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.analytics.revenueTrend.map((item) => item.value));

  return (
    <div className="grid gap-6 p-5 md:p-8">
      <div>
        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
          Operations
        </p>
        <h1 className="mt-2 text-4xl font-black text-slate-950">Dashboard</h1>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Managed properties"
          value={data.kpis.properties}
          detail={`${data.kpis.occupancyRate}% occupancy`}
          icon={<Home size={22} />}
        />
        <StatCard
          label="Active leases"
          value={data.kpis.activeLeases}
          detail={`${data.kpis.expiringLeases} expiring soon`}
          icon={<CalendarClock size={22} />}
        />
        <StatCard
          label="Monthly revenue"
          value={formatCurrency(data.kpis.monthlyRevenue)}
          detail={`${data.kpis.overduePayments} overdue payments`}
          icon={<Banknote size={22} />}
        />
        <StatCard
          label="Open maintenance"
          value={data.kpis.openTickets}
          detail="Tickets requiring attention"
          icon={<Wrench size={22} />}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <Card className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Revenue analytics</h2>
              <p className="text-sm text-slate-500">Collected rent and reconciled transactions</p>
            </div>
            <Badge tone="green">Live</Badge>
          </div>
          <div className="flex h-72 items-end gap-4 border-b border-l border-slate-200 px-3 pb-3">
            {data.analytics.revenueTrend.map((item) => (
              <div key={item.label} className="grid flex-1 gap-2 text-center">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(item.value / maxRevenue) * 100}%` }}
                  className="min-h-8 rounded-t-md bg-slate-950"
                />
                <span className="text-xs font-bold text-slate-500">{item.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-emerald-50 text-emerald-600">
              <LineChart size={21} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950">Recent activity</h2>
              <p className="text-sm text-slate-500">Latest work across the branch</p>
            </div>
          </div>
          <div className="grid gap-3">
            {data.recentActivity.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-md border border-slate-200 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold text-slate-950">{activity.title}</h3>
                  <Badge tone="blue">{activity.type}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500">{activity.message}</p>
              </motion.div>
            ))}
          </div>
        </Card>
      </section>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-950">Branch health</h2>
            <p className="text-sm text-slate-500">
              Occupancy, rent collection, maintenance load, and expiry risk are tracked from protected APIs.
            </p>
          </div>
          <Badge tone="green">
            <Building2 size={13} /> All branches
          </Badge>
        </div>
      </Card>
    </div>
  );
};
