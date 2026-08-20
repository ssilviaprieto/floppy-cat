import { describe, expect, it } from 'vitest';
import { createDailyHistory } from '../focus/dailyHistory';
import { DEFAULT_TIMER_CONFIG } from '../focus/focusTimer';
import {
  clearBestScore,
  getBestScore,
  getDailyHistory,
  getTimerConfig,
  saveBestScore,
  saveDailyHistory,
  saveTimerConfig,
  type KeyValueStore
} from './storage';

function createStore(): KeyValueStore {
  const data = new Map<string, string>();

  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    }
  };
}

describe('best score storage', () => {
  it('defaults to zero for missing or invalid values', () => {
    const store = createStore();

    expect(getBestScore(store)).toBe(0);
    store.setItem('floppy-cat:best-score', 'nope');
    expect(getBestScore(store)).toBe(0);
  });

  it('keeps the highest saved score', () => {
    const store = createStore();

    expect(saveBestScore(3, store)).toBe(3);
    expect(saveBestScore(2, store)).toBe(3);
    expect(saveBestScore(8, store)).toBe(8);
    expect(getBestScore(store)).toBe(8);
  });

  it('can clear the saved score', () => {
    const store = createStore();

    saveBestScore(5, store);
    clearBestScore(store);

    expect(getBestScore(store)).toBe(0);
  });
});

describe('timer config storage', () => {
  it('defaults to the standard pomodoro durations', () => {
    const store = createStore();

    expect(getTimerConfig(store)).toEqual(DEFAULT_TIMER_CONFIG);
  });

  it('saves normalized minute durations', () => {
    const store = createStore();

    expect(
      saveTimerConfig(
        {
          focusMinutes: 50.4,
          breakMinutes: 15,
          bonusMinutes: 0
        },
        store
      )
    ).toEqual({
      focusMinutes: 50,
      breakMinutes: 15,
      bonusMinutes: 1
    });
    expect(getTimerConfig(store)).toEqual({
      focusMinutes: 50,
      breakMinutes: 15,
      bonusMinutes: 1
    });
  });

  it('ignores invalid saved config', () => {
    const store = createStore();

    store.setItem('floppy-cat:timer-config', '{');
    expect(getTimerConfig(store)).toEqual(DEFAULT_TIMER_CONFIG);
  });
});

describe('daily history storage', () => {
  it('defaults to an empty history for today', () => {
    const store = createStore();

    expect(getDailyHistory(store, '2026-08-20')).toEqual(createDailyHistory('2026-08-20'));
  });

  it('saves and reads today history', () => {
    const store = createStore();
    const history = {
      date: '2026-08-20',
      focusCycles: 2,
      focusSeconds: 3000,
      restCycles: 1,
      restSeconds: 900
    };

    expect(saveDailyHistory(history, store)).toEqual(history);
    expect(getDailyHistory(store, '2026-08-20')).toEqual(history);
  });

  it('does not carry yesterday into today', () => {
    const store = createStore();
    saveDailyHistory(
      {
        date: '2026-08-19',
        focusCycles: 8,
        focusSeconds: 20_000,
        restCycles: 4,
        restSeconds: 3600
      },
      store
    );

    expect(getDailyHistory(store, '2026-08-20')).toEqual(createDailyHistory('2026-08-20'));
  });
});
