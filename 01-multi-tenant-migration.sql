-- 1. ADD user_id COLUMN TO ALL TABLES
ALTER TABLE customers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE items ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE bank_accounts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. UPDATE EXISTING DATA (IMPORTANT: Replace 'YOUR-USER-ID-HERE' with the actual UUID from Supabase Auth)
-- Example: 'd1982b58-8547-4cf3-a3d2-4cf3f22daabc'
DO $$
DECLARE
    target_user_id UUID := '0931ef68-2e10-4b87-9095-36929d6d0660'; -- REPLACE THIS!
BEGIN
    UPDATE customers SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE items SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE invoices SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE bank_accounts SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE transactions SET user_id = target_user_id WHERE user_id IS NULL;
END $$;

-- 3. MAKE user_id NOT NULL AND SET DEFAULT
ALTER TABLE customers ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE customers ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE items ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE items ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE invoices ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE bank_accounts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE bank_accounts ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE transactions ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 4. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- 5. CREATE RLS POLICIES
-- Customers
CREATE POLICY "Users can view their own customers" ON customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own customers" ON customers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own customers" ON customers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own customers" ON customers FOR DELETE USING (auth.uid() = user_id);

-- Items
CREATE POLICY "Users can view their own items" ON items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own items" ON items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own items" ON items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own items" ON items FOR DELETE USING (auth.uid() = user_id);

-- Invoices
CREATE POLICY "Users can view their own invoices" ON invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own invoices" ON invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own invoices" ON invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own invoices" ON invoices FOR DELETE USING (auth.uid() = user_id);

-- Bank Accounts
CREATE POLICY "Users can view their own bank accounts" ON bank_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own bank accounts" ON bank_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bank accounts" ON bank_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own bank accounts" ON bank_accounts FOR DELETE USING (auth.uid() = user_id);

-- Transactions
CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);
