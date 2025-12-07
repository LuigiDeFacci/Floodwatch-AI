import React, { ReactNode } from 'react';

interface InfoCardProps {
  title: string;
  value: string;
  subtext?: string;
  icon: ReactNode;
  alert?: boolean;
}

const InfoCard: React.FC<InfoCardProps> = ({ title, value, subtext, icon, alert }) => {
  return (
    <div className={`p-4 rounded-xl border ${alert ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'} shadow-sm flex items-start gap-4 h-full transition-colors duration-300`}>
      <div className={`p-2 rounded-lg shrink-0 ${alert ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' : 'bg-blue-50 dark:bg-slate-800 text-blue-600 dark:text-blue-400'}`}>
        {icon}
      </div>
      <div>
        <h4 className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">{title}</h4>
        <div className={`text-xl md:text-2xl font-bold ${alert ? 'text-red-900 dark:text-red-300' : 'text-slate-800 dark:text-slate-100'}`}>{value}</div>
        {subtext && <div className="text-slate-400 dark:text-slate-500 text-xs mt-1 leading-tight">{subtext}</div>}
      </div>
    </div>
  );
};

export default InfoCard;