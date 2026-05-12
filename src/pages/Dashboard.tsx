import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp, FileText, Users, Plus,
  IndianRupee, ArrowUpRight, Clock, CheckCircle,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { CardSkeleton } from '../components/ui/Skeleton';
import { getInvoices, getCustomers, getTransactions, calculateInvoiceTotal, getSettings } from '../lib/storage';
import { formatCurrency, formatDateShort } from '../lib/utils';
import type { InvoiceData, Transaction, UserSettings } from '../types';

interface Stats {
  totalRevenue: number;
  totalInvoices: number;
  totalCustomers: number;
  totalOutstanding: number;
  collectionRate: number;
  recentInvoices: InvoiceData[];
  recentTxns: Transaction[];
}

const statCards = (s: Stats) => [
  { label: 'Total Earnings', value: formatCurrency(s.totalRevenue), icon: TrendingUp, color: 'text-success', bg: 'bg-success/10', border: 'border-success/20', trend: '+12%' },
  { label: 'Total Bills', value: String(s.totalInvoices), icon: FileText, color: 'text-accent-red', bg: 'bg-accent-red/10', border: 'border-accent-red/20', trend: 'This year' },
  { label: 'Total Customers', value: String(s.totalCustomers), icon: Users, color: 'text-accent-gold', bg: 'bg-accent-gold/10', border: 'border-accent-gold/20', trend: 'Active' },
  { label: 'Due Payment', value: formatCurrency(s.totalOutstanding), icon: IndianRupee, color: 'text-danger', bg: 'bg-danger/10', border: 'border-danger/20', trend: 'Pending' },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } as any } };

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [invoices, customers, transactions, userSettings] = await Promise.all([getInvoices(), getCustomers(), getTransactions(), getSettings()]);
      setSettings(userSettings);
      
      const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totalAmount || calculateInvoiceTotal(inv)), 0);
      const totalPaid = transactions.filter(t => t.type === 'CR').reduce((sum, t) => sum + t.amount, 0);
      const collectionRate = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;
      
      setStats({
        totalRevenue: totalInvoiced,
        totalInvoices: invoices.length,
        totalCustomers: customers.length,
        totalOutstanding: Math.max(0, totalInvoiced - totalPaid),
        collectionRate,
        recentInvoices: invoices.slice(0, 5),
        recentTxns: transactions.slice(0, 5),
      });
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="page-container">
      <PageHeader
        title={settings?.companyName || 'Digital Laal Vahi'}
        subtitle={settings?.proprietorName ? `Welcome, ${settings.proprietorName}` : 'Business Overview & Summary'}
        action={
          <Link to="/new" className="btn-primary text-xs px-3 py-2 md:px-4 md:py-2.5">
            <Plus size={16} /> <span className="hidden sm:inline">Create Invoice</span><span className="sm:hidden">New Entry</span>
          </Link>
        }
      />

      {/* Stat Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[1,2,3,4].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards(stats!).map((card) => (
            <motion.div key={card.label} variants={item} className="card-premium p-5 lg:p-7 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-accent-red/5 to-transparent rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
              <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-2xl ${card.bg} border ${card.border} flex items-center justify-center mb-4`}>
                <card.icon size={20} className={card.color} />
              </div>
              <p className={`text-xl lg:text-2xl font-bold amount ${card.color}`}>{card.value}</p>
              <div className="flex items-center justify-between mt-1">
                <p className="text-xs lg:text-sm text-content-secondary font-medium">{card.label}</p>
                <p className="text-[10px] lg:text-xs text-content-muted font-bold uppercase tracking-wider">{card.trend}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Collection Progress */}
      {!loading && stats && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-5 mb-8 bg-gradient-to-br from-bg-card to-success/5 border-success/10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-content-primary">Payment Collection Efficiency</p>
            <p className="text-sm font-black text-success">{stats.collectionRate.toFixed(1)}%</p>
          </div>
          <div className="h-2.5 w-full bg-bg-secondary rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${stats.collectionRate}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-success to-green-500 rounded-full"
            />
          </div>
          <p className="text-[10px] text-content-muted mt-2 font-bold uppercase tracking-widest">Target: 100% Recovery</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-lg font-bold text-content-primary">Recent Bills</h2>
            <Link to="/invoices" className="text-xs text-accent-red flex items-center gap-1 font-bold hover:underline">
              View All Bills <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="bg-bg-card border border-content-primary/5 rounded-[2.5rem] overflow-hidden shadow-xl">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex justify-between">
                    <div className="space-y-1">
                      <div className="skeleton h-3 w-32 rounded" />
                      <div className="skeleton h-2 w-20 rounded" />
                    </div>
                    <div className="skeleton h-3 w-16 rounded" />
                  </div>
                ))}
              </div>
            ) : stats?.recentInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-content-secondary">
                <div className="w-20 h-20 rounded-full bg-accent-red/5 flex items-center justify-center mb-4">
                  <FileText size={32} className="opacity-20 text-accent-red" />
                </div>
                <p className="text-sm font-bold">Your ledger is empty</p>
                <Link to="/new" className="text-xs text-accent-red mt-2 hover:underline font-bold">Record your first entry</Link>
              </div>
            ) : stats?.recentInvoices.map((inv, idx) => {
              const isPaid = (stats.recentTxns.filter(t => t.customerId === inv.customerId && t.type === 'CR').reduce((s, t) => s + t.amount, 0)) >= (inv.totalAmount || 0);
              return (
              <Link
                key={inv.invoiceNo}
                to={`/preview/${encodeURIComponent(inv.invoiceNo)}`}
                className={`flex items-center gap-4 px-6 py-5 hover:bg-accent-red/[0.02] transition-colors ${idx < (stats.recentInvoices.length - 1) ? 'border-b border-content-primary/[0.04]' : ''}`}
              >
                <div className="w-12 h-12 rounded-2xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-accent-red" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-content-primary truncate">{inv.receiverName}</p>
                  <p className="text-xs text-content-muted font-bold tracking-tight uppercase mt-0.5">{inv.invoiceNo} · {formatDateShort(inv.dateOfSupply)}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold amount text-success">
                    {formatCurrency(inv.totalAmount || 0)}
                  </p>
                  <p className={`text-[10px] uppercase font-bold tracking-widest mt-0.5 ${isPaid ? 'text-success' : 'text-accent-red'}`}>
                    {isPaid ? 'Paid' : 'Pending'}
                  </p>
                </div>
              </Link>
              );
            })}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="lg:col-span-1">
          <h2 className="text-lg font-bold text-content-primary mb-4 px-2">Quick Tasks</h2>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            {[
              { label: 'New Entry', path: '/new', icon: Plus, color: 'from-accent-red to-accent-crimson', glow: 'shadow-glow-red', desc: 'Record a new business entry' },
              { label: 'Customers', path: '/customers', icon: Users, color: 'from-accent-gold to-accent-amber', glow: '', desc: 'Manage your customers' },
              { label: 'Outstandings', path: '/outstandings', icon: Clock, color: 'from-accent-red to-accent-crimson', glow: 'shadow-glow-red', desc: 'Track pending collections' },
              { label: 'Receipts', path: '/receipts', icon: CheckCircle, color: 'from-success to-green-600', glow: '', desc: 'Record payment completions' },
            ].map(({ label, path, icon: Icon, color, glow, desc }) => (
              <Link key={label} to={path}>
                <motion.div
                  whileHover={{ x: 6, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-bg-card border border-content-primary/5 rounded-[1.8rem] p-4 lg:p-5 flex items-center lg:items-start gap-3 lg:gap-4 hover:border-accent-red/20 transition-all duration-300 group h-full shadow-lg overflow-hidden"
                >
                  <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-[1rem] lg:rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center ${glow} flex-shrink-0 group-hover:rotate-6 transition-transform`}>
                    <Icon size={18} className="text-white lg:size-[22px]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm lg:text-base font-bold text-content-primary truncate">{label}</p>
                    <p className="hidden lg:block text-[11px] font-medium text-content-muted mt-1 line-clamp-1">{desc}</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
