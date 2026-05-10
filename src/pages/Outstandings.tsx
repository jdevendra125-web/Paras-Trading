import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IndianRupee, AlertCircle, ArrowUpRight } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { TableSkeleton } from '../components/ui/Skeleton';
import { getInvoices, getTransactions, getCustomers } from '../lib/storage';
import { formatCurrency, formatDateShort } from '../lib/utils';
import type { InvoiceData, Customer, Transaction } from '../types';

export function Outstandings() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    Promise.all([getInvoices(), getCustomers(), getTransactions()]).then(([invs, custs, txns]) => {
      setInvoices(invs); setCustomers(custs); setTransactions(txns); setLoading(false);
    });
  }, []);

  const customerMap = useMemo(() => Object.fromEntries(customers.map(c => [c.id, c])), [customers]);

  const outstandingData = useMemo(() => {
    const paidMap: Record<string, number> = {};
    transactions.filter(t => t.type === 'CR').forEach(t => {
      if (t.customerId) paidMap[t.customerId] = (paidMap[t.customerId] || 0) + t.amount;
    });
    const invoiceMap: Record<string, { customer: Customer | undefined; invoices: InvoiceData[]; total: number; paid: number }> = {};
    invoices.forEach(inv => {
      const cid = inv.customerId || 'unknown';
      if (!invoiceMap[cid]) invoiceMap[cid] = { customer: customerMap[cid], invoices: [], total: 0, paid: paidMap[cid] || 0 };
      invoiceMap[cid].invoices.push(inv);
      invoiceMap[cid].total += inv.totalAmount || 0;
    });
    return Object.values(invoiceMap)
      .map(d => ({ ...d, outstanding: Math.max(0, d.total - d.paid) }))
      .filter(d => d.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [invoices, customers, transactions]);

  const totalOutstanding = useMemo(() => outstandingData.reduce((s, d) => s + d.outstanding, 0), [outstandingData]);

  return (
    <div className="page-container">
      <PageHeader title="Outstanding" subtitle="Pending payments" icon={<IndianRupee size={18} />} />

      {!loading && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 flex items-center gap-3 mb-4 border-warning/20">
          <div className="w-9 h-9 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center">
            <AlertCircle size={16} className="text-warning" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Outstanding</p>
            <p className="text-lg font-bold amount text-warning">{formatCurrency(totalOutstanding)}</p>
          </div>
        </motion.div>
      )}

      {loading ? <TableSkeleton rows={5} /> : outstandingData.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-14">
          <IndianRupee size={36} className="mb-3 opacity-30 text-slate-600" />
          <p className="text-sm text-slate-500">No outstanding payments</p>
          <p className="text-xs text-slate-600 mt-1">All customers are up to date</p>
        </div>
      ) : (
        <div className="space-y-2">
          {outstandingData.map((d, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card-hover p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{d.customer?.name || 'Unknown Customer'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{d.invoices.length} invoice{d.invoices.length > 1 ? 's' : ''} · Billed: {formatCurrency(d.total)}</p>
                  <p className="text-xs text-slate-500">Paid: <span className="text-neon-green">{formatCurrency(d.paid)}</span></p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold amount text-warning">{formatCurrency(d.outstanding)}</p>
                  {d.customer && (
                    <Link to={`/outstanding-bills/${d.customer.id}`} className="text-xs text-accent-blue flex items-center gap-0.5 mt-1 justify-end hover:underline">
                      View <ArrowUpRight size={11} />
                    </Link>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
