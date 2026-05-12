import { useState, useEffect, useMemo } from 'react';
import { getCustomers, getInvoices, getTransactions } from '../lib/storage';
import type { Customer, InvoiceData, Transaction } from '../types';
import { Link } from 'react-router-dom';
import { ChevronRight, AlertCircle, Search } from 'lucide-react';

export function Outstandings() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeFilter, setActiveFilter] = useState<'all' | 'due'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [amountFilterType, setAmountFilterType] = useState<'all' | 'gt' | 'lt'>('all');
  const [amountFilterValue, setAmountFilterValue] = useState<string>('');

  useEffect(() => {
    async function fetchData() {
      const [cData, iData, tData] = await Promise.all([
        getCustomers(),
        getInvoices(),
        getTransactions()
      ]);
      setCustomers(cData);
      setInvoices(iData);
      setTransactions(tData);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Removed regions useMemo

  const outstandings = useMemo(() => {
    const invoiceTotals: Record<string, number> = {};
    invoices.forEach(inv => {
      if (!inv.customerId) return;
      const total = inv.totalAmount || 0;
      invoiceTotals[inv.customerId] = (invoiceTotals[inv.customerId] || 0) + total;
    });

    const receiptTotals: Record<string, number> = {};
    transactions.forEach(tx => {
      if (!tx.customerId) return;
      if (tx.type === 'CR') {
        receiptTotals[tx.customerId] = (receiptTotals[tx.customerId] || 0) + tx.amount;
      }
    });

    let results = customers.map(c => {
      const totalInvoiced = invoiceTotals[c.id] || 0;
      const totalReceived = receiptTotals[c.id] || 0;
      const outstanding = totalInvoiced - totalReceived;
      return { ...c, totalInvoiced, totalReceived, outstanding };
    });

    // Filter by Search Term (Name or Region)
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      results = results.filter(r => 
        r.name.toLowerCase().includes(lowerSearch) || 
        (r.region && r.region.toLowerCase().includes(lowerSearch))
      );
    }

    // Filter by Amount
    if (amountFilterType !== 'all' && amountFilterValue !== '') {
      const val = parseFloat(amountFilterValue);
      if (!isNaN(val)) {
        if (amountFilterType === 'gt') {
          results = results.filter(r => r.outstanding > val);
        } else if (amountFilterType === 'lt') {
          results = results.filter(r => r.outstanding < val);
        }
      }
    }

    // Filter out settled if "due" is selected
    if (activeFilter === 'due') {
      results = results.filter(r => r.outstanding > 0);
    } else {
      // For "all", sort by outstanding desc
      results = results.sort((a, b) => b.outstanding - a.outstanding);
    }

    return results;
  }, [customers, invoices, transactions, activeFilter, searchTerm, amountFilterType, amountFilterValue]);

  const totalOutstanding = outstandings.reduce((sum, item) => sum + (item.outstanding > 0 ? item.outstanding : 0), 0);

  if (loading) return <div className="p-4 text-center text-muted">Loading Outstandings...</div>;

  return (
    <div style={{ paddingBottom: '100px' }}>
      <div className="mb-4 mt-2 px-2">
        <h1 className="font-bold text-xl mb-3">Outstandings</h1>
        
        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search by name or region..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '36px', borderRadius: 'var(--radius-xl)' }}
          />
        </div>

        {/* Amount Filter Row */}
        <div className="flex gap-2 items-center">
          <select 
            className="form-control" 
            style={{ width: '130px', padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: 'var(--radius-md)', backgroundColor: 'white' }}
            value={amountFilterType}
            onChange={(e) => setAmountFilterType(e.target.value as 'all' | 'gt' | 'lt')}
          >
            <option value="all">Any Amount</option>
            <option value="gt">Greater Than</option>
            <option value="lt">Less Than</option>
          </select>
          {amountFilterType !== 'all' && (
            <input 
              type="number" 
              className="form-control" 
              placeholder="Amount (₹)..."
              value={amountFilterValue}
              onChange={(e) => setAmountFilterValue(e.target.value)}
              style={{ flex: 1, padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: 'var(--radius-md)' }}
            />
          )}
        </div>
      </div>

      {/* Summary Card */}
      <div className="card mb-3" style={{ backgroundColor: 'var(--danger)', color: 'white', border: 'none' }}>
        <div className="card-body">
          <p className="text-sm" style={{ opacity: 0.9 }}>Total Outstanding {searchTerm.trim() ? '(Filtered)' : ''}</p>
          <h2 className="text-2xl font-bold mt-1">₹ {totalOutstanding.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h2>
          <div className="mt-2 text-xs flex items-center gap-1" style={{ opacity: 0.9 }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} /> <span>Please follow up with due customers</span>
          </div>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="h-scroll mb-3">
        <button 
          className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All Customers
        </button>
        <button 
          className={`filter-chip ${activeFilter === 'due' ? 'active' : ''}`}
          onClick={() => setActiveFilter('due')}
        >
          Due Only
        </button>
      </div>

      {/* Client List */}
      <div className="card">
        <div className="card-body" style={{ padding: '0.5rem 1.25rem' }}>
          {outstandings.length === 0 ? (
            <div className="text-center py-4 text-muted text-sm">No outstandings found.</div>
          ) : (
            outstandings.map(item => (
              <Link 
                to={`/statement/${item.id}`} 
                key={item.id} 
                className="list-row"
              >
                <div className="flex items-center gap-2">
                  <div className="flex-col">
                    <span className="font-semibold text-sm truncate" style={{ maxWidth: '160px', display: 'block' }}>{item.name}</span>
                    <div className="flex items-center gap-2 mt-1">
                      {item.outstanding > 0 ? (
                        <span className="badge badge-danger">DUE</span>
                      ) : (
                        <span className="badge badge-success">SETTLED</span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <span className={`font-bold text-sm ${item.outstanding > 0 ? 'text-danger' : 'text-success'}`}>
                    ₹ {Math.abs(item.outstanding).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                  </span>
                  <div className="flex items-center text-muted mt-1" style={{ fontSize: '0.7rem' }}>
                    View <ChevronRight size={12} />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
