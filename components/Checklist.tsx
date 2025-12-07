
import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, Save } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ChecklistProps {
  items: string[];
  locationName: string;
}

const Checklist: React.FC<ChecklistProps> = ({ items, locationName }) => {
  const { t } = useLanguage();
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const key = `floodwatch-checklist-${locationName}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          setCheckedItems(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse saved checklist", e);
          setCheckedItems({});
        }
      } else {
        setCheckedItems({});
      }
    } catch (e) {
      console.warn("LocalStorage access failed:", e);
      setCheckedItems({});
    }
  }, [locationName]);

  const toggleItem = (item: string) => {
    const newState = {
      ...checkedItems,
      [item]: !checkedItems[item]
    };
    setCheckedItems(newState);
    
    const key = `floodwatch-checklist-${locationName}`;
    try {
      localStorage.setItem(key, JSON.stringify(newState));
    } catch (e) {
      console.warn("LocalStorage write failed:", e);
    }
  };

  const progress = Math.round(
    (items.filter(i => checkedItems[i]).length / items.length) * 100
  );

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t.checklist.title}</h3>
        <div className={`text-xs font-semibold px-2 py-1 rounded-md transition-colors ${progress === 100 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-400'}`}>
          {progress}% {t.checklist.ready}
        </div>
      </div>
      
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mb-6 overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ease-out ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => {
          const isChecked = !!checkedItems[item];
          return (
            <div 
              key={idx} 
              onClick={() => toggleItem(item)}
              className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                isChecked 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30' 
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-50 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-700'
              }`}
            >
              <div className={`mt-0.5 shrink-0 transition-colors ${isChecked ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500'}`}>
                {isChecked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
              </div>
              <span className={`text-sm leading-relaxed select-none transition-colors ${isChecked ? 'text-slate-500 dark:text-slate-500 line-through decoration-slate-300 dark:decoration-slate-600' : 'text-slate-700 dark:text-slate-300'}`}>
                {item}
              </span>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
        <Save className="w-3 h-3" />
        <span>{t.checklist.save}</span>
      </div>
    </div>
  );
};

export default Checklist;
