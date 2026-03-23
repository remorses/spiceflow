// lintcn:name no-in-operator
// lintcn:severity warn
// lintcn:description Flag all uses of the `in` operator and show the type of the right-hand operand. The `in` operator is usually an escape hatch — prefer type guards, discriminated unions, or proper type narrowing instead.
// lintcn:source https://github.com/remorses/lintcn/tree/main/.lintcn/no_in_operator
//
// Like no-type-assertion, this rule warns on every `in` usage so that
// agents and developers see the actual types involved and can choose
// a safer alternative. Special-cases union types where some members
// already have the checked property: suggests discriminating the union
// instead of using `in` for narrowing.

package no_in_operator

import (
	"fmt"
	"strings"

	"github.com/microsoft/typescript-go/shim/ast"
	"github.com/microsoft/typescript-go/shim/checker"
	"github.com/microsoft/typescript-go/shim/compiler"
	"github.com/typescript-eslint/tsgolint/internal/rule"
	"github.com/typescript-eslint/tsgolint/internal/utils"
)

// safeTypeString converts a type to string, returning "unknown" if nil.
func safeTypeString(c *checker.Checker, t *checker.Type) string {
	if c == nil || t == nil {
		return "unknown"
	}
	return c.TypeToString(t)
}

// formatType returns a type string, appending the expanded structural form
// in parentheses when it differs from the alias name. Reuses the same
// pattern as no-type-assertion for consistency.
func formatType(c *checker.Checker, program *compiler.Program, t *checker.Type) string {
	if c == nil || t == nil {
		return "unknown"
	}

	name := c.TypeToString(t)

	if utils.IsTypeAnyType(t) || utils.IsTypeUnknownType(t) {
		return name
	}
	if utils.IsTypeFlagSet(t, checker.TypeFlagsNever) {
		return name
	}

	parts := utils.UnionTypeParts(t)
	if len(parts) > 1 {
		anyExpanded := false
		expandedParts := make([]string, len(parts))
		for i, part := range parts {
			if part == nil {
				expandedParts[i] = "unknown"
				continue
			}
			expandedParts[i] = formatType(c, program, part)
			if expandedParts[i] != safeTypeString(c, part) {
				anyExpanded = true
			}
		}
		if anyExpanded {
			return fmt.Sprintf("%s (%s)", name, strings.Join(expandedParts, " | "))
		}
		return name
	}

	expanded := expandTypeStructure(c, program, t)
	if expanded == "" || expanded == name {
		return name
	}
	return fmt.Sprintf("%s (%s)", name, expanded)
}

// expandTypeStructure builds a structural representation of a type.
func expandTypeStructure(c *checker.Checker, program *compiler.Program, t *checker.Type) string {
	if c == nil || t == nil {
		return ""
	}
	if !utils.IsObjectType(t) {
		return ""
	}
	if program != nil && t.Symbol() != nil && utils.IsSymbolFromDefaultLibrary(program, t.Symbol()) {
		return ""
	}

	props := checker.Checker_getPropertiesOfType(c, t)
	callSigs := c.GetCallSignatures(t)
	indexInfos := checker.Checker_getIndexInfosOfType(c, t)

	if len(props) == 0 && len(callSigs) == 0 && len(indexInfos) == 0 {
		return ""
	}
	if len(props) > 20 {
		return ""
	}

	var parts []string

	for _, idx := range indexInfos {
		if idx == nil {
			continue
		}
		keyStr := safeTypeString(c, idx.KeyType())
		valStr := safeTypeString(c, idx.ValueType())
		if idx.IsReadonly() {
			parts = append(parts, fmt.Sprintf("readonly [key: %s]: %s", keyStr, valStr))
		} else {
			parts = append(parts, fmt.Sprintf("[key: %s]: %s", keyStr, valStr))
		}
	}

	for _, sig := range callSigs {
		if sig == nil {
			continue
		}
		retType := checker.Checker_getReturnTypeOfSignature(c, sig)
		retStr := safeTypeString(c, retType)
		params := checker.Signature_parameters(sig)
		paramParts := make([]string, len(params))
		for i, p := range params {
			if p == nil {
				paramParts[i] = "arg: unknown"
				continue
			}
			pType := checker.Checker_getTypeOfSymbol(c, p)
			paramParts[i] = fmt.Sprintf("%s: %s", p.Name, safeTypeString(c, pType))
		}
		parts = append(parts, fmt.Sprintf("(%s) => %s", strings.Join(paramParts, ", "), retStr))
	}

	for _, prop := range props {
		if prop == nil {
			continue
		}
		propType := checker.Checker_getTypeOfSymbol(c, prop)
		propStr := safeTypeString(c, propType)
		optional := ""
		if prop.Flags&ast.SymbolFlagsOptional != 0 {
			optional = "?"
		}
		parts = append(parts, fmt.Sprintf("%s%s: %s", prop.Name, optional, propStr))
	}

	return "{ " + strings.Join(parts, "; ") + " }"
}

