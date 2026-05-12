import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { IndianRupee, AlertCircle, ArrowUpRight, CheckCircle, Wallet } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { TableSkeleton } from '../components/ui/Skeleton';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { getInvoices, getTransactions, getCustomers, addTransaction } from '../lib/storage';
import { formatCurrency, formatDateShort, todayISO } from '../lib/utils';
import type { InvoiceData, Customer, Transaction } from '../types';

export function Outstandings() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Quick Pay State
  const [payTarget, setPayTarget] = useState<any | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', mode: 'Cash', date: todayISO() });
  const [saving, setSaving] = useState(false);
  
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  
  // Advanced Filters
  const [activeFilter, setActiveFilter] = useState<'all' | 'due'>('due');
  const [amountFilterType, setAmountFilterType] = useState<'all' | 'gt' | 'lt'>('all');
  const [amountFilterValue, setAmountFilterValue] = useState<string>('');

  const load = async () => {
    setLoading(true);
    const [invs, custs, txns] = await Promise.all([getInvoices(), getCustomers(), getTransactions()]);
    setInvoices(invs); setCustomers(custs); setTransactions(txns); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const customerMap = useMemo(() => Object.fromEntries(customers.map(c => [c.id, c])), [customers]);
  const regions = useMemo(() => Array.from(new Set(customers.map(c => c.region || '').filter(Boolean))).sort(), [customers]);

  const outstandingData = useMemo(() => {
    let results = customers
      .filter(c => !regionFilter || c.region === regionFilter)
      .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
      .map(customer => {
        const customerInvoices = invoices.filter(inv => inv.customerId === customer.id);
        const customerTxns = transactions.filter(t => t.customerId === customer.id);
      
        const totalBilled = customerInvoices.reduce((s, inv) => s + (inv.totalAmount || 0), 0);
        const totalDR = customerTxns.filter(t => t.type === 'DR').reduce((s, t) => s + t.amount, 0);
        const totalCR = customerTxns.filter(t => t.type === 'CR').reduce((s, t) => s + t.amount, 0);
      
        // Outstanding = (Opening Balance + Invoices + Debit Transactions) - Credit Transactions
        const opening = Number(customer.openingBalance) || 0;
        const outstanding = (opening + totalBilled + totalDR) - totalCR;

        return {
          customer,
          invoices: customerInvoices,
          total: totalBilled + totalDR + opening,
          paid: totalCR,
          outstanding
        };
      });

    if (activeFilter === 'due') {
      results = results.filter(d => d.outstanding > 0.01);
    }
    
    if (amountFilterType !== 'all' && amountFilterValue !== '') {
      const val = parseFloat(amountFilterValue);
      if (!isNaN(val)) {
        if (amountFilterType === 'gt') results = results.filter(r => r.outstanding > val);
        else if (amountFilterType === 'lt') results = results.filter(r => r.outstanding < val);
      }
    }
    
    return results.sort((a, b) => b.outstanding - a.outstanding);
  }, [invoices, customers, transactions, search, regionFilter, activeFilter, amountFilterType, amountFilterValue]);

  const totalOutstanding = useMemo(() => outstandingData.reduce((s, d) => s + d.outstanding, 0), [outstandingData]);

  const handleQuickPay = async () => {
    if (!payTarget || !payForm.amount) return;
    setSaving(true);
    try {
      await addTransaction({
        date: payForm.date,
        amount: Number(payForm.amount),
        type: 'CR',
        mode: payForm.mode as 'Bank' | 'Cash',
        customerId: payTarget.customer.id,
        particulars: `Payment received from ${payTarget.customer.name}`,
        refNo: 'Quick Pay'
      });
      setPayTarget(null);
      await load();
    } catch (e: any) {
      alert('Payment failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <PageHeader title="Outstanding" subtitle="Pending payments" icon={<IndianRupee size={18} />} />

      {!loading && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 flex items-center gap-3 mb-4 border-warning/20">
          <div className="w-9 h-9 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center">
            <AlertCircle size={16} className="text-warning" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Outstanding</p>
            <p className="text-lg font-bold amount text-warning">{formatCurrency(totalOutstanding)}</p>
          </div>
        </motion.div>
      )}

      <div className="glass-card p-3 mb-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input 
            label="" 
            placeholder="Search customer..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
          <Select 
            label="" 
            value={regionFilter} 
            onChange={e => setRegionFilter(e.target.value)} 
            options={[{ value: '', label: 'All Regions' }, ...regions.map(r => ({ value: r, label: r }))]}
          />
        </div>
        
        <div className="flex gap-2 mb-2 bg-bg-secondary p-1 rounded-xl">
          <button onClick={() => setActiveFilter('all')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${activeFilter === 'all' ? 'bg-accent-blue text-white' : 'text-slate-400 hover:text-white'}`}>All</button>
          <button onClick={() => setActiveFilter('due')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${activeFilter === 'due' ? 'bg-neon-red text-white' : 'text-slate-400 hover:text-white'}`}>Pending Due</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select 
            label="Amount Filter"
            value={amountFilterType} 
            onChange={e => setAmountFilterType(e.target.value as any)} 
            options={[
              { value: 'all', label: 'Any Amount' }, 
              { value: 'gt', label: 'Greater Than (>)' }, 
              { value: 'lt', label: 'Less Than (<)' }
            ]}
          />
          {amountFilterType !== 'all' && (
            <Input 
              label="Value (₹)"
              type="number"
              placeholder="e.g. 10000" 
              value={amountFilterValue} 
              onChange={e => setAmountFilterValue(e.target.value)} 
            />
          )}
        </div>
      </div>

      {loading ? <TableSkeleton rows={5} /> : outstandingData.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-14">
          <IndianRupee size={36} className="mb-3 opacity-30 text-slate-600" />
          <p className="text-sm text-slate-500">No outstanding payments</p>
          <p className="text-xs text-slate-600 mt-1">All customers are up to date</p>
        </div>
      ) : (
        <div className="space-y-2">
          {outstandingData.map((d, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card-hover p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{d.customer?.name || 'Unknown Customer'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{d.invoices.length} invoice{d.invoices.length > 1 ? 's' : ''} · Billed: {formatCurrency(d.total)}</p>
                  <p className="text-xs text-slate-500">Paid: <span className="text-neon-green">{formatCurrency(d.paid)}</span></p>
                </div>
                <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                  <p className="text-sm font-bold amount text-warning">{formatCurrency(d.outstanding)}</p>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setPayTarget(d);
                        setPayForm({ ...payForm, amount: String(d.outstanding) });
                      }}
                      className="text-[10px] font-bold uppercase tracking-widest bg-success/10 text-success border border-success/20 px-3 py-1.5 rounded-lg hover:bg-success/20 transition-all flex items-center gap-1.5"
                    >
                      <CheckCircle size={10} /> Mark Paid
                    </button>
                    {d.customer && (
                      <Link to={`/outstanding-bills/${d.customer.id}`} className="text-xs text-slate-600 flex items-center gap-0.5 hover:text-white transition-colors">
                        View <ArrowUpRight size={11} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal 
        open={!!payTarget} 
        onClose={() => setPayTarget(null)} 
        title={`Receive Payment: ${payTarget?.customer?.name}`}
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setPayTarget(null)}>Cancel</Button>
            <Button className="flex-1" loading={saving} onClick={handleQuickPay}>Confirm Payment</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-bg-secondary border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Pending</p>
              <p className="text-lg font-black text-warning">{payTarget ? formatCurrency(payTarget.outstanding) : ''}</p>
            </div>
            <Wallet size={24} className="text-slate-700" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Date" type="date" value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} />
            <Input label="Amount (₹)" type="number" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} />
          </div>
          
          <Select 
            label="Payment Mode" 
            value={payForm.mode} 
            onChange={e => setPayForm({...payForm, mode: e.target.value})}
            options={[
              { value: 'Cash', label: 'Cash Payment' },
              { value: 'Bank', label: 'Bank Transfer' }
            ]}
          />
        </div>
      </Modal>
    </div>
  );
}
