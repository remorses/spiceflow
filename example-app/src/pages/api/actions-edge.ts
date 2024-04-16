"poor man's use server";

import {
  getContext,
  getEdgeContext,
} from 'server-actions-for-next-pages/context';

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

export async function edgeServerAction({}) {
  const { req, res } = await getEdgeContext();
  const { cookies, headers } = getContext();
  // console.log('edge cookies & headers', cookies(), headers());
  res?.headers.set('x-server-action', 'true');
  const url = req?.url;

  return {
    url,
    cookies: cookies().toString().slice(0, 20),
    headers: Array.from(headers().keys()),
    functionName: 'edgeServerAction',
  };
}
