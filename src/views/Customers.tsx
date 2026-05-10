import { useEffect, useState, useMemo } from 'react';
import { getCustomers, addCustomer, deleteCustomer, updateCustomer, getInvoices, getTransactions } from '../lib/storage';
import type { Customer, InvoiceData, Transaction } from '../types';
import { Trash2, Plus, X, Search } from 'lucide-react';
import CreatableSelect from 'react-select/creatable';

const predefinedRegions = [
  "Amalner", "Godegaon", "Betawad", "Shahapur", "Lasur", "Chahardi", "Holnanta", 
  "Gerughati", "Waldki", "Galangi", "Tonda", "Ganpur", "Nimgaon", "Adavad", "Chopda", 
  "Dharangaon", "Nanded", "Kasoda", "Erandol", "Parola", "Shindkheda", "Masavad", 
  "Pimpri", "Navalnagar", "Paldi", "Pahilad", "Nardana", "Mangrul", "Khalna", "Shirsala", 
  "Muli", "Vavada", "Mandal", "Mohadi", "Javkheda", "Bharvas", "Ranaiche", "Chowbhary", 
  "Amalgaon", "Kalamsara", "Khedi", "Neem", "Pilode", "Jalod", "Nagaon", "Dahiwad", 
  "Bhilali", "Pimpalkota", "Janva", "Anore"
].sort().map(r => ({ value: r, label: r }));

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    state: '',
    stateCode: '',
    gstin: '',
    region: '',
    phone: '',
    email: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cData, iData, tData] = await Promise.all([
        getCustomers(), getInvoices(), getTransactions()
      ]);
      setCustomers(cData);
      setInvoices(iData);
      setTransactions(tData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const customersWithStats = useMemo(() => {
    const invoiceTotals: Record<string, number> = {};
    invoices.forEach(inv => {
      if (!inv.customerId) return;
      invoiceTotals[inv.customerId] = (invoiceTotals[inv.customerId] || 0) + (inv.totalAmount || 0);
    });

    const receiptTotals: Record<string, number> = {};
    transactions.forEach(tx => {
      if (!tx.customerId) return;
      if (tx.type === 'CR') receiptTotals[tx.customerId] = (receiptTotals[tx.customerId] || 0) + tx.amount;
    });

    let results = customers.map(c => {
      const totalInvoiced = invoiceTotals[c.id] || 0;
      const totalReceived = receiptTotals[c.id] || 0;
      const outstanding = totalInvoiced - totalReceived;
      return { ...c, outstanding };
    });

    if (searchTerm) {
      results = results.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    return results;
  }, [customers, invoices, transactions, searchTerm]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openAddSheet = () => {
    setEditingId(null);
    setFormData({ name: '', address: '', state: '', stateCode: '', gstin: '', region: '', phone: '', email: '' });
    setIsSheetOpen(true);
  };

  const openEditSheet = (customer: Customer) => {
    setEditingId(customer.id);
    setFormData({
      name: customer.name,
      address: customer.address || '',
      state: customer.state || '',
      stateCode: customer.stateCode || '',
      gstin: customer.gstin || '',
      region: customer.region || '',
      phone: customer.phone || '',
      email: customer.email || ''
    });
    setIsSheetOpen(true);
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
    setTimeout(() => {
      setEditingId(null);
      setFormData({ name: '', address: '', state: '', stateCode: '', gstin: '', region: '', phone: '', email: '' });
    }, 300); // Wait for animation
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateCustomer(editingId, formData);
      } else {
        await addCustomer(formData);
      }
      closeSheet();
      fetchData();
    } catch (error) {
      alert(editingId ? 'Failed to update customer' : 'Failed to add customer');
      console.error(error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this customer?')) {
      try {
        await deleteCustomer(id);
        fetchData();
      } catch (error) {
        alert('Failed to delete customer');
      }
    }
  };

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="mb-4 mt-2 px-2 flex justify-between items-center">
        <h1 className="font-bold text-xl">Clients</h1>
        <button className="btn btn-primary btn-icon" onClick={openAddSheet} style={{ borderRadius: '50%', width: '36px', height: '36px', padding: 0 }}>
          <Plus size={20} />
        </button>
      </div>

      <div className="px-2 mb-4">
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search clients..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '36px', borderRadius: 'var(--radius-xl)' }}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: '0.5rem 1.25rem' }}>
          {loading ? (
            <div className="text-center py-4 text-muted">Loading...</div>
          ) : customersWithStats.length === 0 ? (
            <div className="text-center py-4 text-muted text-sm">No clients found.</div>
          ) : (
            customersWithStats.map(c => (
              <div key={c.id} className="list-row" onClick={() => openEditSheet(c as any)}>
                <div className="flex items-center gap-3">
                  <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#E0E7FF', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-col">
                    <span className="font-semibold text-sm truncate" style={{ maxWidth: '140px' }}>{c.name}</span>
                    <span className="text-xs text-muted mt-1 flex items-center gap-1">
                      {c.region || 'No Region'}
                    </span>
                  </div>
                </div>
                <div className="flex-col items-end text-right">
                  <span className={`font-bold text-sm ${c.outstanding > 0 ? 'text-danger' : 'text-success'}`}>
                    ₹ {Math.abs(c.outstanding).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                  </span>
                  <div className="mt-1 flex gap-2">
                    <button 
                      className="btn-icon" 
                      onClick={(e) => handleDelete(c.id, e)}
                      style={{ color: 'var(--danger)', background: 'none', border: 'none', padding: 0 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Sheet */}
      {isSheetOpen && (
        <div className="bottom-sheet-overlay" onClick={closeSheet}>
          <div className="bottom-sheet" onClick={e => e.stopPropagation()}>
            <div className="bottom-sheet-header">
              <h2 className="bottom-sheet-title">{editingId ? 'Edit Client' : 'Add Client'}</h2>
              <button className="close-btn" onClick={closeSheet}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div>
                  <label className="form-label">Name</label>
                  <input required type="text" className="form-control" name="name" value={formData.name} onChange={handleChange} />
                </div>
                <div>
                  <label className="form-label">Region</label>
                  <CreatableSelect
                    options={predefinedRegions}
                    value={formData.region ? { value: formData.region, label: formData.region } : null}
                    onChange={(option: any) => setFormData({ ...formData, region: option ? option.value : '' })}
                    placeholder="Select or type new..."
                    isClearable
                    menuPortalTarget={document.body}
                    formatCreateLabel={(inputValue) => `Add New: "${inputValue}"`}
                    styles={{
                      control: (base) => ({ ...base, minHeight: '42px', borderRadius: '8px', borderColor: '#E5E7EB', fontSize: '14px', backgroundColor: '#F9FAFB' }),
                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                      menu: (base) => ({ ...base, fontSize: '14px' })
                    }}
                  />
                </div>
                <div>
                  <label className="form-label">Address (Optional)</label>
                  <textarea className="form-control" name="address" value={formData.address || ''} onChange={handleChange as any} rows={2} style={{ resize: 'none' }} />
                </div>
                <div>
                  <label className="form-label">GSTIN (Optional)</label>
                  <input type="text" className="form-control" name="gstin" value={formData.gstin || ''} onChange={handleChange} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Phone (Optional)</label>
                    <input type="tel" className="form-control" name="phone" value={(formData as any).phone || ''} onChange={handleChange} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Email (Optional)</label>
                    <input type="email" className="form-control" name="email" value={(formData as any).email || ''} onChange={handleChange} />
                  </div>
                </div>
              </div>
              
              <button type="submit" className="btn btn-primary w-full mt-4" style={{ padding: '1rem' }}>
                {editingId ? 'Save Changes' : 'Add Client'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
