package no_in_operator

import (
	"testing"

	"github.com/typescript-eslint/tsgolint/internal/rule_tester"
	"github.com/typescript-eslint/tsgolint/internal/rules/fixtures"
)

func TestNoInOperator(t *testing.T) {
	t.Parallel()
	rule_tester.RunRuleTester(
		fixtures.GetRootDir(),
		"tsconfig.minimal.json",
		t,
		&NoInOperatorRule,
		validCases,
		invalidCases,
	)
}

// No valid cases — this rule warns on ALL uses of the in operator,
// similar to no-type-assertion which warns on all as X expressions.
// for...in loops use KindForInStatement, not KindBinaryExpression,
// so they are not caught by this rule.
var validCases = []rule_tester.ValidTestCase{
	// for...in loop — not a binary in expression
	{Code: `
		const obj = { a: 1, b: 2 };
		for (const key in obj) { console.log(key); }
	`},
	// Regular property access (no in operator)
	{Code: `
		interface User { name: string }
		declare const user: User;
		console.log(user.name);
	`},
	// typeof check (no in operator)
	{Code: `
		declare const x: string | number;
		if (typeof x === 'string') { console.log(x.length); }
	`},
	// instanceof check (no in operator)
	{Code: `
		declare const x: Error | string;
		if (x instanceof Error) { console.log(x.message); }
	`},
}

var invalidCases = []rule_tester.InvalidTestCase{
	// --- General in operator usage ---

	// Simple interface
	{
		Code: `
			interface User { name: string; age: number }
			declare const user: User;
			if ('name' in user) { console.log(user.name); }
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "inOperator"},
		},
	},
	// any type
	{
		Code: `
			declare const x: any;
			if ('foo' in x) { console.log(x.foo); }
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "inOperator"},
		},
	},
	// Class type
	{
		Code: `
			class Config { host: string = ''; port: number = 0 }
			declare const config: Config;
			if ('host' in config) { console.log(config.host); }
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "inOperator"},
		},
	},
	// Record type
	{
		Code: `
			declare const obj: Record<string, number>;
			if ('foo' in obj) { console.log(obj.foo); }
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "inOperator"},
		},
	},
	// Computed key (variable)
	{
		Code: `
			interface User { name: string }
			declare const user: User;
			declare const key: string;
			if (key in user) { console.log('has key'); }
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "inOperator"},
		},
	},
	// Optional property
	{
		Code: `
			interface Config { debug?: boolean }
			declare const config: Config;
			if ('debug' in config) { console.log(config.debug); }
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "inOperator"},
		},
	},

	// --- Union narrowing special case ---

	// Discriminated union — property in some but not all members
	{
		Code: `
			type Cat = { kind: 'cat'; meow(): void }
			type Dog = { kind: 'dog'; bark(): void }
			declare const animal: Cat | Dog;
			if ('meow' in animal) { }
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "inOperatorUnionNarrowing"},
		},
	},
	// Union with property in one member
	{
		Code: `
			interface Admin { role: string; permissions: string[] }
			interface Guest { role: string }
			declare const user: Admin | Guest;
			if ('permissions' in user) { console.log(user); }
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "inOperatorUnionNarrowing"},
		},
	},
	// Three-member union with partial property presence
	{
		Code: `
			type A = { shared: string; a: number }
			type B = { shared: string }
			type C = { c: boolean }
			declare const x: A | B | C;
			if ('a' in x) { console.log(x); }
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "inOperatorUnionNarrowing"},
		},
	},
	// Union with null — property check after null guard
	{
		Code: `
			type Success = { data: string }
			type Failure = { error: Error }
			declare const result: Success | Failure;
			if ('data' in result) { console.log(result.data); }
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "inOperatorUnionNarrowing"},
		},
	},

	// --- Property in ALL union members (general, not union narrowing) ---
	// When ALL non-nullish members have the property, it's the general case
	{
		Code: `
			type Cat = { name: string; meow(): void }
			type Dog = { name: string; bark(): void }
			declare const animal: Cat | Dog;
			if ('name' in animal) { console.log(animal.name); }
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "inOperator"},
		},
	},

	// --- Template literal key (NoSubstitutionTemplateLiteral) ---
	// General case with template literal
	{
		Code: "interface User { name: string }\ndeclare const user: User;\nif (`name` in user) { console.log(user.name); }",
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "inOperator"},
		},
	},
	// Union narrowing with template literal
	{
		Code: "type Cat = { kind: 'cat'; meow(): void }\ntype Dog = { kind: 'dog'; bark(): void }\ndeclare const animal: Cat | Dog;\nif (`meow` in animal) { }",
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "inOperatorUnionNarrowing"},
		},
	},
}
