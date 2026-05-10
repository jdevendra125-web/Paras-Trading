import { useEffect, useState } from 'react';
import { getMasterItems, addMasterItem, deleteMasterItem, updateMasterItem, getSettings } from '../lib/storage';
import type { MasterItem, UserSettings } from '../types';
import { Trash2, Plus, Pencil, Save } from 'lucide-react';

export function Items() {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    hsnCode: '',
    unit: 'Kgs',
    gstRate: 5,
    isInclusive: true
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const [data, sData] = await Promise.all([getMasterItems(), getSettings()]);
      setItems(data);
      setSettings(sData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

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
    try {
      if (editingId) {
        await updateMasterItem(editingId, formData);
        setEditingId(null);
      } else {
        await addMasterItem(formData);
      }
      setFormData({ description: '', hsnCode: '', unit: 'Kgs', gstRate: 5, isInclusive: true });
      fetchItems();
    } catch (error) {
      alert(editingId ? 'Failed to update item' : 'Failed to add item');
      console.error(error);
    }
  };

  const handleEdit = (item: MasterItem) => {
    setEditingId(item.id);
    setFormData({
      description: item.description,
      hsnCode: item.hsnCode,
      unit: item.unit,
      gstRate: item.gstRate,
      isInclusive: item.isInclusive ?? true
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteMasterItem(id);
        fetchItems();
      } catch (error) {
        alert('Failed to delete item');
        console.error(error);
      }
    }
  };

  return (
    <div>
      <div className="header mb-4" style={{ position: 'relative', border: 'none', padding: 0, backgroundColor: 'transparent', boxShadow: 'none' }}>
        <h1 className="header-title">{settings?.invoiceFormat === 'service' ? 'Service Master' : 'Item Master'}</h1>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h2 style={{ fontSize: '1.1rem' }}>{editingId ? (settings?.invoiceFormat === 'service' ? 'Edit Service' : 'Edit Item') : (settings?.invoiceFormat === 'service' ? 'Add New Service' : 'Add New Item')}</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {settings?.invoiceFormat === 'service' ? (
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
            <div className="mt-4 flex gap-2" style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn btn-primary">
                {editingId ? <><Save size={16} /> Update</> : <><Plus size={16} /> {settings?.invoiceFormat === 'service' ? 'Add Service' : 'Add Item'}</>}
              </button>
              {editingId && (
                <button type="button" className="btn btn-secondary" onClick={() => { setEditingId(null); setFormData({ description: '', hsnCode: '', unit: 'Kgs', gstRate: 5, isInclusive: true }); }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 style={{ fontSize: '1.1rem' }}>{settings?.invoiceFormat === 'service' ? 'Existing Services' : 'Existing Items'}</h2>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <p style={{ padding: '1.5rem' }}>Loading...</p>
          ) : (
            <div className="table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
              <table className="table responsive-table">
                <thead>
                  <tr>
                    <th>{settings?.invoiceFormat === 'service' ? 'Service' : 'Description'}</th>
                    <th>{settings?.invoiceFormat === 'service' ? 'SAC Code' : 'HSN Code'}</th>
                    {settings?.invoiceFormat !== 'service' && <th>Unit</th>}
                    <th>GST %</th>
                    <th>Type</th>
                    <th style={{ width: '90px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(i => (
                    <tr key={i.id}>
                      <td data-label={settings?.invoiceFormat === 'service' ? 'Service' : 'Description'} style={{ fontWeight: 500 }}>{i.description}</td>
                      <td data-label={settings?.invoiceFormat === 'service' ? 'SAC Code' : 'HSN Code'}>{i.hsnCode}</td>
                      {settings?.invoiceFormat !== 'service' && <td data-label="Unit">{i.unit}</td>}
                      <td data-label="GST %">{i.gstRate}%</td>
                      <td data-label="Type">{i.isInclusive === false ? 'Exclusive' : 'Inclusive'}</td>
                      <td data-label="Action" style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-icon btn-secondary" style={{ marginRight: '4px', color: 'var(--primary)', backgroundColor: '#E0E7FF' }} onClick={() => handleEdit(i)}>
                          <Pencil size={16} />
                        </button>
                        <button className="btn btn-icon btn-danger" onClick={() => handleDelete(i.id)}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={settings?.invoiceFormat === 'service' ? 5 : 6} className="text-center text-muted">
                        {settings?.invoiceFormat === 'service' ? 'No services found.' : 'No items found.'}
                      </td>
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
