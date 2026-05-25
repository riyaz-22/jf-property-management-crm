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
  Edit3,
  ExternalLink,
  Filter,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { contacts } from '../../constants/demoData';
import type { ContactRecord, ContactRole } from '../../types/domain';
import { Badge, Button, Card } from '../../components/ui/Primitives';
import { cn } from '../../utils/cn';

const roleTone = (role: ContactRole) => {
  if (role === 'Vendor' || role === 'Landlord' || role === 'High Urgency') {
    return 'green';
  }
  if (role === 'Purchaser') {
    return 'amber';
  }
  if (role === 'Tenant') {
    return 'purple';
  }
  return 'blue';
};

const pendingClass = {
  danger: 'text-red-700',
  warning: 'text-amber-700',
  success: 'text-emerald-700',
  neutral: 'text-slate-500',
};

const ContactAvatar = ({ contact, large = false }: { contact: ContactRecord; large?: boolean }) => (
  <div
    className={cn(
      'grid place-items-center rounded-lg bg-blue-100 font-black text-slate-950',
      large ? 'h-20 w-20 text-2xl shadow-md ring-4 ring-white' : 'h-14 w-14 text-lg',
      contact.role === 'Tenant' && 'bg-emerald-200',
      contact.role === 'Company / Vendor' && 'bg-violet-600 text-white',
    )}
  >
    {contact.initials}
  </div>
);

const ContactHeader = ({ compact = false }: { compact?: boolean }) => (
  <Card className={cn('p-5 md:p-8', compact && 'rounded-none border-x-0 border-t-0 shadow-none')}>
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex gap-5">
        <img
          alt="Marcus Sterling"
          className="h-24 w-24 rounded-lg object-cover"
          src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=240&q=80"
        />
        <div>
          <h1 className="text-3xl font-black text-slate-950">Marcus Sterling</h1>
          <p className="mt-1 text-sm font-black uppercase text-slate-950">Vendor</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-600">
            <span className="inline-flex items-center gap-2"><Phone size={15} /> +44 7700 900 456</span>
            <span className="inline-flex items-center gap-2"><Mail size={15} /> sterling@marcus.io</span>
            <span className="inline-flex items-center gap-2"><UserRound size={15} /> Assigned: Alexander Thorne</span>
            <span className="inline-flex items-center gap-2"><MapPin size={15} /> 14 Cheltenham Place, Wilmslow, SK9 4AA</span>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">Associated contacts:</span>
            <Badge tone="green">Victoria Sterling <span className="rounded bg-emerald-100 px-1">Co-owner</span></Badge>
            <Badge tone="blue">Preston Conveyancing <span className="rounded bg-blue-100 px-1">Solicitor</span></Badge>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" icon={<Send size={17} />}>Email</Button>
        <Button variant="secondary" icon={<MessageSquare size={17} />}>SMS</Button>
        <Button icon={<CalendarCheck size={17} />}>Task</Button>
        <Button variant="secondary" icon={<ClipboardPlus size={17} />}>Add Notes</Button>
      </div>
    </div>
  </Card>
);

const InsightsPanel = ({ wide = false }: { wide?: boolean }) => (
  <Card className={cn('bg-slate-950 p-6 text-white shadow-2xl shadow-slate-300', wide && 'max-w-2xl')}>
    <div className="mb-5 flex items-center gap-3">
      <Zap className="text-emerald-300" size={22} />
      <h2 className="text-xl font-black">AI Co-Pilot Insights</h2>
    </div>
    <div className="grid gap-4">
      {[
        'No follow-up in 4 days. Recommend contacting vendor to maintain valuation momentum.',
        'Comparable band suggests strongest demand between £3.95M and £4.10M this week.',
        'Engagement is high. Vendor replies faster to SMS than email for scheduling updates.',
      ].map((item) => (
        <div key={item} className="rounded-md border border-white/10 bg-white/8 p-4 text-sm font-semibold leading-6 text-slate-100">
          {item}
        </div>
      ))}
    </div>
  </Card>
);

