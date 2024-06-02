'use client';

import {
  asyncGeneratorActionEdge,
  edgeServerAction,
} from '@/pages/api/actions-edge';
import {
  asyncGeneratorActionNode,
  createUser,
  failingFunction,
} from '@/pages/api/actions-node';
import { useEffect, useState, useTransition } from 'react';
import superjson from 'superjson';

export default function Home() {
  // throw new Error('This function fails');
  // failingFunction({ username: 'user' }).catch((error: any) => {
  //   console.error(error);
  //   return error;
  // });
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState();
  useEffect(() => {
    startTransition(() => {
      return Promise.allSettled([
        edgeServerAction('home'),
        createUser({ name: 'test' }),
        failingFunction({ username: 'xx' }),
      ]).then((x) => setState(x as any));
    });
  }, []);

  const [stream, setStream] = useState<any>('');
  // useEffect(() => {
  //   (async function () {
  //     const gen = await asyncGeneratorActionEdge();

  //     for await (const value of gen) {
  //       console.log('edge generator value', value);
  //       setStream((x) => x + value.i);
  //     }
  //   })();
  // }, []);
  useEffect(() => {
    (async function () {
      const gen = await asyncGeneratorActionNode({ arg: 'exampleArg' });

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
  return (
    <div className='bg-gray-100 text-gray-800 flex flex-col items-center p-10'>
      {isPending && <div className='text-gray-800 text-center'>Loading...</div>}
      <pre className='overflow-scroll'>
        {JSON.stringify(superjson.serialize(state) || null, null, 2)}
      </pre>
      <div className=''>streamed state</div>

      <pre className=''>{stream}</pre>
    </div>
  );
}
