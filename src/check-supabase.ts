import { supabase } from './lib/supabase';

async function checkConnection() {
  try {
    const { data, error } = await supabase.from('invoices').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('❌ Supabase Connection Error:', error.message);
      if (error.message.includes('relation "invoices" does not exist')) {
        console.warn('⚠️ Table "invoices" is missing. Please run the SQL migrations in Supabase.');
      }
    } else {
      console.log('✅ Supabase Connected! Invoices count:', data);
    }
    
    const { data: authData, error: authError } = await supabase.auth.getSession();
    if (authError) {
      console.error('❌ Supabase Auth Error:', authError.message);
    } else {
      console.log('✅ Supabase Auth working. Session:', authData.session ? 'Active' : 'No active session');
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

checkConnection();
