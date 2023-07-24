'use client';

import { serverAction } from '@/pages/api/actions-edge';
import { createUser, failingFunction } from '@/pages/api/actions-node';
import { useEffect, useState } from 'react';

export default function Home () {
  serverAction('home');
  createUser({ name: 'test' });
  failingFunction({}).catch((error: any) => {
    console.error(error);
    return null;
  });
  const [state, setState] = useState();
  useEffect(() => {
    Promise.all([
      serverAction('home'),
      createUser({ name: 'test' }),
      failingFunction({}).catch((error: any) => {
        console.error(error);
        return null;
      }),
    ]).then((x) => setState(x as any));
  }, []);
  return (
    <div className='bg-gray-100 text-gray-800 flex flex-col items-center p-10'>
      <pre className=''>{JSON.stringify(state || null, null, 2)}</pre>
    </div>
  );
}
