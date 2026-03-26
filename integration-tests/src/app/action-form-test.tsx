"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

function SubmitButton() {
	const { pending } = useFormStatus();
	return (
		<button
			type="submit"
			disabled={pending}
			data-testid="action-form-submit"
		>
			{pending ? "Submitting..." : "Submit"}
		</button>
	);
}

export function ActionFormTest({
	action,
}: {
	action: (state: string, formData: FormData) => Promise<string>;
}) {
	const [result, formAction, isPending] = useActionState(action, "");
	return (
		<form action={formAction} data-testid="action-form">
			<input name="message" type="text" data-testid="action-form-input" />
			<SubmitButton />
			{isPending && (
				<div data-testid="action-form-pending">Submitting...</div>
			)}
			<div data-testid="action-form-result">{result}</div>
		</form>
	);
}
