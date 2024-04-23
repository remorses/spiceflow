#! /usr/bin/env node

import fs from 'fs-extra';

import { cac } from 'cac';
import { extract } from './build.js';
import { findRootDir } from './index.js';

export const cli = cac();

async function generateSdk({ name = 'sdk', url }) {
 
  const rootDir = await findRootDir(process.cwd());
  await extract({ rootDir, url });
}

cli
  .command('sdk', 'Generate an SDK package for your functions')
  // .option('--name <name>', 'Name of the package')
  // .option('--outDir <outDir>', 'Output directory')
  .option('--url <url>', 'URL of the package, including the base path')
  .action(async (options) => {
    const { name, url } = options;
    await generateSdk({ name, url });
  });

cli.help();

cli.parse();
