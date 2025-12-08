
import React, { useState, useRef } from 'react';
import { Camera, Upload, AlertTriangle, CheckCircle, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { analyzeFloodImage } from '../services/ai';
import { useLanguage } from '../contexts/LanguageContext';

const FloodVision: React.FC = () => {
  const { t, language } = useLanguage();
  const [image, setImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Resize if too large (max 1024px) to optimize API latency
          const MAX_SIZE = 1024;
          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Canvas context unavailable"));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to JPEG (universal support)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error("Failed to load image"));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit before processing
        let msg = "Image size too large.";
        if (language === 'pt') msg = "Imagem muito grande.";
        else if (language === 'es') msg = "Imagen demasiado grande.";
        setError(msg);
        return;
      }

      setLoading(true); // temporary loading state for processing
      try {
        // Convert to compatible JPEG format
        const processedImage = await processImage(file);
        setImage(processedImage);
        setAnalysis(null);
        setError(null);
      } catch (err) {
        console.error("Image processing error:", err);
        setError("Could not process image. Please try another.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      // Image is guaranteed to be jpeg from processImage
      const mimeType = 'image/jpeg'; 
      
      const result = await analyzeFloodImage(image, mimeType, language);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
      let msg = "AI analysis failed. Please check your connection and try again.";
      if (language === 'pt') msg = "Falha na análise. Tente novamente.";
      else if (language === 'es') msg = "Falló el análisis de IA. Intente de nuevo.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const clearImage = () => {
    setImage(null);
    setAnalysis(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getVerdictStyle = (text: string) => {
    const isDanger = text.includes('DANGER') || text.includes('PERIGO') || text.includes('PELIGRO');
    const isWarning = text.includes('WARNING') || text.includes('ALERTA') || text.includes('ADVERTENCIA');
    const isSafe = text.includes('SAFE') || text.includes('SEGURO');

    if (isDanger) return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
    if (isWarning) return 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-200';
    if (isSafe) return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
    return 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200';
  };

  return (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors duration-300">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-lg">
          <Camera className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100">{t.vision.title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t.vision.sub}</p>
        </div>
      </div>

      {!image ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all group"
        >
          {loading ? (
             <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
          ) : (
            <>
              <div className="mb-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-full group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-slate-400 dark:text-slate-500" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.vision.upload}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t.vision.uploadSub}</span>
            </>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/*" 
            capture="environment"
            className="hidden" 
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black">
            <img src={image} alt="Flood Analysis" className="w-full h-48 object-contain" />
            <button 
              onClick={clearImage}
              className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {!analysis && (
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {t.vision.analyzing}
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" /> {t.vision.analyze}
                </>
              )}
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {analysis && (
        <div className={`mt-4 p-4 rounded-xl border ${getVerdictStyle(analysis)} animate-fade-in`}>
          <div className="flex items-start gap-3">
            {analysis.includes('DANGER') || analysis.includes('PERIGO') || analysis.includes('PELIGRO') ? (
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <div className="text-sm whitespace-pre-line font-medium leading-relaxed">
              {analysis}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloodVision;
