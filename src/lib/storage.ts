import type { InvoiceData, Customer, MasterItem, BankAccount, Transaction, UserSettings, BankImportSession } from '../types';
import { supabase } from './supabase';

export const calculateInvoiceTotal = (invoice: any): number => {
  let subtotal = 0;
  let gstAmount = 0;
  
  const items = invoice.items || invoice.items_json || [];
  items.forEach((item: any) => {
    const incRate = Number(item.inclusiveRate) || 0;
    const qty = Number(item.qty) || 1; // Default to 1 for services
    const gstRate = Number(item.gstRate) || 0;
    const isInclusive = item.isInclusive !== false; // Default true
    const taxableRate = isInclusive ? incRate / (1 + (gstRate / 100)) : incRate;
    const itemTaxableTotal = taxableRate * qty;
    subtotal += itemTaxableTotal;
    gstAmount += itemTaxableTotal * (gstRate / 100);
  });
  
  const loading = Number(invoice.loadingCharges || invoice.loading_charges) || 0;
  const transport = Number(invoice.transportCharges || invoice.transport_charges) || 0;
  const other = Number(invoice.otherCharges || invoice.other_charges) || 0;
  const hamali = Number(invoice.hamali) || 0;

  const taxableAmount = subtotal + loading + transport + other;
  const invoiceTotal = taxableAmount + gstAmount + hamali;
  return Math.round(invoiceTotal);
};

export const saveInvoice = async (invoice: InvoiceData): Promise<void> => {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) throw new Error("User not authenticated");

  const sanitizedItems = invoice.items.map(item => ({
    ...item,
    qty: Number(item.qty) || 1, // Default to 1 for services
    inclusiveRate: Number(item.inclusiveRate) || 0,
    serviceDescription: item.serviceDescription || '',
    currency: item.currency || 'INR'
  }));

  const calculatedTotal = calculateInvoiceTotal(invoice);

  const payload = {
    user_id: authData.user.id,
    invoice_no: invoice.invoiceNo,
    date_of_supply: invoice.dateOfSupply,
    po_no: invoice.poNo,
    po_date: invoice.poDate,
    vehicle_no: invoice.vehicleNo,
    name_of_transport: invoice.nameOfTransport,
    place_of_supply: invoice.placeOfSupply,
    mode_of_transport: invoice.modeOfTransport,
    customer_id: invoice.customerId || null,
    receiver_name: invoice.receiverName,
    receiver_address: invoice.receiverAddress,
    receiver_state: invoice.receiverState,
    receiver_state_code: invoice.receiverStateCode,
    receiver_gstin: invoice.receiverGstin,
    loading_charges: Number(invoice.loadingCharges) || 0,
    transport_charges: Number(invoice.transportCharges) || 0,
    other_charges: Number(invoice.otherCharges) || 0,
    hamali: Number(invoice.hamali) || 0,
    items_json: sanitizedItems,
    total_amount: invoice.totalAmount || calculatedTotal,
    reportable: invoice.reportable || false,
    receiver_phone: invoice.receiverPhone,
    receiver_email: invoice.receiverEmail
  };

  // Check if invoice exists for this specific user (scope by user_id to avoid cross-user collision)
  const { data: existing } = await supabase.from('invoices').select('invoice_no').eq('invoice_no', invoice.invoiceNo).eq('user_id', authData.user.id).single();

  let error;
  if (existing) {
    const res = await supabase.from('invoices').update(payload).eq('invoice_no', invoice.invoiceNo);
    error = res.error;
  } else {
    const res = await supabase.from('invoices').insert(payload);
    error = res.error;
  }
  
  if (error) {
    console.error('Error saving invoice:', error);
    throw error;
  }
};

