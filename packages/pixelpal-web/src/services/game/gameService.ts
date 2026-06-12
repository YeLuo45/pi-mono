/**
 * gameService.ts — V39
 * Interactive mini-game service for persona games.
 * Supports: guess-number, trivia, idiom-chain (成语接龙)
 */

import type { GameSession } from '../../store';

// ---------------------------------------------------------------------------
// Trivia Question Pool (15+ questions)
// ---------------------------------------------------------------------------
interface TriviaQuestion {
  q: string;
  options: string[];
  correct: number; // index into options
  exp: string;
}

const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  // Science
  { q: '地球到月球的距离约是多少？', options: ['38万公里', '150万公里', '500万公里', '1万公里'], correct: 0, exp: '地月距离约38.4万公里。' },
  { q: '水的化学式是什么？', options: ['CO2', 'H2O', 'NaCl', 'O2'], correct: 1, exp: '水由两个氢和一个氧组成。' },
  { q: '太阳系中最大的行星是哪颗？', options: ['地球', '木星', '土星', '海王星'], correct: 1, exp: '木星是太阳系体积最大的行星。' },
  { q: '光速大约是多少？', options: ['30万公里/秒', '3万公里/秒', '300万公里/秒', '3000公里/秒'], correct: 0, exp: '光在真空中约30万公里/秒。' },
  // History
  { q: '中国的第一个皇帝是谁？', options: ['刘邦', '项羽', '秦始皇', '汉武帝'], correct: 2, exp: '秦始皇是中国历史上第一个皇帝。' },
  { q: '唐朝的开国皇帝是谁？', options: ['李世民', '李渊', '武则天', '李隆基'], correct: 1, exp: '唐高祖李渊是唐朝开国皇帝。' },
  { q: '第一次世界大战开始于哪一年？', options: ['1914年', '1918年', '1939年', '1900年'], correct: 0, exp: '第一次世界大战于1914年爆发。' },
  // Language
  { q: '"Hello"用中文怎么说？', options: ['你好', '早上好', '晚安', '再见'], correct: 0, exp: 'Hello的中文翻译是"你好"。' },
  { q: '"Apple"用中文怎么说？', options: ['香蕉', '橙子', '苹果', '葡萄'], correct: 2, exp: 'Apple的中文翻译是"苹果"。' },
  { q: '"谢谢"用英文怎么说？', options: ['Sorry', 'Please', 'Thank you', 'Hello'], correct: 2, exp: '"谢谢"的英文是"Thank you"。' },
  // Common Knowledge
  { q: '一年有多少个月？', options: ['10个月', '11个月', '12个月', '13个月'], correct: 2, exp: '一年有12个月。' },
  { q: '中国的首都是哪座城市？', options: ['上海', '北京', '广州', '深圳'], correct: 1, exp: '北京是中国的首都。' },
  { q: '一周有多少天？', options: ['5天', '6天', '7天', '8天'], correct: 2, exp: '一周有7天。' },
  { q: '世界上最高的山是哪座？', options: ['乔戈里峰', '干城章嘉峰', '珠穆朗玛峰', '洛子峰'], correct: 2, exp: '珠穆朗玛峰是世界上最高的山，海拔8848米。' },
  { q: '1小时有多少分钟？', options: ['30分钟', '50分钟', '60分钟', '90分钟'], correct: 2, exp: '1小时等于60分钟。' },
  { q: '人体最大的器官是什么？', options: ['心脏', '肝脏', '皮肤', '大脑'], correct: 2, exp: '皮肤是人体最大的器官。' },
];

// ---------------------------------------------------------------------------
// Idiom Pool (30+ Chinese idioms for 成语接龙)
// ---------------------------------------------------------------------------
interface IdiomEntry {
  text: string;
  firstChar: string;
  lastChar: string;
}

