
import { GeoLocation, WeatherData, FloodData } from '../types';

/**
 * OPEN-METEO API INTEGRATION SERVICE
 */

const GEO_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API_URL = 'https://api.open-meteo.com/v1/forecast';
const FLOOD_API_URL = 'https://flood-api.open-meteo.com/v1/flood';

export const searchCities = async (query: string, lang: string = 'en'): Promise<GeoLocation[]> => {
  if (!query || query.trim().length < 2) return [];

  // Open-Meteo supports language param (en, pt, de, etc)
  const url = `${GEO_API_URL}?name=${encodeURIComponent(query.trim())}&count=5&language=${lang}&format=json`;
  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("City search error:", error);
    return [];
  }
};

export const geocodeLocation = async (cityInput: string, countryInput?: string, lang: string = 'en'): Promise<GeoLocation | null> => {
  try {
    let searchCity = cityInput.trim();
    let searchCountry = countryInput?.trim();

    if (!searchCountry && searchCity.includes(',')) {
      const parts = searchCity.split(',');
      if (parts.length >= 2) {
        searchCity = parts[0].trim();
        searchCountry = parts[parts.length - 1].trim();
      }
    }

    const url = `${GEO_API_URL}?name=${encodeURIComponent(searchCity)}&count=10&language=${lang}&format=json`;
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Geocoding service unavailable (Status: ${response.status})`);
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return null;
    }
    
    const results = data.results as GeoLocation[];

    if (searchCountry) {
      const normalizedSearchCountry = searchCountry.toLowerCase();
      
      const bestMatch = results.find(loc => 
        loc.country && loc.country.toLowerCase().includes(normalizedSearchCountry)
      );
      
      if (bestMatch) {
        return bestMatch;
      }
    }
    
    return results[0];

  } catch (error) {
    console.error("Geocoding error:", error);
    throw error;
  }
};

export const fetchWeatherData = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    const url = `${WEATHER_API_URL}?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,precipitation,precipitation_probability,soil_moisture_0_to_1cm,soil_moisture_1_to_3cm&past_days=7&forecast_days=7&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather data service unavailable');
    
    return await response.json();
  } catch (error) {
    console.error("Weather fetch error:", error);
    throw error;
  }
};

export const fetchFloodData = async (lat: number, lon: number): Promise<FloodData | null> => {
  try {
    const url = `${FLOOD_API_URL}?latitude=${lat}&longitude=${lon}&daily=river_discharge,river_discharge_median&past_days=3&forecast_days=7`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.daily || !data.daily.river_discharge) return null;
    return data;
  } catch (error) {
    console.warn("Flood data fetch warning:", error);
    return null;
  }
};
