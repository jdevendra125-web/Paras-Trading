import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ArrowUpDown, Banknote, Search, Pencil, Trash2, Download, Calendar, Copy } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { TableSkeleton } from '../components/ui/Skeleton';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { getTransactions, getBankAccounts, getCustomers, addTransaction, updateTransaction, deleteTransaction } from '../lib/storage';
import { formatCurrency, formatDateShort, todayISO } from '../lib/utils';
import type { Transaction, BankAccount, Customer } from '../types';

const TYPE_OPTS = [{ value: 'CR', label: 'Credit (Received)' }, { value: 'DR', label: 'Debit (Paid)' }];
const MODE_OPTS = [{ value: 'Bank', label: 'Bank' }, { value: 'Cash', label: 'Cash' }];

const emptyForm = () => ({ date: '', amount: '', type: 'CR', mode: 'Cash', bankAccountId: '', customerId: '', particulars: '', refNo: '' });

interface DateTextInputProps {
  label: string;
  value: string;
  onChange: (isoValue: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

function DateTextInput({ label, value, onChange, placeholder = "DD-MM-YYYY", className = "", autoFocus }: DateTextInputProps) {
  const toDisplay = (iso: string): string => {
    if (!iso) return "";
    const parts = iso.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return iso;
  };

  const [inputValue, setInputValue] = useState(toDisplay(value));

  useEffect(() => {
    setInputValue(toDisplay(value));
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cleaned = val.replace(/\D/g, "").slice(0, 8);
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4)}`;
    }
    
    setInputValue(formatted);

    if (formatted.length === 10) {
      const [d, m, y] = formatted.split("-");
      const day = parseInt(d, 10);
      const month = parseInt(m, 10);
      const year = parseInt(y, 10);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1000 && year <= 9999) {
        onChange(`${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
      }
    } else if (formatted === "") {
      onChange("");
    }
  };

  const handleBlur = () => {
    if (inputValue.length < 10 && inputValue !== "") {
      setInputValue(toDisplay(value));
    }
  };

