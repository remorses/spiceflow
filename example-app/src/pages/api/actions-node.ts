"poor man's use server";

import {
  getContext,
  getNodejsContext,
} from 'server-actions-for-next-pages/context';

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

export async function* generateNumbers() {
  const { request } = getContext();
  console.log('request', request?.url);
  let count = 0;
  while (count < 10) {
    await sleep(1000); // Using the existing sleep function
    yield { count };
    count++;
  }
}

export async function* generateNumbersWithError() {
  let count = 0;
  while (count < 10) {
    await sleep(500);
    yield { count };
    count++;
    
    if (count === 3) {
      throw new Error('Error after yielding 3 times');
    }
  }
}

export async function failingFunction({}) {
  throw new Error('This function fails');
}

export async function longRunningTask(signal: AbortSignal) {
  console.log('Starting long running task');
  for (let i = 0; i < 10; i++) {
    if (signal.aborted) {
      console.log('Task was aborted at iteration', i);
      throw new Error('Task aborted: ' + signal.reason);
    }
    await sleep(1000);
    console.log('Iteration', i);
  }
  return { completed: true };
}

export async function* streamWithAbort({ signal }: { signal: AbortSignal }) {
  console.log('Starting stream with abort support');
  for (let i = 0; i < 20; i++) {
    if (signal.aborted) {
      console.log('Stream was aborted at iteration', i);
      throw new Error('Stream aborted: ' + signal.reason);
    }
    await sleep(500);
    yield { count: i };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
