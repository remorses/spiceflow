"use server";

import {
	getCounter as _getCounter,
	incrementCounter,
} from "#counter-store";

export async function getCounter() {
	return _getCounter();
}

export async function changeCounter(formData: FormData) {
	const change = Number(formData.get("change"));
	await incrementCounter(change);
}