// unionMemberAnalysis inspects which union members have a property and which don't.
type unionMemberAnalysis struct {
	membersWithProp    []string // type names of members that have the property
	membersWithoutProp []string // type names of members that don't have the property
}

// analyzeUnionMembers checks each union constituent for a named property.
func analyzeUnionMembers(tc *checker.Checker, t *checker.Type, propName string) *unionMemberAnalysis {
	parts := utils.UnionTypeParts(t)
	if len(parts) <= 1 {
		return nil
	}

	result := &unionMemberAnalysis{}
	for _, part := range parts {
		if part == nil {
			continue
		}
		flags := checker.Type_flags(part)
		// Skip null/undefined in the analysis
		if flags&(checker.TypeFlagsNull|checker.TypeFlagsUndefined|checker.TypeFlagsVoid) != 0 {
			continue
		}

		name := safeTypeString(tc, part)
		prop := checker.Checker_getPropertyOfType(tc, part, propName)
		if prop == nil {
			// Try apparent type
			apparent := checker.Checker_getApparentType(tc, part)
			if apparent != nil && apparent != part {
				prop = checker.Checker_getPropertyOfType(tc, apparent, propName)
			}
		}
		if prop != nil {
			result.membersWithProp = append(result.membersWithProp, name)
		} else {
			result.membersWithoutProp = append(result.membersWithoutProp, name)
		}
	}
	return result
}

var NoInOperatorRule = rule.Rule{
	Name: "no-in-operator",
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

				rightType := ctx.TypeChecker.GetTypeAtLocation(right)
				if rightType == nil {
					return
				}

				// Resolve type parameters
				constraint, isTypeParam := utils.GetConstraintInfo(ctx.TypeChecker, rightType)
				if isTypeParam && constraint != nil {
					rightType = constraint
				}

				rightTypeStr := formatType(ctx.TypeChecker, ctx.Program, rightType)

				// Get property name from left side (if static string key)
				propName := ""
				if left.Kind == ast.KindStringLiteral || left.Kind == ast.KindNoSubstitutionTemplateLiteral {
					propName = left.Text()
				}

				// Special case: union type where some members have the property
				if propName != "" && utils.IsUnionType(rightType) {
					analysis := analyzeUnionMembers(ctx.TypeChecker, rightType, propName)
					if analysis != nil && len(analysis.membersWithProp) > 0 && len(analysis.membersWithoutProp) > 0 {
						ctx.ReportNode(node, rule.RuleMessage{
							Id: "inOperatorUnionNarrowing",
							Description: fmt.Sprintf(
								"`in` operator on union type `%s`. Property `%s` exists in %s but not in %s. Consider using a discriminant property (e.g. a `kind` or `type` field) to narrow the union instead of `in`.",
								rightTypeStr, propName,
								strings.Join(analysis.membersWithProp, ", "),
								strings.Join(analysis.membersWithoutProp, ", "),
							),
						})
						return
					}
				}

				// General case: show the type and suggest alternatives
				ctx.ReportNode(node, rule.RuleMessage{
					Id: "inOperator",
					Description: fmt.Sprintf(
						"`in` operator check on type `%s`. The `in` operator is usually an escape hatch. Consider using a type guard, discriminated union, or proper type narrowing instead.",
						rightTypeStr,
					),
				})
			},
		}
	},
}
