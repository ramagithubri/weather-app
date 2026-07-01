import { useState, useEffect } from 'react';
import './App.css';

const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

interface HourlyData {
  time: string[];
  temperature_2m: number[];
}

interface DailyData {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_probability_max: number[];
}

interface WeatherData {
  city: string;
  country: string;
  temp: number;
  description: string;
  windSpeed: number;
  humidity: number;
  precipitation: number;
  code: number;
  isDay: number;
  time: string;
  hourly: HourlyData;
  daily: DailyData;
}

function App() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [activeTab, setActiveTab] = useState('Temperature');

  useEffect(() => {
    fetchWeather('Bengaluru');
  }, []);

  const fetchWeather = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const geoRes = await fetch(`${GEOCODING_API}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        setError('City not found.');
        setLoading(false);
        return;
      }
      
      const location = geoData.results[0];
      
      const weatherRes = await fetch(
        `${WEATHER_API}?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
      );
      const weatherData = await weatherRes.json();
      const current = weatherData.current;
      
      setWeather({
        city: location.name,
        country: location.country || '',
        temp: Math.round(current.temperature_2m),
        description: getWeatherDescription(current.weather_code),
        windSpeed: current.wind_speed_10m,
        humidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        code: current.weather_code,
        isDay: current.is_day,
        time: current.time,
        hourly: weatherData.hourly,
        daily: weatherData.daily
      });
      
    } catch (err) {
      console.error(err);
      setError('Failed to fetch weather data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWeather(search);
  };

  const getWeatherIcon = (code: number, isDay: number = 1) => {
    if (code === 0) return isDay ? 'clear_day' : 'clear_night';
    if (code >= 1 && code <= 3) return isDay ? 'partly_cloudy_day' : 'partly_cloudy_night';
    if (code >= 45 && code <= 48) return 'foggy';
    if (code >= 51 && code <= 67) return 'rainy';
    if (code >= 71 && code <= 77) return 'cloudy_snowing';
    if (code >= 80 && code <= 82) return 'rainy';
    if (code >= 85 && code <= 86) return 'snowing';
    if (code >= 95) return 'thunderstorm';
    return 'cloud';
  };

  const getWeatherDescription = (code: number) => {
    const codes: Record<number, string> = {
      0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Cloudy',
      45: 'Fog', 48: 'Fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
      61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
      71: 'Light snow', 73: 'Snow', 75: 'Heavy snow',
      80: 'Rain showers', 81: 'Showers', 82: 'Heavy showers',
      95: 'Thunderstorm'
    };
    return codes[code] || 'Cloudy';
  };

  const formatCurrentTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { weekday: 'long', hour: 'numeric', minute: '2-digit' });
  };

  // Helper for formatting daily forecast days
  const formatDay = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  // Build the chart data for the next 8 points (3-hour intervals approx to fit screen)
  const renderChart = () => {
    if (!weather) return null;
    
    // Find current hour index
    const now = new Date();
    
    // Fallback: just take next 24 hours from current index (0 for simplicity in this demo)
    // To be precise, let's take 8 points starting from current hour
    let startIndex = 0;
    const currentIso = weather.time.slice(0, 13); // "2023-10-25T14"
    const foundIndex = weather.hourly.time.findIndex(t => t.startsWith(currentIso));
    if (foundIndex !== -1) startIndex = foundIndex;

    const pointsCount = 8;
    const step = 3; // every 3 hours
    
    const chartData = [];
    for(let i=0; i < pointsCount; i++) {
      const idx = startIndex + (i * step);
      if (idx < weather.hourly.time.length) {
        const timeStr = weather.hourly.time[idx];
        const date = new Date(timeStr);
        let hourLabel = date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
        chartData.push({
          temp: Math.round(weather.hourly.temperature_2m[idx]),
          label: hourLabel
        });
      }
    }

    if (chartData.length === 0) return null;

    const minTemp = Math.min(...chartData.map(d => d.temp)) - 2;
    const maxTemp = Math.max(...chartData.map(d => d.temp)) + 2;
    const range = maxTemp - minTemp;
    
    const svgWidth = 800;
    const svgHeight = 100;
    const xStep = svgWidth / (pointsCount - 1);

    const getX = (index: number) => index * xStep;
    const getY = (temp: number) => svgHeight - ((temp - minTemp) / range) * (svgHeight - 20) - 10;

    let pathD = `M 0,${svgHeight} `;
    chartData.forEach((d, i) => {
      pathD += `L ${getX(i)},${getY(d.temp)} `;
    });
    pathD += `L ${svgWidth},${svgHeight} Z`;

    let lineD = '';
    chartData.forEach((d, i) => {
      if (i === 0) lineD += `M ${getX(i)},${getY(d.temp)} `;
      else lineD += `L ${getX(i)},${getY(d.temp)} `;
    });

    return (
      <div className="w-full overflow-x-auto overflow-y-hidden no-scrollbar py-4 border-b border-google-border">
        <div className="min-w-[600px] relative h-32">
          {/* Temperatures above graph */}
          <div className="flex justify-between absolute top-0 w-full px-2 text-google-secondary text-sm font-medium">
            {chartData.map((d, i) => (
              <span key={i} style={{ left: `${(i / (pointsCount - 1)) * 100}%`, transform: 'translateX(-50%)', position: 'absolute' }}>
                {d.temp}°
              </span>
            ))}
          </div>

          <div className="absolute top-6 left-0 w-full h-[100px]">
             <svg width="100%" height="100%" preserveAspectRatio="none" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                <path d={pathD} fill="#fff8e1" />
                <path d={lineD} fill="none" stroke="#fbbc04" strokeWidth="2" />
                {chartData.map((d, i) => (
                  <circle key={i} cx={getX(i)} cy={getY(d.temp)} r="3" fill="#ffffff" stroke="#fbbc04" strokeWidth="2" />
                ))}
             </svg>
          </div>
          
          {/* Time labels below graph */}
          <div className="flex justify-between absolute bottom-0 w-full px-2 text-google-secondary text-xs">
            {chartData.map((d, i) => (
              <span key={i} style={{ left: `${(i / (pointsCount - 1)) * 100}%`, transform: 'translateX(-50%)', position: 'absolute' }}>
                {d.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white text-google-text font-sans">
      {/* Header Search */}
      <header className="p-4 border-b border-google-border max-w-4xl mx-auto">
        <form onSubmit={handleSearch} className="flex items-center">
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for a location..." 
            className="flex-1 max-w-lg p-2.5 bg-[#f1f3f4] rounded-full focus:outline-none focus:ring-1 focus:ring-google-border focus:bg-white text-base px-6 shadow-sm"
          />
          <button type="submit" className="ml-2 p-2 text-google-blue">
            <span className="material-symbols-outlined">search</span>
          </button>
        </form>
      </header>

      <main className="max-w-3xl mx-auto mt-6 px-4">
        {loading && <p className="text-center text-google-secondary">Loading...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}

        {!loading && weather && (
          <div className="bg-white rounded-lg border border-google-border shadow-sm p-6 overflow-hidden">
            {/* Top Location row */}
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-google-secondary text-xl">location_on</span>
              <h1 className="text-xl font-medium">{weather.city}{weather.country ? `, ${weather.country}` : ''}</h1>
            </div>

            {/* Current Weather Flex Container */}
            <div className="flex flex-col md:flex-row justify-between mb-8">
              {/* Left Side: Icon and Temp */}
              <div className="flex items-center gap-4">
                <span 
                  className="material-symbols-outlined text-google-yellow text-6xl"
                  style={{ fontVariationSettings: "'FILL' 1", fontSize: '64px' }}
                >
                  {getWeatherIcon(weather.code, weather.isDay)}
                </span>
                
                <div className="flex items-start">
                  <span className="text-6xl font-normal tracking-tighter">{weather.temp}</span>
                  <div className="flex flex-col text-google-secondary mt-1 ml-1 text-sm font-medium">
                    <div className="flex gap-1">
                      <span className="text-black cursor-pointer">°C</span>
                      <span>|</span>
                      <span className="cursor-pointer hover:underline">°F</span>
                    </div>
                  </div>
                </div>

                {/* Details Right next to Temp */}
                <div className="ml-6 flex flex-col text-[13px] text-google-secondary leading-tight gap-1">
                  <div>Precipitation: {weather.precipitation}%</div>
                  <div>Humidity: {weather.humidity}%</div>
                  <div>Wind: {weather.windSpeed} km/h</div>
                </div>
              </div>

              {/* Right Side: Description and Time */}
              <div className="mt-4 md:mt-0 text-right flex flex-col">
                <div className="text-xl font-medium">{weather.description}</div>
                <div className="text-sm text-google-secondary mt-1">{formatCurrentTime(weather.time)}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-google-border mb-2 text-sm font-medium text-google-secondary">
              {['Temperature', 'Precipitation', 'Wind'].map(tab => (
                <button 
                  key={tab}
                  className={`pb-3 px-1 border-b-2 ${activeTab === tab ? 'border-google-blue text-google-blue' : 'border-transparent hover:text-google-text'}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Chart Area */}
            {activeTab === 'Temperature' && renderChart()}
            {activeTab !== 'Temperature' && (
              <div className="h-32 flex items-center justify-center text-google-secondary text-sm border-b border-google-border">
                {activeTab} data chart goes here
              </div>
            )}

            {/* Daily Forecast Row */}
            <div className="flex overflow-x-auto no-scrollbar gap-2 py-4">
              {weather.daily.time.slice(0, 8).map((time, idx) => (
                <div key={idx} className="flex flex-col items-center min-w-[72px] p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <span className="text-[13px] font-medium text-google-text mb-2">
                    {formatDay(time)}
                  </span>
                  
                  {/* Rain chance if > 0 */}
                  <div className="h-4 flex items-center text-[#1a73e8] text-xs font-medium mb-1">
                    {weather.daily.precipitation_probability_max[idx] > 10 && (
                      <div className="flex items-center">
                        <span className="material-symbols-outlined text-[14px]">water_drop</span>
                        {weather.daily.precipitation_probability_max[idx]}%
                      </div>
                    )}
                  </div>

                  <span 
                    className="material-symbols-outlined text-google-secondary text-2xl mb-3"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {getWeatherIcon(weather.daily.weather_code[idx])}
                  </span>
                  
                  <div className="flex gap-2 text-sm">
                    <span className="font-medium text-google-text">{Math.round(weather.daily.temperature_2m_max[idx])}°</span>
                    <span className="text-google-secondary">{Math.round(weather.daily.temperature_2m_min[idx])}°</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

export default App;
