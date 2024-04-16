import { cookies, headers } from 'next/headers';
import { asyncLocalStorage } from './context-internal';

function myHeaders() {
  try {
    return headers();
  } catch (e) {
    const res = asyncLocalStorage.getStore()?.headers();
    if (!res) {
      throw new Error('Called headers() outside of app dir or rpc actions');
    }
    return res;
  }
}

function myCookies() {
  try {
    return cookies();
  } catch (e) {
    const res = asyncLocalStorage.getStore()?.cookies();
    if (!res) {
      throw new Error('Called cookies() outside of app dir or rpc actions');
    }
    return res;
  }
}

export { myHeaders as headers, myCookies as cookies };
