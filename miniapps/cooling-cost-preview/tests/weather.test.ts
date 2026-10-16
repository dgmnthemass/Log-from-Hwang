import test from "node:test";
import assert from "node:assert/strict";
import {
  cacheWeather,
  exampleWeather,
  fallbackWeather,
  fetchWeather,
  parseWeather,
} from "../src/weather.ts";
const now = new Date("2026-10-16T03:00:00Z");
const payload = {
  current: {
    temperature_2m: 31,
    relative_humidity_2m: 68,
    weather_code: 0,
    time: "2026-10-16T12:00",
  },
};

test("valid API response retains region, source and Korean observation time", () => {
  const w = parseWeather(payload, "seoul", now);
  assert.equal(w.source, "live");
  assert.equal(w.region, "seoul");
  assert.equal(w.observedAt, "2026-10-16T12:00:00+09:00");
});
test("invalid, stale, missing, nonfinite and out-of-range responses are rejected", () => {
  for (const value of [
    null,
    {},
    { current: null },
    { current: {} },
    { current: { ...payload.current, temperature_2m: null } },
    { current: { ...payload.current, temperature_2m: NaN } },
    { current: { ...payload.current, relative_humidity_2m: 101 } },
    { current: { ...payload.current, weather_code: 999 } },
    { current: { ...payload.current, time: "2020-01-01T12:00" } },
    { current: { ...payload.current, time: "2026-02-30T12:00" } },
    { current: { ...payload.current, time: "2026-10-16T24:00" } },
  ])
    assert.throws(() => parseWeather(value, "seoul", now));
});
test("fallback uses only recent same-region cache; expired/broken cache uses examples", () => {
  const map = new Map<string, string>();
  const storage = () => ({
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  });
  cacheWeather(parseWeather(payload, "seoul", now), storage);
  assert.equal(fallbackWeather("seoul", storage, +now + 1000).source, "cache");
  assert.equal(
    fallbackWeather("busan", storage, +now + 1000).source,
    "example",
  );
  assert.equal(
    fallbackWeather("seoul", storage, +now + 86400001).source,
    "example",
  );
  assert.equal(
    fallbackWeather("seoul", () => {
      throw Error("denied");
    }).source,
    "example",
  );
  map.set("cooling-cost-preview:weather:seoul", "{broken");
  assert.deepEqual(fallbackWeather("seoul", storage), exampleWeather("seoul"));
});
test("HTTP errors reject and a subsequent retry can succeed", async () => {
  const bad: typeof fetch = async () => new Response("", { status: 503 });
  await assert.rejects(
    fetchWeather("seoul", new AbortController().signal, bad),
    /503/,
  );
  const current = new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);
  const good: typeof fetch = async () =>
    Response.json({ current: { ...payload.current, time: current } });
  assert.equal(
    (await fetchWeather("seoul", new AbortController().signal, good)).source,
    "live",
  );
});
const hanging: typeof fetch = (_url, options) =>
  new Promise((_resolve, reject) => {
    if (options?.signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    options?.signal?.addEventListener(
      "abort",
      () => reject(new DOMException("Aborted", "AbortError")),
      { once: true },
    );
  });
test("slow requests time out", async () => {
  await assert.rejects(
    fetchWeather("seoul", new AbortController().signal, hanging, 15),
    /Aborted/,
  );
});
test("region changes cancel the previous request", async () => {
  const controller = new AbortController();
  const request = fetchWeather("seoul", controller.signal, hanging, 1000);
  controller.abort();
  await assert.rejects(request, /Aborted/);
  await assert.rejects(
    fetchWeather("busan", controller.signal, hanging),
    /Aborted/,
  );
});
