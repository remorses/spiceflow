import { annotateAsPure, literalToAst } from './astUtils';
import * as babel from '@babel/core';
import { WrapMethodMeta } from './server';

type Babel = typeof babel;
type BabelTypes = typeof babel.types;

const IMPORT_PATH_SERVER = 'next-rpc/dist/server';
const IMPORT_PATH_BROWSER = 'next-rpc/dist/browser';

function buildRpcApiHandler(
  t: BabelTypes,
  createRpcHandlerIdentifier: babel.types.Identifier,
  rpcMethodNames: string[]
): babel.types.Expression {
  return annotateAsPure(
    t,
    t.callExpression(createRpcHandlerIdentifier, [
      t.arrayExpression(
        rpcMethodNames.map((name) =>
          t.arrayExpression([t.stringLiteral(name), t.identifier(name)])
        )
      ),
    ])
  );
}

function isAllowedTsExportDeclaration(
  declaration: babel.NodePath<babel.types.Declaration | null | undefined>
): boolean {
  return (
    declaration.isTSTypeAliasDeclaration() ||
    declaration.isTSInterfaceDeclaration()
  );
}

function getConfigObjectExpression(
  variable: babel.NodePath<babel.types.VariableDeclarator>
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

function getConfigObject(
  program: babel.NodePath<babel.types.Program>
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

function isRpc(
  configObject: babel.NodePath<babel.types.ObjectExpression>
): boolean {
  for (const property of configObject.get('properties')) {
    if (!property.isObjectProperty()) {
      continue;
    }
    const key = property.get('key');
    const value = property.get('value');
    if (
      property.isObjectProperty() &&
      key.isIdentifier({ name: 'rpc' }) &&
      value.isBooleanLiteral({ value: true })
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
  { apiDir, pagesDir, isServer, basePath }: PluginOptions
): babel.PluginObj {
  return {
    visitor: {
      Program(program) {
        const { filename } = this.file.opts;

        if (!filename) {
          return;
        }

        const isApiRoute = filename && filename.startsWith(apiDir);

        if (!isApiRoute) {
          return;
        }

        const configObject = getConfigObject(program);

        if (!configObject || !isRpc(configObject)) {
          return;
        }

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
          meta: WrapMethodMeta
        ) => {
          return t.callExpression(createRpcMethodIdentifier, [
            rpcMethod,
            literalToAst(t, meta),
            t.memberExpression(
              t.identifier('config'),
              t.identifier('wrapMethod')
            ),
          ]);
        };

        for (const statement of program.get('body')) {
          if (statement.isExportNamedDeclaration()) {
            const declaration = statement.get('declaration');
            if (isAllowedTsExportDeclaration(declaration)) {
              // ignore
            } else if (declaration.isFunctionDeclaration()) {
              if (!declaration.node.async) {
                throw declaration.buildCodeFrameError(
                  'rpc exports must be async functions'
                );
              }
              const identifier = declaration.get('id');
              const methodName = identifier.node?.name;
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
                          })
                        ),
                      ])
                    )
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
                  if (!init.node.async) {
                    throw init.buildCodeFrameError(
                      'rpc exports must be async functions'
                    );
                  }
                  const { id } = variable.node;
                  if (t.isIdentifier(id)) {
                    const methodName = id.name;
                    rpcMethodNames.push(methodName);
                    if (isServer) {
                      init.replaceWith(
                        createRpcMethod(init.node, {
                          name: methodName,
                          pathname: rpcPath,
                        })
                      );
                    }
                  }
                } else {
                  throw variable.buildCodeFrameError(
                    'rpc exports must be static functions'
                  );
                }
              }
            } else {
              for (const specifier of statement.get('specifiers')) {
                throw specifier.buildCodeFrameError(
                  'rpc exports must be static functions'
                );
              }
            }
          } else if (statement.isExportDefaultDeclaration()) {
            throw statement.buildCodeFrameError(
              'default exports are not allowed in rpc routes'
            );
          }
        }

        if (isServer) {
          const createRpcHandlerIdentifier =
            program.scope.generateUidIdentifier('createRpcHandler');

          let apiHandlerExpression = buildRpcApiHandler(
            t,
            createRpcHandlerIdentifier,
            rpcMethodNames
          );

          program.unshiftContainer('body', [
            t.importDeclaration(
              [
                t.importSpecifier(
                  createRpcMethodIdentifier,
                  t.identifier('createRpcMethod')
                ),
                t.importSpecifier(
                  createRpcHandlerIdentifier,
                  t.identifier('createRpcHandler')
                ),
              ],
              t.stringLiteral(IMPORT_PATH_SERVER)
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
                  t.identifier('createRpcFetcher')
                ),
              ],
              t.stringLiteral(IMPORT_PATH_BROWSER)
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
                      ])
                    )
                  ),
                ])
              )
            ),
          ]);
        }
      },
    },
  };
}
