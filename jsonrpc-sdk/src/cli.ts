#! /usr/bin/env node

import fs from 'fs-extra';

import { cac } from 'cac';
import { build } from './build.js';
import { findRootDir } from './index.js';

export const cli = cac();

cli
  .command('', 'Generate an SDK package for your functions')
  .option('--watch', 'Watch for changes')
  .option('--url <url>', 'URL of the package, including the base path')
  .action(async (options) => {
    const { url, watch } = options;
    const rootDir = await findRootDir(process.cwd());
    await build({ rootDir, url, watch });
  });

cli.help();

cli.parse();
