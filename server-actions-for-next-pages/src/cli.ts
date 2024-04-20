#! /usr/bin/env node

import fs from 'fs-extra';

import { cac } from 'cac';
import { extract } from './extractor.js';
import { findNextDir } from './index.js';

export const cli = cac();

async function generateSdk({ outDir, name = 'sdk', url }) {
  try {
    new URL(url);
  } catch (e) {
    throw new Error(`Invalid url ${url}`);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const alreadyExists = fs.existsSync(`${outDir}/package.json`);
  if (!alreadyExists) {
    fs.writeFileSync(
      `${outDir}/package.json`,
      JSON.stringify(
        {
          name,
          version: '0.0.0',
          description: `SDK for ${url}`,
          main: 'lib/index.js',
          types: 'lib/index.d.ts',
          type: 'module',
          scripts: {},
          dependencies: {
            'server-actions-for-next-pages': '*',
          },
          devDependencies: {},
        },
        null,
        2,
      ),
    );
  }
  if (alreadyExists) {
    console.log('package.json already exists, incrementing version');
    // increment version, bump the minor version
    const packageJson = JSON.parse(
      fs.readFileSync(`${outDir}/package.json`, 'utf8'),
    );
    const currentMinorVersion = parseInt(packageJson.version.split('.')[1]);
    const currentMajor = parseInt(packageJson.version.split('.')[0]);
    packageJson.version = `${currentMajor}.${currentMinorVersion + 1}.0`;
    fs.writeFileSync(
      `${outDir}/package.json`,
      JSON.stringify(packageJson, null, 2),
    );
  }
  const nextDir = await findNextDir(process.cwd());
  await extract({ nextDir, outDir, url });
}

cli
  .command('sdk', 'Generate an SDK package for your Server Actions')
  .option('--name <name>', 'Name of the package')
  .option('--url <url>', 'URL of the package')
  .option('--outDir <outDir>', 'Output directory')
  .action(async (options) => {
    const { name, url, outDir } = options;
    await generateSdk({ name, url, outDir });
  });

cli.help();

cli.parse();
