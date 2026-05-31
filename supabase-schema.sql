-- Execute this in your Supabase SQL Editor

-- 1. Create Customers Table
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  state TEXT NOT NULL,
  state_code TEXT NOT NULL,
  gstin TEXT NOT NULL,
  region TEXT,
  opening_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Items Master Table
CREATE TABLE items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  hsn_code TEXT NOT NULL,
  unit TEXT NOT NULL,
  gst_rate NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Invoices Table
CREATE TABLE invoices (
  invoice_no TEXT PRIMARY KEY,
  date_of_supply TEXT NOT NULL,
  po_no TEXT,
  po_date TEXT,
  vehicle_no TEXT,
  name_of_transport TEXT,
  place_of_supply TEXT,
  mode_of_transport TEXT,
  customer_id UUID REFERENCES customers(id),
  receiver_name TEXT NOT NULL,
  receiver_address TEXT NOT NULL,
  receiver_state TEXT NOT NULL,
  receiver_state_code TEXT NOT NULL,
  receiver_gstin TEXT NOT NULL,
  loading_charges NUMERIC DEFAULT 0,
  transport_charges NUMERIC DEFAULT 0,
  other_charges NUMERIC DEFAULT 0,
  hamali NUMERIC DEFAULT 0,
  items_json JSONB NOT NULL,
  total_amount NUMERIC DEFAULT 0,
  reportable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Bank Accounts Table
CREATE TABLE bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  account_no TEXT,
  opening_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Transactions Table
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CR', 'DR')),
  mode TEXT NOT NULL CHECK (mode IN ('Bank', 'Cash')),
  bank_account_id UUID REFERENCES bank_accounts(id),
  customer_id UUID REFERENCES customers(id),
  particulars TEXT,
  ref_no TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Dummy Data for Masters
INSERT INTO customers (id, name, address, state, state_code, gstin, region) VALUES 
('11111111-1111-1111-1111-111111111111', 'Bajrang Supermarket', 'Godown 1, 2 And 3, Next To Chatrapati Shivaji Maharaj Auditorium, Final Plot 227, Amalner Jalgaon, Maharashtra, 425401', 'Maharashtra', '27', '27AAGHJ5402D1ZN', 'North'),
('22222222-2222-2222-2222-222222222222', 'Shree Traders', 'Main Market, Jalgaon, Maharashtra, 425001', 'Maharashtra', '27', '27ASDFG1234H1Z5', 'South');

INSERT INTO items (id, description, hsn_code, unit, gst_rate) VALUES 
('33333333-3333-3333-3333-333333333333', 'Rajwadi', '17011310', 'Kgs', 5),
('44444444-4444-4444-4444-444444444444', 'Premium Sugar', '17011490', 'Kgs', 5),
('55555555-5555-5555-5555-555555555555', 'Wheat Flour (Atta)', '11010000', 'Kgs', 0),
('66666666-6666-6666-6666-666666666666', 'Jaggery', '17011410', 'Kgs', 0);

INSERT INTO bank_accounts (id, name, account_no, opening_balance) VALUES
('77777777-7777-7777-7777-777777777777', 'Axis Bank', '914020040335571', 424867.46);