export const getInvoices = async (): Promise<InvoiceData[]> => {
  const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Error fetching invoices from Supabase:', error);
    return [];
  }
  
  return data.map(row => ({
    invoiceNo: row.invoice_no,
    dateOfSupply: row.date_of_supply,
    poNo: row.po_no || '',
    poDate: row.po_date || '',
    vehicleNo: row.vehicle_no || '',
    nameOfTransport: row.name_of_transport || '',
    placeOfSupply: row.place_of_supply || '',
    modeOfTransport: row.mode_of_transport || '',
    customerId: row.customer_id,
    receiverName: row.receiver_name,
    receiverAddress: row.receiver_address,
    receiverState: row.receiver_state,
    receiverStateCode: row.receiver_state_code,
    receiverGstin: row.receiver_gstin,
    receiverPhone: row.receiver_phone,
    receiverEmail: row.receiver_email,
    loadingCharges: row.loading_charges,
    transportCharges: row.transport_charges,
    otherCharges: row.other_charges,
    hamali: row.hamali,
    items: row.items_json,
    totalAmount: row.total_amount || calculateInvoiceTotal(row),
    reportable: row.reportable
  }));
};

export const getLatestInvoiceNo = async (): Promise<string | null> => {
  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_no')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
    
  if (error || !data) return null;
  return data.invoice_no;
};

export const getInvoiceByNo = async (invoiceNo: string): Promise<InvoiceData | undefined> => {
  const { data, error } = await supabase.from('invoices').select('*').eq('invoice_no', invoiceNo).single();
  if (error || !data) {
    console.error('Error fetching single invoice:', error);
    return undefined;
  }
  
  return {
    invoiceNo: data.invoice_no,
    dateOfSupply: data.date_of_supply,
    poNo: data.po_no || '',
    poDate: data.po_date || '',
    vehicleNo: data.vehicle_no || '',
    nameOfTransport: data.name_of_transport || '',
    placeOfSupply: data.place_of_supply || '',
    modeOfTransport: data.mode_of_transport || '',
    customerId: data.customer_id,
    receiverName: data.receiver_name,
    receiverAddress: data.receiver_address,
    receiverState: data.receiver_state,
    receiverStateCode: data.receiver_state_code,
    receiverGstin: data.receiver_gstin,
    receiverPhone: data.receiver_phone,
    receiverEmail: data.receiver_email,
    loadingCharges: data.loading_charges,
    transportCharges: data.transport_charges,
    otherCharges: data.other_charges,
    hamali: data.hamali,
    items: data.items_json,
    totalAmount: data.total_amount || calculateInvoiceTotal(data),
    reportable: data.reportable
  };
};

export const deleteInvoice = async (invoiceNo: string): Promise<void> => {
  const { error } = await supabase.from('invoices').delete().eq('invoice_no', invoiceNo);
  if (error) throw error;
};

