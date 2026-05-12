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
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getSettings } from '../../lib/storage';
import type { UserSettings } from '../../types';
import { ThemeToggle } from './ThemeToggle';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: FileText, label: 'Invoices', path: '/invoices' },
  { icon: Users, label: 'Customers', path: '/customers' },
  { icon: Receipt, label: 'Receipts', path: '/receipts' },
  { icon: PieChart, label: 'Reports', path: '/reports' },
  { icon: ShieldCheck, label: 'Bank Reconciliation', path: '/import' },
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

  if (loading && !onClose) return <aside className="w-68 h-dvh sticky top-0 flex bg-bg-secondary border-r border-content-primary/5 animate-pulse" />;

  const businessName = settings?.companyName || 'Digital Laal Vahi';
  const ownerName = settings?.proprietorName || 'Administrator';
  const initials = (settings?.companyName?.[0] || user?.email?.[0] || 'T').toUpperCase();

  return (
    <aside className="w-68 h-dvh sticky top-0 flex flex-col bg-bg-secondary border-r border-content-primary/5 p-6 shadow-xl">
      {/* Branding */}
      <div className="mb-10 px-2 flex items-center gap-3">
        <div className="w-10 h-12 rounded-xl bg-gradient-to-br from-accent-red to-accent-crimson flex items-center justify-center shadow-glow-red border border-white/10">
          <Book className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-content-primary font-bold text-lg leading-none tracking-tight">Digital <span className="text-accent-red">Laal Vahi</span></h1>
          <p className="text-[10px] text-accent-gold font-bold uppercase tracking-[0.2em] mt-1.5 opacity-80">Smart Ledger</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto scrollbar-hide pr-2">
        <p className="text-[10px] font-bold text-content-muted uppercase tracking-[0.2em] px-4 mb-4">Main Menu</p>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-300 group relative ${
                isActive 
                ? 'bg-accent-red/10 text-accent-red border border-accent-red/10' 
                : 'text-content-secondary hover:text-content-primary hover:bg-bg-elevated'
              }`}
            >
              <item.icon size={20} className="transition-transform group-hover:scale-110" />
              <span className="text-sm font-semibold">{item.label}</span>
              {isActive && (
                <motion.div layoutId="sidebar-active" className="absolute left-0 w-1 h-5 bg-accent-red rounded-r-full" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="mt-auto space-y-4 pt-6 border-t border-content-primary/5">
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
            className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl text-danger hover:bg-danger/5 transition-all group font-bold text-sm"
          >
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>Sign Out</span>
          </button>
          <ThemeToggle className="!w-10 !h-10 !rounded-xl flex-shrink-0" />
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
