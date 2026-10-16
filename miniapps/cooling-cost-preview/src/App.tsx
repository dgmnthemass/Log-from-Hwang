import { useEffect, useMemo, useState } from "react";
import "./App.css";

type View = "welcome" | "setup" | "home";
type AcType = "wall" | "stand" | "window" | "portable" | "unknown";
type Mode = "cool" | "dry" | "sleep";
type RegionKey =
  | "seoul"
  | "gyeonggi"
  | "incheon"
  | "busan"
  | "daegu"
  | "daejeon"
  | "gwangju"
  | "ulsan"
  | "sejong"
  | "gangwon"
  | "chungbuk"
  | "chungnam"
  | "jeonbuk"
  | "jeonnam"
  | "gyeongbuk"
  | "gyeongnam"
  | "jeju";

interface Weather {
  text: string;
  temp: number;
  humidity: number;
}

interface Region {
  name: string;
  lat: number;
  lon: number;
  fallback: Weather;
}

const BLUE = "#0064FF";

const regionMap: Record<RegionKey, Region> = {
  seoul: { name: "서울", lat: 37.5665, lon: 126.978, fallback: { text: "맑음", temp: 31, humidity: 68 } },
  gyeonggi: { name: "경기", lat: 37.2636, lon: 127.0286, fallback: { text: "구름 조금", temp: 31, humidity: 66 } },
  incheon: { name: "인천", lat: 37.4563, lon: 126.7052, fallback: { text: "구름 조금", temp: 29, humidity: 72 } },
  busan: { name: "부산", lat: 35.1796, lon: 129.0756, fallback: { text: "흐림", temp: 29, humidity: 73 } },
  daegu: { name: "대구", lat: 35.8714, lon: 128.6014, fallback: { text: "폭염", temp: 34, humidity: 58 } },
  daejeon: { name: "대전", lat: 36.3504, lon: 127.3845, fallback: { text: "맑음", temp: 32, humidity: 63 } },
  gwangju: { name: "광주", lat: 35.1595, lon: 126.8526, fallback: { text: "구름 많음", temp: 30, humidity: 70 } },
  ulsan: { name: "울산", lat: 35.5384, lon: 129.3114, fallback: { text: "흐림", temp: 30, humidity: 71 } },
  sejong: { name: "세종", lat: 36.48, lon: 127.289, fallback: { text: "맑음", temp: 31, humidity: 64 } },
  gangwon: { name: "강원", lat: 37.8813, lon: 127.7298, fallback: { text: "구름 조금", temp: 29, humidity: 67 } },
  chungbuk: { name: "충북", lat: 36.6424, lon: 127.489, fallback: { text: "맑음", temp: 32, humidity: 62 } },
  chungnam: { name: "충남", lat: 36.8151, lon: 127.1139, fallback: { text: "구름 많음", temp: 31, humidity: 68 } },
  jeonbuk: { name: "전북", lat: 35.8242, lon: 127.148, fallback: { text: "구름 많음", temp: 31, humidity: 69 } },
  jeonnam: { name: "전남", lat: 34.8118, lon: 126.3922, fallback: { text: "비", temp: 29, humidity: 78 } },
  gyeongbuk: { name: "경북", lat: 36.019, lon: 129.3435, fallback: { text: "맑음", temp: 33, humidity: 61 } },
  gyeongnam: { name: "경남", lat: 35.2281, lon: 128.6811, fallback: { text: "흐림", temp: 30, humidity: 72 } },
  jeju: { name: "제주", lat: 33.4996, lon: 126.5312, fallback: { text: "비", temp: 28, humidity: 82 } },
};

const weatherCodeText: Record<number, string> = {
  0: "맑음",
  1: "맑음",
  2: "구름 조금",
  3: "흐림",
  45: "안개",
  48: "안개",
  51: "이슬비",
  53: "이슬비",
  55: "이슬비",
  61: "비",
  63: "비",
  65: "강한 비",
  71: "눈",
  80: "소나기",
  81: "소나기",
  82: "강한 소나기",
  95: "뇌우",
};

