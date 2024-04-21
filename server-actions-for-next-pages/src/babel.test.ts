import { test, expect, describe } from 'vitest';
import { parseExpression } from '@babel/parser';
import generate from '@babel/generator';
import { exportDefaultDeclaration } from '@babel/types';

// import { parseExpression } from './utils';

test('parseExpression', () => {
  {
    const parsed = parseExpression(
      '{ "type": "StringLiteral", "value": "/api/actions-node" }',
    );
    const code = generate(parsed).code;
    expect(code).toMatchInlineSnapshot(`
      "{
        "type": "StringLiteral",
        "value": "/api/actions-node"
      }"
    `);
  }
  {
    const parsed = parseExpression('null');
    const code = generate(parsed).code;
    expect(code).toMatchInlineSnapshot(`"null"`);
  }
  {
    const parsed = parseExpression(
      `typeof wrapMethod === 'function' ? wrapMethod : undefined`,
    );
    const code = generate(parsed).code;
    expect(code).toMatchInlineSnapshot(
      `"typeof wrapMethod === 'function' ? wrapMethod : undefined"`,
    );
  }
});
