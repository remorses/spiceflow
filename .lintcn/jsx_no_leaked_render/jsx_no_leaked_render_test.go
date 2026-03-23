package jsx_no_leaked_render

import (
	"testing"

	"github.com/typescript-eslint/tsgolint/internal/rule_tester"
	"github.com/typescript-eslint/tsgolint/internal/rules/fixtures"
)

func TestJsxNoLeakedRender(t *testing.T) {
	t.Parallel()
	rule_tester.RunRuleTester(fixtures.GetRootDir(), "tsconfig.json", t, &JsxNoLeakedRenderRule,
		[]rule_tester.ValidTestCase{
			// Boolean conditions — always safe
			{Code: `declare const isVisible: boolean; <div>{isVisible && <span/>}</div>`, Tsx: true},
			{Code: `declare const count: number; <div>{count > 0 && <span/>}</div>`, Tsx: true},
			{Code: `declare const count: number; <div>{!!count && <span/>}</div>`, Tsx: true},
			{Code: `declare const count: number; <div>{Boolean(count) && <span/>}</div>`, Tsx: true},

			// String conditions — safe in React 18+ (empty strings treated as null)
			{Code: `declare const str: string; <div>{str && <span/>}</div>`, Tsx: true},
			{Code: `declare const str: 'hello'; <div>{str && <span/>}</div>`, Tsx: true},
			{Code: `declare const str: '' | 'hello'; <div>{str && <span/>}</div>`, Tsx: true},
			{Code: `declare const str: string | null; <div>{str && <span/>}</div>`, Tsx: true},

			// Non-zero number literals — always truthy, safe
			{Code: `declare const x: 1 | 2 | 3; <div>{x && <span/>}</div>`, Tsx: true},
			{Code: `declare const x: -1; <div>{x && <span/>}</div>`, Tsx: true},
			{Code: `declare const x: 42; <div>{x && <span/>}</div>`, Tsx: true},

			// Ternary — safe, always evaluates to one branch
			{Code: `declare const count: number; <div>{count ? <span/> : null}</div>`, Tsx: true},

			// Outside JSX — not the rule's concern
			{Code: `declare const count: number; const x = count && "hello";`},
			{Code: `declare const count: number; if (count && true) {}`},

			// Object/array — always truthy
			{Code: `declare const obj: object; <div>{obj && <span/>}</div>`, Tsx: true},
			{Code: `declare const arr: string[]; <div>{arr && <span/>}</div>`, Tsx: true},

			// null/undefined — safe (don't render)
			{Code: `declare const x: null; <div>{x && <span/>}</div>`, Tsx: true},
			{Code: `declare const x: undefined; <div>{x && <span/>}</div>`, Tsx: true},

			// || operator — not checked
			{Code: `declare const count: number; <div>{count || <span/>}</div>`, Tsx: true},

			// Negation — results in boolean
			{Code: `declare const count: number; <div>{!count && <span/>}</div>`, Tsx: true},

			// Comparison operators — result is boolean
			{Code: `declare const count: number; <div>{count >= 0 && <span/>}</div>`, Tsx: true},
			{Code: `declare const count: number; <div>{count !== 0 && <span/>}</div>`, Tsx: true},
			{Code: `declare const items: string[]; <div>{items.length > 0 && <span/>}</div>`, Tsx: true},

			// Non-zero bigint literals — safe
			{Code: `declare const x: 1n; <div>{x && <span/>}</div>`, Tsx: true},
			{Code: `declare const x: 100n; <div>{x && <span/>}</div>`, Tsx: true},

			// Function returning boolean — safe
			{Code: `declare const hasItems: () => boolean; <div>{hasItems() && <span/>}</div>`, Tsx: true},

			// never type — safe
			{Code: `declare const x: never; <div>{x && <span/>}</div>`, Tsx: true},

			// Symbol — always truthy
			{Code: `declare const x: symbol; <div>{x && <span/>}</div>`, Tsx: true},

			// Function type — always truthy
			{Code: `declare const fn: () => void; <div>{fn && <span/>}</div>`, Tsx: true},

			// Inferred const with truthy value — literal type 1
			{Code: `const t = 1; <div>{t && <span/>}</div>`, Tsx: true},

			// Known limitation: nested && inside ternary not flagged (only checks direct JSX parent)
			{Code: `declare const n: number; <div>{true ? (n && <span/>) : null}</div>`, Tsx: true},
		},
		[]rule_tester.InvalidTestCase{
			// Generic number type
			{
				Code: `declare const count: number; <div>{count && <span/>}</div>`,
				Tsx:  true,
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "noLeakedConditionalRendering"},
				},
			},
			// Array .length (returns number)
			{
				Code: `declare const items: string[]; <div>{items.length && <span/>}</div>`,
				Tsx:  true,
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "noLeakedConditionalRendering"},
				},
			},
			// any type
			{
				Code: `declare const x: any; <div>{x && <span/>}</div>`,
				Tsx:  true,
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "noLeakedConditionalRendering"},
				},
			},
			// Union with number
			{
				Code: `declare const x: number | string; <div>{x && <span/>}</div>`,
				Tsx:  true,
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "noLeakedConditionalRendering"},
				},
			},
			// Generic constrained to number
			{
				Code: `function Foo<T extends number>(x: T) { return <div>{x && <span/>}</div> }`,
				Tsx:  true,
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "noLeakedConditionalRendering"},
				},
			},
			// Literal 0
			{
				Code: `declare const x: 0; <div>{x && <span/>}</div>`,
				Tsx:  true,
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "noLeakedConditionalRendering"},
				},
			},
			// Generic bigint
			{
				Code: `declare const x: bigint; <div>{x && <span/>}</div>`,
				Tsx:  true,
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "noLeakedConditionalRendering"},
				},
			},
			// Literal 0n
			{
				Code: `declare const x: 0n; <div>{x && <span/>}</div>`,
				Tsx:  true,
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "noLeakedConditionalRendering"},
				},
			},
			// Nested property access
			{
				Code: `
declare const data: { items: string[] };
<div>{data.items.length && <span/>}</div>
      `,
				Tsx: true,
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "noLeakedConditionalRendering"},
				},
			},
			// Union including 0 literal
			{
				Code: `declare const x: 0 | 1 | 2; <div>{x && <span/>}</div>`,
				Tsx:  true,
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "noLeakedConditionalRendering"},
				},
			},
			// Number with null union
			{
				Code: `declare const x: number | null; <div>{x && <span/>}</div>`,
				Tsx:  true,
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "noLeakedConditionalRendering"},
				},
			},
			// Number with undefined union
			{
				Code: `declare const x: number | undefined; <div>{x && <span/>}</div>`,
				Tsx:  true,
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "noLeakedConditionalRendering"},
				},
			},
			// Generic constrained to bigint
			{
				Code: `function Foo<T extends bigint>(x: T) { return <div>{x && <span/>}</div> }`,
				Tsx:  true,
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "noLeakedConditionalRendering"},
				},
			},
			// Type assertion to number
			{
				Code: `declare const x: unknown; <div>{(x as number) && <span/>}</div>`,
				Tsx:  true,
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "noLeakedConditionalRendering"},
				},
			},
			// Intersection with number (branded type)
			{
				Code: `declare const x: number & { brand: 'count' }; <div>{x && <span/>}</div>`,
				Tsx:  true,
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "noLeakedConditionalRendering"},
				},
			},
			// Index access returning number
			{
				Code: `declare const counts: number[]; <div>{counts[0] && <span/>}</div>`,
				Tsx:  true,
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "noLeakedConditionalRendering"},
				},
			},
			// Method call returning number
			{
				Code: `declare const getCount: () => number; <div>{getCount() && <span/>}</div>`,
				Tsx:  true,
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "noLeakedConditionalRendering"},
				},
			},
			// Optional number property
			{
				Code: `declare const rating: { count?: number | null }; <div>{rating.count && <span/>}</div>`,
				Tsx:  true,
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "noLeakedConditionalRendering"},
				},
			},
			// NaN — has type number
			{
				Code: `const t = NaN; <div>{t && <span/>}</div>`,
				Tsx:  true,
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "noLeakedConditionalRendering"},
				},
			},
			// Inferred const 0 — literal type 0
			{
				Code: `const t = 0; <div>{t && <span/>}</div>`,
				Tsx:  true,
				Errors: []rule_tester.InvalidTestCaseError{
					{MessageId: "noLeakedConditionalRendering"},
				},
			},
		})
}
