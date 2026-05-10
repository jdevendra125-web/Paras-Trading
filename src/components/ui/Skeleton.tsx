import React from 'react';

export function Skeleton({ className = '', rows = 1 }: { className?: string; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`skeleton h-4 mb-3 ${className}`}
          style={{
            background: 'linear-gradient(90deg, #0d1526 25%, #111c32 50%, #0d1526 75%)',
            backgroundSize: '400% 100%',
            animation: 'shimmer 1.6s ease-in-out infinite',
          }}
        />
      ))}
    </>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-card p-5 animate-pulse">
      <Skeleton className="w-1/3 h-3 mb-4" />
      <Skeleton className="w-full h-6 mb-2" />
      <Skeleton className="w-2/3 h-3" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-white/[0.04]">
        <Skeleton className="w-1/4 h-4" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-white/[0.04]">
          <Skeleton className="w-1/3 h-3" />
          <Skeleton className="w-1/4 h-3" />
          <Skeleton className="w-1/5 h-3 ml-auto" />
        </div>
      ))}
    </div>
  );
}
