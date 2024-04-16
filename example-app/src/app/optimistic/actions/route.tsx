"poor man's use server";
import fs from 'fs';
import { revalidatePath } from 'next/cache';

import { cookies, headers } from 'server-actions-for-next-pages/headers';

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
