import React from 'react';
import { motion } from 'framer-motion';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', loading, icon, children, className = '', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed select-none';
  const variants = {
    primary: 'bg-gradient-to-r from-accent-blue to-accent-indigo text-white shadow-glow-red-blue hover:opacity-90',
    secondary: 'bg-bg-elevated border border-content-primary/10 text-content-primary hover:border-accent-blue/30 hover:bg-content-primary/5',
    danger: 'bg-gradient-to-r from-danger to-red-700 text-white shadow-glow-red-red hover:opacity-90',
    ghost: 'text-content-muted hover:text-content-primary hover:bg-content-primary/5',
    success: 'bg-gradient-to-r from-success to-green-600 text-white hover:opacity-90',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
  };

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch (err) {}
    if (props.onClick) props.onClick(e);
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...(props as any)}
      onClick={handleClick}
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
        </svg>
      ) : icon}
      {children}
    </motion.button>
  );
}
