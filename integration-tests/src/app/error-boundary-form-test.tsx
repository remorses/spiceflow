// Client component for testing ErrorBoundary with form actions.
// Uses the public ErrorBoundary from spiceflow/react with ErrorMessage
// and ResetButton sub-components.

"use client";

import { useFormStatus } from "react-dom";
import { ErrorBoundary } from "spiceflow/react";

function SubmitButton() {
	const { pending } = useFormStatus();
	return (
		<button
			type="submit"
			disabled={pending}
			data-testid="eb-form-submit"
		>
			{pending ? "Submitting..." : "Submit"}
		</button>
	);
}

export function ErrorBoundaryFormTest({
	action,
}: {
	action: (formData: FormData) => Promise<void>;
}) {
	return (
		<ErrorBoundary
			fallback={
				<div data-testid="eb-error-container">
					<ErrorBoundary.ErrorMessage data-testid="eb-error-message" />
					<ErrorBoundary.ResetButton data-testid="eb-reset-button">
						Try again
					</ErrorBoundary.ResetButton>
				</div>
			}
		>
			<form action={action} data-testid="eb-form">
				<input
					name="message"
					type="text"
					data-testid="eb-form-input"
				/>
				<SubmitButton />
			</form>
		</ErrorBoundary>
	);
}
