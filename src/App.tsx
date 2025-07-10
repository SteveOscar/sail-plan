// App.tsx
import React, { useState } from 'react';

// Import OpenAI SDK for compatibility with xAI API
import OpenAI from 'openai';

// Define environment variables (set these in your .env file)
// Example: REACT_APP_OPENWEATHER_API_KEY=your_openweather_key
// REACT_APP_XAI_API_KEY=your_xai_api_key
const OPENWEATHER_API_KEY = process.env.REACT_APP_OPENWEATHER_API_KEY || '';
const XAI_API_KEY = process.env.REACT_APP_XAI_API_KEY || '';

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
      setError('API keys are missing. Please set REACT_APP_OPENWEATHER_API_KEY and REACT_APP_XAI_API_KEY in your .env file.');
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
      <div className="w-full max-w-lg bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl shadow-2xl p-8">
        <h1 className="text-center text-ocean text-3xl font-semibold mb-8">Create Sail Plan</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-wave font-medium mb-2">City</label>
            <input
              type="text"
              name="city"
              value={inputs.city}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg bg-white/5 border border-wave/30 text-ocean placeholder-ocean/70 focus:outline-none focus:border-wave"
            />
          </div>
          <div>
            <label className="block text-wave font-medium mb-2">State/Province</label>
            <input
              type="text"
              name="state"
              value={inputs.state}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg bg-white/5 border border-wave/30 text-ocean placeholder-ocean/70 focus:outline-none focus:border-wave"
            />
          </div>
          <div>
            <label className="block text-wave font-medium mb-2">Country</label>
            <input
              type="text"
              name="country"
              value={inputs.country}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg bg-white/5 border border-wave/30 text-ocean placeholder-ocean/70 focus:outline-none focus:border-wave"
            />
          </div>
          <div>
            <label className="block text-wave font-medium mb-2">Boat model</label>
            <input
              type="text"
              name="boatModel"
              value={inputs.boatModel}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg bg-white/5 border border-wave/30 text-ocean placeholder-ocean/70 focus:outline-none focus:border-wave"
            />
          </div>
          <div>
            <label className="block text-wave font-medium mb-2">Available sails (comma-separated or description)</label>
            <textarea
              name="availableSails"
              value={inputs.availableSails}
              onChange={handleChange}
              required
              className="w-full p-3 rounded-lg bg-white/5 border border-wave/30 text-ocean placeholder-ocean/70 focus:outline-none focus:border-wave h-28 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full p-4 rounded-lg text-white font-semibold transition-colors flex items-center justify-center ${
              loading ? 'bg-wave/70 cursor-not-allowed' : 'bg-wave hover:bg-wave/80'
            }`}
          >
            {loading ? (
              <>
                <div className="w-6 h-6 border-4 border-white/30 border-t-wave rounded-full animate-spin mr-2" />
                Navigating...
              </>
            ) : (
              'Get Advice'
            )}
          </button>
        </form>
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
        {advice && (
          <div className="mt-8 p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl">
            <h2 className="text-ocean text-2xl font-semibold mb-4">Advice from Grok:</h2>
            <pre className="whitespace-pre-wrap text-ocean/80 leading-relaxed">{advice}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;