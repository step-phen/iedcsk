"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import {
  INSTRUCTION,
  PROMPT,
  SHAPE_COLOR,
  TRY_AGAIN,
  correctSpeech,
  isShapeName,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type ShapeName,
} from "./ContinueThePattern.data";
import styles from "./ContinueThePattern.module.css";

const TILE_SIZE = 64;

/** A shape drawn with pure CSS, color-coded by shape (see SHAPE_COLOR) — no art assets to ship. */
function ShapeGlyph({ shape, size }: { shape: ShapeName; size: number }) {
  const hex = SHAPE_COLOR[shape];
  const common = { background: hex } as const;
  if (shape === "circle") return <div style={{ ...common, width: size, height: size, borderRadius: "9999px" }} />;
  if (shape === "square") return <div style={{ ...common, width: size, height: size, borderRadius: size * 0.14 }} />;
  if (shape === "rectangle") return <div style={{ ...common, width: size * 1.3, height: size * 0.68, borderRadius: size * 0.12 }} />;
  return (
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: `${size / 2}px solid transparent`,
        borderRight: `${size / 2}px solid transparent`,
        borderBottom: `${size * 0.87}px solid ${hex}`,
      }}
    />
  );
}

interface Round {
  key: string;
  pattern: ShapeName[];
  choices: ShapeName[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

const shuffle = <T,>(list: readonly T[]): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

function buildRound(row: QuestionRow): Round {
  const { pattern, choices } = row.questionData as { pattern: unknown; choices: unknown };
  if (!Array.isArray(pattern) || pattern.length === 0 || !pattern.every(isShapeName)) {
    throw new Error(`Question ${row.questionKey} needs a "pattern" of known shapes`);
  }
  if (!Array.isArray(choices) || !choices.every(isShapeName) || !choices.includes(row.correctAnswer.answer as ShapeName)) {
    throw new Error(`Question ${row.questionKey} needs "choices" that include the correct answer`);
  }
  return { key: row.questionKey, pattern: pattern as ShapeName[], choices: choices as ShapeName[] };
}

export default function ContinueThePattern({ activityId, activityName, onFinish }: GameComponentProps) {
  const { speak, speakAll, stop } = useSpeech();

  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!activityId) {
      setLoadError(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/activities/${activityId}/questions`);
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        const rows: QuestionRow[] = await res.json();
        if (cancelled) return;
        if (rows.length === 0) throw new Error("No questions configured");
        setRounds(rows.map(buildRound));
      } catch (err) {
        console.error("Failed to load Continue the Pattern questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const total = rounds?.length ?? 0;
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [locked, setLocked] = useState(false);
  const [wrongShape, setWrongShape] = useState<ShapeName | null>(null);
  const [solvedShape, setSolvedShape] = useState<ShapeName | null>(null);
  const [revealed, setRevealed] = useState(false);
  const attemptsRef = useRef(0);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Continue the Pattern";
  // The seeder always lists the correct choice first — resolved from round.choices, not the shuffled display order.
  const answer = round?.choices[0] ?? null;

  const orderedChoices = useMemo(() => (round ? shuffle(round.choices) : []), [round]);

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["continue the pattern"], PROMPT]);
      return;
    }
    speak(PROMPT);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setWrongShape(null);
    setSolvedShape(null);
    setRevealed(false);
    attemptsRef.current = 0;
    if (roundIndex + 1 >= total) {
      setPhase("complete");
    } else {
      setRoundIndex((i) => i + 1);
    }
    setLocked(false);
  }, [roundIndex, total]);

  const tapChoice = useCallback(
    (shape: ShapeName) => {
      if (!round || !answer || locked || solvedShape) return;
      attemptsRef.current += 1;
      const firstTry = attemptsRef.current === 1;
      if (firstTry) answersRef.current = [...answersRef.current, { questionId: round.key, response: shape }];

      if (shape === answer) {
        if (firstTry) setScore((s) => s + 1);
        setLocked(true);
        setSolvedShape(shape);
        speak(correctSpeech(shape), advance);
        return;
      }

      setLocked(true);
      setWrongShape(shape);
      window.setTimeout(() => setWrongShape((s) => (s === shape ? null : s)), 450);

      if (attemptsRef.current < 2) {
        speak(TRY_AGAIN, () => setLocked(false));
        return;
      }

      setRevealed(true);
      speak(revealSpeech(answer), () => {
        setSolvedShape(answer);
        advance();
      });
    },
    [round, answer, locked, solvedShape, speak, advance],
  );

  const finishedRef = useRef(false);
  const finishOnce = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.(answersRef.current);
  }, [onFinish]);

  const resultLine = resultSpeech(score, total);
  useEffect(() => {
    if (phase === "complete") speak(resultLine, finishOnce);
  }, [phase, resultLine, speak, finishOnce]);

  if (loadError) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 text-center font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!rounds || !round) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Getting the pattern ready…</p>
      </div>
    );
  }

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      {learnerName && (
        <div className={`${styles.badge} fixed left-3 top-3 z-10 flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-xl font-extrabold short:py-1 short:text-base`}>
          <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={`${styles.avatar} size-11 text-xl short:size-8 short:text-base`} />
          <span className="max-w-48 truncate capitalize leading-none">{learnerName}</span>
        </div>
      )}
      {phase !== "complete" && (
        <div className={`${styles.badge} fixed right-3 top-3 z-10 flex items-center gap-1 rounded-full px-3 py-1.5`} aria-label={`Score: ${score} of ${total}`}>
          {rounds.map((r, i) => (
            <span key={r.key} aria-hidden className={cn("inline-block text-[clamp(16px,3vh,24px)] leading-none transition-transform", i === roundIndex && "scale-125")}>
              {i < roundIndex || (i === roundIndex && !!solvedShape) ? "🔗" : "◌"}
            </span>
          ))}
        </div>
      )}

      <h1 className="relative z-[1] m-0 shrink-0 text-center text-[clamp(26px,5.5vh,46px)] font-extrabold leading-tight drop-shadow-[0_2px_0_white]">{title}</h1>

      {phase === "complete" ? (
        <div className={`${styles.result} relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center`}>
          <div className="flex items-center gap-3">
            <div className={`${styles.resultStamp} rounded-md px-[clamp(14px,3vw,30px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You continued {score} of {total} patterns!
          </p>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speak(PROMPT)}
              disabled={!!solvedShape}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(18px,4vh,40px)]">
            <div className="flex flex-wrap items-center justify-center gap-[clamp(8px,1.8vw,18px)]">
              {round.pattern.map((shape, i) => (
                <div key={i} className={`${styles.patternTile} flex h-[clamp(68px,13vh,96px)] w-[clamp(68px,13vh,96px)] shrink-0 items-center justify-center rounded-2xl`}>
                  <ShapeGlyph shape={shape} size={TILE_SIZE * 0.72} />
                </div>
              ))}
              <div className={`${styles.patternSlot} flex h-[clamp(68px,13vh,96px)] w-[clamp(68px,13vh,96px)] shrink-0 items-center justify-center rounded-2xl text-[clamp(26px,5vh,40px)] font-extrabold`}>
                {solvedShape ? <ShapeGlyph shape={solvedShape} size={TILE_SIZE * 0.72} /> : "?"}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-[clamp(10px,2.4vw,24px)]">
              {orderedChoices.map((shape) => {
                const isWrong = wrongShape === shape;
                const isCorrect = solvedShape === shape;
                const isReveal = revealed && shape === answer && !isCorrect;
                return (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => tapChoice(shape)}
                    disabled={(locked && !isWrong) || !!solvedShape}
                    aria-label={shape}
                    className={cn(
                      styles.choiceCard,
                      "flex h-[clamp(80px,16vh,120px)] w-[clamp(80px,16vh,120px)] shrink-0 items-center justify-center rounded-3xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] disabled:cursor-default",
                      isWrong && styles.choiceWrong,
                      isReveal && styles.choiceReveal,
                      isCorrect && styles.choiceCorrect,
                    )}
                  >
                    <ShapeGlyph shape={shape} size={TILE_SIZE * 0.78} />
                  </button>
                );
              })}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