export const getCustomers = async (): Promise<Customer[]> => {
  const { data, error } = await supabase.from('customers').select('*');
  if (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
  return data.map(row => ({
    id: row.id,
    name: row.name,
    address: row.address,
    state: row.state,
    stateCode: row.state_code,
    gstin: row.gstin,
    region: row.region || '',
    phone: row.phone || '',
    email: row.email || '',
    openingBalance: row.opening_balance || 0
  })).sort((a, b) => a.name.localeCompare(b.name));
};

export const getMasterItems = async (): Promise<MasterItem[]> => {
  const { data, error } = await supabase.from('items').select('*');
  if (error) {
    console.error('Error fetching items:', error);
    return [];
  }
  return data.map(row => ({
    id: row.id,
    description: row.description,
    hsnCode: row.hsn_code,
    unit: row.unit,
    gstRate: row.gst_rate,
    isInclusive: row.is_inclusive ?? true
  }));
};

export const addCustomer = async (customer: Omit<Customer, 'id'>): Promise<void> => {
  const { error } = await supabase.from('customers').insert({
    name: customer.name,
    address: customer.address,
    state: customer.state,
    state_code: customer.stateCode,
    gstin: customer.gstin,
    region: customer.region,
    phone: customer.phone,
    email: customer.email,
    opening_balance: customer.openingBalance || 0
  });
  if (error) throw error;
};

export const updateCustomer = async (id: string, customer: Partial<Omit<Customer, 'id'>>): Promise<void> => {
  const updates: any = {};
  if (customer.name !== undefined) updates.name = customer.name;
  if (customer.address !== undefined) updates.address = customer.address;
  if (customer.state !== undefined) updates.state = customer.state;
  if (customer.stateCode !== undefined) updates.state_code = customer.stateCode;
  if (customer.gstin !== undefined) updates.gstin = customer.gstin;
  if (customer.region !== undefined) updates.region = customer.region;
  if (customer.phone !== undefined) updates.phone = customer.phone;
  if (customer.email !== undefined) updates.email = customer.email;
  if (customer.openingBalance !== undefined) updates.opening_balance = customer.openingBalance;

  const { error } = await supabase.from('customers').update(updates).eq('id', id);
  if (error) throw error;
};

export const deleteCustomer = async (id: string): Promise<void> => {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
};

export const addMasterItem = async (item: Omit<MasterItem, 'id'>): Promise<void> => {
  const { error } = await supabase.from('items').insert({
    description: item.description,
    hsn_code: item.hsnCode,
    unit: item.unit,
    gst_rate: item.gstRate,
    is_inclusive: item.isInclusive ?? true
  });
  if (error) throw error;
};

export const updateMasterItem = async (id: string, item: Partial<MasterItem>): Promise<void> => {
  const updates: any = {};
  if (item.description !== undefined) updates.description = item.description;
  if (item.hsnCode !== undefined) updates.hsn_code = item.hsnCode;
  if (item.unit !== undefined) updates.unit = item.unit;
  if (item.gstRate !== undefined) updates.gst_rate = item.gstRate;
  if (item.isInclusive !== undefined) updates.is_inclusive = item.isInclusive;

  const { error } = await supabase.from('items').update(updates).eq('id', id);
  if (error) throw error;
};

export const deleteMasterItem = async (id: string): Promise<void> => {
  const { error } = await supabase.from('items').delete().eq('id', id);
  if (error) throw error;
};

export const getBankAccounts = async (): Promise<BankAccount[]> => {
  const { data, error } = await supabase.from('bank_accounts').select('*');
  if (error) {
    console.error('Error fetching bank accounts:', error);
    return [];
  }
  return data.map(row => ({
    id: row.id,
    name: row.name,
    accountNo: row.account_no,
    openingBalance: row.opening_balance
  }));
};

export const addBankAccount = async (account: Omit<BankAccount, 'id'>): Promise<void> => {
  const { error } = await supabase.from('bank_accounts').insert({
    name: account.name,
    account_no: account.accountNo,
    opening_balance: account.openingBalance
  });
  if (error) throw error;
};

export const deleteBankAccount = async (id: string): Promise<void> => {
  const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
  if (error) throw error;
};

export const updateBankAccount = async (id: string, account: Partial<Omit<BankAccount, 'id'>>): Promise<void> => {
  const updates: any = {};
  if (account.name !== undefined) updates.name = account.name;
  if (account.accountNo !== undefined) updates.account_no = account.accountNo;
  if (account.openingBalance !== undefined) updates.opening_balance = account.openingBalance;

  const { error } = await supabase.from('bank_accounts').update(updates).eq('id', id);
  if (error) throw error;
};

export const getTransactions = async (): Promise<Transaction[]> => {
  try {
    const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data.map(row => ({
      id: row.id,
      date: row.date,
      amount: row.amount,
      type: row.type,
      mode: row.mode,
      bankAccountId: row.bank_account_id,
      customerId: row.customer_id,
      particulars: row.particulars,
      refNo: row.ref_no,
      status: row.status,
      confidence: row.confidence,
      suggestedCustomerId: row.suggested_customer_id,
      importSessionId: row.import_session_id,
      rawNarration: row.raw_narration
    }));
  } catch (err) {
    console.warn('Transactions fetching error, falling back to local storage');
    const local = localStorage.getItem('local_transactions');
    return local ? JSON.parse(local) : [];
  }
};

export const getBankImportSessions = async (): Promise<BankImportSession[]> => {
  try {
    const { data, error } = await supabase.from('bank_import_sessions').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data.map(row => ({
      id: row.id,
      date: row.date,
      fileName: row.file_name,
      bankAccountId: row.bank_account_id,
      totalTransactions: row.total_transactions,
      reconciledCount: row.reconciled_count
    }));
  } catch (err) {
    console.warn('Bank import sessions table missing, falling back to local storage');
    const local = localStorage.getItem('bank_import_sessions');
    return local ? JSON.parse(local) : [];
  }
};

export const addBankImportSession = async (session: Omit<BankImportSession, 'id'>): Promise<string> => {
  try {
    const { data, error } = await supabase.from('bank_import_sessions').insert({
      date: session.date,
      file_name: session.fileName,
      bank_account_id: session.bankAccountId,
      total_transactions: session.totalTransactions,
      reconciled_count: session.reconciledCount
    }).select('id').single();
    if (error) throw error;
    return data.id;
  } catch (err) {
    console.warn('Could not save to Supabase, saving to local storage');
    const local = localStorage.getItem('bank_import_sessions');
    const sessions = local ? JSON.parse(local) : [];
    const newSession = { ...session, id: `local-${Date.now()}` };
    sessions.unshift(newSession);
    localStorage.setItem('bank_import_sessions', JSON.stringify(sessions));
    return newSession.id;
  }
};

export const updateBankImportSession = async (id: string, updates: Partial<BankImportSession>): Promise<void> => {
  try {
    const payload: any = {};
    if (updates.reconciledCount !== undefined) payload.reconciled_count = updates.reconciledCount;
    const { error } = await supabase.from('bank_import_sessions').update(payload).eq('id', id);
    if (error) throw error;
  } catch (err) {
    const local = localStorage.getItem('bank_import_sessions');
    if (local) {
      const sessions = JSON.parse(local);
      const updated = sessions.map((s: any) => s.id === id ? { ...s, ...updates } : s);
      localStorage.setItem('bank_import_sessions', JSON.stringify(updated));
    }
  }
};

export const addTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<void> => {
  try {
    const { error } = await supabase.from('transactions').insert({
      date: transaction.date,
      amount: transaction.amount,
      type: transaction.type,
      mode: transaction.mode,
      bank_account_id: transaction.bankAccountId || null,
      customer_id: transaction.customerId || null,
      particulars: transaction.particulars,
      ref_no: transaction.refNo,
      status: transaction.status || 'pending',
      confidence: transaction.confidence || 0,
      suggested_customer_id: transaction.suggestedCustomerId || null,
      import_session_id: transaction.importSessionId || null,
      raw_narration: transaction.rawNarration || null
    });
    if (error) throw error;
  } catch (err) {
    console.warn('Could not save transaction to Supabase, saving locally');
    const local = localStorage.getItem('local_transactions');
    const txns = local ? JSON.parse(local) : [];
    txns.unshift({ ...transaction, id: `local-txn-${Date.now()}` });
    localStorage.setItem('local_transactions', JSON.stringify(txns));
  }
};

export const updateTransaction = async (id: string, transaction: Partial<Omit<Transaction, 'id'>>): Promise<void> => {
  const updates: any = {};
  if (transaction.date !== undefined) updates.date = transaction.date;
  if (transaction.amount !== undefined) updates.amount = transaction.amount;
  if (transaction.type !== undefined) updates.type = transaction.type;
  if (transaction.mode !== undefined) updates.mode = transaction.mode;
  if (transaction.bankAccountId !== undefined) updates.bank_account_id = transaction.bankAccountId || null;
  if (transaction.customerId !== undefined) updates.customer_id = transaction.customerId || null;
  if (transaction.particulars !== undefined) updates.particulars = transaction.particulars;
  if (transaction.refNo !== undefined) updates.ref_no = transaction.refNo;
  if (transaction.status !== undefined) updates.status = transaction.status;
  if (transaction.confidence !== undefined) updates.confidence = transaction.confidence;
  if (transaction.suggestedCustomerId !== undefined) updates.suggested_customer_id = transaction.suggestedCustomerId;
  if (transaction.importSessionId !== undefined) updates.import_session_id = transaction.importSessionId;
  if (transaction.rawNarration !== undefined) updates.raw_narration = transaction.rawNarration;

  const { error } = await supabase.from('transactions').update(updates).eq('id', id);
  if (error) throw error;
};

export const deleteTransaction = async (id: string): Promise<void> => {
  const { error } = await supabase.from('transactions').delete().eq('id', id);
  if (error) throw error;
};

export const getMostSellingItem = async (): Promise<MasterItem | null> => {
  const invoices = await getInvoices();
  if (!invoices || invoices.length === 0) return null;
  const itemCounts: Record<string, number> = {};
  
  invoices.forEach(inv => {
    (inv.items || []).forEach(item => {
      const desc = item.description;
      if (desc) {
        itemCounts[desc] = (itemCounts[desc] || 0) + 1;
      }
    });
  });

  let maxCount = 0;
  let maxItemDesc = null;
  for (const [desc, count] of Object.entries(itemCounts)) {
    if (count > maxCount) {
      maxCount = count;
      maxItemDesc = desc;
    }
  }

  if (maxItemDesc) {
    const items = await getMasterItems();
    return items.find(i => i.description === maxItemDesc) || null;
  }
  return null;
};

export const getSuggestedItems = async (customerId?: string): Promise<{ frequent: MasterItem[], customerSpecific: MasterItem[] }> => {
  const [invoices, allItems] = await Promise.all([getInvoices(), getMasterItems()]);
  
  // Frequent items
  const itemCounts: Record<string, number> = {};
  invoices.forEach(inv => {
    (inv.items || []).forEach(item => {
      if (item.description) itemCounts[item.description] = (itemCounts[item.description] || 0) + 1;
    });
  });

  const frequentDescs = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(e => e[0]);

  // Customer specific items
  const customerSpecificDescs: string[] = [];
  if (customerId) {
    const customerInvoices = invoices.filter(inv => inv.customerId === customerId);
    const customerItemCounts: Record<string, number> = {};
    customerInvoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        if (item.description) customerItemCounts[item.description] = (customerItemCounts[item.description] || 0) + 1;
      });
    });
    customerSpecificDescs.push(...Object.entries(customerItemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(e => e[0]));
  }

  return {
    frequent: allItems.filter(i => frequentDescs.includes(i.description)),
    customerSpecific: allItems.filter(i => customerSpecificDescs.includes(i.description))
  };
};

