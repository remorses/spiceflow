import { Extractor, ExtractorConfig } from '@microsoft/api-extractor';

import { transform } from '@babel/core';
import { exec } from 'child_process';
import { globSync } from 'fast-glob';
import fs from 'fs';
import path from 'path';
import { plugins } from '.';
import { directive } from './utils';

export async function extract({ rootDir, url, basePath = '', outDir }) {
  outDir = path.resolve(outDir, 'lib');
  await fs.promises.rmdir(outDir, { recursive: true }).catch(() => null);
  const typesDistDir = 'dist';
  const dummyEntrypoint = path.resolve(rootDir, 'dummy-actions-entrypoint.ts');
  const cwd = process.cwd();

  try {
    const globBase = path.relative(cwd, rootDir);
    const globs = [path.posix.join(globBase, 'src/**/*.{ts,tsx,js,jsx}')];
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

    const dummyContent = actionFilesRelativePaths
      .map((file) => `export * from './${file}'\n`)
      .join('\n');
    if (!dummyContent) {
      throw new Error('No action files found!');
    }

    const imports = [] as string[];

    for (let actionFile of actionFilesRelativePaths) {
      const abs = path.resolve(rootDir, actionFile);
      const content = fs.readFileSync(abs, 'utf8');
      const isAppDir = actionFile.includes('/app');
      const actionName = path.basename(actionFile, path.extname(actionFile));

      const res = transform(content || '', {
        babelrc: false,
        sourceType: 'module',
        plugins: plugins({
          basePath,
          isServer: false,
          url,
          rootDir: rootDir,
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
      fs.mkdirSync(path.resolve(outDir, path.dirname(importPath)), {
        recursive: true,
      });
      fs.writeFileSync(path.resolve(outDir, importPath), res.code, 'utf-8');
    }

    fs.writeFileSync(dummyEntrypoint, dummyContent, 'utf8');
    const entryPointDts = path.resolve(
      typesDistDir,
      path.relative(process.cwd(), rootDir),
      path.basename(dummyEntrypoint, path.extname(dummyEntrypoint)) + '.d.ts',
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
      path.resolve(outDir, 'index.js'),
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
    const dtsOutputFilePath = path.resolve(outDir, 'index.d.ts');
    rollupDtsFile(entryPointDts, dtsOutputFilePath, 'tsconfig.json');
  } finally {
    await fs.promises.unlink(dummyEntrypoint).catch(() => null);
  }
}

function rollupDtsFile(
  inputFilePath: string,
  outputFilePath: string,
  tsconfigFilePath: string,
) {
  let cwd = process.cwd();
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
