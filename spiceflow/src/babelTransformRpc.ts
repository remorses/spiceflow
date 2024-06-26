import * as babel from '@babel/core';
import generate from '@babel/generator';
import { parse, parseExpression } from '@babel/parser';
import type * as types from '@babel/types';
import fs from 'fs';
import path from 'path';
import { WrapMethodMeta } from './server.js';
import { annotateAsPure, directive, logger, removeExtension } from './utils.js';

type Babel = { types: typeof types };

function isAllowedTsExportDeclaration(
  declaration: babel.NodePath<babel.types.Declaration | null | undefined>,
): boolean {
  return (
    declaration.isTSTypeAliasDeclaration() ||
    declaration.isTSInterfaceDeclaration()
  );
}

const allowedExports = new Set([
  'revalidate', //
  'preferredRegion',
  'runtime',
  'maxDuration',
  'fetchCache',
  'dynamic',
  'dynamicParams',
  'GET',
  'HEAD',
]);

function getConfigObjectExpression(
  variable: babel.NodePath<babel.types.VariableDeclarator>,
) {
  const identifier = variable.get('id');
  const init = variable.get('init');
  if (
    identifier.isIdentifier() &&
    identifier.node.name === 'config' &&
    init.isObjectExpression()
  ) {
    const isEdge = isEdgeInConfig(init);
    return {
      isEdge,
    };
  }
  if (identifier.isIdentifier() && identifier.node.name === 'runtime') {
    const isEdge = init.isStringLiteral({ value: 'edge' });
    return {
      isEdge,
    };
  }
  return null;
}

export function getConfigObject(program: babel.NodePath<babel.types.Program>) {
  for (const statement of program.get('body')) {
    if (statement.isExportNamedDeclaration()) {
      const declaration = statement.get('declaration');
      if (declaration.isVariableDeclaration()) {
        for (const variable of declaration.get('declarations')) {
          const configObject = getConfigObjectExpression(variable);
          if (configObject) {
            return configObject;
          }
        }
      }
    }
  }
  return;
}

function isServerAction(program: babel.NodePath<babel.types.Program>): boolean {
  const dir = program.node.directives?.find(
    (x) => x.value?.value === directive,
  );
  return !!dir;
  // https://regex101.com/r/Wm6UvV/1
  // return /^("|')poor man's use server("|')(;?)\n/m.test(code);
}

function hasWrapMethod(program: babel.NodePath<babel.types.Program>) {
  // check if there is a function export called wrapMethod
  for (const statement of program.get('body')) {
    // also check the export { wrapMethod }
    if (statement.isExportNamedDeclaration()) {
      for (const specifier of statement.get('specifiers')) {
        if (
          specifier.node.exported.type === 'Identifier' &&
          specifier.node.exported.name === 'wrapMethod'
        ) {
          return true;
        }
      }
    }
    if (statement.isExportNamedDeclaration()) {
      const declaration = statement.get('declaration');
      if (declaration.isFunctionDeclaration()) {
        const identifier = declaration.get('id');
        if (identifier.node?.name === 'wrapMethod') {
          return true;
        }
      } else if (declaration.isVariableDeclaration()) {
        for (const variable of declaration.get('declarations')) {
          const id = variable.get('id');
          if (id.isIdentifier() && id.node.name === 'wrapMethod') {
            return true;
          }
        }
      }
    }
  }

  // return (
  //   /export\s+function\s+wrapMethod\s*\(/m.test(code) ||
  //   /export\s+(let|const)\s+wrapMethod\s*/m.test(code) ||
  //   // https://regex101.com/r/nRaEVs/1
  //   /export\s+\{[^}]*wrapMethod/m.test(code)
  // );
}

export function isEdgeInConfig(
  configObject?: babel.NodePath<babel.types.ObjectExpression>,
): boolean {
  if (!configObject) {
    return false;
  }
  for (const property of configObject.get('properties')) {
    if (!property.isObjectProperty()) {
      continue;
    }
    const key = property.get('key');
    const value = property.get('value');

    if (
      property.isObjectProperty() &&
      key.isIdentifier({ name: 'runtime' }) &&
      value.isStringLiteral({ value: 'edge' })
    ) {
      return true;
    }
  }
  return false;
}

export interface PluginOptions {
  isServer: boolean;
  rootDir: string;
  onMethod?: (method: WrapMethodMeta) => void;
  url?: string;
}

