
"poor man's use server";

import {
  getContext,
  getEdgeContext,
} from 'server-actions-for-next-pages/context';
import { cookies, headers } from 'server-actions-for-next-pages/headers';

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
  // console.log('edge cookies & headers', cookies(), headers());

  return {
    cookies: cookies().toString().slice(0, 20),
    headers: Array.from(headers().keys()).slice(0, 2),
    functionName: 'appRouteAction',
  };
}
