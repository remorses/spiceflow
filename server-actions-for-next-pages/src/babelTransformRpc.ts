import { annotateAsPure, literalToAst } from './astUtils';
import path from 'path';
import fs from 'fs';
import * as babel from '@babel/core';
import type * as types from '@babel/types';
import { WrapMethodMeta } from './server';
import { parse } from '@babel/parser';
import generate from '@babel/generator';

type Babel = { types: typeof types };
type BabelTypes = typeof babel.types;

const { name } = require('../package.json');
const IMPORT_PATH_SERVER = `${name}/dist/server`;
const IMPORT_PATH_BROWSER = `${name}/dist/browser`;

function isAllowedTsExportDeclaration(
  declaration: babel.NodePath<babel.types.Declaration | null | undefined>,
): boolean {
  return (
    declaration.isTSTypeAliasDeclaration() ||
    declaration.isTSInterfaceDeclaration()
  );
}

function getConfigObjectExpression(
  variable: babel.NodePath<babel.types.VariableDeclarator>,
): babel.NodePath<babel.types.ObjectExpression> | null {
  const identifier = variable.get('id');
  const init = variable.get('init');
  if (
    identifier.isIdentifier() &&
    identifier.node.name === 'config' &&
    init.isObjectExpression()
  ) {
    return init;
  } else {
    return null;
  }
}

export function getConfigObject(
  program: babel.NodePath<babel.types.Program>,
): babel.NodePath<babel.types.ObjectExpression> | null {
  for (const statement of program.get('body')) {
    if (statement.isExportNamedDeclaration()) {
      const declaration = statement.get('declaration');
      if (
        declaration.isVariableDeclaration() &&
        declaration.node.kind === 'const'
      ) {
        for (const variable of declaration.get('declarations')) {
          const configObject = getConfigObjectExpression(variable);
          if (configObject) {
            return configObject;
          }
        }
      }
    }
  }
  return null;
}

function isServerAction(code: string) {
  // https://regex101.com/r/Wm6UvV/1
  return /^("|')poor man's use server("|')(;?)\n/m.test(code);
}
function hasWrapMethod(code: string) {
  return (
    /export\s+function\s+wrapMethod\s*\(/m.test(code) ||
    /export\s+(let|const)\s+wrapMethod\s*/m.test(code) ||
    // https://regex101.com/r/nRaEVs/1
    /export\s+\{[^}]*wrapMethod/m.test(code)
  );
}

export function isEdgeInConfig(
  configObject: babel.NodePath<babel.types.ObjectExpression>,
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
  pagesDir: string;
  dev: boolean;
  apiDir: string;
  basePath: string;
}

export default function (
  { types: t }: Babel,
  { apiDir, pagesDir, isServer, basePath }: PluginOptions,
): babel.PluginObj {
  return {
    visitor: {
      Program(program) {
        // @ts-expect-error
        const { filename } = this.file.opts;

        if (!filename) {
          return;
        }

        const isApiRoute = filename && filename.startsWith(apiDir);

        if (!isApiRoute) {
          return;
        }

        const configObject = getConfigObject(program);
        const isAction = isServerAction(program);

        if (!isAction) {
          return;
        }
        const isEdge = configObject && isEdgeInConfig(configObject);

        const hasWrap = hasWrapMethod(program);

        const rpcRelativePath = filename
          .slice(pagesDir.length)
          .replace(/\.[j|t]sx?$/, '')
          .replace(/\/index$/, '');

        const rpcPath =
          basePath === '/' ? rpcRelativePath : `${basePath}/${rpcRelativePath}`;

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
            literalToAst(t, meta),

            parse(
              hasWrap
                ? `typeof wrapMethod === 'function' ? wrapMethod : undefined`
                : 'null',
            ).program.body[0]['expression'],
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
                  // ignore, this is the only allowed non-function export
                } else if (
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
                if (specifier?.node?.exported?.name === 'wrapMethod') {
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

          let apiHandlerExpression = buildRpcApiHandler(
            t,
            createRpcHandlerIdentifier,
            rpcMethodNames,
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

          program.pushContainer('body', [
            t.exportDefaultDeclaration(apiHandlerExpression),
          ]);
        } else {
          const createRpcFetcherIdentifier =
            program.scope.generateUidIdentifier('createRpcFetcher');

          // Clear the whole body
          for (const statement of program.get('body')) {
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
                        t.stringLiteral(rpcPath),
                        t.stringLiteral(name),
                      ]),
                    ),
                  ),
                ]),
              ),
            ),
          ]);
        }
        if (process.env.DEBUG_ACTIONS_BABEL_PLUGIN) {
          // stringify the AST and print it
          const output = generate(
            program.node,
            {
              /* options */
            },
            // @ts-expect-error
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
