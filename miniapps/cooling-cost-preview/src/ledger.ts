import {
  addDays,
  daysInMonth,
  monthOf,
  monthStart,
  validDate,
} from "./dates.ts";
import {
  calculateCost,
  validSettings,
  validHours,
  modeLabels,
} from "./model.ts";
import type { AppData, Settings, Mode, WeatherSnapshot } from "./model.ts";

export function createData(settings: Settings, today: string): AppData {
  if (!validSettings(settings) || !validDate(today))
    throw new Error("설정 또는 날짜가 올바르지 않아요.");
  const firstDate = monthStart(today);
  return reconcile(
    {
      version: 1,
      settings: { ...settings },
      records: {},
      firstDate,
      draft: { date: today, hours: settings.averageHours, mode: "cool" },
      lastProcessedDate: addDays(firstDate, -1),
    },
    today,
  );
}
/** Finish only elapsed days. Saved snapshots are never recalculated. */
export function reconcile(data: AppData, today: string): AppData {
  if (!validDate(today)) throw new Error("날짜를 확인해 주세요.");
  if (today < data.draft.date || today <= data.lastProcessedDate)
    throw new Error(
      "기기 날짜가 기록보다 이전이에요. 날짜 설정을 확인해 주세요.",
    );
  const yesterday = addDays(today, -1);
  if (data.lastProcessedDate === yesterday && data.draft.date === today)
    return data;
  const records = { ...data.records };
  for (
    let date = addDays(data.lastProcessedDate, 1);
    date < today;
    date = addDays(date, 1)
  ) {
    if (!records[date])
      records[date] = {
        date,
        kind: "estimated",
        hours: data.settings.averageHours,
        mode: "cool",
        cost: calculateCost(
          data.settings,
          data.settings.averageHours,
          "cool",
          null,
        ),
        settings: { ...data.settings },
        weather: null,
        formulaVersion: 1,
      };
  }
  return {
    ...data,
    records,
    lastProcessedDate: yesterday,
    draft:
      data.draft.date === today
        ? data.draft
        : { date: today, hours: data.settings.averageHours, mode: "cool" },
  };
}
export function changeSettings(
  data: AppData,
  settings: Settings,
  today: string,
): AppData {
  if (!validSettings(settings))
    throw new Error("방 크기는 1~60평, 소수점 한 자리까지 입력해 주세요.");
  const next = reconcile(data, today);
  return { ...next, settings: { ...settings } };
}
export function changeDraft(
  data: AppData,
  hours: number,
  mode: Mode,
  today: string,
): AppData {
  if (!validHours(hours) || !Object.hasOwn(modeLabels, mode))
    throw new Error("사용시간은 0~12시간, 0.5시간 단위로 입력해 주세요.");
  const next = reconcile(data, today);
  return { ...next, draft: { date: today, hours, mode } };
}
export function saveToday(
  data: AppData,
  weather: WeatherSnapshot,
  today: string,
): AppData {
  // A stale screen must not save yesterday's draft into a new day.
  if (data.draft.date !== today)
    throw new Error(
      "날짜가 바뀌었어요. 오늘 입력을 확인한 뒤 다시 저장해 주세요.",
    );
  const next = reconcile(data, today);
  if (weather.region !== next.settings.region)
    throw new Error("선택한 지역의 날씨를 다시 확인해 주세요.");
  const { hours, mode } = next.draft;
  return {
    ...next,
    records: {
      ...next.records,
      [today]: {
        date: today,
        kind: "recorded",
        hours,
        mode,
        cost: calculateCost(next.settings, hours, mode, weather),
        settings: { ...next.settings },
        weather: { ...weather },
        formulaVersion: 1,
      },
    },
  };
}
export function cancelToday(data: AppData, today: string): AppData {
  const next = reconcile(data, today);
  const records = { ...next.records };
  delete records[today];
  return { ...next, records };
}
export function monthlySummary(
  data: AppData,
  month: string,
  today: string,
  previewCost: number,
) {
  const rows = Object.values(data.records)
    .filter((r) => monthOf(r.date) === month)
    .sort((a, b) => b.date.localeCompare(a.date));
  const recorded = rows
    .filter((r) => r.kind === "recorded")
    .reduce((sum, r) => sum + r.cost, 0);
  const estimated = rows
    .filter((r) => r.kind === "estimated")
    .reduce((sum, r) => sum + r.cost, 0);
  const current = month === monthOf(today);
  const preview = current && !data.records[today] ? previewCost : 0;
  const total = recorded + estimated + preview;
  const count = current ? Number(today.slice(-2)) : daysInMonth(`${month}-01`);
  return {
    rows,
    recorded,
    estimated,
    preview,
    total,
    average: total / count,
    projection: (total / count) * daysInMonth(`${month}-01`),
  };
}
