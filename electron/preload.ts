import { contextBridge, ipcRenderer } from 'electron';

export type FloppyCatWindowState = {
  x?: number;
  y?: number;
  width: number;
  height: number;
};

export type TimerModeMenuAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
  selected: 'focus' | 'break';
};

export type TimerNotificationPayload = {
  title: string;
  body: string;
};

contextBridge.exposeInMainWorld('floppyCat', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
  getWindowState: () => ipcRenderer.invoke('window:get-state') as Promise<FloppyCatWindowState>,
  saveWindowState: (state: FloppyCatWindowState) => ipcRenderer.invoke('window:save-state', state),
  notifyTimerComplete: (payload: TimerNotificationPayload) => ipcRenderer.invoke('notification:timer-complete', payload),
  showTimerModeMenu: (anchor: TimerModeMenuAnchor) => ipcRenderer.invoke('timer-mode:show', anchor),
  hideTimerModeMenu: () => ipcRenderer.invoke('timer-mode:hide'),
  onTimerModeSelected: (callback: (mode: 'focus' | 'break') => void) => {
    const listener = (_event: Electron.IpcRendererEvent, mode: 'focus' | 'break') => callback(mode);
    ipcRenderer.on('timer-mode:selected', listener);
    return () => ipcRenderer.removeListener('timer-mode:selected', listener);
  },
  onTimerModeClosed: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('timer-mode:closed', listener);
    return () => ipcRenderer.removeListener('timer-mode:closed', listener);
  }
});
