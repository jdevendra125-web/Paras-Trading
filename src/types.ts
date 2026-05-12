export interface Customer {
  id: string;
  name: string;
  address: string;
  state: string;
  stateCode: string;
  gstin: string;
  region: string;
  phone?: string;
  email?: string;
  openingBalance?: number; // Initial balance (Positive for Debit/Owes Us)
}

export interface MasterItem {
  id: string;
  description: string;
  hsnCode: string;
  unit: string;
  gstRate: number; // e.g. 5 for 5%
  isInclusive?: boolean; // New: indicates if rate is inclusive of GST
}

export interface InvoiceItem {
  id: string;
  description: string;
  serviceDescription?: string; // New: optional description below the service
  hsnCode: string;
  qty: number | '';
  unit: string;
  inclusiveRate: number | ''; // User inputs this (Invoice Amount for services)
  currency?: string; // New: Currency for service format
  gstRate: number; // Retrieved from master
  isInclusive?: boolean; // New: indicates if rate is inclusive of GST
}

export interface BankAccount {
  id: string;
  name: string;
  accountNo: string;
  openingBalance: number;
}

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'CR' | 'DR';
  mode: 'Bank' | 'Cash';
  bankAccountId?: string;
  customerId?: string;
  particulars: string;
  refNo?: string;
  // Reconciliation metadata
  status?: 'pending' | 'reconciled' | 'flagged' | 'ignored';
  confidence?: number;
  suggestedCustomerId?: string;
  importSessionId?: string;
  rawNarration?: string;
}

export interface BankImportSession {
  id: string;
  date: string;
  fileName: string;
  bankAccountId?: string;
  totalTransactions: number;
  reconciledCount: number;
}

export interface InvoiceData {
  invoiceNo: string;
  invoiceType?: 'goods' | 'service';
  dateOfSupply: string;
  poNo: string;
  poDate: string;
  vehicleNo: string;
  nameOfTransport: string;
  placeOfSupply: string;
  modeOfTransport: string;
  
  customerId?: string; // Reference to master
  receiverName: string;
  receiverAddress: string;
  receiverState: string;
  receiverStateCode: string;
  receiverGstin: string;
  receiverRegion?: string;
  receiverPhone?: string;
  receiverEmail?: string;
  
  items: InvoiceItem[];
  
  loadingCharges: number | '';
  transportCharges: number | '';
  otherCharges: number | '';
  hamali: number | '';

  totalAmount?: number;
  reportable?: boolean;
}

export interface UserSettings {
  id?: string;
  companyName: string;
  proprietorName: string;
  address: string;
  gstin: string;
  bankName: string;
  bankAccountName?: string;
  bankAccountNo: string;
  bankIfsc: string;
  termsConditions: string;
  invoicePrefix: string;
  invoiceFormat?: 'goods' | 'service';
  enableHamali?: boolean;
}
