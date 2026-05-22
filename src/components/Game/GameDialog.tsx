/**
 * GameDialog.tsx — V39
 * Interactive mini-game dialog for persona games.
 * Features: Guess Number, Trivia Challenge, Idiom Chain (成语接龙)
 */

import React, { useState, useEffect, useRef } from 'react';
import { MyDialog } from '../MUI替代';
import { MyButton, MyTextField, MyBox, MyTypography, MyIconButton, MyChip, MyPaper, MyInputAdornment } from '../MUI替代';
import {
  Close as CloseIcon,
  EmojiEvents as TrophyIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useStore } from '../../store';
import type { GameSession } from '../../store';
import {
  createGuessNumberGame,
  checkGuess,
  createTriviaGame,
  checkTriviaAnswer,
  createIdiomGame,
  checkIdiom,
  pickNextIdiom,
  getPersonalityBonus,
  calcGameReward,
} from '../../services/game/gameService';

interface GameDialogProps {
  personaId: string;
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Sub-screens
// ---------------------------------------------------------------------------
type Screen = 'select' | 'guess' | 'trivia' | 'idiom' | 'result';

interface GuessState {
  guess: string;
  hint: string;
  guessCount: number;
  done: boolean;
}

interface TriviaState {
  hint: string;
  done: boolean;
  showingAnswer: boolean;
  lastCorrect: boolean;
  lastExplanation: string;
  selectedIndex: number | null;
}

interface IdiomState {
  input: string;
  hint: string;
  done: boolean;
  failed: boolean;
  round: number;
  history: string[];
}

interface ResultState {
  gameType: 'guess-number' | 'trivia' | 'idiom';
  score: number;
  rounds: number;
  intimacyDelta: number;
  message: string;
}

export const GameDialog: React.FC<GameDialogProps> = ({
  personaId,
  open,
  onClose,
}) => {
  const activePersonaId = useStore((s) => s.activePersonaId);
  const personaIntimacy = useStore((s) => s.personaIntimacy);
  const addIntimacy = useStore((s) => s.addIntimacy);
  const clearGameSession = useStore((s) => s.clearGameSession);
  const setGameSession = useStore((s) => s.setGameSession);

  const activePersonaName =
    (personaId === activePersonaId
      ? useStore.getState().messages.find((m) => m.personaId === personaId)
      : null) !== null
      ? // Use the personaId to look up name from personas — fetch from store directly
        personaId
      : personaId;

  // Resolve persona name from personaStorage
  const [personaName, setPersonaName] = useState('朋友');
  useEffect(() => {
    import('../../services/persona/personaStorage').then(({ getAllPersonas }) => {
      const p = getAllPersonas().find((per) => per.id === personaId);
      if (p) setPersonaName(p.name);
    });
  }, [personaId]);

  const [screen, setScreen] = useState<Screen>('select');
  const [session, setSession] = useState<GameSession | null>(null);

  // Guess Number state
  const [guessState, setGuessState] = useState<GuessState>({
    guess: '',
    hint: '🎯 我来想一个1-100的数字，快来猜吧！',
    guessCount: 0,
    done: false,
  });

  // Trivia state
  const [triviaState, setTriviaState] = useState<TriviaState>({
    hint: '',
    done: false,
    showingAnswer: false,
    lastCorrect: false,
    lastExplanation: '',
    selectedIndex: null,
  });

  // Idiom state
  const [idiomState, setIdiomState] = useState<IdiomState>({
    input: '',
    hint: '',
    done: false,
    failed: false,
    round: 0,
    history: [],
  });

  // Result state
  const [resultState, setResultState] = useState<ResultState>({
    gameType: 'guess-number',
    score: 0,
    rounds: 0,
    intimacyDelta: 0,
    message: '',
  });

  const guessInputRef = useRef<HTMLInputElement>(null);
  const idiomInputRef = useRef<HTMLInputElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setScreen('select');
      setSession(null);
      setGuessState({ guess: '', hint: '🎯 我来想一个1-100的数字，快来猜吧！', guessCount: 0, done: false });
      setTriviaState({ hint: '', done: false, showingAnswer: false, lastCorrect: false, lastExplanation: '', selectedIndex: null });
      setIdiomState({ input: '', hint: '', done: false, failed: false, round: 0, history: [] });
    }
  }, [open]);

  // ---------------------------------------------------------------------------
  // Game start handlers
  // ---------------------------------------------------------------------------
  const startGuess = () => {
    const s = createGuessNumberGame(personaId);
    setSession(s);
    setGameSession(s);
    setScreen('guess');
    setGuessState({ guess: '', hint: '🎯 我来想一个1-100的数字，快来猜吧！', guessCount: 0, done: false });
    setTimeout(() => guessInputRef.current?.focus(), 100);
  };

  const startTrivia = () => {
    const s = createTriviaGame(personaId);
    setSession(s);
    setGameSession(s);
    setScreen('trivia');
    const questions = s.data.questions;
    setTriviaState({
      hint: '',
      done: false,
      showingAnswer: false,
      lastCorrect: false,
      lastExplanation: '',
      selectedIndex: null,
    });
  };

  const startIdiom = () => {
    const s = createIdiomGame(personaId);
    setSession(s);
    setGameSession(s);
    const startIdiomText = (s.data.currentIdiom as { text: string }).text;
    setScreen('idiom');
    setIdiomState({
      input: '',
      hint: `🔤 我先说一个: ${startIdiomText}`,
      done: false,
      failed: false,
      round: 0,
      history: [startIdiomText],
    });
    setTimeout(() => idiomInputRef.current?.focus(), 100);
  };

  // ---------------------------------------------------------------------------
  // Guess Number logic
  // ---------------------------------------------------------------------------
  const handleGuessSubmit = () => {
    if (!session || guessState.done) return;
    const guessNum = parseInt(guessState.guess, 10);
    if (isNaN(guessNum) || guessNum < 1 || guessNum > 100) {
      setGuessState((prev) => ({ ...prev, hint: '请输入1-100之间的数字哦~' }));
      return;
    }
    const result = checkGuess(session, guessNum);
    const newCount = guessState.guessCount + 1;
    if (result.correct) {
      const reward = calcGameReward('guess-number', 0, 0);
      addIntimacy(personaId, reward);
      setGuessState((prev) => ({
        ...prev,
        hint: `🎉 猜中了! 一共猜了 ${newCount} 次！`,
        guessCount: newCount,
        done: true,
      }));
      setSession((prev) => prev ? { ...prev, state: 'won', score: newCount, rounds: newCount } : prev);
      setResultState({
        gameType: 'guess-number',
        score: newCount,
        rounds: newCount,
        intimacyDelta: reward,
        message: getPersonalityBonus(personaId),
      });
    } else {
      setGuessState((prev) => ({
        ...prev,
        hint: result.hint,
        guessCount: newCount,
      }));
      setSession((prev) => prev ? { ...prev, rounds: newCount } : prev);
    }
  };

  // ---------------------------------------------------------------------------
  // Trivia logic
  // ---------------------------------------------------------------------------
  const getCurrentTriviaQuestion = () => {
    if (!session) return null;
    const questions = session.data.questions as Array<{
      q: string; options: string[]; correct: number; exp: string;
    }>;
    const idx = session.data.currentIndex as number;
    return questions[idx];
  };

  const handleTriviaAnswer = (selectedIndex: number) => {
    if (!session || triviaState.done || triviaState.showingAnswer) return;
    const result = checkTriviaAnswer(session, selectedIndex);
    const questions = session.data.questions as Array<{
      q: string; options: string[]; correct: number; exp: string;
    }>;
    const idx = session.data.currentIndex as number;
    const newCorrectCount = (session.data.correctCount as number) + (result.correct ? 1 : 0);
    const nextIdx = idx + 1;

    setTriviaState((prev) => ({
      ...prev,
      showingAnswer: true,
      lastCorrect: result.correct,
      lastExplanation: result.explanation,
      selectedIndex,
      hint: result.correct ? '✅ 回答正确！' : `❌ 正确答案是: ${questions[idx].options[questions[idx].correct]}`,
    }));

    setSession((prev) =>
      prev
        ? {
            ...prev,
            data: { ...prev.data, currentIndex: nextIdx, correctCount: newCorrectCount },
            score: newCorrectCount,
          }
        : prev
    );
  };

  const handleTriviaNext = () => {
    if (!session) return;
    const questions = session.data.questions as Array<{
      q: string; options: string[]; correct: number; exp: string;
    }>;
    const idx = session.data.currentIndex as number;

    if (idx >= questions.length) {
      // Game over
      const reward = calcGameReward('trivia', session.score, session.rounds);
      addIntimacy(personaId, reward);
      setTriviaState((prev) => ({ ...prev, done: true }));
      setSession((prev) => prev ? { ...prev, state: 'won' } : prev);
      setResultState({
        gameType: 'trivia',
        score: session.score,
        rounds: questions.length,
        intimacyDelta: reward,
        message: getPersonalityBonus(personaId),
      });
    } else {
      setTriviaState((prev) => ({
        ...prev,
        showingAnswer: false,
        selectedIndex: null,
        hint: '',
      }));
    }
  };

  // ---------------------------------------------------------------------------
  // Idiom logic
  // ---------------------------------------------------------------------------
  const handleIdiomSubmit = () => {
    if (!session || idiomState.done) return;
    const lastIdiom = (session.data.currentIdiom as { text: string }).text;
    const userIdiom = idiomState.input.trim();

    if (!userIdiom) {
      setIdiomState((prev) => ({ ...prev, hint: '🔤 请输入一个成语~' }));
      return;
    }

    const valid = checkIdiom(lastIdiom, userIdiom);
    if (!valid) {
      const reward = 0;
      addIntimacy(personaId, reward);
      setIdiomState((prev) => ({
        ...prev,
        done: true,
        failed: true,
        hint: `❌ 接不上啦~ "${lastIdiom}" 的尾字是 "${(session.data.currentIdiom as { lastChar: string }).lastChar}"，你的成语首字应该匹配它哦！`,
      }));
      setSession((prev) => prev ? { ...prev, state: 'lost' } : prev);
      setResultState({
        gameType: 'idiom',
        score: idiomState.round,
        rounds: idiomState.round,
        intimacyDelta: 0,
        message: '没关系，再接再厉！',
      });
      return;
    }

    // Find next AI idiom
    const lastEntry = (session.data.currentIdiom as { lastChar: string });
    const nextEntry = pickNextIdiom(lastEntry.lastChar, session.data.usedIndices as Set<number>);
    if (!nextEntry) {
      // AI can't continue — player wins by default
      const newRound = idiomState.round + 1;
      const reward = calcGameReward('idiom', 0, newRound);
      addIntimacy(personaId, reward);
      setIdiomState((prev) => ({
        ...prev,
        done: true,
        round: newRound,
        history: [...prev.history, userIdiom],
        hint: `🏆 你接上了！AI无成语可接，你赢了！`,
      }));
      setSession((prev) => prev ? { ...prev, state: 'won', rounds: newRound } : prev);
      setResultState({
        gameType: 'idiom',
        score: newRound,
        rounds: newRound,
        intimacyDelta: reward,
        message: getPersonalityBonus(personaId),
      });
      return;
    }

    const newRound = idiomState.round + 1;
    const usedIndices = new Set(session.data.usedIndices as Set<number>);
    // Mark the user's idiom index as used (find it)
    const userIdx = -1; // we don't track user idiom pool index; we just track rounds
    usedIndices.add(-1); // placeholder

    if (newRound >= 5) {
      const reward = calcGameReward('idiom', 0, newRound);
      addIntimacy(personaId, reward);
      setIdiomState((prev) => ({
        ...prev,
        done: true,
        round: newRound,
        history: [...prev.history, userIdiom],
        hint: `🎉 成语接龙完成！共完成了 ${newRound} 轮！`,
      }));
      setSession((prev) => prev ? { ...prev, state: 'won', rounds: newRound } : prev);
      setResultState({
        gameType: 'idiom',
        score: newRound,
        rounds: newRound,
        intimacyDelta: reward,
        message: getPersonalityBonus(personaId),
      });
      return;
    }

    // Continue
    const newHistory = [...idiomState.history, userIdiom];
    setIdiomState((prev) => ({
      ...prev,
      input: '',
      round: newRound,
      hint: `✅ 正确！轮到AI: ${nextEntry.text}`,
      history: newHistory,
    }));
    setSession((prev) =>
      prev
        ? {
            ...prev,
            data: {
              ...prev.data,
              currentIdiom: nextEntry,
              history: newHistory,
              usedIndices,
            },
            rounds: newRound,
          }
        : prev
    );
    setTimeout(() => idiomInputRef.current?.focus(), 100);
  };

  // ---------------------------------------------------------------------------
  // Result screen
  // ---------------------------------------------------------------------------
  const showResult = () => {
    setScreen('result');
    clearGameSession();
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const renderSelectScreen = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
      <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mb: 1 }}>
        {personaName}想和你玩个小游戏~ 选择一个吧！
      </Typography>
      <GameCard
        emoji="🎯"
        title="猜数字"
        desc="我想了一个1-100的数字，看你能几次猜中！"
        onClick={startGuess}
      />
      <GameCard
        emoji="❓"
        title="问答挑战"
        desc="回答5道趣味问题，考验你的知识面！"
        onClick={startTrivia}
      />
      <GameCard
        emoji="🔤"
        title="成语接龙"
        desc="我来起头，接龙5轮，看谁词汇量更大！"
        onClick={startIdiom}
      />
    </Box>
  );

  const renderGuessScreen = () => {
    const hintColor = guessState.done
      ? 'success.main'
      : guessState.hint.includes('大') || guessState.hint.includes('小')
      ? 'warning.main'
      : 'text.primary';
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
          {guessState.done
            ? `🎉 游戏结束！${personaName}很厉害哦~`
            : `${personaName}: ${guessState.hint}`}
        </Typography>
        <Typography
          variant="h5"
          sx={{ textAlign: 'center', fontWeight: 700, color: hintColor, minHeight: 40 }}
        >
          {guessState.hint}
        </Typography>
        {!guessState.done && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              inputRef={guessInputRef}
              value={guessState.guess}
              onChange={(e) => setGuessState((prev) => ({ ...prev, guess: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleGuessSubmit()}
              placeholder="输入数字1-100"
              type="number"
              size="small"
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      第{guessState.guessCount + 1}次
                    </Typography>
                  </InputAdornment>
                ),
              }}
            />
            <Button variant="contained" onClick={handleGuessSubmit} sx={{ minWidth: 72 }}>
              猜！
            </Button>
          </Box>
        )}
        {guessState.done && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button variant="outlined" startIcon={<RefreshIcon sx={{ fontSize: 16 }} />} onClick={startGuess} sx={{ flex: 1 }}>
              再来一局
            </Button>
            <Button variant="outlined" startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />} onClick={() => setScreen('select')} sx={{ flex: 1 }}>
              返回
            </Button>
          </Box>
        )}
        {guessState.done && (
          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Chip
              label={`+${calcGameReward('guess-number', 0, 0)} 亲密度`}
              color="success"
              sx={{ fontWeight: 700 }}
            />
          </Box>
        )}
      </Box>
    );
  };

  const renderTriviaScreen = () => {
    const questions = session?.data.questions as Array<{
      q: string; options: string[]; correct: number; exp: string;
    }> || [];
    const idx = session?.data.currentIndex as number || 0;
    const showingAnswer = triviaState.showingAnswer;
    const done = triviaState.done;

    if (done || idx >= questions.length) {
      return renderTriviaResult();
    }

    const q = questions[idx];
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Chip label={`第 ${idx + 1} / ${questions.length} 题`} size="small" color="primary" variant="outlined" />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            当前得分: {session?.score || 0}
          </Typography>
        </Box>
        <Typography variant="body1" sx={{ fontWeight: 600 }}>
          {q.q}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {q.options.map((opt, oi) => {
            let bg = 'rgba(255,255,255,0.04)';
            let border = '1px solid rgba(255,255,255,0.1)';
            if (showingAnswer) {
              if (oi === q.correct) { bg = 'rgba(76,175,80,0.2)'; border = '2px solid #4caf50'; }
              else if (oi === triviaState.selectedIndex) { bg = 'rgba(244,67,54,0.2)'; border = '2px solid #f44336'; }
            }
            return (
              <Paper
                key={oi}
                component="button"
                onClick={() => !showingAnswer && handleTriviaAnswer(oi)}
                sx={{
                  textAlign: 'left',
                  p: 1.5,
                  bgcolor: bg,
                  border: border,
                  borderRadius: 1,
                  cursor: showingAnswer ? 'default' : 'pointer',
                  transition: 'all 0.15s',
                  '&:hover': showingAnswer ? {} : { bgcolor: 'rgba(255,255,255,0.08)' },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {opt}
                </Typography>
              </Paper>
            );
          })}
        </Box>
        {showingAnswer && (
          <Box>
            <Typography
              variant="body2"
              sx={{
                color: triviaState.lastCorrect ? 'success.main' : 'error.main',
                fontWeight: 600,
                mb: 0.5,
              }}
            >
              {triviaState.lastCorrect ? '✅ 正确！' : `❌ 错误！正确答案是: ${q.options[q.correct]}`}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              💡 {triviaState.lastExplanation}
            </Typography>
            <Button
              variant="contained"
              size="small"
              fullWidth
              sx={{ mt: 1.5 }}
              onClick={handleTriviaNext}
            >
              {idx + 1 >= questions.length ? '查看结果' : '下一题'}
            </Button>
          </Box>
        )}
      </Box>
    );
  };

  const renderTriviaResult = () => {
    const score = session?.score || 0;
    const total = questions?.length || 5;
    const reward = calcGameReward('trivia', score, total);
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1, alignItems: 'center' }}>
        <TrophyIcon sx={{ fontSize: 48, color: 'warning.main' }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          问答挑战结束！
        </Typography>
        <Typography variant="body1">
          {personaName}的得分: <strong>{score} / {total}</strong>
        </Typography>
        <Chip label={`+${reward} 亲密度`} color="success" sx={{ fontWeight: 700 }} />
        <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
          {getPersonalityBonus(personaId)}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
          <Button variant="outlined" startIcon={<RefreshIcon sx={{ fontSize: 16 }} />} onClick={startTrivia} sx={{ flex: 1 }}>
            再来一局
          </Button>
          <Button variant="outlined" startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />} onClick={() => setScreen('select')} sx={{ flex: 1 }}>
            返回
          </Button>
        </Box>
      </Box>
    );
  };

  // Need to fix: questions not in scope for trivia result
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const questions = session?.data.questions as Array<{ q: string; options: string[]; correct: number; exp: string }> || [];

  const renderIdiomScreen = () => {
    const lastIdiom = session?.data.currentIdiom as { text: string; lastChar: string } | undefined;
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Chip label={`第 ${idiomState.round + 1} / 5 轮`} size="small" color="primary" variant="outlined" />
        </Box>
        {/* History */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {idiomState.history.map((idiom, i) => (
            <Chip
              key={i}
              label={idiom}
              size="small"
              variant={i % 2 === 0 ? 'filled' : 'outlined'}
              color={i % 2 === 0 ? 'primary' : 'secondary'}
              sx={{ fontSize: 11 }}
            />
          ))}
        </Box>
        {/* Current prompt */}
        <Typography
          variant="body1"
          sx={{ fontWeight: 600, color: idiomState.done ? (idiomState.failed ? 'error.main' : 'success.main') : 'text.primary' }}
        >
          {idiomState.hint}
        </Typography>
        {!idiomState.done && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              inputRef={idiomInputRef}
              value={idiomState.input}
              onChange={(e) => setIdiomState((prev) => ({ ...prev, input: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleIdiomSubmit()}
              placeholder="输入成语接龙"
              size="small"
              fullWidth
              inputProps={{ maxLength: 10 }}
            />
            <Button variant="contained" onClick={handleIdiomSubmit} sx={{ minWidth: 72 }}>
              接龙！
            </Button>
          </Box>
        )}
        {idiomState.done && (
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button variant="outlined" startIcon={<RefreshIcon sx={{ fontSize: 16 }} />} onClick={startIdiom} sx={{ flex: 1 }}>
              再来一局
            </Button>
            <Button variant="outlined" startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />} onClick={() => setScreen('select')} sx={{ flex: 1 }}>
              返回
            </Button>
          </Box>
        )}
        {idiomState.done && !idiomState.failed && (
          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Chip
              label={`+${calcGameReward('idiom', 0, idiomState.round)} 亲密度`}
              color="success"
              sx={{ fontWeight: 700 }}
            />
          </Box>
        )}
      </Box>
    );
  };

  const renderResultScreen = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1, alignItems: 'center' }}>
      <TrophyIcon sx={{ fontSize: 48, color: 'warning.main' }} />
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        游戏结束！
      </Typography>
      {resultState.gameType === 'guess-number' && (
        <>
          <Typography variant="body1">
            一共猜了 <strong>{resultState.rounds}</strong> 次
          </Typography>
          <Chip label={`+${resultState.intimacyDelta} 亲密度`} color="success" sx={{ fontWeight: 700 }} />
        </>
      )}
      {resultState.gameType === 'trivia' && (
        <>
          <Typography variant="body1">
            答对 <strong>{resultState.score}</strong> / {resultState.rounds} 题
          </Typography>
          <Chip label={`+${resultState.intimacyDelta} 亲密度`} color="success" sx={{ fontWeight: 700 }} />
        </>
      )}
      {resultState.gameType === 'idiom' && (
        <>
          <Typography variant="body1">
            完成 <strong>{resultState.rounds}</strong> 轮接龙
          </Typography>
          {resultState.intimacyDelta > 0 && (
            <Chip label={`+${resultState.intimacyDelta} 亲密度`} color="success" sx={{ fontWeight: 700 }} />
          )}
          {resultState.intimacyDelta === 0 && (
            <Chip label="接龙失败" color="error" sx={{ fontWeight: 700 }} />
          )}
        </>
      )}
      <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
        {resultState.message}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
          onClick={() => {
            if (resultState.gameType === 'guess-number') startGuess();
            else if (resultState.gameType === 'trivia') startTrivia();
            else startIdiom();
          }}
          sx={{ flex: 1 }}
        >
          再来一局
        </Button>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
          onClick={() => setScreen('select')}
          sx={{ flex: 1 }}
        >
          返回
        </Button>
      </Box>
    </Box>
  );

  // ---------------------------------------------------------------------------
  // Title + content
  // ---------------------------------------------------------------------------
  const getTitle = () => {
    switch (screen) {
      case 'select': return '🎮 互动游戏';
      case 'guess': return '🎯 猜数字';
      case 'trivia': return '❓ 问答挑战';
      case 'idiom': return '🔤 成语接龙';
      case 'result': return '🏆 游戏结果';
      default: return '🎮 互动游戏';
    }
  };

  const showBackButton = !['select', 'result'].includes(screen);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { bgcolor: 'background.paper' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        {showBackButton && (
          <IconButton size="small" onClick={() => setScreen('select')}>
            <ArrowBackIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
        <Typography variant="h6" sx={{ flex: 1, fontSize: 16 }}>
          {getTitle()}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {screen === 'select' && renderSelectScreen()}
        {screen === 'guess' && renderGuessScreen()}
        {screen === 'trivia' && renderTriviaScreen()}
        {screen === 'idiom' && renderIdiomScreen()}
        {screen === 'result' && renderResultScreen()}
      </DialogContent>
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// Game Card (select screen)
// ---------------------------------------------------------------------------
interface GameCardProps {
  emoji: string;
  title: string;
  desc: string;
  onClick: () => void;
}

const GameCard: React.FC<GameCardProps> = ({ emoji, title, desc, onClick }) => (
  <Paper
    component="button"
    onClick={onClick}
    sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      p: 2,
      textAlign: 'left',
      bgcolor: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 2,
      cursor: 'pointer',
      transition: 'all 0.15s',
      '&:hover': {
        bgcolor: 'rgba(255,255,255,0.08)',
        borderColor: 'primary.main',
        transform: 'translateY(-1px)',
      },
    }}
  >
    <Typography sx={{ fontSize: 36 }}>{emoji}</Typography>
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
        {title}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.4 }}>
        {desc}
      </Typography>
    </Box>
  </Paper>
);
