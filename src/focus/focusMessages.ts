import type { FocusTimerState } from './focusTimer';

const START_MESSAGES = [
  "Let's begin focusing baby <3",
  'You can do it <3',
  "You're smart, let's do it c:",
  'Pick one tiny task :3',
  'Write it down, then begin'
];

const RUNNING_MESSAGES = [
  "You're doing great!",
  'Keep it going ;)',
  'Tiny steps count :3',
  'Stay with it c:',
  'Almost cozy focus mode',
  'Write the tiny list :3',
  'One task at a time c:',
  'Pick the next small step',
  'Brain too full? write it',
  'You are doing enough <3'
];

export function getFocusMessage(timer: FocusTimerState, elapsedSeconds: number) {
  if (timer.status === 'prompt') {
    return 'Well done! I love you <3';
  }

  if (timer.status === 'idle') {
    return START_MESSAGES[Math.floor(elapsedSeconds / 12) % START_MESSAGES.length];
  }

  if (timer.status === 'paused') {
    return START_MESSAGES[Math.floor(elapsedSeconds / 12) % START_MESSAGES.length];
  }

  if (timer.mode === 'break') {
    return 'Rest your brain c:';
  }

  const messageIndex = Math.floor(elapsedSeconds / 18) % RUNNING_MESSAGES.length;
  return RUNNING_MESSAGES[messageIndex];
}

export function getFocusPanelMessage(timer: FocusTimerState, elapsedSeconds: number, playSeconds: number) {
  if (timer.status !== 'prompt' && playSeconds >= 5 * 60) {
    return 'Ready to get back focusing baby? :3';
  }

  return getFocusMessage(timer, elapsedSeconds);
}
