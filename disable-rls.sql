-- Execute this in your Supabase SQL Editor to disable RLS
-- This will allow your app to read and write data without user login

ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE items DISABLE ROW LEVEL SECURITY;
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
