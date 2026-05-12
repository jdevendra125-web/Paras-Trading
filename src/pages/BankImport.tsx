import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, FileSpreadsheet, CheckCircle, AlertCircle, ChevronRight, 
  History, Link as LinkIcon, Flag, Search, Filter, Trash2, 
  ArrowRight, ShieldCheck, Zap, Download, BarChart3, TrendingUp,
  CreditCard
} from 'lucide-react';
import * as XLSX from 'xlsx';
import * as pdfjs from 'pdfjs-dist';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { 
  getBankAccounts, getCustomers, getTransactions, 
  addTransaction, addBankImportSession, getBankImportSessions,
  updateTransaction, updateBankImportSession
} from '../lib/storage';
import { analyzeTransaction, extractRefNo } from '../lib/reconciliation';
import { formatCurrency, todayISO } from '../lib/utils';
import type { BankAccount, Customer, Transaction, BankImportSession } from '../types';

// PDF worker configuration - Using Vite-native local URL for absolute reliability
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

type Tab = 'import' | 'history' | 'analytics';
type ImportStep = 'upload' | 'analysis' | 'reconcile' | 'done';

export function BankImport() {
  const [activeTab, setActiveTab] = useState<Tab>('import');
  const [step, setStep] = useState<ImportStep>('upload');
  
  // Data state
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [history, setHistory] = useState<BankImportSession[]>([]);
  
  // Active import state
  const [accountId, setAccountId] = useState('');
  const [fileName, setFileName] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState({ date: '', amount: '', type: '', particulars: '', refNo: '' });
  const [parsingProgress, setParsingProgress] = useState(0);
  const [error, setError] = useState('');
  
  // Reconciliation state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'reconciled' | 'flagged'>('all');
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [showManualPaste, setShowManualPaste] = useState(false);
  const [manualText, setManualText] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBaseData();
  }, []);

  const loadBaseData = async () => {
    const [a, c, h, t] = await Promise.all([
      getBankAccounts(), 
      getCustomers(), 
      getBankImportSessions(),
      getTransactions()
    ]);
    setAccounts(a);
    setCustomers(c);
    setHistory(h);
    setAllTransactions(t);
    if (a.length) setAccountId(a[0].id);
  };

  // ─── FILE HANDLING ─────────────────────────────────────────────────────────

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError('');
    
    if (file.name.endsWith('.pdf')) {
      await parsePDF(file);
    } else {
      await parseExcel(file);
    }
  };

  const parseExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (data.length < 2) { setError('File has no data rows.'); return; }
        const hdrs = (data[0] as string[]).map(String);
        setHeaders(hdrs);
        setImportRows(data.slice(1).filter((r: any[]) => r.some(c => c != null && c !== '')));
        setStep('analysis');
      } catch (err) {
        setError('Excel parsing failed. Please ensure file is not corrupted.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const parsePDF = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      // Improved PDF parsing logic for standard bank formats
      const lines = fullText.split('\n');
      const detectedRows: any[] = [];
      
      console.log('--- PDF Extraction Start ---');
      console.log('Total Lines:', lines.length);

      lines.forEach((line, index) => {
        // Robust Date Match: DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, DD-MM-YY, etc.
        const dateMatch = line.match(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/);
        
        // Robust Amount Match: 1,234.56 or 1234.56 or 1234
        // We look for numbers at the end of the line or followed by CR/DR
        const amountMatch = line.match(/(-?\d{1,3}(,\d{3})*(\.\d+)?|\d+(\.\d+)?)/g);
        
        if (dateMatch && amountMatch && amountMatch.length > 0) {
          // Get the last number which is usually the amount or balance
          const amount = amountMatch[amountMatch.length - 1].replace(/,/g, '');
          
          if (!isNaN(Number(amount)) && Number(amount) !== 0) {
            detectedRows.push({
              date: dateMatch[0],
              particulars: line.replace(dateMatch[0], '').replace(amountMatch[amountMatch.length-1], '').trim() || 'Bank Transaction',
              amount: amount,
              raw: line
            });
          }
        }
      });

      console.log('Detected Rows:', detectedRows.length);

      if (detectedRows.length === 0) {
        setError('Could not detect transactions in PDF. Try converting it to CSV or Excel.');
        return;
      }

      setHeaders(['date', 'particulars', 'amount']);
      setImportRows(detectedRows);
      setMapping({ date: 'date', particulars: 'particulars', amount: 'amount', type: '', refNo: '' });
      setStep('analysis');
    } catch (err: any) {
      setError(`PDF parsing failed: ${err.message || 'Unknown error'}`);
      console.error('PDF Parse Error:', err);
    }
  };

  const handleManualParse = () => {
    if (!manualText.trim()) return;
    const lines = manualText.split('\n').filter(l => l.trim());
    const detectedRows: any[] = [];
    
    lines.forEach(line => {
      const dateMatch = line.match(/\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/);
      const amountMatch = line.match(/(-?\d{1,3}(,\d{3})*(\.\d+)?|\d+(\.\d+)?)/g);
      
      if (dateMatch && amountMatch) {
        const amount = amountMatch[amountMatch.length - 1].replace(/,/g, '');
        detectedRows.push({
          date: dateMatch[0],
          particulars: line.replace(dateMatch[0], '').replace(amountMatch[amountMatch.length-1], '').trim() || 'Manual Entry',
          amount: amount,
          raw: line
        });
      }
    });

    if (detectedRows.length === 0) {
      setError('Could not detect any valid transaction patterns (Date + Amount) in the text.');
      return;
    }

    setFileName('Manual Paste');
    setHeaders(['date', 'particulars', 'amount']);
    setImportRows(detectedRows);
    setMapping({ date: 'date', particulars: 'particulars', amount: 'amount', type: '', refNo: '' });
    setStep('analysis');
  };

  // ─── SMART ANALYSIS ────────────────────────────────────────────────────────

  const runSmartAnalysis = async () => {
    if (!mapping.date || !mapping.amount) {
      setError('Date and Amount mapping is mandatory.');
      return;
    }

    setParsingProgress(5);
    try {
      const dateIdx = headers.indexOf(mapping.date);
      const amtIdx = headers.indexOf(mapping.amount);
      const partIdx = mapping.particulars ? headers.indexOf(mapping.particulars) : -1;
      const refIdx = mapping.refNo ? headers.indexOf(mapping.refNo) : -1;

      console.log('Fetching history for smart matching...');
      const existingTxns = await getTransactions();
      setParsingProgress(10);
      
      const result: Transaction[] = [];

      console.log(`Starting analysis for ${importRows.length} rows...`);
      for (let i = 0; i < importRows.length; i++) {
        const row = importRows[i];
        const rawAmt = typeof row === 'object' && !Array.isArray(row) ? Number(row.amount) : Number(String(row[amtIdx] || '0').replace(/[^0-9.-]/g, ''));
        const rawDate = typeof row === 'object' && !Array.isArray(row) ? row.date : String(row[dateIdx] || '');
        const particulars = typeof row === 'object' && !Array.isArray(row) ? row.particulars : (partIdx >= 0 ? String(row[partIdx] || '') : '');
        const rawRef = typeof row === 'object' && !Array.isArray(row) ? '' : (refIdx >= 0 ? String(row[refIdx] || '') : '');

        let date = rawDate;
        if (rawDate.includes('/')) {
          const parts = rawDate.split('/');
          if (parts[0].length === 2) date = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
        }

        const match = await analyzeTransaction(particulars, customers, existingTxns);

        result.push({
          id: `temp-${i}`,
          date,
          amount: Math.abs(rawAmt),
          type: rawAmt > 0 ? 'CR' : 'DR',
          mode: 'Bank',
          bankAccountId: accountId,
          particulars: particulars,
          refNo: rawRef || extractRefNo(particulars),
          status: 'pending',
          confidence: match.confidence,
          suggestedCustomerId: match.customerId,
          rawNarration: particulars
        });

        // Update progress every row for small sets, or every 5 for large ones
        setParsingProgress(10 + ((i + 1) / importRows.length) * 85);
      }

      console.log('Analysis complete. Saving session...');
      // Save Import Session
      const id = await addBankImportSession({
        date: todayISO(),
        fileName,
        bankAccountId: accountId,
        totalTransactions: result.length,
        reconciledCount: 0
      });

      setSessionId(id);
      setTransactions(result.map(t => ({ ...t, importSessionId: id })));
      setParsingProgress(100);
      setStep('reconcile');
    } catch (err: any) {
      setError(`Analysis failed: ${err.message || 'Check database connection'}`);
      console.error('Analysis Error:', err);
      setParsingProgress(0);
    }
  };

  // ─── RECONCILIATION ACTIONS ───────────────────────────────────────────────

  const handleLink = async (txn: Transaction, customerId: string) => {
    const updated = transactions.map(t => 
      t.id === txn.id ? { ...t, customerId, status: 'reconciled' as const } : t
    );
    setTransactions(updated);
    setSelectedTxn(null);
  };

  const handleFlag = (txn: Transaction) => {
    const updated = transactions.map(t => 
      t.id === txn.id ? { ...t, status: 'flagged' as const } : t
    );
    setTransactions(updated);
  };

  const handleFinalize = async () => {
    setImporting(true);
    let count = 0;
    try {
      for (const txn of transactions) {
        if (txn.status === 'reconciled' || txn.status === 'flagged' || txn.status === 'pending') {
          // Remove the temporary 'id' before saving to DB
          const { id, ...dataToSave } = txn;
          await addTransaction(dataToSave as any);
          count++;
        }
      }
      if (sessionId) {
        const reconciled = transactions.filter(t => t.status === 'reconciled').length;
        await updateBankImportSession(sessionId, { reconciledCount: reconciled });
      }
      setImportedCount(count);
      setStep('done');
      loadBaseData();
    } catch (err) {
      setError('Finalization failed. Please check your connection.');
    } finally {
      setImporting(false);
    }
  };

  const filteredTxns = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = t.particulars.toLowerCase().includes(search.toLowerCase()) || 
                           t.refNo?.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = statusFilter === 'all' || t.status === statusFilter;
      return matchesSearch && matchesFilter;
    });
  }, [transactions, search, statusFilter]);

  const stats = useMemo(() => {
    const total = transactions.length;
    const reconciled = transactions.filter(t => t.status === 'reconciled').length;
    const pending = transactions.filter(t => t.status === 'pending').length;
    const highConf = transactions.filter(t => t.status === 'pending' && (t.confidence || 0) > 0.8).length;
    return { total, reconciled, pending, highConf };
  }, [transactions]);

  // ─── UI COMPONENTS ─────────────────────────────────────────────────────────

  return (
    <div className="page-container max-w-full">
      <PageHeader 
        title="Bank Reconciliation" 
        subtitle="Intelligent Statement Analysis" 
        back 
        icon={<ShieldCheck size={18} />}
        action={
          <div className="flex bg-bg-secondary rounded-xl p-1">
            <button onClick={() => setActiveTab('import')} className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'import' ? 'bg-bg-card text-accent-red shadow-sm' : 'text-slate-500'}`}>Import</button>
            <button onClick={() => setActiveTab('history')} className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'history' ? 'bg-bg-card text-accent-red shadow-sm' : 'text-slate-500'}`}>History</button>
            <button onClick={() => setActiveTab('analytics')} className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${activeTab === 'analytics' ? 'bg-bg-card text-accent-red shadow-sm' : 'text-slate-500'}`}>Insights</button>
          </div>
        }
      />

      {activeTab === 'history' ? (
        <HistoryTab history={history} accounts={accounts} />
      ) : activeTab === 'analytics' ? (
        <AnalyticsTab transactions={allTransactions} customers={customers} />
      ) : (
        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="max-w-2xl mx-auto py-8">
              <div className="flex gap-4 w-full">
                <label 
                  className="glass-card flex-1 p-12 flex flex-col items-center gap-6 border-dashed border-2 border-white/10 hover:border-accent-red/40 hover:bg-accent-red/5 transition-all cursor-pointer group rounded-[2.5rem]"
                >
                  <input type="file" accept=".csv,.xlsx,.xls,.pdf" className="hidden" onChange={handleFile} />
                  <div className="w-16 h-16 rounded-3xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload size={32} className="text-accent-red" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-content-primary mb-2">Auto-Import File</h3>
                    <p className="text-[10px] text-slate-500 max-w-xs uppercase tracking-widest font-bold">PDF, XLSX, CSV</p>
                  </div>
                  {fileName && !error && (
                    <div className="flex items-center gap-2 text-success bg-success/10 px-3 py-1 rounded-full text-[10px] font-bold">
                      <CheckCircle size={10} /> {fileName} received
                    </div>
                  )}
                </label>

                <div 
                  onClick={() => setShowManualPaste(!showManualPaste)}
                  className="glass-card flex-1 p-12 flex flex-col items-center gap-6 border-dashed border-2 border-white/10 hover:border-accent-gold/40 hover:bg-accent-gold/5 transition-all cursor-pointer group rounded-[2.5rem]"
                >
                  <div className="w-16 h-16 rounded-3xl bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileSpreadsheet size={32} className="text-accent-gold" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-content-primary mb-2">Paste Text Manually</h3>
                    <p className="text-[10px] text-slate-500 max-w-xs uppercase tracking-widest font-bold">Copy from PDF & Paste</p>
                  </div>
                </div>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 rounded-2xl bg-danger/10 border border-danger/20 flex items-center gap-3 text-danger">
                  <AlertCircle size={20} />
                  <div>
                    <p className="text-sm font-bold">Import Error</p>
                    <p className="text-xs opacity-80">{error}</p>
                  </div>
                </motion.div>
              )}

              <AnimatePresence>
                {showManualPaste && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="w-full mt-6">
                    <div className="glass-card p-6 border-accent-gold/20">
                      <p className="text-xs font-bold text-content-primary mb-3">Paste your transaction lines here:</p>
                      <textarea 
                        className="input-field min-h-[200px] text-[11px] font-mono p-4 mb-4"
                        placeholder="01/01/2025  UPI-987654321-RAHUL  500.00&#10;02/01/2025  CASH DEP  1000.00"
                        onChange={(e) => setManualText(e.target.value)}
                      />
                      <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => setShowManualPaste(false)}>Cancel</Button>
                        <Button className="flex-1" onClick={handleManualParse}>Parse & Analyze Text →</Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.pdf" className="hidden" onChange={handleFile} />
              
              <div className="mt-8 grid grid-cols-2 gap-4">
                <Select label="Destination Bank Account" value={accountId} onChange={e => setAccountId(e.target.value)} options={accounts.map(a => ({ value: a.id, label: a.name }))} />
                <div className="p-4 bg-bg-card rounded-2xl border border-white/5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Parties Linked</p>
                  <p className="text-xl font-bold text-content-primary">{customers.length}</p>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'analysis' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto py-8">
              <div className="glass-card p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-accent-gold/10 flex items-center justify-center"><Zap size={24} className="text-accent-gold" /></div>
                  <div>
                    <h3 className="text-lg font-bold text-content-primary">Mapping Columns</h3>
                    <p className="text-xs text-slate-500">Mapping data from {fileName}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  {[{ k: 'date', label: 'Date Column' }, { k: 'amount', label: 'Amount Column' }, { k: 'particulars', label: 'Description/Particulars' }, { k: 'refNo', label: 'Ref/UTR Number (Optional)' }].map(({ k, label }) => (
                    <Select key={k} label={label} value={(mapping as any)[k]} onChange={e => setMapping(p => ({ ...p, [k]: e.target.value }))} options={[{ value: '', label: 'Skip' }, ...headers.map(h => ({ value: h, label: h }))]} />
                  ))}
                </div>

                {parsingProgress > 0 && (
                  <div className="mb-8">
                    <div className="flex justify-between mb-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Intelligent Analysis Progress</p>
                      <p className="text-[10px] font-bold text-accent-red">{Math.round(parsingProgress)}%</p>
                    </div>
                    <div className="h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${parsingProgress}%` }} className="h-full bg-accent-red" />
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => setStep('upload')}>Change File</Button>
                  <Button className="flex-1" onClick={runSmartAnalysis}>Run Analysis →</Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'reconcile' && transactions.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto py-20 text-center">
              <div className="glass-card p-10">
                <AlertCircle size={40} className="text-accent-red mx-auto mb-4" />
                <h3 className="text-lg font-bold text-content-primary mb-2">No Transactions Found</h3>
                <p className="text-sm text-slate-500 mb-6">The analysis finished but no rows were processed. Please try re-mapping your columns.</p>
                <Button className="w-full" onClick={() => setStep('analysis')}>Go Back to Mapping</Button>
              </div>
            </motion.div>
          )}

          {step === 'reconcile' && transactions.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar: Stats & Filters */}
              <div className="lg:col-span-1 space-y-6">
                <div className="glass-card p-5">
                  <h3 className="text-sm font-bold text-content-primary mb-4">Statement Summary</h3>
                  <div className="space-y-4">
                    <StatRow label="Total Items" value={stats.total} />
                    <StatRow label="Pending" value={stats.pending} />
                    <StatRow label="Reconciled" value={stats.reconciled} color="text-success" />
                    <StatRow label="Smart Matches" value={stats.highConf} color="text-accent-gold" icon={<Zap size={10} />} />
                  </div>
                  <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                    <Button className="w-full" onClick={handleFinalize} loading={importing} disabled={stats.reconciled === 0}>Finalize Records</Button>
                    <Button variant="secondary" className="w-full" onClick={() => exportToExcel(transactions)}>
                      <Download size={14} /> Download Statement
                    </Button>
                  </div>
                </div>

                <div className="glass-card p-5">
                  <h3 className="text-sm font-bold text-content-primary mb-4">View Filters</h3>
                  <div className="space-y-3">
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input className="input-field pl-9 py-2 text-xs" placeholder="Search particulars..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      {(['all', 'pending', 'reconciled', 'flagged'] as const).map(f => (
                        <button key={f} onClick={() => setStatusFilter(f)} className={`w-full text-left px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${statusFilter === f ? 'bg-accent-red/10 text-accent-red' : 'text-slate-500 hover:bg-white/5'}`}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content: Transaction List */}
              <div className="lg:col-span-3">
                <div className="glass-card overflow-hidden">
                  <div className="bg-white/[0.02] border-b border-white/5 px-6 py-4 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-400">Transactions ({filteredTxns.length})</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tip: Select a transaction to reconcile</p>
                  </div>
                  <div className="max-h-[600px] overflow-y-auto scrollbar-hide">
                    {filteredTxns.map((txn, idx) => (
                      <TransactionRow 
                        key={txn.id} 
                        txn={txn} 
                        customers={customers} 
                        active={selectedTxn?.id === txn.id}
                        onClick={() => setSelectedTxn(txn)}
                        onLink={handleLink}
                        onFlag={handleFlag}
                        last={idx === filteredTxns.length - 1}
                      />
                    ))}
                    {filteredTxns.length === 0 && (
                      <div className="py-20 text-center">
                        <p className="text-sm text-slate-500">No transactions match your filters.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto py-20">
              <div className="glass-card p-10 text-center">
                <div className="w-20 h-20 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={40} className="text-success" />
                </div>
                <h3 className="text-2xl font-bold text-content-primary mb-2">Import Successful!</h3>
                <p className="text-sm text-slate-500 mb-8">{importedCount} transactions have been finalized and recorded in the customer ledgers.</p>
                <div className="space-y-3">
                  <Button className="w-full" onClick={() => { setStep('upload'); setTransactions([]); }}>Import New Statement</Button>
                  <Button variant="secondary" className="w-full" onClick={() => setActiveTab('history')}>View Import History</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────

function StatRow({ label, value, color = "text-white", icon }: any) {
  return (
    <div className="flex justify-between items-center">
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">{icon}{label}</p>
      <p className={`text-sm font-black ${color}`}>{value}</p>
    </div>
  );
}

function TransactionRow({ txn, customers, active, onClick, onLink, onFlag, last }: any) {
  const suggested = txn.suggestedCustomerId ? customers.find((c: any) => c.id === txn.suggestedCustomerId) : null;
  const linked = txn.customerId ? customers.find((c: any) => c.id === txn.customerId) : null;

  return (
    <div className={`transition-all ${active ? 'bg-accent-red/[0.03] ring-1 ring-inset ring-accent-red/20' : 'hover:bg-white/[0.02]'} ${!last ? 'border-b border-white/[0.04]' : ''}`}>
      <div className="flex items-center gap-4 px-6 py-4 cursor-pointer" onClick={onClick}>
        <div className="w-10 h-10 rounded-xl bg-bg-secondary flex items-center justify-center flex-shrink-0 text-slate-500">
          {txn.type === 'CR' ? <IndianRupee size={16} className="text-success" /> : <IndianRupee size={16} className="text-danger" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-content-primary truncate">{txn.particulars}</p>
            {txn.status === 'reconciled' && <ShieldCheck size={12} className="text-success" />}
            {txn.status === 'flagged' && <Flag size={12} className="text-accent-red" />}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-widest font-bold">
            {txn.date} · Ref: {txn.refNo || 'N/A'}
          </p>
        </div>
        <div className="text-right flex items-center gap-6">
          <div className="hidden md:block">
             {linked ? (
               <div className="flex items-center gap-1.5 text-success font-bold text-[10px] uppercase tracking-wider">
                 <LinkIcon size={10} /> {linked.name}
               </div>
             ) : suggested ? (
               <div className="flex items-center gap-1.5 text-accent-gold font-bold text-[10px] uppercase tracking-wider animate-pulse">
                 <Zap size={10} /> Suggested: {suggested.name}
               </div>
             ) : (
               <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Unmatched</p>
             )}
          </div>
          <p className={`text-sm font-black amount w-24 ${txn.type === 'CR' ? 'text-success' : 'text-danger'}`}>
            {txn.type === 'CR' ? '+' : '-'}{formatCurrency(txn.amount)}
          </p>
          <ChevronRight size={14} className={`text-slate-700 transition-transform ${active ? 'rotate-90' : ''}`} />
        </div>
      </div>

      <AnimatePresence>
        {active && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-white/[0.01]">
            <div className="px-6 pb-6 pt-2 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quick Link Party</p>
                  <select 
                    className="input-field text-xs py-2"
                    value={txn.customerId || txn.suggestedCustomerId || ''}
                    onChange={(e) => onLink(txn, e.target.value)}
                  >
                    <option value="">Select Customer...</option>
                    {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <Button variant="secondary" size="sm" className="w-full h-9" onClick={() => onFlag(txn)}>
                    <Flag size={12} /> Flag Transaction
                  </Button>
                </div>
              </div>
              {txn.rawNarration && (
                <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-1">Full Narration</p>
                  <p className="text-[11px] text-slate-400 font-mono leading-relaxed">{txn.rawNarration}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HistoryTab({ history, accounts }: any) {
  const getBankName = (id: string) => accounts.find((a: any) => a.id === id)?.name || 'Unknown Bank';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {history.length === 0 ? (
        <div className="glass-card py-20 text-center">
          <History size={48} className="text-slate-800 mx-auto mb-4" />
          <p className="text-slate-500 font-bold">No import history found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {history.map((session: any) => (
            <div key={session.id} className="glass-card p-5 hover:border-accent-red/20 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-accent-red/5 border border-accent-red/10 flex items-center justify-center text-accent-red group-hover:scale-110 transition-transform">
                  <FileSpreadsheet size={20} />
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{session.date}</p>
              </div>
              <h4 className="text-sm font-bold text-content-primary mb-1 truncate">{session.fileName}</h4>
              <p className="text-[10px] font-bold text-accent-red mb-4 uppercase tracking-wider">{getBankName(session.bankAccountId)}</p>
              
              <div className="grid grid-cols-2 gap-4 py-3 border-t border-white/5">
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total Rows</p>
                  <p className="text-sm font-black text-content-primary">{session.totalTransactions}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Linked</p>
                  <p className="text-sm font-black text-success">{session.reconciledCount}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function AnalyticsTab({ transactions, customers }: any) {
  const data = useMemo(() => {
    const monthly: Record<string, { cr: number, dr: number }> = {};
    const daily: Record<string, { cr: number, dr: number }> = {};
    const topCustomers: Record<string, number> = {};

    console.log('Analyzing Transactions for Insights:', transactions.length);

    transactions.forEach((t: any) => {
      // Robust date parsing
      let dateObj;
      try {
        dateObj = new Date(t.date);
        if (isNaN(dateObj.getTime())) throw new Error();
      } catch (e) {
        // Fallback for DD/MM/YYYY
        const parts = t.date.split(/[/-]/);
        if (parts.length === 3) {
          dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }

      if (!dateObj || isNaN(dateObj.getTime())) return;

      const month = dateObj.toISOString().substring(0, 7); // YYYY-MM
      const day = dateObj.toISOString().substring(0, 10); // YYYY-MM-DD
      
      if (!monthly[month]) monthly[month] = { cr: 0, dr: 0 };
      if (!daily[day]) daily[day] = { cr: 0, dr: 0 };
      
      const amt = Number(t.amount) || 0;
      if (t.type === 'CR') {
        monthly[month].cr += amt;
        daily[day].cr += amt;
      } else {
        monthly[month].dr += amt;
        daily[day].dr += amt;
      }

      if (t.customerId) {
        const name = customers.find((c: any) => c.id === t.customerId)?.name || 'Unknown';
        topCustomers[name] = (topCustomers[name] || 0) + amt;
      }
    });

    return { 
      monthly: Object.entries(monthly).sort().slice(-6), 
      daily: Object.entries(daily).sort().slice(-14),
      topCustomers: Object.entries(topCustomers).sort((a,b) => b[1] - a[1]).slice(0, 5)
    };
  }, [transactions, customers]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-end">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full">
          Total Records Scanned: {transactions.length}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InsightCard title="Monthly Cashflow" subtitle="Last 6 Months">
          <div className="h-40 flex items-end gap-2 px-2">
            {data.monthly.map(([m, vals]) => (
              <div key={m} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full flex flex-col justify-end gap-1 h-full">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${Math.min(100, (vals.cr / 100000) * 100)}%` }} className="w-full bg-success/40 rounded-t-sm group-hover:bg-success transition-all" />
                  <motion.div initial={{ height: 0 }} animate={{ height: `${Math.min(100, (vals.dr / 100000) * 100)}%` }} className="w-full bg-danger/40 rounded-t-sm group-hover:bg-danger transition-all" />
                </div>
                <p className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">{m.split('-')[1]}</p>
              </div>
            ))}
          </div>
        </InsightCard>

        <InsightCard title="Top Paying Parties" subtitle="By Volume">
          <div className="space-y-3">
            {data.topCustomers.map(([name, amt]) => (
              <div key={name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-bold text-slate-400">{name[0]}</div>
                  <p className="text-[11px] font-bold text-content-primary truncate w-24">{name}</p>
                </div>
                <p className="text-[11px] font-black text-success">{formatCurrency(amt)}</p>
              </div>
            ))}
            {data.topCustomers.length === 0 && <p className="text-center py-10 text-xs text-slate-600 italic">No matched data yet</p>}
          </div>
        </InsightCard>

        <InsightCard title="Daily Pulse" subtitle="Last 14 Days">
          <div className="h-40 flex items-end gap-1 px-2">
            {data.daily.map(([d, vals]) => (
              <div key={d} className="flex-1 h-full flex items-end">
                <motion.div 
                  initial={{ height: 0 }} 
                  animate={{ height: `${Math.min(100, ((vals.cr + vals.dr) / 50000) * 100)}%` }} 
                  className={`w-full rounded-t-[1px] ${vals.cr > vals.dr ? 'bg-accent-red' : 'bg-slate-700'}`} 
                />
              </div>
            ))}
          </div>
        </InsightCard>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp size={20} className="text-accent-red" />
          <h3 className="text-lg font-bold text-content-primary">Smart Reconciliation Logic</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Automatic Fetching</h4>
            <p className="text-sm text-slate-400 leading-relaxed">Every transaction is automatically parsed and scanned for UPI IDs, UTR numbers, and Invoice references. The system matches these against your customer database in real-time.</p>
          </div>
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Product & Party Insights</h4>
            <p className="text-sm text-slate-400 leading-relaxed">By analyzing narrations like "PAYMENT FOR RICE" or "INV-102", the system intelligently links bank data to your physical inventory and sales orders.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function InsightCard({ title, subtitle, children }: any) {
  return (
    <div className="glass-card p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-content-primary">{title}</h3>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

const exportToExcel = (txns: Transaction[]) => {
  const data = txns.map(t => ({
    Date: t.date,
    Particulars: t.particulars,
    Type: t.type === 'CR' ? 'Credit' : 'Debit',
    Amount: t.amount,
    'Reference No': t.refNo,
    Status: t.status,
    'Matched Customer': t.customerId || 'Manual'
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reconciled Statement');
  XLSX.writeFile(wb, `Reconciled_Statement_${todayISO()}.xlsx`);
};

function IndianRupee({ size, className }: any) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M6 3h12" />
      <path d="M6 8h12" />
      <path d="m6 13 12 0" />
      <path d="M18 3c-4 0-8 2-8 6s4 6 8 6" />
      <path d="m9 21 6-8" />
    </svg>
  );
}
