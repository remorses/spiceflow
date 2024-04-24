import pico from 'picocolors';
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
import globSync from 'fast-glob';
import fs from 'fs';
import path from 'path';
import { plugins } from './index.js';
import { camelCaseCapitalized, directive, serverEntryName } from './utils.js';
import { createGenerator } from 'ts-json-schema-generator';
import { WrapMethodMeta } from './server.js';

type BuildOptions = {
  openapi?: boolean;
  rootDir: string;
  url: string;
  watch?: boolean;
};
export async function buildOnce({
  openapi = false,
  rootDir,
  url,
}: BuildOptions) {
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
    const allPossibleFiles = globSync.globSync(globs, {
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

      let methods = [] as WrapMethodMeta[];
      const res = transform(content || '', {
        babelrc: false,
        sourceType: 'module',
        plugins: [
          ...plugins({
            isServer: false,
            url,
            onMethod(meta) {
              methods.push(meta);
            },
            rootDir,
          }),
        ],
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
      const outFile = path.resolve(libOutDir, importPath);

      console.log(`processed ${importPath}`);
      imports.push(importPath);
      fs.mkdirSync(path.resolve(libOutDir, path.dirname(importPath)), {
        recursive: true,
      });
      if (openapi) {
        const openapiTypes =
          `import * as methods from ${JSON.stringify(
            './' + path.basename(importPath),
          )}\n` +
          methods
            .map(
              (x) =>
                `export const x: Awaited<ReturnType<typeof methods.${x.name}>>\n`,
            )
            .join('\n');
        fs.writeFileSync(openapiTypesPath(outFile), openapiTypes, 'utf-8');
        fs.writeFileSync(outFile, res.code, 'utf-8');
      }
    }

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
      if (!openapi) {
        continue;
      }

      const generator = createGenerator({
        path: path.resolve(actionFile),
        type: `*`,
        tsconfig: 'tsconfig.json',
        minify: false,
        // discriminatorType: 'open-api',
        skipTypeCheck: true,
        functions: 'comment',
      });
      const schema = generator.createSchema();
      console.log(JSON.stringify(schema, null, 2));
      // fs.writeFileSync(
      //   path.resolve(libOutDir, 'schema.json'),
      //   JSON.stringify(schema, null, 2),
      // );
    }
  } finally {
    await fs.promises.unlink(serverEntrypoint).catch(() => null);
  }
}
const logger = console;

let isBuilding = { ref: false };
let missedWatch = { ref: false };

export async function build(options: BuildOptions) {
  await buildOnce(options);
  if (!options.watch) {
    return;
  }
  const { rootDir, url } = options;
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
      await buildOnce(options);
      if (missedWatch.ref) {
        // logger.log('missed a change, rebuilding');
        await buildOnce(options);
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
        console.error(pico.red(stdout));
        console.error(pico.red(stderr));
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

function openapiTypesPath(outFile) {
  return path.resolve(
    path.dirname(outFile),
    `${path.basename(outFile, path.extname(outFile))}-schema.d.ts`,
  );
}
