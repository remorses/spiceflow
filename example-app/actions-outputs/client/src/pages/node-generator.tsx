import { useState, useEffect } from 'react';
import { asyncGeneratorActionNode } from '@/pages/api/actions-node';
export default function Generator() {
  const [stream, setStream] = useState('');
  useEffect(() => {
    (async function () {
      const gen = await asyncGeneratorActionNode({
        arg: 'exampleArg'
      });
      console.log('node generator', gen);
      while (true) {
        const {
          value,
          done
        } = await gen.next();
        if (done) {
          console.log('done');
          break;
        }
        console.log('node generator value', value);
        setStream(x => x + value.i);
        // Process value
      }
      return;
    })();
  }, []);
  return <pre className=''>{stream}</pre>;
}