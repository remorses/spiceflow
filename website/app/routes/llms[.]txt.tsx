import txt from './_mdx._index.mdx?raw'

export async function loader() {
  return new Response(txt)
}
