import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInvoices, getCustomers, getTransactions, getBankAccounts } from '../lib/storage';
import type { InvoiceData, Transaction, BankAccount } from '../types';
import { FileText, Plus, Users, IndianRupee, Banknote } from 'lucide-react';

export function Dashboard() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const [invData, custData, txData, bankData] = await Promise.all([
          getInvoices(), 
          getCustomers(),
          getTransactions(),
          getBankAccounts()
        ]);
        setInvoices(invData);
        setCustomerCount(custData.length);
        setTransactions(txData);
        setBankAccounts(bankData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const calculateTotal = (invoice: InvoiceData) => {
    let subtotal = 0;
    let gst = 0;
    
    invoice.items.forEach(item => {
      const incRate = Number(item.inclusiveRate) || 0;
      const qty = Number(item.qty) || 1; // Default to 1 to match DB storage
      const isInclusive = item.isInclusive !== false;
      const taxableRate = isInclusive ? incRate / (1 + (item.gstRate / 100)) : incRate;
      const itemTaxableTotal = taxableRate * qty;
      subtotal += itemTaxableTotal;
      gst += itemTaxableTotal * (item.gstRate / 100);
    });
    
    const loadingCharge = Number(invoice.loadingCharges) || 0;
    const transport = Number(invoice.transportCharges) || 0;
    const other = Number(invoice.otherCharges) || 0;
    const hamali = Number(invoice.hamali) || 0;

    const taxableAmount = subtotal + loadingCharge + transport + other;
    const total = taxableAmount + gst + hamali;
    return Math.round(total);
  };

  // Metrics Calculations
  const totalRevenue = invoices.reduce((sum, inv) => sum + calculateTotal(inv), 0);
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  const thisMonthRevenue = invoices.reduce((sum, inv) => {
    const parts = inv.dateOfSupply.split('-');
    if (parts.length === 3) {
      const invMonth = parseInt(parts[1], 10);
      const invYear = parseInt(parts[2], 10);
      if (invMonth === currentMonth && invYear === currentYear) {
        return sum + calculateTotal(inv);
      }
    }
    return sum;
  }, 0);

  let bankBalance = bankAccounts.reduce((sum, b) => sum + b.openingBalance, 0);
  let cashBalance = 0;

  transactions.forEach(tx => {
    if (tx.mode === 'Bank') {
      bankBalance += (tx.type === 'CR' ? tx.amount : -tx.amount);
    } else if (tx.mode === 'Cash') {
      cashBalance += (tx.type === 'CR' ? tx.amount : -tx.amount);
    }
  });

  const recentInvoices = invoices.slice(0, 5);

  return (
    <div style={{ paddingBottom: '2rem' }}>
      {/* Header Area */}
      <div className="mb-4 mt-2 px-2 flex justify-between items-center">
        <div>
          <p className="text-muted text-sm font-medium">Welcome back 👋</p>
          <h1 className="font-bold text-xl">Overview</h1>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
          A
        </div>
      </div>

      {loading ? (
        <div className="text-center p-4 text-muted">Loading data...</div>
      ) : (
        <>
          {/* Main Balance Card */}
          <div className="card mb-4" style={{ background: 'var(--primary-gradient)', color: 'white', border: 'none' }}>
            <div className="card-body">
              <p className="text-sm" style={{ opacity: 0.9 }}>Total Bank Balance</p>
              <h2 className="text-2xl font-bold mt-1">₹ {bankBalance.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
              <div className="mt-4 flex justify-between items-center text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.15)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Banknote size={16} /> Cash
                </span>
                <span className="font-semibold">₹ {cashBalance.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <h3 className="text-sm font-bold text-muted uppercase mb-3 px-1">Quick Actions</h3>
          <div className="grid-3 mb-4">
            <div onClick={() => navigate('/new')} className="card" style={{ marginBottom: 0, border: 'none', cursor: 'pointer', backgroundColor: '#E0E7FF' }}>
              <div className="card-body flex flex-col items-center justify-center p-4 text-center gap-2">
                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#C7D2FE', color: '#4338CA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={18} />
                </div>
                <span className="text-xs font-bold text-primary">Invoice</span>
              </div>
            </div>
            <div onClick={() => navigate('/receipts')} className="card" style={{ marginBottom: 0, border: 'none', cursor: 'pointer', backgroundColor: '#DCFCE7' }}>
              <div className="card-body flex flex-col items-center justify-center p-4 text-center gap-2">
                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#BBF7D0', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <IndianRupee size={18} />
                </div>
                <span className="text-xs font-bold text-success">Receipt</span>
              </div>
            </div>
            <div onClick={() => navigate('/customers')} className="card" style={{ marginBottom: 0, border: 'none', cursor: 'pointer', backgroundColor: '#FEF3C7' }}>
              <div className="card-body flex flex-col items-center justify-center p-4 text-center gap-2">
                <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: '#FDE68A', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={18} />
                </div>
                <span className="text-xs font-bold text-warning">Customer</span>
              </div>
            </div>
          </div>

          {/* Horizontal Scroll Stats */}
          <h3 className="text-sm font-bold text-muted uppercase mb-3 px-1">Statistics</h3>
          <div className="h-scroll mb-4">
            <div className="card" style={{ minWidth: '150px', marginBottom: 0, flexShrink: 0 }}>
              <div className="card-body p-4">
                <div className="text-xs font-semibold text-muted mb-1">Total Revenue</div>
                <div className="text-lg font-bold text-main">₹{totalRevenue.toLocaleString('en-IN')}</div>
              </div>
            </div>
            <div className="card" style={{ minWidth: '150px', marginBottom: 0, flexShrink: 0 }}>
              <div className="card-body p-4">
                <div className="text-xs font-semibold text-muted mb-1">This Month</div>
                <div className="text-lg font-bold text-success">₹{thisMonthRevenue.toLocaleString('en-IN')}</div>
              </div>
            </div>
            <div className="card" style={{ minWidth: '150px', marginBottom: 0, flexShrink: 0 }}>
              <div className="card-body p-4">
                <div className="text-xs font-semibold text-muted mb-1">Invoices</div>
                <div className="text-lg font-bold text-primary">{invoices.length}</div>
              </div>
            </div>
            <div className="card" style={{ minWidth: '150px', marginBottom: 0, flexShrink: 0 }}>
              <div className="card-body p-4">
                <div className="text-xs font-semibold text-muted mb-1">Customers</div>
                <div className="text-lg font-bold text-warning">{customerCount}</div>
              </div>
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="flex justify-between items-center mb-3 px-1 mt-2">
            <h3 className="text-sm font-bold text-muted uppercase">Recent Invoices</h3>
            {invoices.length > 5 && (
              <button className="text-primary text-xs font-bold border-none" style={{ background: 'none' }} onClick={() => navigate('/invoices')}>
                See All
              </button>
            )}
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: '0.5rem 1.25rem' }}>
              {invoices.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <p className="text-sm">No invoices found.</p>
                </div>
              ) : (
                recentInvoices.map((inv) => (
                  <div 
                    key={inv.invoiceNo} 
                    className="list-row"
                    onClick={() => navigate(`/preview/${encodeURIComponent(inv.invoiceNo)}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div style={{ width: 36, height: 36, borderRadius: '8px', backgroundColor: '#F1F5F9', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={18} />
                      </div>
                      <div className="flex-col">
                        <span className="font-semibold text-sm truncate" style={{ maxWidth: '140px' }}>{inv.receiverName}</span>
                        <span className="text-xs text-muted">#{inv.invoiceNo.split('/').pop()}</span>
                      </div>
                    </div>
                    <div className="flex-col items-end text-right">
                      <span className="font-bold text-sm">₹{calculateTotal(inv)}</span>
                      <span className="text-xs text-muted">{inv.dateOfSupply}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
