import React, { useState, useEffect } from 'react';
import { getCustomers, addTransaction, getTransactions, updateTransaction, deleteTransaction, getBankAccounts } from '../lib/storage';
import type { Customer, Transaction, BankAccount } from '../types';
import { Save, Banknote, Trash2, Pencil } from 'lucide-react';
import Select from 'react-select';

export function Receipts() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    customerId: '',
    particulars: '',
    type: 'CR', // CR for Receipt, DR for Payment
    mode: 'Cash', // Cash or Bank
    bankAccountId: ''
  });

  const fetchHistory = async () => {
    const txs = await getTransactions();
    setHistory(txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  useEffect(() => {
    async function fetchData() {
      const custData = await getCustomers();
      setCustomers(custData.sort((a, b) => a.name.localeCompare(b.name)));
      const bankData = await getBankAccounts();
      setBankAccounts(bankData);
      await fetchHistory();
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) {
      alert('Please fill out the amount.');
      return;
    }
    if (formData.mode === 'Bank' && !formData.bankAccountId) {
      alert('Please select a Bank Account.');
      return;
    }

    try {
      if (editingId) {
        await updateTransaction(editingId, {
          date: formData.date,
          amount: parseFloat(formData.amount),
          customerId: formData.customerId || undefined,
          particulars: formData.particulars,
          type: formData.type as 'CR' | 'DR',
          mode: formData.mode as 'Bank' | 'Cash',
          bankAccountId: formData.mode === 'Bank' ? formData.bankAccountId : undefined
        });
        alert('Transaction updated successfully!');
        setEditingId(null);
      } else {
        await addTransaction({
          date: formData.date,
          amount: parseFloat(formData.amount),
          type: formData.type as 'CR' | 'DR',
          mode: formData.mode as 'Bank' | 'Cash',
          customerId: formData.customerId || undefined,
          bankAccountId: formData.mode === 'Bank' ? formData.bankAccountId : undefined,
          particulars: formData.particulars,
          refNo: formData.mode === 'Cash' ? 'CASH' : 'BANK'
        });
        alert('Transaction saved successfully!');
      }
      setFormData({ 
        date: new Date().toISOString().split('T')[0], 
        amount: '', 
        particulars: '', 
        customerId: '',
        type: 'CR',
        mode: 'Cash',
        bankAccountId: ''
      });
      fetchHistory();
    } catch (error) {
      alert(editingId ? 'Failed to update transaction' : 'Failed to save transaction');
      console.error(error);
    }
  };

  const handleEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setFormData({
      date: tx.date,
      amount: tx.amount.toString(),
      customerId: tx.customerId || '',
      particulars: tx.particulars || '',
      type: tx.type,
      mode: tx.mode,
      bankAccountId: tx.bankAccountId || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      try {
        await deleteTransaction(id);
        fetchHistory();
      } catch (error) {
        alert('Failed to delete transaction');
        console.error(error);
      }
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="header mb-4" style={{ position: 'relative', border: 'none', padding: 0, backgroundColor: 'transparent', boxShadow: 'none' }}>
        <h1 className="header-title">Receipts & Payments</h1>
      </div>

      <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Banknote color="var(--primary)" />
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{editingId ? 'Edit Transaction' : 'New Transaction'}</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="grid-2 mb-3">
              <div className="form-col">
                <label className="form-label">Type</label>
                <select className="form-control" name="type" value={formData.type} onChange={handleChange}>
                  <option value="CR">Receipt (In)</option>
                  <option value="DR">Payment (Out)</option>
                </select>
              </div>
              <div className="form-col">
                <label className="form-label">Mode</label>
                <select className="form-control" name="mode" value={formData.mode} onChange={handleChange}>
                  <option value="Cash">Cash</option>
                  <option value="Bank">Bank</option>
                </select>
              </div>
            </div>

            <div className="form-col mb-3">
              <label className="form-label">Date</label>
              <input type="date" className="form-control" name="date" value={formData.date} onChange={handleChange} required />
            </div>
            
            {formData.mode === 'Bank' && (
              <div className="form-col mb-3">
                <label className="form-label">Bank Account</label>
                <select className="form-control" name="bankAccountId" value={formData.bankAccountId} onChange={handleChange} required={formData.mode === 'Bank'}>
                  <option value="">-- Select Bank Account --</option>
                  {bankAccounts.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.accountNo})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-col mb-3">
              <label className="form-label">Customer / Party (Optional)</label>
              <Select
                options={customers.map(c => ({ value: c.id, label: c.name }))}
                value={formData.customerId ? { value: formData.customerId, label: customers.find(c => c.id === formData.customerId)?.name || '' } : null}
                onChange={(option: any) => setFormData({ ...formData, customerId: option ? option.value : '' })}
                placeholder="-- Select Customer --"
                isClearable
                menuPortalTarget={document.body}
                menuPosition="fixed"
                styles={{
                  control: (base) => ({ ...base, minHeight: '36px', borderRadius: '6px', borderColor: '#d1d5db', fontSize: '14px' }),
                  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  menu: (base) => ({ ...base, fontSize: '14px' })
                }}
              />
            </div>
            
            <div className="form-col mb-3">
              <label className="form-label">Amount (INR)</label>
              <input type="number" step="0.01" className="form-control" name="amount" value={formData.amount} onChange={handleChange} required />
            </div>

            <div className="form-col mb-4">
              <label className="form-label">Particulars / Notes</label>
              <input type="text" className="form-control" name="particulars" value={formData.particulars} onChange={handleChange} />
            </div>

            <div className="mt-4 flex gap-2" style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                <Save size={18} /> {editingId ? 'Update Transaction' : 'Save Transaction'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-secondary" onClick={() => { 
                  setEditingId(null); 
                  setFormData({ date: new Date().toISOString().split('T')[0], amount: '', particulars: '', customerId: '', type: 'CR', mode: 'Cash', bankAccountId: '' }); 
                }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="card mt-4" style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <div className="card-header">
          <h2 style={{ fontSize: '1.1rem' }}>Transaction History</h2>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
            <table className="table responsive-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Mode</th>
                  <th>Party</th>
                  <th>Particulars</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th style={{ width: '90px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map(tx => {
                  const customer = customers.find(c => c.id === tx.customerId);
                  const bank = bankAccounts.find(b => b.id === tx.bankAccountId);
                  return (
                    <tr key={tx.id}>
                      <td data-label="Date">{tx.date}</td>
                      <td data-label="Type">
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          backgroundColor: tx.type === 'CR' ? '#DCFCE7' : '#FEE2E2',
                          color: tx.type === 'CR' ? '#16A34A' : '#DC2626'
                        }}>
                          {tx.type === 'CR' ? 'Receipt' : 'Payment'}
                        </span>
                      </td>
                      <td data-label="Mode">
                        {tx.mode} {bank && <span style={{fontSize: '0.8rem', color: '#666'}}>({bank.name})</span>}
                      </td>
                      <td data-label="Party" style={{ fontWeight: 500 }}>{customer ? customer.name : '-'}</td>
                      <td data-label="Particulars">{tx.particulars}</td>
                      <td data-label="Amount" style={{ textAlign: 'right', fontWeight: 'bold', color: tx.type === 'CR' ? 'green' : 'red' }}>
                        {tx.type === 'CR' ? '+' : '-'} ₹ {tx.amount.toFixed(2)}
                      </td>
                      <td data-label="Action" style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-icon btn-secondary" style={{ marginRight: '4px', color: 'var(--primary)', backgroundColor: '#E0E7FF' }} onClick={() => handleEdit(tx)}>
                          <Pencil size={16} />
                        </button>
                        <button className="btn btn-icon btn-danger" onClick={() => handleDelete(tx.id)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center text-muted">No transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div style={{ height: '80px' }} className="print-hidden"></div>
    </div>
  );
}
