import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Calendar } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { getCustomers, getMasterItems, calculateInvoiceTotal, getSettings } from '../../lib/storage';
import { AddCustomerModal } from '../modals/AddCustomerModal';
import { AddItemModal } from '../modals/AddItemModal';
import { formatCurrency } from '../../lib/utils';
import type { InvoiceData, InvoiceItem, Customer, MasterItem, UserSettings } from '../../types';

const UNITS = ['Kgs', 'Nos', 'Ltrs', 'Mtrs', 'Bags', 'Boxes', 'Pcs'];
const TRANSPORT_OPTS = ['Private', 'GVK', 'Jain Transport', 'Other'].map(v => ({ value: v, label: v }));
const MODE_OPTS = ['By Road', 'By Rail', 'By Air', 'By Ship'].map(v => ({ value: v, label: v }));

const NUMERIC_KEYS: Array<keyof InvoiceData> = ['loadingCharges', 'transportCharges', 'otherCharges', 'hamali'];

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

interface Props {
  data: InvoiceData;
  onChange: (d: InvoiceData) => void;
  onGenerate: () => Promise<void>;
  onSaveAndNew?: () => Promise<void>;
  defaultsLoading?: boolean; // Bug 11: disable save until invoice number is resolved
  autoFocusDate?: boolean;
}

