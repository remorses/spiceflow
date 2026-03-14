"use server";

import { redirect } from "spiceflow/dist/utils";

export async function action(
	{ shouldRedirect, shouldError, result },
	data: FormData,
) {
	"use server";

	console.log("action", data);
	if (shouldRedirect) {
		throw redirect("/");
	}
	if (shouldError) {
		throw new Error("test error");
	}
	return { shouldRedirect, shouldError, result: "ok" };
}
