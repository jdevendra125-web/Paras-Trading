-- 1. Create User Settings Table
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  company_name TEXT NOT NULL DEFAULT 'My Trading Co',
  proprietor_name TEXT NOT NULL DEFAULT 'Proprietor Name',
  address TEXT NOT NULL DEFAULT 'Company Address, City, State, PIN',
  gstin TEXT NOT NULL DEFAULT '27XXXXXXXXXXXXX',
  bank_name TEXT NOT NULL DEFAULT 'Bank Name, Branch',
  bank_account_no TEXT NOT NULL DEFAULT '1234567890',
  bank_ifsc TEXT NOT NULL DEFAULT 'XXXX0000123',
  terms_conditions TEXT NOT NULL DEFAULT '1. Goods once sold will not be taken back. 2. Subject to local jurisdiction.',
  invoice_prefix TEXT NOT NULL DEFAULT 'INV/25-26/',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ENABLE RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 3. CREATE POLICIES
CREATE POLICY "Users can view their own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);

-- 4. INSERT DEFAULT SETTINGS FOR EXISTING USERS
-- This will create a default settings row for every user currently in the system
INSERT INTO user_settings (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Note: To set the Paras Trading defaults, you can run this AFTER the above insert:
UPDATE user_settings 
SET 
  company_name = 'PARAS TRADING CO.',
  proprietor_name = 'Parasmal Jethmal Jain',
  address = E'Gangaghat, Shivaji Market,\nShop No 16, Amalner Bazarpeth, Amalner, Jalgaon\nPIN - 425401, Maharashtra, India',
  gstin = '27AEDPJ7961C1ZJ',
  bank_name = 'Axis Bank, AMALNER',
  bank_account_no = '914020040335571',
  bank_ifsc = 'UTIB0002574',
  
  terms_conditions = 'Certified that the particulars given above are true & correct. Interest will be recovered @ 24% p.a. on overdue unpaid bills. Claims must be raised within 3 days. Goods once sold cannot be returned. Subject to Mumbai Jurisdiction.',
  invoice_prefix = 'PT/25-26/'
WHERE user_id = 'YOUR-USER-ID-HERE'; -- Replace with your actual User ID!
