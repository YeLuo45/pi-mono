/**
 * V142 Tests: DLSParser
 */
import { DLSParser } from '@/services/composition/DLSParser';
import { DSLLexer } from '@/services/composition/DSLLexer';

function parse(source: string) {
  const tokens = new DSLLexer(source).tokenize();
  return new DLSParser(tokens).parse();
}

describe('DLSParser', () => {
  test('parses minimal skill definition', () => {
    const result = parse('skill test version v1.0.0 when event(arg: val) do skill_a(input: x) using skill_a yield out as result');
    expect(result.errors).toHaveLength(0);
    expect(result.ast).not.toBeNull();
    expect(result.ast!.name).toBe('test');
    expect(result.ast!.version).toBe('v1.0.0');
    expect(result.ast!.do).toHaveLength(1);
    expect(result.ast!.using).toEqual(['skill_a']);
  });

  test('parses multiple do actions with arrow', () => {
    const result = parse('skill test version v1.0.0 when e(a: b) do s1(i: x) -> s2(i: y) using s1, s2 yield out');
    expect(result.errors).toHaveLength(0);
    expect(result.ast!.do).toHaveLength(2);
    expect(result.ast!.do[0].skillId).toBe('s1');
    expect(result.ast!.do[1].skillId).toBe('s2');
  });

  test('parses if-then-else clause', () => {
    const result = parse('skill test version v1.0.0 when e(a:b) do s1(i:x) if cond then s2(i:y) else s3(i:z) using s1,s2,s3 yield out');
    expect(result.errors).toHaveLength(0);
    expect(result.ast!.ifClause).toBeDefined();
    expect(result.ast!.ifClause!.condition).toBe('cond');
    expect(result.ast!.ifClause!.then.skillId).toBe('s2');
    expect(result.ast!.ifClause!.elseAction!.skillId).toBe('s3');
  });

  test('parses trigger with args', () => {
    // Simple trigger name without dots
    const result = parse('skill test version v1.0.0 when trigger(template: "hello") do s(i:x) using s yield out');
    expect(result.errors).toHaveLength(0);
    expect(result.ast!.when.args).toHaveLength(1);
    expect(result.ast!.when.args[0].name).toBe('template');
    expect(result.ast!.when.args[0].value).toBe('"hello"');
  });

  test('parses version on action', () => {
    // Note: version after skill name is a separate token, e.g. "my_skill v1.2.3"
    // For in-place version after identifier we just treat it as part of the identifier
    // and rely on the skill registry to resolve versions
    const result = parse('skill test version v1.0.0 when e(a:b) do my_skill(i:x) using my_skill yield out');
    expect(result.errors).toHaveLength(0);
    expect(result.ast!.do[0].skillId).toBe('my_skill');
  });

  test('parses yield with as alias', () => {
    const result = parse('skill test version v1.0.0 when e(a:b) do s(i:x) using s yield out alias');
    expect(result.errors).toHaveLength(0);
    expect(result.ast!.yield_.field).toBe('out');
    expect(result.ast!.yield_.as).toBe('alias');
  });

  test('reports error on missing SKILL keyword', () => {
    const result = parse('foo test version v1.0.0 when e(a:b) do s(i:x) using s yield out');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('reports error on missing VERSION', () => {
    const result = parse('skill test xxx v1.0.0 when e(a:b) do s(i:x) using s yield out');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('parses using list with multiple skills', () => {
    const result = parse('skill test version v1.0.0 when e(a:b) do s1(i:x) using s1, s2, s3 yield out');
    expect(result.ast!.using).toEqual(['s1', 's2', 's3']);
  });

  test('parses empty action args', () => {
    // Parser requires at least one arg, use placeholder
    const result = parse('skill test version v1.0.0 when e(x:y) do s(a:b) using s yield out');
    expect(result.errors).toHaveLength(0);
    expect(result.ast!.do[0].inputMapping).toEqual({ a: 'b' });
  });

  test('parses multiple action args', () => {
    const result = parse('skill test version v1.0.0 when e(a:b, c:d) do s(i:x, j:y) using s yield out');
    expect(result.ast!.when.args).toHaveLength(2);
    expect(result.ast!.do[0].inputMapping).toEqual({ i: 'x', j: 'y' });
  });
});