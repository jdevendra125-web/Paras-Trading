import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

export function Input({ label, error, icon, suffix, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="input-label">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">{icon}</span>}
        <input
          id={inputId}
          className={`input-field ${icon ? 'pl-10' : ''} ${suffix ? 'pr-10' : ''} ${error ? 'border-neon-red/50 focus:border-neon-red/70' : ''} ${className}`}
          {...props}
        />
        {suffix && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">{suffix}</span>}
      </div>
      {error && <p className="mt-1 text-xs text-neon-red">{error}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = '', id, ...props }: SelectProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="input-label">{label}</label>}
      <select
        id={inputId}
        className={`input-field ${error ? 'border-neon-red/50' : ''} ${className}`}
        style={{ backgroundImage: 'none' }}
        {...props}
      >
        {options.map(opt => <option key={opt.value} value={opt.value} className="bg-bg-card">{opt.label}</option>)}
      </select>
      {error && <p className="mt-1 text-xs text-neon-red">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = '', id, ...props }: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="w-full">
      {label && <label htmlFor={inputId} className="input-label">{label}</label>}
      <textarea
        id={inputId}
        className={`input-field resize-none ${error ? 'border-neon-red/50' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-neon-red">{error}</p>}
    </div>
  );
}
