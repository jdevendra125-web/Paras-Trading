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
      // Only credit (received) transactions for this customer
      setTransactions(txns.filter(t => t.customerId === customerId && t.type === 'CR'));
      setSettings(sets);
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

  const handleDownloadPDF = async () => {
    if (!printRef.current || !customer) return;
    setDownloading(true);
    try {
      printRef.current.style.display = 'block';
      const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: '#ffffff' });
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
                <p className="text-sm font-semibold text-content-primary">{b.invoiceNo}</p>
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
                <th style={{ padding: '12px 8px' }}>Invoice No</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Invoice Amount</th>
                <th style={{ padding: '12px 8px', textAlign: 'right' }}>Pending Amount</th>
              </tr>
            </thead>
            <tbody>
              {billsWithOutstanding.map(b => (
                <tr key={b.invoiceNo} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px 8px' }}>{formatDateShort(b.dateOfSupply)}</td>
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
