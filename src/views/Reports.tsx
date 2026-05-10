import { useEffect, useState, useMemo } from 'react';
import { getInvoices } from '../lib/storage';
import type { InvoiceData } from '../types';
import { Download, Trash2, FileText, Search } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { calculateInvoiceTotal, deleteInvoice } from '../lib/storage';

export function Reports() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchInvoices = async () => {
    try {
      const data = await getInvoices();
      setInvoices(data); // latest first
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDelete = async (invoiceNo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this invoice?')) {
      try {
        await deleteInvoice(invoiceNo);
        fetchInvoices();
      } catch (error) {
        alert('Failed to delete invoice');
        console.error(error);
      }
    }
  };

  const handleExport = () => {
    const data = invoices.map(inv => {
      const total = inv.totalAmount || calculateInvoiceTotal(inv);
      return {
        'Invoice No': inv.invoiceNo,
        'Date': inv.dateOfSupply,
        'Customer': inv.receiverName,
        'GSTIN': inv.receiverGstin,
        'Total Amount': total
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices');
    XLSX.writeFile(workbook, `Invoices_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredInvoices = useMemo(() => {
    if (!searchTerm) return invoices;
    const lower = searchTerm.toLowerCase();
    return invoices.filter(inv => 
      inv.receiverName.toLowerCase().includes(lower) || 
      inv.invoiceNo.toLowerCase().includes(lower)
    );
  }, [invoices, searchTerm]);

  return (
    <div style={{ paddingBottom: '2rem' }}>
      <div className="mb-4 mt-2 px-2 flex justify-between items-center">
        <h1 className="font-bold text-xl">Invoices</h1>
        <button className="btn btn-secondary btn-icon" onClick={handleExport} disabled={invoices.length === 0} style={{ padding: '0.4rem 0.75rem', borderRadius: '1rem', fontSize: '0.75rem' }}>
          <Download size={14} /> <span className="ml-1">Export</span>
        </button>
      </div>

      <div className="px-2 mb-4">
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="form-control" 
            placeholder="Search by customer or #..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '36px', borderRadius: 'var(--radius-xl)' }}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: '0.5rem 1.25rem' }}>
          {loading ? (
            <div className="text-center py-4 text-muted">Loading data...</div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-4 text-muted text-sm">No invoices found.</div>
          ) : (
            filteredInvoices.map((inv) => (
              <div 
                key={inv.invoiceNo} 
                className="list-row"
                onClick={() => navigate(`/preview/${encodeURIComponent(inv.invoiceNo)}`)}
              >
                <div className="flex items-center gap-3">
                  <div style={{ width: 40, height: 40, borderRadius: '10px', backgroundColor: '#F1F5F9', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={20} />
                  </div>
                  <div className="flex-col">
                    <span className="font-semibold text-sm truncate" style={{ maxWidth: '140px' }}>{inv.receiverName}</span>
                    <span className="text-xs text-muted mt-1">#{inv.invoiceNo.split('/').pop()}</span>
                  </div>
                </div>
                <div className="flex-col items-end text-right">
                  <span className="font-bold text-sm">₹{inv.totalAmount || calculateInvoiceTotal(inv)}</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-muted">{inv.dateOfSupply}</span>
                    <button 
                      className="btn-icon" 
                      onClick={(e) => handleDelete(inv.invoiceNo, e)}
                      style={{ color: 'var(--danger)', background: 'none', border: 'none', padding: 0 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
