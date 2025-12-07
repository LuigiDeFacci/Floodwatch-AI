# 🌊 FLOODWATCH LIVE

**Real-time Flood Risk Estimation & AI Safety Assistant**

> *Built with Google Gemini 2.5 Flash, Open-Meteo, and React.*

## 🚨 The Mission
**FloodWatch Live** was born out of the devastating reality of the **Rio Grande do Sul floods in May 2024**. We witnessed how quickly water can rise and how difficult it is for the average person to interpret complex hydrological reports during a crisis.

Our goal is to **democratize flood safety**. We aggregate complex satellite, river, and soil data into a simple **0-100 Risk Score**, helping communities prepare before it's too late.

## ✨ Key Features

### 🧠 1. Heuristic Risk Engine
Unlike standard weather apps that only show rain probability, our custom algorithm analyzes the **interaction** between variables:
*   **Soil Saturation:** Is the ground already full?
*   **River Discharge:** Is the river overflowing upstream ("Blue Sky Floods")?
*   **Accumulation:** How much rain fell in the last 7 days?

### 👁️ 2. Flood Vision AI (Multimodal)
Users can upload photos of rising waters, puddles, or streets. **Gemini 2.5 Flash** analyzes the image for physical hazards (turbulence, depth markers, debris) and provides an instant safety verdict.

### 🤖 3. AI Hydrologist
We use **Gemini 2.5 Flash** to reason about the raw data. It generates a natural language report explaining *why* the risk is high (e.g., "High soil moisture means even light rain will cause runoff").

### 🏥 4. Emergency Finder (Maps Grounding)
Using Gemini's **Google Maps Tool**, the app locates real, verifiable hospitals and shelters near the user's location.

### 🗺️ 5. Live Storm & River Map
*   **RainViewer Radar:** Animated past/future storm movement.
*   **GloFAS River Data:** 5-day river discharge forecasts overlaid on the map.
*   **Dynamic Visuals:** Visualizes risk zones based on real-time hydrological anomalies.

### 🗣️ 6. Accessibility First
*   **Voice Control:** Full Speech-to-Text search and Text-to-Speech reporting.
*   **Dark Mode:** High-contrast mode for low-light environments.
*   **Snapshots:** Shareable images for non-tech-savvy relatives.

---

## 🛠️ Technology Stack

*   **Frontend:** React 19, Tailwind CSS, Lucide Icons
*   **AI Models:** Google Gemini 2.5 Flash (Text & Vision) via `@google/genai`
*   **Data APIs:**
    *   *Open-Meteo* (Weather, Geocoding, Flood API)
    *   *RainViewer* (Satellite/Radar Tiles)
*   **Visualization:** Recharts (Data), Leaflet (Maps)
*   **Build:** Vite / AI Studio

---

## 🚀 Getting Started

1.  **Clone the repository**
2.  **Install dependencies**
    ```bash
    npm install
    ```
3.  **Set up API Key**
    Create a `.env` file and add your Gemini API key:
    ```
    API_KEY=your_google_ai_studio_key
    ```
4.  **Run Locally**
    ```bash
    npm start
    ```

---

## 🏆 Hackathon Tracks

**Impact:** Solves a critical climate adaptation challenge.
**Technical Depth:** Implements a complex heuristic model + Multimodal AI + Tool Use.
**Creativity:** "Flood Vision" and "River Anomaly" detection features.

---

*Dedicated to the resilience of the people of Rio Grande do Sul.*