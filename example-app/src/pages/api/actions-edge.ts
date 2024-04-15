"poor man's use server";

import {
  getContext,
  getEdgeContext,
} from 'server-actions-for-next-pages/context';
import { wrapMethod } from './actions-node';

export const runtime = 'edge';

export { wrapMethod };

export async function serverAction({}) {
  const { req, res } = await getEdgeContext();
  const { cookies, headers } = getContext();
  // console.log('cookies & headers', cookies(), headers());
  res?.headers.set('x-server-action', 'true');
  const url = req?.url;
  return { url };
}