export const getSettings = async (): Promise<UserSettings | null> => {
  let { data, error } = await supabase.from('user_settings').select('*').single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data: newData, error: insertError } = await supabase
          .from('user_settings')
          .insert({ user_id: authData.user.id })
          .select('*')
          .single();
          
        if (!insertError && newData) {
          data = newData;
          error = null;
        } else {
          console.error('Error creating default settings:', insertError);
          return null;
        }
      } else {
        return null;
      }
    } else {
      console.error('Error fetching settings:', error);
      return null;
    }
  }
  
  return {
    id: data.id,
    companyName: data.company_name,
    proprietorName: data.proprietor_name,
    address: data.address,
    gstin: data.gstin,
    bankName: data.bank_name,
    bankAccountName: data.bank_account_name,
    bankAccountNo: data.bank_account_no,
    bankIfsc: data.bank_ifsc,
    termsConditions: data.terms_conditions,
    invoicePrefix: data.invoice_prefix,
    invoiceFormat: data.invoice_format || 'goods',
    enableHamali: data.enable_hamali ?? true
  };
};

export const updateSettings = async (settings: Partial<UserSettings>): Promise<void> => {
  const updates: any = { updated_at: new Date().toISOString() };
  if (settings.companyName !== undefined) updates.company_name = settings.companyName;
  if (settings.proprietorName !== undefined) updates.proprietor_name = settings.proprietorName;
  if (settings.address !== undefined) updates.address = settings.address;
  if (settings.gstin !== undefined) updates.gstin = settings.gstin;
  if (settings.bankName !== undefined) updates.bank_name = settings.bankName;
  if (settings.bankAccountName !== undefined) updates.bank_account_name = settings.bankAccountName;
  if (settings.bankAccountNo !== undefined) updates.bank_account_no = settings.bankAccountNo;
  if (settings.bankIfsc !== undefined) updates.bank_ifsc = settings.bankIfsc;
  if (settings.termsConditions !== undefined) updates.terms_conditions = settings.termsConditions;
  if (settings.invoicePrefix !== undefined) updates.invoice_prefix = settings.invoicePrefix;
  if (settings.invoiceFormat !== undefined) updates.invoice_format = settings.invoiceFormat;
  if (settings.enableHamali !== undefined) updates.enable_hamali = settings.enableHamali;

  const { error } = await supabase.from('user_settings').update(updates).eq('id', settings.id);
  if (error) throw error;
};
