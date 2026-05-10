import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-3 mb-8"
    >
      {back && (
        <button
          onClick={() => backPath ? navigate(backPath) : navigate(-1)}
          className="w-10 h-10 rounded-2xl flex items-center justify-center bg-bg-elevated border border-content-primary/10 text-content-secondary hover:text-accent-red hover:border-accent-red/30 transition-all flex-shrink-0"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-accent-red/10 border border-accent-red/20 flex items-center justify-center text-accent-red flex-shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold text-content-primary tracking-tight truncate">{title}</h1>
        {subtitle && <p className="text-[11px] font-medium text-content-muted mt-1 uppercase tracking-wider truncate">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </motion.div>
  );
}
