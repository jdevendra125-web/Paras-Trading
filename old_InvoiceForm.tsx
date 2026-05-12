import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { InvoiceData, InvoiceItem, Customer, MasterItem } from '../types';
import { getCustomers, getMasterItems, getSettings } from '../lib/storage';
import Select from 'react-select';
import { AddCustomerModal } from './AddCustomerModal';
import { AddItemModal } from './AddItemModal';

interface InvoiceFormProps {
  data: InvoiceData;
  onChange: (data: InvoiceData) => void;
  onGenerate: () => void;
}

export function InvoiceForm({ data, onChange, onGenerate }: InvoiceFormProps) {
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [itemsMaster, setItemsMaster] = React.useState<MasterItem[]>([]);
  const [settings, setSettings] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [showCustomerModal, setShowCustomerModal] = React.useState(false);
  const [showItemModal, setShowItemModal] = React.useState<{isOpen: boolean; rowId: string | null}>({isOpen: false, rowId: null});

  async function fetchMasters() {
    try {
      const [cData, iData, sData] = await Promise.all([getCustomers(), getMasterItems(), getSettings()]);
      setCustomers(cData.sort((a, b) => a.name.localeCompare(b.name)));
      setItemsMaster(iData);
      setSettings(sData);
      return { cData, iData };
    } catch (e) {
      console.error(e);
      return null;
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchMasters();
  }, []);

  const handleCustomerChange = (option: any) => {
    if (option && option.value === 'ADD_NEW') {
      setShowCustomerModal(true);
      return;
    }
    const customerId = option ? option.value : '';
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      onChange({
        ...data,
        customerId,
        receiverName: customer.name,
        receiverAddress: customer.address,
        receiverState: customer.state,
        receiverStateCode: customer.stateCode,
        receiverGstin: customer.gstin,
        receiverRegion: customer.region || '',
        receiverPhone: customer.phone || '',
        receiverEmail: customer.email || '',
      });
    } else {
      onChange({ ...data, customerId: '', receiverPhone: '', receiverEmail: '' });
    }
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: uuidv4(),
      description: '',
      serviceDescription: '',
      hsnCode: '',
      qty: '',
      unit: '',
      inclusiveRate: '',
      currency: 'INR',
      gstRate: 0,
      isInclusive: true,
    };
    onChange({ ...data, items: [...data.items, newItem] });
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    const newItems = data.items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    onChange({ ...data, items: newItems });
  };

  const handleItemMasterChange = (id: string, itemId: string) => {
    if (itemId === 'ADD_NEW') {
      setShowItemModal({ isOpen: true, rowId: id });
      return;
    }
    const masterItem = itemsMaster.find(i => i.id === itemId);
    if (masterItem) {
      const newItems = data.items.map(item => 
        item.id === id ? { 
          ...item, 
          description: masterItem.description,
          hsnCode: masterItem.hsnCode,
          unit: masterItem.unit,
          gstRate: masterItem.gstRate,
          isInclusive: masterItem.isInclusive ?? true
        } : item
      );
      onChange({ ...data, items: newItems });
    }
  };

  const removeItem = (id: string) => {
    onChange({ ...data, items: data.items.filter(item => item.id !== id) });
  };

  if (loading) {
    return <div className="card"><div className="card-body">Loading Master Data...</div></div>;
  }

  return (
    <div className="no-print">
      <div className="card mb-4">
        <div className="card-body form-row">
          <div style={{ width: '100%', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>Select Customer</h2>
          </div>
          <div className="form-col" style={{ flex: '100%' }}>
            <label className="form-label">Customer</label>
            <Select
              options={[
                { value: 'ADD_NEW', label: '+ Add New Customer' },
                ...customers.map(c => ({ value: c.id, label: c.name + (c.gstin ? ` - ${c.gstin}` : '') }))
              ]}
              value={data.customerId ? { value: data.customerId, label: customers.find(c => c.id === data.customerId)?.name || '' } : null}
              onChange={handleCustomerChange}
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
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body form-row">
          <div style={{ width: '100%', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>Invoice Details</h2>
          </div>
          <div className="form-col">
            <label className="form-label">Invoice No.</label>
            <input type="text" className="form-control" name="invoiceNo" value={data.invoiceNo} readOnly style={{ backgroundColor: 'var(--bg-color)', color: '#666' }} />
          </div>
          <div className="form-col">
            <label className="form-label">Date of Supply</label>
            <input 
              type="date" 
              className="form-control" 
              name="dateOfSupply" 
              value={data.dateOfSupply.includes('-') && data.dateOfSupply.split('-')[0].length === 2 ? data.dateOfSupply.split('-').reverse().join('-') : data.dateOfSupply} 
              onChange={(e) => {
                onChange({ ...data, dateOfSupply: e.target.value });
              }} 
            />
          </div>
          <div className="form-col">
            <label className="form-label">Transaction Type</label>
            <select className="form-control" name="reportable" value={data.reportable ? 'true' : 'false'} onChange={(e) => onChange({ ...data, reportable: e.target.value === 'true' })}>
              <option value="false">Unreportable</option>
              <option value="true">Reportable</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>Invoice Items</h2>
            <button className="btn btn-secondary" style={{ color: 'var(--primary)', border: 'none', backgroundColor: '#E0E7FF' }} onClick={addItem}>
              <Plus size={16} /> Add Item
            </button>
          </div>
          <div className="table-container">
            <table className="table responsive-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>{settings?.invoiceFormat === 'service' ? 'Service' : 'Item'}</th>
                  <th>HSN Code</th>
                  <th>GST %</th>
                  {settings?.invoiceFormat !== 'service' && <th>Qty</th>}
                  {settings?.invoiceFormat !== 'service' && <th>Unit</th>}
                  {settings?.invoiceFormat === 'service' && <th>Currency</th>}
                  <th>{settings?.invoiceFormat === 'service' ? 'Invoice Amount' : 'Rate'}</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td data-label={settings?.invoiceFormat === 'service' ? 'Service' : 'Item'}>
                      <div className="flex-col" style={{ width: '100%', maxWidth: '200px', gap: '8px' }}>
                        <select className="form-control" style={{ maxWidth: '100%' }} value={itemsMaster.find(i => i.description === item.description)?.id || ''} onChange={(e) => handleItemMasterChange(item.id, e.target.value)}>
                          <option value="">-- Select --</option>
                          <option value="ADD_NEW" style={{ color: 'var(--primary)', fontWeight: 'bold' }}>+ Add New {settings?.invoiceFormat === 'service' ? 'Service' : 'Item'}</option>
                          {itemsMaster.map(i => (
                            <option key={i.id} value={i.id}>{i.description}</option>
                          ))}
                        </select>
                        {settings?.invoiceFormat === 'service' && (
                          <textarea
                            className="form-control"
                            placeholder="Service description"
                            value={item.serviceDescription || ''}
                            onChange={(e) => updateItem(item.id, 'serviceDescription', e.target.value)}
                            rows={2}
                            style={{ resize: 'none', maxWidth: '100%', fontSize: '0.875rem', padding: '0.5rem' }}
                          />
                        )}
                      </div>
                    </td>
                    <td data-label="HSN Code">
                      <input type="text" className="form-control" value={item.hsnCode} readOnly style={{ backgroundColor: 'var(--bg-color)' }} />
                    </td>
                    <td data-label="GST %">
                      <input type="text" className="form-control" value={item.gstRate + '%'} readOnly style={{ backgroundColor: 'var(--bg-color)' }} />
                    </td>
                    {settings?.invoiceFormat !== 'service' && (
                      <td data-label="Qty">
                        <input type="number" className="form-control" value={item.qty} onChange={(e) => updateItem(item.id, 'qty', e.target.value === '' ? '' : parseFloat(e.target.value))} />
                      </td>
                    )}
                    {settings?.invoiceFormat !== 'service' && (
                      <td data-label="Unit">
                        <input type="text" className="form-control" value={item.unit} readOnly style={{ backgroundColor: 'var(--bg-color)' }} />
                      </td>
                    )}
                    {settings?.invoiceFormat === 'service' && (
                      <td data-label="Currency">
                        <input type="text" className="form-control" value={item.currency || 'INR'} onChange={(e) => updateItem(item.id, 'currency', e.target.value)} placeholder="Currency" />
                      </td>
                    )}
                    <td data-label={settings?.invoiceFormat === 'service' ? 'Amount' : 'Rate'}>
                      <input type="number" className="form-control" value={item.inclusiveRate} onChange={(e) => updateItem(item.id, 'inclusiveRate', e.target.value === '' ? '' : parseFloat(e.target.value))} placeholder={settings?.invoiceFormat === 'service' ? `Amount (${item.isInclusive === false ? 'Exc' : 'Inc'})` : `Rate (${item.isInclusive === false ? 'Exc' : 'Inc'})`} />
                    </td>
                    <td data-label="Action">
                      <button className="btn btn-danger btn-icon" onClick={() => removeItem(item.id)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {settings?.enableHamali !== false && (
        <div className="card mb-4">
          <div className="card-body form-row">
            <div style={{ width: '100%', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>Additional Charges</h2>
            </div>
            <div className="form-col">
              <label className="form-label">Hamali (Rs.)</label>
              <input type="number" className="form-control" name="hamali" value={data.hamali} onChange={(e) => onChange({ ...data, hamali: e.target.value === '' ? '' : parseFloat(e.target.value) })} />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <button className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }} onClick={onGenerate} disabled={!data.customerId || data.items.length === 0}>
          Save & Generate Invoice
        </button>
      </div>
      <div style={{ height: '80px' }} className="print-hidden"></div>

      {showCustomerModal && (
        <AddCustomerModal 
          onClose={() => setShowCustomerModal(false)}
          onSuccess={(name) => {
            fetchMasters().then(res => {
              if (res && res.cData) {
                const newC = res.cData.find(c => c.name === name);
                if (newC) {
                  // Simulate react-select option selection
                  onChange({
                    ...data,
                    customerId: newC.id,
                    receiverName: newC.name,
                    receiverAddress: newC.address,
                    receiverState: newC.state,
                    receiverStateCode: newC.stateCode,
                    receiverGstin: newC.gstin,
                    receiverRegion: newC.region || '',
                    receiverPhone: newC.phone || '',
                    receiverEmail: newC.email || '',
                  });
                }
              }
            });
          }}
        />
      )}

      {showItemModal.isOpen && (
        <AddItemModal 
          isServiceFormat={settings?.invoiceFormat === 'service'}
          onClose={() => setShowItemModal({ isOpen: false, rowId: null })}
          onSuccess={(desc) => {
            fetchMasters().then(res => {
              if (res && res.iData && showItemModal.rowId) {
                const newI = res.iData.find(i => i.description === desc);
                if (newI) {
                  // Wait, handleItemMasterChange relies on itemsMaster state. Since fetchMasters just updated it, 
                  // but state update is async, we can just manually map it here.
                  const newItems = data.items.map(item => 
                    item.id === showItemModal.rowId ? { 
                      ...item, 
                      description: newI.description,
                      hsnCode: newI.hsnCode,
                      unit: newI.unit,
                      gstRate: newI.gstRate,
                      isInclusive: newI.isInclusive ?? true
                    } : item
                  );
                  onChange({ ...data, items: newItems });
                }
              }
            });
          }}
        />
      )}
    </div>
  );
}
