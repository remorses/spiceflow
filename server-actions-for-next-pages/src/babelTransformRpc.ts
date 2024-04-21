import * as babel from '@babel/core';
import generate from '@babel/generator';
import { parseExpression } from '@babel/parser';
import type * as types from '@babel/types';
import fs from 'fs';
import path from 'path';
import { WrapMethodMeta } from './server';
import { annotateAsPure, directive, logger } from './utils';

type Babel = { types: typeof types };
type BabelTypes = typeof babel.types;

const { name } = require('../package.json');
const IMPORT_PATH_SERVER = `${name}/dist/server.js`;
const IMPORT_PATH_BROWSER = `${name}/dist/browser.js`;

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

export function getConfigObject(
  program: babel.NodePath<babel.types.Program>,
  isAppDir: boolean,
) {
  if (isAppDir) {
    // app routes always use Request and Response
    return { isEdge: true };
  }
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
  nextDir: string;
  isAppDir: boolean;
  basePath: string;
  url?: string;
}

export default function (
  { types: t }: Babel,
  { nextDir, isAppDir, isServer, url: rpcUrl, basePath }: PluginOptions,
): babel.PluginObj {
  return {
    visitor: {
      Program(program) {
        const { filename } = this.file.opts;

        if (!filename) {
          return;
        }

        const { isEdge } = getConfigObject(program, isAppDir) || {
          isEdge: false,
        };

        const isAction = isServerAction(program);

        if (!isAction) {
          logger.log(`Skipping ${filename} because it's not an action`);
          return;
        }

        logger.log(`Processing ${filename} as a ${isServer ? 'server' : 'client'} action`);

        const hasWrap = hasWrapMethod(program);

        const rel = path.relative(nextDir, filename);

        const rpcRelativePath =
          '/' +
          rel
            .replace(/\.[j|t]sx?$/, '')
            // remove /pages at the start
            .replace(/^pages\//, '')
            .replace(/^app\//, '')
            .replace(/\/index$/, '')
            .replace(/\/route$/, '');

        let rpcPath =
          basePath === '/' ? rpcRelativePath : `${basePath}${rpcRelativePath}`;
        if (rpcUrl) {
          rpcPath = new URL(rpcPath, rpcUrl).toString();
        }

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

        for (const statement of program.get('body')) {
          if (statement.isExportNamedDeclaration()) {
            const declaration = statement.get('declaration');
            if (isAllowedTsExportDeclaration(declaration)) {
              // ignore
            } else if (declaration.isFunctionDeclaration()) {
              const identifier = declaration.get('id');
              const methodName = identifier.node?.name;
              if (methodName === 'wrapMethod') {
                continue;
              }
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
                    rpcMethodNames.push(methodName);
                    if (isServer) {
                      init.replaceWith(
                        createRpcMethod(init.node, {
                          name: methodName,
                          pathname: rpcPath,
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

        function buildRpcApiHandler(
          t: BabelTypes,
          createRpcHandlerIdentifier: babel.types.Identifier,
          rpcMethodNames: string[],
        ): babel.types.Expression {
          return annotateAsPure(
            t,
            t.callExpression(createRpcHandlerIdentifier, [
              t.arrayExpression(
                rpcMethodNames.map((name) =>
                  t.arrayExpression([
                    t.stringLiteral(name),
                    t.identifier(name),
                  ]),
                ),
              ),
              isEdge ? t.booleanLiteral(true) : t.booleanLiteral(false),
            ]),
          );
        }

        if (isServer) {
          const createRpcHandlerIdentifier =
            program.scope.generateUidIdentifier('createRpcHandler');

          const methodsExpr = rpcMethodNames
            .map((name) => {
              return `{ method: "${name}", implementation: ${name} }`;
            })
            .join(',');
          const isGenerator = false;
          const argExpr = `({ isEdge: ${isEdge}, isGenerator: ${isGenerator}, methods: [${methodsExpr}] })`;

          let apiHandlerExpression = parseExpression(
            `${createRpcHandlerIdentifier.name}(${argExpr})`,
          );

          program.unshiftContainer('body', [
            t.importDeclaration(
              [
                t.importSpecifier(
                  createRpcMethodIdentifier,
                  t.identifier('createRpcMethod'),
                ),
                t.importSpecifier(
                  createRpcHandlerIdentifier,
                  t.identifier('createRpcHandler'),
                ),
              ],
              t.stringLiteral(IMPORT_PATH_SERVER),
            ),
          ]);

          if (isAppDir) {
            // export const POST = {apiHandlerExpression}
            program.pushContainer('body', [
              t.exportNamedDeclaration(
                t.variableDeclaration('const', [
                  t.variableDeclarator(
                    t.identifier('POST'),
                    apiHandlerExpression,
                  ),
                ]),
              ),
            ]);
          } else {
            program.pushContainer('body', [
              t.exportDefaultDeclaration(apiHandlerExpression),
            ]);
          }
        } else {
          const createRpcFetcherIdentifier =
            program.scope.generateUidIdentifier('createRpcFetcher');

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

          program.pushContainer('body', [
            t.importDeclaration(
              [
                t.importSpecifier(
                  createRpcFetcherIdentifier,
                  t.identifier('createRpcFetcher'),
                ),
              ],
              t.stringLiteral(IMPORT_PATH_BROWSER),
            ),
            ...rpcMethodNames.map((name) =>
              t.exportNamedDeclaration(
                t.variableDeclaration('const', [
                  t.variableDeclarator(
                    t.identifier(name),
                    annotateAsPure(
                      t,
                      t.callExpression(createRpcFetcherIdentifier, [
                        parseExpression(
                          JSON.stringify({
                            url: rpcPath,
                            method: name,
                            isGenerator: false,
                          }),
                        ),
                      ]),
                    ),
                  ),
                ]),
              ),
            ),
          ]);
        }
        if (process.env.DEBUG_ACTIONS) {
          // stringify the AST and print it
          const output = generate(
            program.node,
            {
              /* options */
            },

            this.file.code,
          );
          let p = path.resolve(
            './plugin-outputs',
            (isServer ? 'server-' : 'client-') + path.basename(filename),
          );
          fs.mkdirSync(path.dirname(p), { recursive: true });
          fs.writeFileSync(p, output.code);
        }
      },
    },
  };
}
