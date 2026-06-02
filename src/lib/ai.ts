import Fuse from 'fuse.js';
import type { Customer, MasterItem, InvoiceData, AIParseResult } from '../types';

const getTodayISO = (): string => {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseDateStr = (dateStr: string): number => {
  if (!dateStr) return 0;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return new Date(`${parts[0]}-${parts[1]}-${parts[2]}T12:00:00`).getTime();
    }
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00`).getTime();
  }
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? 0 : parsed;
};

const extractDate = (t: string): string => {
  const today = new Date();
  if (/\byesterday\b/i.test(t)) {
    today.setDate(today.getDate() - 1);
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (/\btoday\b/i.test(t)) {
    return getTodayISO();
  }
  // Matches DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = t.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})\b/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }
  // Matches YYYY-MM-DD
  const ymdMatch = t.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2].padStart(2, '0')}-${ymdMatch[3].padStart(2, '0')}`;
  }
  // Matches DD-MM or DD/MM (assumes current year)
  const dmMatch = t.match(/\b(\d{1,2})[-/](\d{1,2})\b/);
  if (dmMatch) {
    const year = today.getFullYear();
    return `${year}-${dmMatch[2].padStart(2, '0')}-${dmMatch[1].padStart(2, '0')}`;
  }
  return getTodayISO();
};

