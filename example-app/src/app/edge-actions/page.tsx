'use client';
import { edgeServerAction } from '@/pages/api/actions-edge';
import { useEffect, useState } from 'react';

export default function Home() {
  const [state, setState] = useState<any>();
  useEffect(() => {
    edgeServerAction({}).then((res) => {
      setState(res);
    });
  }, []);
  return <div>{JSON.stringify(state)}</div>;
}
