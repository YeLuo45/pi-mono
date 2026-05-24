/**
 * V142: DSLLexer — Tokenizer for Skill DSL
 */
export type TokenType =
  | 'SKILL' | 'VERSION' | 'WHEN' | 'DO' | 'IF' | 'THEN' | 'ELSE'
  | 'USING' | 'YIELD' | 'AS' | 'IDENTIFIER' | 'VERSION_NUM' | 'STRING'
  | 'ARROW' | 'LPAREN' | 'RPAREN' | 'LBRACE' | 'RBRACE'
  | 'COMMA' | 'COLON' | 'DOT' | 'OPERATOR' | 'NEWLINE' | 'EOF';

export interface Token { type: TokenType; value: string; line: number; col: number; }

const KEYWORDS: Record<string, TokenType> = {
  skill: 'SKILL', version: 'VERSION', when: 'WHEN', do: 'DO',
  if: 'IF', then: 'THEN', else: 'ELSE', using: 'USING', yield: 'YIELD',
};

const OP_CHARS = '<>=!+-*/%';

function isAlpha(c: string) { return /[a-zA-Z_]/.test(c); }
function isDigit(c: string) { return /[0-9]/.test(c); }
function isAlnum(c: string) { return /[a-zA-Z0-9_.]/.test(c); }
function isIdentChar(c: string) { return /[a-zA-Z0-9_]/.test(c); }

export class DSLLexer {
  private pos = 0;
  private line = 1;
  private col = 1;
  private tokens: Token[] = [];

  constructor(private input: string) {}

  tokenize(): Token[] {
    while (this.pos < this.input.length) {
      const c = this.input[this.pos];
      if (c === '\n') { this.newline(); continue; }
      if (/\s/.test(c)) { this.advance(); continue; }
      if (c === '#') { this.skipComment(); continue; }
      if (c === '"') { this.string(); continue; }
      if (isAlpha(c)) { this.ident(); continue; }
      if (isDigit(c)) { this.number(); continue; }
      if (c === '-' && this.peek(1) === '>') {
        this.tokens.push({ type: 'ARROW', value: '->', line: this.line, col: this.col });
        this.advance(); this.advance();
        continue;
      }
      if (c === '(') { this.tokens.push({ type: 'LPAREN', value: c, line: this.line, col: this.col }); this.advance(); continue; }
      if (c === ')') { this.tokens.push({ type: 'RPAREN', value: c, line: this.line, col: this.col }); this.advance(); continue; }
      if (c === '{') { this.tokens.push({ type: 'LBRACE', value: c, line: this.line, col: this.col }); this.advance(); continue; }
      if (c === '}') { this.tokens.push({ type: 'RBRACE', value: c, line: this.line, col: this.col }); this.advance(); continue; }
      if (c === ',') { this.tokens.push({ type: 'COMMA', value: c, line: this.line, col: this.col }); this.advance(); continue; }
      if (c === ':') { this.tokens.push({ type: 'COLON', value: c, line: this.line, col: this.col }); this.advance(); continue; }
      if (c === '.') { this.tokens.push({ type: 'DOT', value: c, line: this.line, col: this.col }); this.advance(); continue; }
      if (OP_CHARS.includes(c)) { this.operator(); continue; }
      this.advance();
    }
    this.tokens.push({ type: 'EOF', value: '', line: this.line, col: this.col });
    return this.tokens;
  }

  private advance() { this.pos++; this.col++; }
  private newline() { this.pos++; this.line++; this.col = 1; }
  private peek(n: number) { return this.input[this.pos + n] ?? ''; }

  private skipComment() {
    while (this.pos < this.input.length && this.input[this.pos] !== '\n') this.advance();
  }

  private string() {
    const start = this.pos;
    this.advance();
    while (this.pos < this.input.length && this.input[this.pos] !== '"') {
      if (this.input[this.pos] === '\\') this.advance();
      this.advance();
    }
    this.advance();
    this.tokens.push({ type: 'STRING', value: this.input.slice(start, this.pos), line: this.line, col: this.col });
  }

  private ident() {
    const start = this.pos;
    while (this.pos < this.input.length && isIdentChar(this.input[this.pos])) this.advance();
    let v = this.input.slice(start, this.pos);
    // Handle v-prefixed version numbers: v1, v1.2.3 - continue scanning after dots
    if (v.match(/^v\d+$/) && this.pos < this.input.length && this.input[this.pos] === '.') {
      while (this.pos < this.input.length && (isDigit(this.input[this.pos]) || this.input[this.pos] === '.')) this.advance();
      v = this.input.slice(start, this.pos);
    }
    if (KEYWORDS[v]) this.tokens.push({ type: KEYWORDS[v], value: v, line: this.line, col: this.col });
    else if (v.match(/^v\d+(\.\d+)*$/)) this.tokens.push({ type: 'VERSION_NUM', value: v, line: this.line, col: this.col });
    else this.tokens.push({ type: 'IDENTIFIER', value: v, line: this.line, col: this.col });
  }

  private number() {
    const start = this.pos;
    if (this.pos < this.input.length && this.input[this.pos] === 'v') this.advance();
    while (this.pos < this.input.length && (isDigit(this.input[this.pos]) || this.input[this.pos] === '.')) this.advance();
    this.tokens.push({ type: 'VERSION_NUM', value: this.input.slice(start, this.pos), line: this.line, col: this.col });
  }

  private operator() {
    const start = this.pos;
    while (this.pos < this.input.length && OP_CHARS.includes(this.input[this.pos])) this.advance();
    this.tokens.push({ type: 'OPERATOR', value: this.input.slice(start, this.pos), line: this.line, col: this.col });
  }
}