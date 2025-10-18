"poor man's use server";

import { createRpcMethod as _createRpcMethod, createRpcHandler as _createRpcHandler } from "server-actions-for-next-pages/dist/server";
import fs from 'fs';
import { revalidatePath } from 'next/cache';
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
  name: "sendMessage",
  pathname: "/optimistic/actions"
}, null);
function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
export default /*#__PURE__*/_createRpcHandler([["sendMessage", sendMessage]], false);