import { red } from 'picocolors';
import fsx from 'fs-extra';

import {
  ConsoleMessageId,
  Extractor,
  ExtractorConfig,
  ExtractorLogLevel,
} from '@microsoft/api-extractor';
import chokidar from 'chokidar';
import { getPackages } from '@manypkg/get-packages';

import { transform } from '@babel/core';
import { exec } from 'child_process';
import { globSync } from 'fast-glob';
import fs from 'fs';
import path from 'path';
import { plugins } from '.';
import { directive, serverEntryName } from './utils';

export async function buildOnce({ rootDir, url }) {
  console.log();
  console.log('building functions');
  if (url && !url.endsWith('/')) {
    // make sure that new URL uses the last portion of the path too
    url += '/';
  }
  try {
    new URL(url);
  } catch (e) {
    throw new Error(`Invalid url ${url}`);
  }

  let libOutDir = path.resolve('dist');
  let serverOutDir = path.resolve('server');
  await fs.promises.rm(libOutDir, { recursive: true }).catch(() => null);

  const cwd = process.cwd();
  const serverEntrypoint = path.resolve(rootDir, serverEntryName + '.ts');

  try {
    const globBase = path.relative(cwd, rootDir);
    const globs = [path.posix.join(globBase, '**/*.{ts,tsx,js,jsx}')];
    // console.log({ globs });
    const allPossibleFiles = globSync(globs, {
      onlyFiles: true,
      absolute: true,
    });
    const actionFilesRelativePaths = allPossibleFiles
      .filter((file) => {
        const content = fs.readFileSync(file, 'utf8');
        return content.includes(directive);
      })
      .map((x) => {
        return path.relative(rootDir, x);
      });
    const importsCode = actionFilesRelativePaths
      .map((filePath) => {
        filePath = removeExtension(filePath);
        return `${JSON.stringify(
          '/' + filePath,
        )}: () => import('./${filePath}.js')`;
      })
      .join(',');
    const serverExposeContent =
      `// this file was generated\n` +
      `import { internalEdgeHandler, internalNodeJsHandler } from 'spiceflow/dist/server.js';\n` +
      `export const methodsMap = {${importsCode}}\n` +
      `export const edgeHandler = internalEdgeHandler({ methodsMap });\n` +
      `export const nodeJsHandler = internalNodeJsHandler({ methodsMap });\n`;

    if (!actionFilesRelativePaths.length) {
      throw new Error('No functions files found!');
    }
    fs.writeFileSync(serverEntrypoint, serverExposeContent, 'utf8');

    await Promise.all([
      runCommand(
        `tsc --incremental --declaration --noEmit false --outDir ${libOutDir} `,
      ),
    ]).catch((error) => {
      // console.error(error);
      console.error('Error running tsc, continue anyway');
    });

    // copy tsc output to server dir
    await fsx.copy(libOutDir, serverOutDir, { overwrite: true });
    // rename serverEntryName to index
    const tscOutFiles = fs.readdirSync(serverOutDir);
    for (const file of tscOutFiles) {
      if (file.startsWith(serverEntryName)) {
        const remaining = file.slice(serverEntryName.length);
        fs.renameSync(
          path.resolve(serverOutDir, file),
          path.resolve(serverOutDir, 'index' + remaining),
        );
      }
    }

    const imports = [] as string[];

    for (let actionFile of actionFilesRelativePaths) {
      const abs = path.resolve(rootDir, actionFile);
      const content = fs.readFileSync(abs, 'utf8');

      const actionName = path.basename(actionFile, path.extname(actionFile));

      const res = transform(content || '', {
        babelrc: false,
        sourceType: 'module',
        plugins: plugins({
          isServer: false,
          url,
          rootDir,
        }),
        filename: abs,

        sourceMaps: false,
      });
      if (!res || !res.code) {
        console.error(
          `Error transforming ${actionFile}, returned nothing, maybe not an action?`,
        );
        continue;
      }

      const importPath =
        './' +
        path.posix.join(path.posix.dirname(actionFile), actionName + '.js');
      console.log(`processed ${importPath}`);
      imports.push(importPath);
      fs.mkdirSync(path.resolve(libOutDir, path.dirname(importPath)), {
        recursive: true,
      });
      fs.writeFileSync(path.resolve(libOutDir, importPath), res.code, 'utf-8');
    }

    // const generator = createGenerator({
    //   path: dtsOutputFilePath,
    //   type: '*',
    //   tsconfig: 'tsconfig.json',
    //   skipTypeCheck: true,
    //   functions: 'comment',
    // });
    // const schema = generator.createSchema();
    // fs.writeFileSync(
    //   path.resolve(outDir, 'schema.json'),
    //   JSON.stringify(schema, null, 2),
    // );

    const bundledPackages = (await getPackages(process.cwd())).packages.map(
      (x) => x.packageJson.name,
    );
    // TODO devDependencies should be bundled too, given these are not shipped with the SDK
    if (!bundledPackages.length) {
      console.log('no workspace packages found, skipping types bundling');
      return;
    }
    for (const actionFile of actionFilesRelativePaths) {
      const entryPointDts = path.resolve(
        libOutDir,
        // path.relative(process.cwd(), rootDir),
        path.dirname(actionFile),
        path.basename(actionFile, path.extname(actionFile)) + '.d.ts',
      );
      console.log(`bundling types for ${path.relative(cwd, entryPointDts)}`);

      rollupDtsFile({
        bundledPackages,
        inputFilePath: entryPointDts,
        outputFilePath: entryPointDts,
        tsconfigFilePath: 'tsconfig.json',
      });
    }
  } finally {
    await fs.promises.unlink(serverEntrypoint).catch(() => null);
  }
}
const logger = console;

