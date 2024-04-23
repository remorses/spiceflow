import { action } from '../dist/example';

const res = await action({ someThing: 'test' });
console.log(res);
