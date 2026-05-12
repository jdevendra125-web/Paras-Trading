import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Settings2, Package, Landmark, Upload, HelpCircle,
  ChevronRight, LogOut, TrendingUp, User
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { useAuth } from '../hooks/useAuth';
import { getSettings } from '../lib/storage';
import type { UserSettings } from '../types';

const menuGroups = [
  {
    label: 'Masters',
    items: [
      { label: 'Items Master', path: '/masters/items', icon: Package, color: 'text-accent-violet', bg: 'bg-accent-violet/10' },
      { label: 'Bank Accounts', path: '/bank-accounts', icon: Landmark, color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'Bank Import', path: '/import', icon: Upload, color: 'text-neon-green', bg: 'bg-neon-green/10' },
      { label: 'Reports', path: '/reports', icon: TrendingUp, color: 'text-warning', bg: 'bg-warning/10' },
    ],
  },
  {
    label: 'App',
    items: [
      { label: 'Settings', path: '/settings', icon: Settings2, color: 'text-slate-400', bg: 'bg-white/5' },
      { label: 'Help', path: '/help', icon: HelpCircle, color: 'text-slate-400', bg: 'bg-white/5' },
    ],
  },
];

export function More() {
  const { user, signOut } = useAuth();
  const [settings, setSettings] = React.useState<UserSettings | null>(null);

  React.useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const businessName = settings?.companyName || 'Digital Laal Vahi';
  const ownerName = settings?.proprietorName || 'Administrator';

  return (
    <div className="page-container">
      <PageHeader title="More" subtitle="Tools & settings" />

      {/* User Card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4 flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent-blue to-accent-indigo flex items-center justify-center flex-shrink-0 text-white font-bold">
          {(settings?.companyName?.[0] || 'T').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{businessName}</p>
          <p className="text-xs text-slate-500 truncate">{ownerName}</p>
        </div>
      </motion.div>

      {/* Menu Groups */}
      <div className="space-y-4">
        {menuGroups.map((group, gi) => (
          <motion.div key={group.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: gi * 0.06 }}>
            <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-widest mb-2 px-1">{group.label}</p>
            <div className="glass-card overflow-hidden">
              {group.items.map((item, i) => (
                <Link key={item.path} to={item.path} className={`flex items-center gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors ${i < group.items.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                  <div className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>
                    <item.icon size={15} className={item.color} />
                  </div>
                  <p className="text-sm text-white flex-1">{item.label}</p>
                  <ChevronRight size={14} className="text-slate-600" />
                </Link>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Sign Out */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3.5 glass-card text-neon-red hover:border-neon-red/20 transition-all"
        >
          <div className="w-8 h-8 rounded-xl bg-neon-red/10 flex items-center justify-center">
            <LogOut size={15} className="text-neon-red" />
          </div>
          <p className="text-sm font-semibold">Sign Out</p>
        </button>
      </motion.div>

      <p className="text-center text-xs text-slate-700 mt-6">Paras Trading v2.0 · Built with ❤️</p>
    </div>
  );
}
