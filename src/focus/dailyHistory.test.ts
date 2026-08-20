import { describe, expect, it } from 'vitest';
import {
  addDailyHistoryBlock,
  createDailyHistory,
  formatDailyDuration,
  getDailyHistoryMessage,
  getLocalDateKey
} from './dailyHistory';

describe('daily history', () => {
  it('adds focus and rest blocks separately', () => {
    const firstFocus = addDailyHistoryBlock(createDailyHistory('2026-08-20'), 'focus', 40 * 60);
    const bonusFocus = addDailyHistoryBlock(firstFocus, 'focus', 10 * 60);
    const rest = addDailyHistoryBlock(bonusFocus, 'rest', 15 * 60);

    expect(rest).toEqual({
      date: '2026-08-20',
      focusCycles: 2,
      focusSeconds: 50 * 60,
      restCycles: 1,
      restSeconds: 15 * 60
    });
  });

  it('formats daily durations for small panel display', () => {
    expect(formatDailyDuration(25 * 60)).toBe('25m');
    expect(formatDailyDuration(6 * 60 * 60)).toBe('6h');
    expect(formatDailyDuration(6 * 60 * 60 + 15 * 60)).toBe('6h 15m');
  });

  it('uses encouraging messages at focus milestones', () => {
    expect(getDailyHistoryMessage(5 * 60 * 60)).toContain('aim higher tomorrow');
    expect(getDailyHistoryMessage(6.25 * 60 * 60)).toContain('6h 15m');
    expect(getDailyHistoryMessage(7 * 60 * 60)).toContain('7h');
    expect(getDailyHistoryMessage(8 * 60 * 60)).toContain('8h');
  });

  it('creates stable local date keys', () => {
    expect(getLocalDateKey(new Date(2026, 7, 20))).toBe('2026-08-20');
  });
});
