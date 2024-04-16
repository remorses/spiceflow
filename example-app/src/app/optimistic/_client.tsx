'use client';

import { sendMessage } from '@/app/optimistic/actions/route';
import { useRouter } from 'next/navigation';
import { useOptimistic, useRef, useTransition } from 'react';

export function Client({ messages }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage) => [
      ...state,
      {
        text: newMessage,
        sending: true,
      },
    ],
  );
  const input = useRef<any>();
  const router = useRouter();
  return (
    <div className='p-12 items-stretch flex w-[500px] flex-col gap-3'>
      {optimisticMessages.map((message, index) => (
        <div className='p-2 border rounded' key={index}>
          {message.text}
          {!!message.sending && <small> (Sending...)</small>}
        </div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = input.current.value;
          startTransition(async () => {
            addOptimisticMessage(text);
            input.current.value = '';
            await sendMessage({ text });
            router.refresh();
          });
        }}
      >
        <div className='flex gap-3'>
          <input
            className=' grow rounded border p-2'
            ref={input}
            type='text'
            name='message'
            placeholder='Hello!'
          />
          <button className='rounded p-2 border' type='submit'>
            {isPending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
