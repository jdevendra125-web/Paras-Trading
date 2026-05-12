import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Package, Landmark, Users } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';

export function Masters() {
  const options = [
    { label: 'Customers', subtitle: 'Manage your party contacts', path: '/customers', icon: Users, color: 'text-accent-gold', bg: 'bg-accent-gold/10', border: 'border-accent-gold/20' },
    { label: 'Items Master', subtitle: 'Products, HSN codes, GST rates', path: '/masters/items', icon: Package, color: 'text-accent-violet', bg: 'bg-accent-violet/10', border: 'border-accent-violet/20' },
    { label: 'Bank Accounts', subtitle: 'Manage bank accounts', path: '/bank-accounts', icon: Landmark, color: 'text-accent-blue', bg: 'bg-accent-blue/10', border: 'border-accent-blue/20' },
  ];
  return (
    <div className="page-container flex flex-col h-full overflow-hidden">
      <PageHeader title="Masters" subtitle="Reference data" back />
      <div className="flex-1 overflow-y-auto min-h-0 hide-scrollbar pb-4 space-y-3">
        {options.map((opt, i) => (
          <motion.div key={opt.path} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Link to={opt.path} className="glass-card-hover p-5 flex items-center gap-4 block">
              <div className={`w-12 h-12 rounded-2xl ${opt.bg} border ${opt.border} flex items-center justify-center flex-shrink-0`}>
                <opt.icon size={22} className={opt.color} />
              </div>
              <div>
                <p className="text-base font-bold text-content-primary">{opt.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{opt.subtitle}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
