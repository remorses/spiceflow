package no_redundant_in_check

import (
	"testing"

	"github.com/typescript-eslint/tsgolint/internal/rule_tester"
	"github.com/typescript-eslint/tsgolint/internal/rules/fixtures"
)

func TestNoRedundantInCheck(t *testing.T) {
	t.Parallel()
	rule_tester.RunRuleTester(
		fixtures.GetRootDir(),
		"tsconfig.minimal.json",
		t,
		&NoRedundantInCheckRule,
		validCases,
		invalidCases,
	)
}

var validCases = []rule_tester.ValidTestCase{
	// Discriminated union — property only in some members (valid narrowing)
	{Code: `
		type Cat = { kind: 'cat'; meow(): void }
		type Dog = { kind: 'dog'; bark(): void }
		declare const animal: Cat | Dog;
		if ('meow' in animal) { animal.meow(); }
	`},
	// Optional property — key may not exist at runtime
	{Code: `
		interface Config { debug?: boolean; verbose?: boolean }
		declare const config: Config;
		if ('debug' in config) { console.log(config.debug); }
	`},
	// any type — can't reason statically
	{Code: `
		declare const x: any;
		if ('foo' in x) { console.log(x.foo); }
	`},
	// unknown type — can't reason statically
	{Code: `
		declare const x: unknown;
		if ('foo' in (x as object)) { console.log('has foo'); }
	`},
	// Index signature — property may or may not exist
	{Code: `
		declare const obj: Record<string, number>;
		if ('foo' in obj) { console.log(obj.foo); }
	`},
	// Computed key (variable, not string literal) — skip
	{Code: `
		interface User { name: string }
		declare const user: User;
		declare const key: string;
		if (key in user) { console.log('has key'); }
	`},
	// Union with object — one member lacks the property, valid narrowing
	{Code: `
		interface User { name: string }
		declare const x: User | object;
		if ('name' in x) { console.log('has name'); }
	`},
	// Property in some but not all union members
	{Code: `
		interface Admin { role: string; permissions: string[] }
		interface Guest { role: string }
		declare const user: Admin | Guest;
		if ('permissions' in user) { console.log(user.permissions); }
	`},
	// Generic type parameter without constraint
	{Code: `
		function check<T>(x: T) {
			if ('foo' in (x as any)) { }
		}
	`},
	// for...in loop — not a binary in expression
	{Code: `
		const obj = { a: 1, b: 2 };
		for (const key in obj) { console.log(key); }
	`},
	// Optional property in one union member
	{Code: `
		type A = { foo: string }
		type B = { foo?: string }
		declare const x: A | B;
		if ('foo' in x) { console.log(x.foo); }
	`},
	// Mapped type with index signature
	{Code: `
		type Dict = { [key: string]: unknown }
		declare const d: Dict;
		if ('hello' in d) { console.log(d.hello); }
	`},
}

var invalidCases = []rule_tester.InvalidTestCase{
	// Required property on single interface
	{
		Code: `
			interface User { name: string; age: number }
			declare const user: User;
			if ('name' in user) { console.log(user.name); }
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "redundantInCheck"},
		},
	},
	// Required property present in ALL union members
	{
		Code: `
			type Cat = { kind: 'cat'; name: string }
			type Dog = { kind: 'dog'; name: string }
			declare const animal: Cat | Dog;
			if ('name' in animal) { console.log(animal.name); }
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "redundantInCheck"},
		},
	},
	// Required property on class
	{
		Code: `
			class User { name: string = ''; age: number = 0 }
			declare const user: User;
			if ('name' in user) { console.log(user.name); }
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "redundantInCheck"},
		},
	},
	// Required property on type alias
	{
		Code: `
			type Config = { host: string; port: number }
			declare const config: Config;
			if ('host' in config) { console.log(config.host); }
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "redundantInCheck"},
		},
	},
	// Required property from base interface (inheritance)
	{
		Code: `
			interface Base { id: string }
			interface Derived extends Base { extra: number }
			declare const obj: Derived;
			if ('id' in obj) { console.log(obj.id); }
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "redundantInCheck"},
		},
	},
	// Property shared across 3+ union members
	{
		Code: `
			type A = { shared: string; a: number }
			type B = { shared: string; b: boolean }
			type C = { shared: string; c: string[] }
			declare const x: A | B | C;
			if ('shared' in x) { console.log(x.shared); }
		`,
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "redundantInCheck"},
		},
	},
	// Template literal key (NoSubstitutionTemplateLiteral)
	{
		Code: "interface User { name: string }\ndeclare const user: User;\nif (`name` in user) { console.log(user.name); }",
		Errors: []rule_tester.InvalidTestCaseError{
			{MessageId: "redundantInCheck"},
		},
	},
}
