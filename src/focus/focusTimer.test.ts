import { describe, expect, it } from 'vitest';
import {
  BONUS_SECONDS,
  BREAK_SECONDS,
  DEFAULT_TIMER_CONFIG,
  FOCUS_SECONDS,
  type TimerConfig,
  createFocusTimer,
  focusTimerReducer,
  formatTimerSeconds,
  getTimerTotalSeconds
} from './focusTimer';

describe('focus timer', () => {
  const customConfig: TimerConfig = {
    focusMinutes: 50,
    breakMinutes: 12,
    bonusMinutes: 7
  };

  it('starts as a 40 minute focus timer', () => {
    expect(createFocusTimer()).toEqual({
      mode: 'focus',
      status: 'idle',
      remainingSeconds: FOCUS_SECONDS,
      totalSeconds: FOCUS_SECONDS,
      config: DEFAULT_TIMER_CONFIG
    });
  });

  it('can start with custom timer settings', () => {
    expect(createFocusTimer(customConfig)).toEqual({
      mode: 'focus',
      status: 'idle',
      remainingSeconds: 50 * 60,
      totalSeconds: 50 * 60,
      config: customConfig
    });
  });

  it('toggles between running and paused', () => {
    const running = focusTimerReducer(createFocusTimer(), { type: 'toggle' });
    expect(running.status).toBe('running');

    const paused = focusTimerReducer(running, { type: 'toggle' });
    expect(paused.status).toBe('paused');
  });

  it('prompts for rest or bonus time when focus ends', () => {
    const almostDone = {
      mode: 'focus' as const,
      status: 'running' as const,
      remainingSeconds: 3,
      totalSeconds: FOCUS_SECONDS,
      config: DEFAULT_TIMER_CONFIG
    };

    expect(focusTimerReducer(almostDone, { type: 'tick', seconds: 3 })).toEqual({
      mode: 'focus',
      status: 'prompt',
      remainingSeconds: 0,
      totalSeconds: FOCUS_SECONDS,
      config: DEFAULT_TIMER_CONFIG
    });
  });

  it('can choose a rest timer before focus starts', () => {
    expect(focusTimerReducer(createFocusTimer(), { type: 'setMode', mode: 'break' })).toEqual({
      mode: 'break',
      status: 'idle',
      remainingSeconds: BREAK_SECONDS,
      totalSeconds: BREAK_SECONDS,
      config: DEFAULT_TIMER_CONFIG
    });
  });

  it('can switch to rest while actively running', () => {
    const running = focusTimerReducer(createFocusTimer(), { type: 'toggle' });

    expect(focusTimerReducer(running, { type: 'setMode', mode: 'break' })).toEqual({
      mode: 'break',
      status: 'running',
      remainingSeconds: BREAK_SECONDS,
      totalSeconds: BREAK_SECONDS,
      config: DEFAULT_TIMER_CONFIG
    });
  });

  it('can start break and bonus timers from the prompt', () => {
    expect(focusTimerReducer(createFocusTimer(), { type: 'startFocus' })).toEqual({
      mode: 'focus',
      status: 'running',
      remainingSeconds: FOCUS_SECONDS,
      totalSeconds: FOCUS_SECONDS,
      config: DEFAULT_TIMER_CONFIG
    });

    expect(focusTimerReducer(createFocusTimer(), { type: 'startBreak' })).toEqual({
      mode: 'break',
      status: 'running',
      remainingSeconds: BREAK_SECONDS,
      totalSeconds: BREAK_SECONDS,
      config: DEFAULT_TIMER_CONFIG
    });

    expect(focusTimerReducer(createFocusTimer(), { type: 'startBonus' })).toEqual({
      mode: 'bonus',
      status: 'running',
      remainingSeconds: BONUS_SECONDS,
      totalSeconds: BONUS_SECONDS,
      config: DEFAULT_TIMER_CONFIG
    });
  });

  it('uses configured durations when switching modes', () => {
    const configured = focusTimerReducer(createFocusTimer(), { type: 'configure', config: customConfig });

    expect(configured).toMatchObject({
      remainingSeconds: 50 * 60,
      totalSeconds: 50 * 60,
      config: customConfig
    });
    expect(focusTimerReducer(configured, { type: 'setMode', mode: 'break' })).toMatchObject({
      mode: 'break',
      remainingSeconds: 12 * 60,
      totalSeconds: 12 * 60
    });
    expect(focusTimerReducer(configured, { type: 'startBonus' })).toMatchObject({
      mode: 'bonus',
      remainingSeconds: 7 * 60,
      totalSeconds: 7 * 60
    });
    expect(focusTimerReducer(configured, { type: 'startFocus' })).toMatchObject({
      mode: 'focus',
      remainingSeconds: 50 * 60,
      totalSeconds: 50 * 60
    });
  });

  it('does not disrupt the remaining time of a running block when config changes', () => {
    const running = focusTimerReducer(createFocusTimer(), { type: 'toggle' });
    const configured = focusTimerReducer(running, { type: 'configure', config: customConfig });

    expect(configured).toMatchObject({
      status: 'running',
      remainingSeconds: FOCUS_SECONDS,
      totalSeconds: FOCUS_SECONDS,
      config: customConfig
    });
  });

  it('prompts after a break completes so the next block can be chosen', () => {
    const breakDone = focusTimerReducer(
      {
        mode: 'break',
        status: 'running',
        remainingSeconds: 2,
        totalSeconds: BREAK_SECONDS,
        config: DEFAULT_TIMER_CONFIG
      },
      { type: 'tick', seconds: 2 }
    );

    expect(breakDone).toEqual({
      mode: 'break',
      status: 'prompt',
      remainingSeconds: 0,
      totalSeconds: BREAK_SECONDS,
      config: DEFAULT_TIMER_CONFIG
    });
  });

  it('prompts after a bonus focus block completes', () => {
    const bonusDone = focusTimerReducer(
      {
        mode: 'bonus',
        status: 'running',
        remainingSeconds: 2,
        totalSeconds: BONUS_SECONDS,
        config: DEFAULT_TIMER_CONFIG
      },
      { type: 'tick', seconds: 2 }
    );

    expect(bonusDone).toEqual({
      mode: 'bonus',
      status: 'prompt',
      remainingSeconds: 0,
      totalSeconds: BONUS_SECONDS,
      config: DEFAULT_TIMER_CONFIG
    });
  });

  it('formats timer text compactly', () => {
    expect(formatTimerSeconds(2400)).toBe('40:00');
    expect(formatTimerSeconds(65)).toBe('1:05');
    expect(formatTimerSeconds(0.2)).toBe('0:01');
  });

  it('reports total seconds for each mode', () => {
    expect(getTimerTotalSeconds('focus')).toBe(FOCUS_SECONDS);
    expect(getTimerTotalSeconds('break')).toBe(BREAK_SECONDS);
    expect(getTimerTotalSeconds('bonus')).toBe(BONUS_SECONDS);
    expect(getTimerTotalSeconds('focus', customConfig)).toBe(50 * 60);
    expect(getTimerTotalSeconds(createFocusTimer())).toBe(FOCUS_SECONDS);
  });
});
