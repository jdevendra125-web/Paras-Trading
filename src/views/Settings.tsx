import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../lib/storage';
import type { UserSettings } from '../types';
import { Save, Settings as SettingsIcon, Store, Landmark, FileText } from 'lucide-react';

export function Settings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'company' | 'bank' | 'invoice'>('company');

  useEffect(() => {
    async function loadSettings() {
      const data = await getSettings();
      setSettings(data);
      setLoading(false);
    }
    loadSettings();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!settings) return;
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    
    setSaving(true);
    try {
      await updateSettings(settings);
      alert('Settings saved successfully!');
    } catch (error) {
      alert('Failed to save settings');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Loading Settings...</div>;
  }

  if (!settings) {
    return (
      <div className="card m-4">
        <div className="card-body text-center text-danger">
          Failed to load settings. Please ensure you have run the database migration.
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '100px' }}>
      <div className="header mb-4" style={{ position: 'relative', border: 'none', padding: 0, backgroundColor: 'transparent', boxShadow: 'none' }}>
        <h1 className="header-title">App Settings</h1>
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SettingsIcon color="var(--primary)" />
          <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>Configuration</h2>
        </div>
        
        <div style={{ display: 'flex', borderBottom: '1px solid #E4E4EB', padding: '0 10px', overflowX: 'auto', gap: '5px' }}>
          <button 
            type="button"
            onClick={() => setActiveTab('company')}
            style={{ 
              background: 'none', border: 'none', padding: '16px 12px', 
              color: activeTab === 'company' ? 'var(--primary)' : '#666',
              fontWeight: activeTab === 'company' ? 700 : 500,
              borderBottom: activeTab === 'company' ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              whiteSpace: 'nowrap', fontSize: '13px'
            }}
          >
            <Store size={16} /> Company Details
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('bank')}
            style={{ 
              background: 'none', border: 'none', padding: '16px 12px', 
              color: activeTab === 'bank' ? 'var(--primary)' : '#666',
              fontWeight: activeTab === 'bank' ? 700 : 500,
              borderBottom: activeTab === 'bank' ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              whiteSpace: 'nowrap', fontSize: '13px'
            }}
          >
            <Landmark size={16} /> Bank Info
          </button>
          <button 
            type="button"
            onClick={() => setActiveTab('invoice')}
            style={{ 
              background: 'none', border: 'none', padding: '16px 12px', 
              color: activeTab === 'invoice' ? 'var(--primary)' : '#666',
              fontWeight: activeTab === 'invoice' ? 700 : 500,
              borderBottom: activeTab === 'invoice' ? '3px solid var(--primary)' : '3px solid transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              whiteSpace: 'nowrap', fontSize: '13px'
            }}
          >
            <FileText size={16} /> Invoice Settings
          </button>
        </div>

        <div className="card-body">
          <form onSubmit={handleSubmit}>
            
            {activeTab === 'company' && (
              <div className="flex-col gap-4">
                <div className="form-col">
                  <label className="form-label">Company Name</label>
                  <input type="text" className="form-control" name="companyName" value={settings.companyName} onChange={handleChange} required />
                </div>
                <div className="form-col">
                  <label className="form-label">Proprietor / Owner Name</label>
                  <input type="text" className="form-control" name="proprietorName" value={settings.proprietorName} onChange={handleChange} required />
                </div>
                <div className="form-col">
                  <label className="form-label">Company Address</label>
                  <textarea className="form-control" name="address" value={settings.address} onChange={handleChange} rows={3} required style={{ resize: 'none' }} />
                </div>
                <div className="form-col">
                  <label className="form-label">GSTIN</label>
                  <input type="text" className="form-control" name="gstin" value={settings.gstin} onChange={handleChange} required />
                </div>
              </div>
            )}

            {activeTab === 'bank' && (
              <div className="flex-col gap-4">
                <div className="form-col">
                  <label className="form-label">Bank Name & Branch</label>
                  <input type="text" className="form-control" name="bankName" value={settings.bankName} onChange={handleChange} required />
                </div>
                <div className="form-col">
                  <label className="form-label">Bank Account Name</label>
                  <input type="text" className="form-control" name="bankAccountName" value={settings.bankAccountName || ''} onChange={handleChange} placeholder="If different from Proprietor/Company" />
                </div>
                <div className="form-col">
                  <label className="form-label">Account Number</label>
                  <input type="text" className="form-control" name="bankAccountNo" value={settings.bankAccountNo} onChange={handleChange} required />
                </div>
                <div className="form-col">
                  <label className="form-label">IFSC Code</label>
                  <input type="text" className="form-control" name="bankIfsc" value={settings.bankIfsc} onChange={handleChange} required />
                </div>
              </div>
            )}

            {activeTab === 'invoice' && (
              <div className="flex-col gap-4">
                <div className="form-col">
                  <label className="form-label">Invoice Layout Format</label>
                  <select 
                    className="form-control" 
                    name="invoiceFormat" 
                    value={settings.invoiceFormat || 'goods'} 
                    onChange={(e) => setSettings({ ...settings, invoiceFormat: e.target.value as 'goods' | 'service' })}
                    style={{ padding: '0.75rem' }}
                  >
                    <option value="goods">Goods (Qty & Rate)</option>
                    <option value="service">Service (Amount Only)</option>
                  </select>
                  <small style={{ color: '#666', fontSize: '11px', marginTop: '6px', display: 'block', lineHeight: 1.4 }}>
                    Choose Service to hide Qty/Unit and display Currency/Amount.
                  </small>
                </div>
                
                <div className="form-col" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 0' }}>
                  <input 
                    type="checkbox" 
                    id="enableHamali"
                    checked={settings.enableHamali ?? true}
                    onChange={(e) => setSettings({ ...settings, enableHamali: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="enableHamali" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                    Enable Hamali (Handling Charges)
                  </label>
                </div>

                <div className="form-col">
                  <label className="form-label">Invoice Prefix</label>
                  <input type="text" className="form-control" name="invoicePrefix" value={settings.invoicePrefix} onChange={handleChange} required placeholder="e.g. PT/25-26/" />
                  <small style={{ color: '#666', fontSize: '11px', marginTop: '6px', display: 'block', lineHeight: 1.4 }}>This prefix will be added before the auto-incrementing invoice number.</small>
                </div>
                
                <div className="form-col">
                  <label className="form-label">Terms & Conditions</label>
                  <textarea className="form-control" name="termsConditions" value={settings.termsConditions} onChange={handleChange} rows={4} required style={{ resize: 'none' }} />
                  <small style={{ color: '#666', fontSize: '11px', marginTop: '6px', display: 'block', lineHeight: 1.4 }}>These will be printed at the bottom of the PDF invoice.</small>
                </div>
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
      <div style={{ height: '80px' }} className="print-hidden"></div>
    </div>
  );
}
