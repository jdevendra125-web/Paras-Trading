import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, FileText, Trash2, Eye, TrendingUp } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { TableSkeleton } from '../components/ui/Skeleton';
import { ConfirmDialog } from '../components/ui/Modal';
import { getInvoices, deleteInvoice } from '../lib/storage';
import { formatCurrency, formatDateShort } from '../lib/utils';
import type { InvoiceData } from '../types';

export function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => { setLoading(true); setInvoices(await getInvoices()); setLoading(false); };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() =>
    invoices.filter(inv =>
      inv.receiverName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNo.toLowerCase().includes(search.toLowerCase())
    ), [invoices, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await deleteInvoice(deleteTarget); await load(); }
    catch { alert('Failed to delete invoice'); }
    finally { setDeleting(false); setDeleteTarget(null); }
  };

  const totalAmount = useMemo(() => filtered.reduce((s, i) => s + (i.totalAmount || 0), 0), [filtered]);

  return (
    <div className="page-container flex flex-col h-full overflow-hidden">
      <PageHeader title="Invoices" subtitle={`${invoices.length} invoices`} icon={<FileText size={18} />}
        action={<Link to="/new" className="btn-primary text-xs px-3 py-2"><Plus size={14} /> New</Link>}
      />
      {!loading && invoices.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center">
            <TrendingUp size={16} className="text-neon-green" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-content-muted uppercase tracking-wider">Total Collection</p>
            <p className="text-xl font-bold amount text-success">{formatCurrency(totalAmount)}</p>
          </div>
        </motion.div>
      )}
      <div className="relative mb-4 flex-shrink-0">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input className="input-field pl-10" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 hide-scrollbar pb-4">
        {loading ? <TableSkeleton rows={8} /> : filtered.length === 0 ? (
          <div className="glass-card flex flex-col items-center py-14">
            <FileText size={36} className="mb-3 opacity-30 text-slate-600" />
            <p className="text-sm text-slate-500">{search ? 'No invoices found' : 'No invoices yet'}</p>
            {!search && <Link to="/new" className="mt-3 text-xs text-accent-blue hover:underline">Create first invoice →</Link>}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block glass-card overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-content-primary/[0.06] bg-content-primary/[0.02]">
                  <th className="px-5 py-4 text-[10px] font-bold text-content-secondary uppercase tracking-wider">Date</th>
                  <th className="px-5 py-4 text-[10px] font-bold text-content-secondary uppercase tracking-wider">Invoice No</th>
                  <th className="px-5 py-4 text-[10px] font-bold text-content-secondary uppercase tracking-wider">Customer</th>
                  <th className="px-5 py-4 text-[10px] font-bold text-content-secondary uppercase tracking-wider">GSTIN</th>
                  <th className="px-5 py-4 text-[10px] font-bold text-content-secondary uppercase tracking-wider text-right">Amount</th>
                  <th className="px-5 py-4 text-[10px] font-bold text-content-secondary uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.invoiceNo} className="border-b border-content-primary/[0.03] hover:bg-content-primary/[0.01] transition-colors group">
                    <td className="px-5 py-4 text-xs text-content-secondary font-medium">{formatDateShort(inv.dateOfSupply)}</td>
                    <td className="px-5 py-4 text-xs text-content-primary font-bold">{inv.invoiceNo}</td>
                    <td className="px-5 py-4 text-sm text-content-primary font-semibold">{inv.receiverName}</td>
                    <td className="px-5 py-4 text-xs text-content-muted font-mono uppercase">{inv.receiverGstin || 'No GSTIN'}</td>
                    <td className="px-5 py-4 text-sm font-bold amount text-neon-green text-right">{formatCurrency(inv.totalAmount || 0)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => navigate(`/preview/${encodeURIComponent(inv.invoiceNo)}`)} title="View Invoice" className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue hover:bg-accent-blue/20 transition-colors"><Eye size={14} /></button>
                        <button onClick={() => setDeleteTarget(inv.invoiceNo)} title="Delete" className="w-8 h-8 rounded-lg bg-neon-red/10 flex items-center justify-center text-neon-red hover:bg-neon-red/20 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List */}
          <div className="md:hidden glass-card overflow-hidden">
            {filtered.map((inv, idx) => (
              <div key={inv.invoiceNo} className={`flex items-center gap-3 px-4 py-3 group ${idx < filtered.length - 1 ? 'border-b border-content-primary/[0.04]' : ''}`}>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/preview/${encodeURIComponent(inv.invoiceNo)}`)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-content-primary truncate">{inv.receiverName}</p>
                      <p className="text-xs text-content-secondary mt-0.5">{inv.invoiceNo} · {formatDateShort(inv.dateOfSupply)}</p>
                    </div>
                    <p className="text-sm font-bold amount text-neon-green flex-shrink-0">{formatCurrency(inv.totalAmount || 0)}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => navigate(`/preview/${encodeURIComponent(inv.invoiceNo)}`)} className="w-7 h-7 rounded-lg bg-accent-blue/10 flex items-center justify-center text-accent-blue"><Eye size={13} /></button>
                  <button onClick={() => setDeleteTarget(inv.invoiceNo)} className="w-7 h-7 rounded-lg bg-neon-red/10 flex items-center justify-center text-neon-red"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      </div>
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} loading={deleting} title="Delete Invoice" message={`Delete invoice ${deleteTarget}? This cannot be undone.`} />
    </div>
  );
}
