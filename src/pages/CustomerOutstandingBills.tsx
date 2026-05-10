import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { TableSkeleton } from '../components/ui/Skeleton';
import { getInvoices, getCustomers } from '../lib/storage';
import { formatCurrency, formatDateShort } from '../lib/utils';
import type { InvoiceData, Customer } from '../types';
import { FileText, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export function CustomerOutstandingBills() {
  const { customerId } = useParams<{ customerId: string }>();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bills, setBills] = useState<InvoiceData[]>([]);

  useEffect(() => {
    Promise.all([getCustomers(), getInvoices()]).then(([custs, invs]) => {
      setCustomer(custs.find(c => c.id === customerId) || null);
      setBills(invs.filter(i => i.customerId === customerId));
      setLoading(false);
    });
  }, [customerId]);

  const total = bills.reduce((s, b) => s + (b.totalAmount || 0), 0);

  return (
    <div className="page-container">
      <PageHeader title={customer?.name || 'Outstanding Bills'} subtitle="Unpaid invoices" back icon={<AlertCircle size={18} />} />
      {!loading && bills.length > 0 && (
        <div className="glass-card p-4 flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center">
            <AlertCircle size={16} className="text-warning" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Outstanding</p>
            <p className="text-lg font-bold amount text-warning">{formatCurrency(total)}</p>
          </div>
        </div>
      )}
      {loading ? <TableSkeleton /> : bills.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-14">
          <FileText size={36} className="mb-3 opacity-30 text-slate-600" />
          <p className="text-sm text-slate-500">No outstanding bills</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          {bills.map((b, i) => (
            <div key={b.invoiceNo} className={`flex items-center justify-between px-4 py-3 ${i < bills.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
              <div>
                <p className="text-sm font-semibold text-white">{b.invoiceNo}</p>
                <p className="text-xs text-slate-500">{formatDateShort(b.dateOfSupply)}</p>
              </div>
              <p className="text-sm font-bold amount text-warning">{formatCurrency(b.totalAmount || 0)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
