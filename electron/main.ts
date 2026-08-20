import { app, BrowserWindow, Notification, ipcMain, screen } from 'electron';
import { lstatSync, readlinkSync, rmSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type SavedWindowState = {
  x?: number;
  y?: number;
  width: number;
  height: number;
};

type TimerMode = 'focus' | 'break';
type TimerNotificationPayload = {
  title: string;
  body: string;
};

type TimerModeMenuAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
  selected: TimerMode;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_WINDOW_STATE: SavedWindowState = { width: 404, height: 112 };
const TIMER_MODE_MENU_WIDTH = 82;
const TIMER_MODE_MENU_HEIGHT = 70;
const TIMER_MODE_MENU_OUTSET = 4;
const ICON_PATH = path.join(__dirname, '../assets/floppy-cat.png');

let mainWindow: BrowserWindow | null = null;
let timerModeMenuWindow: BrowserWindow | null = null;

if (process.env.FLOPPY_CAT_USER_DATA_DIR) {
  app.setPath('userData', path.resolve(process.env.FLOPPY_CAT_USER_DATA_DIR));
}

app.name = 'Floppy Cat';
app.setDesktopName('floppy-cat.desktop');
app.commandLine.appendSwitch('ozone-platform', 'x11');

function processExists(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function clearStaleSingletonLock(userDataPath: string) {
  if (process.platform !== 'linux') {
    return;
  }

  const lockPath = path.join(userDataPath, 'SingletonLock');
  try {
    lstatSync(lockPath);
  } catch {
    return;
  }

  try {
    const lockTarget = readlinkSync(lockPath);
    const pid = Number(lockTarget.split('-').at(-1));
    if (!Number.isInteger(pid) || processExists(pid)) {
      return;
    }

    for (const singletonFile of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) {
      rmSync(path.join(userDataPath, singletonFile), { force: true });
    }
  } catch {
    // If Electron can still acquire the lock, there is nothing else to do here.
  }
}

function clearKnownStaleSingletonLocks() {
  const appDataPath = app.getPath('appData');
  const userDataPaths = new Set([
    app.getPath('userData'),
    path.join(appDataPath, 'floppy-cat'),
    path.join(appDataPath, 'Floppy Cat')
  ]);

  for (const userDataPath of userDataPaths) {
    clearStaleSingletonLock(userDataPath);
  }
}

clearKnownStaleSingletonLocks();

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

function windowStatePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

async function readWindowState(): Promise<SavedWindowState> {
  try {
    const raw = await readFile(windowStatePath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<SavedWindowState>;
    return {
      width: parsed.width ?? DEFAULT_WINDOW_STATE.width,
      height: parsed.height ?? DEFAULT_WINDOW_STATE.height,
      x: parsed.x,
      y: parsed.y
    };
  } catch {
    return DEFAULT_WINDOW_STATE;
  }
}

async function saveWindowState(state: SavedWindowState) {
  await mkdir(app.getPath('userData'), { recursive: true });
  await writeFile(windowStatePath(), `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function captureWindowState(win: BrowserWindow): SavedWindowState {
  const bounds = win.getBounds();
  return {
    x: bounds.x,
    y: bounds.y,
    width: DEFAULT_WINDOW_STATE.width,
    height: DEFAULT_WINDOW_STATE.height
  };
}

function clampWindowState(state: SavedWindowState): SavedWindowState {
  const display = screen.getDisplayMatching({
    x: state.x ?? 0,
    y: state.y ?? 0,
    width: DEFAULT_WINDOW_STATE.width,
    height: DEFAULT_WINDOW_STATE.height
  });
  const area = display.workArea;
  const maxX = area.x + area.width - DEFAULT_WINDOW_STATE.width;
  const maxY = area.y + area.height - DEFAULT_WINDOW_STATE.height;

  return {
    width: DEFAULT_WINDOW_STATE.width,
    height: DEFAULT_WINDOW_STATE.height,
    x: Math.min(Math.max(state.x ?? maxX - 16, area.x + 8), maxX - 8),
    y: Math.min(Math.max(state.y ?? area.y + 36, area.y + 8), maxY - 8)
  };
}

function closeTimerModeMenu() {
  if (!timerModeMenuWindow) {
    return;
  }

  const windowToClose = timerModeMenuWindow;
  timerModeMenuWindow = null;

  if (!windowToClose.isDestroyed()) {
    windowToClose.close();
  }
}

function showTimerCompleteNotification(payload: TimerNotificationPayload) {
  if (!Notification.isSupported()) {
    return;
  }

  new Notification({
    title: payload.title,
    body: payload.body,
    icon: ICON_PATH,
    silent: true
  }).show();
}

function timerModeMenuHtml(selected: TimerMode) {
  const focusSelectedClass = selected === 'focus' ? ' selected' : '';
  const breakSelectedClass = selected === 'break' ? ' selected' : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      background: transparent;
      color: #4f2033;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      user-select: none;
    }
    body { padding: ${TIMER_MODE_MENU_OUTSET}px; }
    .menu {
      display: grid;
      width: 100%;
      height: 100%;
      gap: 4px;
      padding: 4px;
      background: #fff0f6;
      border: 1px solid rgba(127, 37, 75, 0.34);
      border-radius: 12px;
      box-shadow: 0 8px 18px rgba(88, 29, 78, 0.2);
    }
    button {
      width: 100%;
      height: 24px;
      padding: 0 9px;
      color: #4f2033;
      text-align: left;
      background: rgba(255, 255, 255, 0.62);
      border: 1px solid transparent;
      border-radius: 9px;
      font: inherit;
      font-size: 12px;
      font-weight: 780;
      cursor: pointer;
    }
    button:hover {
      background: #ffd9e8;
      border-color: rgba(127, 37, 75, 0.2);
    }
    button.selected,
    button.selected:hover {
      color: #fff;
      background: linear-gradient(180deg, #b03a62 0%, #842345 100%);
      border-color: #74213e;
    }
  </style>
</head>
<body>
  <div class="menu" role="listbox" aria-label="Choose timer mode">
    <button class="${focusSelectedClass.trim()}" type="button" role="option" aria-selected="${selected === 'focus'}" data-mode="focus">Focus</button>
    <button class="${breakSelectedClass.trim()}" type="button" role="option" aria-selected="${selected === 'break'}" data-mode="break">Rest</button>
  </div>
  <script>
    const { ipcRenderer } = require('electron');
    document.addEventListener('click', (event) => {
      const option = event.target.closest('[data-mode]');
      if (option) {
        ipcRenderer.send('timer-mode:selected', option.dataset.mode);
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        ipcRenderer.send('timer-mode:hide');
      }
    });
  </script>
</body>
</html>`;
}

async function showTimerModeMenu(anchor: TimerModeMenuAnchor) {
  if (!mainWindow) {
    return;
  }

  closeTimerModeMenu();

  const display = screen.getDisplayMatching({
    x: anchor.x,
    y: anchor.y,
    width: TIMER_MODE_MENU_WIDTH,
    height: TIMER_MODE_MENU_HEIGHT
  });
  const area = display.workArea;
  const appBounds = mainWindow.getBounds();
  const x = Math.min(
    Math.max(Math.round(appBounds.x - TIMER_MODE_MENU_OUTSET), area.x + 4),
    area.x + area.width - TIMER_MODE_MENU_WIDTH - 4
  );
  const preferredY = Math.round(anchor.y + anchor.height + 4);
  const y = Math.min(Math.max(preferredY, area.y + 4), area.y + area.height - TIMER_MODE_MENU_HEIGHT - 4);

  timerModeMenuWindow = new BrowserWindow({
    width: TIMER_MODE_MENU_WIDTH,
    height: TIMER_MODE_MENU_HEIGHT,
    x,
    y,
    resizable: false,
    movable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    parent: mainWindow,
    title: 'Floppy Cat Timer Menu',
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false
    }
  });

  timerModeMenuWindow.setAlwaysOnTop(true, 'screen-saver');
  timerModeMenuWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  timerModeMenuWindow.on('blur', closeTimerModeMenu);
  timerModeMenuWindow.on('closed', () => {
    timerModeMenuWindow = null;
    mainWindow?.webContents.send('timer-mode:closed');
  });

  await timerModeMenuWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(timerModeMenuHtml(anchor.selected))}`);
  timerModeMenuWindow.showInactive();
  timerModeMenuWindow.moveTop();
}

async function createWindow() {
  const savedState = clampWindowState(await readWindowState());

  mainWindow = new BrowserWindow({
    width: DEFAULT_WINDOW_STATE.width,
    height: DEFAULT_WINDOW_STATE.height,
    useContentSize: true,
    x: savedState.x,
    y: savedState.y,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    title: 'Floppy Cat',
    icon: ICON_PATH,
    backgroundColor: '#ffd5e8',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.setAlwaysOnTop(true, 'floating');
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.isMinimized()) {
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      mainWindow.moveTop();
    }
  });

  mainWindow.on('moved', () => {
    if (mainWindow) {
      void saveWindowState(captureWindowState(mainWindow));
      closeTimerModeMenu();
    }
  });

  mainWindow.on('close', () => {
    if (mainWindow) {
      closeTimerModeMenu();
      void saveWindowState(captureWindowState(mainWindow));
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else if (!app.isPackaged && process.env.npm_lifecycle_event === 'dev') {
    await mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.setContentSize(DEFAULT_WINDOW_STATE.width, DEFAULT_WINDOW_STATE.height);
  mainWindow.showInactive();
  mainWindow.moveTop();
}

if (gotSingleInstanceLock) {
  app.whenReady().then(() => {
    ipcMain.handle('window:minimize', () => mainWindow?.minimize());
    ipcMain.handle('window:close', () => mainWindow?.close());
    ipcMain.handle('window:get-state', () => (mainWindow ? captureWindowState(mainWindow) : DEFAULT_WINDOW_STATE));
    ipcMain.handle('window:save-state', (_event, state: SavedWindowState) => saveWindowState(state));
    ipcMain.handle('notification:timer-complete', (_event, payload: TimerNotificationPayload) => {
      if (!payload.title || !payload.body) {
        return;
      }

      showTimerCompleteNotification(payload);
    });
    ipcMain.handle('timer-mode:show', (_event, anchor: TimerModeMenuAnchor) => showTimerModeMenu(anchor));
    ipcMain.handle('timer-mode:hide', closeTimerModeMenu);
    ipcMain.on('timer-mode:selected', (_event, mode: TimerMode) => {
      mainWindow?.webContents.send('timer-mode:selected', mode);
      closeTimerModeMenu();
    });
    ipcMain.on('timer-mode:hide', closeTimerModeMenu);

    void createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow();
      }
    });
  });

  app.on('second-instance', () => {
    if (!mainWindow) {
      return;
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    mainWindow.showInactive();
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.moveTop();
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
