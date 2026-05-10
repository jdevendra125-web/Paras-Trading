import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Users, Plus, Phone, MapPin, Pencil, Trash2, FileText } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { TableSkeleton } from '../components/ui/Skeleton';
import { ConfirmDialog } from '../components/ui/Modal';
import { AddCustomerModal } from '../components/modals/AddCustomerModal';
import { getCustomers, deleteCustomer } from '../lib/storage';
import { getInitials } from '../lib/utils';
import type { Customer } from '../types';

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => { setLoading(true); setCustomers(await getCustomers()); setLoading(false); };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() =>
    customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.region?.toLowerCase().includes(search.toLowerCase())),
    [customers, search]
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await deleteCustomer(deleteTarget); await load(); }
    catch { alert('Failed to delete'); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  return (
    <div className="page-container">
      <PageHeader title="Customers" subtitle={`${customers.length} customers`} icon={<Users size={18} />}
        action={<button onClick={() => setShowAdd(true)} className="btn-primary text-xs px-3 py-2"><Plus size={14} /> Add</button>}
      />
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input className="input-field pl-10" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <TableSkeleton rows={5} /> : filtered.length === 0 ? (
        <div className="glass-card flex flex-col items-center py-14">
          <Users size={36} className="mb-3 opacity-30 text-slate-600" />
          <p className="text-sm text-slate-500">{search ? 'No customers found' : 'No customers yet'}</p>
          {!search && <button onClick={() => setShowAdd(true)} className="mt-3 text-xs text-accent-blue hover:underline">Add first customer →</button>}
        </div>
      ) : (
        <motion.div className="space-y-2" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}>
          {filtered.map(customer => (
            <motion.div key={customer.id} variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} className="glass-card-hover p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center flex-shrink-0 text-accent-blue font-bold text-sm">
                  {getInitials(customer.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-content-primary truncate">{customer.name}</p>
                  <p className="text-[11px] font-medium text-content-muted mt-1 flex items-center gap-1 uppercase tracking-tight">
                    <MapPin size={10} /> {customer.state} · GST: {customer.gstin}
                  </p>
                  {customer.phone && <p className="text-[11px] font-bold text-content-secondary flex items-center gap-1 mt-1"><Phone size={10} /> {customer.phone}</p>}
                </div>
                <div className="flex gap-1.5">
                  <Link to={`/statement/${customer.id}`} className="w-7 h-7 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue hover:bg-accent-blue/20 transition-colors">
                    <FileText size={13} />
                  </Link>
                  <button onClick={() => { setEditing(customer); setShowAdd(true); }} className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setDeleteTarget(customer.id)} className="w-7 h-7 rounded-lg bg-neon-red/10 flex items-center justify-center text-neon-red hover:bg-neon-red/20 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <AddCustomerModal open={showAdd} onClose={() => { setShowAdd(false); setEditing(null); }} onSaved={load} editing={editing} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting} title="Delete Customer" message="This will permanently delete the customer. Are you sure?" />
    </div>
  );
}
