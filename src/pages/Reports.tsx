import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Calendar, IndianRupee, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { PageHeader } from '../components/layout/PageHeader';
import { TableSkeleton } from '../components/ui/Skeleton';
import { getInvoices, getSettings } from '../lib/storage';
import { formatCurrency, formatDateShort } from '../lib/utils';
import type { InvoiceData, UserSettings } from '../types';

export function Reports() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'reportable'>('all');
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => { 
    getInvoices().then(d => { setInvoices(d); setLoading(false); }); 
    getSettings().then(setSettings);
  }, []);

  const exportToExcel = () => {
    const companyStateCode = settings?.gstin?.slice(0, 2) || '';
    const data = shown.map(inv => {
      let subtotal = 0;
      let gstAmount = 0;
      const items = inv.items || [];
      items.forEach((item: any) => {
        const incRate = Number(item.inclusiveRate) || 0;
        const isService = inv.invoiceType === 'service' || settings?.invoiceFormat === 'service';
        const qty = isService ? 1 : (Number(item.qty) || 0);
        const isInclusive = item.isInclusive !== false;
        const taxableRate = isInclusive ? incRate / (1 + (item.gstRate / 100)) : incRate;
        const itemTaxableTotal = taxableRate * qty;
        subtotal += itemTaxableTotal;
        gstAmount += itemTaxableTotal * (item.gstRate / 100);
      });

      const loading = Number(inv.loadingCharges) || 0;
      const transport = Number(inv.transportCharges) || 0;
      const other = Number(inv.otherCharges) || 0;
      const hamali = Number(inv.hamali) || 0;

      const taxableValue = subtotal + loading + transport + other;

      const customerStateCode = inv.receiverStateCode || inv.receiverGstin?.slice(0, 2) || '';
      const isInterstate = companyStateCode && customerStateCode && companyStateCode !== customerStateCode;

      const cgst = isInterstate ? 0 : gstAmount / 2;
      const sgst = isInterstate ? 0 : gstAmount / 2;
      const igst = isInterstate ? gstAmount : 0;

      const primaryGstRate = items.length > 0 ? (items[0].gstRate || 0) : 0;

      return {
        'Invoice No': inv.invoiceNo,
        'Date': inv.dateOfSupply,
        'Customer Name': inv.receiverName,
        'GSTIN': inv.receiverGstin,
        'Place of Supply': inv.placeOfSupply,
        'Taxable Value': Number(taxableValue.toFixed(2)),
        'CGST': Number(cgst.toFixed(2)),
        'SGST': Number(sgst.toFixed(2)),
        'IGST': Number(igst.toFixed(2)),
        'Loading Charges': Number(loading.toFixed(2)),
        'Transport Charges': Number(transport.toFixed(2)),
        'Other Charges': Number(other.toFixed(2)),
        'Hamali': Number(hamali.toFixed(2)),
        'Total Amount': Number((inv.totalAmount || (taxableValue + gstAmount + hamali)).toFixed(2)),
        'GST Rate': primaryGstRate,
        'Reportable': inv.reportable ? 'Yes' : 'No'
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
    XLSX.writeFile(wb, `Sales_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const shown = filter === 'reportable' ? invoices.filter(i => i.reportable) : invoices;
  const total = shown.reduce((s, i) => s + (i.totalAmount || 0), 0);

  const monthly: Record<string, number> = {};
  shown.forEach(inv => {
    const month = inv.dateOfSupply?.slice(0, 7) || 'Unknown';
    monthly[month] = (monthly[month] || 0) + (inv.totalAmount || 0);
  });
  const monthlyData = Object.entries(monthly).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6);
  const maxMonthly = Math.max(...monthlyData.map(([, v]) => v), 1);

  return (
    <div className="page-container">
      <PageHeader title="Reports" subtitle="Revenue analytics" back icon={<BarChart3 size={18} />} 
        action={<button onClick={exportToExcel} className="btn-primary text-xs px-3 py-2"><Download size={14} /> Export</button>}
      />

      <div className="flex gap-2 mb-4">
        {(['all', 'reportable'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-accent-red text-white' : 'bg-bg-elevated text-content-muted border border-content-primary/10 hover:border-accent-red/30'}`}>
            {f === 'all' ? 'All Bills' : 'Reportable Only'}
          </button>
        ))}
      </div>

      {!loading && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1"><TrendingUp size={14} className="text-success" /><p className="text-[10px] font-bold text-content-muted uppercase tracking-wider">Total Earnings</p></div>
            <p className="text-base font-bold amount text-success">{formatCurrency(total)}</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-1"><IndianRupee size={14} className="text-accent-gold" /><p className="text-[10px] font-bold text-content-muted uppercase tracking-wider">Total Bills</p></div>
            <p className="text-base font-bold text-accent-gold">{shown.length}</p>
          </div>
        </div>
      )}

      {/* Monthly Bar Chart */}
      {!loading && monthlyData.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-4 mb-4">
          <div className="flex items-center gap-2 mb-4"><Calendar size={14} className="text-accent-red" /><p className="text-sm font-bold text-content-primary">Monthly Earnings</p></div>
          <div className="space-y-3">
            {monthlyData.map(([month, amount]) => (
              <div key={month} className="flex items-center gap-3">
                <p className="text-[10px] font-bold text-content-muted w-16 flex-shrink-0 uppercase tracking-tight">{month.slice(5)} '{month.slice(2, 4)}</p>
                <div className="flex-1 bg-bg-secondary rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(amount / maxMonthly) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-accent-red to-accent-crimson rounded-full"
                  />
                </div>
                <p className="text-xs font-bold amount text-content-primary w-20 text-right flex-shrink-0">{formatCurrency(amount)}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {loading ? <TableSkeleton rows={5} /> : (
        <div className="glass-card overflow-hidden">
          {shown.map((inv, i) => (
            <div key={inv.invoiceNo} className={`flex items-center justify-between px-4 py-4 ${i < shown.length - 1 ? 'border-b border-content-primary/[0.04]' : ''}`}>
              <div>
                <p className="text-sm font-bold text-content-primary truncate max-w-[160px]">{inv.receiverName}</p>
                <p className="text-[11px] font-medium text-content-muted mt-1">{inv.invoiceNo} · {formatDateShort(inv.dateOfSupply)}</p>
              </div>
              <p className="text-sm font-bold amount text-success">{formatCurrency(inv.totalAmount || 0)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
