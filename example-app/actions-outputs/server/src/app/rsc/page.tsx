import { wrapGetServerSideProps as _wrapGetServerSideProps } from "server-actions-for-next-pages/dist/context-internal";
import { createUser } from '@/pages/api/actions-node';
export default async function Home() {
  // throw new Error('This function fails');
  const state = await createUser({
    name: 'test'
  });
  return <div className='bg-gray-100 text-gray-800 flex flex-col items-center p-10'>
      <pre className=''>{JSON.stringify(state || null, null, 2)}</pre>
    </div>;
}