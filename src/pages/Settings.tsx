import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings2, Building2, CreditCard, FileText, Save, CheckCircle } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Input, Select, Textarea } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { getSettings, updateSettings } from '../lib/storage';
import type { UserSettings } from '../types';

const FORMAT_OPTS = [{ value: 'goods', label: 'Goods (with quantity & HSN)' }, { value: 'service', label: 'Services (amount-based)' }];

export function Settings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { getSettings().then(s => { if (s) setSettings(s); setLoading(false); }); }, []);

  const set = (k: keyof UserSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setSettings(prev => prev ? { ...prev, [k]: e.target.value } : null);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) { alert('Failed to save: ' + e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="page-container"><div className="h-40 flex items-center justify-center text-slate-600 text-sm">Loading settings...</div></div>;
  if (!settings) return <div className="page-container"><p className="text-sm text-neon-red">Could not load settings.</p></div>;

  const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 mb-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/[0.06]">
        <div className="w-7 h-7 rounded-lg bg-accent-blue/10 flex items-center justify-center"><Icon size={14} className="text-accent-blue" /></div>
        <p className="text-sm font-bold text-white">{title}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </motion.div>
  );

  return (
    <div className="page-container">
      <PageHeader title="Settings" subtitle="Company & invoice settings" icon={<Settings2 size={18} />} />

      <Section title="Company Details" icon={Building2}>
        <Input label="Company Name" value={settings.companyName || ''} onChange={set('companyName')} placeholder="Paras Trading" />
        <Input label="Proprietor Name" value={settings.proprietorName || ''} onChange={set('proprietorName')} placeholder="Name" />
        <Textarea label="Address" value={settings.address || ''} onChange={set('address')} placeholder="Full address..." rows={3} />
        <Input label="GSTIN" value={settings.gstin || ''} onChange={set('gstin')} placeholder="27AAGHJ5402D1ZN" className="uppercase" />
      </Section>

      <Section title="Bank Details" icon={CreditCard}>
        <Input label="Bank Name" value={settings.bankName || ''} onChange={set('bankName')} placeholder="Axis Bank" />
        <Input label="Account Name" value={settings.bankAccountName || ''} onChange={set('bankAccountName')} placeholder="Paras Trading" />
        <Input label="Account Number" value={settings.bankAccountNo || ''} onChange={set('bankAccountNo')} placeholder="914020040335571" />
        <Input label="IFSC Code" value={settings.bankIfsc || ''} onChange={set('bankIfsc')} placeholder="UTIB0000001" className="uppercase" />
      </Section>

      <Section title="Invoice Settings" icon={FileText}>
        <Input label="Invoice Prefix" value={settings.invoicePrefix || ''} onChange={set('invoicePrefix')} placeholder="PT/25-26/" />
        <Select label="Invoice Format" value={settings.invoiceFormat || 'goods'} onChange={set('invoiceFormat')} options={FORMAT_OPTS} />
        <Textarea label="Terms & Conditions" value={settings.termsConditions || ''} onChange={set('termsConditions')} placeholder="Payment terms..." rows={3} />
        <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-elevated border border-white/10">
          <input type="checkbox" id="hamali" checked={settings.enableHamali ?? true}
            onChange={e => setSettings(prev => prev ? { ...prev, enableHamali: e.target.checked } : null)}
            className="w-4 h-4 rounded accent-accent-blue" />
          <label htmlFor="hamali" className="text-sm text-slate-300 cursor-pointer">Enable Hamali charges on invoices</label>
        </div>
      </Section>

      <motion.div whileTap={{ scale: 0.98 }}>
        <Button onClick={handleSave} loading={saving} className="w-full" size="lg" variant={saved ? 'success' : 'primary'}
          icon={saved ? <CheckCircle size={16} /> : <Save size={16} />}>
          {saved ? 'Saved!' : 'Save Settings'}
        </Button>
      </motion.div>
    </div>
  );
}
