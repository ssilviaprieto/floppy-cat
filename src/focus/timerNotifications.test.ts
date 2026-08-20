import { describe, expect, it } from 'vitest';
import { getTimerCompletionNotification } from './timerNotifications';

describe('timer completion notifications', () => {
  it('uses the requested focus completion message', () => {
    expect(getTimerCompletionNotification('focus', 40)).toEqual({
      title: 'Floppy Cat',
      body: 'Hey! 40 minutes have passed, wanna focus a lil more? :)'
    });
  });

  it('notifies when rest blocks complete', () => {
    expect(getTimerCompletionNotification('break', 15)).toEqual({
      title: 'Floppy Cat',
      body: 'Hey! 15 rest minutes have passed, wanna focus now? :)'
    });
  });

  it('notifies when +10 bonus focus blocks complete', () => {
    expect(getTimerCompletionNotification('bonus', 10)).toEqual({
      title: 'Floppy Cat',
      body: 'Hey! 10 extra focus minutes have passed, wanna rest a lil? :)'
    });
  });

  it('rounds custom timer lengths for compact notification text', () => {
    expect(getTimerCompletionNotification('focus', 49.6).body).toContain('50 minutes');
  });
});
