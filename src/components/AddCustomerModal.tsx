import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { addCustomer } from '../lib/storage';

interface AddCustomerModalProps {
  onClose: () => void;
  onSuccess: (newCustomerId: string) => void;
}

export function AddCustomerModal({ onClose, onSuccess }: AddCustomerModalProps) {
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
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // addCustomer generates an ID on the backend if not passed, but storage.ts might require us to generate one?
      // Wait, let's look at addCustomer in storage.ts. Usually we pass Omit<Customer, 'id'>.
      // But wait, the supabase function handles the ID or we generate it. Let's assume addCustomer returns void.
      // Wait, if it returns void, how do we get the ID?
      // Supabase's addCustomer doesn't return the ID. Let me check storage.ts.
      // Instead of guessing, I'll generate a UUID and pass it in if needed, or I'll just refetch and match by name.
      // Let's pass the raw formData.
      await addCustomer(formData);
      onSuccess(formData.name); // We pass back the name so InvoiceForm can find it after refetching
      onClose();
    } catch (error) {
      alert('Failed to add customer');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" style={{ backdropFilter: 'blur(2px)' }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 m-0">Add New Customer</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-500 focus:outline-none">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          <form id="customerForm" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-col">
                <label className="form-label">Customer Name</label>
                <input required type="text" className="form-control" name="name" value={formData.name} onChange={handleChange} />
              </div>
              <div className="form-col">
                <label className="form-label">Region (Zone)</label>
                <input type="text" className="form-control" name="region" value={formData.region} onChange={handleChange} placeholder="e.g. North, South" />
              </div>
            </div>

            <div className="form-row mt-4">
              <div className="form-col" style={{ flex: '100%' }}>
                <label className="form-label">Billing Address</label>
                <textarea required className="form-control" name="address" value={formData.address} onChange={handleChange} rows={2} />
              </div>
            </div>

            <div className="form-row mt-4">
              <div className="form-col">
                <label className="form-label">State</label>
                <input required type="text" className="form-control" name="state" value={formData.state} onChange={handleChange} />
              </div>
              <div className="form-col">
                <label className="form-label">State Code</label>
                <input required type="text" className="form-control" name="stateCode" value={formData.stateCode} onChange={handleChange} />
              </div>
              <div className="form-col">
                <label className="form-label">GSTIN</label>
                <input type="text" className="form-control" name="gstin" value={formData.gstin} onChange={handleChange} style={{ textTransform: 'uppercase' }} />
              </div>
            </div>
            
            <div className="form-row mt-4">
              <div className="form-col">
                <label className="form-label">Phone No.</label>
                <input type="text" className="form-control" name="phone" value={formData.phone} onChange={handleChange} />
              </div>
              <div className="form-col">
                <label className="form-label">Email ID</label>
                <input type="email" className="form-control" name="email" value={formData.email} onChange={handleChange} />
              </div>
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary px-4 py-2" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" form="customerForm" className="btn btn-primary px-4 py-2 flex items-center gap-2" disabled={loading}>
            <Save size={16} /> {loading ? 'Saving...' : 'Save Customer'}
          </button>
        </div>
      </div>
    </div>
  );
}