let isBuilding = { ref: false };
let missedWatch = { ref: false };

export async function build({ rootDir, url, watch = false }) {
  await buildOnce({ rootDir, url });
  if (!watch) {
    return;
  }
  const watcher = chokidar.watch(rootDir, {
    // ignored: /(^|[\/\\])\../, // ignore dotfiles
    ignored: ['**/node_modules/**', '**/dist/**', `src/${serverEntryName}.ts`],
    persistent: true,
  });
  console.log('watching for changes');
  watcher.on('change', async (path, stats) => {
    if (isBuilding.ref) {
      missedWatch.ref = true;
      return;
    }
    isBuilding.ref = true;
    try {
      logger.log(`detected change in ${path}`);
      await buildOnce({ rootDir, url });
      if (missedWatch.ref) {
        // logger.log('missed a change, rebuilding');
        await buildOnce({ rootDir, url });
        missedWatch.ref = false;
      }
    } finally {
      isBuilding.ref = false;
    }
  });
}

function rollupDtsFile({
  inputFilePath,
  outputFilePath,
  tsconfigFilePath,
  bundledPackages,
}: {
  inputFilePath: string;
  outputFilePath: string;
  tsconfigFilePath: string;
  bundledPackages: string[];
}) {
  let cwd = process.cwd();
  if (!fs.existsSync(tsconfigFilePath)) {
    throw new Error(`tsconfig.json not found at ${tsconfigFilePath}`);
  }

  let packageJsonFullPath = path.join(cwd, 'package.json');

  const extractorConfig = ExtractorConfig.prepare({
    configObject: {
      mainEntryPointFilePath: inputFilePath,
      bundledPackages,
      apiReport: {
        enabled: false,

        // `reportFileName` is not been used. It's just to fit the requirement of API Extractor.
        reportFileName: 'report.html',
      },
      docModel: { apiJsonFilePath: 'api.json', enabled: false },
      dtsRollup: {
        enabled: true,
        untrimmedFilePath: outputFilePath,
      },
      tsdocMetadata: { enabled: false, tsdocMetadataFilePath: 'another.json' },
      compiler: {
        tsconfigFilePath: tsconfigFilePath,
      },

      projectFolder: cwd,
    },
    configObjectFullPath: undefined,
    packageJsonFullPath,
  });

  // Invoke API Extractor
  const extractorResult = Extractor.invoke(extractorConfig, {
    // Equivalent to the "--local" command-line parameter
    localBuild: true,

    messageCallback: (message) => {
      switch (message.messageId) {
        case ConsoleMessageId.ApiReportCreated:
          message.logLevel = ExtractorLogLevel.None;
          break;
        case ConsoleMessageId.Preamble:
          message.logLevel = ExtractorLogLevel.None;
          break;
      }
    },
    showDiagnostics: false,
    // Equivalent to the "--verbose" command-line parameter
    showVerboseMessages: false,
  });

  if (!extractorResult.succeeded) {
    throw new Error(
      `API Extractor completed with ${extractorResult.errorCount} errors and ${extractorResult.warningCount} warnings when processing ${inputFilePath}`,
    );
  }
}

function removeExtension(filePath: string) {
  return filePath.replace(/\.[j|t]sx?$/, '');
}

function runCommand(command: string) {
  return new Promise((resolve, reject) => {
    exec(command, {}, (error, stdout, stderr) => {
      if (error) {
        console.log();
        console.error(red(stdout));
        console.error(red(stderr));
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}
