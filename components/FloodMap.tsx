
import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Loader2, Droplets, TrendingUp, TrendingDown, Minus, Eye, Sparkles } from 'lucide-react';
import { FloodData, WeatherData } from '../types';
import { fetchWeatherData } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

declare const L: any;

interface FloodMapProps {
  lat: number;
  lon: number;
  floodData?: FloodData | null;
  darkMode?: boolean;
}

const FloodMap: React.FC<FloodMapProps> = ({ lat, lon, floodData, darkMode = false }) => {
  const { t, language } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const radarGroupRef = useRef<any>(null);
  const baseLayerRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  
  const [timestamps, setTimestamps] = useState<number[]>([]);
  const [pastFrameCount, setPastFrameCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      
      const lightUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
      const darkUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

      baseLayerRef.current = L.tileLayer(darkMode ? darkUrl : lightUrl, {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
        crossOrigin: true
      });

      const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles',
        crossOrigin: true
      });

      const terrain = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles',
        crossOrigin: true
      });

      mapInstanceRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        layers: [baseLayerRef.current]
      }).setView([lat, lon], 10);

      // Radar group needs a slightly higher z-index to stay above base maps but below markers
      radarGroupRef.current = L.layerGroup().addTo(mapInstanceRef.current);

      const baseMaps = {
        "Streets": baseLayerRef.current,
        "Satellite": satellite,
        "Terrain": terrain
      };

      const overlayMaps = {
        "Storm Radar": radarGroupRef.current
      };

      L.control.layers(baseMaps, overlayMaps, { position: 'topright' }).addTo(mapInstanceRef.current);
      
      markerRef.current = L.marker([lat, lon]).addTo(mapInstanceRef.current);
      
      mapInstanceRef.current.on('click', async (e: any) => {
        const { lat, lng } = e.latlng;
        
        const popup = L.popup()
          .setLatLng([lat, lng])
          .setContent('<div class="p-2 text-center text-xs font-medium text-slate-500">...</div>')
          .openOn(mapInstanceRef.current);

        try {
          const data: WeatherData = await fetchWeatherData(lat, lng);
          
          const now = new Date();
          const idx = data.hourly.time.findIndex(t => new Date(t) >= now);
          const safeIdx = idx !== -1 ? idx : data.hourly.time.length - 1;

          const temp = data.hourly.temperature_2m ? data.hourly.temperature_2m[safeIdx] : 'N/A';
          const precip = data.hourly.precipitation[safeIdx];
          const prob = data.hourly.precipitation_probability[safeIdx];
          const soil = (data.hourly.soil_moisture_0_to_1cm[safeIdx] || 0) * 100;

          const content = `
            <div class="min-w-[140px]">
              <h4 class="font-bold text-slate-800 text-sm mb-1">${t.map.localConditions}</h4>
              <div class="space-y-1 text-xs">
                <div class="flex justify-between text-slate-600">
                  <span>${t.map.temp}:</span> <span class="font-semibold text-slate-900">${temp}°C</span>
                </div>
                <div class="flex justify-between text-slate-600">
                  <span>${t.map.precip}:</span> <span class="font-semibold text-blue-600">${precip} mm</span>
                </div>
                <div class="flex justify-between text-slate-600">
                  <span>${t.map.prob}:</span> <span class="font-semibold text-blue-600">${prob}%</span>
                </div>
                <div class="flex justify-between text-slate-600">
                  <span>${t.map.soil}:</span> <span class="font-semibold text-amber-700">${soil.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          `;
          
          popup.setContent(content);
        } catch (err) {
          popup.setContent('<div class="p-2 text-red-500 text-xs">Data unavailable</div>');
        }
      });

      fetchRainViewerData();
    } else {
      mapInstanceRef.current.setView([lat, lon], 10);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lon]);
      }
    }

    updateFloodCircle();

    return () => {
      stopAnimation();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lon, floodData, t]);

  useEffect(() => {
    if (baseLayerRef.current) {
        const lightUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
        const darkUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        baseLayerRef.current.setUrl(darkMode ? darkUrl : lightUrl);
    }
  }, [darkMode]);

  const updateFloodCircle = () => {
    if (!mapInstanceRef.current) return;
    if (circleRef.current) {
      mapInstanceRef.current.removeLayer(circleRef.current);
      circleRef.current = null;
    }

    if (!floodData || !floodData.daily || !floodData.daily.river_discharge) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const startIndex = floodData.daily.time.findIndex((t: string) => t >= todayStr);
    
    let maxRatio = 0;
    
    if (startIndex !== -1) {
        for (let i = startIndex; i < Math.min(startIndex + 7, floodData.daily.river_discharge.length); i++) {
            const current = floodData.daily.river_discharge[i];
            const median = floodData.daily.river_discharge_median ? floodData.daily.river_discharge_median[i] : null;
            if (current !== null && median !== null && median > 0) {
                const ratio = current / median;
                if (ratio > maxRatio) maxRatio = ratio;
            }
        }
    }

    let color = '#3b82f6';
    let radius = 3000;
    let fillOpacity = 0.1;
    
    if (maxRatio > 3.0) {
        color = '#dc2626';
        radius = 5000;
        fillOpacity = 0.3;
    } else if (maxRatio > 1.5) {
        color = '#eab308';
        radius = 4000;
        fillOpacity = 0.2;
    }

    if (maxRatio >= 0) {
        circleRef.current = L.circle([lat, lon], {
            color: color,
            fillColor: color,
            fillOpacity: fillOpacity,
            radius: radius,
            weight: 1
        }).addTo(mapInstanceRef.current);
    }
  };

  const fetchRainViewerData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
      const data = await response.json();
      
      if (data.radar && data.radar.past) {
        const past = data.radar.past.map((frame: any) => frame.time);
        const nowcast = data.radar.nowcast ? data.radar.nowcast.map((frame: any) => frame.time) : [];
        const allTimes = [...past, ...nowcast];
        
        setPastFrameCount(past.length);
        setTimestamps(allTimes);
        
        // Default to the last "Past" frame (current time), rather than forecast
        const startIdx = past.length > 0 ? past.length - 1 : allTimes.length - 1;
        setCurrentIndex(startIdx);
        updateRadarLayer(allTimes[startIdx]);
      }
    } catch (error) {
      console.error("Failed to load radar data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateRadarLayer = (ts: number) => {
    if (!mapInstanceRef.current || !radarGroupRef.current) return;
    radarGroupRef.current.clearLayers();
    // Using color scheme 2 (Universal Blue) and smoothing 1_1
    const newLayer = L.tileLayer(`https://tile.rainviewer.com/${ts}/256/{z}/{x}/{y}/2/1_1.png`, {
      opacity: 0.7,
      zIndex: 100,
      crossOrigin: true
    });
    radarGroupRef.current.addLayer(newLayer);
  };

  const startAnimation = () => {
    if (timestamps.length === 0) return;
    setIsPlaying(true);
    
    // If at end, loop back to start
    if (currentIndex === timestamps.length - 1) {
      setCurrentIndex(0);
      updateRadarLayer(timestamps[0]);
    }
    
    animationRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= timestamps.length) {
          updateRadarLayer(timestamps[0]);
          return 0;
        }
        updateRadarLayer(timestamps[next]);
        return next;
      });
    }, 500);
  };

  const stopAnimation = () => {
    setIsPlaying(false);
    if (animationRef.current) {
      clearInterval(animationRef.current);
      animationRef.current = null;
    }
  };

  const togglePlay = () => {
    if (isPlaying) stopAnimation();
    else startAnimation();
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    stopAnimation();
    const idx = parseInt(e.target.value);
    setCurrentIndex(idx);
    updateRadarLayer(timestamps[idx]);
  };

  const formatTime = (ts: number) => {
    return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isForecast = currentIndex >= pastFrameCount;

  const getRiverForecast = () => {
    if (!floodData || !floodData.daily || !floodData.daily.river_discharge) return null;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const startIndex = floodData.daily.time.findIndex((t: string) => t >= todayStr);
    
    if (startIndex === -1) return null;

    const forecast = [];
    const limit = Math.min(startIndex + 5, floodData.daily.time.length);
    
    let locale = 'en-US';
    if (language === 'pt') locale = 'pt-BR';
    else if (language === 'es') locale = 'es-ES';

    for (let i = startIndex; i < limit; i++) {
        const val = floodData.daily.river_discharge[i];
        const median = floodData.daily.river_discharge_median ? floodData.daily.river_discharge_median[i] : 0;
        
        let statusColor = 'text-blue-600';
        if (val !== null && median) {
            if (val > median * 3) statusColor = 'text-red-600';
            else if (val > median * 1.5) statusColor = 'text-yellow-600';
        }

        let trendIcon = <Minus className="w-3 h-3 text-slate-400" />;
        if (i > 0) {
            const prev = floodData.daily.river_discharge[i-1];
            if (val !== null && prev !== null) {
                if (val > prev * 1.05) trendIcon = <TrendingUp className="w-3 h-3 text-red-500" />;
                else if (val < prev * 0.95) trendIcon = <TrendingDown className="w-3 h-3 text-green-500" />;
            }
        }

        const dateObj = new Date(floodData.daily.time[i]);
        const dayLabel = i === startIndex ? t.map.today : i === startIndex + 1 ? t.map.tomorrow : dateObj.toLocaleDateString(locale, {weekday: 'short'});

        forecast.push({ day: dayLabel, value: val, statusColor, trendIcon });
    }
    return forecast;
  };

  const riverForecast = getRiverForecast();

  return (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden relative group h-[400px] transition-colors duration-300">
        <div ref={mapContainerRef} className="h-full w-full z-0 relative bg-slate-50 dark:bg-slate-950" />

        {riverForecast && riverForecast.length > 0 && (
            <div className="absolute top-4 left-4 z-[400] bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-3 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 max-w-[220px]">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Droplets className="w-3 h-3 text-blue-500" /> {t.map.riverLevels}
                </h4>
                <div className="space-y-2 max-h-[160px] overflow-y-auto">
                    {riverForecast.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400 font-medium w-16">{item.day}</span>
                            <div className="flex items-center gap-2">
                                <span className={`font-bold ${item.statusColor}`}>
                                    {item.value?.toFixed(1)} m³/s
                                </span>
                                {item.trendIcon}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950/80 to-transparent z-[400] flex items-center gap-4 text-white">
            <button 
                onClick={togglePlay}
                className="w-10 h-10 flex items-center justify-center bg-white/20 backdrop-blur-md hover:bg-white/30 rounded-full transition-colors shrink-0"
            >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            <div className="flex-1 flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-medium text-white/90 shadow-sm">
                    <span>{timestamps.length > 0 ? formatTime(timestamps[currentIndex]) : '--:--'}</span>
                    
                    <div className="flex items-center gap-1.5">
                      {isForecast ? (
                        <span className="flex items-center gap-1 text-blue-300 bg-blue-900/40 px-2 py-0.5 rounded-full text-[10px] tracking-wide uppercase border border-blue-500/30">
                          <Sparkles className="w-3 h-3" /> {t.chart.forecast}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-300 bg-emerald-900/40 px-2 py-0.5 rounded-full text-[10px] tracking-wide uppercase border border-emerald-500/30">
                          <Eye className="w-3 h-3" /> {t.chart.observed}
                        </span>
                      )}
                      <span className="opacity-60 hidden sm:inline">| STORM RADAR</span>
                    </div>
                </div>
                <input 
                    type="range" 
                    min="0" 
                    max={timestamps.length - 1} 
                    value={currentIndex}
                    onChange={handleSliderChange}
                    className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-white hover:bg-white/30 transition-colors"
                />
            </div>
        </div>
    </div>
  );
};

export default FloodMap;
