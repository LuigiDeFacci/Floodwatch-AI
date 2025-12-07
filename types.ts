
export type Language = 'en' | 'pt';

export interface GeoLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string; // Region/State
  timezone?: string;
}

export interface WeatherData {
  current_weather?: {
    time: string;
    temperature: number;
    weathercode: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[]; // mm (rain + showers + snow)
    precipitation_probability: number[]; // %
    soil_moisture_0_to_1cm: number[]; // Volumetric % (0-1)
    soil_moisture_1_to_3cm: number[]; // Volumetric % (0-1)
  };
  hourly_units: {
    precipitation: string;
  };
}

export interface FloodData {
  daily: {
    time: string[];
    river_discharge: (number | null)[]; // m³/s
    river_discharge_mean: (number | null)[];
    river_discharge_median: (number | null)[]; // Historical baseline
  };
  daily_units: {
    river_discharge: string;
  };
}

export enum RiskLevel {
  LOW = 'Low',
  MODERATE = 'Moderate',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export interface RiskAnalysis {
  score: number; // 0-100
  level: RiskLevel;
  recentPrecipTotal: number; // last 7 days mm
  forecastPrecip24h: number; // next 24h mm
  forecastPrecip72h: number; // next 72h mm
  forecastPrecip7d: number; // next 7 days mm
  maxPrecipProb: number; // %
  currentSoilSaturation: number; // m3/m3 (0.0 to ~0.5)
  riverDischargeCurrent: number | null; // m³/s
  riverDischargeMedian: number | null; // m³/s
  factors: string[];
  recommendations: string[];
}

export interface ChartDataPoint {
  time: string;
  fullTime: string;
  precipitation: number;
  isForecast: boolean;
}
