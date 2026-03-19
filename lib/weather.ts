const LAT = 34.9176
const LON = -82.2946
const USER_AGENT = 'FamilyDashboard/1.0 (family-dashboard@home)'

export interface WeatherData {
  current: {
    temperature: number
    windSpeed: number
    windDirection: number
    weatherCode: number
    humidity: number
    precipitation: number
  }
  hourly: Array<{
    time: string
    temperature: number
    weatherCode: number
    precipitation: number
  }>
  daily: Array<{
    date: string
    maxTemp: number
    minTemp: number
    weatherCode: number
    precipitationSum: number
  }>
}

export function getWeatherDescription(code: number): string {
  const codes: Record<number, string> = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Icy fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Slight showers', 81: 'Moderate showers', 82: 'Violent showers',
    85: 'Snow showers', 86: 'Heavy snow showers',
    95: 'Thunderstorm', 96: 'Thunderstorm w/ hail', 99: 'Thunderstorm w/ heavy hail',
  }
  return codes[code] ?? 'Unknown'
}

export function getWeatherEmoji(code: number): string {
  if (code === 0 || code === 1) return '☀️'
  if (code === 2) return '⛅'
  if (code === 3) return '☁️'
  if (code === 45 || code === 48) return '🌫️'
  if (code >= 51 && code <= 55) return '🌦️'
  if (code >= 61 && code <= 65) return '🌧️'
  if (code >= 71 && code <= 77) return '❄️'
  if (code >= 80 && code <= 82) return '🌨️'
  if (code >= 85 && code <= 86) return '🌨️'
  if (code >= 95) return '⛈️'
  return '🌡️'
}

interface MetNoEntry {
  time: string
  data: {
    instant: { details: { air_temperature: number; wind_speed: number; wind_from_direction: number; relative_humidity: number } }
    next_1_hours?: { summary?: { symbol_code: string }; details?: { precipitation_amount: number } }
    next_6_hours?: { summary?: { symbol_code: string }; details?: { precipitation_amount: number } }
  }
}

export async function fetchWeather(): Promise<WeatherData> {
  const url = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${LAT}&lon=${LON}`

  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
    next: { revalidate: 1800 }, // 30 min cache
  })

  if (!res.ok) throw new Error(`Met.no API error: ${res.status}`)

  const data = await res.json()
  const timeseries = data.properties.timeseries

  const current = timeseries[0]
  const instant = current.data.instant.details
  const next1h = current.data.next_1_hours || current.data.next_6_hours

  const hourly = (timeseries as MetNoEntry[]).slice(0, 24).map((t) => ({
    time: t.time,
    temperature: t.data.instant.details.air_temperature,
    weatherCode: getMetNoCode(t.data.next_1_hours?.summary?.symbol_code || t.data.next_6_hours?.summary?.symbol_code || 'clearsky_day'),
    precipitation: t.data.next_1_hours?.details?.precipitation_amount || 0,
  }))

  // Group daily from hourly
  const dailyMap = new Map<string, MetNoEntry[]>()
  ;(timeseries as MetNoEntry[]).forEach((t) => {
    const date = t.time.slice(0, 10)
    if (!dailyMap.has(date)) dailyMap.set(date, [])
    dailyMap.get(date)!.push(t)
  })

  const daily = Array.from(dailyMap.entries()).slice(0, 8).map(([date, entries]) => {
    const temps = entries.map((e) => e.data.instant.details.air_temperature)
    const noon = entries.find((e) => e.time.includes('T12:')) || entries[Math.floor(entries.length / 2)]
    return {
      date,
      maxTemp: Math.max(...temps),
      minTemp: Math.min(...temps),
      weatherCode: getMetNoCode(noon?.data?.next_6_hours?.summary?.symbol_code || noon?.data?.next_1_hours?.summary?.symbol_code || 'clearsky_day'),
      precipitationSum: entries.reduce((sum: number, e) => sum + (e.data.next_1_hours?.details?.precipitation_amount || 0), 0),
    }
  })

  return {
    current: {
      temperature: instant.air_temperature,
      windSpeed: instant.wind_speed,
      windDirection: instant.wind_from_direction,
      weatherCode: getMetNoCode(next1h?.summary?.symbol_code || 'clearsky_day'),
      humidity: instant.relative_humidity,
      precipitation: next1h?.details?.precipitation_amount || 0,
    },
    hourly,
    daily,
  }
}

function getMetNoCode(symbol: string): number {
  if (symbol.includes('clearsky')) return 0
  if (symbol.includes('fair')) return 1
  if (symbol.includes('partlycloudy')) return 2
  if (symbol.includes('cloudy')) return 3
  if (symbol.includes('fog')) return 45
  if (symbol.includes('lightrain') || symbol.includes('drizzle')) return 51
  if (symbol.includes('rain') && symbol.includes('thunder')) return 95
  if (symbol.includes('rain')) return 63
  if (symbol.includes('snow') && symbol.includes('thunder')) return 96
  if (symbol.includes('snow')) return 73
  if (symbol.includes('sleet')) return 61
  return 0
}
