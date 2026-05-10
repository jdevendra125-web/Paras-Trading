import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { FileText, IndianRupee, TrendingUp } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { TableSkeleton } from '../components/ui/Skeleton';
import { getInvoices, getCustomers, getTransactions } from '../lib/storage';
import { formatCurrency, formatDateShort } from '../lib/utils';
import type { InvoiceData, Customer, Transaction } from '../types';

export function CustomerStatement() {
  const { customerId } = useParams<{ customerId: string }>();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    Promise.all([getCustomers(), getInvoices(), getTransactions()]).then(([custs, invs, txns]) => {
      setCustomer(custs.find(c => c.id === customerId) || null);
      setInvoices(invs.filter(i => i.customerId === customerId));
      setTransactions(txns.filter(t => t.customerId === customerId));
      setLoading(false);
    });
  }, [customerId]);

  const totalBilled = useMemo(() => invoices.reduce((s, i) => s + (i.totalAmount || 0), 0), [invoices]);
  const totalPaid = useMemo(() => transactions.filter(t => t.type === 'CR').reduce((s, t) => s + t.amount, 0), [transactions]);
  const balance = totalBilled - totalPaid;

  type Entry = { date: string; description: string; debit: number; credit: number };
  const entries: Entry[] = useMemo(() => {
    const rows: Entry[] = [
      ...invoices.map(i => ({ date: i.dateOfSupply, description: `Invoice ${i.invoiceNo}`, debit: i.totalAmount || 0, credit: 0 })),
      ...transactions.filter(t => t.type === 'CR').map(t => ({ date: t.date, description: t.particulars || 'Payment received', debit: 0, credit: t.amount })),
    ];
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }, [invoices, transactions]);

  return (
    <div className="page-container">
      <PageHeader title={customer?.name || 'Statement'} subtitle="Account statement" back />

      {!loading && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Billed', value: formatCurrency(totalBilled), color: 'text-accent-blue' },
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
              <p className="text-xs text-slate-500">{formatDateShort(e.date)}</p>
              <p className="text-xs text-white truncate pr-2 col-span-1">{e.description}</p>
              <p className="text-xs amount text-neon-red">{e.debit > 0 ? formatCurrency(e.debit) : '-'}</p>
              <p className="text-xs amount text-neon-green">{e.credit > 0 ? formatCurrency(e.credit) : '-'}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
