import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { TableSkeleton } from '../components/ui/Skeleton';
import { getInvoices, getCustomers, getTransactions } from '../lib/storage';
import { formatCurrency, formatDateShort } from '../lib/utils';
import type { InvoiceData, Customer, Transaction } from '../types';
import { FileText, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export function CustomerOutstandingBills() {
  const { customerId } = useParams<{ customerId: string }>();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bills, setBills] = useState<InvoiceData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    Promise.all([getCustomers(), getInvoices(), getTransactions()]).then(([custs, invs, txns]) => {
      setCustomer(custs.find(c => c.id === customerId) || null);
      setBills(invs.filter(i => i.customerId === customerId));
      // Only credit (received) transactions for this customer
      setTransactions(txns.filter(t => t.customerId === customerId && t.type === 'CR'));
      setLoading(false);
    });
  }, [customerId]);

  // Total paid by this customer across all transactions
  const totalPaid = useMemo(() =>
    transactions.reduce((s, t) => s + t.amount, 0),
    [transactions]
  );

  // Compute per-bill outstanding by distributing payments against bills chronologically
  const billsWithOutstanding = useMemo(() => {
    const totalBilled = bills.reduce((s, b) => s + (b.totalAmount || 0), 0);
    let remaining = Math.max(0, totalBilled - totalPaid);

    // Distribute remaining against each bill oldest→newest
    const sorted = [...bills].sort((a, b) => a.dateOfSupply.localeCompare(b.dateOfSupply));
    return sorted.map(b => {
      const amount = b.totalAmount || 0;
      const outstanding = Math.min(amount, remaining);
      remaining = Math.max(0, remaining - outstanding);
      return { ...b, outstanding };
    }).filter(b => b.outstanding > 0); // Only truly unpaid bills
  }, [bills, totalPaid]);

  const totalOutstanding = useMemo(() =>
    billsWithOutstanding.reduce((s, b) => s + b.outstanding, 0),
    [billsWithOutstanding]
  );

  return (
    <div className="page-container">
      <PageHeader title={customer?.name || 'Outstanding Bills'} subtitle="Unpaid invoices" back icon={<AlertCircle size={18} />} />
      {!loading && bills.length > 0 && (
        <div className="glass-card p-4 flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center">
            <AlertCircle size={16} className="text-warning" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-500">Net Outstanding</p>
            <p className="text-lg font-bold amount text-warning">{formatCurrency(totalOutstanding)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Paid so far</p>
            <p className="text-sm font-bold amount text-success">{formatCurrency(totalPaid)}</p>
          </div>
        </div>
      )}
      {loading ? <TableSkeleton /> : billsWithOutstanding.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-14">
          <FileText size={36} className="mb-3 opacity-30 text-slate-600" />
          <p className="text-sm text-slate-500">No outstanding bills</p>
          <p className="text-xs text-slate-600 mt-1">All payments are settled</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          {billsWithOutstanding.map((b, i) => (
            <motion.div
              key={b.invoiceNo}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center justify-between px-4 py-3.5 ${i < billsWithOutstanding.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
            >
              <div>
                <p className="text-sm font-semibold text-white">{b.invoiceNo}</p>
                <p className="text-xs text-slate-500 mt-0.5">{formatDateShort(b.dateOfSupply)} · Billed: {formatCurrency(b.totalAmount || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold amount text-warning">{formatCurrency(b.outstanding)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">outstanding</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
