-- Add invoice format and hamali toggle to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS invoice_format TEXT DEFAULT 'goods',
ADD COLUMN IF NOT EXISTS enable_hamali BOOLEAN DEFAULT true;

-- Add optional phone and email to customers
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add optional phone and email to invoices
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS receiver_phone TEXT,
ADD COLUMN IF NOT EXISTS receiver_email TEXT;