const acWatts: Record<AcType, number> = {
  wall: 0.65,
  stand: 1.8,
  window: 0.75,
  portable: 0.9,
  unknown: 0.65,
};

const acLabel: Record<AcType, string> = {
  wall: "벽걸이형",
  stand: "스탠드형",
  window: "창문형",
  portable: "이동식",
  unknown: "잘 모르겠어요",
};

const modeFactor: Record<Mode, number> = {
  cool: 1,
  dry: 0.72,
  sleep: 0.58,
};

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatApproxWon(value: number) {
  return `약 ${formatWon(value)}`;
}

function formatHours(value: number) {
  return value.toFixed(1);
}

function weatherEmoji(text: string, temp: number) {
  if (text.includes("뇌우")) return "⛈️";
  if (text.includes("비") || text.includes("소나기")) return "🌧️";
  if (text.includes("눈")) return "❄️";
  if (text.includes("안개")) return "🌫️";
  if (text.includes("흐림")) return "☁️";
  if (text.includes("구름")) return "⛅";
  if (temp >= 33) return "☀️";
  return "🌤️";
}

function App() {
  const [view, setView] = useState<View>("welcome");
  const [room, setRoom] = useState(7);
  const [customRoomOpen, setCustomRoomOpen] = useState(false);
  const [ac, setAc] = useState<AcType>("wall");
  const [regionKey, setRegionKey] = useState<RegionKey>("seoul");
  const [hours, setHours] = useState(6);
  const [averageHours, setAverageHours] = useState(4);
  const [mode, setMode] = useState<Mode>("cool");
  const [monthlyUsed, setMonthlyUsed] = useState(0);
  const [lastConfirmedCost, setLastConfirmedCost] = useState(0);
  const [todayRecorded, setTodayRecorded] = useState(false);
  const [weather, setWeather] = useState<Weather>(regionMap.seoul.fallback);
  const [weatherSource, setWeatherSource] = useState("서울 기준 날씨를 불러오는 중");
  const [toast, setToast] = useState("");

  const calculateCost = (targetHours = hours) => {
    const roomFactor = 0.86 + (room / 10) * 0.18;
    const humidityFactor = weather.humidity >= 75 ? 1.08 : weather.humidity <= 55 ? 0.96 : 1;
    const tempFactor = weather.temp >= 33 ? 1.12 : weather.temp >= 30 ? 1.04 : 0.98;
    const kwh = acWatts[ac] * targetHours * modeFactor[mode] * roomFactor * humidityFactor * tempFactor;

    return Math.max(0, kwh * 260);
  };

  const numbers = useMemo(() => {
    const todayCost = calculateCost();
    const reflected = monthlyUsed + (todayRecorded ? 0 : todayCost);
    const today = new Date();
    const dayOfMonth = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dailyAverage = reflected / Math.max(1, dayOfMonth);
    const monthProjection = dailyAverage * daysInMonth;
    const monthProgress = (dayOfMonth / daysInMonth) * 100;

    return { todayCost, reflected, dayOfMonth, dailyAverage, monthProjection, monthProgress };
  }, [monthlyUsed, todayRecorded, hours, room, ac, mode, weather]);

  useEffect(() => {
    const region = regionMap[regionKey];
    let ignored = false;

    async function loadWeather() {
      setWeatherSource(`${region.name} 기준 날씨를 불러오는 중`);
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${region.lat}&longitude=${region.lon}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=Asia%2FSeoul`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("weather failed");
        const data = await response.json();
        const current = data.current;
        if (ignored) return;
        setWeather({
          text: weatherCodeText[current.weather_code] ?? "날씨 확인",
          temp: Math.round(current.temperature_2m),
          humidity: Math.round(current.relative_humidity_2m),
        });
        setWeatherSource(`${region.name} 기준 · Open-Meteo API`);
      } catch {
        if (ignored) return;
        setWeather(region.fallback);
        setWeatherSource(`${region.name} 기준 · API 실패 시 목업값`);
      }
    }

    void loadWeather();

    return () => {
      ignored = true;
    };
  }, [regionKey]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  function completeSetup() {
    const today = new Date();
    const daysElapsed = Math.max(0, today.getDate() - 1);
    setMonthlyUsed(calculateCost(averageHours) * daysElapsed);
    setTodayRecorded(false);
    setLastConfirmedCost(0);
    setView("home");
  }

  function confirmUse() {
    if (todayRecorded) {
      showToast("오늘 사용 기록은 이미 반영했어요.");
      return;
    }
    const cost = calculateCost();
    setMonthlyUsed((prev) => prev + cost);
    setLastConfirmedCost(cost);
    setTodayRecorded(true);
    showToast("오늘 예상 냉방비를 이번 달 누적 사용액에 반영했어요.");
  }

  function undoUse() {
    if (lastConfirmedCost <= 0) {
      showToast("되돌릴 사용 기록이 없어요.");
      return;
    }
    setMonthlyUsed((prev) => Math.max(0, prev - lastConfirmedCost));
    setLastConfirmedCost(0);
    setTodayRecorded(false);
    showToast("방금 반영한 사용 기록을 되돌렸어요.");
  }

  function usageMessage() {
    if (numbers.dailyAverage < 1500) return "아직은 낮은 사용 패턴이에요.";
    if (numbers.dailyAverage < 3000) return "냉방비가 하루 단위로 꾸준히 쌓이고 있어요.";
    return "최근 패턴이면 월말 냉방비가 크게 쌓일 수 있어요.";
  }

  return (
    <main className={`app-shell ${view === "welcome" ? "welcome-mode" : ""}`}>
      {view !== "welcome" && (
        <header className="topbar">
          <strong>냉방비 미리보기</strong>
          <button type="button" className="mini-action" onClick={() => setView("setup")}>
            설정 수정
          </button>
        </header>
      )}

      {view === "welcome" && (
        <section className="welcome-screen">
          <div className="welcome-hero">
            <div className="welcome-icon" aria-hidden>
              ❄
            </div>
            <h1>
              오늘 에어컨 이만큼 써도
              <br />
              전기세 괜찮을까?
            </h1>
            <p>
              이번 달 냉방비가
              <br />
              얼마나 쌓이는지 알려드려요
            </p>
          </div>
          <button type="button" className="primary" onClick={() => setView("setup")}>
            시작하기
          </button>
        </section>
      )}

      {view === "setup" && (
        <section className="setup-screen">
          <div className="setup-content">
            <h1 className="page-title">기본 환경 설정</h1>

            <section className="field-section">
              <h2>방 크기</h2>
              <div className="chips">
                {[
                  [5, "5평 이하"],
                  [7, "6~8평"],
                  [10.5, "9~12평"],
                  [14, "13평 이상"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={`chip ${room === value && !customRoomOpen ? "selected" : ""}`}
                    onClick={() => {
                      setRoom(Number(value));
                      setCustomRoomOpen(false);
                    }}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  className={`chip ghost wide ${customRoomOpen ? "selected" : ""}`}
                  onClick={() => setCustomRoomOpen(true)}
                >
                  직접 입력
                </button>
              </div>
              {customRoomOpen && (
                <input
                  className="custom-input"
                  inputMode="decimal"
                  max={60}
                  min={1}
                  step={0.5}
                  type="number"
                  value={room}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (value > 0) setRoom(value);
                  }}
                />
              )}
            </section>

            <section className="field-section">
              <h2>에어컨 타입</h2>
              <div className="chips">
                {(Object.keys(acLabel) as AcType[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`chip ${ac === key ? "selected" : ""} ${key === "unknown" ? "ghost" : ""}`}
                    onClick={() => setAc(key)}
                  >
                    {acLabel[key]}
                  </button>
                ))}
              </div>
            </section>

            <section className="field-section setup-average">
              <h2>최근 일주일간 하루 평균 몇 시간 트셨나요?</h2>
              <p>이번 달 누적 사용액을 추정하기 위해 필요해요.</p>
              <div className="range-value">
                <span>0시간</span>
                <strong>{formatHours(averageHours)}시간</strong>
                <span>12시간+</span>
              </div>
              <input
                className="range"
                max={12}
                min={0}
                step={0.5}
                type="range"
                value={averageHours}
                onChange={(event) => setAverageHours(Number(event.target.value))}
                style={{
                  background: `linear-gradient(to right, ${BLUE} 0%, ${BLUE} ${
                    (averageHours / 12) * 100
                  }%, #d1d6de ${(averageHours / 12) * 100}%, #d1d6de 100%)`,
                }}
              />
            </section>
          </div>
          <button type="button" className="primary" onClick={completeSetup}>
            설정 완료
          </button>
        </section>
      )}

      {view === "home" && (
        <section className="home-screen">
          <div className="today-panel">
            <section className="weather-card">
              <div className="card-head">
                <span>오늘의 날씨</span>
                <select value={regionKey} onChange={(event) => setRegionKey(event.target.value as RegionKey)}>
                  {(Object.keys(regionMap) as RegionKey[]).map((key) => (
                    <option key={key} value={key}>
                      {regionMap[key].name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="weather-main">
                <span aria-hidden>{weatherEmoji(weather.text, weather.temp)}</span>
                <strong>{weather.temp}℃</strong>
                <em>|</em>
                <b>습도 {weather.humidity}%</b>
              </div>
              <small>{weatherSource}</small>
            </section>

            <section className="usage-card">
              <h2>오늘은 얼마나 켤까요?</h2>
              <strong className="hours-display">{formatHours(hours)}시간</strong>
              <input
                className="range"
                max={12}
                min={0}
                step={0.5}
                type="range"
                value={hours}
                onChange={(event) => setHours(Number(event.target.value))}
                style={{
                  background: `linear-gradient(to right, ${BLUE} 0%, ${BLUE} ${(hours / 12) * 100}%, #e5e8eb ${
                    (hours / 12) * 100
                  }%, #e5e8eb 100%)`,
                }}
              />
              <div className="range-labels">
                <span>0</span>
                <span>4</span>
                <span>8</span>
                <span>12시간</span>
              </div>
              <p className="today-cost">
                예상: <strong>{formatApproxWon(numbers.todayCost)}</strong>
              </p>

              <h3>사용 모드</h3>
              <div className="chips three">
                {[
                  ["cool", "냉방"],
                  ["dry", "제습"],
                  ["sleep", "취침"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`chip mode-chip ${mode === key ? "selected" : ""}`}
                    onClick={() => setMode(key as Mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            <p className="state-copy">{usageMessage()}</p>
            <div className="confirm-row">
              <button type="button" className="primary" onClick={confirmUse}>
                오늘 사용 기록에 반영
              </button>
              <button type="button" className="secondary" onClick={undoUse}>
                되돌리기
              </button>
            </div>
            <p className="notice">
              실제 전기요금은 누진제, 집 전체 사용량, 에어컨 소비전력, 설정 온도, 단열 상태에 따라 달라질 수
              있어요. 이 결과는 냉방비 관리를 위한 참고용 예상 금액이에요.
            </p>
          </div>

          <section className="monthly-panel">
            <div className="cumulative-title">이번 달 누적 사용 추정액</div>
            <div className="cumulative-amount">{formatWon(numbers.reflected)}</div>
            <div className="cumulative-caption">
              오늘 포함 지난날 평균 {formatWon(numbers.dailyAverage)}씩 쌓이고 있어요
            </div>
            <div className="cumulative-bar">
              <div className="cumulative-fill" style={{ width: `${Math.min(100, numbers.monthProgress)}%` }} />
              <div className="cumulative-dot" />
            </div>
            <div className="cumulative-foot">
              <span>{numbers.dayOfMonth}일째</span>
              <span>이대로면 월말 약 {formatWon(numbers.monthProjection)}</span>
            </div>
          </section>
        </section>
      )}

      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

export default App;
