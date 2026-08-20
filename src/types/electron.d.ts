export {};

declare global {
  interface Window {
    floppyCat?: {
      minimize: () => Promise<void>;
      close: () => Promise<void>;
      getWindowState: () => Promise<{
        x?: number;
        y?: number;
        width: number;
        height: number;
      }>;
      saveWindowState: (state: {
        x?: number;
        y?: number;
        width: number;
        height: number;
      }) => Promise<void>;
      notifyFocusComplete: (minutes: number) => Promise<void>;
      showTimerModeMenu: (anchor: {
        x: number;
        y: number;
        width: number;
        height: number;
        selected: 'focus' | 'break';
      }) => Promise<void>;
      hideTimerModeMenu: () => Promise<void>;
      onTimerModeSelected: (callback: (mode: 'focus' | 'break') => void) => () => void;
      onTimerModeClosed: (callback: () => void) => () => void;
    };
  }
}
