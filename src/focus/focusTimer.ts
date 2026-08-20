export type FocusTimerMode = 'focus' | 'break' | 'bonus';
export type FocusTimerStatus = 'idle' | 'running' | 'paused' | 'prompt';

export type TimerConfig = {
  focusMinutes: number;
  breakMinutes: number;
  bonusMinutes: number;
};

export type FocusTimerState = {
  mode: FocusTimerMode;
  status: FocusTimerStatus;
  remainingSeconds: number;
  totalSeconds: number;
  config: TimerConfig;
};

export type FocusTimerAction =
  | { type: 'toggle' }
  | { type: 'reset' }
  | { type: 'setMode'; mode: Extract<FocusTimerMode, 'focus' | 'break'> }
  | { type: 'tick'; seconds: number }
  | { type: 'configure'; config: TimerConfig }
  | { type: 'startFocus' }
  | { type: 'startBreak' }
  | { type: 'startBonus' };

export const FOCUS_SECONDS = 40 * 60;
export const BREAK_SECONDS = 15 * 60;
export const BONUS_SECONDS = 10 * 60;

export const DEFAULT_TIMER_CONFIG: TimerConfig = {
  focusMinutes: 40,
  breakMinutes: 15,
  bonusMinutes: 10
};

function minutesToSeconds(minutes: number) {
  return Math.max(1, Math.round(minutes)) * 60;
}

export function createFocusTimer(config = DEFAULT_TIMER_CONFIG): FocusTimerState {
  return {
    mode: 'focus',
    status: 'idle',
    remainingSeconds: getTimerTotalSeconds('focus', config),
    totalSeconds: getTimerTotalSeconds('focus', config),
    config
  };
}

export function focusTimerReducer(state: FocusTimerState, action: FocusTimerAction): FocusTimerState {
  switch (action.type) {
    case 'toggle':
      if (state.status === 'prompt') {
        return state;
      }

      return {
        ...state,
        status: state.status === 'running' ? 'paused' : 'running'
      };

    case 'reset':
      return createFocusTimer(state.config);

    case 'setMode': {
      if (state.status === 'prompt') {
        return state;
      }

      const totalSeconds = getTimerTotalSeconds(action.mode, state.config);
      const status = state.status === 'running' ? 'running' : 'idle';

      if (state.mode === action.mode && state.status !== 'paused') {
        return state;
      }

      return {
        mode: action.mode,
        status,
        remainingSeconds: totalSeconds,
        totalSeconds,
        config: state.config
      };
    }

    case 'configure': {
      const totalSeconds = getTimerTotalSeconds(state.mode, action.config);

      if (state.status === 'running' || state.status === 'prompt') {
        return {
          ...state,
          config: action.config
        };
      }

      return {
        ...state,
        remainingSeconds: totalSeconds,
        totalSeconds,
        config: action.config
      };
    }

    case 'startFocus':
      return {
        mode: 'focus',
        status: 'running',
        remainingSeconds: getTimerTotalSeconds('focus', state.config),
        totalSeconds: getTimerTotalSeconds('focus', state.config),
        config: state.config
      };

    case 'startBreak':
      return {
        mode: 'break',
        status: 'running',
        remainingSeconds: getTimerTotalSeconds('break', state.config),
        totalSeconds: getTimerTotalSeconds('break', state.config),
        config: state.config
      };

    case 'startBonus':
      return {
        mode: 'bonus',
        status: 'running',
        remainingSeconds: getTimerTotalSeconds('bonus', state.config),
        totalSeconds: getTimerTotalSeconds('bonus', state.config),
        config: state.config
      };

    case 'tick':
      if (state.status !== 'running') {
        return state;
      }

      if (state.remainingSeconds > action.seconds) {
        return {
          ...state,
          remainingSeconds: state.remainingSeconds - action.seconds
        };
      }

      return {
        ...state,
        status: 'prompt',
        remainingSeconds: 0
      };
  }
}

export function formatTimerSeconds(totalSeconds: number) {
  const clampedSeconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(clampedSeconds / 60);
  const seconds = clampedSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function getTimerTotalSeconds(timerOrMode: FocusTimerState | FocusTimerMode, config = DEFAULT_TIMER_CONFIG) {
  if (typeof timerOrMode === 'object') {
    return timerOrMode.totalSeconds;
  }

  const mode = timerOrMode;
  if (mode === 'break') {
    return minutesToSeconds(config.breakMinutes);
  }

  if (mode === 'bonus') {
    return minutesToSeconds(config.bonusMinutes);
  }

  return minutesToSeconds(config.focusMinutes);
}
