"use server";

if (!("counter" in globalThis)) {
	globalThis.counter = 0;
}

export async function getCounter() {
	return globalThis.counter;
}

export async function changeCounter(formData: FormData) {
	const change = Number(formData.get("change"));
	globalThis.counter += change;
}

console.log("rerunning");
