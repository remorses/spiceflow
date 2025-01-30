// deno-lint-ignore no-explicit-any
export const deepFreeze = (value: any) => {
  for (const key of Reflect.ownKeys(value)) {
    if (value[key] && typeof value[key] === 'object') {
      deepFreeze(value[key])
    }
  }
  return Object.freeze(value)
}

export const req = (path: string, options?: RequestInit) =>
  new Request(`http://localhost${path}`, options)

export function isAsyncIterable(obj: any): obj is AsyncGenerator<any> {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.next === 'function' &&
    typeof obj.return === 'function' &&
    typeof obj.throw === 'function' &&
    typeof obj.return === 'function'
  )
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const StatusMap = {
  Continue: 100,
  'Switching Protocols': 101,
  Processing: 102,
  'Early Hints': 103,
  OK: 200,
  Created: 201,
  Accepted: 202,
  'Non-Authoritative Information': 203,
  'No Content': 204,
  'Reset Content': 205,
  'Partial Content': 206,
  'Multi-Status': 207,
  'Already Reported': 208,
  'Multiple Choices': 300,
  'Moved Permanently': 301,
  Found: 302,
  'See Other': 303,
  'Not Modified': 304,
  'Temporary Redirect': 307,
  'Permanent Redirect': 308,
  'Bad Request': 400,
  Unauthorized: 401,
  'Payment Required': 402,
  Forbidden: 403,
  'Not Found': 404,
  'Method Not Allowed': 405,
  'Not Acceptable': 406,
  'Proxy Authentication Required': 407,
  'Request Timeout': 408,
  Conflict: 409,
  Gone: 410,
  'Length Required': 411,
  'Precondition Failed': 412,
  'Payload Too Large': 413,
  'URI Too Long': 414,
  'Unsupported Media Type': 415,
  'Range Not Satisfiable': 416,
  'Expectation Failed': 417,
  "I'm a teapot": 418,
  'Misdirected Request': 421,
  'Unprocessable Content': 422,
  Locked: 423,
  'Failed Dependency': 424,
  'Too Early': 425,
  'Upgrade Required': 426,
  'Precondition Required': 428,
  'Too Many Requests': 429,
  'Request Header Fields Too Large': 431,
  'Unavailable For Legal Reasons': 451,
  'Internal Server Error': 500,
  'Not Implemented': 501,
  'Bad Gateway': 502,
  'Service Unavailable': 503,
  'Gateway Timeout': 504,
  'HTTP Version Not Supported': 505,
  'Variant Also Negotiates': 506,
  'Insufficient Storage': 507,
  'Loop Detected': 508,
  'Not Extended': 510,
  'Network Authentication Required': 511,
} as const

export const InvertedStatusMap = Object.fromEntries(
  Object.entries(StatusMap).map(([k, v]) => [v, k]),
) as {
  [K in keyof StatusMap as StatusMap[K]]: K
}

export type StatusMap = typeof StatusMap
export type InvertedStatusMap = typeof InvertedStatusMap

/**
 *
 * @param url URL to redirect to
 * @param HTTP status code to send,
 */
export const redirect = (
  url: string,
  status: 301 | 302 | 303 | 307 | 308 = 302,
) => Response.redirect(url, status)

export type redirect = typeof redirect

export function isResponse(result: any): result is Response {
  if (result instanceof Response) {
    return true
  }
  // if (
  //   result &&
  //   typeof result === 'object' &&
  //   'status' in result &&
  //   'headers' in result &&
  //   'body' in result
  // ) {
  //   console.warn(
  //     'spiceflow WARNING: you returned a Response that does not satisfy instanceof Response, probably because of some dumb polyfill\n',
  //     result,
  //   )

  //   return true
  // }

  return false
}
