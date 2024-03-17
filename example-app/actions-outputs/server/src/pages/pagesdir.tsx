import { wrapGetServerSideProps as _wrapGetServerSideProps, wrapPage as _wrapPage } from "server-actions-for-next-pages/dist/context-internal";
import { createUser } from '@/pages/api/actions-node';
import { useEffect } from 'react';
export default function Page({
  x
}) {
  useEffect(() => {
    console.log('this is a pages page');
    createUser({
      name: 'test'
    });
  }, []);
  return <div className=''>this is a pages page {JSON.stringify(x)}</div>;
}
Page = /*#__PURE__*/_wrapPage(Page);
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