'use server actions';

export const config = {
  runtime: 'edge',
};

export async function serverAction({}) {
  return 'Hello from server action';
}
