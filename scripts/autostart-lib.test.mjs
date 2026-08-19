import { describe, expect, it } from 'vitest';
import {
  createDesktopEntry,
  getApplicationsDir,
  getAutostartDir,
  getDesktopFilePath,
  getIconPath,
  getLauncherFilePath
} from './autostart-lib.mjs';

describe('autostart helpers', () => {
  it('resolves the KDE/Linux autostart desktop file path', () => {
    expect(getAutostartDir('/home/example')).toBe('/home/example/.config/autostart');
    expect(getDesktopFilePath('/home/example')).toBe('/home/example/.config/autostart/floppy-cat.desktop');
  });

  it('resolves the KDE/Linux app launcher desktop file path', () => {
    expect(getApplicationsDir('/home/example')).toBe('/home/example/.local/share/applications');
    expect(getLauncherFilePath('/home/example')).toBe('/home/example/.local/share/applications/floppy-cat.desktop');
  });

  it('creates a desktop entry that starts the local app without opening a terminal', () => {
    const entry = createDesktopEntry({
      projectDir: '/home/example/floppy cat',
      nodePath: '/usr/bin/node',
      npmPath: '/usr/share/nodejs/npm/bin/npm-cli.js',
      scriptName: 'launch'
    });

    expect(entry).toContain('Name=Floppy Cat');
    expect(entry).toContain('Icon=/home/example/floppy cat/assets/floppy-cat.png');
    expect(entry).toContain('StartupWMClass=floppy-cat');
    expect(entry).toContain(
      'Exec=/usr/bin/node /usr/share/nodejs/npm/bin/npm-cli.js run launch --prefix "/home/example/floppy cat"'
    );
    expect(entry).toContain('Terminal=false');
  });

  it('uses npm directly when no npm cli JavaScript path is available', () => {
    const entry = createDesktopEntry({
      projectDir: '/home/example/floppy cat',
      nodePath: '/usr/bin/node',
      npmPath: 'npm'
    });

    expect(entry).toContain('Exec=npm run start --prefix "/home/example/floppy cat"');
  });

  it('can create a pinnable launcher entry without autostart metadata', () => {
    const entry = createDesktopEntry({
      projectDir: '/home/example/floppy cat',
      nodePath: '/usr/bin/node',
      npmPath: 'npm',
      autostart: false
    });

    expect(entry).toContain('Icon=/home/example/floppy cat/assets/floppy-cat.png');
    expect(entry).not.toContain('X-GNOME-Autostart-enabled=true');
  });

  it('resolves the project icon path', () => {
    expect(getIconPath('/home/example/floppy cat')).toBe('/home/example/floppy cat/assets/floppy-cat.png');
  });
});
