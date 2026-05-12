import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Landmark, Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { TableSkeleton } from '../components/ui/Skeleton';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { getBankAccounts, addBankAccount, updateBankAccount, deleteBankAccount } from '../lib/storage';
import { formatCurrency } from '../lib/utils';
import type { BankAccount } from '../types';

const emptyForm = () => ({ name: '', accountNo: '', openingBalance: '' });

export function BankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const load = async () => { setLoading(true); setAccounts(await getBankAccounts()); setLoading(false); };
  useEffect(() => { load(); }, []);

  const openEdit = (a: BankAccount) => { setEditing(a); setForm({ name: a.name, accountNo: a.accountNo, openingBalance: String(a.openingBalance) }); setShowForm(true); };
  const openAdd = () => { setEditing(null); setForm(emptyForm()); setShowForm(true); };
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const payload = { name: form.name, accountNo: form.accountNo, openingBalance: Number(form.openingBalance) || 0 };
      if (editing) await updateBankAccount(editing.id, payload); else await addBankAccount(payload);
      await load(); setShowForm(false);
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="page-container">
      <PageHeader title="Bank Accounts" subtitle="Manage bank accounts" icon={<Landmark size={18} />} back
        action={<button onClick={openAdd} className="btn-primary text-xs px-3 py-2"><Plus size={14} /> Add</button>}
      />
      {loading ? <TableSkeleton rows={3} /> : accounts.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-14">
          <Landmark size={36} className="mb-3 opacity-30 text-slate-600" />
          <p className="text-sm text-slate-500">No bank accounts</p>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map((acc, i) => (
            <motion.div key={acc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card-hover p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center flex-shrink-0">
                <Landmark size={18} className="text-accent-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-content-primary">{acc.name}</p>
                <p className="text-xs text-slate-500">A/C: {acc.accountNo}</p>
                <p className="text-xs text-neon-green mt-0.5 amount">Opening: {formatCurrency(acc.openingBalance)}</p>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => openEdit(acc)} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-content-primary hover:bg-white/10"><Pencil size={12} /></button>
                <button onClick={() => setDeleteTarget(acc.id)} className="w-7 h-7 rounded-lg bg-neon-red/10 flex items-center justify-center text-neon-red hover:bg-neon-red/20"><Trash2 size={12} /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Account' : 'Add Bank Account'} size="sm"
        footer={<div className="flex gap-3"><Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button><Button className="flex-1" loading={saving} onClick={handleSave}>Save</Button></div>}
      >
        <div className="space-y-3">
          <Input label="Bank Name" value={form.name} onChange={set('name')} placeholder="Axis Bank" />
          <Input label="Account Number" value={form.accountNo} onChange={set('accountNo')} placeholder="914020040335571" />
          <Input label="Opening Balance (₹)" type="number" value={form.openingBalance} onChange={set('openingBalance')} placeholder="0" />
        </div>
      </Modal>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={async () => { await deleteBankAccount(deleteTarget!); setDeleteTarget(null); await load(); }} title="Delete Account" message="Delete this bank account?" />
    </div>
  );
}
