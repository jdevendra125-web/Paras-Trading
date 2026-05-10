import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, FileText, Users, ArrowUpDown, Settings2, Upload, Phone, Mail } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';

const faqs = [
  { q: 'How do I create a new invoice?', a: 'Tap the + button in the bottom navigation or go to Dashboard → New Invoice. Fill in the customer and item details, then tap Generate.' },
  { q: 'How to add a new customer?', a: 'Go to Customers page and tap the Add button. Fill in the GSTIN, state code, and address details.' },
  { q: 'How do I download/print an invoice?', a: 'Open any invoice from the Invoices list, then tap the Print or Download PDF button on the preview page.' },
  { q: 'How are GST amounts calculated?', a: 'Enter the inclusive rate (price including GST). The app automatically calculates taxable value and GST breakup (CGST + SGST or IGST) based on the GST rate.' },
  { q: 'What is an Outstanding payment?', a: 'Outstanding shows customers who have unpaid invoices. To mark a payment as received, go to Receipts and add a Credit entry for that customer.' },
  { q: 'How do I import bank transactions?', a: 'Go to More → Bank Import. Upload a CSV or Excel file from your bank statement and map the columns.' },
  { q: 'How to change invoice prefix?', a: 'Go to More → Settings → Invoice Settings. Update the Invoice Prefix (e.g. PT/25-26/).' },
];

export function Help() {
  return (
    <div className="page-container">
      <PageHeader title="Help & Support" subtitle="Frequently asked questions" back icon={<HelpCircle size={18} />} />

      <div className="space-y-2 mb-6">
        {faqs.map((faq, i) => (
          <motion.details
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass-card group"
          >
            <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none">
              <p className="text-sm font-bold text-content-primary">{faq.q}</p>
              <span className="text-content-muted group-open:rotate-180 transition-transform flex-shrink-0">▾</span>
            </summary>
            <div className="px-5 pb-5">
              <p className="text-sm text-content-secondary leading-relaxed">{faq.a}</p>
            </div>
          </motion.details>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5">
        <p className="text-sm font-bold text-white mb-3">Contact Support</p>
        <div className="space-y-2">
          <a href="tel:+919876543210" className="flex items-center gap-3 text-sm text-slate-400 hover:text-white transition-colors">
            <Phone size={14} className="text-accent-blue" /> +91 98765 43210
          </a>
          <a href="mailto:support@parastrading.com" className="flex items-center gap-3 text-sm text-slate-400 hover:text-white transition-colors">
            <Mail size={14} className="text-accent-blue" /> support@parastrading.com
          </a>
        </div>
      </motion.div>
    </div>
  );
}
