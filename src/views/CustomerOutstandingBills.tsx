import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCustomers, getInvoices, getTransactions, calculateInvoiceTotal, getSettings } from '../lib/storage';
import type { Customer, UserSettings } from '../types';
import { Download, ArrowLeft } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PendingBill {
  invoiceNo: string;
  date: string;
  totalAmount: number;
  pendingAmount: number;
  rawDate: Date;
}

export function CustomerOutstandingBills() {
  const { customerId } = useParams();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [pendingBills, setPendingBills] = useState<PendingBill[]>([]);
  const [totalPending, setTotalPending] = useState(0);
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
      const customerReceipts = tData.filter(t => t.customerId === customerId && t.type === 'CR');

      // Calculate total cash received
      let totalReceived = customerReceipts.reduce((sum, rec) => sum + rec.amount, 0);

      // Sort invoices from oldest to newest (FIFO)
      const sortedInvoices = customerInvoices.map(inv => {
        let rawDate = new Date();
        const parts = inv.dateOfSupply.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) rawDate = new Date(`${parts[0]}-${parts[1]}-${parts[2]}T12:00:00`);
          else rawDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
        }
        return {
          ...inv,
          calculatedTotal: inv.totalAmount || calculateInvoiceTotal(inv),
          rawDate
        };
      }).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

      const pending: PendingBill[] = [];

      for (const inv of sortedInvoices) {
        const invAmount = inv.calculatedTotal;
        if (totalReceived >= invAmount) {
          // Fully paid
          totalReceived -= invAmount;
        } else if (totalReceived > 0) {
          // Partially paid
          const remaining = invAmount - totalReceived;
          pending.push({
            invoiceNo: inv.invoiceNo,
            date: inv.dateOfSupply,
            totalAmount: invAmount,
            pendingAmount: remaining,
            rawDate: inv.rawDate
          });
          totalReceived = 0;
        } else {
          // Completely unpaid
          pending.push({
            invoiceNo: inv.invoiceNo,
            date: inv.dateOfSupply,
            totalAmount: invAmount,
            pendingAmount: invAmount,
            rawDate: inv.rawDate
          });
        }
      }

      setPendingBills(pending);
      setTotalPending(pending.reduce((sum, bill) => sum + bill.pendingAmount, 0));
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
      pdf.save(`PendingBills_${customer.name.replace(/\\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error generating PDF');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!customer) return <div>Customer not found</div>;

  return (
    <div>
      <div className="header mb-4 print-hidden" style={{ position: 'relative', border: 'none', padding: 0, backgroundColor: 'transparent', boxShadow: 'none' }}>
        <h1 className="header-title">Pending Bills (FIFO)</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to="/outstandings" className="btn btn-secondary">
            <ArrowLeft size={16} /> Back
          </Link>
          <button className="btn btn-primary" onClick={handleDownloadPDF}>
            <Download size={16} /> Download PDF
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
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', padding: '6px 12px', backgroundColor: '#FEF2F2', color: '#DC2626', borderRadius: '4px', fontWeight: '700', fontSize: '14px', marginBottom: '12px', letterSpacing: '1px' }}>
                OUTSTANDING BILLS
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
          </div>

          <table className="invoice-table">
            <thead>
              <tr>
                <th style={{ width: '15%' }}>Date</th>
                <th style={{ width: '25%' }}>Invoice No</th>
                <th style={{ width: '30%', textAlign: 'right' }}>Total Invoice Amount (₹)</th>
                <th style={{ width: '30%', textAlign: 'right' }}>Pending Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              {pendingBills.map((bill) => (
                <tr key={bill.invoiceNo}>
                  <td>{bill.date}</td>
                  <td>#{bill.invoiceNo.split('/').pop()}</td>
                  <td style={{ textAlign: 'right' }}>{bill.totalAmount.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'red' }}>
                    {bill.pendingAmount.toFixed(2)}
                  </td>
                </tr>
              ))}
              {pendingBills.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted" style={{ padding: '2rem' }}>No pending bills found for this customer.</td>
                </tr>
              )}
              {pendingBills.length > 0 && (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', fontWeight: 800 }}>Total Pending Amount:</td>
                  <td style={{ textAlign: 'right', fontWeight: 800, color: 'red' }}>
                    {totalPending.toFixed(2)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          
          <div style={{ marginTop: '60px', textAlign: 'center', fontSize: '11px', color: '#888' }}>
            * This statement is calculated using the FIFO (First-In, First-Out) method.
          </div>
        </div>
      </div>
      <div style={{ height: '80px' }} className="print-hidden"></div>
    </div>
  );
}