const ContactDrawer = ({ contact, onClose }: { contact: ContactRecord; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm">
    <motion.aside
      initial={{ x: 520 }}
      animate={{ x: 0 }}
      className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl"
    >
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <ContactAvatar contact={contact} large />
          <div>
            <h2 className="text-2xl font-black text-slate-950">{contact.name}</h2>
            <p className="mt-1 text-sm font-black text-emerald-600">Sole Vendor - Prime Listing</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" aria-label="Edit" className="grid h-10 w-10 place-items-center rounded-md hover:bg-slate-100">
            <Edit3 size={20} />
          </button>
          <button type="button" aria-label="Close" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-md hover:bg-slate-100">
            <X size={22} />
          </button>
        </div>
      </header>

      <section className="mt-8 rounded-lg bg-slate-900 p-6 text-white">
        <div className="mb-6 flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-400">
          <Sparkles size={18} className="text-emerald-300" /> Curator AI insights
        </div>
        <p className="text-xl font-semibold leading-8">
          Marcus has <span className="font-black text-emerald-300">instructed sole agency</span> on The Glass House.
          Portal saves are up 22% week-on-week; serious applicants are clustering in the £3.8M-£4.2M band.
        </p>
        <div className="mt-5 flex gap-2">
          <Badge tone="slate">Sole mandate</Badge>
          <Badge tone="slate">Chain free</Badge>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-emerald-700">Active intent: Vendor</h3>
          <Badge tone="green">Marketing Stage</Badge>
        </div>
        <Card className="border-emerald-200 p-5 shadow-emerald-100">
          {[
            ['Asking Price', '£4.00M'],
            ['Instruction', 'Sole Agency - Signed'],
            ['Property Address', 'The Glass House, Surrey'],
            ['Marketing', 'Live - Premium pack'],
            ['Target Exchange', 'Q1 (12-week window)'],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
              <span className="font-semibold text-slate-500">{label}</span>
              <span className="text-right font-black text-slate-950">{value}</span>
            </div>
          ))}
          <Link to="/contacts/marcus-sterling/sell-intent" className="mt-5 flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-500 text-sm font-black text-white shadow-lg shadow-emerald-200">
            <ExternalLink size={16} /> View Sell Mandate <ArrowRight size={17} />
          </Link>
        </Card>
      </section>

      <section className="mt-8">
        <h3 className="mb-3 text-sm font-black uppercase tracking-widest text-slate-500">Contact essentials</h3>
        <div className="grid gap-3">
          <Card className="p-4">
            <p className="text-xs font-black uppercase text-slate-400">Mobile</p>
            <p className="mt-1 text-lg font-black">{contact.phone}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-black uppercase text-slate-400">Email</p>
            <p className="mt-1 text-lg font-black">{contact.email}</p>
          </Card>
        </div>
      </section>
    </motion.aside>
  </div>
);

