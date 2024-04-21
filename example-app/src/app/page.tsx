'use client';

import { appServerAction } from '@/app/app-actions/route';
import {
  asyncGeneratorAction,
  edgeServerAction,
} from '@/pages/api/actions-edge';
import { createUser, failingFunction } from '@/pages/api/actions-node';
import { useEffect, useState, useTransition } from 'react';
import superjson from 'superjson';

export default function Home() {
  // throw new Error('This function fails');
  failingFunction({}).catch((error: any) => {
    console.error(error);
    return null;
  });
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState();
  useEffect(() => {
    startTransition(() => {
      return Promise.allSettled([
        appServerAction({}),
        edgeServerAction('home'),
        createUser({ name: 'test' }),
        failingFunction({ username: 'xx' }).catch((error: any) => {
          return { error };
          return null;
        }),
      ]).then((x) => setState(x as any));
    });
  }, []);

  const [stream, setStream] = useState<any>();
  useEffect(() => {
    (async function () {
      const gen = await asyncGeneratorAction();

      // while (true) {
      //   const { value, done } = await gen.next();
      //   setStream(value);
      //   if (done) break;
      //   // Process value
      // }
      // return;
      for await (const value of gen) {
        console.log('value', value);
        setStream(value.i);
      }
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
