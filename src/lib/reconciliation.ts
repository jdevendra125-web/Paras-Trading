import type { Customer, Transaction } from '../types';

export interface MatchResult {
  customerId?: string;
  confidence: number;
  reason: string;
}

/**
 * Intelligent matching logic for bank transactions.
 */
export async function analyzeTransaction(
  narration: string,
  customers: Customer[],
  existingTxns: Transaction[]
): Promise<MatchResult> {
  const normNarration = narration.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ');
  
  // 1. Exact Name Match (Confidence: 1.0)
  for (const customer of customers) {
    const normName = customer.name.toUpperCase();
    if (normNarration.includes(normName)) {
      return { customerId: customer.id, confidence: 1.0, reason: 'Exact name match in narration' };
    }
  }

  // 2. Previous History Match (Confidence: 0.9)
  // Check if we have previously reconciled a similar narration
  const similarTxn = existingTxns.find(t => 
    t.customerId && 
    t.particulars && 
    levenshteinDistance(t.particulars.toUpperCase(), narration.toUpperCase()) < 5
  );
  if (similarTxn) {
    return { customerId: similarTxn.customerId, confidence: 0.9, reason: 'Matched previous reconciliation pattern' };
  }

  // 3. Partial/UPI Match (Confidence: 0.7)
  // Many narrations have "UPI/9198XXXXXXXX/RAHUL..."
  const upiParts = normNarration.split(' ');
  for (const part of upiParts) {
    if (part.length >= 4) {
      for (const customer of customers) {
        const normName = customer.name.toUpperCase();
        if (normName.includes(part) || part.includes(normName)) {
          return { customerId: customer.id, confidence: 0.7, reason: 'Partial name match in UPI/transfer details' };
        }
        if (customer.phone && part.includes(customer.phone)) {
          return { customerId: customer.id, confidence: 0.8, reason: 'Matched customer phone number' };
        }
      }
    }
  }

  // 4. Keyword/Region Match (Confidence: 0.4)
  for (const customer of customers) {
    if (customer.region && normNarration.includes(customer.region.toUpperCase())) {
      return { customerId: customer.id, confidence: 0.4, reason: 'Region match' };
    }
  }

  return { confidence: 0, reason: 'No match found' };
}

/**
 * Basic Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Extract potential UTR/Reference numbers
 */
export function extractRefNo(narration: string): string | undefined {
  // Common UTR formats: 8-22 digit numeric or alpha-numeric strings
  const matches = narration.match(/[A-Z0-9]{8,22}/g);
  return matches ? matches[0] : undefined;
}
