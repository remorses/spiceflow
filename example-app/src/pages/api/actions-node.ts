'poor man user server';

export async function createUser({ name = '' }) {
  return {
    id: 1,
    name,
  };
}

export async function failingFunction({}) {
  throw new Error('This function fails');
}
