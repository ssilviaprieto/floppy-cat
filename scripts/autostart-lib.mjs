import os from 'node:os';
import path from 'node:path';

export const DESKTOP_FILE_NAME = 'floppy-cat.desktop';

export function getAutostartDir(homeDir = os.homedir()) {
  return path.join(homeDir, '.config', 'autostart');
}

export function getDesktopFilePath(homeDir = os.homedir()) {
  return path.join(getAutostartDir(homeDir), DESKTOP_FILE_NAME);
}

export function getApplicationsDir(homeDir = os.homedir()) {
  return path.join(homeDir, '.local', 'share', 'applications');
}

export function getLauncherFilePath(homeDir = os.homedir()) {
  return path.join(getApplicationsDir(homeDir), DESKTOP_FILE_NAME);
}

export function getIconPath(projectDir) {
  return path.join(projectDir, 'assets', 'floppy-cat.png');
}

export function createDesktopEntry({ projectDir, nodePath, npmPath, scriptName = 'start', autostart = true }) {
  const escapedProjectDir = projectDir.replaceAll('"', '\\"');
  const npmCommand = path.isAbsolute(npmPath) && npmPath.endsWith('.js') ? `${nodePath} ${npmPath}` : npmPath;
  const entry = [
    '[Desktop Entry]',
    'Type=Application',
    'Version=1.0',
    'Name=Floppy Cat',
    'Comment=Tiny always-on-top focus game',
    `Exec=${npmCommand} run ${scriptName} --prefix "${escapedProjectDir}"`,
    `Path=${projectDir}`,
    `Icon=${getIconPath(projectDir)}`,
    'Terminal=false',
    'Categories=Game;Utility;',
    'StartupNotify=false',
    'StartupWMClass=floppy-cat'
  ];

  if (autostart) {
    entry.push('X-GNOME-Autostart-enabled=true');
  }

  entry.push('');
  return entry.join('\n');
}
