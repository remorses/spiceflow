import { generateNumbersWithError } from '@/pages/api/actions-node';
import { useEffect, useState } from 'react';

export default function ErrorTestPage() {
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function startCounting() {
      try {
        const generator = await generateNumbersWithError();
        for await (const { count } of generator) {
          setCount(count);
          console.log('count', count);
        }
      } catch (err) {
        console.error('Caught error:', err);
        setError(err instanceof Error ? err.message : String(err));
      }
    }
    startCounting();
  }, []);

  return (
    <div className='p-8'>
      <h1 className='text-2xl font-bold mb-4'>Error Test Page</h1>
      <p>Count: {count}</p>
      {error && (
        <div className='mt-4 p-4 bg-red-100 border border-red-400 text-red-700'>
          <p className='font-bold'>Error occurred:</p>
          <p>Message: "{error}"</p>
          <p>Message length: {error.length}</p>
        </div>
      )}
    </div>
  );
}
