"poor man's use server";

import { createRpcMethod as _createRpcMethod, createRpcHandler as _createRpcHandler } from "server-actions-for-next-pages/dist/server";
import { getContext, getNodejsContext } from 'server-actions-for-next-pages/context';
import * as fs from 'fs';
import * as path from 'path';
export const createUser = _createRpcMethod(async function createUser({
  name = ''
}) {
  const {
    req,
    res
  } = await getNodejsContext();
  await sleep(1000);
  // console.log('node cookies & headers', headers());
  const url = req?.url;

  // Node.js-only code to test loader transformation
  const cwd = process.cwd();
  const packageJsonPath = path.join(cwd, 'package.json');
  const packageExists = fs.existsSync(packageJsonPath);

  // revalidatePath('/');
  return {
    functionName: 'nodejs createUser',
    url,
    nodeOnlyData: {
      cwd,
      packageExists,
      pid: process.pid,
      platform: process.platform
    }
  };
}, {
  name: "createUser",
  pathname: "/api/actions-node"
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
export function wrapMethod(fn) {
  return async (...args) => {
    try {
      const res = await fn(...args);
      return res;
    } catch (error) {
      // console.error(error);
      throw error;
    }
  };
}
export const generateNumbers = _createRpcMethod(async function* generateNumbers() {
  const {
    request
  } = getContext();
  console.log('request', request?.url);
  let count = 0;
  while (count < 10) {
    await sleep(1000); // Using the existing sleep function
    yield {
      count
    };
    count++;
  }
}, {
  name: "generateNumbers",
  pathname: "/api/actions-node"
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
export const generateNumbersWithError = _createRpcMethod(async function* generateNumbersWithError() {
  let count = 0;
  while (count < 10) {
    await sleep(500);
    yield {
      count
    };
    count++;
    if (count === 3) {
      throw new Error('Error after yielding 3 times');
    }
  }
}, {
  name: "generateNumbersWithError",
  pathname: "/api/actions-node"
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
export const failingFunction = _createRpcMethod(async function failingFunction({}) {
  throw new Error('This function fails');
}, {
  name: "failingFunction",
  pathname: "/api/actions-node"
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
export const longRunningTask = _createRpcMethod(async function longRunningTask(signal: AbortSignal) {
  console.log('Starting long running task');
  for (let i = 0; i < 10; i++) {
    if (signal.aborted) {
      console.log('Task was aborted at iteration', i);
      throw new Error('Task aborted: ' + signal.reason);
    }
    await sleep(1000);
    console.log('Iteration', i);
  }
  return {
    completed: true
  };
}, {
  name: "longRunningTask",
  pathname: "/api/actions-node"
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
export const streamWithAbort = _createRpcMethod(async function* streamWithAbort({
  signal
}: {
  signal: AbortSignal;
}) {
  console.log('Starting stream with abort support');
  for (let i = 0; i < 20; i++) {
    if (signal.aborted) {
      console.log('Stream was aborted at iteration', i);
      throw new Error('Stream aborted: ' + signal.reason);
    }
    await sleep(500);
    yield {
      count: i
    };
  }
}, {
  name: "streamWithAbort",
  pathname: "/api/actions-node"
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
export const readServerFiles = _createRpcMethod(async function readServerFiles() {
  // This function uses Node.js-only APIs and should fail if bundled for client
  const packagePath = path.join(process.cwd(), 'package.json');
  const content = fs.readFileSync(packagePath, 'utf-8');
  const pkg = JSON.parse(content);
  return {
    name: pkg.name,
    version: pkg.version,
    env: process.env.NODE_ENV,
    nodeVersion: process.version
  };
}, {
  name: "readServerFiles",
  pathname: "/api/actions-node"
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
export default /*#__PURE__*/_createRpcHandler([["createUser", createUser], ["generateNumbers", generateNumbers], ["generateNumbersWithError", generateNumbersWithError], ["failingFunction", failingFunction], ["longRunningTask", longRunningTask], ["streamWithAbort", streamWithAbort], ["readServerFiles", readServerFiles]], false);