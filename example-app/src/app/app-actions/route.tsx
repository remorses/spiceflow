"poor man's use server";

import {
  getContext,
  getEdgeContext,
} from 'server-actions-for-next-pages/context';

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

export async function appServerAction({}) {
  const { cookies, headers } = getContext();
  // console.log('edge cookies & headers', cookies(), headers());

  return {
    cookies: cookies().toString().slice(0, 20),
    headers: Array.from(headers().keys()),
    functionName: 'appRouteAction',
  };
}