export function InvoiceForm({ data, onChange, onGenerate, onSaveAndNew, defaultsLoading = false }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [showTransport, setShowTransport] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState<{isOpen: boolean; rowId: string | null}>({isOpen: false, rowId: null});

  const fetchMasters = useCallback(async () => {
    const [c, m, s] = await Promise.all([getCustomers(), getMasterItems(), getSettings()]);
    setCustomers(c); setMasterItems(m); setSettings(s);
    return { c, m, s };
  }, []);

  useEffect(() => {
    fetchMasters();
  }, [fetchMasters]);

  const handleSaveAndNew = useCallback(async () => {
    if (!onSaveAndNew) return;
    setSavingNew(true);
    try {
      await onSaveAndNew();
    } finally {
      setSavingNew(false);
    }
  }, [onSaveAndNew]);

  useEffect(() => {
    if (!onSaveAndNew) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        if (window.innerWidth >= 1024) {
          e.preventDefault();
          if (!saving && !savingNew && !defaultsLoading) {
            handleSaveAndNew();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSaveAndNew, saving, savingNew, defaultsLoading, handleSaveAndNew]);

  // Bug 8 fix: numeric charge fields are stored as number|'' not raw string
  const set = useCallback((key: keyof InvoiceData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value;
    const parsed = NUMERIC_KEYS.includes(key)
      ? (val === '' ? '' : Number(val))
      : val;
    onChange({ ...data, [key]: parsed });
  }, [data, onChange]);

  const setCustomer = (id: string) => {
    if (id === 'ADD_NEW') {
      setShowCustomerModal(true);
      return;
    }
    const cust = customers.find(c => c.id === id);
    if (cust) {
      onChange({ ...data, customerId: id, receiverName: cust.name, receiverAddress: cust.address, receiverState: cust.state, receiverStateCode: cust.stateCode, receiverGstin: cust.gstin, receiverRegion: cust.region || '', receiverPhone: cust.phone || '', receiverEmail: cust.email || '' });
    } else {
      onChange({ ...data, customerId: '', receiverName: '', receiverAddress: '', receiverState: '', receiverStateCode: '', receiverGstin: '', receiverRegion: '' });
    }
  };

  const setItem = (idx: number, key: keyof InvoiceItem) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const items = [...data.items];
    const val = e.target.value;
    if (key === 'description') {
      if (val === 'ADD_NEW') {
        setShowItemModal({ isOpen: true, rowId: items[idx].id });
        return;
      }
      const master = masterItems.find(m => m.description === val);
      if (master) { items[idx] = { ...items[idx], description: master.description, hsnCode: master.hsnCode, unit: master.unit, gstRate: master.gstRate, isInclusive: master.isInclusive !== false }; }
      else { items[idx] = { ...items[idx], description: val }; }
    } else {
      (items[idx] as any)[key] = key === 'qty' || key === 'inclusiveRate' || key === 'gstRate' ? (val === '' ? '' : Number(val)) : val;
    }
    onChange({ ...data, items });
  };

  const addItem = () => {
    const last = data.items[data.items.length - 1];
    onChange({ ...data, items: [...data.items, { id: crypto.randomUUID(), description: last?.description || '', hsnCode: last?.hsnCode || '', qty: '', unit: last?.unit || 'Kgs', inclusiveRate: '', gstRate: last?.gstRate || 0, isInclusive: true }] });
  };

  const removeItem = (idx: number) => {
    if (data.items.length === 1) return;
    onChange({ ...data, items: data.items.filter((_, i) => i !== idx) });
  };

  const handleGenerate = async () => { setSaving(true); try { await onGenerate(); } finally { setSaving(false); } };

  const total = calculateInvoiceTotal(data);
  const isService = data.invoiceType === 'service';
  const showHamali = settings?.enableHamali !== false;

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div><p className="input-label">{label}</p>{children}</div>
  );

  return (
    <div className="page-container">
      <PageHeader title="New Invoice" back icon={<Save size={18} />}
        action={<span className="text-xs text-slate-500 amount">Total: <span className="text-neon-green font-bold">{formatCurrency(total)}</span></span>}
      />

      {/* Invoice Type Toggle */}
      {!settings?.invoiceFormat && (
        <div className="flex gap-2 p-1 bg-bg-secondary/50 border border-content-primary/5 rounded-2xl mb-4 max-w-fit">
          <button
            onClick={() => onChange({ ...data, invoiceType: 'goods' })}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${!isService ? 'bg-accent-red text-white shadow-glow-red' : 'text-content-secondary hover:bg-bg-elevated'}`}
          >
            Product Invoice
          </button>
          <button
            onClick={() => onChange({ ...data, invoiceType: 'service' })}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isService ? 'bg-accent-red text-white shadow-glow-red' : 'text-content-secondary hover:bg-bg-elevated'}`}
          >
            Service Invoice
          </button>
        </div>
      )}

      {/* Invoice No & Date */}
      <div className="glass-card p-4 mb-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Invoice No" value={data.invoiceNo} onChange={set('invoiceNo')} />
          <DateTextInput label="Date of Supply" value={data.dateOfSupply} onChange={(val) => onChange({ ...data, dateOfSupply: val })} autoFocus={autoFocusDate} />
        </div>
      </div>

      {/* Customer */}
      <div className="glass-card p-4 mb-3">
        <p className="text-sm font-bold text-content-primary mb-3">Receiver / Customer</p>
        {customers.length > 0 && (
          <div className="mb-3">
            <label className="input-label">Select Customer</label>
            <select className="input-field" value={data.customerId || ''} onChange={e => setCustomer(e.target.value)} style={{ backgroundImage: 'none' }}>
              <option value="" className="bg-bg-card">— Select Customer —</option>
              <option value="ADD_NEW" className="bg-bg-card text-accent-red font-bold">+ Add New Customer</option>
              {customers.map(c => <option key={c.id} value={c.id} className="bg-bg-card">{c.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="glass-card p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-content-primary">Items</p>
          <button onClick={addItem} className="btn-ghost text-accent-blue text-xs px-2 py-1"><Plus size={13} /> Add Row</button>
        </div>
        <div className="space-y-4">
          {data.items.map((item: InvoiceItem, idx: number) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-bg-elevated border border-white/[0.06]">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold text-slate-400">Item {idx + 1}</p>
                {data.items.length > 1 && (
                  <button onClick={() => removeItem(idx)} className="w-6 h-6 rounded-lg bg-neon-red/10 flex items-center justify-center text-neon-red hover:bg-neon-red/20 transition-colors">
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <label className="input-label">Description</label>
                  <select className="input-field text-sm" value={item.description} onChange={setItem(idx, 'description')} style={{ backgroundImage: 'none' }}>
                    <option value="" className="bg-bg-card">— Select item —</option>
                    <option value="ADD_NEW" className="bg-bg-card text-accent-red font-bold">+ Add New Item</option>
                    {masterItems.map(m => <option key={m.id} value={m.description} className="bg-bg-card">{m.description}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {!isService && <Input label="Qty" type="number" value={item.qty === '' ? '' : String(item.qty)} onChange={setItem(idx, 'qty')} placeholder="0" />}
                  <div className={!isService ? '' : 'col-span-2'}>
                    <label className="input-label">{!isService ? 'Rate (₹)' : 'Invoice Amt'}</label>
                    <input type="number" className="input-field" value={item.inclusiveRate === '' ? '' : String(item.inclusiveRate)} onChange={setItem(idx, 'inclusiveRate')} placeholder="0" />
                  </div>
                  <div>
                    <label className="input-label">GST %</label>
                    <select className="input-field text-sm" value={String(item.gstRate)} onChange={setItem(idx, 'gstRate')} style={{ backgroundImage: 'none' }}>
                      {[0, 5, 12, 18, 28].map(r => <option key={r} value={r} className="bg-bg-card">{r}%</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Charges */}
      <div className="glass-card p-4 mb-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Transport Charges" type="number" value={data.transportCharges === '' ? '' : String(data.transportCharges)} onChange={set('transportCharges')} placeholder="0" />
          {showHamali && <Input label="Hamali" type="number" value={data.hamali === '' ? '' : String(data.hamali)} onChange={set('hamali')} placeholder="0" />}
        </div>
      </div>

      {/* Transport (collapsible) */}
      <div className="glass-card mb-3">
        <button onClick={() => setShowTransport(!showTransport)} className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-content-primary">
          Transport Details {showTransport ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <AnimatePresence>
          {showTransport && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-4 pb-4">
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="PO No" value={data.poNo} onChange={set('poNo')} placeholder="PO number" />
                  <DateTextInput label="PO Date" value={data.poDate || ''} onChange={(val) => onChange({ ...data, poDate: val })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Vehicle No" value={data.vehicleNo} onChange={set('vehicleNo')} placeholder="MH-12-AB-1234" className="uppercase" />
                  <Select label="Transport Name" value={data.nameOfTransport} onChange={set('nameOfTransport')} options={TRANSPORT_OPTS} />
                </div>
                <Select label="Mode of Transport" value={data.modeOfTransport} onChange={set('modeOfTransport')} options={MODE_OPTS} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reportable toggle */}
      <div className="glass-card p-4 mb-4 flex items-center gap-3">
        <input type="checkbox" id="reportable" checked={!!data.reportable} onChange={e => onChange({ ...data, reportable: e.target.checked })} className="w-4 h-4 rounded accent-accent-blue" />
        <label htmlFor="reportable" className="text-sm text-slate-300 cursor-pointer">Mark as reportable invoice</label>
      </div>

      {/* Total & Generate */}
      <div className="glass-card p-4 mb-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">Invoice Total</p>
          <p className="text-xl font-bold amount text-neon-green">{formatCurrency(total)}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        {onSaveAndNew && (
          <Button
            onClick={handleSaveAndNew}
            loading={savingNew || defaultsLoading}
            disabled={defaultsLoading}
            variant="secondary"
            className="flex-1"
            size="lg"
            icon={<Save size={16} />}
          >
            {defaultsLoading 
              ? 'Preparing…' 
              : window.innerWidth >= 1024 
                ? 'Save & New Invoice (Ctrl+Enter)' 
                : 'Save & New Invoice'}
          </Button>
        )}
        <Button
          onClick={handleGenerate}
          loading={saving || defaultsLoading}
          disabled={defaultsLoading}
          className="flex-1"
          size="lg"
          icon={<Save size={16} />}
        >
          {defaultsLoading ? 'Preparing Invoice…' : 'Save & Generate Invoice'}
        </Button>
      </div>

      {showCustomerModal && (
        <AddCustomerModal 
          open={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          onSaved={async (payload) => {
            const { c } = await fetchMasters();
            if (payload && payload.name) {
              const newC = c.find(cust => cust.name === payload.name);
              if (newC) {
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
          }}
        />
      )}

      {showItemModal.isOpen && (
        <AddItemModal 
          open={showItemModal.isOpen}
          onClose={() => setShowItemModal({ isOpen: false, rowId: null })}
          onSaved={async (payload) => {
            const { m } = await fetchMasters();
            if (payload && payload.description && showItemModal.rowId) {
              const newI = m.find(i => i.description === payload.description);
              if (newI) {
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
          }}
        />
      )}
      
      <div className="h-24 md:hidden no-print"></div>
    </div>
  );
}
