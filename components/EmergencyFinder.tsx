
import React, { useState } from 'react';
import { Map, Navigation, ExternalLink, Loader2, X, Building2, MapPin } from 'lucide-react';
import { findEmergencyResources } from '../services/ai';
import { useLanguage } from '../contexts/LanguageContext';

interface EmergencyFinderProps {
  locationName: string;
}

const EmergencyFinder: React.FC<EmergencyFinderProps> = ({ locationName }) => {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<{ text: string; chunks: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpen = async () => {
    setIsOpen(true);
    if (!data && !loading) {
      setLoading(true);
      setError(null);
      try {
        const result = await findEmergencyResources(locationName, language);
        setData({
          text: result.text || "No details available.",
          chunks: result.groundingMetadata?.groundingChunks || []
        });
      } catch (err) {
        let msg = "Could not locate resources. Please use a local map app.";
        if (language === 'pt') msg = "Não foi possível localizar recursos.";
        else if (language === 'es') msg = "No se pudieron localizar recursos.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClose = () => setIsOpen(false);

  const mapLinks = data?.chunks
    .filter((chunk: any) => chunk.maps?.uri)
    .map((chunk: any) => ({
      title: chunk.maps.title,
      uri: chunk.maps.uri,
      address: chunk.maps.placeAnswerSources?.[0]?.placeAnswerSourceId
    })) || [];

  return (
    <>
      <button
        onClick={handleOpen}
        className="w-full h-full min-h-[100px] bg-white dark:bg-slate-900 hover:bg-red-50/50 dark:hover:bg-red-900/10 border border-slate-200 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900 rounded-2xl p-4 flex flex-row sm:flex-col items-center justify-center gap-4 sm:gap-2 transition-all group shadow-sm"
      >
        <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-full group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors shrink-0">
          <Map className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <div className="text-left sm:text-center">
          <span className="block font-bold text-slate-700 dark:text-slate-200 group-hover:text-red-700 dark:group-hover:text-red-300 transition-colors">
            {t.emergency.button}
          </span>
          <span className="block text-xs text-slate-400 dark:text-slate-500 mt-1 group-hover:text-red-400 dark:group-hover:text-red-300">
            {t.emergency.sub}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={handleClose}
          ></div>

          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-fade-in-up border border-slate-100 dark:border-slate-800 transition-colors duration-300">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
                  <Building2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">{t.emergency.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.emergency.verified} {locationName}</p>
                </div>
              </div>
              <button 
                onClick={handleClose}
                className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
                  <Loader2 className="w-8 h-8 text-red-500 dark:text-red-400 animate-spin mb-3" />
                  <p className="text-sm">{t.emergency.consulting}</p>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                   <p className="text-red-500 dark:text-red-400 mb-2">{error}</p>
                   <button onClick={() => { setLoading(false); setData(null); handleOpen(); }} className="text-sm text-blue-600 dark:text-blue-400 underline">{t.emergency.tryAgain}</button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="prose prose-sm prose-slate dark:prose-invert max-w-none bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{data?.text}</p>
                  </div>

                  {mapLinks.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{t.emergency.identified}</h4>
                      {mapLinks.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-900 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-all group"
                        >
                          <div className="bg-white dark:bg-slate-800 p-2.5 rounded-full border border-slate-100 dark:border-slate-700 shadow-sm text-slate-400 dark:text-slate-500 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <h5 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors text-sm">
                              {link.title}
                            </h5>
                            <div className="flex items-center gap-1 mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                              {t.emergency.openMap} <ExternalLink className="w-3 h-3" />
                            </div>
                          </div>
                          <div className="self-center">
                             <Navigation className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-red-400 dark:group-hover:text-red-500" />
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmergencyFinder;