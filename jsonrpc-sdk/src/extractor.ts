import { Extractor, ExtractorConfig } from '@microsoft/api-extractor';

import { transform } from '@babel/core';
import { exec } from 'child_process';
import { globSync } from 'fast-glob';
import fs from 'fs';
import path from 'path';
import { plugins } from '.';
import { directive } from './utils';

export async function extract({ rootDir, url, basePath = '' }) {
  let libOutDir = path.resolve('dist');
  await fs.promises.rmdir(libOutDir, { recursive: true }).catch(() => null);
  const typesDistDir = 'dist';

  const cwd = process.cwd();

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

    const imports = [] as string[];

    for (let actionFile of actionFilesRelativePaths) {
      const abs = path.resolve(rootDir, actionFile);
      const content = fs.readFileSync(abs, 'utf8');

      const actionName = path.basename(actionFile, path.extname(actionFile));

      const res = transform(content || '', {
        babelrc: false,
        sourceType: 'module',
        plugins: plugins({
          basePath,
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

    const serverEntrypoint = path.resolve(rootDir, 'server.ts');
    const serverExposeContent =
      `import { internalEdgeHandler, internalNodeJsHandler } from 'jsonrpc-sdk/dist/server';\n` +
      `const methodsMap = {${actionFilesRelativePaths
        .map(
          (file) =>
            `${JSON.stringify('/' + file)}: () => import('./${removeExtension(
              file,
            )}')`,
        )
        .join(',')}}\n` +
      `export const edgeHandler = internalEdgeHandler({ methodsMap });\n` +
      `export const nodeJsHandler = internalNodeJsHandler({ methodsMap });\n`;

    if (!actionFilesRelativePaths.length) {
      throw new Error('No functions files found!');
    }
    fs.writeFileSync(serverEntrypoint, serverExposeContent, 'utf8');
    const entryPointDts = path.resolve(
      typesDistDir,
      path.relative(process.cwd(), rootDir),
      path.basename(serverEntrypoint, path.extname(serverEntrypoint)) + '.d.ts',
    );
    const tscCommand = `tsc  --emitDeclarationOnly --declaration --noEmit false --outDir ${typesDistDir} `;
    await new Promise((resolve, reject) => {
      exec(tscCommand, {}, (error, stdout, stderr) => {
        if (error) {
          console.error(stdout, stderr);
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    }).catch((error) => {
      // console.error(error);
      console.error('Error running tsc, continue anyway');
    });

    fs.writeFileSync(
      path.resolve(libOutDir, 'index.js'),
      imports.map((x) => `export * from '${x}'`).join('\n'),
    );
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
    const dtsOutputFilePath = path.resolve(libOutDir, 'index.d.ts');

    rollupDtsFile(entryPointDts, dtsOutputFilePath, 'tsconfig.json');
  } finally {
    // await fs.promises.unlink(serverEntrypoint).catch(() => null);
  }
}

function rollupDtsFile(
  inputFilePath: string,
  outputFilePath: string,
  tsconfigFilePath: string,
) {
  let cwd = process.cwd();
  if (!fs.existsSync(tsconfigFilePath)) {
    throw new Error(`tsconfig.json not found at ${tsconfigFilePath}`);
  }

  let packageJsonFullPath = path.join(cwd, 'package.json');

  const extractorConfig = ExtractorConfig.prepare({
    configObject: {
      mainEntryPointFilePath: inputFilePath,

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

    // Equivalent to the "--verbose" command-line parameter
    showVerboseMessages: true,
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
