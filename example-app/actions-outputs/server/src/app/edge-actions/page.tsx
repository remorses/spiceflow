'use client';

import { wrapGetServerSideProps as _wrapGetServerSideProps } from "server-actions-for-next-pages/dist/context-internal";
import { edgeServerAction } from '@/pages/api/actions-edge';
import { useEffect, useState } from 'react';
export default function Home() {
  const [state, setState] = useState();
  useEffect(() => {
    edgeServerAction({}).then(res => {
      setState(res);
    });
  }, []);
  return <div>{JSON.stringify(state)}</div>;
}