// Client component that tests parseFormData + schema.keyof().enum pattern.
// Validates the full type-safe form workflow: schema-derived field names,
// coercion (string→number), and validation errors.

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

function SubmitButton() {
	const { pending } = useFormStatus();
	return (
		<button
			type="submit"
			disabled={pending}
			data-testid="pfd-submit"
		>
			{pending ? "Submitting..." : "Submit"}
		</button>
	);
}

export function ParseFormDataTest({
	action,
	fields,
}: {
	action: (prev: string, formData: FormData) => Promise<string>;
	fields: { name: string; age: string; tags: string };
}) {
	const [result, formAction] = useActionState(action, "");
	return (
		<form action={formAction} data-testid="pfd-form">
			<input name={fields.name} type="text" data-testid="pfd-name" />
			<input name={fields.age} type="text" data-testid="pfd-age" />
			<select name={fields.tags} multiple data-testid="pfd-tags">
				<option value="a">A</option>
				<option value="b">B</option>
				<option value="c">C</option>
			</select>
			<SubmitButton />
			<div data-testid="pfd-result">{result}</div>
		</form>
	);
}
