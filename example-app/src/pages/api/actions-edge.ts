'poor man user server';

import { getEdgeContext } from 'server-actions-for-next-pages/context';

export const config = {
  runtime: 'edge',
};

export async function serverAction({}) {
  const { req, res } = await getEdgeContext();
  console.log('serverAction', res);
  res?.headers.set('x-server-action', 'true');
  const url = req?.url;
  return { url };
}
