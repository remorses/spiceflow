"use spiceflow"

export async function* generator() {
  for (let i = 0; i < 10; i++) {
    await sleep(300);
    yield { i };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
