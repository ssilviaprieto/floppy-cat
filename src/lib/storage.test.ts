import { describe, expect, it } from 'vitest';
import { DEFAULT_TIMER_CONFIG } from '../focus/focusTimer';
import { clearBestScore, getBestScore, getTimerConfig, saveBestScore, saveTimerConfig, type KeyValueStore } from './storage';

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
