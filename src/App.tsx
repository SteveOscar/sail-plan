// App.tsx
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

// Import OpenAI SDK for compatibility with xAI API
import OpenAI from 'openai';

// Define environment variables (set these in your .env file)
// Example: VITE_OPENWEATHER_API_KEY=your_openweather_key
// VITE_XAI_API_KEY=your_xai_api_key
const OPENWEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '';
const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY || '';

// Interface for form inputs
interface SailPlanInputs {
  city: string;
  state: string;
  country: string;
  boatModel: string;
  availableSails: string;
}

// Interface for geocode response (simplified)
interface Geocode {
  lat: number;
  lon: number;
}

// Interface for forecast list item (simplified for wind)
interface ForecastItem {
  dt_txt: string;
  wind: {
    speed: number;
    deg: number;
  };
}

// Interface for forecast response
interface ForecastResponse {
  list: ForecastItem[];
}

const App: React.FC = () => {
  const [inputs, setInputs] = useState<SailPlanInputs>({
    city: '',
    state: '',
    country: '',
    boatModel: '',
    availableSails: '',
  });
  const [advice, setAdvice] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInputs((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAdvice('');

    if (!OPENWEATHER_API_KEY || !XAI_API_KEY) {
      setError('API keys are missing. Please set VITE_OPENWEATHER_API_KEY and VITE_XAI_API_KEY in your .env file.');
      setLoading(false);
      return;
    }

    const location = `${inputs.city},${inputs.state},${inputs.country}`.trim();

    if (!location) {
      setError('Please provide city, state, and country.');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Geocode the location to get lat/lon
      const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(location)}&limit=1&appid=${OPENWEATHER_API_KEY}`;
      const geocodeRes = await fetch(geocodeUrl);
      if (!geocodeRes.ok) throw new Error('Failed to geocode location');
      const geocodeData: Geocode[] = await geocodeRes.json();
      if (geocodeData.length === 0) throw new Error('Location not found');
      const { lat, lon } = geocodeData[0];

      // Step 2: Get 5-day forecast (includes tomorrow)
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;
      const forecastRes = await fetch(forecastUrl);
      if (!forecastRes.ok) throw new Error('Failed to fetch weather');
      const forecastData: ForecastResponse = await forecastRes.json();

      // Step 3: Calculate tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

      // Filter forecast for tomorrow (3-hour intervals)
      const tomorrowForecast = forecastData.list.filter((item) => item.dt_txt.startsWith(tomorrowStr));

      if (tomorrowForecast.length === 0) throw new Error('No forecast data for tomorrow');

      // Extract wind info
      const windInfo = tomorrowForecast.map((item) => ({
        time: item.dt_txt,
        speed: item.wind.speed, // m/s
        direction: item.wind.deg, // degrees
      }));

      // Step 4: Prepare prompt for LLM
      const prompt = `
Vessel information:
- Boat model: ${inputs.boatModel}
- Available sails: ${inputs.availableSails}

Trip details:
- Traveling to: ${location} tomorrow (${tomorrowStr})

Predicted wind for tomorrow:
${windInfo.map((w) => `- ${w.time}: Speed ${w.speed} m/s, Direction ${w.direction}°`).join('\n')}

Provide advice on the sail plan for this trip, including sail choices, safety considerations, and any other relevant tips based on the wind conditions.
`;

      // Step 5: Call xAI API using OpenAI SDK compatibility
      const openai = new OpenAI({
        apiKey: XAI_API_KEY,
        baseURL: 'https://api.x.ai/v1',
        dangerouslyAllowBrowser: true, // Note: For client-side demo only; use server-side in production to avoid exposing keys
      });

      const completion = await openai.chat.completions.create({
        model: 'grok-4', // Use grok-4 or another available model like grok-3-beta
        messages: [
          { role: 'system', content: 'You are a helpful sailing expert.' },
          { role: 'user', content: prompt },
        ],
      });

      const llmAdvice = completion.choices[0]?.message?.content || 'No advice received';

      setAdvice(llmAdvice);
    } catch (err) {
      setError((err as Error).message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-foam to-wave flex items-center justify-center p-4">

      <div className="w-full bg-white/20 backdrop-blur-lg border border-white/30 rounded-3xl shadow-3xl p-10 ring-1 ring-wave/50">
      {!advice && (
        <>
        <h1 className="text-center text-ocean text-4xl font-bold mb-10">Create Sail Plan</h1>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
          <div>
            <label className="block text-wave font-semibold mb-3">City</label>
            <input
              type="text"
              name="city"
              value={inputs.city}
              onChange={handleChange}
              required
              className="w-full p-4 rounded-xl bg-white/10 border border-wave/50 text-ocean placeholder-ocean/70 focus:outline-none focus:border-wave focus:ring-2 focus:ring-wave/50"
            />
          </div>
          <div>
            <label className="block text-wave font-semibold mb-3">State/Province</label>
            <input
              type="text"
              name="state"
              value={inputs.state}
              onChange={handleChange}
              required
              className="w-full p-4 rounded-xl bg-white/10 border border-wave/50 text-ocean placeholder-ocean/70 focus:outline-none focus:border-wave focus:ring-2 focus:ring-wave/50"
            />
          </div>
          <div>
            <label className="block text-wave font-semibold mb-3">Country</label>
            <input
              type="text"
              name="country"
              value={inputs.country}
              onChange={handleChange}
              required
              className="w-full p-4 rounded-xl bg-white/10 border border-wave/50 text-ocean placeholder-ocean/70 focus:outline-none focus:border-wave focus:ring-2 focus:ring-wave/50"
            />
          </div>
          <div>
            <label className="block text-wave font-semibold mb-3">Boat model</label>
            <input
              type="text"
              name="boatModel"
              value={inputs.boatModel}
              onChange={handleChange}
              required
              className="w-full p-4 rounded-xl bg-white/10 border border-wave/50 text-ocean placeholder-ocean/70 focus:outline-none focus:border-wave focus:ring-2 focus:ring-wave/50"
            />
          </div>
          <div>
            <label className="block text-wave font-semibold mb-3">Available sails (comma-separated or description)</label>
            <textarea
              name="availableSails"
              value={inputs.availableSails}
              onChange={handleChange}
              required
              className="w-full p-4 rounded-xl bg-white/10 border border-wave/50 text-ocean placeholder-ocean/70 focus:outline-none focus:border-wave focus:ring-2 focus:ring-wave/50 h-32 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full p-5 rounded-xl text-white font-bold text-lg transition-colors flex items-center justify-center ${
              loading ? 'bg-wave/70 cursor-not-allowed' : 'bg-wave hover:bg-wave/90'
            }`}
          >
            {loading ? (
              <>
                <div className="w-7 h-7 border-4 border-white/30 border-t-wave rounded-full animate-spin mr-3" />
                Navigating...
              </>
            ) : (
              'Get Advice'
            )}
          </button>
        </form>
        </>
        )}
        {error && <p className="text-red-500 text-center mt-6 font-medium">{error}</p>}
        {advice && (
          <div className="mt-10  pl-24 pr-24 pt-10 pb-10 bg-white/20 backdrop-blur-lg border border-white/30 rounded-3xl">
            <h2 className="text-ocean text-3xl font-bold mb-6">Advice from Captain AI:</h2>
            <div className="prose prose-lg text-ocean/90 max-w-none">
              <ReactMarkdown>{advice}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;