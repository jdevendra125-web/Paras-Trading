import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Printer, Download, Pencil, Share2, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { getSettings, calculateInvoiceTotal } from '../../lib/storage';
import { numberToWords } from '../../lib/numberToWords';
import { formatCurrency } from '../../lib/utils';
import type { InvoiceData, UserSettings } from '../../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

interface Props { data: InvoiceData; onEdit?: () => void; }

export function InvoicePreviewPage({ data, onEdit }: Props) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => { getSettings().then(setSettings); }, []);

  const total = data.totalAmount || calculateInvoiceTotal(data);
  const isService = data.invoiceType === 'service';

  const items = data.items || [];
  let subtotal = 0, gstTotal = 0;
  const itemRows = items.map((item: any) => {
    const incRate = Number(item.inclusiveRate) || 0;
    const qty = isService ? 1 : (Number(item.qty) || 1);
    const gstRate = Number(item.gstRate) || 0;
    const isInclusive = item.isInclusive !== false;
    const taxableRate = isInclusive ? incRate / (1 + gstRate / 100) : incRate;
    const taxable = taxableRate * qty;
    const gst = taxable * (gstRate / 100);
    subtotal += taxable;
    gstTotal += gst;
    return { ...item, taxable, gst, qty };
  });

  const loading = Number(data.loadingCharges) || 0;
  const transport = Number(data.transportCharges) || 0;
  const other = Number(data.otherCharges) || 0;
  const hamali = Number(data.hamali) || 0;

  const isSameState = settings?.gstin?.slice(0, 2) === data.receiverStateCode;

  
  const capturePDF = async () => {
    if (!printRef.current) return null;
    return await html2canvas(printRef.current, {
      scale: 2.5, // Reduced from 5 to prevent Chrome 1s gesture timeout
      backgroundColor: '#fff',
      useCORS: true,
      windowWidth: 1024,
      onclone: (doc) => {
        const el = doc.getElementById('invoice-print-content');
        if (el) {
          el.style.width = '1024px';
          el.style.maxWidth = '1024px';
          let p = el.parentElement;
          while (p && p.tagName !== 'BODY') {
            p.style.overflow = 'visible';
            p.style.height = 'auto';
            p.style.maxHeight = 'none';
            p = p.parentElement;
          }
        }
      }
    });
  };

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      const canvas = await capturePDF();
      if (!canvas) return;
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, w, h);
      pdf.save(`${data.invoiceNo.replace(/\//g, '-')}.pdf`);
    } finally { setDownloading(false); }
  };

  const handleSharePDF = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      const canvas = await capturePDF();
      if (!canvas) return;
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, w, h);
      
      if (Capacitor.isNativePlatform()) {
        const base64Data = pdf.output('datauristring').split(',')[1];
        const fileName = `${data.invoiceNo.replace(/\//g, '-')}.pdf`;
        
        const result = await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Documents
        });
        
        await Share.share({
          title: `Invoice ${data.invoiceNo}`,
          text: `Greetings from ${settings?.companyName || 'Registered'}.\n\nPlease find attached Invoice No: ${data.invoiceNo} for ${formatCurrency(total)}.`,
          files: [result.uri],
          dialogTitle: 'Share Invoice PDF'
        });
      } else {
        // Web Fallback
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], `${data.invoiceNo.replace(/\//g, '-')}.pdf`, { type: 'application/pdf' });
        
        if (navigator.share) {
          try {
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: `Invoice ${data.invoiceNo}`,
                text: `Greetings from ${settings?.companyName || 'Registered'}.\n\nPlease find attached Invoice No: ${data.invoiceNo} for ${formatCurrency(total)}.`
              });
            } else {
              // Fallback to sharing just text and URL if files are not supported
              await navigator.share({
                title: `Invoice ${data.invoiceNo}`,
                text: `Greetings from ${settings?.companyName || 'Registered'}.\n\nInvoice No: ${data.invoiceNo} for ${formatCurrency(total)}.`,
                url: window.location.href
              });
            }
          } catch (e: any) {
            console.error('Error in Web Share:', e);
            if (e.name === 'NotAllowedError' || e.message?.toLowerCase().includes('user gesture')) {
              // If it still timed out, trigger text-only share as a last resort since it doesn't need file validation
              await navigator.share({
                title: `Invoice ${data.invoiceNo}`,
                text: `Greetings from ${settings?.companyName || 'Registered'}.\n\nInvoice No: ${data.invoiceNo} for ${formatCurrency(total)}.`,
                url: window.location.href
              }).catch(() => {});
            }
          }
        }
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally { 
      setDownloading(false); 
    }
  };

  const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
    <tr className={bold ? 'font-bold' : ''}>
      <td className="py-1 text-xs text-slate-600 pr-4">{label}</td>
      <td className="py-1 text-xs text-right">{value}</td>
    </tr>
  );

  return (
    <div className="page-container">
      {/* Action Buttons */}
      <div className="flex gap-2 mb-4 no-print overflow-x-auto pb-1 scrollbar-hide items-center w-full">
        <button onClick={() => navigate(-1)} className="btn-secondary min-w-[80px] text-xs py-2 flex items-center justify-center gap-1.5">← Back</button>
        {onEdit && <button onClick={onEdit} className="btn-secondary min-w-[80px] text-xs py-2 flex items-center justify-center gap-1.5"><Pencil size={12} /> Edit</button>}
        <button onClick={handlePrint} className="btn-secondary min-w-[80px] text-xs py-2 hidden sm:flex items-center justify-center gap-1.5"><Printer size={12} /> Print</button>
        <button onClick={handleDownload} className="btn-secondary min-w-[80px] text-xs py-2 flex items-center justify-center gap-1.5"><Download size={12} /> Save</button>
        <div className="flex-1" />
        <Button onClick={handleSharePDF} loading={downloading} size="sm" className="btn-primary min-w-[120px] text-xs py-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white border-none shadow-lg shadow-[#25D366]/20" icon={<Share2 size={12} />}>Share PDF</Button>
      </div>

      {/* Invoice Document */}
      <div className="w-full overflow-x-auto pb-6 hide-scrollbar">
        <div className="min-w-[800px] w-full mx-auto">
          <div id="invoice-print-content" ref={printRef} className="bg-white text-gray-900 rounded-2xl overflow-hidden print:rounded-none shadow-sm" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }}>
        {/* Header */}
        <div className="px-8 py-8 border-b border-gray-100">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-3xl font-black text-[#B91C1C] tracking-tight uppercase leading-none mb-2">
                {settings?.companyName || 'REGISTERED'}
              </h1>
              <p className="text-sm font-bold text-gray-700 mb-4">
                Proprietor: {settings?.proprietorName || 'Parasmal Jethmal Jain'}
              </p>
              <div className="text-[11px] text-gray-500 leading-relaxed max-w-sm">
                <p>{settings?.address}</p>
                <p className="mt-1 font-bold text-gray-700">GSTIN: {settings?.gstin}</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="bg-[#EEF2FF] text-[#4338CA] px-4 py-2 rounded-lg font-bold text-sm tracking-widest uppercase mb-6">
                Tax Invoice
              </div>
              <div className="space-y-1">
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Invoice No</p>
                <p className="text-sm font-black text-gray-800">{data.invoiceNo}</p>
              </div>
              <div className="mt-4 space-y-1">
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">Date</p>
                <p className="text-sm font-black text-gray-800">{data.dateOfSupply}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Receiver & Transport Boxes */}
        <div className="px-8 py-6 grid grid-cols-2 gap-6">
          <div className="bg-[#F8FAFC] rounded-2xl p-6 border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Billed To</p>
            <div className="space-y-1">
              <p className="text-lg font-black text-gray-800 leading-tight">{data.receiverName}</p>
              <p className="text-[11px] text-gray-500 leading-relaxed mt-2">{data.receiverAddress}</p>
              <p className="text-[11px] font-bold text-gray-700 mt-2">GSTIN: {data.receiverGstin}</p>
            </div>
          </div>
          <div className="bg-[#F8FAFC] rounded-2xl p-6 border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">Transport & Delivery</p>
            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">P.O. Number</p>
                <p className="text-[11px] font-bold text-gray-800">{data.poNo || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">P.O. Date</p>
                <p className="text-[11px] font-bold text-gray-800">{data.poDate || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Vehicle No.</p>
                <p className="text-[11px] font-bold text-gray-800 uppercase">{data.vehicleNo || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Transport</p>
                <p className="text-[11px] font-bold text-gray-800">{data.nameOfTransport || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Place of Supply</p>
                <p className="text-[11px] font-bold text-gray-800">{data.placeOfSupply || '-'}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Mode</p>
                <p className="text-[11px] font-bold text-gray-800">{data.modeOfTransport || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="px-8 py-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F1F5F9] border-y border-gray-200">
                <th className="py-3 px-3 text-left font-bold text-gray-500 w-12">#</th>
                <th className="py-3 px-3 text-left font-bold text-gray-500">Description of Goods</th>
                {!isService && <th className="py-3 px-3 text-center font-bold text-gray-500">HSN</th>}
                {!isService && <th className="py-3 px-3 text-center font-bold text-gray-500">Qty</th>}
                {!isService && <th className="py-3 px-3 text-center font-bold text-gray-500">Unit</th>}
                <th className="py-3 px-3 text-right font-bold text-gray-500">{isService ? 'Amount' : 'Rate (₹)'}</th>
                <th className="py-3 px-3 text-right font-bold text-gray-500">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itemRows.map((item: any, i: number) => (
                <tr key={i} className="group">
                  <td className="py-4 px-3 text-gray-500 font-medium">{i + 1}</td>
                  <td className="py-4 px-3">
                    <p className="font-black text-gray-800 text-sm mb-0.5">{item.description}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">GST: {item.gstRate}%</p>
                  </td>
                  {!isService && <td className="py-4 px-3 text-center font-bold text-gray-600">{item.hsnCode}</td>}
                  {!isService && <td className="py-4 px-3 text-center font-black text-gray-800">{item.qty}</td>}
                  {!isService && <td className="py-4 px-3 text-center font-bold text-gray-500">{item.unit}</td>}
                  <td className="py-4 px-3 text-right font-bold text-gray-700">{Number(item.inclusiveRate).toFixed(2)}</td>
                  <td className="py-4 px-3 text-right font-black text-gray-800 text-sm">{(item.taxable + item.gst).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bank & Totals Section */}
        <div className="px-8 py-8 flex justify-between items-start gap-12">
          <div className="flex-1 space-y-8">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Bank Details</p>
              <div className="space-y-1">
                <p className="text-[11px] text-gray-700"><span className="font-bold text-gray-400 uppercase w-20 inline-block">Account Name</span> {settings?.bankAccountName || settings?.companyName}</p>
                <p className="text-[11px] text-gray-700"><span className="font-bold text-gray-400 uppercase w-20 inline-block">Bank</span> {settings?.bankName}</p>
                <p className="text-[11px] text-gray-700"><span className="font-bold text-gray-400 uppercase w-20 inline-block">Account No</span> {settings?.bankAccountNo}</p>
                <p className="text-[11px] text-gray-700"><span className="font-bold text-gray-400 uppercase w-20 inline-block">IFSC Code</span> {settings?.bankIfsc}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-3">Terms & Conditions</p>
              <p className="text-[10px] text-gray-400 leading-relaxed italic max-w-xs">
                {settings?.termsConditions || 'Certified that the particulars given above are true & correct. Interest will be recovered @ 24% p.a. on overdue unpaid bills.'}
              </p>
            </div>
          </div>

          <div className="w-72">
            <div className="bg-[#F8FAFC] rounded-2xl p-6 border border-gray-100 space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-gray-500">Subtotal</p>
                <p className="text-xs font-black text-gray-800">₹ {subtotal.toFixed(2)}</p>
              </div>
              {isSameState ? (
                <>
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-gray-500">CGST</p>
                    <p className="text-xs font-black text-gray-800">₹ {(gstTotal / 2).toFixed(2)}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-gray-500">SGST</p>
                    <p className="text-xs font-black text-gray-800">₹ {(gstTotal / 2).toFixed(2)}</p>
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-gray-500">IGST</p>
                  <p className="text-xs font-black text-gray-800">₹ {gstTotal.toFixed(2)}</p>
                </div>
              )}
              {hamali > 0 && (
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-gray-500">Hamali</p>
                  <p className="text-xs font-black text-gray-800">₹ {hamali.toFixed(2)}</p>
                </div>
              )}
              <div className="h-px bg-gray-200 my-2" />
              <div className="flex justify-between items-center">
                <p className="text-lg font-black text-gray-800">Total</p>
                <p className="text-2xl font-black text-[#B91C1C]">₹ {total.toFixed(0)}</p>
              </div>
            </div>
            <p className="text-[10px] text-right text-gray-400 mt-4 italic font-medium leading-relaxed">
              Amount in words: {numberToWords(total)} Only
            </p>
          </div>
        </div>

        <div className="px-8 py-10 flex justify-between items-end">
          <p className="text-[10px] text-gray-300 font-medium">This is a computer-generated invoice</p>
          <div className="text-right">
            <p className="text-sm font-black text-gray-800 uppercase tracking-tighter">FOR {settings?.companyName || 'REGISTERED'}</p>
            <div className="h-16" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Authorised Signatory</p>
          </div>
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}
