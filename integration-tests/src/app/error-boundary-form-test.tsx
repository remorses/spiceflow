// Client component for testing ErrorBoundary with form actions.
// Uses the public ErrorBoundary from spiceflow/react with ErrorMessage
// and ResetButton sub-components.

"use client";

import { useFormStatus } from "react-dom";
import { ErrorBoundary } from "spiceflow/react";

function SubmitButton({ testId = "eb-form-submit" }: { testId?: string }) {
	const { pending } = useFormStatus();
	return (
		<button
			type="submit"
			disabled={pending}
			data-testid={testId}
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

export function InlineErrorBoundaryFormTest({
	action,
}: {
	action: (formData: FormData) => Promise<void>;
}) {
	return (
		<ErrorBoundary
			inline
			fallback={
				<div data-testid="inline-eb-error-container">
					<ErrorBoundary.ErrorMessage data-testid="inline-eb-error-message" />
					<ErrorBoundary.ResetButton data-testid="inline-eb-reset-button">
						Try again
					</ErrorBoundary.ResetButton>
				</div>
			}
		>
			<form action={action} data-testid="inline-eb-form">
				<input
					name="message"
					type="text"
					data-testid="inline-eb-form-input"
				/>
				<SubmitButton testId="inline-eb-form-submit" />
			</form>
		</ErrorBoundary>
	);
}

export function ParseFormDataErrorBoundaryTest({
	action,
	fields,
}: {
	action: (formData: FormData) => Promise<void>;
	fields: { name: string; email: string };
}) {
	return (
		<ErrorBoundary
			fallback={
				<div data-testid="pfd-eb-error-container">
					<ErrorBoundary.ErrorMessage data-testid="pfd-eb-error-message" />
					<ErrorBoundary.ResetButton data-testid="pfd-eb-reset-button">
						Try again
					</ErrorBoundary.ResetButton>
				</div>
			}
		>
			<form action={action} data-testid="pfd-eb-form">
				<input
					name={fields.name}
					type="text"
					data-testid="pfd-eb-name"
				/>
				<input
					name={fields.email}
					type="text"
					data-testid="pfd-eb-email"
				/>
				<SubmitButton testId="pfd-eb-submit" />
			</form>
		</ErrorBoundary>
	);
}
