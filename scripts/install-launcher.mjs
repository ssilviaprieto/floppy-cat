#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { createDesktopEntry, getApplicationsDir, getLauncherFilePath } from './autostart-lib.mjs';

const dryRun = process.argv.includes('--dry-run');
const projectDir = process.cwd();
const nodePath = process.execPath;
const npmPath = process.env.npm_execpath ?? 'npm';
const desktopEntry = createDesktopEntry({ projectDir, nodePath, npmPath, scriptName: 'launch', autostart: false });
const targetPath = getLauncherFilePath();

if (dryRun) {
  console.log(`Would write ${targetPath}`);
  console.log(desktopEntry);
  process.exit(0);
}

await mkdir(getApplicationsDir(), { recursive: true });
await writeFile(targetPath, desktopEntry, { encoding: 'utf8', mode: 0o644 });
console.log(`Installed Floppy Cat launcher at ${targetPath}`);
