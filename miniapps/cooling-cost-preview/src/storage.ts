import { addDays, validDate, monthStart } from "./dates.ts";
import {
  calculateCost,
  modeLabels,
  validHours,
  validSettings,
} from "./model.ts";
import type {
  AppData,
  Settings,
  WeatherSnapshot,
  DailyRecord,
} from "./model.ts";
import { regions } from "./regions.ts";

export const STORAGE_KEY = "cooling-cost-preview:v1";
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
function settings(v: unknown): v is Settings {
  return object(v) && validSettings(v as unknown as Settings);
}
export function validWeather(v: unknown): v is WeatherSnapshot {
  if (!object(v)) return false;
  return (
    typeof v.region === "string" &&
    Object.hasOwn(regions, v.region) &&
    typeof v.temp === "number" &&
    Number.isFinite(v.temp) &&
    v.temp >= -90 &&
    v.temp <= 60 &&
    typeof v.humidity === "number" &&
    Number.isFinite(v.humidity) &&
    v.humidity >= 0 &&
    v.humidity <= 100 &&
    typeof v.text === "string" &&
    v.text.length > 0 &&
    v.text.length < 100 &&
    ["live", "cache", "example"].includes(String(v.source)) &&
    (v.source === "example"
      ? v.fetchedAt === null && v.observedAt === null
      : typeof v.fetchedAt === "string" &&
        Number.isFinite(Date.parse(v.fetchedAt)) &&
        typeof v.observedAt === "string" &&
        Number.isFinite(Date.parse(v.observedAt)))
  );
}
function record(v: unknown): v is DailyRecord {
  if (
    !object(v) ||
    !validDate(v.date) ||
    !settings(v.settings) ||
    !validHours(v.hours) ||
    typeof v.mode !== "string" ||
    !Object.hasOwn(modeLabels, v.mode) ||
    v.formulaVersion !== 1 ||
    typeof v.cost !== "number" ||
    !Number.isSafeInteger(v.cost) ||
    v.cost < 0
  )
    return false;
  const typed = v as unknown as DailyRecord;
  if (v.kind === "estimated") {
    if (
      v.weather !== null ||
      v.mode !== "cool" ||
      v.hours !== v.settings.averageHours
    )
      return false;
  } else if (
    v.kind !== "recorded" ||
    !validWeather(v.weather) ||
    v.weather.region !== v.settings.region
  )
    return false;
  return (
    v.cost ===
    calculateCost(typed.settings, typed.hours, typed.mode, typed.weather)
  );
}
export function decode(raw: string): AppData {
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    throw new Error("저장된 데이터를 읽을 수 없어요. 원본을 보존했어요.");
  }
  if (
    !object(v) ||
    v.version !== 1 ||
    !settings(v.settings) ||
    !object(v.records) ||
    !object(v.draft) ||
    !validDate(v.firstDate) ||
    monthStart(v.firstDate) !== v.firstDate ||
    !validDate(v.lastProcessedDate) ||
    !validDate(v.draft.date) ||
    !validHours(v.draft.hours) ||
    typeof v.draft.mode !== "string" ||
    !Object.hasOwn(modeLabels, v.draft.mode) ||
    addDays(v.lastProcessedDate, 1) !== v.draft.date ||
    v.firstDate > v.draft.date
  )
    throw new Error(
      "지원하지 않거나 손상된 저장 데이터예요. 원본을 보존했어요.",
    );
  for (const [date, row] of Object.entries(v.records)) {
    if (
      !record(row) ||
      date !== row.date ||
      date < v.firstDate ||
      date > v.draft.date ||
      (date === v.draft.date && row.kind !== "recorded")
    )
      throw new Error("날짜별 기록을 읽을 수 없어요. 원본을 보존했어요.");
  }
  for (
    let date = v.firstDate;
    date <= v.lastProcessedDate;
    date = addDays(date, 1)
  ) {
    if (!Object.hasOwn(v.records, date))
      throw new Error("일부 날짜의 기록이 없어요. 원본을 보존했어요.");
  }
  return v as unknown as AppData;
}

/** Compare before writing so another tab cannot silently lose its changes. */
export class LocalRepository {
  private expected: string | null = null;
  private ready = false;
  raw: string | null = null;
  private readonly port: () => StoragePort;
  constructor(port: () => StoragePort) {
    this.port = port;
  }
  load(): AppData | null {
    this.ready = false;
    const raw = this.port().getItem(STORAGE_KEY);
    this.raw = raw;
    const data = raw === null ? null : decode(raw);
    this.expected = raw;
    this.ready = true;
    return data;
  }
  save(data: AppData): void {
    if (!this.ready) throw new Error("저장 데이터를 먼저 다시 읽어 주세요.");
    const storage = this.port();
    if (storage.getItem(STORAGE_KEY) !== this.expected)
      throw new Error(
        "다른 탭에서 기록이 바뀌었어요. 다시 불러온 뒤 입력해 주세요.",
      );
    const raw = JSON.stringify(data);
    storage.setItem(STORAGE_KEY, raw);
    this.expected = raw;
    this.raw = raw;
  }
  backupAndReset(): void {
    const storage = this.port();
    if (storage.getItem(STORAGE_KEY) !== this.raw)
      throw new Error("다른 탭의 변경이 있어요. 먼저 다시 불러와 주세요.");
    if (this.raw !== null)
      storage.setItem(`${STORAGE_KEY}:recovery:${Date.now()}`, this.raw);
    // Only remove after the backup succeeds. Never discard inaccessible data.
    storage.removeItem(STORAGE_KEY);
    this.expected = null;
    this.raw = null;
    this.ready = true;
  }
}
