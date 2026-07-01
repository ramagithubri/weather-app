import { useState, useEffect } from 'react';
import './App.css';

const GEOCODING_API = 'https://geocoding-api.open-meteo.com/v1/search';
const WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

interface WeatherData {
  city: string;
  country: string;
  temp: number;
  high: number;
  low: number;
  description: string;
  windSpeed: number;
  humidity: number;
  precipitation: number;
  code: number;
  isDay: number;
}

function App() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    fetchWeather('San Francisco');
  }, []);

  const fetchWeather = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const geoRes = await fetch(`${GEOCODING_API}?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
      const geoData = await geoRes.json();
      
      if (!geoData.results || geoData.results.length === 0) {
        setError('City not found. Please try another search.');
        setLoading(false);
        return;
      }
      
      const location = geoData.results[0];
      
      const weatherRes = await fetch(
        `${WEATHER_API}?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
      );
      const weatherData = await weatherRes.json();
      const current = weatherData.current;
      const daily = weatherData.daily;
      
      setWeather({
        city: location.name,
        country: location.country || '',
        temp: Math.round(current.temperature_2m),
        high: daily?.temperature_2m_max ? Math.round(daily.temperature_2m_max[0]) : 0,
        low: daily?.temperature_2m_min ? Math.round(daily.temperature_2m_min[0]) : 0,
        description: getWeatherDescription(current.weather_code),
        windSpeed: current.wind_speed_10m,
        humidity: current.relative_humidity_2m,
        precipitation: current.precipitation,
        code: current.weather_code,
        isDay: current.is_day
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

  const getWeatherIcon = (code: number, isDay: number) => {
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
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm, slight hail',
      99: 'Thunderstorm, heavy hail'
    };
    return codes[code] || 'Unknown weather';
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', month: 'long', day: 'numeric' 
    });
  };

  return (
    <div className="text-on-surface antialiased min-h-screen flex flex-col pt-16 pb-20 md:pb-0 md:pt-24 dark">
      {/* TopAppBar */}
      <header className="bg-surface/50 backdrop-blur-[40px] fixed top-0 w-full flex justify-between items-center px-container-padding h-16 z-50">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-2xl hover:bg-white/10 transition-colors active:scale-95 duration-200 cursor-pointer rounded-full p-2" data-icon="cloud">cloud</span>
          <span className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-on-surface">Atmosphere</span>
        </div>
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <form onSubmit={handleSearch} className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" data-icon="search">search</span>
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-12 pr-4 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all font-body-md text-body-md" 
              placeholder="Search City..." 
              type="text"
            />
          </form>
        </div>
        <div className="md:hidden">
          <span className="material-symbols-outlined text-primary text-2xl hover:bg-white/10 transition-colors active:scale-95 duration-200 cursor-pointer rounded-full p-2" data-icon="search">search</span>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-container-padding flex flex-col gap-6 md:gap-8">
        
        {/* Mobile Search */}
        <form onSubmit={handleSearch} className="md:hidden relative group w-full mt-4">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none" data-icon="search">search</span>
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-4 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all font-body-md text-body-md" 
            placeholder="Search City..." 
            type="text"
          />
        </form>

        {error && (
          <div className="bg-error-container/20 border border-error/50 text-error rounded-xl p-4 text-center mt-4 font-body-md">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center h-64">
            <span className="material-symbols-outlined text-4xl text-primary animate-spin">refresh</span>
          </div>
        )}

        {!loading && weather && (
          <>
            {/* Hero Section */}
            <section className="glass-card rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden glow-effect mt-4 md:mt-8">
              <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent pointer-events-none"></div>
              
              <div className="z-10 flex flex-col items-center text-center space-y-4">
                <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-xl" data-icon="location_on">location_on</span>
                  {weather.city}{weather.country ? `, ${weather.country}` : ''}
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant">{formatDate()}</p>
                <p className="font-body-md text-secondary capitalize">{weather.description}</p>
                
                <div className="flex items-center justify-center gap-6 mt-6">
                  <span 
                    className="material-symbols-outlined text-6xl md:text-8xl text-secondary drop-shadow-[0_0_15px_rgba(123,208,255,0.5)]" 
                    style={{ fontVariationSettings: "'FILL' 1" }}>
                    {getWeatherIcon(weather.code, weather.isDay)}
                  </span>
                  <span className="font-display-xl text-display-xl text-on-surface tracking-tighter">
                    {weather.temp}°
                  </span>
                </div>
                
                <div className="flex items-center gap-3 mt-4 bg-surface/40 rounded-full px-4 py-1.5 border border-white/5">
                  <span className="font-data-mono text-data-mono text-secondary">H: {weather.high}°</span>
                  <span className="w-1 h-1 rounded-full bg-on-surface-variant/30"></span>
                  <span className="font-data-mono text-data-mono text-on-surface-variant">L: {weather.low}°</span>
                </div>
              </div>
            </section>

            {/* Details Grid */}
            <section className="grid grid-cols-3 gap-card-gap md:gap-6">
              <div className="glass-card rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center text-center space-y-2 hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-secondary mb-1">air</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Wind</span>
                <span className="font-data-mono text-data-mono text-on-surface text-lg">{weather.windSpeed} km/h</span>
              </div>
              
              <div className="glass-card rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center text-center space-y-2 hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-secondary mb-1">humidity_percentage</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Humidity</span>
                <span className="font-data-mono text-data-mono text-on-surface text-lg">{weather.humidity}%</span>
              </div>
              
              <div className="glass-card rounded-2xl p-4 md:p-6 flex flex-col items-center justify-center text-center space-y-2 hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined text-secondary mb-1">water_drop</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Precip</span>
                <span className="font-data-mono text-data-mono text-on-surface text-lg">{weather.precipitation} mm</span>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
