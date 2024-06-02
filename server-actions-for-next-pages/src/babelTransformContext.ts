import { annotateAsPure } from './utils';
import * as babel from '@babel/core';
import { getConfigObject, isEdgeInConfig } from './babelTransformRpc';

type Babel = typeof babel;

const { name } = require('../package.json');

const IMPORT_PATH = `${name}/dist/context-internal`;

export interface PluginOptions {
  apiDir: string;
  isServer: boolean;
}

/**
 * injects context for api routes, not needed for app routes because headers() and cookies() are already available
 */
function visitApiHandler(
  { types: t }: Babel,
  program: babel.NodePath<babel.types.Program>,
) {
  let defaultExportPath:
    | babel.NodePath<babel.types.ExportDefaultDeclaration>
    | undefined;

  program.traverse({
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
      program.scope.generateUidIdentifier('wrapApiHandler');

    program.node.body.unshift(
      t.importDeclaration(
        [
          t.importSpecifier(
            wrapApiHandlerIdentifier,
            t.identifier('wrapApiHandler'),
          ),
        ],
        t.stringLiteral(IMPORT_PATH),
      ),
    );

    const exportAsExpression = t.isDeclaration(declaration)
      ? t.toExpression(declaration)
      : declaration;

    const { isEdge } = getConfigObject(program) || { isEdge: false };
    defaultExportPath.replaceWith(
      t.exportDefaultDeclaration(
        annotateAsPure(
          t,
          t.callExpression(wrapApiHandlerIdentifier, [
            exportAsExpression,
            isEdge ? t.booleanLiteral(true) : t.booleanLiteral(false),
          ]),
        ),
      ),
    );
  }
}

export default function (
  babel: Babel,
  options: PluginOptions,
): babel.PluginObj {
  const { apiDir, isServer } = options;

  return {
    visitor: {
      Program(program) {
        if (!isServer) {
          return;
        }

        const { filename } = this.file.opts;
        const isApiRoute = filename && filename.startsWith(apiDir);

        if (isApiRoute) {
          visitApiHandler(babel, program);
        }
      },
    },
  };
}
