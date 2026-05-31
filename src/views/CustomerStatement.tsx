import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCustomers, getInvoices, getTransactions, getSettings } from '../lib/storage';
import type { Customer, UserSettings } from '../types';
import { Download, Share2, ArrowLeft } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface LedgerEntry {
  id: string;
  date: string;
  displayDate: string;
  particulars: string;
  type: 'Invoice' | 'Receipt';
  debit: number;
  credit: number;
  balance: number;
  rawDate: Date;
}

export function CustomerStatement() {
  const { customerId } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      if (!customerId) return;
      const [cData, iData, tData, sData] = await Promise.all([
        getCustomers(),
        getInvoices(),
        getTransactions(),
        getSettings()
      ]);
      setSettings(sData);

      const foundCustomer = cData.find(c => c.id === customerId);
      if (foundCustomer) setCustomer(foundCustomer);

      const customerInvoices = iData.filter(i => i.customerId === customerId);
      const customerTransactions = tData.filter(t => t.customerId === customerId);
      const customerReceipts = customerTransactions.filter(t => t.type === 'CR');
      const customerDebits = customerTransactions.filter(t => t.type === 'DR');

      const entries: Omit<LedgerEntry, 'balance'>[] = [];

      customerInvoices.forEach(inv => {
        let rawDate = new Date();
        const parts = inv.dateOfSupply.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) rawDate = new Date(`${parts[0]}-${parts[1]}-${parts[2]}T12:00:00`);
          else rawDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
        }
        
        entries.push({
          id: inv.invoiceNo,
          date: inv.dateOfSupply,
          displayDate: inv.dateOfSupply,
          particulars: `Invoice #${inv.invoiceNo}`,
          type: 'Invoice',
          debit: inv.totalAmount || 0,
          credit: 0,
          rawDate
        });
      });

      customerReceipts.forEach(rec => {
        let rawDate = new Date();
        const parts = rec.date.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) rawDate = new Date(`${parts[0]}-${parts[1]}-${parts[2]}T12:00:00`);
          else rawDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
        }
        
        entries.push({
          id: rec.id,
          date: rec.date,
          displayDate: rec.date,
          particulars: rec.particulars || `Receipt (${rec.mode}${rec.refNo ? ' ' + rec.refNo : ''})`,
          type: 'Receipt',
          debit: 0,
          credit: rec.amount,
          rawDate
        });
      });

      customerDebits.forEach(rec => {
        let rawDate = new Date();
        const parts = rec.date.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) rawDate = new Date(`${parts[0]}-${parts[1]}-${parts[2]}T12:00:00`);
          else rawDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
        }
        
        entries.push({
          id: rec.id,
          date: rec.date,
          displayDate: rec.date,
          particulars: rec.particulars || `Debit Charge (${rec.mode}${rec.refNo ? ' ' + rec.refNo : ''})`,
          type: 'Invoice',
          debit: rec.amount,
          credit: 0,
          rawDate
        });
      });

      // Sort chronological
      entries.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

      const opening = Number(foundCustomer?.openingBalance) || 0;
      let currentBalance = opening;
      const finalLedger: LedgerEntry[] = entries.map(entry => {
        currentBalance += entry.debit;
        currentBalance -= entry.credit;
        return { ...entry, balance: currentBalance };
      });

      setLedger(finalLedger);
      setLoading(false);
    }
    fetchData();
  }, [customerId]);

  const handleDownloadPDF = async () => {
    if (!printRef.current || !customer) return;
    
    try {
      const canvas = await html2canvas(printRef.current, { scale: 5 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Statement_${customer.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error generating PDF');
    }
  };

  const handleShare = async () => {
    if (!printRef.current || !customer) return;
    
    try {
      const canvas = await html2canvas(printRef.current, { scale: 5 });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `Statement_${customer.name.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });
        
        if (navigator.share) {
          await navigator.share({
            title: `Statement - ${customer.name}`,
            text: 'Please find your statement attached.',
            files: [file]
          });
        } else {
          alert('Web Share API is not supported in this browser. Please download the PDF instead.');
        }
      }, 'application/pdf');
    } catch (err) {
      console.error(err);
      alert('Error sharing statement');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!customer) return <div>Customer not found</div>;

  return (
    <div>
      <div className="header mb-4 print-hidden" style={{ position: 'relative', border: 'none', padding: 0, backgroundColor: 'transparent', boxShadow: 'none' }}>
        <h1 className="header-title">Customer Statement</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/outstandings" className="btn btn-secondary">
            <ArrowLeft size={16} /> Back
          </Link>
          <button className="btn btn-secondary" onClick={handleDownloadPDF}>
            <Download size={16} /> Download PDF
          </button>
          <button className="btn btn-primary" onClick={handleShare}>
            <Share2 size={16} /> Share
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: '20px' }}>
        <div className="invoice-print-container" ref={printRef} style={{ padding: '40px', backgroundColor: 'white', minWidth: '800px', borderRadius: '8px' }}>
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: 'var(--primary)', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
                {settings?.companyName || 'COMPANY NAME'}
              </h1>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#444', marginTop: '4px' }}>
                Proprietor: {settings?.proprietorName || ''}
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                {settings?.address || 'Company Address'}<br />
                <strong>GSTIN:</strong> {settings?.gstin || 'N/A'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', padding: '6px 12px', backgroundColor: '#E0E7FF', color: '#3730A3', borderRadius: '4px', fontWeight: '700', fontSize: '14px', marginBottom: '12px', letterSpacing: '1px' }}>
                STATEMENT OF ACCOUNT
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#F8F9FA', borderRadius: '8px', border: '1px solid #E4E4EB' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#8F90A6', letterSpacing: '1px' }}>Customer Details</h3>
            <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px', color: '#1C1C28' }}>{customer.name}</div>
            <div style={{ fontSize: '13px', color: '#444' }}>
              {customer.address}<br />
              {customer.state} ({customer.stateCode})
            </div>
            <div style={{ marginTop: '4px', fontSize: '13px' }}><strong>GSTIN:</strong> {customer.gstin}</div>
          </div>

          <table className="invoice-table">
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Date</th>
                <th style={{ width: '40%' }}>Particulars</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Debit (₹)</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Credit (₹)</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={2} style={{ fontWeight: 600 }}>Opening Balance</td>
                <td></td>
                <td></td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{opening.toFixed(2)}</td>
              </tr>
              {ledger.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.displayDate}</td>
                  <td>{entry.particulars}</td>
                  <td style={{ textAlign: 'right' }}>{entry.debit > 0 ? entry.debit.toFixed(2) : ''}</td>
                  <td style={{ textAlign: 'right', color: 'green' }}>{entry.credit > 0 ? entry.credit.toFixed(2) : ''}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: entry.balance > 0 ? 'red' : 'inherit' }}>
                    {Math.abs(entry.balance).toFixed(2)} {entry.balance > 0 ? 'Dr' : entry.balance < 0 ? 'Cr' : ''}
                  </td>
                </tr>
              ))}
              {ledger.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted">No transactions found for this customer.</td>
                </tr>
              )}
              <tr>
                <td colSpan={4} style={{ textAlign: 'right', fontWeight: 800 }}>Closing Balance:</td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: (ledger.length > 0 && ledger[ledger.length - 1].balance > 0) ? 'red' : 'inherit' }}>
                  {ledger.length > 0 ? Math.abs(ledger[ledger.length - 1].balance).toFixed(2) : '0.00'} 
                  {ledger.length > 0 && ledger[ledger.length - 1].balance > 0 ? ' Dr' : ledger.length > 0 && ledger[ledger.length - 1].balance < 0 ? ' Cr' : ''}
                </td>
              </tr>
            </tbody>
          </table>
          
          <div style={{ marginTop: '60px', textAlign: 'center', fontSize: '11px', color: '#888' }}>
            This is a computer generated statement and requires no signature.
          </div>
        </div>
      </div>
      <div style={{ height: '80px' }} className="print-hidden"></div>
    </div>
  );
}
