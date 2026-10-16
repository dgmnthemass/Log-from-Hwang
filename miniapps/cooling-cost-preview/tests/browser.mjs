import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "playwright";
import { preview } from "vite";

const server = await preview({
  preview: { host: "127.0.0.1", port: 5189, strictPort: true },
});
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHANNEL
    ? { channel: process.env.PLAYWRIGHT_CHANNEL }
    : {}),
});
const root = "http://127.0.0.1:5189";
const key = "cooling-cost-preview:v1";
const fixed = new Date("2026-10-16T03:00:00Z");
const errors = [];
const results = [];
await fs.mkdir("test-results", { recursive: true });
async function scene({
  width = 390,
  state,
  weather = "ok",
  init,
  time = fixed,
} = {}) {
  const context = await browser.newContext({
    viewport: { width, height: 844 },
    timezoneId: "America/Los_Angeles",
    storageState: state,
  });
  if (init) await context.addInitScript(init);
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.install({ time });
  await page.route("https://api.open-meteo.com/**", async (route) => {
    if (typeof weather === "function") return weather(route);
    if (weather === "fail") return route.abort("failed");
    if (weather === "invalid")
      return route.fulfill({ json: { current: { temperature_2m: null } } });
    if (weather === "slow") return;
    return route.fulfill({
      json: {
        current: {
          temperature_2m: 31,
          relative_humidity_2m: 68,
          weather_code: 0,
          time: "2026-10-16T12:00",
        },
      },
    });
  });
  await page.goto(root);
  return { context, page };
}
async function setup(page, room = "8.5") {
  await page.getByRole("button", { name: "우리 집 설정하기" }).click();
  await page.getByLabel("방 크기 (평)").fill(room);
  await page.getByRole("button", { name: "설정 저장", exact: true }).click();
  await page.getByRole("heading", { name: "오늘 사용량" }).waitFor();
}
const data = (page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
async function noOverflow(page) {
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
}
try {
  const a = await scene();
  const p = a.page;
  await p.getByRole("button", { name: "우리 집 설정하기" }).click();
  const room = p.getByLabel("방 크기 (평)");
  await room.fill("60.1");
  await p.getByRole("button", { name: "설정 저장", exact: true }).click();
  assert.equal(await room.evaluate((el) => el.validity.valid), false);
  await room.fill("8.5");
  await p.getByRole("button", { name: "설정 저장", exact: true }).click();
  await p.getByText("Open-Meteo 조회값", { exact: false }).waitFor();
  assert.equal((await data(p)).draft.date, "2026-10-16");
  assert.equal(Object.keys((await data(p)).records).length, 15);
  await p.getByRole("slider", { name: "오늘 사용시간" }).press("End");
  await p.getByRole("button", { name: "제습", exact: true }).click();
  await p.reload();
  assert.equal(
    await p.getByRole("slider", { name: "오늘 사용시간" }).inputValue(),
    "12",
  );
  assert.equal(
    await p
      .getByRole("button", { name: "제습", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await p.getByRole("button", { name: "오늘 기록 저장", exact: true }).click();
  const first = await data(p);
  await p
    .getByRole("button", { name: "오늘 기록 수정 저장", exact: true })
    .click();
  assert.deepEqual((await data(p)).records, first.records);
  await p.getByRole("slider", { name: "오늘 사용시간" }).press("Home");
  await p
    .getByRole("button", { name: "오늘 기록 수정 저장", exact: true })
    .click();
  assert.equal((await data(p)).records["2026-10-16"].cost, 0);
  await p.getByRole("button", { name: "오늘 기록 취소", exact: true }).click();
  assert.equal((await data(p)).records["2026-10-16"], undefined);
  await p.getByRole("button", { name: "오늘 기록 저장", exact: true }).click();
  assert.equal((await data(p)).records["2026-10-16"].cost, 0);
  await p.getByRole("slider", { name: "오늘 사용시간" }).press("ArrowRight");
  assert.equal(
    await p.getByRole("slider", { name: "오늘 사용시간" }).inputValue(),
    "0.5",
  );
  await p.getByRole("slider", { name: "오늘 사용시간" }).press("End");
  await p
    .getByRole("button", { name: "오늘 기록 수정 저장", exact: true })
    .click();
  const beforeSettings = (await data(p)).records;
  await p.getByRole("button", { name: "설정", exact: true }).click();
  await p.getByLabel("방 크기 (평)").fill("10");
  await p.getByRole("slider", { name: "평균 사용시간" }).press("End");
  await p.getByLabel("지역", { exact: true }).selectOption("busan");
  await p.getByRole("button", { name: "설정 저장", exact: true }).click();
  assert.deepEqual((await data(p)).records, beforeSettings);
  await p.getByText("Open-Meteo 조회값", { exact: false }).waitFor();
  const persistent = await a.context.storageState();
  for (const width of [320, 390, 1280]) {
    await p.setViewportSize({ width, height: 844 });
    await noOverflow(p);
    await p.screenshot({
      path: `test-results/home-${width}.png`,
      fullPage: true,
    });
  }
  await p.getByRole("button", { name: "월별 기록", exact: true }).click();
  assert.equal(await p.getByText("직접 입력", { exact: true }).count(), 1);
  assert.equal(await p.getByText("자동 추정", { exact: true }).count(), 15);
  await p.setViewportSize({ width: 390, height: 844 });
  await noOverflow(p);
  await p.screenshot({ path: "test-results/history-390.png", fullPage: true });
  await a.context.close();
  results.push(
    "Setup validation, keyboard sliders, draft reload, save/replace/cancel including zero, setting snapshot preservation, monthly history, 320/390/1280px layouts",
  );

  const b = await scene({ state: persistent });
  await b.page.getByRole("heading", { name: "오늘 사용량" }).waitFor();
  assert.deepEqual((await data(b.page)).records, beforeSettings);
  assert.equal((await data(b.page)).settings.region, "busan");
  await b.page.clock.fastForward(2 * 86400000);
  await b.page.getByText("2026.10.18 · 한국 시간", { exact: true }).waitFor();
  const afterGap = await data(b.page);
  assert.equal(afterGap.records["2026-10-17"].kind, "estimated");
  assert.equal(afterGap.records["2026-10-17"].hours, 12);
  assert.deepEqual(
    afterGap.records["2026-10-16"],
    beforeSettings["2026-10-16"],
  );
  await b.page.clock.fastForward(14 * 86400000);
  await b.page.getByText("2026.11.01 · 한국 시간", { exact: true }).waitFor();
  await b.page.getByRole("button", { name: "월별 기록", exact: true }).click();
  await b.page.getByLabel("조회할 월").selectOption("2026-10");
  assert.equal(await b.page.locator(".record-list li").count(), 31);
  await b.context.close();
  results.push(
    "Reopened browser context restores records; live Korean midnight and month rollover retain October history",
  );

  for (const weather of ["fail", "invalid", "slow"]) {
    const c = await scene({ weather });
    await setup(c.page);
    if (weather === "slow") await c.page.clock.fastForward(8100);
    await c.page.getByText("날씨 조회 실패", { exact: false }).waitFor();
    assert.equal(
      await c.page
        .getByText("예시 날씨 사용 (실시간 아님)", { exact: false })
        .isVisible(),
      true,
    );
    await c.page
      .getByRole("button", { name: "오늘 기록 저장", exact: true })
      .click();
    assert.equal(
      (await data(c.page)).records["2026-10-16"].weather.source,
      "example",
    );
    await c.context.close();
  }
  const cached = await scene({
    state: persistent,
    weather: "fail",
    time: new Date(+fixed + 3600000),
  });
  await cached.page
    .getByText("최근 성공값 (24시간 이내)", { exact: false })
    .waitFor();
  await cached.context.close();
  results.push(
    "Network failure, malformed response and timeout show labelled examples; same-region cached response is labelled separately",
  );

  const lateResponses = [];
  const changing = await scene({
    weather: (route) => {
      const url = new URL(route.request().url());
      const reply = (temp) =>
        route
          .fulfill({
            json: {
              current: {
                temperature_2m: temp,
                relative_humidity_2m: 68,
                weather_code: 0,
                time: "2026-10-16T12:00",
              },
            },
          })
          .catch(() => {});
      if (url.searchParams.get("latitude") === "37.5665") {
        lateResponses.push(() => reply(39));
        return;
      }
      return reply(28);
    },
  });
  await setup(changing.page);
  await changing.page
    .getByRole("button", { name: "설정", exact: true })
    .click();
  await changing.page.getByLabel("지역", { exact: true }).selectOption("busan");
  await changing.page
    .getByRole("button", { name: "설정 저장", exact: true })
    .click();
  await changing.page.getByText("28°C · 습도 68%", { exact: true }).waitFor();
  await Promise.all(lateResponses.map((reply) => reply()));
  await changing.page
    .getByRole("button", { name: "오늘 기록 저장", exact: true })
    .click();
  assert.equal(
    (await data(changing.page)).records["2026-10-16"].weather.region,
    "busan",
  );
  assert.equal(
    (await data(changing.page)).records["2026-10-16"].weather.temp,
    28,
  );
  await changing.context.close();
  results.push(
    "Late response from previous region cannot replace the selected region weather",
  );

  const corrupted = await scene({
    init: () => localStorage.setItem("cooling-cost-preview:v1", "{broken"),
  });
  await corrupted.page
    .getByRole("heading", { name: /記録|기록을 보호하기/ })
    .waitFor();
  assert.equal(
    await corrupted.page.evaluate((k) => localStorage.getItem(k), key),
    "{broken",
  );
  await corrupted.page.screenshot({
    path: "test-results/recovery-390.png",
    fullPage: true,
  });
  await corrupted.page.getByRole("checkbox").check();
  await corrupted.page
    .getByRole("button", { name: "원본 백업 후 다시 시작", exact: true })
    .click();
  await corrupted.page
    .getByRole("button", { name: "우리 집 설정하기" })
    .waitFor();
  assert.equal(
    await corrupted.page.evaluate(
      (k) =>
        Object.keys(localStorage).some(
          (x) =>
            x.startsWith(k + ":recovery:") &&
            localStorage.getItem(x) === "{broken",
        ),
      key,
    ),
    true,
  );
  await corrupted.context.close();

  const denied = await scene({
    init: () =>
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("저장소 접근 거부");
        },
      }),
  });
  await denied.page
    .getByRole("alert")
    .filter({ hasText: "저장소 접근 거부" })
    .waitFor();
  await denied.context.close();
  const quota = await scene({
    state: persistent,
    init: () => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === "cooling-cost-preview:v1")
          throw new DOMException("저장 공간 부족", "QuotaExceededError");
        return original.call(this, k, v);
      };
    },
  });
  const beforeQuota = await data(quota.page);
  await quota.page.getByRole("slider", { name: "오늘 사용시간" }).press("Home");
  await quota.page
    .getByRole("alert")
    .filter({ hasText: "저장 공간 부족" })
    .waitFor();
  assert.deepEqual(await data(quota.page), beforeQuota);
  await quota.context.close();
  results.push(
    "Corrupt-data recovery backs up before reset; read denial and quota failure preserve original storage and show blocking recovery",
  );

  const tabs = await scene({ state: persistent });
  await tabs.page.getByRole("heading", { name: "오늘 사용량" }).waitFor();
  const other = await tabs.context.newPage();
  await other.clock.install({ time: fixed });
  await other.goto(root);
  await other.getByRole("heading", { name: "오늘 사용량" }).waitFor();
  await tabs.page.getByRole("slider", { name: "오늘 사용시간" }).press("Home");
  await other.getByRole("alert").filter({ hasText: "다른 탭" }).waitFor();
  await other
    .getByRole("button", { name: "다시 불러오기", exact: true })
    .click();
  assert.equal(
    await other.getByRole("slider", { name: "오늘 사용시간" }).inputValue(),
    "0",
  );
  await tabs.context.close();
  results.push(
    "Concurrent tabs block stale writes and recover by reloading the latest data",
  );
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: results, pageErrors: errors }, null, 2));
  await fs.writeFile(
    "test-results/browser-results.json",
    JSON.stringify({ passed: results, pageErrors: errors }, null, 2),
  );
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