const IDIOM_POOL: IdiomEntry[] = [
  { text: '一马当先', firstChar: '一', lastChar: '先' },
  { text: '先入为主', firstChar: '先', lastChar: '主' },
  { text: '主客颠倒', firstChar: '主', lastChar: '倒' },
  { text: '倒行逆施', firstChar: '倒', lastChar: '施' },
  { text: '施谋用智', firstChar: '施', lastChar: '智' },
  { text: '智勇双全', firstChar: '智', lastChar: '全' },
  { text: '全力以赴', firstChar: '全', lastChar: '为' },
  { text: '为期不远', firstChar: '为', lastChar: '远' },
  { text: '远见卓识', firstChar: '远', lastChar: '识' },
  { text: '识文断字', firstChar: '识', lastChar: '字' },
  { text: '字斟句酌', firstChar: '字', lastChar: '酌' },
  { text: '酌盈剂虚', firstChar: '酌', lastChar: '虚' },
  { text: '虚情假意', firstChar: '虚', lastChar: '意' },
  { text: '意气风发', firstChar: '意', lastChar: '发' },
  { text: '发扬光大', firstChar: '发', lastChar: '大' },
  { text: '大快人心', firstChar: '大', lastChar: '心' },
  { text: '心花怒放', firstChar: '心', lastChar: '放' },
  { text: '放虎归山', firstChar: '放', lastChar: '山' },
  { text: '山清水秀', firstChar: '山', lastChar: '秀' },
  { text: '秀外慧中', firstChar: '秀', lastChar: '中' },
  { text: '中奖', firstChar: '中', lastChar: '奖' },
  { text: '奖罚分明', firstChar: '奖', lastChar: '明' },
  { text: '明明白白', firstChar: '明', lastChar: '白' },
  { text: '白手起家', firstChar: '白', lastChar: '家' },
  { text: '家常便饭', firstChar: '家', lastChar: '饭' },
  { text: '饭来张口', firstChar: '饭', lastChar: '口' },
  { text: '口是心非', firstChar: '口', lastChar: '非' },
  { text: '非亲非故', firstChar: '非', lastChar: '故' },
  { text: '故步自封', firstChar: '故', lastChar: '封' },
  { text: '封官许愿', firstChar: '封', lastChar: '愿' },
  { text: '如愿以偿', firstChar: '如', lastChar: '偿' },
  { text: '偿命', firstChar: '偿', lastChar: '命' },
  { text: '命不该绝', firstChar: '命', lastChar: '绝' },
  { text: '绝处逢生', firstChar: '绝', lastChar: '生' },
  { text: '生龙活虎', firstChar: '生', lastChar: '虎' },
  { text: '虎口余生', firstChar: '虎', lastChar: '余' },
  { text: '余音绕梁', firstChar: '余', lastChar: '梁' },
  { text: '梁上君子', firstChar: '梁', lastChar: '子' },
  { text: '子虚乌有', firstChar: '子', lastChar: '有' },
  { text: '有眼无珠', firstChar: '有', lastChar: '珠' },
  { text: '珠联璧合', firstChar: '珠', lastChar: '合' },
  { text: '合情合理', firstChar: '合', lastChar: '理' },
  { text: '理直气壮', firstChar: '理', lastChar: '壮' },
  { text: '壮志凌云', firstChar: '壮', lastChar: '云' },
  { text: '云开见日', firstChar: '云', lastChar: '日' },
  { text: '日新月异', firstChar: '日', lastChar: '异' },
  { text: '异曲同工', firstChar: '异', lastChar: '工' },
  { text: '工力悉敌', firstChar: '工', lastChar: '敌' },
  { text: '敌我不分', firstChar: '敌', lastChar: '分' },
  { text: '分秒必争', firstChar: '分', lastChar: '争' },
  { text: '争先恐后', firstChar: '争', lastChar: '后' },
  { text: '后会有期', firstChar: '后', lastChar: '期' },
  { text: '期期艾艾', firstChar: '期', lastChar: '艾' },
  { text: '艾艾', firstChar: '艾', lastChar: '艾' },
];

// ---------------------------------------------------------------------------
// Helper: get personality bonus message based on persona type
// ---------------------------------------------------------------------------
export function getPersonalityBonus(personaId: string): string {
  if (personaId === 'preset-friend') {
    return '温暖如春，每次和你玩耍都让我很开心！';
  }
  if (personaId === 'preset-teacher') {
    return '学而不厌，诲人不倦，为你的进步感到欣慰！';
  }
  if (personaId === 'preset-coach') {
    return '突破极限！你真是一次比一次更强！';
  }
  if (personaId === 'preset-lover') {
    return '和你在一起的每分每秒都好幸福呀~';
  }
  return '和你一起玩真开心！';
}

