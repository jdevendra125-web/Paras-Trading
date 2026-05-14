import Fuse from 'fuse.js';
import type { Customer, MasterItem, InvoiceData } from '../types';

export async function parseInvoiceInput(
  text: string,
  customers: Customer[],
  masterItems: MasterItem[],
  apiKey?: string // Kept for backwards compatibility
): Promise<Partial<InvoiceData>> {
  
  // Simulate slight delay for UX
  await new Promise(resolve => setTimeout(resolve, 600));

  const lowerText = text.toLowerCase();
  let remainingText = lowerText;

  // 1. Find Customer
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
      remainingText = remainingText.replace(matchedCustomer.name.toLowerCase(), '');
    }
  }

  // 2. Find Items
  const parsedItems: any[] = [];
  if (masterItems.length > 0) {
    const itemFuse = new Fuse(masterItems, {
      keys: ['description'],
      threshold: 0.3,
      includeScore: true,
      ignoreLocation: true,
    });

    const words = remainingText.split(/[\s,]+/);
    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j <= Math.min(i + 4, words.length); j++) {
        const chunk = words.slice(i, j).join(' ');
        if (chunk.length < 3) continue;
        
        const itemResults = itemFuse.search(chunk);
        if (itemResults.length > 0 && itemResults[0].score !== undefined && itemResults[0].score < 0.2) {
          const matchedItem = itemResults[0].item;
          
          if (!parsedItems.find(p => p.description === matchedItem.description)) {
            const chunkIndex = remainingText.indexOf(chunk);
            let qty = 1;
            let rate = 0;
            
            if (chunkIndex !== -1) {
              const beforeChunk = remainingText.substring(0, chunkIndex);
              const afterChunk = remainingText.substring(chunkIndex + chunk.length);
              
              const qtyMatch = beforeChunk.match(/(\d+)\s*(bags|pcs|nos|kg|kgs|liters|boxes)?\s*$/i) || 
                               afterChunk.match(/^\s*(\d+)\s*(bags|pcs|nos|kg|kgs|liters|boxes)?/i);
              if (qtyMatch) {
                qty = parseInt(qtyMatch[1], 10);
              }

              const contextAround = beforeChunk.slice(-40) + ' ' + chunk + ' ' + afterChunk.slice(0, 40);
              const rateMatch = contextAround.match(/(?:at|@|for|rs|rupees)\s*(\d+(?:\.\d+)?)/i) || 
                                contextAround.match(/(\d+(?:\.\d+)?)\s*(?:rs|rupees|each|per)/i);
              if (rateMatch) {
                rate = parseFloat(rateMatch[1]);
              }
            }
              
            parsedItems.push({
              id: crypto.randomUUID(),
              description: matchedItem.description,
              qty: qty,
              inclusiveRate: rate,
              hsnCode: matchedItem.hsnCode,
              gstRate: matchedItem.gstRate,
              unit: matchedItem.unit || 'Nos',
              isInclusive: true
            });
            
            // Blank out the chunk so we don't match it again
            remainingText = remainingText.replace(chunk, ' '.repeat(chunk.length));
          }
        }
      }
    }
  }

  if (parsedItems.length === 0) {
    const qtyMatch = text.match(/(\d+)\s+(bags|pcs|nos|kg|kgs|liters|boxes)/i);
    const rateMatch = text.match(/(?:at|@|for|rs|rupees)\s*(\d+(?:\.\d+)?)/i);
    
    if (qtyMatch || rateMatch) {
      parsedItems.push({
        id: crypto.randomUUID(),
        description: 'Generic Item',
        qty: qtyMatch ? parseInt(qtyMatch[1], 10) : 1,
        inclusiveRate: rateMatch ? parseFloat(rateMatch[1]) : 0,
        hsnCode: '',
        gstRate: 0,
        unit: qtyMatch ? qtyMatch[2] : 'Nos',
        isInclusive: true
      });
    }
  }

  return {
    customerId: matchedCustomer?.id || '',
    receiverName: matchedCustomer?.name || (matchedCustomer ? '' : 'Walk-in Customer'),
    items: parsedItems.length > 0 ? parsedItems : undefined
  };
}
