'poor man user server';

import {
  createRpcMethod as _createRpcMethod,
  createRpcHandler as _createRpcHandler,
} from 'server-actions-for-pages/dist/server';
export const createUser = _createRpcMethod(
  async function createUser({ name = '' }) {
    return {
      id: 1,
      name,
    };
  },
  {
    name: 'createUser',
    pathname: '/api/actions-node',
  },
  null,
);
export const failingFunction = _createRpcMethod(
  async function failingFunction({}) {
    throw new Error('This function fails');
  },
  {
    name: 'failingFunction',
    pathname: '/api/actions-node',
  },
  null,
);
export default /*#__PURE__*/ _createRpcHandler(
  [
    ['createUser', createUser],
    ['failingFunction', failingFunction],
  ],
  false,
);
