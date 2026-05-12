import React, { useState } from 'react';
import { Hexagon, PlayCircle } from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: React.ReactNode;
  isVideo?: boolean;
}

interface FAQCategory {
  title: string;
  faqs: FAQ[];
}

export function Help() {
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  const faqCategories: FAQCategory[] = [
    {
      title: "Getting Started",
      faqs: [
        {
          id: "gs-1",
          question: "Creating your first invoice",
          answer: (
            <div className="text-sm text-gray-700 space-y-2 mt-2 ml-4 mb-4 border-l-2 border-blue-100 pl-4">
              <p>Before creating an invoice, you need two things: a <strong>Customer</strong> and an <strong>Item/Service</strong>.</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Go to the <strong>Customers</strong> tab and add a new customer with their billing details.</li>
                <li>Go to the <strong>Item Master</strong> tab and add the goods or services you sell.</li>
                <li>Click on the <strong>+ New Invoice</strong> button, select the customer, add the items, and click <strong>Save & Generate Invoice</strong>.</li>
              </ol>
            </div>
          )
        },
        {
          id: "gs-2",
          question: "Add or manage bank details",
          answer: <div className="text-sm text-gray-700 mt-2 ml-4 mb-4 border-l-2 border-blue-100 pl-4">Navigate to the Settings page. You can enter your Bank Account Name, Bank Name, Account Number, and IFSC Code. These details will automatically be printed at the bottom of all your generated PDF invoices.</div>
        }
      ]
    },
    {
      title: "Invoicing & Items",
      faqs: [
        {
          id: "inv-1",
          question: "Inclusive vs Exclusive GST Rates",
          answer: (
            <div className="text-sm text-gray-700 space-y-2 mt-2 ml-4 mb-4 border-l-2 border-blue-100 pl-4">
              <p>When you add an item in the <strong>Item Master</strong>, you can choose if its rate is inclusive or exclusive of GST:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Inclusive of GST:</strong> If you enter ₹118,000 as the inclusive rate (and GST is 18%), the system will reverse-calculate the base amount as ₹100,000 and the GST as ₹18,000.</li>
                <li><strong>Exclusive of GST:</strong> If you enter ₹100,000 as the exclusive rate, the system will add 18% GST on top of it, making the final total ₹118,000.</li>
              </ul>
              <p><em>Tip: Service-based businesses usually use Exclusive rates, while Retail businesses often use Inclusive (MRP) rates.</em></p>
            </div>
          )
        },
        {
          id: "inv-2",
          question: "Change between Goods and Service formats",
          answer: <div className="text-sm text-gray-700 mt-2 ml-4 mb-4 border-l-2 border-blue-100 pl-4">Go to the Settings page and look for the 'Invoice Format' option. You can toggle between 'Goods' (which includes columns like Qty and Unit) and 'Service' (which removes Qty/Unit and allows for custom Service Descriptions and Currency).</div>
        },
        {
          id: "inv-3",
          question: "Add Hamali, Transport, or Loading charges",
          answer: <div className="text-sm text-gray-700 mt-2 ml-4 mb-4 border-l-2 border-blue-100 pl-4">On the New Invoice screen, scroll down below the items table. You will see a section for 'Additional Charges' where you can enter amounts for Hamali, Transport, Loading, and Other charges. These are added to the taxable subtotal before GST is applied.</div>
        }
      ]
    },
    {
      title: "Payments & Accounting",
      faqs: [
        {
          id: "pay-1",
          question: "Record a payment from a customer",
          answer: <div className="text-sm text-gray-700 mt-2 ml-4 mb-4 border-l-2 border-blue-100 pl-4">Go to the Receipts tab and click 'Add Receipt'. Select the customer, enter the amount they paid, choose the date, and select the mode of payment (Cash or Bank). Once saved, this receipt will automatically reduce the customer's outstanding balance.</div>
        },
        {
          id: "pay-2",
          question: "FIFO system for Outstanding Balances",
          answer: (
            <div className="text-sm text-gray-700 space-y-2 mt-2 ml-4 mb-4 border-l-2 border-blue-100 pl-4">
              <p>FIFO stands for <strong>First-In, First-Out</strong>. When a customer makes a payment (Receipt), the system automatically applies that payment to their oldest unpaid invoice first.</p>
              <p>For example, if a customer has two unpaid invoices (Invoice #1 for ₹5,000 and Invoice #2 for ₹10,000) and they make a payment of ₹7,000, the system will fully clear Invoice #1 and apply the remaining ₹2,000 to Invoice #2.</p>
            </div>
          )
        },
        {
          id: "pay-3",
          question: "View a Customer's Ledger or Statement",
          answer: <div className="text-sm text-gray-700 mt-2 ml-4 mb-4 border-l-2 border-blue-100 pl-4">Go to the Customers tab, click the three-dots action menu next to a customer, and select 'View Statement'. You can filter the statement by a specific date range to see all their invoices, receipts, and the running balance.</div>
        }
      ]
    },
    {
      title: "Advanced Features",
      faqs: [
        {
          id: "adv-1",
          question: "Set a custom invoice number prefix",
          answer: <div className="text-sm text-gray-700 mt-2 ml-4 mb-4 border-l-2 border-blue-100 pl-4">Go to the Settings page. You can set an 'Invoice Prefix' (e.g., 'PT/25-26/') and the 'Next Invoice Number' (e.g., '42'). The system will combine them to generate the invoice number: 'PT/25-26/042'.</div>
        },
        {
          id: "adv-2",
          question: "PDF looks blurry on screen fix",
          answer: <div className="text-sm text-gray-700 mt-2 ml-4 mb-4 border-l-2 border-blue-100 pl-4">The app generates high-definition (HD) PDFs using a 5x scale rendering engine to ensure they print crystal clear. If it appears slightly soft on a laptop screen, try downloading the PDF and opening it in Adobe Acrobat or your native OS PDF viewer for maximum sharpness.</div>
        },
        {
          id: "adv-3",
          question: "How IGST vs CGST/SGST is calculated",
          answer: <div className="text-sm text-gray-700 mt-2 ml-4 mb-4 border-l-2 border-blue-100 pl-4">The system automatically determines whether to apply IGST or CGST/SGST based on the State Codes. In the Settings page, make sure your company's GSTIN is entered correctly. When creating a customer, enter their GSTIN. If the first 2 digits (State Code) of your GSTIN and the customer's GSTIN match, the system applies CGST/SGST (50% each). If they are different, it applies 100% IGST.</div>
        }
      ]
    }
  ];

  const handleContactSupport = () => {
    window.location.href = "mailto:support@example.com?subject=Need%20Help%20with%20Billing%20App";
  };

  return (
    <div className="pb-12 bg-white min-h-screen" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8 text-black">Quick Navigation</h1>

        <div className="space-y-8">
          {faqCategories.map((category, index) => (
            <div key={index}>
              <h2 className="text-lg font-bold text-black mb-4">{category.title}</h2>
              <div className="space-y-1">
                {category.faqs.map((faq, faqIndex) => (
                  <div key={faq.id}>
                    <button
                      className="text-left flex items-start hover:underline focus:outline-none w-full"
                      onClick={() => toggleFaq(faq.id)}
                      style={{ color: '#2563eb' }}
                    >
                      {faqIndex === 0 ? (
                        <Hexagon size={14} className="mt-1 mr-2 flex-shrink-0" style={{ color: '#2563eb' }} />
                      ) : (
                        <span className="mt-0.5 mr-2 flex-shrink-0" style={{ color: '#2563eb' }}>-</span>
                      )}
                      <span className="text-sm font-medium">{faq.question}</span>
                      {faq.isVideo && <PlayCircle size={14} className="ml-2 mt-1 text-red-500" />}
                    </button>
                    
                    {openFaqId === faq.id && faq.answer}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Support Footer */}
        <div className="mt-12 p-6 rounded-lg" style={{ backgroundColor: '#f8fafc' }}>
          <h3 className="font-bold text-xl text-slate-900 mb-2">Still need help?</h3>
          <p className="text-slate-700 mb-6" style={{ fontSize: '15px' }}>
            If you couldn't find the answer to your question, our support team is ready to help.
          </p>
          <button 
            onClick={handleContactSupport}
            className="font-bold py-2.5 px-6 rounded shadow-sm text-content-primary transition-opacity hover:opacity-90"
            style={{ 
              backgroundColor: '#c81e35',
              backgroundImage: 'linear-gradient(to right, #d92138, #b81b2f)'
            }}
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
