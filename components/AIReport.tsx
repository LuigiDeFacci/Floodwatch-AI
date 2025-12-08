
import React, { useState } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import { generateAIReport } from '../services/ai';
import { RiskAnalysis, GeoLocation } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface AIReportProps {
  location: GeoLocation;
  risk: RiskAnalysis;
}

const AIReport: React.FC<AIReportProps> = ({ location, risk }) => {
  const { t, language } = useLanguage();
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const text = await generateAIReport(location, risk, language);
      setReport(text);
    } catch (err) {
      let msg = "AI service is currently busy. Please try again.";
      if (language === 'pt') msg = "Serviço ocupado. Tente novamente.";
      else if (language === 'es') msg = "Servicio ocupado. Intente de nuevo.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (report) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-800 shadow-sm animate-fade-in transition-colors duration-300">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles className="w-24 h-24 text-indigo-600 dark:text-indigo-400" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-1.5 rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h4 className="font-bold text-indigo-900 dark:text-indigo-200 text-sm tracking-wide">{t.ai.title}</h4>
          </div>
          
          <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium">
            {report}
          </p>
          
          <div className="mt-4 flex items-center justify-between text-xs text-indigo-400 dark:text-indigo-300">
            <span>{t.ai.powered}</span>
            <button 
              onClick={() => setReport(null)} 
              className="hover:text-indigo-600 dark:hover:text-indigo-200 underline"
            >
              {t.ai.close}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors duration-300">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full group relative overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300 p-4 flex items-center justify-center gap-3 border border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-500"
      >
        {loading ? (
          <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
            <div className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            <span className="font-medium text-sm">{t.ai.reasoning}</span>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-700 p-2 rounded-full shadow-sm group-hover:scale-110 transition-transform duration-300">
               <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="text-left">
              <span className="block text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                {t.ai.button}
              </span>
              <span className="block text-xs text-slate-400 dark:text-slate-500 group-hover:text-indigo-400 dark:group-hover:text-indigo-300 transition-colors">
                {t.ai.sub}
              </span>
            </div>
          </>
        )}
        
        {error && (
            <div className="absolute inset-0 bg-red-50 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 text-sm gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
            </div>
        )}
      </button>
    </div>
  );
};

export default AIReport;