  return (
    <div className="relative w-full">
      <Input
        label={label}
        type="text"
        value={inputValue}
        onChange={handleTextChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={className}
        maxLength={10}
        autoFocus={autoFocus}
        suffix={
          <div className="relative flex items-center justify-center w-5 h-5">
            <Calendar 
              size={16} 
              className="text-slate-400 cursor-pointer hover:text-white transition-colors"
            />
            <input
              type="date"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        }
      />
    </div>
  );
}

export function Receipts() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const [t, a, c] = await Promise.all([getTransactions(), getBankAccounts(), getCustomers()]);
    setTxns(t); setAccounts(a); setCustomers(c); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const openAdd = () => { setEditing(null); setForm(emptyForm()); setShowForm(true); };
  const openEdit = (t: Transaction) => { setEditing(t); setForm({ date: t.date, amount: String(t.amount), type: t.type, mode: t.mode, bankAccountId: t.bankAccountId || '', customerId: t.customerId || '', particulars: t.particulars || '', refNo: t.refNo || '' }); setShowForm(true); };
  const openDuplicate = (t: Transaction) => {
    setEditing(null);
    setForm({
      date: '',
      amount: '',
      type: t.type,
      mode: t.mode,
      bankAccountId: t.bankAccountId || '',
      customerId: t.customerId || '',
      particulars: t.particulars || '',
      refNo: t.refNo || ''
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.date) {
      alert('Please enter or select a Date.');
      return;
    }
    if (!form.amount) {
      alert('Please enter an amount.');
      return;
    }
    if (!form.customerId) {
      alert('Please select a Customer.');
      return;
    }
    if (form.mode === 'Bank' && !form.bankAccountId) {
      alert('Please select a Bank Account.');
      return;
    }
    
    let finalParticulars = form.particulars;
    if (!finalParticulars) {
      const partyName = form.customerId ? customers.find(c => c.id === form.customerId)?.name : '';
      if (partyName) {
        finalParticulars = form.type === 'CR' ? `Receipt from ${partyName}` : `Payment to ${partyName}`;
      } else {
        finalParticulars = form.type === 'CR' ? 'Cash Receipt' : 'Cash Payment';
      }
    }

    setSaving(true);
    try {
      const payload = { 
        date: form.date, 
        amount: Number(form.amount), 
        type: form.type as 'CR' | 'DR', 
        mode: form.mode as 'Bank' | 'Cash', 
        bankAccountId: form.bankAccountId || undefined, 
        customerId: form.customerId || undefined, 
        particulars: finalParticulars, 
        refNo: form.refNo || undefined 
      };
      if (editing) await updateTransaction(editing.id, payload);
      else await addTransaction(payload);
      await load(); 
      setShowForm(false);
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const filtered = txns.filter(t =>
    t.particulars?.toLowerCase().includes(search.toLowerCase()) ||
    customers.find(c => c.id === t.customerId)?.name.toLowerCase().includes(search.toLowerCase())
  );

  const custMap = Object.fromEntries(customers.map(c => [c.id, c.name]));
  const totalCR = txns.filter(t => t.type === 'CR').reduce((s, t) => s + t.amount, 0);
  const totalDR = txns.filter(t => t.type === 'DR').reduce((s, t) => s + t.amount, 0);

  const downloadReceipt = (txn: Transaction, customerName: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Payment Receipt - ${txn.id}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .receipt-box { border: 2px solid #eee; padding: 30px; max-width: 600px; margin: auto; }
            .header { text-align: center; border-bottom: 2px solid #f5f5f5; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #e11d48; font-size: 24px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #fafafa; padding-bottom: 5px; }
            .label { font-weight: bold; color: #666; font-size: 14px; }
            .value { font-weight: bold; color: #000; font-size: 14px; }
            .amount-box { background: #fdf2f2; padding: 20px; text-align: center; margin-top: 30px; border-radius: 10px; border: 1px solid #fee2e2; }
            .amount-box h2 { margin: 0; color: #b91c1c; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="receipt-box">
            <div class="header">
              <h1>Digital Laal Vahi</h1>
              <p>Official Payment Receipt</p>
            </div>
            <div class="row">
              <span class="label">Receipt Date:</span>
              <span class="value">${txn.date}</span>
            </div>
            <div class="row">
              <span class="label">Customer Name:</span>
              <span class="value">${customerName || 'Cash Customer'}</span>
            </div>
            <div class="row">
              <span class="label">Payment Mode:</span>
              <span class="value">${txn.mode}</span>
            </div>
            <div class="row">
              <span class="label">Reference No:</span>
              <span class="value">${txn.refNo || 'N/A'}</span>
            </div>
            <div class="row">
              <span class="label">Particulars:</span>
              <span class="value">${txn.particulars}</span>
            </div>
            
            <div class="amount-box">
              <p class="label">TOTAL AMOUNT RECEIVED</p>
              <h2>₹ ${txn.amount.toLocaleString('en-IN')}</h2>
            </div>

            <div class="footer">
              <p>This is a computer generated receipt and does not require a signature.</p>
              <p>Thank you for your business!</p>
            </div>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="page-container">
      <PageHeader title="Receipts" subtitle="Cash & bank entries" icon={<ArrowUpDown size={18} />}
        action={<Button onClick={openAdd} size="md" icon={<Plus size={16} />} className="!rounded-2xl shadow-md font-bold">Add Receipt</Button>}
      />
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="glass-card p-3">
          <p className="text-[10px] font-bold text-content-muted uppercase tracking-wider">Total Received</p>
          <p className="text-base font-bold amount text-success">{formatCurrency(totalCR)}</p>
        </div>
        <div className="glass-card p-3">
          <p className="text-[10px] font-bold text-content-muted uppercase tracking-wider">Total Paid</p>
          <p className="text-base font-bold amount text-danger">{formatCurrency(totalDR)}</p>
        </div>
      </div>
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input className="input-field pl-10" placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <TableSkeleton rows={5} /> : filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-14">
          <Banknote size={36} className="mb-3 opacity-30 text-slate-600" />
          <p className="text-sm text-slate-500">No transactions found</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          {filtered.map((t, i) => (
            <div key={t.id} className={`flex items-center gap-3 px-4 py-3 group ${i < filtered.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.type === 'CR' ? 'bg-success' : 'bg-danger'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-content-primary truncate">{t.particulars}</p>
                <p className="text-[11px] font-medium text-content-muted mt-0.5">{formatDateShort(t.date)} · {t.mode}{t.customerId && custMap[t.customerId] ? ` · ${custMap[t.customerId]}` : ''}</p>
              </div>
              <p className={`text-sm font-bold amount flex-shrink-0 ${t.type === 'CR' ? 'text-success' : 'text-danger'}`}>{t.type === 'CR' ? '+' : '-'}{formatCurrency(t.amount)}</p>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => downloadReceipt(t, custMap[t.customerId || ''])} 
                  className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center text-success hover:bg-success/20"
                  title="Download PDF Receipt"
                >
                  <Download size={12} />
                </button>
                <button 
                  onClick={() => openDuplicate(t)} 
                  className="w-7 h-7 rounded-lg bg-accent-gold/10 flex items-center justify-center text-accent-gold hover:bg-accent-gold/20"
                  title="Duplicate Transaction"
                >
                  <Copy size={12} />
                </button>
                <button onClick={() => openEdit(t)} title="Edit" className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-content-primary hover:bg-white/10"><Pencil size={12} /></button>
                <button onClick={() => setDeleteTarget(t.id)} title="Delete" className="w-7 h-7 rounded-lg bg-neon-red/10 flex items-center justify-center text-neon-red hover:bg-neon-red/20"><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Transaction' : 'Add Transaction'}
        footer={<div className="flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button><Button className="flex-1" loading={saving} onClick={handleSave}>Save</Button></div>}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <DateTextInput label="Date" value={form.date} onChange={(val) => setForm(prev => ({ ...prev, date: val }))} autoFocus={!editing} />
            <Input label="Amount (₹)" type="number" value={form.amount} onChange={set('amount')} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={form.type} onChange={set('type')} options={TYPE_OPTS} />
            <Select label="Mode" value={form.mode} onChange={set('mode')} options={MODE_OPTS} />
          </div>
          <Select label="Customer *" value={form.customerId} onChange={set('customerId')}
            options={[{ value: '', label: '— Select Customer —' }, ...customers.map(c => ({ value: c.id, label: c.name }))]}
          />
          <Input label="Particulars" value={form.particulars} onChange={set('particulars')} placeholder="Payment description" />
          <Input label="Ref No" value={form.refNo} onChange={set('refNo')} placeholder="Cheque / UTR no." />
        </div>
      </Modal>
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          try {
            await deleteTransaction(deleteTarget!);
            setDeleteTarget(null);
            await load();
          } catch (e: any) {
            alert('Failed to delete transaction: ' + e.message);
          }
        }}
        title="Delete Transaction"
        message="Delete this transaction? This cannot be undone."
      />
    </div>
  );
}
