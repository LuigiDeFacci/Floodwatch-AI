
import React from 'react';
import { X, Heart, Shield, Cpu } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in-up border border-slate-200 dark:border-slate-800 transition-colors duration-300 overflow-hidden">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            {t.about.title}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 text-slate-600 dark:text-slate-300 leading-relaxed">
          
          <section>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">
              <Heart className="w-5 h-5 text-red-500" /> {t.about.motivation}
            </h3>
            <p className="mb-4">
              {t.about.motivationText}
            </p>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">
              <Shield className="w-5 h-5 text-blue-500" /> {t.about.mission}
            </h3>
            <p>
              {t.about.missionText}
            </p>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-slate-100 mb-3">
              <Cpu className="w-5 h-5 text-purple-500" /> {t.about.tech}
            </h3>
            <p className="mb-2">
              {t.about.techText}
            </p>
          </section>

           <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center text-sm text-slate-500 italic">
             <p>{t.about.dedication}</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;