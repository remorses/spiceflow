/**
 * A compatibility wrapper for Promise.withResolvers
 * This function provides the same functionality as Promise.withResolvers
 * but works in environments where that API is not available
 */
export function createDeferredPromise<T = any>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;
  
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  
  return { promise, resolve, reject };
}
