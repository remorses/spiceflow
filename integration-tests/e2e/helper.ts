import fs from "node:fs";

export function createEditor(filepath: string) {
	let init = fs.readFileSync(filepath, "utf-8");
	let data = init;
	return {
		async edit(editFn: (data: string) => string) {
			data = editFn(data);
			fs.writeFileSync(filepath, data);
			await sleep(0);
		},

		[Symbol.dispose]() {
			fs.writeFileSync(filepath, init);
		},
	};
}


function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
