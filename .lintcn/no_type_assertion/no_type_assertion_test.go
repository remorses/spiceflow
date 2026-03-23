package no_type_assertion

import (
	"testing"

	"github.com/typescript-eslint/tsgolint/internal/rule_tester"
	"github.com/typescript-eslint/tsgolint/internal/rules/fixtures"
)

func TestNoTypeAssertion(t *testing.T) {
	t.Parallel()
	rule_tester.RunRuleTester(
		fixtures.GetRootDir(),
		"tsconfig.minimal.json",
		t,
		&NoTypeAssertionRule,
		validCases,
		invalidCases,
	)
}

var validCases = []rule_tester.ValidTestCase{
	// as const is fine
	{Code: `const x = { a: 1 } as const;`},
	{Code: `const arr = [1, 2, 3] as const;`},
	// no assertion at all
	{Code: `const x: string = "hello";`},
	{Code: `const y = 42;`},
	// type annotations (not assertions)
	{Code: `function greet(name: string): void {}`},
	{Code: `const arr: number[] = [1, 2, 3];`},

	// --- from any source (allowed — standard way to narrow untyped APIs) ---
	// simple any variable
	{Code: `
		declare const x: any;
		const y = x as string;
	`},
	// any variable cast to interface
	{Code: `
		declare const x: any;
		interface User { name: string; age: number; }
		const y = x as User;
	`},
	// function returning any
	{Code: `
		declare function getJson(): any;
		const data = getJson() as { name: string };
	`},
	// async function returning Promise<any> (the response.json() pattern)
	{Code: `
		declare function fetchJson(): Promise<any>;
		async function main() {
			const data = (await fetchJson()) as { default_branch: string };
		}
	`},
	// any cast to union
	{Code: `
		declare const x: any;
		const y = x as string | number;
	`},
	// any cast to array
	{Code: `
		declare const x: any;
		const y = x as string[];
	`},
}

var invalidCases = []rule_tester.InvalidTestCase{
	// --- primitives ---
	// as any from typed
	{
		Code: `
			const x: string = "hello";
			const y = x as any;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},
	// as specific type narrowing a union
	{
		Code: `
			declare const x: string | number;
			const y = x as string;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},
	// redundant: already that type
	{
		Code: `
			const x: string = "hello";
			const y = x as string;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertionRedundant"},
		},
	},
	// angle bracket syntax
	{
		Code: `
			declare const x: string | number;
			const y = <string>x;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},
	// as unknown
	{
		Code: `
			const x = "hello" as unknown;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},
	// from unknown source (still warns — unknown requires narrowing, not casting)
	{
		Code: `
			declare const x: unknown;
			const y = x as string;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertionFromAny"},
		},
	},

	// --- interfaces and type aliases ---
	// interface assertion (should show expanded form)
	{
		Code: `
			interface User { name: string; age: number; }
			declare const x: User | Error;
			const y = x as User;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},
	// type alias assertion
	{
		Code: `
			type Config = { host: string; port: number; };
			declare const x: Config | null;
			const y = x as Config;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},
	// nested interface
	{
		Code: `
			interface Address { street: string; city: string; }
			interface Person { name: string; address: Address; }
			declare const x: Person | null;
			const y = x as Person;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},

	// --- generics ---
	// generic type
	{
		Code: `
			declare const x: Array<string> | null;
			const y = x as Array<string>;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},
	// generic interface
	{
		Code: `
			interface Box<T> { value: T; }
			declare const x: Box<number> | undefined;
			const y = x as Box<number>;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},
	// Map type
	{
		Code: `
			declare const x: Map<string, number> | null;
			const y = x as Map<string, number>;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},

	// --- unions and intersections ---
	// narrowing a bigger union
	{
		Code: `
			declare const x: string | number | boolean;
			const y = x as string | number;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},
	// intersection type
	{
		Code: `
			interface Named { name: string; }
			interface Aged { age: number; }
			declare const x: Named;
			const y = x as Named & Aged;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},

	// --- literal types ---
	// string literal
	{
		Code: `
			declare const x: string;
			const y = x as "hello";
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},
	// number literal
	{
		Code: `
			declare const x: number;
			const y = x as 42;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},

	// --- function types ---
	{
		Code: `
			declare const x: (() => void) | null;
			const y = x as () => void;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},

	// --- tuple types ---
	{
		Code: `
			declare const x: [string, number] | null;
			const y = x as [string, number];
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},

	// --- class types ---
	{
		Code: `
			class Animal { species: string = ""; }
			class Dog extends Animal { breed: string = ""; }
			declare const x: Animal;
			const y = x as Dog;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},

	// --- double assertion (as unknown as X) ---
	// Inner: string as unknown → typeAssertion (from string)
	// Outer: unknown as number → typeAssertionFromAny (from unknown)
	{
		Code: `
			declare const x: string;
			const y = (x as unknown) as number;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertionFromAny"},
			{MessageId: "typeAssertion"},
		},
	},
	// as unknown as interface
	{
		Code: `
			interface User { name: string; age: number; }
			declare const x: string;
			const y = x as unknown as User;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertionFromAny"},
			{MessageId: "typeAssertion"},
		},
	},
	// as unknown as union
	{
		Code: `
			declare const x: number;
			const y = x as unknown as string | boolean;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertionFromAny"},
			{MessageId: "typeAssertion"},
		},
	},
	// as any as X (common in legacy code)
	{
		Code: `
			interface Config { host: string; port: number; }
			declare const x: string;
			const y = (x as any) as Config;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertionFromAny"},
			{MessageId: "typeAssertion"},
		},
	},
	// triple assertion: as unknown as any as X
	{
		Code: `
			declare const x: number;
			const y = (x as unknown as any) as string;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertionFromAny"},
			{MessageId: "typeAssertionFromAny"},
			{MessageId: "typeAssertion"},
		},
	},
	// as unknown as generic
	{
		Code: `
			declare const x: string[];
			const y = x as unknown as Map<string, number>;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertionFromAny"},
			{MessageId: "typeAssertion"},
		},
	},

	// --- enum types ---
	{
		Code: `
			enum Direction { Up, Down, Left, Right }
			declare const x: number;
			const y = x as Direction;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},

	// --- Promise types ---
	{
		Code: `
			declare const x: Promise<string> | null;
			const y = x as Promise<string>;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},

	// --- Record/utility types ---
	{
		Code: `
			declare const x: Record<string, number> | null;
			const y = x as Record<string, number>;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},
	// Partial
	{
		Code: `
			interface User { name: string; age: number; }
			declare const x: Partial<User> | null;
			const y = x as Partial<User>;
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "typeAssertion"},
		},
	},
}
