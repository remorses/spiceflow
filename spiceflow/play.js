class FastError {
  constructor(message) {}
}

function benchmark(name, fn, iterations = 100000) {
  // Warmup
  for (let i = 0; i < 10000; i++) {
    fn()
  }

  const start = process.hrtime.bigint()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const end = process.hrtime.bigint()
  console.log(`${name}: ${Number(end - start) / 1_000_000}ms`)
}

// Normal Error
benchmark('Normal Error', () => {
  try {
    throw new Error('test')
  } catch (e) {}
})

// // No Stack Error
// Error.stackTraceLimit = 0
// benchmark('No Stack Error', () => {
//   try {
//     throw new Error('test')
//   } catch (e) {}
// })

// Fast Error
benchmark('Fast Error', () => {
  try {
    throw new FastError('test')
  } catch (e) {}
})
Object.setPrototypeOf(FastError.prototype, Error.prototype)
Object.setPrototypeOf(FastError, Error)

console.log(new FastError() instanceof Error)
