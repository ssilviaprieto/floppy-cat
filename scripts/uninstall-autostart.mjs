#!/usr/bin/env node

import { rm } from 'node:fs/promises';
import { getDesktopFilePath } from './autostart-lib.mjs';

const targetPath = getDesktopFilePath();

await rm(targetPath, { force: true });
console.log(`Removed Floppy Cat autostart entry from ${targetPath}`);
