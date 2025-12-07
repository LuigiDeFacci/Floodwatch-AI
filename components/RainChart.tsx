
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { WeatherData, ChartDataPoint } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface RainChartProps {
  weather: WeatherData;
  darkMode?: boolean;
}

const RainChart: React.FC<RainChartProps> = ({ weather, darkMode = false }) => {
  const { t, language } = useLanguage();
  const now = new Date();
  
  const data: ChartDataPoint[] = [];
  
  const currentHourIndex = weather.hourly.time.findIndex(t => new Date(t) >= now);
  const pivot = currentHourIndex === -1 ? weather.hourly.time.length - 1 : currentHourIndex;
  
  const startIdx = Math.max(0, pivot - 48);
  const endIdx = Math.min(weather.hourly.time.length, pivot + 168);

  const precipData = weather.hourly.precipitation || [];

  for (let i = startIdx; i < endIdx; i++) {
    const time = new Date(weather.hourly.time[i]);
    const isForecast = i >= pivot;
    
    const label = i === pivot 
        ? t.chart.now 
        : time.getHours() === 12 
            ? time.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'short' })
            : '';

    data.push({
      time: label,
      fullTime: time.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US'),
      precipitation: precipData[i] || 0,
      isForecast
    });
  }

  const tickFill = darkMode ? '#cbd5e1' : '#64748b';

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 shadow-lg rounded-lg text-sm transition-colors duration-300">
          <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">{payload[0].payload.fullTime}</p>
          <p className="text-blue-600 dark:text-blue-400 font-medium">
            {t.map.precip}: {payload[0].value.toFixed(1)} mm
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase mt-1">
            {payload[0].payload.isForecast ? t.chart.forecast : t.chart.observed}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full mt-4">
      <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.chart.title}</h4>
          <span className="text-xs text-slate-400">mm / h</span>
      </div>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap={1} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <XAxis 
              dataKey="time" 
              tick={{fontSize: 10, fill: tickFill}} 
              interval={0} 
              axisLine={{ stroke: 'none' }}
              tickLine={false}
            />
            <YAxis 
              tick={{fontSize: 10, fill: tickFill}} 
              axisLine={{ stroke: 'none' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{fill: darkMode ? '#1e293b' : '#f8fafc'}} />
            <ReferenceLine x={t.chart.now} stroke="#3b82f6" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Bar dataKey="precipitation" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.isForecast ? '#60a5fa' : (darkMode ? '#475569' : '#94a3b8')} 
                  fillOpacity={entry.isForecast ? 1 : 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-center gap-6 mt-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-slate-400 dark:bg-slate-600 opacity-40 rounded-sm"></span> {t.chart.past48}
        </div>
        <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-400 rounded-sm"></span> {t.chart.next7d}
        </div>
      </div>
    </div>
  );
};

export default RainChart;
