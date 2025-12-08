
import { WeatherData, RiskAnalysis, RiskLevel, FloodData, Language } from '../types';

/**
 * CORE RISK HEURISTIC MODEL
 * 
 * Uses a weighted scoring system to determine flood risk (0-100).
 * 
 * Factors:
 * 1. Soil Saturation (35%): Saturated ground cannot absorb water, leading to runoff.
 * 2. Recent Rainfall (10%): History of rain implies ground softening and river swelling.
 * 3. Immediate Forecast (45%): Heavy rain in next 24h is the biggest driver of flash floods.
 * 4. Extended Forecast (10%): 3-7 day outlook implies long-term accumulation risks.
 * 5. River Anomalies (+Bonus): If river discharge is >1.5x median, risk is manually escalated.
 * 
 * "Blue Sky Flood" Logic:
 * If it's sunny (Precip < 5mm) but rivers are CRITICAL (>4x median), force HIGH risk.
 */
export const calculateFloodRisk = (weather: WeatherData, flood: FloodData | null, lang: Language = 'en'): RiskAnalysis => {
  const now = new Date();
  // Find index where time >= now. If not found (e.g. data ends before now), safe fallback.
  const currentHourIndex = weather.hourly.time.findIndex(t => new Date(t) >= now);
  
  // Robust Pivot: If now is outside range, clamp to nearest valid index to avoid crash
  let pivot = currentHourIndex;
  
  if (pivot === -1) {
      if (weather.hourly.time.length > 0) {
          // If all times are in past, use last index
          pivot = weather.hourly.time.length - 1;
      } else {
          // Empty data fallback
          pivot = 0;
      }
  }

  // Look back 7 days (168 hours)
  const pastStartIndex = Math.max(0, pivot - 168);
  const precipData = weather.hourly.precipitation || [];
  const pastPrecip = precipData.slice(pastStartIndex, pivot);
  
  // Soil moisture avg of top 2 layers
  const soil0 = weather.hourly.soil_moisture_0_to_1cm || [];
  const soil1 = weather.hourly.soil_moisture_1_to_3cm || [];
  
  const soilIndex = Math.min(pivot, soil0.length - 1);
  const currentSoilSaturation = ((soil0[soilIndex] || 0) + (soil1[soilIndex] || 0)) / 2;

  // Forecast slices
  const next24hPrecip = precipData.slice(pivot, pivot + 24);
  const next72hPrecip = precipData.slice(pivot, pivot + 72);
  const next7dPrecip = precipData.slice(pivot, pivot + 168);
  const next72hProb = weather.hourly.precipitation_probability.slice(pivot, pivot + 72);

  // Totals
  const recentPrecipTotal = pastPrecip.reduce((a, b) => a + (b || 0), 0);
  const forecastPrecip24h = next24hPrecip.reduce((a, b) => a + (b || 0), 0);
  const forecastPrecip72h = next72hPrecip.reduce((a, b) => a + (b || 0), 0);
  const forecastPrecip7d = next7dPrecip.reduce((a, b) => a + (b || 0), 0);
  const maxHourlyIntensity = Math.max(...next72hPrecip);
  const maxPrecipProb = Math.max(...next72hProb);

  // River Analysis
  let riverDischargeCurrent: number | null = null;
  let riverDischargeMedian: number | null = null;
  let riverAnomalyScore = 0;

  if (flood && flood.daily && flood.daily.river_discharge) {
      const todayStr = now.toISOString().split('T')[0];
      const floodIndex = flood.daily.time.findIndex(t => t.startsWith(todayStr));
      const idx = floodIndex !== -1 ? floodIndex : 0;

      const current = flood.daily.river_discharge[idx];
      const median = flood.daily.river_discharge_median ? flood.daily.river_discharge_median[idx] : null;

      if (current !== null) {
          riverDischargeCurrent = current;
          if (median !== null && median > 0) {
              riverDischargeMedian = median;
              const ratio = current / median;
              if (ratio > 4.0) riverAnomalyScore = 30; // Critical upstream flow
              else if (ratio > 2.0) riverAnomalyScore = 20; // Elevated
              else if (ratio > 1.3) riverAnomalyScore = 10; // Slightly high
          }
      }
  }

  // --- SCORING LOGIC ---
  let rawScore = 0;
  const factors: string[] = [];

  // 1. Soil Factor (0-25 points)
  // 0.45 m3/m3 is roughly saturation point for many soils
  const soilScore = (currentSoilSaturation / 0.45) * 25;
  const rainHistoryScore = Math.min(recentPrecipTotal, 100) * 0.1; // Max 10 pts from past rain
  rawScore += soilScore + rainHistoryScore;

  // Localized Strings for Factors
  let txt;
  if (lang === 'pt') {
    txt = {
      saturated: `Solo fortemente saturado (${(currentSoilSaturation * 100).toFixed(0)}% vol).`,
      heavyRainPast: `Chuva recente intensa (${recentPrecipTotal.toFixed(1)}mm).`,
      heavyRain24h: `Previsão de chuva forte em 24h (${forecastPrecip24h.toFixed(1)}mm).`,
      rain7d: `Chuva significativa prevista para 7 dias (${forecastPrecip7d.toFixed(0)}mm).`,
      riverHigh: `Níveis do rio acima da mediana histórica (${riverDischargeCurrent?.toFixed(1)} m³/s).`,
      intense: "Previsão inclui períodos de chuva torrencial.",
      blueSky: "Aviso: Nível do rio alto apesar de tempo limpo (fluxo de montante).",
      lowProb: "Precipitação prevista mas com baixa probabilidade.",
      stable: "Condições parecem estáveis."
    };
  } else if (lang === 'es') {
    txt = {
      saturated: `Suelo fuertemente saturado (${(currentSoilSaturation * 100).toFixed(0)}% vol).`,
      heavyRainPast: `Lluvia reciente intensa (${recentPrecipTotal.toFixed(1)}mm).`,
      heavyRain24h: `Previsión de lluvia fuerte en 24h (${forecastPrecip24h.toFixed(1)}mm).`,
      rain7d: `Lluvia significativa prevista para 7 días (${forecastPrecip7d.toFixed(0)}mm).`,
      riverHigh: `Niveles del río por encima de la mediana histórica (${riverDischargeCurrent?.toFixed(1)} m³/s).`,
      intense: "La previsión incluye períodos de lluvia torrencial.",
      blueSky: "Aviso: Nivel del río alto a pesar de tiempo despejado (flujo de montaña).",
      lowProb: "Precipitación prevista pero con baja probabilidad.",
      stable: "Las condiciones parecen estables."
    };
  } else {
    txt = {
      saturated: `Ground is heavily saturated (${(currentSoilSaturation * 100).toFixed(0)}% vol).`,
      heavyRainPast: `High recent rainfall (${recentPrecipTotal.toFixed(1)}mm).`,
      heavyRain24h: `Heavy precipitation forecast next 24h (${forecastPrecip24h.toFixed(1)}mm).`,
      rain7d: `Significant rainfall predicted over next 7 days (${forecastPrecip7d.toFixed(0)}mm).`,
      riverHigh: `River levels are above historical median (${riverDischargeCurrent?.toFixed(1)} m³/s).`,
      intense: "Prediction includes periods of intense downpour.",
      blueSky: "Warning: River levels are high despite clear weather (upstream flow).",
      lowProb: "Precipitation is predicted but probability is low.",
      stable: "Conditions appear stable."
    };
  }

  if (currentSoilSaturation > 0.4) factors.push(txt.saturated);
  else if (recentPrecipTotal > 50) factors.push(txt.heavyRainPast);

  // 2. Immediate Threat (0-45 points)
  // Cap at 100mm/24h for max score
  const immediateThreatScore = Math.min(forecastPrecip24h * 2, 100) * 0.45;
  rawScore += immediateThreatScore;
  if (forecastPrecip24h > 20) factors.push(txt.heavyRain24h);

  // 3. Extended Threat (0-20 points)
  const extendedThreatScore = Math.min(forecastPrecip72h, 100) * 0.2;
  rawScore += extendedThreatScore;
  
  if (forecastPrecip7d > 100) {
      rawScore += 5; 
      factors.push(txt.rain7d);
  }

  // 4. River Anomaly Bonus
  if (riverAnomalyScore > 0) {
      rawScore += riverAnomalyScore;
      factors.push(txt.riverHigh);
  }

  // 5. Intensity Penalty
  if (maxHourlyIntensity > 10) {
    rawScore += 10;
    factors.push(txt.intense);
  }

  // 6. Blue Sky Flood Override
  // If it's not raining locally (<5mm) but river is critical (>20 score), force alert.
  if (forecastPrecip24h < 5 && riverAnomalyScore >= 20) {
      factors.push(txt.blueSky);
      rawScore = Math.max(rawScore, 60);
  }

  // 7. Probability Dampener
  // If probability is low (<30%) and no river threat, reduce score.
  if (maxPrecipProb < 30 && forecastPrecip24h > 0 && riverAnomalyScore === 0) {
    rawScore *= 0.6;
    factors.push(txt.lowProb);
  }

  const finalScore = Math.min(Math.max(Math.round(rawScore), 0), 100);

  let level = RiskLevel.LOW;
  let recommendations: string[] = [];

  // Localized Recommendations
  let recs;
  if (lang === 'pt') {
    recs = {
      low: [
        "Acompanhe as atualizações meteorológicas locais.",
        "Certifique-se que calhas e ralos estão limpos.",
        "Nenhuma preparação imediata necessária."
      ],
      moderate: [
        "Fique atento às mudanças nas condições do tempo.",
        "Evite áreas baixas se a chuva forte começar.",
        "Verifique kits de emergência e lanternas.",
        "Mova itens externos valiosos para áreas cobertas."
      ],
      high: [
        "Prepare-se para possível acúmulo de água.",
        "Mova veículos para terrenos mais altos.",
        "Proteja entradas com sacos de areia, se aplicável.",
        "Carregue dispositivos móveis e baterias.",
        "Revise seu plano de evacuação."
      ],
      critical: [
        "AÇÃO IMEDIATA: Siga as ordens das autoridades locais.",
        "Evacue imediatamente se instruído.",
        "Não caminhe ou dirija em áreas alagadas.",
        "Mova itens essenciais e animais para o andar mais alto.",
        "Desligue gás, eletricidade e água se a água entrar."
      ]
    };
  } else if (lang === 'es') {
    recs = {
      low: [
        "Siga las actualizaciones meteorológicas locales.",
        "Asegúrese de que canaletas y desagües estén limpios.",
        "No se requiere preparación inmediata."
      ],
      moderate: [
        "Manténgase informado sobre los cambios en el clima.",
        "Evite áreas bajas si comienza a llover fuerte.",
        "Verifique kits de emergencia y linternas.",
        "Mueva objetos de valor exteriores a áreas cubiertas."
      ],
      high: [
        "Prepárese para posible acumulación de agua.",
        "Mueva vehículos a terrenos más altos.",
        "Proteja entradas con sacos de arena si es posible.",
        "Cargue dispositivos móviles y baterías.",
        "Revise su plan de evacuación."
      ],
      critical: [
        "ACCIÓN INMEDIATA: Siga las órdenes de las autoridades.",
        "Evacue inmediatamente si se le indica.",
        "No camine ni conduzca por áreas inundadas.",
        "Mueva artículos esenciales y mascotas al piso más alto.",
        "Cierre gas, electricidad y agua si entra agua."
      ]
    };
  } else {
    recs = {
      low: [
        "Monitor local weather updates.",
        "Ensure gutters and drains are clear of debris.",
        "No immediate flood preparation required."
      ],
      moderate: [
        "Stay informed about changing weather conditions.",
        "Avoid low-lying areas if heavy rain starts.",
        "Check emergency kits and flashlights.",
        "Move valuable outdoor items to covered areas."
      ],
      high: [
        "Prepare for potential water accumulation.",
        "Move vehicles to higher ground.",
        "Protect entrances with sandbags if applicable.",
        "Charge mobile devices and battery packs.",
        "Review your evacuation plan."
      ],
      critical: [
        "IMMEDIATE ACTION: Follow all local authority orders.",
        "Evacuate immediately if instructed.",
        "Do not walk or drive through flood waters.",
        "Move essential items and pets to the highest floor.",
        "Turn off gas, electricity, and water if water enters."
      ]
    };
  }

  if (finalScore <= 25) {
    level = RiskLevel.LOW;
    recommendations = recs.low;
  } else if (finalScore <= 50) {
    level = RiskLevel.MODERATE;
    recommendations = recs.moderate;
  } else if (finalScore <= 75) {
    level = RiskLevel.HIGH;
    recommendations = recs.high;
  } else {
    level = RiskLevel.CRITICAL;
    recommendations = recs.critical;
  }

  if (factors.length === 0) factors.push(txt.stable);

  return {
    score: finalScore,
    level,
    recentPrecipTotal,
    forecastPrecip24h,
    forecastPrecip72h,
    forecastPrecip7d,
    maxPrecipProb,
    currentSoilSaturation,
    riverDischargeCurrent,
    riverDischargeMedian,
    factors,
    recommendations
  };
};