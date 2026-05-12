import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  backPath?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function PageHeader({ title, subtitle, back, backPath, action, icon }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-[45] bg-bg-primary/95 backdrop-blur-xl py-3 md:py-6 -mx-3 px-3 md:-mx-8 md:px-8 border-b border-content-primary/5 shadow-sm mb-6 md:mb-8">
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3"
      >
        {back && (
          <button
            onClick={() => backPath ? navigate(backPath) : navigate(-1)}
            className="w-9 h-9 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center bg-bg-elevated border border-content-primary/10 text-content-secondary hover:text-accent-red hover:border-accent-red/30 transition-all flex-shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {icon && (
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center text-accent-red flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-xl font-bold text-content-primary tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-[10px] md:text-[11px] font-medium text-content-muted mt-0.5 md:mt-1 uppercase tracking-wider truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {action}
          <ThemeToggle className="!w-9 !h-9 md:!w-10 md:!h-10 !rounded-xl md:!rounded-2xl hidden md:flex" />
        </div>
      </motion.div>
    </header>
  );
}
