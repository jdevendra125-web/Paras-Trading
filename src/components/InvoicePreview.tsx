import { useRef, useEffect, useState } from 'react';
import type { InvoiceData, UserSettings } from '../types';
import { getSettings } from '../lib/storage';
import { numberToWords } from '../lib/numberToWords';
import { ArrowLeft, Printer, Share2, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface InvoicePreviewProps {
  data: InvoiceData;
  onEdit: () => void;
}

export function InvoicePreview({ data, onEdit }: InvoicePreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  // Math Logic (Inclusive to Exclusive)
  let subtotal = 0;
  let gstAmount = 0;
  
  data.items.forEach(item => {
    const incRate = Number(item.inclusiveRate) || 0;
    const qty = settings?.invoiceFormat === 'service' ? 1 : (Number(item.qty) || 0);
    const isInclusive = item.isInclusive !== false; // Default true
    const taxableRate = isInclusive ? incRate / (1 + (item.gstRate / 100)) : incRate;
    const itemTaxableTotal = taxableRate * qty;
    subtotal += itemTaxableTotal;
    gstAmount += itemTaxableTotal * (item.gstRate / 100);
  });
  
  const loading = Number(data.loadingCharges) || 0;
  const transport = Number(data.transportCharges) || 0;
  const other = Number(data.otherCharges) || 0;
  const hamali = Number(data.hamali) || 0;

  const taxableAmount = subtotal + loading + transport + other;
  
  const companyGstin = settings?.gstin || '';
  const customerGstin = data.receiverGstin || '';
  const isInterstate = companyGstin.length >= 2 && customerGstin.length >= 2 && companyGstin.substring(0, 2) !== customerGstin.substring(0, 2);

  const cgst = isInterstate ? 0 : gstAmount / 2;
  const sgst = isInterstate ? 0 : gstAmount / 2;
  const igst = isInterstate ? gstAmount : 0;

  const invoiceTotal = taxableAmount + cgst + sgst + igst + hamali;
  const roundedTotal = Math.round(invoiceTotal);
  const totalInWords = numberToWords(roundedTotal) + ' Only';

  const generatePdfBlob = async (): Promise<Blob | null> => {
    const element = printRef.current;
    if (!element) return null;
    
    // Create canvas with higher scale for better quality
    const canvas = await html2canvas(element, { scale: 5, useCORS: true, logging: false });
    const imgData = canvas.toDataURL('image/png');
    
    // A4 dimensions: 210 x 297 mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    return pdf.output('blob');
  };

  const handleDownload = async () => {
    const element = printRef.current;
    if (!element) return;
    
    const canvas = await html2canvas(element, { scale: 5, useCORS: true, logging: false });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Invoice_${data.invoiceNo}.pdf`);
  };

  const handleShare = async () => {
    try {
      const blob = await generatePdfBlob();
      if (!blob) return;

      const file = new File([blob], `Invoice_${data.invoiceNo}.pdf`, { type: 'application/pdf' });
      
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Invoice ${data.invoiceNo}`,
          text: 'Please find attached the invoice.',
        });
      } else {
        alert('Your browser does not support sharing files directly. Please download the PDF and share it manually.');
        handleDownload(); // fallback
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Auto download on mount (Simulating user requirement "pdf will be downloaded and share will open immediately")
  useEffect(() => {
    // Adding a slight delay to ensure fonts/css are loaded before drawing canvas
    const timer = setTimeout(() => {
      handleDownload().then(() => {
        handleShare();
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      <div className="no-print mb-4 flex justify-between items-center">
        <button className="btn btn-secondary" onClick={onEdit}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </button>
          <button className="btn btn-secondary" onClick={handleDownload}>
            <Download size={16} /> Download
          </button>
          <button className="btn btn-primary" onClick={handleShare}>
            <Share2 size={16} /> Share
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', paddingBottom: '20px' }}>
        <div className="invoice-print-container" ref={printRef} style={{ padding: '20px', backgroundColor: 'white', minWidth: '800px' }}>
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: 'var(--primary)', letterSpacing: '-0.5px', textTransform: 'uppercase' }}>
                {settings?.companyName || 'COMPANY NAME'}
              </h1>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#444', marginTop: '4px' }}>
                Proprietor: {settings?.proprietorName || ''}
              </div>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                {settings?.address || 'Company Address'}
                <br />
                <strong>GSTIN:</strong> {settings?.gstin || 'N/A'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'inline-block', padding: '6px 12px', backgroundColor: '#E0E7FF', color: '#3730A3', borderRadius: '4px', fontWeight: '700', fontSize: '14px', marginBottom: '12px', letterSpacing: '1px' }}>
                TAX INVOICE
              </div>
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><span style={{ color: '#666' }}>Invoice No:</span> <strong style={{ color: '#1C1C28' }}>{data.invoiceNo}</strong></div>
                <div><span style={{ color: '#666' }}>Date:</span> <strong style={{ color: '#1C1C28' }}>{data.dateOfSupply.includes('-') && data.dateOfSupply.split('-')[0].length === 4 ? data.dateOfSupply.split('-').reverse().join('-') : data.dateOfSupply}</strong></div>
              </div>
            </div>
          </div>

          {/* Info Blocks */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
            {/* Billed To */}
            <div style={{ flex: 1, backgroundColor: '#F8F9FA', padding: '20px', borderRadius: '8px', border: '1px solid #E4E4EB' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '12px', textTransform: 'uppercase', color: '#8F90A6', letterSpacing: '1px' }}>Billed To</h3>
              <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px', color: '#1C1C28' }}>{data.receiverName}</div>
              <div style={{ fontSize: '12px', color: '#444', lineHeight: '1.5' }}>
                {data.receiverAddress && data.receiverAddress.toUpperCase() !== 'NA' && <div style={{ whiteSpace: 'pre-wrap' }}>{data.receiverAddress}</div>}
                {data.receiverRegion && data.receiverRegion.toUpperCase() !== 'NA' && <div>{data.receiverRegion}</div>}
                {data.receiverGstin && data.receiverGstin.toUpperCase() !== 'NA' && <div><strong>GSTIN:</strong> {data.receiverGstin}</div>}
                {data.receiverPhone && data.receiverPhone.toUpperCase() !== 'NA' && <div><strong>Phone:</strong> {data.receiverPhone}</div>}
                {data.receiverEmail && data.receiverEmail.toUpperCase() !== 'NA' && <div><strong>Email:</strong> {data.receiverEmail}</div>}
              </div>
            </div>

            {/* Transport Details */}
            {settings?.invoiceFormat !== 'service' && (
              <div style={{ flex: 1, backgroundColor: '#F8F9FA', padding: '20px', borderRadius: '8px', border: '1px solid #E4E4EB' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '12px', textTransform: 'uppercase', color: '#8F90A6', letterSpacing: '1px' }}>Transport & Delivery</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12px', color: '#444' }}>
                  <div><span style={{ color: '#8F90A6', display: 'block', fontSize: '10px' }}>P.O. Number</span><strong style={{ color: '#1C1C28' }}>{data.poNo || '-'}</strong></div>
                  <div><span style={{ color: '#8F90A6', display: 'block', fontSize: '10px' }}>P.O. Date</span><strong style={{ color: '#1C1C28' }}>{data.poDate || '-'}</strong></div>
                  <div><span style={{ color: '#8F90A6', display: 'block', fontSize: '10px' }}>Vehicle No.</span><strong style={{ color: '#1C1C28' }}>{data.vehicleNo || '-'}</strong></div>
                  <div><span style={{ color: '#8F90A6', display: 'block', fontSize: '10px' }}>Transport</span><strong style={{ color: '#1C1C28' }}>{data.nameOfTransport || '-'}</strong></div>
                  <div><span style={{ color: '#8F90A6', display: 'block', fontSize: '10px' }}>Place of Supply</span><strong style={{ color: '#1C1C28' }}>{data.placeOfSupply || '-'}</strong></div>
                  <div><span style={{ color: '#8F90A6', display: 'block', fontSize: '10px' }}>Mode</span><strong style={{ color: '#1C1C28' }}>{data.modeOfTransport || '-'}</strong></div>
                </div>
              </div>
            )}
          </div>

          {/* Table */}
          <table className="invoice-table" style={{ marginBottom: '40px' }}>
            <thead>
              <tr>
                <th style={{ width: '5%', textAlign: 'center' }}>#</th>
                <th style={{ width: '35%' }}>{settings?.invoiceFormat === 'service' ? 'Service & Description' : 'Description of Goods'}</th>
                <th style={{ width: '10%', textAlign: 'center' }}>HSN</th>
                {settings?.invoiceFormat !== 'service' && <th style={{ width: '10%', textAlign: 'center' }}>Qty</th>}
                {settings?.invoiceFormat !== 'service' && <th style={{ width: '10%', textAlign: 'center' }}>Unit</th>}
                {settings?.invoiceFormat === 'service' && <th style={{ width: '10%', textAlign: 'center' }}>Currency</th>}
                <th style={{ width: '15%', textAlign: 'right' }}>{settings?.invoiceFormat === 'service' ? 'Amount' : 'Rate (₹)'}</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => {
                const incRate = Number(item.inclusiveRate) || 0;
                const qty = settings?.invoiceFormat === 'service' ? 1 : (Number(item.qty) || 0);
                const isInclusive = item.isInclusive !== false;
                const taxableRate = isInclusive ? incRate / (1 + (item.gstRate / 100)) : incRate;
                const total = taxableRate * qty;
                
                return (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td>
                      <strong style={{ display: 'block', color: '#1C1C28' }}>{item.description}</strong>
                      {settings?.invoiceFormat === 'service' && item.serviceDescription && (
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{item.serviceDescription}</div>
                      )}
                      <span style={{ fontSize: '10px', color: '#8F90A6' }}>GST: {item.gstRate}%</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{item.hsnCode}</td>
                    {settings?.invoiceFormat !== 'service' && <td style={{ textAlign: 'center' }}>{item.qty}</td>}
                    {settings?.invoiceFormat !== 'service' && <td style={{ textAlign: 'center' }}>{item.unit}</td>}
                    {settings?.invoiceFormat === 'service' && <td style={{ textAlign: 'center' }}>{item.currency || 'INR'}</td>}
                    <td style={{ textAlign: 'right' }}>{taxableRate.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: '600', color: '#1C1C28' }}>{total.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Bottom Section */}
          <div style={{ display: 'flex', gap: '40px' }}>
            {/* Left: Notes & Bank */}
            <div style={{ flex: 2 }}>
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#8F90A6', letterSpacing: '1px' }}>Bank Details</h3>
                <div style={{ fontSize: '12px', color: '#444', lineHeight: '1.6' }}>
                  <strong>Account Name:</strong> {settings?.bankAccountName || settings?.companyName || 'Company Name'}<br />
                  <strong>Bank:</strong> {settings?.bankName || 'Bank Name'}<br />
                  <strong>Account No:</strong> {settings?.bankAccountNo || 'Account Number'}<br />
                  <strong>IFSC Code:</strong> {settings?.bankIfsc || 'IFSC Code'}
                </div>
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#8F90A6', letterSpacing: '1px' }}>Terms & Conditions</h3>
                <div style={{ fontSize: '10px', color: '#666', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                  {settings?.termsConditions || 'Terms and Conditions applied.'}
                </div>
              </div>
            </div>

            {/* Right: Totals Box */}
            <div style={{ flex: 1.5 }}>
              <div style={{ backgroundColor: '#F8F9FA', borderRadius: '8px', padding: '20px', border: '1px solid #E4E4EB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px' }}>
                  <span style={{ color: '#666' }}>Subtotal</span>
                  <span style={{ fontWeight: '600', color: '#1C1C28' }}>₹ {taxableAmount.toFixed(2)}</span>
                </div>
                {loading > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#666' }}>Loading Charges</span>
                    <span style={{ color: '#1C1C28' }}>₹ {loading.toFixed(2)}</span>
                  </div>
                )}
                {transport > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#666' }}>Transport Charges</span>
                    <span style={{ color: '#1C1C28' }}>₹ {transport.toFixed(2)}</span>
                  </div>
                )}
                {other > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#666' }}>Other Charges</span>
                    <span style={{ color: '#1C1C28' }}>₹ {other.toFixed(2)}</span>
                  </div>
                )}
                {!isInterstate && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                      <span style={{ color: '#666' }}>CGST</span>
                      <span style={{ color: '#1C1C28' }}>₹ {cgst.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                      <span style={{ color: '#666' }}>SGST</span>
                      <span style={{ color: '#1C1C28' }}>₹ {sgst.toFixed(2)}</span>
                    </div>
                  </>
                )}
                {isInterstate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#666' }}>IGST</span>
                    <span style={{ color: '#1C1C28' }}>₹ {igst.toFixed(2)}</span>
                  </div>
                )}
                {settings?.enableHamali !== false && hamali > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#666' }}>Hamali</span>
                    <span style={{ color: '#1C1C28' }}>₹ {hamali.toFixed(2)}</span>
                  </div>
                )}
                
                <div style={{ borderTop: '1px solid #E4E4EB', margin: '12px 0' }}></div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: '#1C1C28' }}>Total</span>
                  <span style={{ fontWeight: '800', fontSize: '20px', color: 'var(--primary)' }}>₹ {roundedTotal.toFixed(2)}</span>
                </div>
              </div>
              <div style={{ marginTop: '12px', fontSize: '11px', color: '#8F90A6', textAlign: 'right', fontStyle: 'italic' }}>
                Amount in words: Rupees {totalInWords}
              </div>
            </div>
          </div>

          {/* Signature */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '60px' }}>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ fontWeight: '700', color: '#1C1C28', marginBottom: '40px', textTransform: 'uppercase' }}>
                For {settings?.companyName || 'COMPANY NAME'}
              </div>
              <div style={{ borderTop: '1px solid #1C1C28', paddingTop: '8px', fontSize: '12px', color: '#666' }}>Authorised Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
