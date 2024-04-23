"poor man's use server";

import { UserType, User } from 'example-app/src/utils.js';

export async function* generator(user: UserType) {
  const x = User.parse(user);
  for (let i = 0; i < 10; i++) {
    await sleep(300);
    yield { i };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
