import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { FileText, IndianRupee, TrendingUp } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { TableSkeleton } from '../components/ui/Skeleton';
import { getInvoices, getCustomers, getTransactions } from '../lib/storage';
import { formatCurrency, formatDateShort, shareToWhatsApp } from '../lib/utils';
import { getSettings } from '../lib/storage';
import { Printer, Share2 } from 'lucide-react';
import type { InvoiceData, Customer, Transaction, UserSettings } from '../types';

export function CustomerStatement() {
  const { customerId } = useParams<{ customerId: string }>();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    Promise.all([getCustomers(), getInvoices(), getTransactions(), getSettings()]).then(([custs, invs, txns, sets]) => {
      setCustomer(custs.find(c => c.id === customerId) || null);
      setInvoices(invs.filter(i => i.customerId === customerId));
      setTransactions(txns.filter(t => t.customerId === customerId));
      setSettings(sets);
      setLoading(false);
    });
  }, [customerId]);

  const handleWhatsApp = () => {
    if (!customer) return;
    const text = `Greetings from ${settings?.companyName || 'Paras Trading'}.\n\nStatement for: ${customer.name}\nOutstanding Balance: ${formatCurrency(balance)}\n\nPlease find the details below.\nThank you!`;
    shareToWhatsApp(customer.phone || '', text);
  };

  const totalBilled = useMemo(() => invoices.reduce((s, i) => s + (i.totalAmount || 0), 0), [invoices]);
  const totalDR = useMemo(() => transactions.filter(t => t.type === 'DR').reduce((s, t) => s + t.amount, 0), [transactions]);
  const totalPaid = useMemo(() => transactions.filter(t => t.type === 'CR').reduce((s, t) => s + t.amount, 0), [transactions]);
  const opening = Number(customer?.openingBalance) || 0;
  const balance = (opening + totalBilled + totalDR) - totalPaid;

  type Entry = { date: string; description: string; debit: number; credit: number };
  const entries: Entry[] = useMemo(() => {
    const rows: Entry[] = [];

    // Add Opening Balance
    if (opening > 0) {
      rows.push({
        date: '—',
        description: 'Opening Balance',
        debit: opening,
        credit: 0
      });
    }

    // Add Invoices
    invoices.forEach(i => {
      rows.push({
        date: i.dateOfSupply,
        description: `Invoice ${i.invoiceNo}`,
        debit: i.totalAmount || 0,
        credit: 0
      });
    });

    // Add Transactions (CR and DR)
    transactions.forEach(t => {
      if (t.type === 'CR') {
        rows.push({
          date: t.date,
          description: t.particulars || 'Payment received',
          debit: 0,
          credit: t.amount
        });
      } else {
        rows.push({
          date: t.date,
          description: t.particulars || 'Debit charge',
          debit: t.amount,
          credit: 0
        });
      }
    });

    // Sort by date (Opening Balance must be first)
    return rows.sort((a, b) => {
      if (a.date === '—') return -1;
      if (b.date === '—') return 1;
      return a.date.localeCompare(b.date);
    });
  }, [customer, invoices, transactions, opening]);

  return (
    <div className="page-container">
      <PageHeader title={customer?.name || 'Statement'} subtitle="Account statement" back
        action={
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="w-10 h-10 rounded-xl bg-bg-secondary border border-content-primary/5 flex items-center justify-center text-content-primary hover:bg-bg-elevated"><Printer size={18} /></button>
            <button onClick={handleWhatsApp} className="btn-primary text-xs px-3 py-2"><Share2 size={16} /> Share</button>
          </div>
        }
      />

      <div className="print:block hidden mb-8 text-black">
        <h1 className="text-2xl font-bold uppercase">{settings?.companyName}</h1>
        <p className="text-xs">{settings?.address}</p>
        <p className="text-xs font-bold mt-1">GSTIN: {settings?.gstin}</p>
        <div className="h-px bg-gray-200 my-4" />
        <p className="text-sm font-bold">Party Statement: {customer?.name}</p>
        <p className="text-xs">Period: All Transactions</p>
      </div>

      {!loading && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Billed', value: formatCurrency(opening + totalBilled + totalDR), color: 'text-accent-blue' },
            { label: 'Paid', value: formatCurrency(totalPaid), color: 'text-neon-green' },
            { label: 'Balance', value: formatCurrency(balance), color: balance > 0 ? 'text-warning' : 'text-neon-green' },
          ].map(s => (
            <div key={s.label} className="glass-card p-3 text-center">
              <p className={`text-sm font-bold amount ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? <TableSkeleton rows={6} /> : (
        <div className="glass-card overflow-hidden">
          <div className="grid grid-cols-4 px-4 py-2 bg-white/[0.02] border-b border-white/[0.06]">
            {['Date', 'Description', 'Debit', 'Credit'].map(h => (
              <p key={h} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{h}</p>
            ))}
          </div>
          {entries.map((e, i) => (
            <div key={i} className={`grid grid-cols-4 px-4 py-2.5 items-center ${i < entries.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
              <p className="text-xs text-slate-500">{e.date === '—' ? '—' : formatDateShort(e.date)}</p>
              <p className="text-xs text-content-primary truncate pr-2 col-span-1">{e.description}</p>
              <p className="text-xs amount text-neon-red">{e.debit > 0 ? formatCurrency(e.debit) : '-'}</p>
              <p className="text-xs amount text-neon-green">{e.credit > 0 ? formatCurrency(e.credit) : '-'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
