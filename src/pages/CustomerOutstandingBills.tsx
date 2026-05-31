import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { TableSkeleton } from '../components/ui/Skeleton';
import { getInvoices, getCustomers, getTransactions, getSettings } from '../lib/storage';
import { formatCurrency, formatDateShort } from '../lib/utils';
import type { InvoiceData, Customer, Transaction, UserSettings } from '../types';
import { FileText, AlertCircle, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Button } from '../components/ui/Button';

export function CustomerOutstandingBills() {
  const { customerId } = useParams<{ customerId: string }>();
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [bills, setBills] = useState<InvoiceData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const printRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([getCustomers(), getInvoices(), getTransactions(), getSettings()]).then(([custs, invs, txns, sets]) => {
      setCustomer(custs.find(c => c.id === customerId) || null);
      setBills(invs.filter(i => i.customerId === customerId));
      // Load all transactions for this customer to capture DR and CR
      setTransactions(txns.filter(t => t.customerId === customerId));
      setSettings(sets);
      setLoading(false);
    });
  }, [customerId]);

  // Total paid by this customer across all transactions
  const totalPaid = useMemo(() =>
    transactions.filter(t => t.type === 'CR').reduce((s, t) => s + t.amount, 0),
    [transactions]
  );

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

  const renderDate = (dateStr: string) => {
    if (!dateStr || dateStr === '—' || dateStr === 'Opening Balance') return '—';
    if (dateStr.split('-').length === 3) {
      try {
        return formatDateShort(dateStr);
      } catch {
        return dateStr;
      }
    }
    return dateStr;
  };

  // Compute per-bill outstanding by distributing payments against bills chronologically (FIFO)
  const billsWithOutstanding = useMemo(() => {
    interface DebitItem {
      invoiceNo: string;
      dateOfSupply: string;
      totalAmount: number;
      outstanding: number;
      type: 'opening_balance' | 'invoice' | 'debit_txn';
      timestamp: number;
    }

    const items: DebitItem[] = [];

    // 1. Opening Balance (always oldest)
    const opening = Number(customer?.openingBalance) || 0;
    if (opening > 0) {
      items.push({
        invoiceNo: 'Opening Balance',
        dateOfSupply: '—',
        totalAmount: opening,
        outstanding: 0,
        type: 'opening_balance',
        timestamp: 0, // lowest possible timestamp so it goes first
      });
    }

    // 2. Invoices
    bills.forEach(b => {
      items.push({
        invoiceNo: b.invoiceNo,
        dateOfSupply: b.dateOfSupply,
        totalAmount: b.totalAmount || 0,
        outstanding: 0,
        type: 'invoice',
        timestamp: parseDateStr(b.dateOfSupply),
      });
    });

    // 3. DR transactions (debits)
    transactions.filter(t => t.type === 'DR').forEach(t => {
      items.push({
        invoiceNo: t.particulars || 'Debit Entry',
        dateOfSupply: t.date,
        totalAmount: t.amount,
        outstanding: 0,
        type: 'debit_txn',
        timestamp: parseDateStr(t.date),
      });
    });

    // Sort chronologically (Opening Balance is first, then rest by timestamp)
    const sorted = items.sort((a, b) => {
      if (a.timestamp === 0) return -1;
      if (b.timestamp === 0) return 1;
      return a.timestamp - b.timestamp;
    });

    // Distribute totalPaid sequentially (FIFO)
    let remainingPaid = totalPaid;
    return sorted.map(item => {
      const amount = item.totalAmount;
      if (remainingPaid >= amount) {
        remainingPaid -= amount;
        return { ...item, outstanding: 0 };
      } else if (remainingPaid > 0) {
        const outstanding = amount - remainingPaid;
        remainingPaid = 0;
        return { ...item, outstanding };
      } else {
        return { ...item, outstanding: amount };
      }
    }).filter(item => item.outstanding > 0);
  }, [customer, bills, transactions, totalPaid]);

  const totalOutstanding = useMemo(() =>
    billsWithOutstanding.reduce((s, b) => s + b.outstanding, 0),
    [billsWithOutstanding]
  );

  const handleDownloadPDF = async () => {
    if (!printRef.current || !customer) return;
    setDownloading(true);
    try {
      printRef.current.style.display = 'block';
      const canvas = await html2canvas(printRef.current, { scale: 5, backgroundColor: '#ffffff' });
      printRef.current.style.display = 'none';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Statement_${customer.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error generating PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader 
        title={customer?.name || 'Outstanding Bills'} 
        subtitle="Unpaid invoices" 
        back 
        icon={<AlertCircle size={18} />} 
        action={<Button onClick={handleDownloadPDF} loading={downloading} size="sm" icon={<Download size={14} />}>PDF</Button>}
      />
      {!loading && (bills.length > 0 || (Number(customer?.openingBalance) || 0) > 0) && (
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
                <p className="text-sm font-semibold text-content-primary">{b.invoiceNo}</p>
                <p className="text-xs text-slate-500 mt-0.5">{renderDate(b.dateOfSupply)} · Billed: {formatCurrency(b.totalAmount || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold amount text-warning">{formatCurrency(b.outstanding)}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">outstanding</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Hidden Print Area */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <div ref={printRef} style={{ padding: '40px', backgroundColor: 'white', color: 'black', width: '800px', display: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#B91C1C', textTransform: 'uppercase' }}>
                {settings?.companyName || 'REGISTERED'}
              </h1>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#444', marginTop: '4px' }}>
                Proprietor: {settings?.proprietorName || ''}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', padding: '6px 12px', backgroundColor: '#FEF2F2', color: '#DC2626', borderRadius: '4px', fontWeight: '700', fontSize: '14px', marginBottom: '12px' }}>
                OUTSTANDING BILLS
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#fafafa' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666', textTransform: 'uppercase' }}>Customer Details</h3>
            <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>{customer?.name}</div>
            <div style={{ fontSize: '14px', color: '#555' }}>
              {customer?.address}<br />
              {customer?.state} ({customer?.stateCode})
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000', textAlign: 'left' }}>
                <th style={{ padding: '12px 8px' }}>Date</th>
                <th style={{ padding: '12px 8px' }}>Invoice No / Description</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Total Amount</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Pending Amount</th>
              </tr>
            </thead>
            <tbody>
              {billsWithOutstanding.map(b => (
                <tr key={b.invoiceNo} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px 8px' }}>{renderDate(b.dateOfSupply)}</td>
                  <td style={{ padding: '12px 8px', fontWeight: 'bold' }}>{b.invoiceNo}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>{formatCurrency(b.totalAmount || 0)}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold', color: '#DC2626' }}>{formatCurrency(b.outstanding)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} style={{ padding: '16px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>Total Outstanding:</td>
                <td style={{ padding: '16px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '18px', color: '#DC2626' }}>{formatCurrency(totalOutstanding)}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: '40px', textAlign: 'center', fontSize: '12px', color: '#888' }}>
            * This statement is calculated using the FIFO (First-In, First-Out) method.
          </div>
        </div>
      </div>
    </div>
  );
}
