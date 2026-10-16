import { useState } from "react";
import { koreaDate, monthOf } from "./dates.ts";
import {
  cancelToday,
  changeDraft,
  changeSettings,
  createData,
  monthlySummary,
  saveToday,
} from "./ledger.ts";
import {
  acLabels,
  calculateCost,
  defaultSettings,
  modeLabels,
  validSettings,
  won,
} from "./model.ts";
import type { AcType, Mode, Settings } from "./model.ts";
import { regions } from "./regions.ts";
import type { RegionKey } from "./regions.ts";
import { useLedger, useWeather } from "./hooks.ts";
import "./App.css";

function Setup({
  initial,
  onSave,
  onCancel,
}: {
  initial: Settings;
  onSave: (s: Settings) => void;
  onCancel: () => void;
}) {
  const [settings, setSettings] = useState(initial);
  const [room, setRoom] = useState(String(initial.room));
  const [error, setError] = useState("");
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        const next = { ...settings, room: Number(room) };
        if (!room.trim() || !validSettings(next)) {
          setError("방 크기는 1~60평, 소수점 한 자리까지 입력해 주세요.");
          return;
        }
        onSave(next);
      }}
    >
      <div>
        <p className="eyebrow">우리 집 냉방 설정</p>
        <h1>
          어떤 공간에서
          <br />
          사용하시나요?
        </h1>
        <p className="muted">설정을 바꿔도 이전 기록의 금액은 유지돼요.</p>
      </div>
      <label>
        방 크기 (평)
        <input
          type="number"
          min="1"
          max="60"
          step="0.1"
          required
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          aria-describedby="room-help"
        />
      </label>
      <small id="room-help">1~60평 · 소수점 한 자리까지</small>
      <label>
        에어컨 종류
        <select
          aria-label="에어컨 종류"
          value={settings.ac}
          onChange={(e) =>
            setSettings({ ...settings, ac: e.target.value as AcType })
          }
        >
          {Object.entries(acLabels).map(([key, label]) => (
            <option value={key} key={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        지역
        <select
          aria-label="지역"
          value={settings.region}
          onChange={(e) =>
            setSettings({ ...settings, region: e.target.value as RegionKey })
          }
        >
          {Object.entries(regions).map(([key, r]) => (
            <option value={key} key={key}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        평균 사용시간 <strong>{settings.averageHours.toFixed(1)}시간</strong>
        <input
          type="range"
          min="0"
          max="12"
          step="0.5"
          value={settings.averageHours}
          onChange={(e) =>
            setSettings({ ...settings, averageHours: Number(e.target.value) })
          }
        />
      </label>
      <p className="note">
        기록하지 않은 지난 날짜는 이 시간과 냉방 모드로 자동 추정해요. 과거 실제
        날씨는 반영하지 않아요.
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="primary" type="submit">
        설정 저장
      </button>
      <button type="button" className="secondary" onClick={onCancel}>
        돌아가기
      </button>
    </form>
  );
}

function download(raw: string) {
  const url = URL.createObjectURL(
    new Blob([raw], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "cooling-cost-preview-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const store = useLedger();
  const { data } = store;
  const today = data?.draft.date ?? koreaDate();
  const weather = useWeather(data?.settings.region ?? "seoul", today);
  const [view, setView] = useState<"home" | "setup" | "history">("home");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [message, setMessage] = useState("");
  const [recoveryAgreed, setRecoveryAgreed] = useState(false);
  const preview = data
    ? calculateCost(
        data.settings,
        data.draft.hours,
        data.draft.mode,
        weather.weather,
      )
    : 0;
  const summary = data
    ? monthlySummary(data, monthOf(today), today, preview)
    : null;
  const month = selectedMonth || monthOf(today);
  const history = data ? monthlySummary(data, month, today, preview) : null;
  const saved = data?.records[today];
  const months = data
    ? [...new Set([monthOf(today), ...Object.keys(data.records).map(monthOf)])]
        .sort()
        .reverse()
    : [];
  function success(ok: boolean, text: string) {
    setMessage(
      ok ? text : "변경사항을 저장하지 못했어요. 아래 안내를 확인해 주세요.",
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setView("home");
          }}
        >
          냉방비 미리보기<span className="version">v0.2</span>
        </a>
        {data && !store.error && (
          <button
            className="text-button"
            onClick={() => {
              setMessage("");
              setView("setup");
            }}
          >
            설정
          </button>
        )}
      </header>
      {store.error ? (
        <section className="stack recovery" aria-labelledby="recovery-title">
          <p className="eyebrow">저장 확인이 필요해요</p>
          <h1 id="recovery-title">
            기록을 보호하기 위해
            <br />
            변경을 멈췄어요.
          </h1>
          <p role="alert" className="error">
            {store.error}
          </p>
          <p>
            저장 공간이나 브라우저 권한을 확인하고 다시 불러와 주세요.
            마지막으로 저장된 데이터는 자동으로 덮어쓰지 않아요.
          </p>
          <button
            className="primary"
            onClick={() => {
              store.reload();
              setMessage("");
            }}
          >
            다시 불러오기
          </button>
          {store.raw !== null && (
            <>
              <button
                className="secondary"
                onClick={() => download(store.raw!)}
              >
                원본 데이터 내보내기
              </button>
              <label className="check">
                <input
                  type="checkbox"
                  checked={recoveryAgreed}
                  onChange={(e) => setRecoveryAgreed(e.target.checked)}
                />
                현재 데이터를 별도 백업하고 새로 시작할게요.
              </label>
              <button
                className="text-button danger"
                disabled={!recoveryAgreed}
                onClick={() => {
                  store.reset();
                  setView("home");
                  setRecoveryAgreed(false);
                }}
              >
                원본 백업 후 다시 시작
              </button>
            </>
          )}
        </section>
      ) : view === "setup" ? (
        <Setup
          key={data ? JSON.stringify(data.settings) : "new"}
          initial={data?.settings ?? defaultSettings}
          onCancel={() => setView("home")}
          onSave={(settings) => {
            const ok = store.apply((old) =>
              old
                ? changeSettings(old, settings, koreaDate())
                : createData(settings, koreaDate()),
            );
            if (ok) {
              setView("home");
              setMessage("설정을 저장했어요.");
            }
          }}
        />
      ) : !data ? (
        <section className="welcome stack">
          <div className="welcome-icon" aria-hidden="true">
            ❄
          </div>
          <p className="eyebrow">시원함은 편하게, 냉방비는 미리</p>
          <h1>
            오늘의 냉방이
            <br />한 달에 얼마나 쌓일까요?
          </h1>
          <p className="muted">
            사용시간을 바꿔 비용을 비교하고,
            <br />
            매일의 기록을 차곡차곡 모아보세요.
          </p>
          <div className="feature-list">
            <p>
              <span>01</span>우리 집 조건으로 간단하게
            </p>
            <p>
              <span>02</span>직접 기록과 자동 추정을 구분해서
            </p>
            <p>
              <span>03</span>같은 브라우저에서 이어서
            </p>
          </div>
          <button className="primary" onClick={() => setView("setup")}>
            우리 집 설정하기
          </button>
          <p className="fine">
            참고용 추정 서비스예요. 실제 전기요금 청구액과 다를 수 있어요.
          </p>
        </section>
      ) : (
        <>
          <nav className="tabs" aria-label="화면 선택">
            <button
              aria-current={view === "home" ? "page" : undefined}
              onClick={() => setView("home")}
            >
              오늘 미리보기
            </button>
            <button
              aria-current={view === "history" ? "page" : undefined}
              onClick={() => setView("history")}
            >
              월별 기록
            </button>
          </nav>
          {view === "history" && history ? (
            <section className="stack">
              <div>
                <p className="eyebrow">차곡차곡 쌓인 사용</p>
                <h1>월별 냉방 기록</h1>
              </div>
              <label>
                조회할 월
                <select
                  aria-label="조회할 월"
                  value={month}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {m.replace("-", "년 ")}월
                    </option>
                  ))}
                </select>
              </label>
              <div className="history-total">
                <span>저장된 기록 합계</span>
                <strong>{won(history.recorded + history.estimated)}</strong>
                <p className="fine">
                  직접 입력 {won(history.recorded)} · 자동 추정{" "}
                  {won(history.estimated)}
                  <br />
                  오늘 미저장 예상액은 목록 합계에 포함하지 않아요.
                </p>
              </div>
              <ul className="record-list">
                {history.rows.map((row) => (
                  <li key={row.date}>
                    <div>
                      <strong>{row.date}</strong>
                      <span className={`badge ${row.kind}`}>
                        {row.kind === "recorded" ? "직접 입력" : "자동 추정"}
                      </span>
                      <small>
                        {modeLabels[row.mode]} · {row.hours.toFixed(1)}시간 ·{" "}
                        {row.settings.room}평 ·{" "}
                        {regions[row.settings.region].name}
                        {row.weather
                          ? ` · ${row.weather.source === "live" ? "조회 날씨" : row.weather.source === "cache" ? "최근 날씨" : "예시 날씨"}`
                          : " · 중립 날씨계수"}
                      </small>
                    </div>
                    <strong>{won(row.cost)}</strong>
                  </li>
                ))}
              </ul>
              {history.rows.length === 0 && (
                <p className="note">
                  아직 저장된 기록이 없어요. 오늘 사용량을 기록해 보세요.
                </p>
              )}
              <p className="fine">
                지난 날짜의 금액은 당시 설정으로 유지돼요. 오늘 기록은 미리보기
                화면에서 수정하거나 취소할 수 있어요.
              </p>
              <button className="secondary" onClick={() => setView("home")}>
                오늘 기록 수정하기
              </button>
            </section>
          ) : (
            summary && (
              <section className="stack">
                <div className="heading">
                  <p className="eyebrow">
                    {today.replaceAll("-", ".")} · 한국 시간
                  </p>
                  <h1>
                    오늘도 시원하게,
                    <br />
                    부담은 미리 확인해요.
                  </h1>
                  <p className="muted">
                    {data.settings.room}평 · {acLabels[data.settings.ac]} ·{" "}
                    {regions[data.settings.region].name}
                  </p>
                </div>
                <section className="summary-card" aria-labelledby="month-title">
                  <p id="month-title">
                    {Number(today.slice(5, 7))}월 누적 예상 냉방비
                  </p>
                  <strong className="big-number" data-testid="month-total">
                    {won(summary.total)}
                  </strong>
                  <p className="summary-caption">
                    {saved
                      ? "오늘 저장한 금액까지 반영했어요"
                      : "오늘 미저장 예상액을 포함한 미리보기예요"}
                  </p>
                  <dl className="breakdown">
                    <div>
                      <dt>직접 입력</dt>
                      <dd>{won(summary.recorded)}</dd>
                    </div>
                    <div>
                      <dt>자동 추정</dt>
                      <dd>{won(summary.estimated)}</dd>
                    </div>
                    {!saved && (
                      <div>
                        <dt>오늘 미저장 예상</dt>
                        <dd>{won(summary.preview)}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="projection">
                    <div>
                      <span>하루 평균</span>
                      <strong>{won(summary.average)}</strong>
                    </div>
                    <div>
                      <span>이 추세라면 월말</span>
                      <strong>{won(summary.projection)}</strong>
                    </div>
                  </div>
                </section>
                <section className="weather-card" aria-label="지역 날씨">
                  <div className="row">
                    <strong>
                      {regions[data.settings.region].name} ·{" "}
                      {weather.weather.text}
                    </strong>
                    <span>
                      {weather.weather.temp}°C · 습도 {weather.weather.humidity}
                      %
                    </span>
                  </div>
                  <p className="fine">
                    {weather.loading
                      ? "날씨 조회 중 · "
                      : weather.failed
                        ? "날씨 조회 실패 · "
                        : ""}
                    {weather.weather.source === "live"
                      ? "Open-Meteo 조회값"
                      : weather.weather.source === "cache"
                        ? "최근 성공값 (24시간 이내)"
                        : "예시 날씨 사용 (실시간 아님)"}
                    {weather.weather.fetchedAt &&
                      ` · 조회 ${new Date(weather.weather.fetchedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`}
                  </p>
                  <button
                    className="text-button"
                    onClick={weather.retry}
                    disabled={weather.loading}
                  >
                    날씨 다시 조회
                  </button>
                </section>
                <section
                  className="usage-card stack"
                  aria-labelledby="today-title"
                >
                  <div className="row">
                    <h2 id="today-title">오늘 사용량</h2>
                    <span className={`badge ${saved ? "recorded" : ""}`}>
                      {saved ? "기록 저장됨" : "아직 미저장"}
                    </span>
                  </div>
                  <fieldset>
                    <legend>사용 모드</legend>
                    <div className="mode-group">
                      {Object.entries(modeLabels).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          aria-pressed={data.draft.mode === key}
                          onClick={() => {
                            setMessage("");
                            store.apply((old) =>
                              changeDraft(
                                old!,
                                old!.draft.hours,
                                key as Mode,
                                koreaDate(),
                              ),
                            );
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <label>
                    오늘 사용시간{" "}
                    <strong>{data.draft.hours.toFixed(1)}시간</strong>
                    <input
                      type="range"
                      min="0"
                      max="12"
                      step="0.5"
                      value={data.draft.hours}
                      onChange={(e) => {
                        setMessage("");
                        store.apply((old) =>
                          changeDraft(
                            old!,
                            Number(e.target.value),
                            old!.draft.mode,
                            koreaDate(),
                          ),
                        );
                      }}
                    />
                  </label>
                  <div className="range-labels">
                    <span>0시간</span>
                    <span>12시간</span>
                  </div>
                  <div className="today-cost">
                    <span>현재 입력 기준 예상액</span>
                    <strong data-testid="today-cost">약 {won(preview)}</strong>
                  </div>
                  {saved && (
                    <p className="note">
                      월 누적에는 저장한 {won(saved.cost)}이 반영돼요. 입력을
                      바꿨다면 수정 저장해 주세요.
                    </p>
                  )}
                  <button
                    className="primary"
                    onClick={() =>
                      success(
                        store.apply((old) =>
                          saveToday(old!, weather.weather, koreaDate()),
                        ),
                        saved
                          ? "오늘 기록을 수정했어요."
                          : "오늘 기록을 저장했어요.",
                      )
                    }
                  >
                    {saved ? "오늘 기록 수정 저장" : "오늘 기록 저장"}
                  </button>
                  {saved && (
                    <button
                      className="secondary"
                      onClick={() =>
                        success(
                          store.apply((old) => cancelToday(old!, koreaDate())),
                          "오늘 기록을 취소했어요. 미저장 예상액으로 돌아왔어요.",
                        )
                      }
                    >
                      오늘 기록 취소
                    </button>
                  )}
                </section>
                <details>
                  <summary>계산 기준과 데이터 보관 안내</summary>
                  <p>
                    소비전력 × 사용시간 × 모드·방 크기·날씨계수 × 260원으로
                    추정해요. 누진제, 다른 가전, 기본요금·세금은 포함하지
                    않아요. 제습·취침 모드의 절감률은 가정이며 제품별 실제
                    효율과 달라요.
                  </p>
                  <p>
                    자동 추정은 평균 사용시간과 냉방 모드, 중립 날씨계수를
                    사용해요. 월말 예상액은 이번 달 일평균을 월 전체 일수로
                    환산한 값이에요.
                  </p>
                  <p>
                    설정·기록은 이 기기의 같은 브라우저와 주소에만 저장돼요.
                    브라우저 데이터 삭제 시 사라질 수 있고, 다른 기기와
                    동기화되지 않아요.
                  </p>
                  <p>
                    날씨:{" "}
                    <a
                      href="https://open-meteo.com/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open-Meteo
                    </a>{" "}
                    ·{" "}
                    <a
                      href="https://creativecommons.org/licenses/by/4.0/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      CC BY 4.0
                    </a>
                  </p>
                </details>
              </section>
            )
          )}
          <p className="status" role="status" aria-live="polite">
            {message}
          </p>
        </>
      )}
      <footer>냉방비 미리보기 · 참고용 추정 MVP</footer>
    </main>
  );
}
