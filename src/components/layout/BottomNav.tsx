import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, FileText, IndianRupee, Menu, Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Home' },
  { path: '/invoices', icon: FileText, label: 'Invoices' },
  { path: '/outstandings', icon: IndianRupee, label: 'Due' },
  // Note: 'More' is rendered separately below as a button (not a Link)
];

export function BottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <nav className="bottom-nav no-print">
        {navItems.slice(0, 2).map(({ path, icon: Icon, label }) => (
          <Link key={path} to={path} className={`nav-item ${isActive(path) ? 'active' : ''}`}>
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

        {/* FAB spacer */}
        <div className="nav-item pointer-events-none invisible" />

        {navItems.slice(2, 3).map(({ path, icon: Icon, label }) => (
          <Link key={path} to={path} className={`nav-item ${isActive(path) ? 'active' : ''}`}>
            <Icon size={22} strokeWidth={isActive(path) ? 2.5 : 1.8} />
            <span className={isActive(path) ? 'text-accent-red' : ''}>{label}</span>
          </Link>
        ))}

        {/* More Button */}
        <button onClick={onOpenMenu} className="nav-item">
          <Menu size={22} strokeWidth={1.8} />
          <span>More</span>
        </button>
      </nav>

      {/* FAB */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 no-print" style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        <motion.div whileTap={{ scale: 0.88 }} whileHover={{ scale: 1.05 }}>
          <Link to="/new" className="nav-fab">
            <Plus size={28} strokeWidth={3} />
          </Link>
        </motion.div>
      </div>
    </>
  );
}
