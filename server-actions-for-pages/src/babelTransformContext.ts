import { annotateAsPure } from './astUtils';
import * as babel from '@babel/core';

type Babel = typeof babel;

const IMPORT_PATH = 'next-rpc/dist/context-internal';

export interface PluginOptions {
  apiDir: string;
  isServer: boolean;
}

function visitApiHandler(
  { types: t }: Babel,
  path: babel.NodePath<babel.types.Program>
) {
  let defaultExportPath:
    | babel.NodePath<babel.types.ExportDefaultDeclaration>
    | undefined;

  path.traverse({
    ExportDefaultDeclaration(path) {
      defaultExportPath = path;
    },
  });

  if (defaultExportPath) {
    const { declaration } = defaultExportPath.node;
    if (t.isTSDeclareFunction(declaration)) {
      return;
    }

    const wrapApiHandlerIdentifier =
      path.scope.generateUidIdentifier('wrapApiHandler');

    path.node.body.unshift(
      t.importDeclaration(
        [
          t.importSpecifier(
            wrapApiHandlerIdentifier,
            t.identifier('wrapApiHandler')
          ),
        ],
        t.stringLiteral(IMPORT_PATH)
      )
    );

    const exportAsExpression = t.isDeclaration(declaration)
      ? t.toExpression(declaration)
      : declaration;

    defaultExportPath.replaceWith(
      t.exportDefaultDeclaration(
        annotateAsPure(
          t,
          t.callExpression(wrapApiHandlerIdentifier, [exportAsExpression])
        )
      )
    );
  }
}

function visitPage(
  { types: t }: Babel,
  path: babel.NodePath<babel.types.Program>
) {
  const wrapGetServerSidePropsIdentifier = path.scope.generateUidIdentifier(
    'wrapGetServerSideProps'
  );
  const wrapPageIdentifier = path.scope.generateUidIdentifier('wrapPage');

  path.node.body.unshift(
    t.importDeclaration(
      [
        t.importSpecifier(
          wrapGetServerSidePropsIdentifier,
          t.identifier('wrapGetServerSideProps')
        ),
        t.importSpecifier(wrapPageIdentifier, t.identifier('wrapPage')),
      ],
      t.stringLiteral(IMPORT_PATH)
    )
  );

  path.traverse({
    ExportNamedDeclaration(path) {
      const declarationPath = path.get('declaration');
      if (
        declarationPath.isFunctionDeclaration() &&
        declarationPath.get('id').isIdentifier({ name: 'getServerSideProps' })
      ) {
        const declaration = declarationPath.node;
        const exportAsExpression = t.isDeclaration(declaration)
          ? t.toExpression(declaration)
          : declaration;

        path.node.declaration = t.variableDeclaration('const', [
          t.variableDeclarator(
            declaration.id as babel.types.Identifier,
            annotateAsPure(
              t,
              t.callExpression(wrapGetServerSidePropsIdentifier, [
                exportAsExpression,
              ])
            )
          ),
        ]);
      } else if (declarationPath.isVariableDeclaration()) {
        const declarations = declarationPath.get('declarations');

        for (const variableDeclaratorPath of declarations) {
          if (
            variableDeclaratorPath
              .get('id')
              .isIdentifier({ name: 'getServerSideProps' })
          ) {
            const initPath = variableDeclaratorPath.get('init');
            if (initPath.node) {
              initPath.replaceWith(
                t.callExpression(wrapGetServerSidePropsIdentifier, [
                  initPath.node,
                ])
              );
            }
          }
        }
      }
    },
    ExportDefaultDeclaration(defaultExportPath) {
      const { declaration } = defaultExportPath.node;
      if (t.isTSDeclareFunction(declaration)) {
        return;
      }

      if (t.isDeclaration(declaration)) {
        if (!declaration.id) {
          return;
        }

        defaultExportPath.insertAfter(
          t.expressionStatement(
            t.assignmentExpression(
              '=',
              declaration.id,
              annotateAsPure(
                t,
                t.callExpression(wrapPageIdentifier, [declaration.id])
              )
            )
          )
        );
      } else {
        defaultExportPath.replaceWith(
          t.exportDefaultDeclaration(
            annotateAsPure(
              t,
              t.callExpression(wrapPageIdentifier, [declaration])
            )
          )
        );
        defaultExportPath.skip();
      }
    },
  });
}

export default function (
  babel: Babel,
  options: PluginOptions
): babel.PluginObj {
  const { apiDir, isServer } = options;

  return {
    visitor: {
      Program(path) {
        if (!isServer) {
          return;
        }

        const { filename } = this.file.opts;
        const isApiRoute = filename && filename.startsWith(apiDir);
        const isMiddleware =
          filename && /(\/|\\)_middleware\.\w+$/.test(filename);

        if (isApiRoute) {
          visitApiHandler(babel, path);
        } else if (!isMiddleware) {
          visitPage(babel, path);
        }
      },
    },
  };
}
