import { Extractor, ExtractorConfig } from '@microsoft/api-extractor';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createGenerator } from 'ts-json-schema-generator';

export async function extract() {
  const tscCommand = `tsc  --emitDeclarationOnly --declaration --noEmit false --outDir dist `;
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
  let dtsInputFilePath = 'dist/src/pages/api/actions-node.d.ts';
  dtsInputFilePath = 'dist/try-extractor/dummy.d.ts';
  const dtsOutputFilePath = 'try-extractor/extracted.d.ts';
  const generator = createGenerator({
    path: dtsOutputFilePath,
    type: '*',
    tsconfig: 'tsconfig.json',
    skipTypeCheck: true,
    functions: 'comment',
  });
  const schema = generator.createSchema();
  fs.writeFileSync(
    'try-extractor/schema.json',
    JSON.stringify(schema, null, 2),
  );
  rollupDtsFile(dtsInputFilePath, dtsOutputFilePath, 'tsconfig.json');
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
