
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface VoiceControlProps {
  onSearch: (city: string, country?: string) => void;
  readOutText?: string;
}

const VoiceControl: React.FC<VoiceControlProps> = ({ onSearch, readOutText }) => {
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
      recognitionRef.current.lang = language === 'pt' ? 'pt-BR' : 'en-US';
      recognitionRef.current.interimResults = false;

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

  // Update lang dynamically
  useEffect(() => {
    if (recognitionRef.current) {
        recognitionRef.current.lang = language === 'pt' ? 'pt-BR' : 'en-US';
    }
  }, [language]);

  useEffect(() => {
    const interval = setInterval(() => {
        setIsSpeaking(window.speechSynthesis.speaking);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const handleCommand = (text: string) => {
    console.log("Voice Command:", text);
    
    // Multi-lingual command parsing
    const isSearch = text.includes('search') || text.includes('check') || text.includes('pesquisar') || text.includes('buscar');
    const isReport = text.includes('report') || text.includes('read') || text.includes('relatório') || text.includes('ler');
    const isStop = text.includes('stop') || text.includes('quiet') || text.includes('parar') || text.includes('silêncio');

    if (isSearch) {
      // Remove keywords to find city name
      let city = text
        .replace('search', '').replace('check', '').replace('for', '')
        .replace('pesquisar', '').replace('buscar', '').replace('por', '')
        .trim();
      
      if (city.length > 2) {
        speak(language === 'pt' ? `Pesquisando por ${city}` : `Searching for ${city}`);
        onSearch(city);
      } else {
        speak(language === 'pt' ? "Não entendi o nome da cidade." : "I didn't catch the city name.");
      }
    } 
    else if (isReport) {
      if (readOutText) {
        speak(readOutText);
      } else {
        speak(language === 'pt' ? "Nenhum relatório disponível." : "No report available yet.");
      }
    }
    else if (isStop) {
        window.speechSynthesis.cancel();
    }
    else {
        speak(language === 'pt' ? "Desculpe, não entendi." : "Sorry, I didn't understand.");
    }
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'pt' ? 'pt-BR' : 'en-US';
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
      {readOutText && (
          <button
            onClick={toggleSpeaking}
            className={`p-3 rounded-full shadow-lg transition-all transform hover:scale-105 flex items-center justify-center ${
                isSpeaking 
                ? 'bg-indigo-600 text-white animate-pulse ring-4 ring-indigo-200 dark:ring-indigo-900' 
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {isSpeaking ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
          </button>
      )}

      <button
        onClick={toggleListening}
        className={`p-4 rounded-full shadow-lg transition-all transform hover:scale-105 flex items-center justify-center ${
          isListening 
            ? 'bg-red-500 text-white ring-4 ring-red-200 dark:ring-red-900' 
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isListening ? <MicOff className="w-6 h-6 animate-pulse" /> : <Mic className="w-6 h-6" />}
      </button>
      
      {isListening && (
          <div className="absolute right-16 bottom-4 bg-slate-900 dark:bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap animate-fade-in shadow-lg">
              {t.voice.listening}
          </div>
      )}

      {permissionError && (
          <div className="absolute right-16 bottom-4 bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap animate-fade-in flex items-center gap-1 shadow-lg">
              <AlertCircle className="w-3 h-3" /> {t.voice.denied}
          </div>
      )}
    </div>
  );
};

export default VoiceControl;
