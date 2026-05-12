import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Receipt, 
  PieChart, 
  Settings, 
  HelpCircle, 
  Database, 
  LogOut,
  Book,
  Menu,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getSettings } from '../../lib/storage';
import type { UserSettings } from '../../types';
import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: FileText, label: 'Invoices', path: '/invoices' },
  { icon: Users, label: 'Customers', path: '/customers' },
  { icon: Clock, label: 'Outstandings', path: '/outstandings' },
  { icon: Receipt, label: 'Receipts', path: '/receipts' },
  { icon: PieChart, label: 'Reports', path: '/reports' },
  { icon: ShieldCheck, label: 'Bank Statement Import', path: '/import' },
  { icon: Database, label: 'Bank Accounts', path: '/bank-accounts' },
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: HelpCircle, label: 'Help', path: '/help' },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [settings, setSettings] = React.useState<UserSettings | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    getSettings().then(s => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  if (loading && !onClose) return <aside className="w-60 h-dvh sticky top-0 flex bg-bg-secondary border-r border-content-primary/5 animate-pulse" />;

  const businessName = settings?.companyName || 'Digital Laal Vahi';
  const ownerName = settings?.proprietorName || 'Administrator';
  const initials = (settings?.companyName?.[0] || user?.email?.[0] || 'T').toUpperCase();

  return (
    <aside className="w-60 h-dvh sticky top-0 flex flex-col bg-bg-secondary border-r border-content-primary/5 p-4 shadow-xl">
      {/* Branding */}
      <div className="mb-6 px-3 flex items-center gap-3">
        <div className="bg-white p-1 rounded-lg shadow-sm border border-black/5">
          <img src="/logo.png" alt="Digital LaalVahi" className="h-8 w-8 object-contain" />
        </div>
        <div className="flex flex-col">
          <span className="text-[14px] font-black tracking-tight text-content-primary leading-none">Digital Laal Vahi</span>
          <span className="text-[9px] font-bold text-accent-red tracking-widest uppercase mt-0.5">Smart Billing</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-hide pr-1">
        <p className="text-[9px] font-bold text-content-muted uppercase tracking-[0.2em] px-3 mb-2">Main Menu</p>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group relative ${
                isActive 
                ? 'bg-accent-red/10 text-accent-red border border-accent-red/10' 
                : 'text-content-secondary hover:text-content-primary hover:bg-bg-elevated'
              }`}
            >
              <item.icon size={18} className="transition-transform group-hover:scale-110 flex-shrink-0" />
              <span className="text-[13px] font-semibold truncate">{item.label}</span>
              {isActive && (
                <motion.div layoutId="sidebar-active" className="absolute left-0 w-1 h-5 bg-accent-red rounded-r-full" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="mt-auto space-y-3 pt-4 border-t border-content-primary/5">
        <div className="px-2 py-3 rounded-2xl bg-bg-elevated/50 border border-content-primary/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-red to-accent-crimson border-2 border-bg-secondary flex items-center justify-center text-white font-bold shadow-sm">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-content-primary truncate">{businessName}</p>
            <p className="text-[10px] text-accent-gold font-bold truncate">{ownerName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={signOut}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-danger hover:bg-danger/5 transition-all group font-bold text-[13px] border border-danger/10"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="px-4 flex items-center justify-between text-[9px] text-content-muted font-bold uppercase tracking-widest opacity-60">
          <span>Version 1.0</span>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span>Secure</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
