import { ParameterType, ToolsService, tool } from '@optimizely-opal/opal-tools-sdk';
import express from 'express';
import { URLSearchParams } from 'node:url';

interface WeatherParameters {
  city: string;
  state?: string;
  country: string;
  units?: string;
}

interface WeatherResponse {
  temperature: number;
  condition: string;
  location: string;
}

const app = express();

// Required to read JSON POST bodies from Opal
app.use(express.json());

/**
 * Optional root route so "/" does not return "Cannot GET /"
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '✅ Opal Weather Tool is running',
    discovery: '/discovery'
  });
});

/**
 * Error handling middleware
 */
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: error.message
  });
});

/**
 * Register Express app with Opal ToolsService
 * This auto-creates:
 *   - /discovery
 *   - tool execution endpoints
 */
const toolsService = new ToolsService(app);

/**
 * Tool class (required for @tool decorator)
 */
class WeatherTools {

  @tool({
    name: 'get_weather_hb',
    description: 'Gets current weather for a location based on City name, State code, and Country code.',
    parameters: [
      {
        name: "city",
        description: "The name of the city.",
        type: ParameterType.String,
        required: true
      },
      {
        name: "state",
        description: "The state/region code (optional).",
        type: ParameterType.String,
        required: false
      },
      {
        name: "country",
        description: "The country code (e.g., US, FR).",
        type: ParameterType.String,
        required: true
      },
      {
        name: "units",
        description: "Metric, Imperial, or leave blank for Kelvin.",
        type: ParameterType.String,
        required: false
      }
    ]
  })
  async getWeather_hb(parameters: WeatherParameters): Promise<WeatherResponse> {
    try {
      const { city, state, country, units = '' } = parameters;

      if (!city?.trim() || !country?.trim()) {
        throw new Error('City and Country are required.');
      }

      const apiUrl = 'https://api.openweathermap.org/data/2.5/weather';

      // Default mock response
      let weatherData: WeatherResponse = {
        temperature: units?.toLowerCase() === 'imperial' ? 72 : 22,
        condition: 'Sunny',
        location: `${city}${state ? `, ${state}` : ''}, ${country}`
      };

      // Use live weather if API key exists
      if (process.env.OPENWEATHERMAP_API_KEY?.trim()) {

        const q = new URLSearchParams();

        if (state) {
          q.append('q', `${city},${state},${country}`);
        } else {
          q.append('q', `${city},${country}`);
        }

        if (units) {
          q.append('units', units.toLowerCase());
        }

        q.append('appid', process.env.OPENWEATHERMAP_API_KEY);

        const response = await fetch(`${apiUrl}?${q}`);

        if (!response.ok) {
          throw new Error(`Weather API error: ${response.status}`);
        }

        const result = await response.json();

        weatherData = {
          temperature: result.main.temp,
          condition: result.weather[0].main +
            (result.weather[0].description
              ? ` (${result.weather[0].description})`
              : ''),
          location: `${result.name}, ${result.sys.country}`
        };
      }

      return weatherData;

    } catch (error: any) {
      console.error('Weather fetch error:', error);
      throw new Error(`Failed to get weather: ${error.message}`);
    }
  }
}

/**
 * IMPORTANT:
 * DO NOT call app.listen() in Vercel.
 * Vercel runs this as a serverless function.
 */

export default app;
