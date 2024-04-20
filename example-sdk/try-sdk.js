import { createUser } from './lib/index.js';

const res = await createUser({ name: 'test' });
console.log(res);
