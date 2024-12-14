"poor man's use server";

import { getNodejsContext } from 'server-actions-for-next-pages/context';

export async function createUser({ name = '' }) {
  const { req, res } = await getNodejsContext();

  await sleep(1000);
  // console.log('node cookies & headers', headers());
  const url = req?.url;
  // revalidatePath('/');
  return {
    functionName: 'nodejs createUser',
    url,
  };
}

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

export async function failingFunction({}) {
  throw new Error('This function fails');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
