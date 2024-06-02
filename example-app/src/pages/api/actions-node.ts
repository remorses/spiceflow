"poor man's use server";
import fs from 'fs';
import { revalidatePath } from 'next/cache';

import { z } from 'zod';

import { User } from '@/utils';
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
      console.log('wrapMethod', fn.name)
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
  throw new Error('This function fails');
}

export async function sendMessage({ text }) {
  // console.log('edge cookies & headers', cookies(), headers());
  await sleep(100);
  await fs.promises.writeFile(
    './optimistic.json',
    JSON.stringify(
      [
        ...JSON.parse(fs.readFileSync('./optimistic.json', 'utf-8')),
        {
          text,
          sending: false,
        },
      ],
      null,
      2,
    ),
  );
  revalidatePath('/optimistic');

  return {};
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
