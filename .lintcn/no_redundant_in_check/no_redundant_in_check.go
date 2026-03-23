// lintcn:name no-redundant-in-check
// lintcn:description Flag `"y" in x` checks where the type of x already has y as a required property in all union constituents
// lintcn:source https://github.com/remorses/lintcn/tree/main/.lintcn/no_redundant_in_check

package no_redundant_in_check

import (
	"fmt"

	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/typescript-eslint/tsgolint/internal/rule"
	"github.com/typescript-eslint/tsgolint/internal/utils"
)

// propertyExistsInAllConstituents checks if the named property is a required
// (non-optional) member of every union constituent. Returns false if any
// constituent is indeterminate (any/unknown/type-param-without-constraint),
// lacks the property, or has it as optional.
func propertyExistsInAllConstituents(tc *checker.Checker, t *checker.Type, propName string) bool {
	parts := utils.UnionTypeParts(t)
	if len(parts) == 0 {
		return false
	}
	for _, part := range parts {
		if part == nil {
			return false
		}
		flags := checker.Type_flags(part)

		// Can't reason about any/unknown
		if flags&(checker.TypeFlagsAny|checker.TypeFlagsUnknown) != 0 {
			return false
		}
		// Can't reason about unconstrained type parameters
		if flags&checker.TypeFlagsTypeParameter != 0 {
			constraint := checker.Checker_getBaseConstraintOfType(tc, part)
			if constraint == nil {
				return false
			}
			// Recurse into the constraint
			if !propertyExistsInAllConstituents(tc, constraint, propName) {
				return false
			}
			continue
		}
		// Skip null/undefined — they don't have properties and make
		// the in-check meaningful for narrowing away nullish types
		if flags&(checker.TypeFlagsNull|checker.TypeFlagsUndefined|checker.TypeFlagsVoid) != 0 {
			return false
		}

		prop := checker.Checker_getPropertyOfType(tc, part, propName)
		if prop == nil {
			// Try apparent type (for mapped types, primitives with prototype methods, etc.)
			apparent := checker.Checker_getApparentType(tc, part)
			if apparent != nil && apparent != part {
				prop = checker.Checker_getPropertyOfType(tc, apparent, propName)
			}
		}
		if prop == nil {
			return false
		}
		// Optional properties mean the key may not exist at runtime
		if prop.Flags&ast.SymbolFlagsOptional != 0 {
			return false
		}
	}
	return true
}

var NoRedundantInCheckRule = rule.Rule{
	Name: "no-redundant-in-check",
	Run: func(ctx rule.RuleContext, options any) rule.RuleListeners {
		return rule.RuleListeners{
			ast.KindBinaryExpression: func(node *ast.Node) {
				binExpr := node.AsBinaryExpression()
				if binExpr == nil || binExpr.OperatorToken == nil {
					return
				}
				if binExpr.OperatorToken.Kind != ast.KindInKeyword {
					return
				}

				left := ast.SkipParentheses(binExpr.Left)
				right := ast.SkipParentheses(binExpr.Right)
				if left == nil || right == nil {
					return
				}

				// Only handle static string keys — we need the exact property name
				if left.Kind != ast.KindStringLiteral && left.Kind != ast.KindNoSubstitutionTemplateLiteral {
					return
				}
				propName := left.Text()
				if propName == "" {
					return
				}

				// Get the type of the right-hand side
				rightType := ctx.TypeChecker.GetTypeAtLocation(right)
				if rightType == nil {
					return
				}

				// Resolve type parameters to their constraints
				constraint, isTypeParam := utils.GetConstraintInfo(ctx.TypeChecker, rightType)
				if isTypeParam {
					if constraint == nil {
						return // unconstrained — can't reason
					}
					rightType = constraint
				}

				// Skip any/unknown
				if utils.IsTypeAnyType(rightType) || utils.IsTypeUnknownType(rightType) {
					return
				}

				if propertyExistsInAllConstituents(ctx.TypeChecker, rightType, propName) {
					typeStr := ctx.TypeChecker.TypeToString(rightType)
					ctx.ReportNode(node, rule.RuleMessage{
						Id: "redundantInCheck",
						Description: fmt.Sprintf(
							"Property `%s` already exists in type `%s`. This `in` check is redundant because the property is always present.",
							propName, typeStr,
						),
					})
				}
			},
		}
	},
}
