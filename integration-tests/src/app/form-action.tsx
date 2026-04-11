"use server";

import { redirect } from "spiceflow";

export async function action(
	{ shouldRedirect, shouldError, result },
	_data: FormData,
) {
	"use server";

	if (shouldRedirect) {
		throw redirect("/");
	}
	if (shouldError) {
		throw new Error("test error");
	}
	return { shouldRedirect, shouldError, result: "ok" };
}
