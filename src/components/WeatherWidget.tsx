import React, { useEffect, useState } from 'react';
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, Sun, Wind } from 'lucide-react';

interface WeatherData {
  current: {
    temperature_2m: number;
    wind_speed_10m: number;
    weather_code: number;
    time: string;
  };
}

function getWeatherProps(code: number) {
  if (code === 0) return { icon: Sun, text: 'Klart' };
  if (code === 1) return { icon: Sun, text: 'Hovedsakelig klart' };
  if (code === 2) return { icon: Cloud, text: 'Delvis skyet' };
  if (code === 3) return { icon: Cloud, text: 'Overskyet' };
  if (code === 45 || code === 48) return { icon: CloudFog, text: 'Tåke' };
  if (code >= 51 && code <= 57) return { icon: CloudDrizzle, text: 'Yr' };
  if (code >= 61 && code <= 67) return { icon: CloudRain, text: 'Regn' };
  if (code >= 71 && code <= 77) return { icon: CloudSnow, text: 'Snø' };
  if (code >= 80 && code <= 82) return { icon: CloudRain, text: 'Regnbyger' };
  if (code >= 85 && code <= 86) return { icon: CloudSnow, text: 'Snøbyger' };
  if (code >= 95 && code <= 99) return { icon: CloudLightning, text: 'Torden' };
  return { icon: Cloud, text: 'Ukjent' };
}

export default function WeatherWidget() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    async function fetchWeather() {
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=59.16&longitude=10.35&current=temperature_2m,wind_speed_10m,weather_code&timezone=Europe%2FOslo');
        if (!res.ok) throw new Error('Failed to fetch weather');
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error(e);
        setError(true);
      }
    }
    fetchWeather();
  }, []);

  if (error || !data) return null;

  const { temperature_2m, wind_speed_10m, weather_code } = data.current;
  const { icon: WeatherIcon, text } = getWeatherProps(weather_code);

  return (
    <div className="bg-[#E8E8DF] border border-[#D6D6C2] rounded-2xl px-4 py-3 flex items-center gap-4 text-[#5A5A40]">
      <div className="flex items-center gap-2">
        <WeatherIcon className="w-5 h-5" />
        <span className="font-bold">{text}</span>
      </div>
      <div className="w-[1px] h-4 bg-[#D6D6C2]" />
      <div className="flex items-center gap-1.5">
        <span className="font-bold">{temperature_2m.toFixed(1)}°C</span>
      </div>
      <div className="w-[1px] h-4 bg-[#D6D6C2]" />
      <div className="flex items-center gap-1.5 flex-1 justify-end sm:justify-start">
        <Wind className="w-4 h-4" />
        <span className="font-bold">{wind_speed_10m.toFixed(1)} m/s</span>
      </div>
    </div>
  );
}
