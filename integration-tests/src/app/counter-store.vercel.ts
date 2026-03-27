// Persistent counter using Upstash Redis.
// Resolved via package.json imports when the "vercel" condition is active.
// Supports both UPSTASH_REDIS_REST_* and KV_REST_API_* env vars (Vercel KV).

import { Redis } from "@upstash/redis";

const COUNTER_KEY = "spiceflow:integration-test:counter";

let _redis: Redis | undefined;

function getRedis(): Redis {
	if (_redis) return _redis;
	const url =
		process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
	const token =
		process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
	if (!url || !token) {
		throw new Error(
			"Missing Redis env vars. Set UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN.",
		);
	}
	_redis = new Redis({ url, token });
	return _redis;
}

export async function getCounter(): Promise<number> {
	const val = await getRedis().get<number>(COUNTER_KEY);
	return val ?? 0;
}

export async function incrementCounter(change: number): Promise<void> {
	await getRedis().incrby(COUNTER_KEY, change);
}
