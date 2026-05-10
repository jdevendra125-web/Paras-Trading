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

interface Props { data: InvoiceData; onEdit?: () => void; }

export function InvoicePreviewPage({ data, onEdit }: Props) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => { getSettings().then(setSettings); }, []);

  const total = data.totalAmount || calculateInvoiceTotal(data);

  const items = data.items || [];
  let subtotal = 0, gstTotal = 0;
  const itemRows = items.map((item: any) => {
    const incRate = Number(item.inclusiveRate) || 0;
    const qty = Number(item.qty) || 1;
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

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: '#fff', useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, w, h);
      pdf.save(`${data.invoiceNo.replace(/\//g, '-')}.pdf`);
    } finally { setDownloading(false); }
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
      <div className="flex gap-2 mb-4 no-print">
        <button onClick={() => navigate(-1)} className="btn-secondary flex-1 text-xs py-2">← Back</button>
        {onEdit && <button onClick={onEdit} className="btn-secondary flex-1 text-xs py-2"><Pencil size={12} /> Edit</button>}
        <button onClick={handlePrint} className="btn-secondary flex-1 text-xs py-2"><Printer size={12} /> Print</button>
        <Button onClick={handleDownload} loading={downloading} size="sm" className="flex-1 text-xs py-2" icon={<Download size={12} />}>PDF</Button>
      </div>

      {/* Invoice Document */}
      <div ref={printRef} className="bg-white text-gray-900 rounded-2xl overflow-hidden print:rounded-none" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px' }}>
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-6 py-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-lg font-bold">{settings?.companyName || 'Paras Trading'}</h1>
              <p className="text-xs text-slate-300 mt-0.5">{settings?.proprietorName}</p>
              <p className="text-xs text-slate-400 mt-0.5 max-w-xs">{settings?.address}</p>
              <p className="text-xs text-slate-400">GSTIN: {settings?.gstin}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-blue-300">TAX INVOICE</p>
              <p className="text-xs text-slate-300 mt-1">No: {data.invoiceNo}</p>
              <p className="text-xs text-slate-400">Date: {data.dateOfSupply}</p>
            </div>
          </div>
        </div>

        {/* Receiver & Transport */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Bill To</p>
              <p className="font-bold text-sm">{data.receiverName}</p>
              <p className="text-xs text-gray-600 mt-0.5">{data.receiverAddress}</p>
              <p className="text-xs text-gray-600">{data.receiverState} — {data.receiverStateCode}</p>
              <p className="text-xs text-gray-600">GSTIN: {data.receiverGstin}</p>
              {data.receiverPhone && <p className="text-xs text-gray-600">Ph: {data.receiverPhone}</p>}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Dispatch Details</p>
              {data.vehicleNo && <p className="text-xs text-gray-600">Vehicle: {data.vehicleNo}</p>}
              {data.nameOfTransport && <p className="text-xs text-gray-600">Transport: {data.nameOfTransport}</p>}
              {data.modeOfTransport && <p className="text-xs text-gray-600">Mode: {data.modeOfTransport}</p>}
              {data.placeOfSupply && <p className="text-xs text-gray-600">Place: {data.placeOfSupply}</p>}
              {data.poNo && <p className="text-xs text-gray-600">PO No: {data.poNo}</p>}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="px-6 py-3">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-2 px-2 text-left font-semibold text-gray-600">Description</th>
                <th className="py-2 px-2 text-center font-semibold text-gray-600">HSN</th>
                <th className="py-2 px-2 text-center font-semibold text-gray-600">Qty</th>
                <th className="py-2 px-2 text-right font-semibold text-gray-600">Rate</th>
                <th className="py-2 px-2 text-right font-semibold text-gray-600">Taxable</th>
                <th className="py-2 px-2 text-right font-semibold text-gray-600">GST</th>
                <th className="py-2 px-2 text-right font-semibold text-gray-600">Amount</th>
              </tr>
            </thead>
            <tbody>
              {itemRows.map((item: any, i: number) => (
                <tr key={i} className={i % 2 === 0 ? '' : 'bg-gray-50'}>
                  <td className="py-1.5 px-2">{item.description}</td>
                  <td className="py-1.5 px-2 text-center">{item.hsnCode}</td>
                  <td className="py-1.5 px-2 text-center">{item.qty} {item.unit}</td>
                  <td className="py-1.5 px-2 text-right">₹{Number(item.inclusiveRate).toFixed(2)}</td>
                  <td className="py-1.5 px-2 text-right">₹{item.taxable.toFixed(2)}</td>
                  <td className="py-1.5 px-2 text-right">₹{item.gst.toFixed(2)}</td>
                  <td className="py-1.5 px-2 text-right font-semibold">₹{(item.taxable + item.gst).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-6 pb-4">
          <div className="flex justify-end">
            <table className="text-xs w-48">
              <tbody>
                <Row label="Subtotal" value={`₹${subtotal.toFixed(2)}`} />
                {isSameState ? (
                  <>
                    <Row label="CGST" value={`₹${(gstTotal / 2).toFixed(2)}`} />
                    <Row label="SGST" value={`₹${(gstTotal / 2).toFixed(2)}`} />
                  </>
                ) : <Row label="IGST" value={`₹${gstTotal.toFixed(2)}`} />}
                {loading > 0 && <Row label="Loading" value={`₹${loading.toFixed(2)}`} />}
                {transport > 0 && <Row label="Transport" value={`₹${transport.toFixed(2)}`} />}
                {other > 0 && <Row label="Other" value={`₹${other.toFixed(2)}`} />}
                {hamali > 0 && <Row label="Hamali" value={`₹${hamali.toFixed(2)}`} />}
                <tr><td colSpan={2}><div className="my-1 border-t border-gray-300" /></td></tr>
                <tr className="bg-slate-800 text-white rounded">
                  <td className="py-1.5 px-2 font-bold text-sm rounded-l">TOTAL</td>
                  <td className="py-1.5 px-2 font-bold text-sm text-right rounded-r">₹{total.toFixed(0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-2 italic">Amount in words: {numberToWords(total)}</p>
        </div>

        {/* Bank & Terms */}
        <div className="px-6 pb-4 border-t border-gray-200 grid grid-cols-2 gap-6 pt-3">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Bank Details</p>
            <p className="text-xs text-gray-600">{settings?.bankName}</p>
            {settings?.bankAccountName && <p className="text-xs text-gray-600">A/c Name: {settings.bankAccountName}</p>}
            <p className="text-xs text-gray-600">A/c No: {settings?.bankAccountNo}</p>
            <p className="text-xs text-gray-600">IFSC: {settings?.bankIfsc}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-1">Terms & Conditions</p>
            <p className="text-xs text-gray-500">{settings?.termsConditions || 'Payment due within 30 days.'}</p>
          </div>
        </div>

        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <p className="text-xs text-gray-400">This is a computer-generated invoice</p>
          <p className="text-xs font-bold text-gray-600">Authorised Signatory</p>
        </div>
      </div>
    </div>
  );
}
