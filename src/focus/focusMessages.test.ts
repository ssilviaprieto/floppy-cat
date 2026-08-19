import { describe, expect, it } from 'vitest';
import { DEFAULT_TIMER_CONFIG, createFocusTimer } from './focusTimer';
import { getFocusMessage, getFocusPanelMessage } from './focusMessages';

describe('focus messages', () => {
  it('nudges when the focus timer has not started', () => {
    expect(getFocusMessage(createFocusTimer(), 0)).toBe("Let's begin focusing baby <3");
    expect(getFocusMessage(createFocusTimer(), 12)).toBe('You can do it <3');
  });

  it('celebrates when a focus block ends', () => {
    expect(
      getFocusMessage(
        {
          mode: 'focus',
          status: 'prompt',
          remainingSeconds: 0,
          totalSeconds: 40 * 60,
          config: DEFAULT_TIMER_CONFIG
        },
        0
      )
    ).toBe('Well done! I love you <3');
  });

  it('rotates encouragement while focus is running', () => {
    const running = {
      mode: 'focus' as const,
      status: 'running' as const,
      remainingSeconds: 120,
      totalSeconds: 40 * 60,
      config: DEFAULT_TIMER_CONFIG
    };

    expect(getFocusMessage(running, 0)).toBe("You're doing great!");
    expect(getFocusMessage(running, 18)).toBe('Keep it going ;)');
    expect(getFocusMessage(running, 90)).toBe('Write the tiny list :3');
  });

  it('nudges back to focus after five minutes of playing', () => {
    expect(getFocusPanelMessage(createFocusTimer(), 0, 5 * 60)).toBe('Ready to get back focusing baby? :3');
  });

  it('keeps the completion message more important than the play nudge', () => {
    expect(
      getFocusPanelMessage(
        {
          mode: 'focus',
          status: 'prompt',
          remainingSeconds: 0,
          totalSeconds: 40 * 60,
          config: DEFAULT_TIMER_CONFIG
        },
        0,
        5 * 60
      )
    ).toBe('Well done! I love you <3');
  });
});
