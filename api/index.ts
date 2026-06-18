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

// Required so Opal can send JSON POST requests
app.use(express.json());

/**
 * Root route (so visiting /api doesn't show 404)
 */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '✅ Opal Weather Tool is running',
    discovery: '/api/discovery'
  });
});

/**
 * Register Express app with Opal ToolsService
 * This automatically creates:
 *   - /discovery
 *   - tool execution endpoints
 */
new ToolsService(app);

/**
 * Tool class (required for decorator usage)
 */
class WeatherTools {

  @tool({
    name: 'get_weather',
    description: 'Gets current weather for a location based on city and country.',
    parameters: [
      {
        name: 'city',
        description: 'The name of the city.',
        type: ParameterType.String,
        required: true
      },
      {
        name: 'state',
        description: 'The state or region code (optional).',
        type: ParameterType.String,
        required: false
      },
      {
        name: 'country',
        description: 'The country code (e.g., US, FR).',
        type: ParameterType.String,
        required: true
      },
      {
        name: 'units',
        description: 'Temperature units: metric, imperial, or leave blank for Kelvin.',
        type: ParameterType.String,
        required: false
      }
    ]
  })
  async getWeather(parameters: WeatherParameters): Promise<WeatherResponse> {
    try {
      const { city, state, country, units = '' } = parameters;

      if (!city?.trim() || !country?.trim()) {
        throw new Error('City and Country are required.');
      }

      const apiUrl = 'https://api.openweathermap.org/data/2.5/weather';

      // Default mock response (used if API key not set)
      let weatherData: WeatherResponse = {
        temperature: units.toLowerCase() === 'imperial' ? 72 : 22,
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
          condition:
            result.weather[0].main +
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
 * DO NOT use app.listen() on Vercel.
 * Vercel runs this as a serverless function automatically.
 */

export default app;
