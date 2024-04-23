"poor man's use server";
import { z } from 'zod';

import { UserType } from 'example-app/src/utils';

export async function* generator({}: UserType) {
  for (let i = 0; i < 10; i++) {
    await sleep(300);
    yield { i };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
