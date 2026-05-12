import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { getCustomers, getMasterItems, calculateInvoiceTotal, getSettings, getSuggestedItems } from '../../lib/storage';
import { formatCurrency } from '../../lib/utils';
import type { InvoiceData, InvoiceItem, Customer, MasterItem, UserSettings } from '../../types';

const UNITS = ['Kgs', 'Nos', 'Ltrs', 'Mtrs', 'Bags', 'Boxes', 'Pcs'];
const TRANSPORT_OPTS = ['Private', 'GVK', 'Jain Transport', 'Other'].map(v => ({ value: v, label: v }));
const MODE_OPTS = ['By Road', 'By Rail', 'By Air', 'By Ship'].map(v => ({ value: v, label: v }));

const NUMERIC_KEYS: Array<keyof InvoiceData> = ['loadingCharges', 'transportCharges', 'otherCharges', 'hamali'];

interface Props {
  data: InvoiceData;
  onChange: (d: InvoiceData) => void;
  onGenerate: () => Promise<void>;
  defaultsLoading?: boolean; // Bug 11: disable save until invoice number is resolved
}

export function InvoiceForm({ data, onChange, onGenerate, defaultsLoading = false }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [showTransport, setShowTransport] = useState(false);
  const [frequentItems, setFrequentItems] = useState<MasterItem[]>([]);
  const [customerItems, setCustomerItems] = useState<MasterItem[]>([]);

  useEffect(() => {
    Promise.all([getCustomers(), getMasterItems(), getSettings()]).then(([c, m, s]) => {
      setCustomers(c); setMasterItems(m); setSettings(s);
    });
  }, []);

  useEffect(() => {
    getSuggestedItems(data.customerId).then(res => {
      setFrequentItems(res.frequent);
      setCustomerItems(res.customerSpecific);
    });
  }, [data.customerId]);

  // Bug 8 fix: numeric charge fields are stored as number|'' not raw string
  const set = useCallback((key: keyof InvoiceData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value;
    const parsed = NUMERIC_KEYS.includes(key)
      ? (val === '' ? '' : Number(val))
      : val;
    onChange({ ...data, [key]: parsed });
  }, [data, onChange]);

  const setCustomer = (id: string) => {
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

      {/* Invoice No & Date */}
      <div className="glass-card p-4 mb-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Invoice No" value={data.invoiceNo} onChange={set('invoiceNo')} />
          <Input label="Date of Supply" type="date" value={data.dateOfSupply} onChange={set('dateOfSupply')} />
        </div>
      </div>

      {/* Customer */}
      <div className="glass-card p-4 mb-3">
        <p className="text-sm font-bold text-white mb-3">Receiver / Customer</p>
        {customers.length > 0 && (
          <div className="mb-3">
            <label className="input-label">Select Customer</label>
            <select className="input-field" value={data.customerId || ''} onChange={e => setCustomer(e.target.value)} style={{ backgroundImage: 'none' }}>
              <option value="" className="bg-bg-card">— Select or type manually —</option>
              {customers.map(c => <option key={c.id} value={c.id} className="bg-bg-card">{c.name}</option>)}
            </select>
          </div>
        )}
        <div className="space-y-3">
          <Input label="Name *" value={data.receiverName} onChange={set('receiverName')} placeholder="Customer name" />
          <Input label="Address" value={data.receiverAddress} onChange={set('receiverAddress')} placeholder="Full address" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="State" value={data.receiverState} onChange={set('receiverState')} placeholder="Maharashtra" />
            <Input label="State Code" value={data.receiverStateCode} onChange={set('receiverStateCode')} placeholder="27" />
          </div>
          <Input label="GSTIN" value={data.receiverGstin} onChange={set('receiverGstin')} placeholder="27AAGHJ..." className="uppercase" />
          <Input label="Place of Supply" value={data.placeOfSupply} onChange={set('placeOfSupply')} placeholder="Dharangaon" />
        </div>
      </div>

      {/* Items */}
      <div className="glass-card p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-white">Items</p>
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
                    {customerItems.length > 0 && (
                      <optgroup label="⭐ Previous Purchases" className="bg-bg-card text-accent-gold">
                        {customerItems.map(m => <option key={m.id} value={m.description} className="bg-bg-card text-white font-medium">{m.description}</option>)}
                      </optgroup>
                    )}
                    {frequentItems.length > 0 && (
                      <optgroup label="🔥 Most Sold Items" className="bg-bg-card text-accent-red">
                        {frequentItems.map(m => <option key={m.id} value={m.description} className="bg-bg-card text-white font-medium">{m.description}</option>)}
                      </optgroup>
                    )}
                    <optgroup label="All Master Items" className="bg-bg-card text-content-muted">
                      {masterItems.map(m => <option key={m.id} value={m.description} className="bg-bg-card text-white">{m.description}</option>)}
                    </optgroup>
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
          <Input label="Loading Charges" type="number" value={data.loadingCharges === '' ? '' : String(data.loadingCharges)} onChange={set('loadingCharges')} placeholder="0" />
          <Input label="Transport Charges" type="number" value={data.transportCharges === '' ? '' : String(data.transportCharges)} onChange={set('transportCharges')} placeholder="0" />
          <Input label="Other Charges" type="number" value={data.otherCharges === '' ? '' : String(data.otherCharges)} onChange={set('otherCharges')} placeholder="0" />
          {showHamali && <Input label="Hamali" type="number" value={data.hamali === '' ? '' : String(data.hamali)} onChange={set('hamali')} placeholder="0" />}
        </div>
      </div>

      {/* Transport (collapsible) */}
      <div className="glass-card mb-3">
        <button onClick={() => setShowTransport(!showTransport)} className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-white">
          Transport Details {showTransport ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <AnimatePresence>
          {showTransport && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden px-4 pb-4">
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="PO No" value={data.poNo} onChange={set('poNo')} placeholder="PO number" />
                  <Input label="PO Date" type="date" value={data.poDate} onChange={set('poDate')} />
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

      <Button
        onClick={handleGenerate}
        loading={saving || defaultsLoading}
        disabled={defaultsLoading}
        className="w-full"
        size="lg"
        icon={<Save size={16} />}
      >
        {defaultsLoading ? 'Preparing Invoice…' : 'Save & Generate Invoice'}
      </Button>
    </div>
  );
}
