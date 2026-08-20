export type DailyHistory = {
  date: string;
  focusCycles: number;
  focusSeconds: number;
  restCycles: number;
  restSeconds: number;
};

export type DailyHistoryKind = 'focus' | 'rest';

export const DAILY_FOCUS_GOAL_SECONDS = 8 * 60 * 60;

export function createDailyHistory(date = getLocalDateKey()): DailyHistory {
  return {
    date,
    focusCycles: 0,
    focusSeconds: 0,
    restCycles: 0,
    restSeconds: 0
  };
}

export function addDailyHistoryBlock(history: DailyHistory, kind: DailyHistoryKind, seconds: number): DailyHistory {
  const blockSeconds = Math.max(0, Math.round(seconds));

  if (kind === 'rest') {
    return {
      ...history,
      restCycles: history.restCycles + 1,
      restSeconds: history.restSeconds + blockSeconds
    };
  }

  return {
    ...history,
    focusCycles: history.focusCycles + 1,
    focusSeconds: history.focusSeconds + blockSeconds
  };
}

export function formatDailyDuration(totalSeconds: number) {
  const minutes = Math.round(Math.max(0, totalSeconds) / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes}m`;
  }

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

export function getDailyHistoryMessage(focusSeconds: number) {
  if (focusSeconds >= 8 * 60 * 60) {
    return '8h queen. Time to rest now <3';
  }

  if (focusSeconds >= 7 * 60 * 60) {
    return '7h! You carried the day c:';
  }

  if (focusSeconds >= 6.25 * 60 * 60) {
    return '6h 15m! So proud of you <3';
  }

  if (focusSeconds >= 5.5 * 60 * 60) {
    return 'Strong day. Keep it gentle ;)';
  }

  return "You did good, let's aim higher tomorrow!";
}

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
