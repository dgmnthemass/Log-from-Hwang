import { useCallback, useEffect, useRef, useState } from "react";
import { koreaDate } from "./dates.ts";
import { reconcile } from "./ledger.ts";
import type { AppData } from "./model.ts";
import type { RegionKey } from "./regions.ts";
import { LocalRepository, STORAGE_KEY } from "./storage.ts";
import {
  cacheWeather,
  exampleWeather,
  fallbackWeather,
  fetchWeather,
} from "./weather.ts";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "저장소에 접근할 수 없어요.";
}
export function useLedger() {
  const [repository] = useState(
    () => new LocalRepository(() => window.localStorage),
  );
  const [initial] = useState(() => {
    try {
      return { data: repository.load(), error: "" };
    } catch (e) {
      return { data: null, error: errorMessage(e) };
    }
  });
  const [data, setData] = useState(initial.data);
  const [error, setError] = useState(initial.error);
  const current = useRef(data);
  const blocked = useRef(Boolean(initial.error));
  const fail = useCallback((e: unknown) => {
    blocked.current = true;
    setError(errorMessage(e));
  }, []);
  const apply = useCallback(
    (change: (data: AppData | null) => AppData): boolean => {
      if (blocked.current) return false;
      try {
        const next = change(current.current);
        if (next !== current.current) repository.save(next);
        current.current = next;
        setData(next);
        return true;
      } catch (e) {
        fail(e);
        return false;
      }
    },
    [repository, fail],
  );
  const reload = () => {
    try {
      const saved = repository.load();
      const next = saved ? reconcile(saved, koreaDate()) : null;
      if (next && next !== saved) repository.save(next);
      current.current = next;
      blocked.current = false;
      setData(next);
      setError("");
    } catch (e) {
      fail(e);
    }
  };
  const reset = () => {
    try {
      repository.backupAndReset();
      current.current = null;
      blocked.current = false;
      setData(null);
      setError("");
    } catch (e) {
      fail(e);
    }
  };
  useEffect(() => {
    const sync = () => {
      if (current.current) apply((d) => reconcile(d!, koreaDate()));
    };
    sync();
    const today = koreaDate();
    const untilMidnight =
      new Date(`${today}T00:00:00+09:00`).getTime() +
      86400000 -
      Date.now() +
      50;
    const timeout = window.setTimeout(sync, Math.max(50, untilMidnight));
    const interval = window.setInterval(sync, 30000);
    const storageChanged = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null)
        fail(
          new Error(
            "다른 탭에서 저장 데이터가 바뀌었어요. 다시 불러와 주세요.",
          ),
        );
    };
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("storage", storageChanged);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("storage", storageChanged);
    };
  }, [apply, fail, data?.draft.date]);
  return { data, error, apply, reload, reset, raw: repository.raw };
}

export function useWeather(region: RegionKey, date: string) {
  const [request, setRequest] = useState(0);
  const [state, setState] = useState({
    weather: exampleWeather(region),
    loading: true,
    failed: false,
  });
  useEffect(() => {
    const controller = new AbortController();
    const fallback = fallbackWeather(region, () => window.localStorage);
    setState({ weather: fallback, loading: true, failed: false });
    void fetchWeather(region, controller.signal)
      .then((weather) => {
        if (controller.signal.aborted) return;
        cacheWeather(weather, () => window.localStorage);
        setState({ weather, loading: false, failed: false });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({ weather: fallback, loading: false, failed: true });
      });
    return () => controller.abort();
  }, [region, date, request]);
  useEffect(() => {
    const id = setInterval(() => setRequest((v) => v + 1), 30 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return {
    ...(state.weather.region === region
      ? state
      : { weather: exampleWeather(region), loading: true, failed: false }),
    retry: () => setRequest((v) => v + 1),
  };
}
