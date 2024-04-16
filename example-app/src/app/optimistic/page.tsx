import { Client } from '@/app/optimistic/_client';
import fs from 'fs';

export default async function Home({}) {
  const messages = await fs.promises.readFile('./optimistic.json', 'utf-8');
  return <Client messages={JSON.parse(messages)} />;
}