export async function parseAIInput(
  text: string,
  customers: Customer[],
  masterItems: MasterItem[]
): Promise<AIParseResult> {
  // Simulate slight delay for UX
  await new Promise(resolve => setTimeout(resolve, 600));

  const lowerText = text.toLowerCase();
  let remainingText = lowerText;

  // 1. Determine Intent (Invoice vs Receipt)
  let invoiceScore = 0;
  let receiptScore = 0;

  const invoiceKeywords = /\b(invoice|bill|sales|sell|sold|dispatch|dispatching|items|prepare|make bill)\b/gi;
  const receiptKeywords = /\b(receipt|receive|received|pay|paid|payment|deposit|deposited|collected|collect|transfer|transferred|cr|dr|gpay|phonepe|cash)\b/gi;

  const invoiceMatches = lowerText.match(invoiceKeywords);
  if (invoiceMatches) invoiceScore += invoiceMatches.length * 3;

  const receiptMatches = lowerText.match(receiptKeywords);
  if (receiptMatches) receiptScore += receiptMatches.length * 3;

  // Check for quantity-unit patterns like "10 bags", "5 kg", "2 pcs" which strongly imply an invoice
  const qtyUnitPattern = /\b\d+(?:\.\d+)?\s*(?:bags|pcs|nos|kg|kgs|liters|boxes|ltr|ltrs|box|pkts|packets|tin|tins|quintal|quintals|ton|tons|units)\b/gi;
  if (qtyUnitPattern.test(lowerText)) {
    invoiceScore += 4;
  }

  // If there are specific master items mentioned, increase invoice score
  if (masterItems.length > 0) {
    const itemFuse = new Fuse(masterItems, {
      keys: ['description'],
      threshold: 0.4,
    });
    const words = lowerText.split(/[\s,]+/);
    let matchedItemCount = 0;
    words.forEach(word => {
      if (word.length >= 3 && itemFuse.search(word).length > 0) {
        matchedItemCount++;
      }
    });
    invoiceScore += matchedItemCount * 2;
  }

  const isReceipt = receiptScore > invoiceScore;

  // 2. Find Customer (Fuzzy matching)
  let matchedCustomer: Customer | undefined;
  if (customers.length > 0) {
    const customerFuse = new Fuse(customers, {
      keys: ['name'],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true
    });
    
    const results = customerFuse.search(lowerText);
    if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.4) {
      matchedCustomer = results[0].item;
      // Remove matched customer name from text to avoid false positives in items/notes
      remainingText = remainingText.replace(matchedCustomer.name.toLowerCase(), '');
    }
  }

  const date = extractDate(lowerText);

  if (isReceipt) {
    // Determine type: DR (paid) or CR (received)
    let type: 'CR' | 'DR' = 'CR';
    if (/\b(pay|paid|payment|give|gave|dr|debit|outflow|withdraw|withdrew|to)\b/i.test(lowerText)) {
      type = 'DR';
    }
    if (/\b(receive|received|receipt|cr|credit|inflow|from|collected)\b/i.test(lowerText)) {
      type = 'CR';
    }

    // Determine mode: Bank or Cash
    let mode: 'Bank' | 'Cash' = 'Cash';
    if (/\b(bank|online|upi|gpay|phonepe|transfer|transferred|cheque|chq|neft|rtgs|paytm|net)\b/i.test(lowerText)) {
      mode = 'Bank';
    }

    // Extract amount
    const cleanedForAmt = remainingText
      .replace(/\b\d{1,2}[-/]\d{1,2}[-/]\d{4}\b/g, '')
      .replace(/\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/g, '')
      .replace(/\b\d{1,2}[-/]\d{1,2}\b/g, '');
    
    const amtMatch = cleanedForAmt.match(/(?:rs\.?|rupees|amt|amount|₹|of|sum|total)\s*(\d+(?:\.\d+)?)/i) ||
                     cleanedForAmt.match(/(\d+(?:\.\d+)?)\s*(?:rs\.?|rupees|₹|amt|amount)/i) ||
                     cleanedForAmt.match(/\b(\d+(?:\.\d+)?)\b/);
    const amount = amtMatch ? parseFloat(amtMatch[1]) : 0;

    // Generate particulars and extract custom notes (e.g. "for rent", "against bill 104")
    let notes = '';
    const forMatch = lowerText.match(/\b(for|towards|against|ref|memo)\s+(.+)$/i);
    if (forMatch) {
      notes = ` ${forMatch[1]} ${forMatch[2]}`;
    }

    const partyName = matchedCustomer ? matchedCustomer.name : 'Walk-in Customer';
    const actionName = type === 'CR' ? 'Receipt from' : 'Payment to';
    const viaName = mode === 'Bank' ? 'via Bank' : 'in Cash';
    const particulars = `${actionName} ${partyName} ${viaName}${notes}`.trim();

    return {
      type: 'receipt',
      receiptData: {
        date,
        amount,
        type,
        mode,
        customerId: matchedCustomer?.id || '',
        particulars,
        refNo: ''
      }
    };
  } else {
    // Parse Invoice
    const parsedItems: any[] = [];
    const clauses = remainingText.split(/\s*(?:,|and|;|\+)\s*/gi);
    
    const itemFuse = new Fuse(masterItems, {
      keys: ['description'],
      threshold: 0.4,
      includeScore: true,
      ignoreLocation: true,
    });

    clauses.forEach(clause => {
      const trimmedClause = clause.trim();
      if (trimmedClause.length < 3) return;

      const itemResults = itemFuse.search(trimmedClause);
      if (itemResults.length > 0 && itemResults[0].score !== undefined && itemResults[0].score < 0.4) {
        const matchedItem = itemResults[0].item;
        
        let qty = 1;
        const qtyMatch = trimmedClause.match(/(\d+(?:\.\d+)?)\s*(?:bags|pcs|nos|kg|kgs|liters|boxes|ltr|ltrs|box|pkts|packets|tin|tins|quintal|quintals|ton|tons|units)?\b/i);
        if (qtyMatch) {
          qty = parseFloat(qtyMatch[1]);
        }

        let rate = 0;
        const rateMatch = trimmedClause.match(/(?:at|@|rate|for|rs\.?|rupees|price)\s*(\d+(?:\.\d+)?)/i) ||
                          trimmedClause.match(/(\d+(?:\.\d+)?)\s*(?:rs\.?|rupees|each|per)/i);
        if (rateMatch) {
          rate = parseFloat(rateMatch[1]);
        }

        parsedItems.push({
          id: crypto.randomUUID(),
          description: matchedItem.description,
          qty,
          inclusiveRate: rate,
          hsnCode: matchedItem.hsnCode,
          gstRate: matchedItem.gstRate,
          unit: matchedItem.unit || 'Nos',
          isInclusive: true
        });
      } else {
        const qtyMatch = trimmedClause.match(/(\d+(?:\.\d+)?)\s+(bags|pcs|nos|kg|kgs|liters|boxes|ltr|ltrs|box|pkts|packets|tin|tins|quintal|quintals|ton|tons|units)\b/i);
        const rateMatch = trimmedClause.match(/(?:at|@|rate|for|rs\.?|rupees|price)\s*(\d+(?:\.\d+)?)/i) ||
                          trimmedClause.match(/(\d+(?:\.\d+)?)\s*(?:rs\.?|rupees|each|per)/i);
        if (qtyMatch || rateMatch) {
          let description = trimmedClause
            .replace(/(?:at|@|rate|for|rs\.?|rupees|price)\s*(\d+(?:\.\d+)?)/gi, '')
            .replace(/(\d+(?:\.\d+)?)\s*(?:rs\.?|rupees|each|per)/gi, '')
            .replace(/(\d+(?:\.\d+)?)\s*(?:bags|pcs|nos|kg|kgs|liters|boxes|ltr|ltrs|box|pkts|packets|tin|tins|quintal|quintals|ton|tons|units)/gi, '')
            .replace(/\b(bill|invoice|make|pass|prepare)\b/gi, '')
            .trim();
          
          if (description.length < 3) {
            description = 'Generic Item';
          }

          parsedItems.push({
            id: crypto.randomUUID(),
            description,
            qty: qtyMatch ? parseFloat(qtyMatch[1]) : 1,
            inclusiveRate: rateMatch ? parseFloat(rateMatch[1]) : 0,
            hsnCode: '',
            gstRate: 0,
            unit: qtyMatch ? qtyMatch[2] : 'Nos',
            isInclusive: true
          });
        }
      }
    });

    if (parsedItems.length === 0) {
      const qtyMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(bags|pcs|nos|kg|kgs|liters|boxes|ltr|ltrs|box|pkts|packets|tin|tins|quintal|quintals|ton|tons|units)/i);
      const rateMatch = lowerText.match(/(?:at|@|rate|for|rs\.?|rupees|price)\s*(\d+(?:\.\d+)?)/i);
      if (qtyMatch || rateMatch) {
        parsedItems.push({
          id: crypto.randomUUID(),
          description: 'Generic Item',
          qty: qtyMatch ? parseFloat(qtyMatch[1]) : 1,
          inclusiveRate: rateMatch ? parseFloat(rateMatch[1]) : 0,
          hsnCode: '',
          gstRate: 0,
          unit: qtyMatch ? qtyMatch[2] : 'Nos',
          isInclusive: true
        });
      }
    }

    return {
      type: 'invoice',
      invoiceData: {
        dateOfSupply: date,
        customerId: matchedCustomer?.id || '',
        receiverName: matchedCustomer?.name || (matchedCustomer ? '' : 'Walk-in Customer'),
        items: parsedItems.length > 0 ? parsedItems : undefined
      }
    };
  }
}

// Retain for backwards compatibility
export async function parseInvoiceInput(
  text: string,
  customers: Customer[],
  masterItems: MasterItem[],
  apiKey?: string
): Promise<Partial<InvoiceData>> {
  const res = await parseAIInput(text, customers, masterItems);
  return res.invoiceData || {};
}
