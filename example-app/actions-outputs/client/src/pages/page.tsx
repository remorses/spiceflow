import { createUser } from "@/pages/api/actions-node";
import { useEffect } from "react";
export default function Page() {
  useEffect(() => {
    console.log('this is a pages page');
    createUser({
      name: 'test'
    });
  }, []);
  return <div className="">this is a pages page</div>;
}
export async function getServerSideProps() {
  const x = await createUser({
    name: 'test'
  });
  return {
    props: {
      x
    }
  };
}