// ---------------------------------------------------------------------------
// Helper: shuffle array (Fisher-Yates)
// ---------------------------------------------------------------------------
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Guess Number Game
// ---------------------------------------------------------------------------
export function createGuessNumberGame(personaId: string): GameSession {
  const targetNumber = Math.floor(Math.random() * 100) + 1;
  return {
    id: `gn_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    personaId,
    gameType: 'guess-number',
    state: 'playing',
    score: 0,
    rounds: 0,
    data: { targetNumber, guessCount: 0 },
  };
}

export function checkGuess(
  session: GameSession,
  guess: number
): { correct: boolean; hint: string } {
  const target = session.data.targetNumber as number;
  if (guess === target) {
    return { correct: true, hint: '猜中了!' };
  }
  if (guess > target) {
    return { correct: false, hint: '太大啦~' };
  }
  return { correct: false, hint: '太小啦~' };
}

// ---------------------------------------------------------------------------
// Trivia Game
// ---------------------------------------------------------------------------
export function createTriviaGame(personaId: string): GameSession {
  // Pick 5 random questions
  const shuffled = shuffleArray(TRIVIA_QUESTIONS);
  const questions = shuffled.slice(0, 5);
  return {
    id: `tr_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    personaId,
    gameType: 'trivia',
    state: 'playing',
    score: 0,
    rounds: 0,
    data: { questions, currentIndex: 0, correctCount: 0 },
  };
}

export function checkTriviaAnswer(
  session: GameSession,
  selectedIndex: number
): { correct: boolean; explanation: string } {
  const questions = session.data.questions as TriviaQuestion[];
  const idx = session.data.currentIndex as number;
  const q = questions[idx];
  if (selectedIndex === q.correct) {
    return { correct: true, explanation: q.exp };
  }
  return { correct: false, explanation: q.exp };
}

// ---------------------------------------------------------------------------
// Idiom Chain Game (成语接龙)
// ---------------------------------------------------------------------------
export function createIdiomGame(personaId: string): GameSession {
  // Pick a random starting idiom
  const startIdx = Math.floor(Math.random() * IDIOM_POOL.length);
  const startIdiom = IDIOM_POOL[startIdx];
  return {
    id: `id_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    personaId,
    gameType: 'idiom',
    state: 'playing',
    score: 0,
    rounds: 0,
    data: {
      currentIdiom: startIdiom,
      history: [startIdiom.text],
      usedIndices: new Set([startIdx]),
    },
  };
}

/**
 * Check if the user's idiom's first char matches the last idiom's last char.
 * Simplified: just check first char of next vs last char of last.
 */
export function checkIdiom(lastIdiom: string, nextIdiom: string): boolean {
  const lastEntry = IDIOM_POOL.find((i) => i.text === lastIdiom);
  if (!lastEntry) return false;
  // Get first char of user's idiom
  const nextFirstChar = nextIdiom.trim().charAt(0);
  return nextFirstChar === lastEntry.lastChar;
}

/**
 * Pick a random idiom from the pool that:
 * - Starts with the given character (nextChar)
 * - Has not been used yet in this session
 */
export function pickNextIdiom(
  nextChar: string,
  usedIndices: Set<number>
): IdiomEntry | null {
  const candidates = IDIOM_POOL.filter(
    (idiom, idx) => idiom.firstChar === nextChar && !usedIndices.has(idx)
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// ---------------------------------------------------------------------------
// End-of-game intimacy reward calculator
// ---------------------------------------------------------------------------
const GUESS_NUMBER_REWARD = 3;
const TRIVIA_REWARD_PER_Q = 2;
const IDIOM_REWARD_PER_ROUND = 3;

export function calcGameReward(
  gameType: 'guess-number' | 'trivia' | 'idiom',
  score: number,
  rounds: number
): number {
  if (gameType === 'guess-number') {
    return GUESS_NUMBER_REWARD;
  }
  if (gameType === 'trivia') {
    return score * TRIVIA_REWARD_PER_Q;
  }
  if (gameType === 'idiom') {
    return rounds * IDIOM_REWARD_PER_ROUND;
  }
  return 0;
}
