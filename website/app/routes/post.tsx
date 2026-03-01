import { useLoaderData } from 'react-router'

export async function loader() {
  return {
    title: 'Post',
  }
}

export default function Page() {
  const data = useLoaderData()
  return (
    <div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  )
}
