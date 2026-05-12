import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, FileText, IndianRupee, Menu, Database } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Home' },
  { path: '/invoices', icon: FileText, label: 'Invoices' },
  { path: '/masters', icon: Database, label: 'Masters' },
  { path: '/outstandings', icon: IndianRupee, label: 'Due' },
];

export function BottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return null;

  // Masters active state should also match sub-routes like /customers, /items, /bank-accounts
  const isActive = (path: string) => {
    if (path === '/masters') {
      return location.pathname === '/masters' || 
             location.pathname === '/customers' || 
             location.pathname === '/items' || 
             location.pathname === '/bank-accounts';
    }
    return location.pathname === path;
  };

  return (
    <nav className="bottom-nav no-print flex justify-between px-2">
      {navItems.map(({ path, icon: Icon, label }) => (
        <Link key={path} to={path} className={`nav-item flex-1 ${isActive(path) ? 'active' : ''}`}>
          <div className="relative">
            <Icon size={22} strokeWidth={isActive(path) ? 2.5 : 1.8} />
            {isActive(path) && (
              <motion.div
                layoutId="nav-indicator"
                className="absolute -inset-1.5 rounded-xl bg-accent-red/10"
                style={{ zIndex: -1 }}
              />
            )}
          </div>
          <span className={isActive(path) ? 'text-accent-red' : ''}>{label}</span>
        </Link>
      ))}

      {/* More Button */}
      <button onClick={onOpenMenu} className="nav-item flex-1">
        <Menu size={22} strokeWidth={1.8} />
        <span>More</span>
      </button>
    </nav>
  );
}
