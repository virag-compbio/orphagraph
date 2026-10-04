import React from 'react';
import { Activity } from 'lucide-react';

export const Logo: React.FC<{ size?: 'large' | 'small' }> = ({ size = 'small' }) => {
  const large = size === 'large';
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`${large ? 'h-11 w-11 rounded-2xl' : 'h-8 w-8 rounded-xl'} bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center`}
      >
        <Activity className={`${large ? 'h-6 w-6' : 'h-4 w-4'} text-white`} />
      </span>
      <span className={`${large ? 'text-3xl sm:text-4xl' : 'text-lg'} font-bold tracking-tight text-slate-800 whitespace-nowrap`}>
        Orphagraph <span className="text-emerald-700">Atlas</span>
      </span>
    </span>
  );
};
