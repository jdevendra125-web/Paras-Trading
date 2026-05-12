import { useEffect, useState } from 'react';
import { getBankAccounts, addBankAccount, deleteBankAccount, updateBankAccount } from '../lib/storage';
import type { BankAccount } from '../types';
import { Trash2, Plus, Pencil, Save } from 'lucide-react';

export function BankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    accountNo: '',
    openingBalance: 0
  });

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await getBankAccounts();
      setAccounts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ 
      ...formData, 
      [name]: name === 'openingBalance' ? Number(value) : value 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateBankAccount(editingId, formData);
        setEditingId(null);
      } else {
        await addBankAccount(formData);
      }
      setFormData({ name: '', accountNo: '', openingBalance: 0 });
      fetchAccounts();
    } catch (error) {
      alert(editingId ? 'Failed to update bank account' : 'Failed to add bank account');
      console.error(error);
    }
  };

  const handleEdit = (account: BankAccount) => {
    setEditingId(account.id);
    setFormData({
      name: account.name,
      accountNo: account.accountNo,
      openingBalance: account.openingBalance
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this bank account?')) {
      try {
        await deleteBankAccount(id);
        fetchAccounts();
      } catch (error) {
        alert('Failed to delete bank account');
        console.error(error);
      }
    }
  };

  return (
    <div>
      <div className="card mb-4">
        <div className="card-header">
          <h2 style={{ fontSize: '1.1rem' }}>{editingId ? 'Edit Bank Account' : 'Add New Bank Account'}</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-col" style={{ flex: 2 }}>
                <label className="form-label">Bank Name</label>
                <input required type="text" className="form-control" name="name" value={formData.name} onChange={handleChange} />
              </div>
              <div className="form-col">
                <label className="form-label">Account No</label>
                <input required type="text" className="form-control" name="accountNo" value={formData.accountNo} onChange={handleChange} />
              </div>
              <div className="form-col">
                <label className="form-label">Opening Balance (INR)</label>
                <input required type="number" step="0.01" className="form-control" name="openingBalance" value={formData.openingBalance} onChange={handleChange} />
              </div>
            </div>
            <div className="mt-4 flex gap-2" style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary">
                {editingId ? <><Save size={16} /> Update</> : <><Plus size={16} /> Add Bank Account</>}
              </button>
              {editingId && (
                <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(null); setFormData({ name: '', accountNo: '', openingBalance: 0 }); }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 style={{ fontSize: '1.1rem' }}>Existing Bank Accounts</h2>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <p style={{ padding: '1.5rem' }}>Loading...</p>
          ) : (
            <div className="table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
              <table className="table responsive-table">
                <thead>
                  <tr>
                    <th>Bank Name</th>
                    <th>Account No</th>
                    <th>Opening Balance</th>
                    <th style={{ width: '90px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(a => (
                    <tr key={a.id}>
                      <td data-label="Bank Name" style={{ fontWeight: 500 }}>{a.name}</td>
                      <td data-label="Account No">{a.accountNo}</td>
                      <td data-label="Opening Balance">₹ {a.openingBalance.toFixed(2)}</td>
                      <td data-label="Action" style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-icon btn-secondary" style={{ marginRight: '4px', color: 'var(--primary)', backgroundColor: '#E0E7FF' }} onClick={() => handleEdit(a)}>
                          <Pencil size={16} />
                        </button>
                        <button className="btn btn-icon btn-danger" onClick={() => handleDelete(a.id)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {accounts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted">No bank accounts found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <div style={{ height: '80px' }} className="print-hidden"></div>
    </div>
  );
}
