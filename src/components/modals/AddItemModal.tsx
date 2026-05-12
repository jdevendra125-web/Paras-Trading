import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Modal } from '../ui/Modal';
import { Input, Select } from '../ui/Input';
import { Button } from '../ui/Button';
import { addMasterItem, updateMasterItem } from '../../lib/storage';
import type { MasterItem } from '../../types';

const UNITS = [
  { value: 'Kgs', label: 'Kgs' },
  { value: 'Nos', label: 'Nos' },
  { value: 'Ltrs', label: 'Ltrs' },
  { value: 'Mtrs', label: 'Mtrs' },
  { value: 'Bags', label: 'Bags' },
  { value: 'Boxes', label: 'Boxes' },
  { value: 'Pcs', label: 'Pcs' },
];

const GST_RATES = [
  { value: '0', label: '0%' },
  { value: '5', label: '5%' },
  { value: '12', label: '12%' },
  { value: '18', label: '18%' },
  { value: '28', label: '28%' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (payload?: any) => void;
  editing?: MasterItem | null;
}

export function AddItemModal({ open, onClose, onSaved, editing }: Props) {
  const [form, setForm] = useState({ description: '', hsnCode: '', unit: 'Kgs', gstRate: '5', isInclusive: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (editing) {
      setForm({ description: editing.description, hsnCode: editing.hsnCode, unit: editing.unit, gstRate: String(editing.gstRate), isInclusive: editing.isInclusive !== false });
    } else {
      setForm({ description: '', hsnCode: '', unit: 'Kgs', gstRate: '5', isInclusive: true });
    }
    setError('');
  }, [open, editing]);

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  const handleSave = async () => {
    if (!form.description.trim() || !form.hsnCode.trim()) { setError('Description and HSN Code are required'); return; }
    setLoading(true); setError('');
    try {
      const payload = { description: form.description, hsnCode: form.hsnCode, unit: form.unit, gstRate: Number(form.gstRate), isInclusive: form.isInclusive };
      if (editing) { await updateMasterItem(editing.id, payload); }
      else { await addMasterItem(payload); }
      onSaved(payload); onClose();
    } catch (e: any) { setError(e.message || 'Failed to save'); }
    finally { setLoading(false); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Item' : 'Add Item'}
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" loading={loading} onClick={handleSave}>
            {editing ? 'Update' : 'Add Item'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input label="Item Description *" value={form.description} onChange={set('description')} placeholder="Rajwadi Jaggery" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="HSN Code *" value={form.hsnCode} onChange={set('hsnCode')} placeholder="17011410" />
          <Select label="Unit" value={form.unit} onChange={set('unit')} options={UNITS} />
        </div>
        <Select label="GST Rate" value={form.gstRate} onChange={set('gstRate')} options={GST_RATES} />
        <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-elevated border border-white/10">
          <input
            type="checkbox"
            id="isInclusive"
            checked={form.isInclusive}
            onChange={e => setForm(prev => ({ ...prev, isInclusive: e.target.checked }))}
            className="w-4 h-4 rounded accent-accent-blue"
          />
          <label htmlFor="isInclusive" className="text-sm text-slate-300 cursor-pointer">
            Rate is GST inclusive <span className="text-slate-500 text-xs">(amount includes GST)</span>
          </label>
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
