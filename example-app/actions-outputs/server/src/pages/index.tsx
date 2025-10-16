import { wrapGetServerSideProps as _wrapGetServerSideProps } from "server-actions-for-next-pages/dist/context-internal";
import { createUser, generateNumbers, longRunningTask, streamWithAbort } from '@/pages/api/actions-node';
import { useEffect, useState } from 'react';
export default function Page({
  x
}) {
  useEffect(() => {
    console.log('this is a pages page');
    createUser({
      name: 'test'
    });
  }, []);
  const [count, setCount] = useState(0);
  const [abortTestResult, setAbortTestResult] = useState('');
  useEffect(() => {
    async function startCounting() {
      const generator = generateNumbers();
      console.log('generator', generator);
      for await (const {
        count
      } of generator) {
        setCount(count);
        console.log('count', count);
        if (count > 10) break;
      }
    }
    startCounting();
  }, []);
  const testAbortController = async () => {
    const controller = new AbortController();
    setTimeout(() => {
      console.log('Aborting request...');
      controller.abort('User cancelled');
    }, 2000);
    try {
      const result = await longRunningTask(controller.signal);
      setAbortTestResult('Task completed: ' + JSON.stringify(result));
    } catch (error) {
      setAbortTestResult('Task failed: ' + error.message);
    }
  };
  const testAbortStream = async () => {
    const controller = new AbortController();
    setTimeout(() => {
      console.log('Aborting stream...');
      controller.abort('User cancelled stream');
    }, 3000);
    try {
      const generator = streamWithAbort({
        signal: controller.signal
      });
      for await (const {
        count
      } of generator) {
        setCount(count);
        console.log('stream count', count);
      }
      setAbortTestResult('Stream completed');
    } catch (error) {
      setAbortTestResult('Stream aborted: ' + error.message);
    }
  };
  return <div className='p-4'>
      <div>this is a pages page {JSON.stringify(x)} {count}</div>
      <div className='mt-4 space-y-2'>
        <button onClick={testAbortController} className='px-4 py-2 bg-blue-500 text-white rounded'>
          Test Abort Controller
        </button>
        <button onClick={testAbortStream} className='px-4 py-2 bg-green-500 text-white rounded ml-2'>
          Test Abort Stream
        </button>
        <div className='mt-2'>Result: {abortTestResult}</div>
      </div>
    </div>;
}
export const getServerSideProps = /*#__PURE__*/_wrapGetServerSideProps(async function getServerSideProps() {
  const x = await createUser({
    name: 'test'
  });
  return {
    props: {
      x
    }
  };
});