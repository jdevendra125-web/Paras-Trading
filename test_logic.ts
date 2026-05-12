import { analyzeTransaction, extractRefNo } from './src/lib/reconciliation';

const mockCustomers = [
  { id: 'c1', name: 'Rahul Traders' },
  { id: 'c2', name: 'Paras General Store' },
  { id: 'c3', name: 'Jain Brothers' }
];

const mockExistingTxns = [
  { particulars: 'UPI/1234/RAHUL', customerId: 'c1' }
];

async function runTest() {
  console.log('--- STARTING BANK IMPORT LOGIC TEST ---');
  
  // Test 1: Fuzzy Name Match
  console.log('\nTest 1: Fuzzy Name Matching (Rahul Tdr)');
  const res1 = await analyzeTransaction('Payment from Rahul Tdr', mockCustomers, []);
  console.log('Suggested ID:', res1.customerId, '(Expected: c1)');
  console.log('Confidence:', res1.confidence);

  // Test 2: UPI Reference Extraction
  console.log('\nTest 2: Reference Extraction (UPI/UTR)');
  const ref = extractRefNo('UPI/987654321/FOR/GOODS');
  console.log('Extracted Ref:', ref, '(Expected: 987654321)');

  // Test 3: History-based Match
  console.log('\nTest 3: History-based Pattern Matching');
  const res3 = await analyzeTransaction('UPI/1234/RAHUL', mockCustomers, mockExistingTxns);
  console.log('Suggested ID:', res3.customerId, '(Expected: c1)');
  console.log('Confidence:', res3.confidence);

  console.log('\n--- LOGIC TEST COMPLETE ---');
}

runTest().catch(console.error);
