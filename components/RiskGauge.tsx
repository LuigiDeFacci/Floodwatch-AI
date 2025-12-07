
import React from 'react';
import { RiskLevel } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface RiskGaugeProps {
  score: number;
  level: RiskLevel;
}

const RiskGauge: React.FC<RiskGaugeProps> = ({ score, level }) => {
  const { language } = useLanguage();
  let colorClass = 'bg-green-500';
  let textColorClass = 'text-green-700 dark:text-green-400';
  
  if (level === RiskLevel.MODERATE) {
    colorClass = 'bg-yellow-400';
    textColorClass = 'text-yellow-700 dark:text-yellow-400';
  } else if (level === RiskLevel.HIGH) {
    colorClass = 'bg-orange-500';
    textColorClass = 'text-orange-700 dark:text-orange-400';
  } else if (level === RiskLevel.CRITICAL) {
    colorClass = 'bg-red-600';
    textColorClass = 'text-red-700 dark:text-red-400';
  }

  // Translation mapping for Risk Levels
  const levelText = language === 'pt' ? {
    [RiskLevel.LOW]: 'BAIXO',
    [RiskLevel.MODERATE]: 'MODERADO',
    [RiskLevel.HIGH]: 'ALTO',
    [RiskLevel.CRITICAL]: 'CRÍTICO'
  }[level] : level;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
      <div className="relative w-48 h-24 overflow-hidden mb-4">
        <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[12px] border-slate-100 dark:border-slate-800 box-border transition-colors duration-300"></div>
        <div 
            className={`absolute top-0 left-0 w-48 h-48 rounded-full border-[12px] border-transparent box-border ${colorClass.replace('bg-', 'border-')} transition-transform duration-1000 ease-out`}
            style={{ 
                transform: `rotate(${(score / 100) * 180}deg)`,
                borderBottomColor: 'transparent',
                borderRightColor: 'transparent',
                transformOrigin: '50% 50%' 
            }}
        ></div>
        <div className="absolute bottom-0 w-full text-center font-bold text-4xl text-slate-800 dark:text-slate-100 transition-colors duration-300">
            {score}
            <span className="text-sm font-normal text-slate-400 dark:text-slate-500 ml-1">/100</span>
        </div>
      </div>
      
      <h3 className={`text-2xl font-bold uppercase tracking-wide ${textColorClass}`}>
        {levelText} {language === 'pt' ? 'RISCO' : 'RISK'}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 text-center max-w-xs">
        {language === 'pt' ? 'Estimativa baseada em precipitação.' : 'Estimated heuristic score based on precipitation.'}
      </p>
    </div>
  );
};

export default RiskGauge;
