import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { getCustomers, getBankAccounts, addTransaction, getTransactions } from '../lib/storage';
import type { Customer, BankAccount } from '../types';
import { Save } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Select from 'react-select';

// Use local worker bundled by Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface ParsedTransaction {
  id: string;
  date: string;
  particulars: string;
  refNo: string;
  amount: number;
  type: 'CR' | 'DR';
  customerId?: string; // matched customer
}

export function BankImport() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existingTransactions, setExistingTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (selectedBankAccountId) {
      getTransactions().then(txs => {
        setExistingTransactions(txs.filter((t: any) => t.bankAccountId === selectedBankAccountId));
      });
    }
  }, [selectedBankAccountId]);

  useEffect(() => {
    async function fetchData() {
      const [cData, bData] = await Promise.all([getCustomers(), getBankAccounts()]);
      setCustomers(cData.sort((a, b) => a.name.localeCompare(b.name)));
      setBankAccounts(bData);
      if (bData.length > 0) {
        setSelectedBankAccountId(bData[0].id);
      }
    }
    fetchData();
  }, []);

  const parsePDF = async (arrayBuffer: ArrayBuffer) => {
    const parsed: ParsedTransaction[] = [];
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const allItems: {str: string, x: number, y: number}[] = [];
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      const lines: { [y: number]: {str: string, x: number}[] } = {};
      for (const item of textContent.items as any[]) {
        const str = item.str.trim();
        if (!str) continue;
        const y = Math.round(item.transform[5] / 4) * 4;
        if (!lines[y]) lines[y] = [];
        lines[y].push({ str, x: item.transform[4] });
      }
      
      const sortedY = Object.keys(lines).map(Number).sort((a, b) => b - a);
      for (const y of sortedY) {
        const lineItems = lines[y].sort((a, b) => a.x - b.x);
        for (const item of lineItems) {
           allItems.push({ str: item.str, x: item.x, y });
        }
      }
    }
    
    let debitX: number | null = null;
    let creditX: number | null = null;
    let lastBalance: number | null = null;
    
    for (let i = 0; i < allItems.length; i++) {
      const str = allItems[i].str.toUpperCase();
      if (str === "DEBIT") debitX = allItems[i].x;
      if (str === "CREDIT") creditX = allItems[i].x;
      
      if (str.includes("OPENING BALANCE") || (str === "OPENING" && allItems[i+1]?.str.toUpperCase() === "BALANCE")) {
        for (let j = i; j < i + 10 && j < allItems.length; j++) {
           if (/^[0-9,]+\.\d{2}$/.test(allItems[j].str)) {
              lastBalance = parseFloat(allItems[j].str.replace(/,/g, ''));
              break;
           }
        }
      }
    }

    let blocks: {str: string, x: number}[][] = [];
    let currentBlock: {str: string, x: number}[] = [];
    
    for (const item of allItems) {
      if (/^\d{2}-\d{2}-\d{4}$/.test(item.str)) {
        if (currentBlock.length > 0) blocks.push(currentBlock);
        currentBlock = [item];
      } else if (currentBlock.length > 0) {
        currentBlock.push(item);
      }
    }
    if (currentBlock.length > 0) blocks.push(currentBlock);

    for (const block of blocks) {
      const date = block[0].str;
      const amounts = block.filter(item => /^[0-9,]+\.\d{2}$/.test(item.str));
      
      if (amounts.length >= 2) {
        const balanceItem = amounts[amounts.length - 1];
        const txAmountItem = amounts[amounts.length - 2];
        
        const currentBalance = parseFloat(balanceItem.str.replace(/,/g, ''));
        const txAmount = parseFloat(txAmountItem.str.replace(/,/g, ''));
        
        let type: 'CR' | 'DR' | null = null;
        
        // Method 1: Running Balance Math
        if (lastBalance !== null) {
          const diff = Math.round((currentBalance - lastBalance) * 100) / 100;
          if (diff > 0 && Math.abs(diff - txAmount) < 0.1) type = 'CR';
          else if (diff < 0 && Math.abs(Math.abs(diff) - txAmount) < 0.1) type = 'DR';
        }
        
        // Method 2: Column X proximity
        if (!type && debitX !== null && creditX !== null) {
          const distToDebit = Math.abs(txAmountItem.x - debitX);
          const distToCredit = Math.abs(txAmountItem.x - creditX);
          type = distToCredit < distToDebit ? 'CR' : 'DR';
        }
        
        // Method 3: Fallback string matching
        if (!type) {
           if (block.some(i => i.str.includes('CR'))) type = 'CR';
           else type = 'DR'; 
        }
        
        let particularsArr: string[] = [];
        for (let i = 1; i < block.length; i++) {
           if (block[i].str === txAmountItem.str) break;
           // Exclude headers that might have snuck in due to page breaks
           const s = block[i].str.toUpperCase();
           if (s !== "TRAN" && s !== "DATE" && s !== "CHQ" && s !== "NO" && s !== "PARTICULARS" && s !== "DEBIT" && s !== "CREDIT" && s !== "BALANCE" && s !== "INIT.") {
             particularsArr.push(block[i].str);
           }
        }
        
        if (txAmount > 0 && type) {
           parsed.push({
              id: crypto.randomUUID(),
              date,
              particulars: particularsArr.join(' '),
              refNo: '',
              amount: txAmount,
              type
           });
           lastBalance = currentBalance;
        }
      }
    }
    
    return parsed;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleProcessFile = () => {
    if (!selectedFile) {
      alert("Please choose a file first.");
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        let parsed: ParsedTransaction[] = [];

        if (selectedFile.name.toLowerCase().endsWith('.pdf')) {
          parsed = await parsePDF(bstr as ArrayBuffer);
        } else {
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          
          let headerRowIdx = -1;
          for (let i = 0; i < Math.min(20, data.length); i++) {
            const rowStr = data[i].join(' ').toLowerCase();
            if (rowStr.includes('tran date') || rowStr.includes('particulars') || rowStr.includes('amount')) {
              headerRowIdx = i;
              break;
            }
          }

          const startIndex = headerRowIdx !== -1 ? headerRowIdx + 1 : 1;
          
          for (let i = startIndex; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < 4) continue;
            
            const date = row[0]?.toString() || '';
            if (!date.match(/\d{2}-\d{2}-\d{4}/)) continue;
            
            const particulars = row[2]?.toString() || '';
            const refNo = row[3]?.toString() || '';
            const amountStr = row[4]?.toString() || '0';
            const typeStr = row[5]?.toString().toUpperCase() || 'DR';
            
            const amount = parseFloat(amountStr.replace(/,/g, ''));
            if (isNaN(amount) || amount === 0) continue;

            parsed.push({
              id: crypto.randomUUID(),
              date,
              particulars,
              refNo,
              amount,
              type: typeStr.includes('CR') ? 'CR' : 'DR',
            });
          }
        }
        
        const cutoffDate = new Date('2026-03-31T23:59:59');
        const filtered = parsed.filter(t => {
          const parts = t.date.split('-');
          if (parts.length === 3) {
            const d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`);
            if (d <= cutoffDate) return false;
          }
          
          const isDup = existingTransactions.some(ex => 
            ex.date === t.date && 
            ex.amount === t.amount && 
            ex.type === t.type
          );
          return !isDup;
        });
        
        setTransactions(filtered);
        
        if (parsed.length === 0) {
           alert('No transactions could be extracted from this file. Ensure it is a valid bank statement format.');
        } else if (filtered.length === 0) {
           alert(`Found ${parsed.length} transactions, but they were all either duplicates or older than the cutoff date (31/03/2026).`);
        } else {
           alert(`Successfully extracted ${filtered.length} new transactions.`);
        }
      } catch (error: any) {
        console.error('Error parsing file', error);
        alert(`Failed to parse the file: ${error?.message || 'Invalid format'}. Ensure it is a valid bank statement Excel/CSV/PDF.`);
      } finally {
        setLoading(false);
      }
    };
    
    if (selectedFile.name.toLowerCase().endsWith('.pdf')) {
      reader.readAsArrayBuffer(selectedFile);
    } else {
      reader.readAsBinaryString(selectedFile);
    }
  };

  const handleCustomerMatch = (id: string, customerId: string) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, customerId } : t));
  };

  const handleSave = async () => {
    if (!selectedBankAccountId) {
      alert('Please select a Bank Account first.');
      return;
    }
    
    if (transactions.length === 0) {
      alert('No transactions to save.');
      return;
    }

    setSaving(true);
    try {
      for (const t of transactions) {
        await addTransaction({
          date: t.date,
          amount: t.amount,
          type: t.type,
          mode: 'Bank',
          bankAccountId: selectedBankAccountId,
          customerId: t.customerId || undefined,
          particulars: t.particulars,
          refNo: t.refNo
        });
      }
      alert('Successfully imported all transactions!');
      setTransactions([]); // clear on success
    } catch (e) {
      console.error(e);
      alert('Error saving transactions.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="header mb-4" style={{ position: 'relative', border: 'none', padding: 0, backgroundColor: 'transparent', boxShadow: 'none' }}>
        <h1 className="header-title">Import Bank Statement</h1>
      </div>

      <div className="card mb-4">
        <div className="card-body form-row">
          <div className="form-col" style={{ flex: 1 }}>
            <label className="form-label">Select Bank Account</label>
            <select className="form-control" value={selectedBankAccountId} onChange={e => setSelectedBankAccountId(e.target.value)}>
              {bankAccounts.map(b => (
                <option key={b.id} value={b.id}>{b.name} ({b.accountNo})</option>
              ))}
            </select>
          </div>
          <div className="form-col" style={{ flex: 2 }}>
            <label className="form-label">Upload Statement (Excel/CSV/PDF)</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="file" className="form-control" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/pdf" onChange={handleFileChange} />
              <button className="btn btn-primary" onClick={handleProcessFile} disabled={!selectedFile || loading} style={{ whiteSpace: 'nowrap' }}>
                {loading ? 'Processing...' : 'Process File'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading && <p>Parsing file...</p>}

      {transactions.length > 0 && (
        <div className="card">
          <div className="card-header flex justify-between items-center">
            <h2 style={{ fontSize: '1.1rem' }}>Extracted Transactions</h2>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : <><Save size={16} /> Save to Ledger</>}
            </button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
              <table className="table responsive-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th style={{ width: '35%' }}>Particulars</th>
                    <th>Ref/Chq No</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'center' }}>Type</th>
                    <th style={{ width: '25%' }}>Match to Customer</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(t => (
                    <tr key={t.id} style={{ backgroundColor: t.type === 'CR' ? '#f0fdf4' : '#fff' }}>
                      <td data-label="Date">{t.date}</td>
                      <td data-label="Particulars" style={{ fontSize: '13px' }}>{t.particulars}</td>
                      <td data-label="Ref No">{t.refNo}</td>
                      <td data-label="Amount" style={{ textAlign: 'right', fontWeight: 'bold' }}>₹ {t.amount.toFixed(2)}</td>
                      <td data-label="Type" style={{ textAlign: 'center', color: t.type === 'CR' ? 'green' : 'red' }}>{t.type}</td>
                      <td data-label="Match">
                        {t.type === 'CR' ? (
                          <Select
                            options={customers.map(c => ({ value: c.id, label: c.name }))}
                            value={t.customerId ? { value: t.customerId, label: customers.find(c => c.id === t.customerId)?.name || '' } : null}
                            onChange={(option: any) => handleCustomerMatch(t.id, option ? option.value : '')}
                            placeholder="-- Match Customer --"
                            isClearable
                            menuPortalTarget={document.body}
                            menuPosition="fixed"
                            styles={{
                              control: (base) => ({ ...base, minHeight: '36px', borderRadius: '6px', borderColor: '#d1d5db', fontSize: '14px' }),
                              menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                              menu: (base) => ({ ...base, fontSize: '14px' })
                            }}
                          />
                        ) : (
                          <span style={{ color: '#888', fontSize: '13px' }}>- Expense/Payment -</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      <div style={{ height: '80px' }} className="print-hidden"></div>
    </div>
  );
}
