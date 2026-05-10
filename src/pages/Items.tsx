import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { TableSkeleton } from '../components/ui/Skeleton';
import { ConfirmDialog } from '../components/ui/Modal';
import { AddItemModal } from '../components/modals/AddItemModal';
import { getMasterItems, deleteMasterItem } from '../lib/storage';
import type { MasterItem } from '../types';

export function Items() {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<MasterItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => { setLoading(true); setItems(await getMasterItems()); setLoading(false); };
  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await deleteMasterItem(deleteTarget); await load(); }
    catch { alert('Failed to delete'); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  return (
    <div className="page-container">
      <PageHeader title="Items Master" subtitle="Product catalog" icon={<Package size={18} />} back
        action={<button onClick={() => { setEditing(null); setShowAdd(true); }} className="btn-primary text-xs px-3 py-2"><Plus size={14} /> Add</button>}
      />
      {loading ? <TableSkeleton rows={5} /> : items.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-14">
          <Package size={36} className="mb-3 opacity-30 text-slate-600" />
          <p className="text-sm text-slate-500">No items yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="glass-card-hover p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center flex-shrink-0">
                <Tag size={15} className="text-accent-violet" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{item.description}</p>
                <p className="text-xs text-slate-500">HSN: {item.hsnCode} · {item.unit} · GST {item.gstRate}%</p>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => { setEditing(item); setShowAdd(true); }} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><Pencil size={12} /></button>
                <button onClick={() => setDeleteTarget(item.id)} className="w-7 h-7 rounded-lg bg-neon-red/10 flex items-center justify-center text-neon-red hover:bg-neon-red/20 transition-colors"><Trash2 size={12} /></button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      <AddItemModal open={showAdd} onClose={() => { setShowAdd(false); setEditing(null); }} onSaved={load} editing={editing} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting} title="Delete Item" message="Delete this item from master list?" />
    </div>
  );
}
