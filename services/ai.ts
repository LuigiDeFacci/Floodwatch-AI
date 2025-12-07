
import { GoogleGenAI } from "@google/genai";
import { RiskAnalysis, GeoLocation, Language } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateAIReport = async (
  location: GeoLocation,
  risk: RiskAnalysis,
  lang: Language = 'en'
): Promise<string> => {
  const languageInstruction = lang === 'pt' 
    ? "OUTPUT LANGUAGE: PORTUGUESE (PT-BR). Answer strictly in Portuguese." 
    : "OUTPUT LANGUAGE: ENGLISH. Answer strictly in English.";

  const prompt = `
    You are an expert hydrologist and emergency response coordinator. 
    Analyze the current flood risk for ${location.name}, ${location.country} based on the following real-time telemetry:

    DATA SNAPSHOT:
    - Overall Risk Score: ${risk.score}/100 (${risk.level})
    - Soil Saturation: ${(risk.currentSoilSaturation * 100).toFixed(0)}% (Volumetric Water Content 0-10cm)
    - River Discharge: ${risk.riverDischargeCurrent ? risk.riverDischargeCurrent.toFixed(1) + ' m³/s' : 'No gauge data'}
    - Historical River Median: ${risk.riverDischargeMedian ? risk.riverDischargeMedian.toFixed(1) + ' m³/s' : 'N/A'}
    - Forecast Rain (Next 24h): ${risk.forecastPrecip24h.toFixed(1)}mm
    - Forecast Rain (Next 7 days): ${risk.forecastPrecip7d.toFixed(1)}mm
    - Recent Rain (Last 7 days): ${risk.recentPrecipTotal.toFixed(1)}mm
    
    ${languageInstruction}

    TASK:
    Provide a concise, professional assessment (max 3 sentences).
    1. Explain the *interaction* between these factors.
    2. Provide one specific, high-impact safety recommendation.
    
    TONE:
    Calm, authoritative, precise. Avoid alarmism but be clear about danger.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Analysis currently unavailable.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Unable to connect to AI analysis service.");
  }
};

export const findEmergencyResources = async (locationString: string, lang: Language = 'en') => {
  const languageInstruction = lang === 'pt' ? "in Portuguese" : "in English";
  const prompt = `Find 3 major hospitals, emergency rooms, or designated evacuation shelters in or near ${locationString}. List them with a very brief description of what they are ${languageInstruction}.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      }
    });

    return {
      text: response.text,
      groundingMetadata: response.candidates?.[0]?.groundingMetadata
    };
  } catch (error) {
    console.error("Gemini Maps Error:", error);
    throw new Error("Unable to locate emergency resources.");
  }
};

export const analyzeFloodImage = async (base64Image: string, mimeType: string, lang: Language = 'en'): Promise<string> => {
  const languageInstruction = lang === 'pt' 
  ? "Translate your response to PORTUGUESE (PT-BR). Format: **VEREDITO:** [PERIGO / ALERTA / SEGURO], **OBSERVAÇÃO:**, **CONSELHO:**" 
  : "Format: **VERDICT:** [DANGER / WARNING / SAFE], **OBSERVATION:**, **ADVICE:**";

  const prompt = `
    Analyze this image for flood hazards and water safety.
    
    LOOK FOR:
    - Standing or moving water depth (look for submerged tires, signs, trees).
    - Water turbulence or current speed.
    - Debris, blocked roads, or infrastructure damage.
    - Sky conditions indicating incoming storms.

    TASK:
    Provide a safety assessment in this EXACT format.
    ${languageInstruction}

    Keep it under 50 words total. Be conservative about safety.
  `;

  try {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      }
    });

    return response.text || "Could not analyze image.";
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    throw new Error("Image analysis failed. Please try again.");
  }
};
