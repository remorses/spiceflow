"poor man's use server";

import { sleep } from '@/utils';
import { getEdgeContext } from 'server-actions-for-next-pages/context';
import { cookies, headers } from 'server-actions-for-next-pages/headers';

export const runtime = 'edge';
// export const config = { runtime: 'edge' };

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

// async generator
export async function* asyncGeneratorActionEdge(arg?: any) {
  for (let i = 0; i < 10; i++) {
    await sleep(300);
    yield { i };
  }
}

export async function edgeServerAction({}) {
  const { req, res } = await getEdgeContext();

  // console.log('edge cookies & headers', cookies(), headers());
  res?.headers.set('x-server-action', 'true');
  const url = req?.url;

  return {
    url,
    cookies: cookies().toString().slice(0, 20),
    headers: Array.from(headers().keys()).slice(0, 2),
    functionName: 'edgeServerAction',
  };
}
