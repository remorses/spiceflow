import { asyncLocalStorage } from './context-internal';

function myHeaders() {
  const res = asyncLocalStorage.getStore()?.headers();
  if (!res) {
    throw new Error('Called headers() outside of app dir or rpc actions');
  }
  return res;
}

function myCookies() {
  const res = asyncLocalStorage.getStore()?.cookies();
  if (!res) {
    throw new Error('Called cookies() outside of app dir or rpc actions');
  }
  return res;
}

export { myCookies as cookies, myHeaders as headers };
