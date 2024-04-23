import { action, generator } from '../dist';

async function main() {
  const res = await action({ someThing: 'test' });
  console.log(res);

  for await (const value of generator({ username: 'test' })) {
    console.log('generator value', value);
  }
}
main();
