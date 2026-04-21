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

export async function redirectToNamedTarget({ name }: { name: string }) {
	"use server";

	if (!name) {
		throw new Error("Expected redirect target name");
	}

	throw redirect(`/wrapped-server-action-redirect/${name}`);
}
