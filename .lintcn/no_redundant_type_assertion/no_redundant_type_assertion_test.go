package no_redundant_type_assertion

import (
	"testing"

	"github.com/typescript-eslint/tsgolint/internal/rule_tester"
	"github.com/typescript-eslint/tsgolint/internal/rules/fixtures"
)

func TestNoRedundantTypeAssertion(t *testing.T) {
	t.Parallel()
	rule_tester.RunRuleTester(fixtures.GetRootDir(), "tsconfig.minimal.json", t, &NoRedundantTypeAssertionRule,
		[]rule_tester.ValidTestCase{
			// Real narrowing — different types in union
			{Code: `
declare const x: number | string;
const y = x as string;
      `},
			// as const — always allowed
			{Code: `const x = [1, 2, 3] as const;`},
			// as any — intentional escape hatch
			{Code: `
declare const x: string;
const y = x as any;
      `},
			// as unknown — intentional widening
			{Code: `
declare const x: string;
const y = x as unknown;
      `},
			// Expression is any — can't reason about it
			{Code: `
declare const x: any;
const y = x as string;
      `},
			// Expression is unknown
			{Code: `
declare const x: unknown;
const y = x as string;
      `},
			// Upcasting to broader union type
			{Code: `
declare const x: string;
const y = x as string | number;
      `},
			// Nullable union but non-nullable parts don't fully match asserted type
			{Code: `
declare const x: string | number | undefined;
const y = x as string;
      `},
			// No assertion at all
			{Code: `
declare const x: string;
const y = x;
      `},
			// Narrowing to a subtype
			{Code: `
declare const x: string | number;
const y = x as number;
      `},
			// Function return type narrowing
			{Code: `
declare function getValue(): string | number;
const y = getValue() as string;
      `},
		},
		[]rule_tester.InvalidTestCase{
			// Case 1: Same type — string
			{
				Code: `
declare const x: string;
const y = x as string;
      `,
				Output: []string{`
declare const x: string;
const y = x;
      `},
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "redundantAssertion"},
				},
			},
			// Case 1: Same type — number
			{
				Code: `
declare const x: number;
const y = x as number;
      `,
				Output: []string{`
declare const x: number;
const y = x;
      `},
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "redundantAssertion"},
				},
			},
			// Case 1: Same type — boolean
			{
				Code: `
declare const x: boolean;
const y = x as boolean;
      `,
				Output: []string{`
declare const x: boolean;
const y = x;
      `},
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "redundantAssertion"},
				},
			},
			// Case 1: Same type — function return
			{
				Code: `
declare function getString(): string;
const y = getString() as string;
      `,
				Output: []string{`
declare function getString(): string;
const y = getString();
      `},
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "redundantAssertion"},
				},
			},
			// Case 2: string | undefined → as string
			{
				Code: `
declare const x: string | undefined;
const y = x as string;
      `,
				Errors: []rule_tester.InvalidTestCaseError{
					{
						MessageId: "useNonNullAssertion",
						Suggestions: []rule_tester.InvalidTestCaseSuggestion{
							{
								MessageId: "replaceWithNonNull",
								Output: `
declare const x: string | undefined;
const y = x!;
      `,
							},
						},
					},
				},
			},
			// Case 2: string | null → as string
			{
				Code: `
declare const x: string | null;
const y = x as string;
      `,
				Errors: []rule_tester.InvalidTestCaseError{
					{
						MessageId: "useNonNullAssertion",
						Suggestions: []rule_tester.InvalidTestCaseSuggestion{
							{
								MessageId: "replaceWithNonNull",
								Output: `
declare const x: string | null;
const y = x!;
      `,
							},
						},
					},
				},
			},
			// Case 2: string | null | undefined → as string
			{
				Code: `
declare const x: string | null | undefined;
const y = x as string;
      `,
				Errors: []rule_tester.InvalidTestCaseError{
					{
						MessageId: "useNonNullAssertion",
						Suggestions: []rule_tester.InvalidTestCaseSuggestion{
							{
								MessageId: "replaceWithNonNull",
								Output: `
declare const x: string | null | undefined;
const y = x!;
      `,
							},
						},
					},
				},
			},
			// Case 2: interface | undefined → as interface
			{
				Code: `
interface User { name: string }
declare const user: User | undefined;
const u = user as User;
      `,
				Errors: []rule_tester.InvalidTestCaseError{
					{
						MessageId: "useNonNullAssertion",
						Suggestions: []rule_tester.InvalidTestCaseSuggestion{
							{
								MessageId: "replaceWithNonNull",
								Output: `
interface User { name: string }
declare const user: User | undefined;
const u = user!;
      `,
							},
						},
					},
				},
			},
			// Case 2: number | null → as number
			{
				Code: `
declare const x: number | null;
const y = x as number;
      `,
				Errors: []rule_tester.InvalidTestCaseError{
					{
						MessageId: "useNonNullAssertion",
						Suggestions: []rule_tester.InvalidTestCaseSuggestion{
							{
								MessageId: "replaceWithNonNull",
								Output: `
declare const x: number | null;
const y = x!;
      `,
							},
						},
					},
				},
			},
		},
	)
}
