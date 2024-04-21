import { useState, useEffect } from 'react';
import { asyncGeneratorActionEdge } from '@/pages/api/actions-edge';

export default function Generator() {
  const [stream, setStream] = useState<any>('');

  useEffect(() => {
    (async function () {
      const gen = await asyncGeneratorActionEdge({ arg: 'exampleArg' });

      console.log('node generator', gen);

      while (true) {
        const { value, done } = await gen.next();
        if (done) break;
        console.log('node generator value', value);
        setStream((x) => x + value.i);
        // Process value
      }
      return;
    })();
  }, []);
  return <pre className=''>{stream}</pre>;
}
