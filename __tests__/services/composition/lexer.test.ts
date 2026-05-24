/**
 * V142 Tests: DSLLexer
 */
import { DSLLexer } from '@/services/composition/DSLLexer';

function tokens(source: string) { return new DSLLexer(source).tokenize(); }

describe('DSLLexer', () => {
  test('tokenizes SKILL keyword', () => {
    const toks = tokens('skill');
    expect(toks[0].type).toBe('SKILL');
  });

  test('tokenizes IDENTIFIER', () => {
    const toks = tokens('my_skill');
    expect(toks[0].type).toBe('IDENTIFIER');
    expect(toks[0].value).toBe('my_skill');
  });

  test('tokenizes VERSION_NUM with v prefix and dots', () => {
    // v1.2.3 - number() starts with digit after v so gets it correctly
    const toks = tokens('v1.2.3');
    expect(toks[0].type).toBe('VERSION_NUM');
    expect(toks[0].value).toBe('v1.2.3');
  });

  test('tokenizes VERSION_NUM without v prefix', () => {
    const toks = tokens('1.0');
    expect(toks[0].type).toBe('VERSION_NUM');
    expect(toks[0].value).toBe('1.0');
  });

  test('tokenizes STRING', () => {
    const toks = tokens('"hello"');
    expect(toks[0].type).toBe('STRING');
    expect(toks[0].value).toBe('"hello"');
  });

  test('tokenizes ARROW', () => {
    const toks = tokens('->');
    expect(toks[0].type).toBe('ARROW');
    expect(toks[0].value).toBe('->');
  });

  test('tokenizes LPAREN and RPAREN', () => {
    const toks = tokens('()');
    expect(toks[0].type).toBe('LPAREN');
    expect(toks[1].type).toBe('RPAREN');
  });

  test('tokenizes COMMA', () => {
    const toks = tokens('a, b');
    expect(toks[1].type).toBe('COMMA');
  });

  test('tokenizes COLON', () => {
    const toks = tokens('a:b');
    expect(toks[1].type).toBe('COLON');
  });

  test('tokenizes DOT separately', () => {
    // 'a.b' - 'a' ident stops at '.', then '.' is a separate DOT token, then 'b' ident
    const toks = tokens('a.b');
    expect(toks[0].type).toBe('IDENTIFIER'); expect(toks[0].value).toBe('a');
    expect(toks[1].type).toBe('DOT'); expect(toks[1].value).toBe('.');
    expect(toks[2].type).toBe('IDENTIFIER'); expect(toks[2].value).toBe('b');
    expect(toks[3].type).toBe('EOF');
  });

  test('tokenizes OPERATOR', () => {
    const toks = tokens('<=');
    expect(toks[0].type).toBe('OPERATOR');
    expect(toks[0].value).toBe('<=');
  });

  test('skips comments', () => {
    const toks = tokens('# comment\nskill');
    expect(toks[0].type).toBe('SKILL');
    expect(toks[0].line).toBe(2);
  });

  test('tracks line and column', () => {
    const toks = tokens('\n\nskill');
    expect(toks[0].line).toBe(3);
    expect(toks[0].col).toBeGreaterThan(0);
  });

  test('tokenizes full DSL line', () => {
    const toks = tokens('skill smart_reply version 1.0.0');
    expect(toks[0].type).toBe('SKILL');
    expect(toks[1].type).toBe('IDENTIFIER');
    expect(toks[1].value).toBe('smart_reply');
    expect(toks[2].type).toBe('VERSION');
    expect(toks[3].type).toBe('VERSION_NUM');
    expect(toks[3].value).toBe('1.0.0');
    expect(toks[4].type).toBe('EOF');
  });

  test('all keywords tokenized correctly', () => {
    const toks = tokens('skill version when do if then else using yield');
    expect(toks.map(t => t.type)).toEqual([
      'SKILL', 'VERSION', 'WHEN', 'DO', 'IF', 'THEN', 'ELSE', 'USING', 'YIELD', 'EOF'
    ]);
  });

  test('escaped string characters', () => {
    const toks = tokens('"hello\\"world"');
    expect(toks[0].type).toBe('STRING');
  });

  test('ends with EOF token', () => {
    const toks = tokens('skill');
    expect(toks[toks.length - 1].type).toBe('EOF');
  });
});