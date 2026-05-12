import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import { addMasterItem } from '../lib/storage';

interface AddItemModalProps {
  onClose: () => void;
  onSuccess: (newItemDesc: string) => void;
  isServiceFormat: boolean;
}

export function AddItemModal({ onClose, onSuccess, isServiceFormat }: AddItemModalProps) {
  const [formData, setFormData] = useState({
    description: '',
    hsnCode: '',
    unit: 'Kgs',
    gstRate: 5,
    isInclusive: true
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ 
        ...formData, 
        [name]: name === 'gstRate' ? Number(value) : value 
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addMasterItem(formData);
      onSuccess(formData.description);
      onClose();
    } catch (error) {
      alert('Failed to add item');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" style={{ backdropFilter: 'blur(2px)' }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 m-0">
            {isServiceFormat ? 'Add New Service' : 'Add New Item'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-500 focus:outline-none">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          <form id="itemForm" onSubmit={handleSubmit}>
            {isServiceFormat ? (
              <>
                <div className="form-row">
                  <div className="form-col" style={{ flex: '100%' }}>
                    <label className="form-label">Service Name</label>
                    <input required type="text" className="form-control" name="description" value={formData.description} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row mt-4">
                  <div className="form-col">
                    <label className="form-label">SAC Code</label>
                    <input required type="text" className="form-control" name="hsnCode" value={formData.hsnCode} onChange={handleChange} />
                  </div>
                  <div className="form-col">
                    <label className="form-label">GST Rate (%)</label>
                    <input required type="number" step="0.01" className="form-control" name="gstRate" value={formData.gstRate} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row mt-4">
                  <div className="form-col" style={{ display: 'flex', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: 500, color: '#444' }}>
                      <input type="checkbox" name="isInclusive" checked={formData.isInclusive} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                      Rate is Inclusive of GST
                    </label>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="form-row">
                  <div className="form-col" style={{ flex: 2 }}>
                    <label className="form-label">Description of Goods</label>
                    <input required type="text" className="form-control" name="description" value={formData.description} onChange={handleChange} />
                  </div>
                  <div className="form-col">
                    <label className="form-label">HSN Code</label>
                    <input required type="text" className="form-control" name="hsnCode" value={formData.hsnCode} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row mt-4">
                  <div className="form-col">
                    <label className="form-label">Unit</label>
                    <select className="form-control" name="unit" value={formData.unit} onChange={handleChange}>
                      <option value="Kgs">Kgs</option>
                      <option value="Ltr">Ltr</option>
                      <option value="Pcs">Pcs</option>
                      <option value="Box">Box</option>
                    </select>
                  </div>
                  <div className="form-col">
                    <label className="form-label">GST Rate (%)</label>
                    <input required type="number" step="0.01" className="form-control" name="gstRate" value={formData.gstRate} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row mt-4">
                  <div className="form-col" style={{ display: 'flex', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0, fontWeight: 500, color: '#444' }}>
                      <input type="checkbox" name="isInclusive" checked={formData.isInclusive} onChange={handleChange} style={{ width: '18px', height: '18px' }} />
                      Rate is Inclusive of GST
                    </label>
                  </div>
                </div>
              </>
            )}
          </form>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary px-4 py-2" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" form="itemForm" className="btn btn-primary px-4 py-2 flex items-center gap-2" disabled={loading}>
            <Save size={16} /> {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
