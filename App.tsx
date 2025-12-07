
import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, CloudRain, AlertTriangle, ShieldCheck, Info, Camera, Download, Waves, Droplets, Moon, Sun, Heart, Globe } from 'lucide-react';
import { GeoLocation, WeatherData, RiskAnalysis, FloodData } from './types';
import { geocodeLocation, fetchWeatherData, searchCities, fetchFloodData } from './services/api';
import { calculateFloodRisk } from './services/riskModel';
import RiskGauge from './components/RiskGauge';
import RainChart from './components/RainChart';
import InfoCard from './components/InfoCard';
import Checklist from './components/Checklist';
import FloodMap from './components/FloodMap';
import AIReport from './components/AIReport';
import EmergencyFinder from './components/EmergencyFinder';
import VoiceControl from './components/VoiceControl';
import FloodVision from './components/FloodVision';
import AboutModal from './components/AboutModal';
import { useLanguage } from './contexts/LanguageContext';

const App: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [darkMode, setDarkMode] = useState(false);
  
  const [suggestions, setSuggestions] = useState<GeoLocation[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  const [result, setResult] = useState<{
    location: GeoLocation;
    weather: WeatherData;
    risk: RiskAnalysis;
    flood: FloodData | null;
  } | null>(null);

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'pt' : 'en');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCity = params.get('city');
    const urlCountry = params.get('country');

    if (urlCity) {
      setCity(urlCity);
      if (urlCountry) setCountry(urlCountry);
      performSearch(urlCity, urlCountry || undefined);
    }
  }, []);

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCity(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length >= 2) {
      setShowSuggestions(true);
      searchTimeoutRef.current = setTimeout(async () => {
        const results = await searchCities(value, language);
        setSuggestions(results);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (location: GeoLocation) => {
    setCity(location.name);
    setCountry(location.country);
    setShowSuggestions(false);
  };

  const performSearch = async (searchCity: string, searchCountry?: string) => {
    if (!searchCity.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setShowSuggestions(false);

    try {
      const location = await geocodeLocation(searchCity, searchCountry, language);
      
      if (!location) {
        throw new Error(`${t.search.errorGeocode} "${searchCity}"${searchCountry ? ` in ${searchCountry}` : ''}.`);
      }

      try {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('city', location.name);
        newUrl.searchParams.set('country', location.country);
        window.history.pushState({}, '', newUrl.toString());
      } catch (e) {
        console.debug('URL update skipped (environment restriction):', e);
      }

      setCity(location.name);
      setCountry(location.country);

      const [weather, flood] = await Promise.all([
        fetchWeatherData(location.latitude, location.longitude),
        fetchFloodData(location.latitude, location.longitude)
      ]);

      // Calculate risk with current language
      const risk = calculateFloodRisk(weather, flood, language);

      setResult({ location, weather, risk, flood });
    } catch (err: any) {
      setError(err.message || t.search.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  // Re-calculate risk when language changes if result exists
  useEffect(() => {
    if (result) {
        const newRisk = calculateFloodRisk(result.weather, result.flood, language);
        setResult({ ...result, risk: newRisk });
    }
  }, [language]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(city, country);
  };

  const handleShareSnapshot = async () => {
    if (!resultsRef.current || isSharing || !result) return;
    setIsSharing(true);
    
    try {
      if (!(window as any).html2canvas) {
        throw new Error("Snapshot library not loaded.");
      }

      const canvas = await (window as any).html2canvas(resultsRef.current, {
        scale: 2,
        backgroundColor: darkMode ? '#0f172a' : '#f8fafc',
        logging: false,
        useCORS: true 
      });

      canvas.toBlob(async (blob: Blob | null) => {
        if (!blob) {
            setIsSharing(false);
            return;
        }
        
        const fileName = `flood-risk-${result.location.name.replace(/\s+/g, '-')}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: `Flood Risk: ${result.location.name}`,
              text: `Current flood risk analysis for ${result.location.name}. Score: ${result.risk.score}/100`,
              files: [file]
            });
          } catch (e) {
             console.log("Share cancelled or failed", e);
          }
        } else {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        setIsSharing(false);
      }, 'image/png');
      
    } catch (e) {
      console.error("Snapshot failed:", e);
      setIsSharing(false);
      alert("Could not generate snapshot.");
    }
  };

  const getReadOutText = () => {
      if (!result) return undefined;
      const { risk, location } = result;
      // Simple dynamic construction based on localized risk level
      const intro = language === 'pt' 
        ? `Relatório para ${location.name}. O risco de enchente é ${risk.level}, com pontuação ${risk.score} de 100.`
        : `Report for ${location.name}. The flood risk is ${risk.level}, with a score of ${risk.score} out of 100.`;
      
      return intro;
  };

  return (
    <div className={`min-h-screen pb-12 transition-colors duration-300 ${darkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{t.header.title} <span className="text-blue-600 dark:text-blue-400">{t.header.live}</span></h1>
          </div>
          <div className="flex items-center gap-3">
             <button
               onClick={() => setShowAbout(true)}
               className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-full transition-colors"
             >
              <Heart className="w-3 h-3 text-red-500" />
              <span className="hidden sm:inline">{t.header.mission}</span>
              <span className="sm:hidden">{t.header.about}</span>
            </button>
            <button 
              onClick={toggleLanguage}
              className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 font-bold text-xs"
              title="Switch Language"
            >
              <Globe className="w-4 h-4" />
              {language.toUpperCase()}
            </button>
            <button 
              onClick={toggleDarkMode}
              className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        
        {/* Search Section */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-8 transition-colors duration-300" ref={dropdownRef}>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">{t.search.title}</h2>
          <form onSubmit={handleFormSubmit} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder={t.search.cityPlaceholder}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                value={city}
                onChange={handleCityChange}
                onFocus={() => city.trim().length >= 2 && setShowSuggestions(true)}
                autoComplete="off"
              />
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 dark:text-slate-500" />
              
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 w-full bg-white dark:bg-slate-900 mt-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl max-h-60 overflow-y-auto animate-fade-in">
                  {suggestions.map((loc) => (
                    <li 
                      key={loc.id}
                      onClick={() => handleSelectSuggestion(loc)}
                      className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0 flex items-center justify-between transition-colors"
                    >
                      <div>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{loc.name}</span>
                        <span className="text-slate-400 dark:text-slate-500 text-sm ml-2">
                          {loc.admin1 ? `${loc.admin1}, ` : ''}{loc.country}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="w-full md:w-1/3">
               <input
                type="text"
                placeholder={t.search.countryPlaceholder}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:text-white outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium py-3 px-8 rounded-xl transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {t.search.analyzing}
                </>
              ) : (
                t.search.button
              )}
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-6 py-4 rounded-xl mb-8 flex items-center gap-3 animate-fade-in">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="animate-fade-in-up space-y-6">
            
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <MapPin className="w-4 h-4" />
                    <span>{t.results.resolved} <strong className="text-slate-900 dark:text-slate-200">{result.location.name}</strong>, {result.location.admin1 && `${result.location.admin1}, `}{result.location.country}</span>
                </div>
                <button 
                  onClick={handleShareSnapshot}
                  disabled={isSharing}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-3 py-1.5 rounded-full transition-colors shadow-sm disabled:opacity-70"
                >
                  {isSharing ? (
                      <>
                        <div className="w-3 h-3 border-2 border-slate-500 dark:border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                        {t.results.generating}
                      </>
                  ) : (
                      <>
                        <Camera className="w-3 h-3" /> {t.results.snapshot}
                      </>
                  )}
                </button>
            </div>
            
            <div ref={resultsRef} className="space-y-6 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 p-1">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <RiskGauge score={result.risk.score} level={result.risk.level} />
                  
                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <InfoCard 
                          title={t.cards.soil}
                          value={`${(result.risk.currentSoilSaturation * 100).toFixed(0)}%`}
                          subtext={t.cards.soilSub}
                          icon={<Waves className="w-6 h-6" />}
                          alert={result.risk.currentSoilSaturation > 0.4}
                      />
                      
                      {result.risk.riverDischargeCurrent !== null ? (
                        <InfoCard 
                            title={t.cards.river}
                            value={`${result.risk.riverDischargeCurrent.toFixed(1)} m³/s`}
                            subtext={result.risk.riverDischargeMedian ? `${t.cards.riverNormal} ${result.risk.riverDischargeMedian.toFixed(1)} m³/s` : t.cards.riverMonitor}
                            icon={<Droplets className="w-6 h-6" />}
                            alert={result.risk.riverDischargeMedian ? result.risk.riverDischargeCurrent > result.risk.riverDischargeMedian * 1.5 : false}
                        />
                      ) : (
                        <InfoCard 
                            title={t.cards.forecast24}
                            value={`${result.risk.forecastPrecip24h.toFixed(1)} mm`}
                            subtext={`${t.cards.prob} ${result.risk.maxPrecipProb}%`}
                            icon={<CloudRain className="w-6 h-6" />}
                            alert={result.risk.forecastPrecip24h > 20}
                        />
                      )}
                      
                      <div className="sm:col-span-2">
                        <AIReport location={result.location} risk={result.risk} />
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-5">
                          <h3 className="text-blue-900 dark:text-blue-300 font-semibold mb-2 flex items-center gap-2">
                              <Info className="w-4 h-4" /> {t.cards.summary}
                          </h3>
                          <ul className="space-y-1">
                              {result.risk.factors.slice(0,3).map((factor, idx) => (
                                  <li key={idx} className="text-blue-800 dark:text-blue-200 text-sm flex items-start gap-2">
                                      <span className="mt-1.5 w-1.5 h-1.5 bg-blue-400 dark:bg-blue-500 rounded-full shrink-0"></span>
                                      {factor}
                                  </li>
                              ))}
                          </ul>
                      </div>

                      <EmergencyFinder locationName={`${result.location.name}, ${result.location.country}`} />
                      
                  </div>
                </div>

                <FloodMap 
                  lat={result.location.latitude} 
                  lon={result.location.longitude} 
                  floodData={result.flood}
                  darkMode={darkMode}
                />

                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors duration-300">
                    <RainChart weather={result.weather} darkMode={darkMode} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FloodVision />
                  <Checklist 
                    items={result.risk.recommendations} 
                    locationName={`${result.location.name}-${result.location.country}`} 
                  />
                </div>
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-4xl mx-auto px-4 mt-12 mb-8 text-center text-slate-400 dark:text-slate-600 text-xs">
        <p>Data provided by Open-Meteo API. Map tiles by RainViewer & OSM. This tool provides estimates based on heuristics.</p>
        <p className="mt-2">&copy; {new Date().getFullYear()} FloodWatch Live</p>
      </footer>
      
      <VoiceControl onSearch={performSearch} readOutText={getReadOutText()} />
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </div>
  );
};

export default App;
