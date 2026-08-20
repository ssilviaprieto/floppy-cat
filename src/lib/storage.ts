import { DEFAULT_TIMER_CONFIG, type TimerConfig } from '../focus/focusTimer';
import { createDailyHistory, getLocalDateKey, type DailyHistory } from '../focus/dailyHistory';

export type KeyValueStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const BEST_SCORE_KEY = 'floppy-cat:best-score';
const TIMER_CONFIG_KEY = 'floppy-cat:timer-config';
const DAILY_HISTORY_KEY = 'floppy-cat:daily-history';
const MIN_TIMER_MINUTES = 1;
const MAX_TIMER_MINUTES = 180;

export function getBestScore(store: KeyValueStore = window.localStorage) {
  const raw = store.getItem(BEST_SCORE_KEY);
  const parsed = raw === null ? 0 : Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function saveBestScore(score: number, store: KeyValueStore = window.localStorage) {
  const currentBest = getBestScore(store);
  const nextBest = Math.max(currentBest, Math.floor(score));
  store.setItem(BEST_SCORE_KEY, String(nextBest));
  return nextBest;
}

export function clearBestScore(store: KeyValueStore = window.localStorage) {
  store.removeItem(BEST_SCORE_KEY);
}

function normalizeTimerMinutes(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(MAX_TIMER_MINUTES, Math.max(MIN_TIMER_MINUTES, Math.round(parsed)));
}

export function normalizeTimerConfig(config: Partial<TimerConfig> = {}): TimerConfig {
  return {
    focusMinutes: normalizeTimerMinutes(config.focusMinutes, DEFAULT_TIMER_CONFIG.focusMinutes),
    breakMinutes: normalizeTimerMinutes(config.breakMinutes, DEFAULT_TIMER_CONFIG.breakMinutes),
    bonusMinutes: normalizeTimerMinutes(config.bonusMinutes, DEFAULT_TIMER_CONFIG.bonusMinutes)
  };
}

export function getTimerConfig(store: KeyValueStore = window.localStorage) {
  const raw = store.getItem(TIMER_CONFIG_KEY);
  if (raw === null) {
    return DEFAULT_TIMER_CONFIG;
  }

  try {
    return normalizeTimerConfig(JSON.parse(raw) as Partial<TimerConfig>);
  } catch {
    return DEFAULT_TIMER_CONFIG;
  }
}

export function saveTimerConfig(config: Partial<TimerConfig>, store: KeyValueStore = window.localStorage) {
  const normalizedConfig = normalizeTimerConfig(config);
  store.setItem(TIMER_CONFIG_KEY, JSON.stringify(normalizedConfig));
  return normalizedConfig;
}

function normalizeDailyHistory(history: Partial<DailyHistory>, today = getLocalDateKey()): DailyHistory {
  if (history.date !== today) {
    return createDailyHistory(today);
  }

  return {
    date: today,
    focusCycles: normalizeHistoryCount(history.focusCycles),
    focusSeconds: normalizeHistoryCount(history.focusSeconds),
    restCycles: normalizeHistoryCount(history.restCycles),
    restSeconds: normalizeHistoryCount(history.restSeconds)
  };
}

function normalizeHistoryCount(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export function getDailyHistory(store: KeyValueStore = window.localStorage, today = getLocalDateKey()) {
  const raw = store.getItem(DAILY_HISTORY_KEY);
  if (raw === null) {
    return createDailyHistory(today);
  }

  try {
    return normalizeDailyHistory(JSON.parse(raw) as Partial<DailyHistory>, today);
  } catch {
    return createDailyHistory(today);
  }
}

export function saveDailyHistory(history: DailyHistory, store: KeyValueStore = window.localStorage) {
  const normalizedHistory = normalizeDailyHistory(history, history.date);
  store.setItem(DAILY_HISTORY_KEY, JSON.stringify(normalizedHistory));
  return normalizedHistory;
}
