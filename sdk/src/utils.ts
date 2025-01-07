export async function* processConcurrentlyInOrder<T>(
  thunks: Array<() => Promise<T>>,
  maxConcurrent = 3,
): AsyncGenerator<T> {
  let queue = thunks.slice(0, maxConcurrent).map((thunk) => thunk())

  for (const [index, _] of thunks.entries()) {
    const result = await queue.shift()!

    if (index + maxConcurrent < thunks.length) {
      queue.push(thunks[index + maxConcurrent]())
    }

    yield result
  }
}


