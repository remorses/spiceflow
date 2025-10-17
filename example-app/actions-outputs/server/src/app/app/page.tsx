'use client';

import { wrapGetServerSideProps as _wrapGetServerSideProps } from "server-actions-for-next-pages/dist/context-internal";
import { appServerAction } from '@/app/app-actions/route';
import { edgeServerAction } from '@/pages/api/actions-edge';
import { createUser, failingFunction } from '@/pages/api/actions-node';
import { useEffect, useState, useTransition } from 'react';
import superjson from 'superjson';
export default function Home() {
  // throw new Error('This function fails');
  failingFunction({}).catch(error => {
    console.error(error);
    return null;
  });
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState();
  useEffect(() => {
    startTransition(() => {
      return Promise.allSettled([appServerAction({}), edgeServerAction('home'), createUser({
        name: 'test'
      }), failingFunction({}).catch(error => {
        return {
          error
        };
        return null;
      })]).then(x => setState(x));
    });
  }, []);
  return <div className='bg-gray-100 text-gray-800 flex flex-col items-center p-10'>
      {isPending && <div className='text-gray-800 text-center'>Loading...</div>}
      <pre className='overflow-scroll'>
        {JSON.stringify(superjson.serialize(state) || null, null, 2)}
      </pre>
    </div>;
}