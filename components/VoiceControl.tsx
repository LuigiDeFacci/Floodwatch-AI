
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface VoiceControlProps {
  onSearch: (city: string, country?: string, isVoice?: boolean) => void;
  readOutText?: string;
  autoSpeakMessage?: string;
}

const VoiceControl: React.FC<VoiceControlProps> = ({ onSearch, readOutText, autoSpeakMessage }) => {
  const { t, language } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permissionError, setPermissionError] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setSupported(true);
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      
      // Initial lang
      updateRecognitionLang();

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        handleCommand(transcript);
        setIsListening(false);
        setPermissionError(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
            setPermissionError(true);
        }
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [onSearch, readOutText, language]);

  const updateRecognitionLang = () => {
    if (recognitionRef.current) {
        if (language === 'pt') recognitionRef.current.lang = 'pt-BR';
        else if (language === 'es') recognitionRef.current.lang = 'es-ES';
        else recognitionRef.current.lang = 'en-US';
    }
  };

  // Update lang dynamically
  useEffect(() => {
    updateRecognitionLang();
  }, [language]);

  // Handle Automatic Speaking
  useEffect(() => {
    if (autoSpeakMessage && autoSpeakMessage.trim().length > 0) {
        speak(autoSpeakMessage);
    }
  }, [autoSpeakMessage]);

  useEffect(() => {
    const interval = setInterval(() => {
        setIsSpeaking(window.speechSynthesis.speaking);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const handleCommand = (text: string) => {
    console.log("Voice Command:", text);
    
    // Multi-lingual command parsing
    const isSearch = text.includes('search') || text.includes('check') || 
                     text.includes('pesquisar') || text.includes('buscar');
                     
    const isReport = text.includes('report') || text.includes('read') || 
                     text.includes('relatório') || text.includes('ler') ||
                     text.includes('reporte');
                     
    const isStop = text.includes('stop') || text.includes('quiet') || 
                   text.includes('parar') || text.includes('silêncio') ||
                   text.includes('silencio') || text.includes('detener');

    if (isSearch) {
      // Remove keywords to find city name
      let city = text
        .replace('search', '').replace('check', '').replace('for', '')
        .replace('pesquisar', '').replace('buscar', '').replace('por', '')
        .trim();
      
      if (city.length > 2) {
        let msg = `Searching for ${city}`;
        if (language === 'pt') msg = `Pesquisando por ${city}`;
        else if (language === 'es') msg = `Buscando ${city}`;
        
        speak(msg);
        // Trigger with voice flag true
        onSearch(city, undefined, true);
      } else {
        let msg = "I didn't catch the city name.";
        if (language === 'pt') msg = "Não entendi o nome da cidade.";
        else if (language === 'es') msg = "No entendí el nombre de la ciudad.";
        speak(msg);
      }
    } 
    else if (isReport) {
      if (readOutText) {
        speak(readOutText);
      } else {
        let msg = "No report available yet.";
        if (language === 'pt') msg = "Nenhum relatório disponível.";
        else if (language === 'es') msg = "No hay reporte disponible.";
        speak(msg);
      }
    }
    else if (isStop) {
        window.speechSynthesis.cancel();
    }
    else {
        let msg = "Sorry, I didn't understand.";
        if (language === 'pt') msg = "Desculpe, não entendi.";
        else if (language === 'es') msg = "Lo siento, no entendí.";
        speak(msg);
    }
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (language === 'pt') utterance.lang = 'pt-BR';
    else if (language === 'es') utterance.lang = 'es-ES';
    else utterance.lang = 'en-US';
    
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const toggleListening = () => {
    setPermissionError(false);
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      window.speechSynthesis.cancel();
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error("Start failed", e);
      }
    }
  };

  const toggleSpeaking = () => {
      if (isSpeaking) {
          window.speechSynthesis.cancel();
          setIsSpeaking(false);
      } else if (readOutText) {
          speak(readOutText);
      }
  };

  if (!supported) return null;

  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
      {(readOutText || autoSpeakMessage) && (
          <button
            onClick={toggleSpeaking}
            className={`p-3 rounded-full shadow-lg transition-all transform hover:scale-105 flex items-center justify-center backdrop-blur-md ${
                isSpeaking 
                ? 'bg-indigo-600/90 text-white animate-pulse ring-4 ring-indigo-200/50 dark:ring-indigo-900/50' 
                : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {isSpeaking ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
      )}

      <button
        onClick={toggleListening}
        className={`p-4 rounded-full shadow-lg transition-all transform hover:scale-105 flex items-center justify-center backdrop-blur-md ${
          isListening 
            ? 'bg-red-500/90 text-white ring-4 ring-red-200/50 dark:ring-red-900/50' 
            : 'bg-blue-600/90 text-white hover:bg-blue-700/90'
        }`}
      >
        {isListening ? <MicOff className="w-6 h-6 animate-pulse" /> : <Mic className="w-6 h-6" />}
      </button>
      
      {isListening && (
          <div className="absolute right-16 bottom-4 bg-slate-900/90 dark:bg-slate-800/90 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap animate-fade-in shadow-lg backdrop-blur-md">
              {t.voice.listening}
          </div>
      )}

      {permissionError && (
          <div className="absolute right-16 bottom-4 bg-red-600/90 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap animate-fade-in flex items-center gap-1 shadow-lg backdrop-blur-md">
              <AlertCircle className="w-3 h-3" /> {t.voice.denied}
          </div>
      )}
    </div>
  );
};

export default VoiceControl;
