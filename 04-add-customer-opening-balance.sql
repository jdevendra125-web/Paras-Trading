-- Add opening_balance column to customers if it does not exist
ALTER TABLE customers ADD COLUMN IF NOT EXISTS opening_balance NUMERIC DEFAULT 0;

-- Ensure phone and email columns are also present (from earlier migrations)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email TEXT;
