"poor man's use server";
import { getNodejsContext } from 'server-actions-for-next-pages/context';

export async function createUser({ name = '' }) {
  const { req, res } = await getNodejsContext();
  const url = req?.url;
  return {
    name,
    url,
  };
}

export function wrapMethod(fn) {
  return async (...args) => {
    try {
      const res = await fn(...args);
      return res;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };
}

export async function failingFunction({}) {
  throw new Error('This function fails');
}
