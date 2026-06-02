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

interface DueBillItem {
  invoiceNo: string;
  dateOfSupply: string;
  receiverName: string;
  totalAmount: number;
  outstanding: number;
}

interface Stats {
  totalRevenue: number;
  totalInvoices: number;
  totalCustomers: number;
  totalOutstanding: number;
  collectionRate: number;
  longestDueBills: DueBillItem[];
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

const parseDateStr = (dateStr: string): number => {
  if (!dateStr) return 0;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return new Date(`${parts[0]}-${parts[1]}-${parts[2]}T12:00:00`).getTime();
    }
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`).getTime();
  }
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? 0 : parsed;
};

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
      
      // Calculate longest bills due
      const allDueBills: DueBillItem[] = [];

      customers.forEach(customer => {
        const customerInvoices = invoices.filter(inv => inv.customerId === customer.id);
        const customerTxns = transactions.filter(t => t.customerId === customer.id);
        const customerTotalPaid = customerTxns.filter(t => t.type === 'CR').reduce((sum, t) => sum + t.amount, 0);

        interface DebitItem {
          invoiceNo: string;
          dateOfSupply: string;
          totalAmount: number;
          outstanding: number;
          type: 'opening_balance' | 'invoice' | 'debit_txn';
          timestamp: number;
        }

        const items: DebitItem[] = [];

        // 1. Opening Balance
        const opening = Number(customer.openingBalance) || 0;
        if (opening > 0) {
          items.push({
            invoiceNo: 'Opening Balance',
            dateOfSupply: '—',
            totalAmount: opening,
            outstanding: 0,
            type: 'opening_balance',
            timestamp: 0,
          });
        }

        // 2. Invoices
        customerInvoices.forEach(b => {
          items.push({
            invoiceNo: b.invoiceNo,
            dateOfSupply: b.dateOfSupply,
            totalAmount: b.totalAmount || calculateInvoiceTotal(b),
            outstanding: 0,
            type: 'invoice',
            timestamp: parseDateStr(b.dateOfSupply),
          });
        });

        // 3. DR transactions
        customerTxns.filter(t => t.type === 'DR').forEach(t => {
          items.push({
            invoiceNo: t.particulars || 'Debit Entry',
            dateOfSupply: t.date,
            totalAmount: t.amount,
            outstanding: 0,
            type: 'debit_txn',
            timestamp: parseDateStr(t.date),
          });
        });

        // Sort chronologically (FIFO)
        const sorted = items.sort((a, b) => {
          if (a.timestamp === 0) return -1;
          if (b.timestamp === 0) return 1;
          return a.timestamp - b.timestamp;
        });

        // Distribute totalPaid sequentially (FIFO)
        let remainingPaid = customerTotalPaid;
        sorted.forEach(item => {
          const amount = item.totalAmount;
          let itemOutstanding = 0;
          if (remainingPaid >= amount) {
            remainingPaid -= amount;
            itemOutstanding = 0;
          } else if (remainingPaid > 0) {
            itemOutstanding = amount - remainingPaid;
            remainingPaid = 0;
          } else {
            itemOutstanding = amount;
          }

          if (itemOutstanding > 0.01 && item.type === 'invoice') {
            allDueBills.push({
              invoiceNo: item.invoiceNo,
              dateOfSupply: item.dateOfSupply,
              receiverName: customer.name,
              totalAmount: item.totalAmount,
              outstanding: itemOutstanding
            });
          }
        });
      });

      // Sort all due invoices by oldest first (longest due)
      const longestDueBills = allDueBills
        .sort((a, b) => parseDateStr(a.dateOfSupply) - parseDateStr(b.dateOfSupply))
        .slice(0, 5);

      setStats({
        totalRevenue: totalInvoiced,
        totalInvoices: invoices.length,
        totalCustomers: customers.length,
        totalOutstanding: Math.max(0, totalInvoiced - totalPaid),
        collectionRate,
        longestDueBills,
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
        {/* Longest Due Bills */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-lg font-bold text-content-primary">Longest Due Bills</h2>
            <Link to="/outstandings" className="text-xs text-accent-red flex items-center gap-1 font-bold hover:underline">
              View All Outstandings <ArrowUpRight size={14} />
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
            ) : stats?.longestDueBills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-content-secondary">
                <div className="w-20 h-20 rounded-full bg-accent-red/5 flex items-center justify-center mb-4">
                  <FileText size={32} className="opacity-20 text-accent-red" />
                </div>
                <p className="text-sm font-bold">No outstanding payments</p>
                <p className="text-xs text-slate-600 mt-1">All customers are up to date</p>
              </div>
            ) : stats?.longestDueBills.map((inv, idx) => {
              return (
              <Link
                key={inv.invoiceNo}
                to={`/preview/${encodeURIComponent(inv.invoiceNo)}`}
                className={`flex items-center gap-4 px-6 py-5 hover:bg-accent-red/[0.02] transition-colors ${idx < (stats.longestDueBills.length - 1) ? 'border-b border-content-primary/[0.04]' : ''}`}
              >
                <div className="w-12 h-12 rounded-2xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-accent-red" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-content-primary truncate">{inv.receiverName}</p>
                  <p className="text-xs text-content-muted font-bold tracking-tight uppercase mt-0.5">{inv.invoiceNo} · {formatDateShort(inv.dateOfSupply)}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold amount text-danger">
                    {formatCurrency(inv.outstanding)}
                  </p>
                  <p className="text-[10px] text-content-muted font-bold mt-0.5">
                    Total: {formatCurrency(inv.totalAmount)}
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
                    <Icon size={18} className="text-content-primary lg:size-[22px]" />
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
