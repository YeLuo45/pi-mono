/**
 * V142: DLSParser — AST Parser from Token stream
 */
import type { Token, TokenType } from './DSLLexer';

export interface ASTSkillDef {
  type: 'SkillDef';
  name: string;
  version: string;
  when: ASTTrigger;
  do: ASTAction[];
  ifClause?: ASTIfClause;
  using: string[];
  yield_: ASTOutputMapping;
}
export interface ASTTrigger { type: 'Trigger'; eventName: string; args: ASTArg[]; }
export interface ASTArg { name: string; value: string; }
export interface ASTAction { type: 'Action'; skillId: string; version?: string; inputMapping: Record<string, string>; }
export interface ASTIfClause { condition: string; then: ASTAction; elseAction?: ASTAction; }
export interface ASTOutputMapping { field: string; as?: string; }
export type AST = ASTSkillDef;

export class DLSParser {
  private pos = 0;
  errors: string[] = [];

  constructor(private tokens: Token[]) {}

  parse(): { ast: AST | null; errors: string[] } {
    try {
      const ast = this.parseSkillDef();
      return { ast, errors: this.errors };
    } catch (e) {
      this.errors.push((e as Error).message);
      return { ast: null, errors: this.errors };
    }
  }

  private peek(): Token { return this.tokens[this.pos] ?? { type: 'EOF', value: '', line: 0, col: 0 }; }
  private advance(): Token { return this.tokens[this.pos++] ?? { type: 'EOF', value: '', line: 0, col: 0 }; }
  private expect(type: TokenType): Token {
    const t = this.advance();
    if (t.type !== type) throw new Error(`Expected ${type} at ${t.line}:${t.col}, got ${t.type} (${t.value})`);
    return t;
  }
  private match(type: TokenType): boolean { if (this.peek().type === type) { this.advance(); return true; } return false; }

  private parseSkillDef(): ASTSkillDef {
    this.expect('SKILL');
    const nameTok = this.expect('IDENTIFIER');
    this.expect('VERSION');
    const versionTok = this.expect('VERSION_NUM');
    this.expect('WHEN');
    const when = this.parseTrigger();
    this.expect('DO');
    const doActions = this.parseActionList();
    let ifClause: ASTIfClause | undefined;
    if (this.match('IF')) ifClause = this.parseIfClause();
    this.expect('USING');
    const using = this.parseUsingList();
    this.expect('YIELD');
    const yield_ = this.parseYield();
    return { type: 'SkillDef', name: nameTok.value, version: versionTok.value, when, do: doActions, ifClause, using, yield_ };
  }

  private parseActionList(): ASTAction[] {
    const actions: ASTAction[] = [];
    do { actions.push(this.parseAction()); } while (this.match('ARROW'));
    return actions;
  }

  private parseAction(): ASTAction {
    const skillTok = this.expect('IDENTIFIER');
    let version: string | undefined;
    if (this.match('VERSION_NUM')) version = this.tokens[this.pos - 1].value;
    this.expect('LPAREN');
    const inputMapping: Record<string, string> = {};
    while (this.peek().type !== 'RPAREN') {
      const k = this.expect('IDENTIFIER').value;
      this.expect('COLON');
      const v = this.peek().type === 'STRING' ? this.advance().value : this.expect('IDENTIFIER').value;
      inputMapping[k] = v;
      if (!this.match('COMMA')) break;
    }
    this.expect('RPAREN');
    return { type: 'Action', skillId: skillTok.value, version, inputMapping };
  }

  private parseIfClause(): ASTIfClause {
    const condition = this.expect('IDENTIFIER').value;
    while (this.peek().type !== 'THEN') this.advance();
    this.expect('THEN');
    const then_ = this.parseAction();
    let elseAction: ASTAction | undefined;
    if (this.match('ELSE')) elseAction = this.parseAction();
    return { condition, then: then_, elseAction };
  }

  private parseUsingList(): string[] {
    const skills: string[] = [];
    do { skills.push(this.expect('IDENTIFIER').value); } while (this.match('COMMA'));
    return skills;
  }

  private parseYield(): ASTOutputMapping {
    const fieldTok = this.expect('IDENTIFIER');
    let as: string | undefined;
    if (this.match('IDENTIFIER')) as = this.tokens[this.pos - 1].value;
    return { field: fieldTok.value, as };
  }

  private parseTrigger(): ASTTrigger {
    const eventNameTok = this.expect('IDENTIFIER');
    this.expect('LPAREN');
    const args: ASTArg[] = [];
    if (this.peek().type !== 'RPAREN') {
      do { args.push(this.parseArg()); } while (this.match('COMMA'));
    }
    this.expect('RPAREN');
    return { type: 'Trigger', eventName: eventNameTok.value, args };
  }

  private parseArg(): ASTArg {
    const nameTok = this.expect('IDENTIFIER');
    this.expect('COLON');
    const valueTok = this.match('STRING') ? this.tokens[this.pos - 1] : this.expect('IDENTIFIER');
    return { name: nameTok.value, value: valueTok.value };
  }
}