export default function (
  { types: t }: Babel,
  { rootDir, onMethod, isServer, url: rpcUrl }: PluginOptions,
): babel.PluginObj {
  return {
    visitor: {
      Program(program, state) {
        const { filename } = this.file.opts;

        if (!filename) {
          return;
        }

        const { isEdge } = getConfigObject(program) || {
          isEdge: false,
        };

        const isAction = isServerAction(program);

        if (!isAction) {
          logger.log(`Skipping ${filename} because it's not an action`);
          return;
        }

        logger.log(
          `Processing ${filename} as a ${
            isServer ? 'server' : 'client'
          } action`,
        );

        const hasWrap = hasWrapMethod(program);

        const rel = path.relative(rootDir, filename);

        const rpcRelativePath = rel
          .replace(/\.[j|t]sx?$/, '')
          // remove /pages at the start
          .replace(/^src\//, '')
          .replace(/\/index$/, '');
        let rpcPath = rpcUrl
          ? new URL(rpcRelativePath, rpcUrl).toString()
          : '/' + rpcRelativePath;

        const rpcMethodNames: string[] = [];

        const createRpcMethodIdentifier =
          program.scope.generateUidIdentifier('createRpcMethod');

        const createRpcMethod = (
          rpcMethod:
            | babel.types.ArrowFunctionExpression
            | babel.types.FunctionExpression,
          meta: WrapMethodMeta,
        ) => {
          return t.callExpression(createRpcMethodIdentifier, [
            rpcMethod,
            parseExpression(JSON.stringify(meta)),

            parseExpression(
              hasWrap
                ? `typeof wrapMethod === 'function' ? wrapMethod : undefined`
                : 'null',
            ),
          ]);
        };

        const generators = new Map<string, boolean>();
        for (const statement of program.get('body')) {
          if (statement.isExportNamedDeclaration()) {
            // check if function is async generator

            const declaration = statement.get('declaration');
            if (isAllowedTsExportDeclaration(declaration)) {
              // ignore
            } else if (declaration.isFunctionDeclaration()) {
              const identifier = declaration.get('id');
              const methodName = identifier.node?.name;
              if (methodName === 'wrapMethod') {
                continue;
              }

              const isGenerator = !!declaration.node.generator;
              generators.set(methodName!, isGenerator);
              if (!declaration.node.async) {
                throw declaration.buildCodeFrameError(
                  'rpc exports must be async functions',
                );
              }

              if (methodName) {
                rpcMethodNames.push(methodName);
                if (isServer) {
                  // replace with wrapped
                  statement.replaceWith(
                    t.exportNamedDeclaration(
                      t.variableDeclaration('const', [
                        t.variableDeclarator(
                          t.identifier(methodName),
                          createRpcMethod(t.toExpression(declaration.node), {
                            name: methodName,
                            pathname: rpcPath,
                            isGenerator,
                          }),
                        ),
                      ]),
                    ),
                  );
                }
              }
            } else if (
              declaration.isVariableDeclaration() &&
              declaration.node.kind === 'const'
            ) {
              for (const variable of declaration.get('declarations')) {
                const init = variable.get('init');

                if (getConfigObjectExpression(variable)) {
                  continue;
                }
                const node = variable.get('id');

                if (node.isIdentifier() && allowedExports.has(node.node.name)) {
                  continue;
                }
                if (getConfigObjectExpression(variable)) {
                  // ignore, this is the only allowed non-function export
                  continue;
                }
                if (
                  init.isFunctionExpression() ||
                  init.isArrowFunctionExpression()
                ) {
                  const { id } = variable.node;
                  if (t.isIdentifier(id)) {
                    const methodName = id.name;
                    if (methodName === 'wrapMethod') {
                      continue;
                    }
                  }
                  if (!init.node.async) {
                    throw init.buildCodeFrameError(
                      'rpc exports must be async functions',
                    );
                  }

                  if (t.isIdentifier(id)) {
                    const methodName = id.name;
                    if (methodName === 'wrapMethod') {
                      continue;
                    }
                    const isGenerator = !!init.node.generator;
                    generators.set(methodName!, isGenerator);
                    rpcMethodNames.push(methodName);
                    if (isServer) {
                      init.replaceWith(
                        createRpcMethod(init.node, {
                          name: methodName,
                          pathname: rpcPath,
                          isGenerator,
                        }),
                      );
                    }
                  }
                } else {
                  throw variable.buildCodeFrameError(
                    'rpc exports must be static functions',
                  );
                }
              }
            } else {
              for (const specifier of statement.get('specifiers')) {
                if (
                  specifier?.node?.exported.type === 'Identifier' &&
                  specifier?.node?.exported.name === 'wrapMethod'
                ) {
                  continue;
                }
                throw specifier.buildCodeFrameError(
                  'rpc exports must be static functions',
                );
              }
            }
          } else if (statement.isExportDefaultDeclaration()) {
            throw statement.buildCodeFrameError(
              'default exports are not allowed in rpc routes',
            );
          }
        }

        if (!isServer) {
          // Clear the whole body
          out: for (const statement of program.get('body')) {
            // don't remove if it's an export with name is config or runtime
            if (statement.isExportNamedDeclaration()) {
              const declaration = statement.get('declaration');
              if (declaration.isVariableDeclaration()) {
                for (const variable of declaration.get('declarations')) {
                  const configObject = getConfigObjectExpression(variable);
                  if (configObject) {
                    continue out;
                  }
                }
              }
            }
            statement.remove();
          }

          const outFile = path.resolve(
            rootDir,
            '../browser',
            path.relative(rootDir, filename),
          );
          program.node.directives = [];
          program.pushContainer('body', [
            ...(parse(
              `import { createRpcFetcher } from 'spiceflow/dist/browser.js';\n` +
                `import * as methods from './${
                  removeExtension(
                    path.relative(path.dirname(outFile), filename),
                  ) + '.js'
                }'`,
              { sourceType: 'module' },
            ).program.body as any),
            ...rpcMethodNames.map((name) => {
              const isGenerator = !!generators.get(name);
              onMethod?.({ name, pathname: rpcPath, isGenerator });
              return parse(
                `export const ${name}: typeof methods['${name}'] = createRpcFetcher({ url: ${JSON.stringify(
                  rpcPath,
                )}, method: ${JSON.stringify(
                  name,
                )}, isGenerator: ${isGenerator} });`,
                { sourceType: 'module', plugins: ['typescript'] },
              ).program.body[0];
            }),
          ]);
        }
      },
    },
  };
}
