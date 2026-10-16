import { regions } from "./regions.ts";
import type { RegionKey, WeatherValues } from "./regions.ts";

export const acLabels = {
  wall: "벽걸이형",
  stand: "스탠드형",
  window: "창문형",
  portable: "이동식",
  unknown: "잘 모르겠어요",
};
export const modeLabels = { cool: "냉방", dry: "제습", sleep: "취침" };
export type AcType = keyof typeof acLabels;
export type Mode = keyof typeof modeLabels;
export interface Settings {
  room: number;
  ac: AcType;
  region: RegionKey;
  averageHours: number;
}
export interface WeatherSnapshot extends WeatherValues {
  region: RegionKey;
  source: "live" | "cache" | "example";
  fetchedAt: string | null;
  observedAt: string | null;
}
export interface DailyRecord {
  date: string;
  kind: "recorded" | "estimated";
  hours: number;
  mode: Mode;
  cost: number;
  settings: Settings;
  weather: WeatherSnapshot | null;
  formulaVersion: 1;
}
export interface AppData {
  version: 1;
  settings: Settings;
  records: Record<string, DailyRecord>;
  draft: { date: string; hours: number; mode: Mode };
  lastProcessedDate: string;
  firstDate: string;
}
export const defaultSettings: Settings = {
  room: 7,
  ac: "wall",
  region: "seoul",
  averageHours: 4,
};
const watts = {
  wall: 0.65,
  stand: 1.8,
  window: 0.75,
  portable: 0.9,
  unknown: 0.65,
};
const modeFactors = { cool: 1, dry: 0.72, sleep: 0.58 };

export function validHours(n: unknown): n is number {
  return (
    typeof n === "number" &&
    Number.isFinite(n) &&
    n >= 0 &&
    n <= 12 &&
    Number.isInteger(n * 2)
  );
}
export function validSettings(s: Settings): boolean {
  return (
    Number.isFinite(s.room) &&
    s.room >= 1 &&
    s.room <= 60 &&
    Math.abs(s.room * 10 - Math.round(s.room * 10)) < 1e-8 &&
    Object.hasOwn(acLabels, s.ac) &&
    Object.hasOwn(regions, s.region) &&
    validHours(s.averageHours)
  );
}
export function calculateCost(
  settings: Settings,
  hours: number,
  mode: Mode,
  weather: WeatherValues | null,
): number {
  if (
    !validSettings(settings) ||
    !validHours(hours) ||
    !Object.hasOwn(modeFactors, mode)
  )
    throw new Error("입력 범위를 확인해 주세요.");
  const humidity = weather
    ? weather.humidity >= 75
      ? 1.08
      : weather.humidity <= 55
        ? 0.96
        : 1
    : 1;
  const temp = weather
    ? weather.temp >= 33
      ? 1.12
      : weather.temp >= 30
        ? 1.04
        : 0.98
    : 1;
  return Math.round(
    watts[settings.ac] *
      hours *
      modeFactors[mode] *
      (0.86 + settings.room * 0.018) *
      humidity *
      temp *
      260,
  );
}
export const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
