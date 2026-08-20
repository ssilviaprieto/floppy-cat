import type { FocusTimerMode } from './focusTimer';

export type TimerNotificationPayload = {
  title: string;
  body: string;
};

export function getTimerCompletionNotification(mode: FocusTimerMode, minutes: number): TimerNotificationPayload {
  const roundedMinutes = Number.isFinite(minutes) ? Math.max(1, Math.round(minutes)) : 1;

  if (mode === 'break') {
    return {
      title: 'Floppy Cat',
      body: `Hey! ${roundedMinutes} rest minutes have passed, wanna focus now? :)`
    };
  }

  if (mode === 'bonus') {
    return {
      title: 'Floppy Cat',
      body: `Hey! ${roundedMinutes} extra focus minutes have passed, wanna rest a lil? :)`
    };
  }

  return {
    title: 'Floppy Cat',
    body: `Hey! ${roundedMinutes} minutes have passed, wanna focus a lil more? :)`
  };
}
