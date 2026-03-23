// lintcn:name no-redundant-type-assertion
// lintcn:description Disallow redundant type assertions where the expression already has the asserted type or is a nullable union of it
// lintcn:source https://github.com/remorses/lintcn/tree/main/.lintcn/no_redundant_type_assertion

package no_redundant_type_assertion

import (
	"fmt"

	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/typescript-eslint/tsgolint/internal/rule"
	"github.com/typescript-eslint/tsgolint/internal/utils"
)

var NoRedundantTypeAssertionRule = rule.Rule{
	Name: "no-redundant-type-assertion",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		checkAssertion := func(node *ast.Node) {
			if node == nil {
				return
			}
			// Skip `as const` assertions
			if ast.IsConstAssertion(node) {
				return
			}

			expression := node.Expression()
			typeAnnotation := node.Type()
			if expression == nil || typeAnnotation == nil {
				return
			}

			expressionType := ctx.TypeChecker.GetTypeAtLocation(expression)
			assertedType := ctx.TypeChecker.GetTypeAtLocation(typeAnnotation)
			if expressionType == nil || assertedType == nil {
				return
			}

			// Skip any/unknown expression types — can't reason about them
			if utils.IsTypeAnyType(expressionType) || utils.IsTypeUnknownType(expressionType) {
				return
			}
			// Skip assertions to any/unknown — intentional escape hatches
			if utils.IsTypeAnyType(assertedType) || utils.IsTypeUnknownType(assertedType) {
				return
			}

			// Compute the range to remove for fixes
			// For `x as T`: remove ` as T` (from after expression to end of node)
			// For `<T>x`: remove `<T>` (from start of node to before expression)
			removeRange := node.Loc.WithPos(expression.End())
			if node.Kind == ast.KindTypeAssertionExpression {
				removeRange = node.Loc.WithEnd(expression.Pos())
			}

			// Case 1: Expression type is identical to asserted type — assertion is redundant
			if expressionType == assertedType {
				ctx.ReportNodeWithFixes(node, rule.RuleMessage{
					Id: "redundantAssertion",
					Description: fmt.Sprintf(
						"Type assertion to '%s' is redundant because the expression already has that type. Remove the assertion.",
						ctx.TypeChecker.TypeToString(assertedType),
					),
				}, func() []rule.RuleFix {
					return []rule.RuleFix{rule.RuleFixRemoveRange(removeRange)}
				})
				return
			}

			// Case 2: Expression is T | null | undefined, asserted is T
			// The user should use `!` non-null assertion or a type guard instead
			expressionParts := utils.UnionTypeParts(expressionType)
			if len(expressionParts) <= 1 {
				return
			}

			hasNull := false
			hasUndefined := false
			nonNullableParts := make([]*checker.Type, 0, len(expressionParts))
			for _, part := range expressionParts {
				if part == nil {
					continue
				}
				if utils.IsTypeFlagSet(part, checker.TypeFlagsNull) {
					hasNull = true
				} else if utils.IsTypeFlagSet(part, checker.TypeFlagsUndefined) {
					hasUndefined = true
				} else {
					nonNullableParts = append(nonNullableParts, part)
				}
			}

			if !hasNull && !hasUndefined {
				return
			}

			// Check that non-nullable parts of the expression type exactly match the asserted type parts
			assertedParts := utils.UnionTypeParts(assertedType)
			if len(nonNullableParts) != len(assertedParts) {
				return
			}

			assertedSet := make(map[*checker.Type]bool, len(assertedParts))
			for _, p := range assertedParts {
				assertedSet[p] = true
			}
			for _, p := range nonNullableParts {
				if !assertedSet[p] {
					return
				}
			}

			// Build description for the nullable types being narrowed away
			nullableDesc := "undefined"
			if hasNull && hasUndefined {
				nullableDesc = "null | undefined"
			} else if hasNull {
				nullableDesc = "null"
			}

			higherPrecedenceThanUnary := ast.GetExpressionPrecedence(expression) > ast.OperatorPrecedenceUnary

			ctx.ReportNodeWithSuggestions(node, rule.RuleMessage{
				Id: "useNonNullAssertion",
				Description: fmt.Sprintf(
					"Use a `!` non-null assertion or a type guard to narrow away %s instead of `as %s`.",
					nullableDesc,
					ctx.TypeChecker.TypeToString(assertedType),
				),
			}, func() []rule.RuleSuggestion {
				var fixes []rule.RuleFix
				if higherPrecedenceThanUnary {
					fixes = []rule.RuleFix{
						rule.RuleFixRemoveRange(removeRange),
						rule.RuleFixInsertAfter(expression, "!"),
					}
				} else {
					fixes = []rule.RuleFix{
						rule.RuleFixRemoveRange(removeRange),
						rule.RuleFixInsertBefore(ctx.SourceFile, expression, "("),
						rule.RuleFixInsertAfter(expression, ")!"),
					}
				}
				return []rule.RuleSuggestion{{
					Message: rule.RuleMessage{
						Id:          "replaceWithNonNull",
						Description: "Replace with `!` non-null assertion.",
					},
					FixesArr: fixes,
				}}
			})
		}

		return rule.RuleListeners{
			ast.KindAsExpression:            checkAssertion,
			ast.KindTypeAssertionExpression: checkAssertion,
		}
	},
}
