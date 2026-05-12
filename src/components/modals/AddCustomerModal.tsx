import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../ui/Modal';
import { Input, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import { addCustomer, updateCustomer } from '../../lib/storage';
import type { Customer } from '../../types';

const STATES = [
  { value: '', label: 'Select State' },
  { value: 'Maharashtra', label: 'Maharashtra (27)' },
  { value: 'Gujarat', label: 'Gujarat (24)' },
  { value: 'Delhi', label: 'Delhi (07)' },
  { value: 'Karnataka', label: 'Karnataka (29)' },
  { value: 'Tamil Nadu', label: 'Tamil Nadu (33)' },
  { value: 'Rajasthan', label: 'Rajasthan (08)' },
  { value: 'Uttar Pradesh', label: 'Uttar Pradesh (09)' },
  { value: 'Madhya Pradesh', label: 'Madhya Pradesh (23)' },
  { value: 'West Bengal', label: 'West Bengal (19)' },
  { value: 'Telangana', label: 'Telangana (36)' },
  { value: 'Andhra Pradesh', label: 'Andhra Pradesh (37)' },
  { value: 'Kerala', label: 'Kerala (32)' },
  { value: 'Punjab', label: 'Punjab (03)' },
  { value: 'Haryana', label: 'Haryana (06)' },
];

const STATE_CODES: Record<string, string> = {
  Maharashtra: '27', Gujarat: '24', Delhi: '07', Karnataka: '29',
  'Tamil Nadu': '33', Rajasthan: '08', 'Uttar Pradesh': '09',
  'Madhya Pradesh': '23', 'West Bengal': '19', Telangana: '36',
  'Andhra Pradesh': '37', Kerala: '32', Punjab: '03', Haryana: '06',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing?: Customer | null;
}

export function AddCustomerModal({ open, onClose, onSaved, editing }: Props) {
  const [form, setForm] = useState({ name: '', address: '', state: '', stateCode: '', gstin: '', region: '', phone: '', email: '', openingBalance: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (editing) {
      setForm({ name: editing.name, address: editing.address, state: editing.state, stateCode: editing.stateCode, gstin: editing.gstin, region: editing.region || '', phone: editing.phone || '', email: editing.email || '', openingBalance: String(editing.openingBalance || 0) });
    } else {
      setForm({ name: '', address: '', state: '', stateCode: '', gstin: '', region: '', phone: '', email: '', openingBalance: '' });
    }
    setError('');
  }, [open, editing]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value;
    setForm(prev => {
      const next = { ...prev, [key]: val };
      if (key === 'state') next.stateCode = STATE_CODES[val] || '';
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.state || !form.gstin.trim()) { setError('Name, State and GSTIN are required'); return; }
    setLoading(true); setError('');
    try {
      const payload = { ...form, openingBalance: Number(form.openingBalance) || 0 };
      if (editing) { await updateCustomer(editing.id, payload); }
      else { await addCustomer(payload); }
      onSaved(); onClose();
    } catch (e: any) { setError(e.message || 'Failed to save'); }
    finally { setLoading(false); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Customer' : 'Add Customer'}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" loading={loading} onClick={handleSave}>
            {editing ? 'Update' : 'Add Customer'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input label="Customer Name *" value={form.name} onChange={set('name')} placeholder="Bajrang Supermarket" />
        <Input label="Address *" value={form.address} onChange={set('address')} placeholder="Shop address..." />
        <div className="grid grid-cols-2 gap-3">
          <Select label="State *" value={form.state} onChange={set('state')} options={STATES} />
          <Input label="State Code" value={form.stateCode} onChange={set('stateCode')} placeholder="27" />
        </div>
        <Input label="GSTIN *" value={form.gstin} onChange={set('gstin')} placeholder="27AAGHJ5402D1ZN" className="uppercase" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Region" value={form.region} onChange={set('region')} placeholder="North / South" />
          <Input label="Phone" value={form.phone} onChange={set('phone')} type="tel" placeholder="9876543210" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Email" value={form.email} onChange={set('email')} type="email" placeholder="customer@email.com" />
          <Input label="Opening Balance (₹)" value={form.openingBalance} onChange={set('openingBalance')} type="number" placeholder="0.00" />
        </div>
        {error && (
          <AnimatePresence>
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-neon-red bg-neon-red/10 border border-neon-red/20 rounded-lg px-3 py-2">
              {error}
            </motion.p>
          </AnimatePresence>
        )}
      </div>
    </Modal>
  );
}
