// Default counter implementation using globalThis.
// Works for long-lived Node.js processes (dev, start).
// On serverless, state resets per function instance — use the vercel
// variant (#counter-store resolved via package.json imports + resolve.conditions).

const g = globalThis as any

if (!("__spiceflow_counter" in g)) {
	g.__spiceflow_counter = 0;
}

export async function getCounter(): Promise<number> {
	return g.__spiceflow_counter;
}

export async function incrementCounter(change: number): Promise<void> {
	g.__spiceflow_counter += change;
}
