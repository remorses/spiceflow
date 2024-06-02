"poor man's use server";

import { createRpcMethod as _createRpcMethod, createRpcHandler as _createRpcHandler } from "server-actions-for-next-pages/dist/server.js";
import fs from 'fs';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { User } from '@/utils';
import { getNodejsContext } from 'server-actions-for-next-pages/context';
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
  // revalidatePath('/');
  return {
    functionName: 'nodejs createUser',
    url
  };
}, {
  "name": "createUser",
  "pathname": "/api/actions-node",
  "isGenerator": false
}, typeof wrapMethod === 'function' ? wrapMethod : undefined); // async generator
export const asyncGeneratorActionNode = _createRpcMethod(async function* asyncGeneratorActionNode(arg) {
  for (let i = 0; i < 10; i++) {
    await sleep(300);
    yield {
      arg,
      i
    };
  }
}, {
  "name": "asyncGeneratorActionNode",
  "pathname": "/api/actions-node",
  "isGenerator": true
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
export function wrapMethod(fn) {
  return async (...args) => {
    try {
      console.log('wrapMethod', fn.name);
      const res = await fn(...args);
      return res;
    } catch (error) {
      // console.error(error);
      throw error;
    }
  };
}

/**
 * @public
 */
export const failingFunction = _createRpcMethod(async function failingFunction({}: z.infer<typeof User>) {
  throw new Error('This function fails');
}, {
  "name": "failingFunction",
  "pathname": "/api/actions-node",
  "isGenerator": false
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
export const sendMessage = _createRpcMethod(async function sendMessage({
  text
}) {
  // console.log('edge cookies & headers', cookies(), headers());
  await sleep(100);
  await fs.promises.writeFile('./optimistic.json', JSON.stringify([...JSON.parse(fs.readFileSync('./optimistic.json', 'utf-8')), {
    text,
    sending: false
  }], null, 2));
  revalidatePath('/optimistic');
  return {};
}, {
  "name": "sendMessage",
  "pathname": "/api/actions-node",
  "isGenerator": false
}, typeof wrapMethod === 'function' ? wrapMethod : undefined);
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
export default _createRpcHandler({
  isEdge: false,
  methods: [{
    method: "createUser",
    implementation: createUser,
    isGenerator: false
  }, {
    method: "asyncGeneratorActionNode",
    implementation: asyncGeneratorActionNode,
    isGenerator: true
  }, {
    method: "failingFunction",
    implementation: failingFunction,
    isGenerator: false
  }, {
    method: "sendMessage",
    implementation: sendMessage,
    isGenerator: false
  }]
});