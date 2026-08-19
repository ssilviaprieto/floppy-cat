#!/usr/bin/env node

import { rm } from 'node:fs/promises';
import { getLauncherFilePath } from './autostart-lib.mjs';

const targetPath = getLauncherFilePath();

await rm(targetPath, { force: true });
console.log(`Removed Floppy Cat launcher from ${targetPath}`);
