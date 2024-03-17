import { PluginPass } from '@babel/core';

import { Node, types } from '@babel/core';

const PURE_ANNOTATION = '#__PURE__';

export function annotateAsPure<N extends Node>(t: typeof types, node: N): N {
  t.addComment(node, 'leading', PURE_ANNOTATION);
  return node;
}

export type Literal =
  | number
  | string
  | boolean
  | { [key: string]: Literal }
  | Literal[];

export function literalToAst(
  t: typeof types,
  literal: Literal,
): types.Expression {
  if (typeof literal === 'number') {
    return t.numericLiteral(literal);
  } else if (typeof literal === 'boolean') {
    return t.booleanLiteral(literal);
  } else if (typeof literal === 'string') {
    return t.stringLiteral(literal);
  } else if (Array.isArray(literal)) {
    return t.arrayExpression(literal.map((item) => literalToAst(t, item)));
  } else if (typeof literal === 'object') {
    return t.objectExpression(
      Object.entries(literal).map(([key, value]) => {
        return t.objectProperty(t.identifier(key), literalToAst(t, value));
      }),
    );
  }
  throw new Error(`Unsupported literal type "${typeof literal}"`);
}

const enabled = !!process.env.DEBUG_ACTIONS;
export const logger = {
  log(...args) {
    enabled && console.log('[actions]:', ...args);
  },
  error(...args) {
    enabled && console.log('[actions]:', ...args);
  },
};

export function getFileName(state: PluginPass) {
  const { filename, cwd } = state;

  if (!filename) {
    return undefined;
  }

  if (cwd && filename.startsWith(cwd)) {
    return filename.slice(cwd.length + 1);
  }

  return filename;
}
export const directive = "poor man's use server";
