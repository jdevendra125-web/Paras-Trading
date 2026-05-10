import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { getBankAccounts, getCustomers, addTransaction } from '../lib/storage';
import { formatCurrency } from '../lib/utils';
import type { BankAccount, Customer } from '../types';

interface ParsedRow { date: string; amount: number; type: 'CR' | 'DR'; particulars: string; refNo: string; raw: any; }

export function BankImport() {
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'done'>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [mapping, setMapping] = useState({ date: '', amount: '', type: '', particulars: '', refNo: '' });
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [accountId, setAccountId] = useState('');
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    Promise.all([getBankAccounts(), getCustomers()]).then(([a, c]) => { setAccounts(a); setCustomers(c); if (a.length) setAccountId(a[0].id); });
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (data.length < 2) { setError('File has no data rows.'); return; }
        const hdrs = (data[0] as string[]).map(String);
        setHeaders(hdrs);
        setRows(data.slice(1).filter((r: any[]) => r.some(c => c != null && c !== '')));
        setStep('map');
      } catch { setError('Could not parse file. Please use CSV or Excel format.'); }
    };
    reader.readAsBinaryString(file);
  };

  const setMap = (k: string) => (e: React.ChangeEvent<HTMLSelectElement>) => setMapping(prev => ({ ...prev, [k]: e.target.value }));

  const handlePreview = () => {
    if (!mapping.date || !mapping.amount) { setError('Please map Date and Amount columns.'); return; }
    const dateIdx = headers.indexOf(mapping.date);
    const amtIdx = headers.indexOf(mapping.amount);
    const typeIdx = mapping.type ? headers.indexOf(mapping.type) : -1;
    const partIdx = mapping.particulars ? headers.indexOf(mapping.particulars) : -1;
    const refIdx = mapping.refNo ? headers.indexOf(mapping.refNo) : -1;

    const result: ParsedRow[] = rows.map(row => {
      const rawAmt = Number(String(row[amtIdx] || '0').replace(/[^0-9.-]/g, ''));
      const typeRaw = typeIdx >= 0 ? String(row[typeIdx] || '').toUpperCase() : '';
      const type: 'CR' | 'DR' = typeRaw.includes('CR') || typeRaw.includes('CREDIT') ? 'CR' : 'DR';
      const rawDate = String(row[dateIdx] || '');
      let date = rawDate;
      if (rawDate.includes('/')) { const [d, m, y] = rawDate.split('/'); date = `${y}-${m?.padStart(2,'0')}-${d?.padStart(2,'0')}`; }
      return { date, amount: Math.abs(rawAmt), type, particulars: partIdx >= 0 ? String(row[partIdx] || '') : '', refNo: refIdx >= 0 ? String(row[refIdx] || '') : '', raw: row };
    }).filter(r => r.amount > 0);

    setParsed(result); setError(''); setStep('preview');
  };

  const handleImport = async () => {
    setImporting(true); let count = 0;
    for (const row of parsed) {
      try { await addTransaction({ date: row.date, amount: row.amount, type: row.type, mode: 'Bank', bankAccountId: accountId || undefined, particulars: row.particulars, refNo: row.refNo }); count++; }
      catch {}
    }
    setImportedCount(count); setStep('done'); setImporting(false);
  };

  const headerOpts = [{ value: '', label: '— skip —' }, ...headers.map(h => ({ value: h, label: h }))];

  return (
    <div className="page-container">
      <PageHeader title="Bank Import" subtitle="Import bank statement" back icon={<FileSpreadsheet size={18} />} />

      {step === 'upload' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="glass-card p-8 flex flex-col items-center gap-4 border-dashed border-2 border-white/10 hover:border-accent-blue/30 transition-colors cursor-pointer" onClick={() => fileRef.current?.click()}>
            <div className="w-14 h-14 rounded-2xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center">
              <Upload size={24} className="text-accent-blue" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-white mb-1">Upload Bank Statement</p>
              <p className="text-xs text-slate-500">CSV or Excel (.xlsx) format</p>
            </div>
            <Button variant="secondary" size="sm">Browse File</Button>
          </div>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
          {error && <p className="mt-3 text-xs text-neon-red bg-neon-red/10 border border-neon-red/20 rounded-lg px-3 py-2">{error}</p>}
        </motion.div>
      )}

      {step === 'map' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="glass-card p-4">
            <p className="text-sm font-bold text-white mb-1">Map Columns</p>
            <p className="text-xs text-slate-500 mb-4">{rows.length} rows detected. Match your column headers below.</p>
            <div className="space-y-3">
              {[{ k: 'date', label: 'Date *' }, { k: 'amount', label: 'Amount *' }, { k: 'type', label: 'CR/DR Type' }, { k: 'particulars', label: 'Particulars' }, { k: 'refNo', label: 'Reference No.' }].map(({ k, label }) => (
                <Select key={k} label={label} value={(mapping as any)[k]} onChange={setMap(k)} options={headerOpts} />
              ))}
              <Select label="Bank Account" value={accountId} onChange={e => setAccountId(e.target.value)}
                options={accounts.map(a => ({ value: a.id, label: a.name }))} />
            </div>
            {error && <p className="mt-3 text-xs text-neon-red">{error}</p>}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setStep('upload')}>Back</Button>
            <Button className="flex-1" onClick={handlePreview}>Preview →</Button>
          </div>
        </motion.div>
      )}

      {step === 'preview' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="glass-card p-4">
            <p className="text-sm font-bold text-white mb-3">{parsed.length} transactions to import</p>
            <div className="max-h-64 overflow-y-auto space-y-0">
              {parsed.slice(0, 20).map((r, i) => (
                <div key={i} className={`flex items-center justify-between py-2 ${i < parsed.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                  <div>
                    <p className="text-xs font-semibold text-white truncate max-w-[180px]">{r.particulars || r.date}</p>
                    <p className="text-[10px] text-slate-500">{r.date} · {r.type}</p>
                  </div>
                  <p className={`text-xs font-bold amount ${r.type === 'CR' ? 'text-neon-green' : 'text-neon-red'}`}>{formatCurrency(r.amount)}</p>
                </div>
              ))}
              {parsed.length > 20 && <p className="text-xs text-slate-600 text-center pt-2">+{parsed.length - 20} more rows...</p>}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setStep('map')}>Back</Button>
            <Button className="flex-1" loading={importing} onClick={handleImport}>Import All</Button>
          </div>
        </motion.div>
      )}

      {step === 'done' && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-neon-green/10 border border-neon-green/20 flex items-center justify-center">
            <CheckCircle size={28} className="text-neon-green" />
          </div>
          <div>
            <p className="text-base font-bold text-white">{importedCount} transactions imported!</p>
            <p className="text-xs text-slate-500 mt-1">View them in the Receipts section.</p>
          </div>
          <Button onClick={() => { setStep('upload'); setParsed([]); setRows([]); setHeaders([]); }}>Import Another File</Button>
        </motion.div>
      )}
    </div>
  );
}