export const ContactDirectoryPage = () => {
  const [selected, setSelected] = useState<ContactRecord | null>(null);

  return (
    <div className="p-5 md:p-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Network &gt; Contact intelligence</p>
          <h1 className="mt-4 text-5xl font-black text-slate-950">Contact Directory</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon={<Filter size={18} />}>Filters</Button>
          <Button variant="secondary" icon={<ChevronDown size={18} />}>Export</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[48px_1.5fr_1fr_0.8fr_1fr_60px] bg-slate-100 px-5 py-5 text-xs font-black uppercase tracking-widest text-slate-500">
          <span />
          <span>Name & address</span>
          <span>Communication</span>
          <span>Last activity</span>
          <span>Pending actions</span>
          <span>Action</span>
        </div>
        <div className="divide-y divide-slate-100">
          {contacts.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => setSelected(contact)}
              className="grid w-full grid-cols-[48px_1.5fr_1fr_0.8fr_1fr_60px] items-center gap-4 px-5 py-7 text-left hover:bg-slate-50"
            >
              <span className="h-5 w-5 rounded border border-slate-300 bg-white" />
              <span className="flex items-center gap-5">
                <ContactAvatar contact={contact} />
                <span>
                  <span className="flex flex-wrap items-center gap-2 text-xl font-black text-slate-950">
                    {contact.name}
                    <Badge tone={roleTone(contact.role)}>{contact.role}</Badge>
                    {contact.secondaryRoles.map((role) => (
                      <Badge key={role} tone={roleTone(role)}>{role}</Badge>
                    ))}
                  </span>
                  <span className="mt-1 block font-semibold text-slate-500">{contact.address}</span>
                </span>
              </span>
              <span className="grid gap-2 font-semibold text-slate-700">
                <span className="inline-flex items-center gap-2"><Mail size={16} />{contact.email}</span>
                <span className="inline-flex items-center gap-2"><Phone size={16} />{contact.phone}</span>
              </span>
              <span>
                <span className="font-black text-slate-950">{contact.lastActivity}</span>
                <span className="mt-1 block text-sm font-medium italic text-slate-500">{contact.lastActivityNote}</span>
              </span>
              <span className={cn('font-black', pendingClass[contact.pendingTone])}>
                {contact.pendingAction}
              </span>
              <ArrowRight className="justify-self-end text-slate-500" />
            </button>
          ))}
        </div>
      </Card>
      {selected ? <ContactDrawer contact={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
};

export const ContactDetailPage = () => (
  <div>
    <div className="mx-auto max-w-6xl p-5 md:p-8">
      <ContactHeader compact />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Sales intent pipeline</h2>
              <Badge tone="green">Active mandate</Badge>
            </div>
            <div className="grid grid-cols-8 gap-3 text-center text-xs font-black uppercase text-slate-400">
              {['New enquiry', 'Qualified', 'Valuation', 'Instruction', 'Compliance', 'Listing', 'Live', 'Completed'].map((stage, index) => (
                <div key={stage} className="grid gap-2">
                  <span className={cn('mx-auto grid h-7 w-7 place-items-center rounded-full border', index <= 2 ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200')}>
                    {index <= 2 ? <Check size={14} /> : null}
                  </span>
                  {stage}
                </div>
              ))}
            </div>
          </Card>

          <Card className="overflow-hidden bg-slate-900 text-white">
            <div className="p-7">
              <h2 className="text-2xl font-black">Active Selling Intent</h2>
              <p className="mt-2 font-bold text-emerald-300">The Glass House - Sole mandate - Surrey</p>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Open the Sell intent workspace for valuation through reconciliation. Use Property valuation to jump straight to the valuation form.
              </p>
              <div className="mt-5 flex gap-3">
                <Link to="/contacts/marcus-sterling/sell-intent" className="rounded-md bg-emerald-500 px-4 py-3 text-sm font-black text-white">Open sell intent</Link>
                <Link to="/contacts/marcus-sterling/sell-intent" className="rounded-md border border-white/20 px-4 py-3 text-sm font-black text-white">Property valuation</Link>
              </div>
              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                {[
                  ['Expected price', '£4.00M'],
                  ['Stage', 'Valuation'],
                  ['Total views scheduled', '8'],
                  ['Views completed', '3'],
                  ['Views pending', '5'],
                  ['Max offer', '£4.08M'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</p>
                    <p className="mt-1 text-2xl font-black">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Mandate timeline</h2>
            </div>
            {['Stage: Qualified', 'Valuation booked', 'Note logged', 'Outbound call - 18 mins', 'Document uploaded - Agency agreement'].map((item) => (
              <div key={item} className="grid grid-cols-[140px_1fr] gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0">
                <span className="font-black text-slate-950">May 2026</span>
                <span>
                  <span className="font-black text-slate-950">{item}</span>
                  <span className="block text-sm text-slate-500">Vendor workspace updated by Alexander Thorne.</span>
                </span>
              </div>
            ))}
          </Card>
        </div>
        <div className="grid gap-6 self-start">
          <InsightsPanel />
          <Card className="p-5">
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-slate-500">Next actions</h2>
            <div className="grid gap-3">
              <label className="flex gap-3 rounded-md border border-slate-200 p-4 text-sm font-bold">
                <input type="checkbox" className="mt-1" /> Add property to inventory
              </label>
              <label className="flex gap-3 rounded-md border border-slate-200 p-4 text-sm font-bold">
                <input type="checkbox" className="mt-1" /> Complete sell intent workspace
              </label>
            </div>
          </Card>
        </div>
      </div>
    </div>
  </div>
);

const checklist = [
  'Run portal comparables (Rightmove / Zoopla)',
  'Check recent sold prices (Land Registry)',
  'Review local demand & stock levels',
  'Confirm tenure type (Freehold/Leasehold)',
  'Confirm access / key arrangements with vendor',
  'Note EPC requirement (needed before listing)',
  'Note any competing agents (if known)',
  'Agent preparation complete - ready to attend',
];

const stages = [
  'Property Valuation',
  'Fee Structure',
  'Instruction Document',
  'Instruction Agreed',
  'Compliance & AML Pack Issued',
  'Vendor AML & Risk Assessment',
  'Add Property',
  'Publish Property',
  'Viewings & Buyer Engagement',
  'Offer Received',
  'Memorandum of Sale Issued',
  'Sales Progression (Post-Agreement)',
  'Exchange of Contracts',
  'Completion & Payment',
];

const SchedulePanel = ({ onClose }: { onClose: () => void }) => (
  <div className="fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm">
    <motion.aside
      initial={{ x: 760 }}
      animate={{ x: 0 }}
      className="absolute right-0 top-0 flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl"
    >
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Property valuation</p>
          <h2 className="text-xl font-black">Schedule Valuation Appointment</h2>
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-md hover:bg-slate-100">
          <X size={20} />
        </button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-72 border-r border-slate-200 bg-slate-50 p-5">
          <p className="mb-4 text-sm font-black uppercase tracking-widest text-slate-500">Quick select</p>
          <div className="rounded-lg bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between font-black">
              <ChevronLeft size={16} /> May 2026 <ChevronRight size={16} />
            </div>
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-slate-500">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S', ...Array.from({ length: 31 }, (_, index) => String(index + 1))].map((day, index) => (
                <button key={`${day}-${index}`} type="button" className={cn('h-8 rounded-md', index > 6 && 'border border-slate-200 bg-white text-slate-950')}>
                  {day}
                </button>
              ))}
            </div>
          </div>
          <textarea className="mt-5 h-28 w-full rounded-md border border-slate-200 p-3 text-sm outline-none" placeholder="Key notes for the attending agent..." />
          <input className="mt-4 h-10 w-full rounded-md border border-slate-200 px-3 text-sm outline-none" placeholder="e.g. Savills attending..." />
        </aside>
        <section className="flex-1 overflow-auto p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-black">May 25 - May 31</h3>
            <Badge tone="green">No slot selected yet</Badge>
          </div>
          <div className="grid min-w-[780px] grid-cols-[90px_repeat(6,1fr)] overflow-hidden rounded-lg border border-slate-200 text-sm">
            {['Time', 'Mon 25', 'Tue 26', 'Wed 27', 'Thu 28', 'Fri 29', 'Sat 30'].map((head) => (
              <div key={head} className="bg-slate-100 px-3 py-3 font-black uppercase text-slate-500">{head}</div>
            ))}
            {['08:00', '09:00', '10:30', '11:30', '14:00', '16:00'].flatMap((time) => [
              <div key={time} className="border-t border-slate-200 px-3 py-3 font-black">{time}</div>,
              ...Array.from({ length: 6 }, (_, index) => (
                <button key={`${time}-${index}`} type="button" className="border-l border-t border-slate-200 px-3 py-3 font-semibold hover:bg-emerald-50">
                  Available
                </button>
              )),
            ])}
          </div>
        </section>
      </div>
      <footer className="flex justify-end gap-3 border-t border-slate-200 p-5">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button icon={<CalendarCheck size={18} />}>Confirm Appointment</Button>
      </footer>
    </motion.aside>
  </div>
);

export const SellIntentWorkspacePage = () => {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="p-5 md:p-8">
      <div className="mb-6">
        <button type="button" onClick={() => navigate('/contacts/marcus-sterling')} className="mb-4 inline-flex items-center gap-2 text-sm font-black text-slate-950">
          <ArrowLeft size={18} /> Marcus contact
        </button>
        <ContactHeader />
      </div>

      <h1 className="mb-4 text-4xl font-black">Sell intent workspace</h1>
      <div className="grid gap-6 xl:grid-cols-[380px_1fr_420px]">
        <Card className="self-start p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Mandate stages</h2>
            <button type="button" aria-label="Collapse" className="grid h-9 w-9 place-items-center rounded-md border border-slate-200"><ChevronLeft size={17} /></button>
          </div>
          <p className="mb-4 text-sm text-slate-500">New enquiry & qualified are complete on the contact record.</p>
          <div className="grid gap-2">
            {stages.map((stage, index) => (
              <button
                key={stage}
                type="button"
                className={cn('h-11 rounded-md border border-slate-200 bg-slate-100 px-4 text-left text-sm font-black text-slate-700', index === 0 && 'border-emerald-400 bg-slate-950 text-white')}
              >
                {stage}
              </button>
            ))}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-8">
            <div>
              <Badge tone="amber">Valuation pending</Badge>
              <h2 className="mt-5 text-3xl font-black">Property Valuation</h2>
              <p className="mt-2 max-w-xl text-slate-600">
                Schedule an on-site valuation to assess the property and set a realistic asking price for Marcus Sterling.
              </p>
            </div>
            <Button onClick={() => setScheduleOpen(true)} icon={<CalendarCheck size={18} />}>Schedule Valuation</Button>
          </div>
          <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-600">Pre-valuation checklist</h3>
              <Badge tone="green">0 / 8 done</Badge>
            </div>
            <div className="grid gap-6">
              {checklist.map((item) => (
                <label key={item} className="flex items-center gap-4 text-base font-semibold">
                  <input type="checkbox" className="h-5 w-5 rounded border-slate-300" />
                  {item}
                </label>
              ))}
            </div>
            <button type="button" className="mt-8 flex h-14 w-full items-center justify-between rounded-md border border-indigo-200 bg-indigo-50 px-5 text-sm font-black uppercase tracking-widest text-indigo-700">
              Property info (from sell intent)
              <ChevronDown size={18} />
            </button>
          </div>
        </Card>

        <InsightsPanel wide />
      </div>
      {scheduleOpen ? <SchedulePanel onClose={() => setScheduleOpen(false)} /> : null}
    </div>
  );
};
