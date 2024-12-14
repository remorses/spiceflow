import { createUser, generateNumbers } from '@/pages/api/actions-node';
import { useEffect, useState } from 'react';

export default function Page({ x }) {
  useEffect(() => {
    console.log('this is a pages page');
    createUser({ name: 'test' });
  }, []);
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function startCounting() {
      const generator = await generateNumbers();
      console.log('generator', generator);
      for await (const { count } of generator) {
        setCount(count);
        console.log('count', count);
        if (count > 10) break; // Optional: stop after 10 counts
      }
    }
    startCounting();
  }, []);
  return (
    <div className=''>
      this is a pages page {JSON.stringify(x)} {count}
    </div>
  );
}

export async function getServerSideProps() {
  const x = await createUser({ name: 'test' });
  return { props: { x } };
}
