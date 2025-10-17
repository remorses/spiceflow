import { wrapGetServerSideProps as _wrapGetServerSideProps } from "server-actions-for-next-pages/dist/context-internal";
import { longRunningTask, streamWithAbort } from '@/pages/api/actions-node';
import { useState } from 'react';
export default function AbortTestPage() {
  const [taskStatus, setTaskStatus] = useState('');
  const [streamStatus, setStreamStatus] = useState('');
  const [streamCount, setStreamCount] = useState(0);
  const [isTaskRunning, setIsTaskRunning] = useState(false);
  const [isStreamRunning, setIsStreamRunning] = useState(false);
  const [taskController, setTaskController] = useState(null);
  const [streamController, setStreamController] = useState(null);
  const startLongRunningTask = async () => {
    const controller = new AbortController();
    setTaskController(controller);
    setIsTaskRunning(true);
    setTaskStatus('Task running...');
    try {
      const result = await longRunningTask(controller.signal);
      setTaskStatus('Task completed: ' + JSON.stringify(result));
    } catch (error) {
      if (error.message.includes('aborted')) {
        setTaskStatus('Task aborted: ' + error.message);
      } else {
        setTaskStatus('Task failed: ' + error.message);
      }
    } finally {
      setIsTaskRunning(false);
      setTaskController(null);
    }
  };
  const abortLongRunningTask = () => {
    if (taskController) {
      console.log('Aborting long running task');
      taskController.abort('User cancelled via button');
    }
  };
  const startStream = async () => {
    const controller = new AbortController();
    setStreamController(controller);
    setIsStreamRunning(true);
    setStreamStatus('Stream running...');
    setStreamCount(0);
    try {
      const generator = streamWithAbort({
        signal: controller.signal
      });
      for await (const {
        count
      } of generator) {
        setStreamCount(count);
        console.log('Stream count:', count);
      }
      setStreamStatus('Stream completed successfully');
    } catch (error) {
      if (error.message.includes('aborted')) {
        setStreamStatus('Stream aborted: ' + error.message);
      } else {
        setStreamStatus('Stream failed: ' + error.message);
      }
    } finally {
      setIsStreamRunning(false);
      setStreamController(null);
    }
  };
  const abortStream = () => {
    if (streamController) {
      console.log('Aborting stream');
      streamController.abort('User cancelled stream via button');
    }
  };
  const startAutoAbortTask = async () => {
    const controller = new AbortController();
    setTaskController(controller);
    setIsTaskRunning(true);
    setTaskStatus('Task running... will auto-abort in 2 seconds');
    setTimeout(() => {
      console.log('Auto-aborting task after 2 seconds');
      controller.abort('Auto-aborted after 2 seconds');
    }, 2000);
    try {
      const result = await longRunningTask(controller.signal);
      setTaskStatus('Task completed: ' + JSON.stringify(result));
    } catch (error) {
      if (error.message.includes('aborted')) {
        setTaskStatus('Task aborted: ' + error.message);
      } else {
        setTaskStatus('Task failed: ' + error.message);
      }
    } finally {
      setIsTaskRunning(false);
      setTaskController(null);
    }
  };
  const startAutoAbortStream = async () => {
    const controller = new AbortController();
    setStreamController(controller);
    setIsStreamRunning(true);
    setStreamStatus('Stream running... will auto-abort in 3 seconds');
    setStreamCount(0);
    setTimeout(() => {
      console.log('Auto-aborting stream after 3 seconds');
      controller.abort('Auto-aborted after 3 seconds');
    }, 3000);
    try {
      const generator = streamWithAbort({
        signal: controller.signal
      });
      for await (const {
        count
      } of generator) {
        setStreamCount(count);
        console.log('Stream count:', count);
      }
      setStreamStatus('Stream completed successfully');
    } catch (error) {
      if (error.message.includes('aborted')) {
        setStreamStatus('Stream aborted: ' + error.message);
      } else {
        setStreamStatus('Stream failed: ' + error.message);
      }
    } finally {
      setIsStreamRunning(false);
      setStreamController(null);
    }
  };
  return <div className='p-8 max-w-4xl mx-auto'>
      <h1 className='text-3xl font-bold mb-8'>AbortController Test Page</h1>
      
      <div className='space-y-8'>
        <div className='border border-gray-300 rounded-lg p-6'>
          <h2 className='text-2xl font-semibold mb-4'>Long Running Task</h2>
          <p className='text-gray-600 mb-4'>
            This task runs for 10 seconds (10 iterations × 1 second each).
            You can abort it manually or let it complete.
          </p>
          
          <div className='flex gap-4 mb-4'>
            <button onClick={startLongRunningTask} disabled={isTaskRunning} className='px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed'>
              Start Task
            </button>
            <button onClick={abortLongRunningTask} disabled={!isTaskRunning} className='px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed'>
              Abort Task
            </button>
            <button onClick={startAutoAbortTask} disabled={isTaskRunning} className='px-4 py-2 bg-orange-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed'>
              Start Task (Auto-abort in 2s)
            </button>
          </div>
          
          <div className='bg-gray-100 p-4 rounded'>
            <p className='font-mono text-sm'>Status: {taskStatus || 'Not started'}</p>
          </div>
        </div>

        <div className='border border-gray-300 rounded-lg p-6'>
          <h2 className='text-2xl font-semibold mb-4'>Streaming with Abort</h2>
          <p className='text-gray-600 mb-4'>
            This stream runs for 10 seconds (20 iterations × 0.5 seconds each).
            You can abort it manually or let it complete.
          </p>
          
          <div className='flex gap-4 mb-4'>
            <button onClick={startStream} disabled={isStreamRunning} className='px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed'>
              Start Stream
            </button>
            <button onClick={abortStream} disabled={!isStreamRunning} className='px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed'>
              Abort Stream
            </button>
            <button onClick={startAutoAbortStream} disabled={isStreamRunning} className='px-4 py-2 bg-orange-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed'>
              Start Stream (Auto-abort in 3s)
            </button>
          </div>
          
          <div className='bg-gray-100 p-4 rounded space-y-2'>
            <p className='font-mono text-sm'>Status: {streamStatus || 'Not started'}</p>
            <p className='font-mono text-sm'>Current count: {streamCount}</p>
          </div>
        </div>

        <div className='bg-blue-50 border border-blue-200 rounded-lg p-6'>
          <h3 className='font-semibold mb-2'>How it works:</h3>
          <ul className='list-disc list-inside space-y-1 text-sm text-gray-700'>
            <li>Client-side: AbortSignal is detected in arguments and passed to fetch()</li>
            <li>Server-side: Client's AbortSignal is replaced with request's AbortSignal</li>
            <li>When request is aborted, the server function receives the abort signal</li>
            <li>The server function can check signal.aborted to stop execution</li>
            <li>Both regular async functions and async generators support abort</li>
          </ul>
        </div>
      </div>
    </div>;
}