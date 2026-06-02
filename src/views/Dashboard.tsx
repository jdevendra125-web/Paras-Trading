import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInvoices, getCustomers, getTransactions, getBankAccounts } from '../lib/storage';
import type { InvoiceData, Transaction, BankAccount, Customer } from '../types';
import { FileText, Plus, Users, IndianRupee, Banknote, ArrowUpRight } from 'lucide-react';

interface DueBillItem {
  invoiceNo: string;
  dateOfSupply: string;
  receiverName: string;
  totalAmount: number;
  outstanding: number;
}

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

export function Dashboard() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
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
        setCustomers(custData);
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

  // Calculate longest bills due
  const longestDueBills = (() => {
    if (loading) return [];
    const allDueBills: DueBillItem[] = [];

    customers.forEach(customer => {
      const customerInvoices = invoices.filter(inv => inv.customerId === customer.id);
      const customerTxns = transactions.filter(t => t.customerId === customer.id);
      const customerTotalPaid = customerTxns.filter(t => t.type === 'CR').reduce((sum, t) => sum + t.amount, 0);

      interface DebitItem {
        invoiceNo: string;
        dateOfSupply: string;
        totalAmount: number;
        outstanding: number;
        type: 'opening_balance' | 'invoice' | 'debit_txn';
        timestamp: number;
      }

      const items: DebitItem[] = [];

      // 1. Opening Balance
      const opening = Number(customer.openingBalance) || 0;
      if (opening > 0) {
        items.push({
          invoiceNo: 'Opening Balance',
          dateOfSupply: '—',
          totalAmount: opening,
          outstanding: 0,
          type: 'opening_balance',
          timestamp: 0,
        });
      }

      // 2. Invoices
      customerInvoices.forEach(b => {
        items.push({
          invoiceNo: b.invoiceNo,
          dateOfSupply: b.dateOfSupply,
          totalAmount: b.totalAmount || calculateTotal(b),
          outstanding: 0,
          type: 'invoice',
          timestamp: parseDateStr(b.dateOfSupply),
        });
      });

      // 3. DR transactions
      customerTxns.filter(t => t.type === 'DR').forEach(t => {
        items.push({
          invoiceNo: t.particulars || 'Debit Entry',
          dateOfSupply: t.date,
          totalAmount: t.amount,
          outstanding: 0,
          type: 'debit_txn',
          timestamp: parseDateStr(t.date),
        });
      });

      // Sort chronologically (FIFO)
      const sorted = items.sort((a, b) => {
        if (a.timestamp === 0) return -1;
        if (b.timestamp === 0) return 1;
        return a.timestamp - b.timestamp;
      });

      // Distribute totalPaid sequentially (FIFO)
      let remainingPaid = customerTotalPaid;
      sorted.forEach(item => {
        const amount = item.totalAmount;
        let itemOutstanding = 0;
        if (remainingPaid >= amount) {
          remainingPaid -= amount;
          itemOutstanding = 0;
        } else if (remainingPaid > 0) {
          itemOutstanding = amount - remainingPaid;
          remainingPaid = 0;
        } else {
          itemOutstanding = amount;
        }

        if (itemOutstanding > 0.01 && item.type === 'invoice') {
          allDueBills.push({
            invoiceNo: item.invoiceNo,
            dateOfSupply: item.dateOfSupply,
            receiverName: customer.name,
            totalAmount: item.totalAmount,
            outstanding: itemOutstanding
          });
        }
      });
    });

    // Sort all due invoices by oldest first (longest due)
    return allDueBills
      .sort((a, b) => parseDateStr(a.dateOfSupply) - parseDateStr(b.dateOfSupply))
      .slice(0, 5);
  })();

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

          {/* Longest Due Bills */}
          <div className="flex justify-between items-center mb-3 px-1 mt-2">
            <h3 className="text-sm font-bold text-muted uppercase">Longest Due Bills</h3>
            <button className="text-danger text-xs font-bold border-none" style={{ background: 'none', display: 'flex', alignItems: 'center', gap: '2px' }} onClick={() => navigate('/outstandings')}>
              View All Outstandings <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="card">
            <div className="card-body" style={{ padding: '0.5rem 1.25rem' }}>
              {longestDueBills.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <p className="text-sm">No outstanding payments.</p>
                </div>
              ) : (
                longestDueBills.map((inv) => (
                  <div 
                    key={inv.invoiceNo} 
                    className="list-row"
                    onClick={() => navigate(`/preview/${encodeURIComponent(inv.invoiceNo)}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div style={{ width: 36, height: 36, borderRadius: '8px', backgroundColor: '#FEF2F2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={18} />
                      </div>
                      <div className="flex-col">
                        <span className="font-semibold text-sm truncate" style={{ maxWidth: '140px' }}>{inv.receiverName}</span>
                        <span className="text-xs text-muted">#{inv.invoiceNo.split('/').pop()}</span>
                      </div>
                    </div>
                    <div className="flex-col items-end text-right">
                      <span className="font-bold text-sm text-danger">₹{inv.outstanding.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-muted">Total: ₹{inv.totalAmount.toLocaleString('en-IN')}</span>
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
