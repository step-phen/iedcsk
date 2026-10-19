"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { SubmittedAnswer } from "@/types/activity";
import { REVEAL_MIN_MS, type useSpeech } from "@/hooks/useSpeech";
import type { Point } from "../../1st-quarter/week-4/TracePad";

// The round flow shared by My Name and Writing Skills Review 4: a round is one or more letters (a whole name, or a single letter or number) traced one after another, and passes only when every one is right on the first try.

/** One thing to trace on the board. */
export interface Glyph {
  /** How it is said aloud, such as "small a" or "the number 5". */
  say: string;
  strokes: Point[][];
  viewW: number;
  viewH: number;
  lines: "capital" | "small" | "numeral";
}

export interface TraceRound {
  key: string;
  glyphs: Glyph[];
  /** Copy rounds skip the pencil's model and fade the guide; the model only shows after a miss. */
  copy: boolean;
  /** Assessment rounds skip the pencil's model but keep the full guide. */
  alone?: boolean;
  /** Spoken before each glyph, one line per glyph. */
  prompts: string[];
  praise: string;
  /** Spoken after the last glyph of a round that had a miss; empty to move straight on. */
  missed: string;
}

// intro: lines play; watch: the pencil models (or the copy prompt plays); trace: the child's turn; right: a good glyph; wrong → demo → reveal after a miss; end: the round's last line.
export type Mode = "intro" | "watch" | "trace" | "right" | "wrong" | "demo" | "reveal" | "end";

// How long the red miss shakes on its own before the pencil shows the right way, and how long a good glyph shows before the next.
const WRONG_MS = 700;
const RIGHT_MS = 650;

type Speech = ReturnType<typeof useSpeech>;

export function useTraceRounds({
  rounds,
  speech: { speak, speakAll },
  openingLines,
  watchAgain,
  revealSpeech,
  resultSpeech,
  onFinish,
}: {
  rounds: TraceRound[] | null;
  speech: Speech;
  /** Greeting and intro, spoken once before the first round. */
  openingLines: () => string[];
  watchAgain: string;
  revealSpeech: (glyph: Glyph) => string;
  resultSpeech: (score: number, total: number) => string;
  onFinish?: (answers: SubmittedAnswer[]) => void;
}) {
  const total = rounds?.length ?? 0;
  const [roundIndex, setRoundIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<Mode>("intro");
  const [complete, setComplete] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  // How each glyph of this round went: true right, false missed, undefined not yet traced.
  const [marks, setMarks] = useState<(boolean | undefined)[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);
  const missedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const round = rounds?.[roundIndex];
  const glyph = round?.glyphs[step];

  // The board opens once the model is drawn and the prompt is heard, whichever finishes last.
  const waitingRef = useRef(0);
  const settle = useCallback(() => {
    waitingRef.current -= 1;
    if (waitingRef.current === 0) setMode("trace");
  }, []);

  const openedRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    const watch = () => {
      waitingRef.current = round.copy || round.alone ? 1 : 2;
      speak(round.prompts[step], settle, { onStart: () => setMode("watch") });
    };
    if (!openedRef.current) {
      openedRef.current = true;
      speakAll(openingLines(), watch);
      return;
    }
    watch();
    // speak/speakAll are stable from useSpeech; re-running on round and step identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex, step]);

  const nextRound = useCallback(() => {
    if (roundIndex + 1 >= total) return setComplete(true);
    missedRef.current = false;
    setMarks([]);
    setMode("intro");
    setStep(0);
    setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  const nextStep = useCallback(() => {
    if (!round) return;
    if (step + 1 < round.glyphs.length) {
      setMode("intro");
      setStep(step + 1);
      return;
    }
    const pass = !missedRef.current;
    answersRef.current = [...answersRef.current, { questionId: round.key, response: pass ? "correct" : "missed" }];
    setResults((r) => [...r, pass]);
    setMode("end");
    const line = pass ? round.praise : round.missed;
    if (line) speak(line, nextRound, { interrupt: false });
    else nextRound();
  }, [round, step, speak, nextRound]);

  // One try per glyph: the first finished (or missed) trace is the one that counts.
  const onAttempt = (pass: boolean) => {
    if (!round || mode !== "trace") return;
    setMarks((m) => Object.assign([...m], { [step]: pass }));
    if (pass) {
      setMode("right");
      timerRef.current = window.setTimeout(nextStep, RIGHT_MS);
      return;
    }
    missedRef.current = true;
    setMode("wrong");
    timerRef.current = window.setTimeout(() => {
      setMode("demo");
      speak(watchAgain);
    }, WRONG_MS);
  };

  const onModelEnd = () => {
    if (!glyph) return;
    setMode("reveal");
    speak(revealSpeech(glyph), nextStep, { interrupt: false, minMs: REVEAL_MIN_MS });
  };

  const finishedRef = useRef(false);
  const finishOnce = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.(answersRef.current);
  }, [onFinish]);

  const score = results.filter(Boolean).length;
  const resultLine = resultSpeech(score, total);
  useEffect(() => {
    if (complete) speak(resultLine, finishOnce);
  }, [complete, resultLine, speak, finishOnce]);

  return {
    round,
    glyph,
    roundIndex,
    step,
    mode,
    complete,
    results,
    marks,
    score,
    total,
    resultLine,
    finishOnce,
    onAttempt,
    /** Pass to the pad's onDemoEnd: the opening model settles the board, a model after a miss leads to the reveal. */
    onDemoEnd: mode === "watch" ? settle : onModelEnd,
    /** Whether the pad should be animating the model right now. */
    demo: (mode === "watch" && !round?.copy && !round?.alone) || mode === "demo" || mode === "reveal",
  };
}
