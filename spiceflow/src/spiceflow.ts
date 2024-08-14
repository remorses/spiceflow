import { PluginPass, parse, traverse } from '@babel/core';

import { Node, types } from '@babel/core';
import { JsonRpcError, JsonRpcErrorResponse } from './jsonRpc.js';

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
export const directive = 'use spiceflow';

export function jsonRpcError({
  id = null,
  message,
  code = 1,
}): JsonRpcErrorResponse {
  return {
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
      data: null,
    },
  };
}

export function camelCaseCapitalized(str: string) {
  // functionName -> FunctionName
  // CamelCase -> CamelCase
  // camelCase -> CamelCase

  if (str.length === 0) {
    return str;
  }
  const first = str[0].toUpperCase();
  return first + str.slice(1);
}

export function removeExtension(filePath: string) {
  return filePath.replace(/\.[j|t]sx?$/, '');
}
