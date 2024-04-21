"poor man's use server";
import { z } from 'zod';

import { User } from '@/utils';
import { revalidatePath } from 'next/cache';
import { getNodejsContext } from 'server-actions-for-next-pages/context';
import { getContext } from 'server-actions-for-next-pages/context';
import { cookies, headers } from 'server-actions-for-next-pages/headers';

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

// async generator
export async function* asyncGeneratorActionNode(arg) {
  for (let i = 0; i < 10; i++) {
    await sleep(300);
    yield { arg, i };
  }
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

/**
 * @public
 */
export async function failingFunction({}: z.infer<typeof User>) {
  // throw new Error('This function fails');
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
