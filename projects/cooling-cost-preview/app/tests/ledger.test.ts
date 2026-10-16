import test from "node:test";
import assert from "node:assert/strict";
import { addDays, daysInMonth, koreaDate, validDate } from "../src/dates.ts";
import {
  calculateCost,
  defaultSettings,
  validSettings,
  validHours,
} from "../src/model.ts";
import {
  createData,
  reconcile,
  saveToday,
  cancelToday,
  changeDraft,
  changeSettings,
  monthlySummary,
} from "../src/ledger.ts";
import { exampleWeather } from "../src/weather.ts";
import { decode, LocalRepository, STORAGE_KEY } from "../src/storage.ts";
import type { StoragePort } from "../src/storage.ts";

const today = "2026-10-16";
const weather = exampleWeather("seoul");
const initial = () => createData(defaultSettings, today);
class Memory implements StoragePort {
  values = new Map<string, string>();
  failWrite = false;
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWrite) throw new Error("quota exceeded");
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

test("Korean midnight is independent of browser timezone", () => {
  assert.equal(koreaDate(new Date("2026-10-15T14:59:59Z")), "2026-10-15");
  assert.equal(koreaDate(new Date("2026-10-15T15:00:00Z")), today);
});
test("leap, month and year calendar boundaries", () => {
  assert.equal(addDays("2024-02-28", 1), "2024-02-29");
  assert.equal(addDays("2024-02-29", 1), "2024-03-01");
  assert.equal(addDays("2025-02-28", 1), "2025-03-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(daysInMonth("2024-02-01"), 29);
  assert.equal(daysInMonth("2025-02-01"), 28);
  assert.equal(validDate("2025-02-29"), false);
});
test("input boundaries reject decimals outside allowed increments", () => {
  for (const room of [0, 60.1, NaN, Infinity, 7.15])
    assert.equal(validSettings({ ...defaultSettings, room }), false);
  for (const room of [1, 7.1, 8.5, 60])
    assert.equal(validSettings({ ...defaultSettings, room }), true);
  for (const hours of [-0.5, 0.1, 12.5, NaN, Infinity])
    assert.equal(validHours(hours), false);
  for (const hours of [0, 0.5, 12]) assert.equal(validHours(hours), true);
});
test("original formula coefficients and integer won rounding", () => {
  assert.equal(
    calculateCost({ ...defaultSettings, room: 8.5 }, 6, "cool", {
      text: "맑음",
      temp: 20,
      humidity: 74,
    }),
    1007,
  );
  assert.equal(
    calculateCost({ ...defaultSettings, room: 8.5 }, 6, "dry", {
      text: "맑음",
      temp: 20,
      humidity: 74,
    }),
    725,
  );
  assert.equal(calculateCost(defaultSettings, 0, "cool", weather), 0);
  assert.equal(calculateCost(defaultSettings, 4, "cool", null), 667);
});
test("initial setup backfills only elapsed days with neutral weather", () => {
  const data = initial();
  assert.equal(Object.keys(data.records).length, 15);
  assert.equal(data.records[today], undefined);
  assert.equal(data.records["2026-10-01"].kind, "estimated");
  assert.equal(data.records["2026-10-01"].weather, null);
  assert.equal(data.records["2026-10-01"].cost, 667);
});
test("same-day saving replaces rather than double counts, and snapshots stay fixed", () => {
  const first = saveToday(initial(), weather, today);
  assert.deepEqual(saveToday(first, weather, today), first);
  const changed = changeDraft(first, 12, "dry", today);
  assert.deepEqual(changed.records[today], first.records[today]);
  const saved = saveToday(changed, weather, today);
  assert.equal(Object.keys(saved.records).length, 16);
  assert.equal(saved.records[today].hours, 12);
  assert.notEqual(saved.records[today].cost, first.records[today].cost);
});
test("zero-hour record cancels and can be saved again", () => {
  const data = changeDraft(initial(), 0, "cool", today);
  const saved = saveToday(data, weather, today);
  assert.equal(saved.records[today].cost, 0);
  const cancelled = cancelToday(saved, today);
  assert.equal(cancelled.records[today], undefined);
  assert.equal(saveToday(cancelled, weather, today).records[today].cost, 0);
});
test("unsaved input persists but never becomes an actual record automatically", () => {
  const draft = changeDraft(initial(), 12, "dry", today);
  const next = reconcile(draft, "2026-10-17");
  assert.equal(next.records[today].kind, "estimated");
  assert.equal(next.records[today].hours, 4);
  assert.equal(next.records[today].mode, "cool");
  assert.equal(next.draft.hours, 4);
});
test("setting edits close the gap with old settings and preserve all prior amounts", () => {
  const old = saveToday(initial(), weather, today);
  const changed = changeSettings(
    old,
    { ...defaultSettings, room: 60, averageHours: 12 },
    "2026-10-19",
  );
  assert.deepEqual(changed.records[today], old.records[today]);
  assert.equal(changed.records["2026-10-18"].settings.room, 7);
  const later = reconcile(changed, "2026-10-20");
  assert.equal(later.records["2026-10-19"].settings.room, 60);
  assert.equal(later.records["2026-10-19"].hours, 12);
});
test("long gaps preserve actual records, are idempotent and retain old months", () => {
  const old = saveToday(
    createData(defaultSettings, "2026-12-31"),
    weather,
    "2026-12-31",
  );
  const next = reconcile(old, "2027-01-03");
  assert.equal(Object.keys(next.records).length, 33);
  assert.deepEqual(next.records["2026-12-31"], old.records["2026-12-31"]);
  assert.equal(next.records["2027-01-01"].kind, "estimated");
  assert.equal(reconcile(next, "2027-01-03"), next);
});
test("backfill includes leap day exactly once", () => {
  const next = reconcile(
    createData(defaultSettings, "2024-02-28"),
    "2024-03-02",
  );
  assert.equal(next.records["2024-02-29"].kind, "estimated");
  assert.equal(Object.keys(next.records).length, 30);
});
test("monthly summary includes unsaved preview once, saved costs override changing previews", () => {
  const data = initial();
  const s = monthlySummary(data, "2026-10", today, 1000);
  assert.equal(s.estimated, 10005);
  assert.equal(s.total, 11005);
  assert.equal(s.average, 11005 / 16);
  assert.equal(s.projection, (11005 / 16) * 31);
  const saved = saveToday(changeDraft(data, 0, "cool", today), weather, today);
  assert.equal(monthlySummary(saved, "2026-10", today, 9999).total, 10005);
  const next = reconcile(saved, "2026-11-01");
  assert.equal(monthlySummary(next, "2026-10", "2026-11-01", 9999).preview, 0);
  assert.equal(monthlySummary(next, "2026-11", "2026-11-01", 1200).total, 1200);
});
test("clock rollback and stale midnight save do not alter the ledger", () => {
  const data = initial();
  assert.throws(() => reconcile(data, "2026-10-15"), /기기 날짜/);
  assert.throws(() => saveToday(data, weather, "2026-10-17"), /날짜가 바뀌었/);
  assert.throws(() => saveToday(data, exampleWeather("busan"), today), /지역/);
});
test("new repository restores settings, draft and complete record snapshots", () => {
  const memory = new Memory();
  const repo = new LocalRepository(() => memory);
  assert.equal(repo.load(), null);
  const data = saveToday(
    changeDraft(initial(), 6.5, "sleep", today),
    weather,
    today,
  );
  repo.save(data);
  assert.deepEqual(new LocalRepository(() => memory).load(), data);
});
test("read denial is surfaced and blocks blind writes", () => {
  const repo = new LocalRepository(() => {
    throw new Error("access denied");
  });
  assert.throws(() => repo.load(), /access denied/);
  assert.throws(() => repo.save(initial()), /먼저/);
});
test("write failure retains last committed data and permits reload/retry", () => {
  const memory = new Memory();
  const repo = new LocalRepository(() => memory);
  repo.load();
  repo.save(initial());
  const before = memory.getItem(STORAGE_KEY);
  memory.failWrite = true;
  assert.throws(() => repo.save(saveToday(initial(), weather, today)), /quota/);
  assert.equal(memory.getItem(STORAGE_KEY), before);
  memory.failWrite = false;
  repo.load();
  repo.save(saveToday(initial(), weather, today));
  assert.equal(repo.load()!.records[today].kind, "recorded");
});
test("corrupt or future-schema data is never replaced implicitly", () => {
  for (const raw of [
    "{broken",
    '{"version":99}',
    JSON.stringify({ ...initial(), records: {} }),
  ]) {
    const memory = new Memory();
    memory.setItem(STORAGE_KEY, raw);
    const repo = new LocalRepository(() => memory);
    assert.throws(() => repo.load());
    assert.throws(() => repo.save(initial()));
    assert.equal(memory.getItem(STORAGE_KEY), raw);
  }
});
test("schema rejects invalid snapshots and impossible monetary data", () => {
  const data = initial();
  data.records["2026-10-01"].cost = 999999;
  assert.throws(() => decode(JSON.stringify(data)));
  const valid = initial();
  valid.draft.date = "2026-02-30";
  assert.throws(() => decode(JSON.stringify(valid)));
});
test("another tab cannot be silently overwritten", () => {
  const memory = new Memory();
  const first = new LocalRepository(() => memory);
  const other = new LocalRepository(() => memory);
  first.load();
  other.load();
  first.save(initial());
  assert.throws(() => other.save(initial()), /다른 탭/);
  assert.deepEqual(first.load(), initial());
});
test("reset preserves raw data first, and fails closed if backup fails", () => {
  const memory = new Memory();
  memory.setItem(STORAGE_KEY, "{broken");
  const repo = new LocalRepository(() => memory);
  assert.throws(() => repo.load());
  memory.failWrite = true;
  assert.throws(() => repo.backupAndReset(), /quota/);
  assert.equal(memory.getItem(STORAGE_KEY), "{broken");
  memory.failWrite = false;
  repo.backupAndReset();
  assert.equal(memory.getItem(STORAGE_KEY), null);
  assert.equal([...memory.values.values()][0], "{broken");
});
