import { regions } from "./regions.ts";
import type { RegionKey } from "./regions.ts";
import type { WeatherSnapshot } from "./model.ts";
import { validWeather } from "./storage.ts";
import type { StoragePort } from "./storage.ts";
import { validDate } from "./dates.ts";

const codes: Record<number, string> = {
  0: "맑음",
  1: "맑음",
  2: "구름 조금",
  3: "흐림",
  45: "안개",
  48: "안개",
  51: "이슬비",
  53: "이슬비",
  55: "이슬비",
  56: "어는 이슬비",
  57: "어는 이슬비",
  61: "비",
  63: "비",
  65: "강한 비",
  66: "어는 비",
  67: "어는 비",
  71: "눈",
  73: "눈",
  75: "강한 눈",
  77: "싸락눈",
  80: "소나기",
  81: "소나기",
  82: "강한 소나기",
  85: "눈 소나기",
  86: "눈 소나기",
  95: "뇌우",
  96: "우박",
  99: "우박",
};
export const exampleWeather = (region: RegionKey): WeatherSnapshot => ({
  ...regions[region].fallback,
  region,
  source: "example",
  fetchedAt: null,
  observedAt: null,
});
const cacheKey = (region: RegionKey) =>
  `cooling-cost-preview:weather:${region}`;
export function fallbackWeather(
  region: RegionKey,
  storage: () => StoragePort,
  now = Date.now(),
): WeatherSnapshot {
  try {
    const raw = storage().getItem(cacheKey(region));
    const cached: unknown = raw ? JSON.parse(raw) : null;
    if (
      validWeather(cached) &&
      cached.region === region &&
      cached.source !== "example" &&
      cached.fetchedAt
    ) {
      const age = now - Date.parse(cached.fetchedAt);
      if (age >= 0 && age <= 24 * 60 * 60 * 1000)
        return { ...cached, source: "cache" };
    }
  } catch {
    /* Weather cache is optional; ledger storage failures are handled separately. */
  }
  return exampleWeather(region);
}
export function cacheWeather(
  weather: WeatherSnapshot,
  storage: () => StoragePort,
): void {
  try {
    storage().setItem(cacheKey(weather.region), JSON.stringify(weather));
  } catch {
    /* The UI still labels this as a live response. */
  }
}
export function parseWeather(
  data: unknown,
  region: RegionKey,
  now = new Date(),
): WeatherSnapshot {
  if (!data || typeof data !== "object" || !("current" in data))
    throw new Error("날씨 응답 형식 오류");
  const c = data.current as Record<string, unknown> | null;
  if (
    !c ||
    typeof c !== "object" ||
    typeof c.temperature_2m !== "number" ||
    typeof c.relative_humidity_2m !== "number" ||
    typeof c.weather_code !== "number" ||
    !Object.hasOwn(codes, c.weather_code) ||
    typeof c.time !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(c.time) ||
    !validDate(c.time.slice(0, 10))
  )
    throw new Error("날씨 응답값 오류");
  const weather: WeatherSnapshot = {
    region,
    source: "live",
    temp: c.temperature_2m,
    humidity: c.relative_humidity_2m,
    text: codes[c.weather_code],
    fetchedAt: now.toISOString(),
    observedAt: `${c.time}:00+09:00`,
  };
  if (
    !validWeather(weather) ||
    Math.abs(now.getTime() - Date.parse(weather.observedAt!)) >
      24 * 60 * 60 * 1000
  )
    throw new Error("날씨 응답 범위 오류");
  return weather;
}
export async function fetchWeather(
  region: RegionKey,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
  timeoutMs = 8000,
): Promise<WeatherSnapshot> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) controller.abort();
  const timer = setTimeout(cancel, timeoutMs);
  const r = regions[region];
  try {
    const response = await fetcher(
      `https://api.open-meteo.com/v1/forecast?latitude=${r.lat}&longitude=${r.lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia%2FSeoul`,
      { signal: controller.signal },
    );
    if (!response.ok) throw new Error(`날씨 조회 실패 (${response.status})`);
    const data: unknown = await response.json();
    if (controller.signal.aborted)
      throw new DOMException("Aborted", "AbortError");
    return parseWeather(data, region);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
  }
}
