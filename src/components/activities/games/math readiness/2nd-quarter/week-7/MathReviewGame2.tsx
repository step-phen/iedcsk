"use client";

import { useState, useCallback, useRef, useEffect, useMemo, type ReactNode } from "react";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import {
  COLOR_HEX,
  OBJECTS,
  SIZE_PX,
  WRONG,
  instruction,
  isColorName,
  isObjectId,
  isShapeName,
  promptSpeech,
  revealSpeech,
  rightSpeech,
  type Choice,
  type ShapeName,
  type SizeName,
  type Task,
} from "./mathReview2.data";

const TILE_SIZE = 76;

/** A shape drawn with pure CSS — shared by every task kind that shows a shape. */
function ShapeGlyph({ shape, color, size }: { shape: ShapeName; color: string; size: number }) {
  const hex = COLOR_HEX[color];
  const common = { background: hex, boxShadow: "0 3px 0 rgba(34,49,79,0.3)" } as const;
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
        filter: "drop-shadow(0 3px 0 rgba(34,49,79,0.3))",
      }}
    />
  );
}

interface Round {
  id: string;
  task: Task;
  answer: string;
}

interface ReviewChoice {
  id: string;
  aria: string;
  render: () => ReactNode;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Stage = "playing" | "done";

function isSizeName(v: unknown): v is SizeName {
  return typeof v === "string" && v in SIZE_PX;
}

function parseRawChoice(v: unknown): Choice {
  const c = v as { shape?: unknown; color?: unknown; size?: unknown };
  if (!isShapeName(c.shape) || !(typeof c.color === "string" && c.color in COLOR_HEX) || !isSizeName(c.size)) {
    throw new Error("A shape choice needs a known shape, color and size");
  }
  return { id: c.shape, shape: c.shape, color: c.color, size: c.size };
}

function toRound(row: QuestionRow): Round {
  const d = row.questionData as Record<string, unknown>;
  const answer = row.correctAnswer.answer;
  let task: Task;

  if (d.kind === "shape") {
    if (!isShapeName(d.shape)) throw new Error(`Question ${row.questionKey} needs a known "shape"`);
    const ref = d.reference as { color?: unknown; size?: unknown };
    if (!(typeof ref?.color === "string" && ref.color in COLOR_HEX) || !isSizeName(ref?.size)) {
      throw new Error(`Question ${row.questionKey} needs a known reference color and size`);
    }
    if (!Array.isArray(d.choices)) throw new Error(`Question ${row.questionKey} needs "choices"`);
    task = { kind: "shape", shape: d.shape, reference: { color: ref.color, size: ref.size }, choices: d.choices.map(parseRawChoice) };
  } else if (d.kind === "pattern") {
    if (!Array.isArray(d.pattern) || !d.pattern.every(isShapeName)) throw new Error(`Question ${row.questionKey} needs a "pattern" of known shapes`);
    if (!Array.isArray(d.choices) || !d.choices.every(isShapeName) || !d.choices.includes(answer as ShapeName)) {
      throw new Error(`Question ${row.questionKey} needs "choices" that include the answer`);
    }
    task = { kind: "pattern", pattern: d.pattern as ShapeName[], choices: d.choices as ShapeName[] };
  } else if (d.kind === "patternGap") {
    if (!Array.isArray(d.pattern) || !d.pattern.every((p) => p === null || isShapeName(p))) {
      throw new Error(`Question ${row.questionKey} needs a "pattern" of known shapes with one gap`);
    }
    if (!Array.isArray(d.choices) || !d.choices.every(isShapeName) || !d.choices.includes(answer as ShapeName)) {
      throw new Error(`Question ${row.questionKey} needs "choices" that include the answer`);
    }
    task = { kind: "patternGap", pattern: d.pattern as (ShapeName | null)[], choices: d.choices as ShapeName[] };
  } else if (d.kind === "color") {
    if (!isObjectId(d.object)) throw new Error(`Question ${row.questionKey} needs a known "object"`);
    if (!Array.isArray(d.bins) || !d.bins.every(isColorName) || !d.bins.includes(answer)) {
      throw new Error(`Question ${row.questionKey} needs "bins" that include the answer`);
    }
    task = { kind: "color", object: d.object, bins: d.bins as string[] };
  } else if (d.kind === "namedShape") {
    if (!isShapeName(d.shape)) throw new Error(`Question ${row.questionKey} needs a known "shape"`);
    if (!Array.isArray(d.choices) || !d.choices.every(isShapeName) || !d.choices.includes(d.shape)) {
      throw new Error(`Question ${row.questionKey} needs "choices" that include its shape`);
    }
    task = { kind: "namedShape", shape: d.shape, choices: d.choices as ShapeName[] };
  } else {
    throw new Error(`Question ${row.questionKey} has an unknown task kind`);
  }

  return { id: row.questionKey, task, answer };
}

function choicesOf(task: Task): ReviewChoice[] {
  switch (task.kind) {
    case "shape":
      return task.choices.map((c) => ({ id: c.id, aria: `${c.color} ${c.size} ${c.shape}`, render: () => <ShapeGlyph shape={c.shape} color={c.color} size={SIZE_PX[c.size]} /> }));
    case "pattern":
    case "patternGap":
      return task.choices.map((shape) => ({ id: shape, aria: shape, render: () => <ShapeGlyph shape={shape} color="blue" size={TILE_SIZE * 0.6} /> }));
    case "namedShape":
      return task.choices.map((shape) => ({ id: shape, aria: shape, render: () => <ShapeGlyph shape={shape} color="blue" size={TILE_SIZE * 0.6} /> }));
    case "color":
      return task.bins.map((color) => ({
        id: color,
        aria: `${color} basket`,
        render: () => (
          <div className="flex flex-col items-center gap-1">
            <div style={{ width: TILE_SIZE * 0.72, height: TILE_SIZE * 0.16, background: COLOR_HEX[color], borderRadius: 9999 }} />
            <div style={{ width: TILE_SIZE * 0.84, height: TILE_SIZE * 0.6, background: "#f3e3c8", border: "3px solid #22314f", borderRadius: "0 0 16px 16px" }} />
          </div>
        ),
      }));
  }
}

const shuffle = <T,>(list: readonly T[]): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export interface MathReviewGame2Props extends GameComponentProps {
  styles: Record<string, string>;
  fallbackTitle: string;
  intro: string;
  doneText: string;
  /** The game's own progress picture: one result per answered task, true when right first time. */
  progress: (results: boolean[], total: number) => ReactNode;
}

/** Mixes every skill taught this quarter (shape matching, pattern fill, pattern gap, color sort, named shape); the wrappers bring the look and the progress picture. */
export default function MathReviewGame2({ activityId, activityName, onFinish, styles, fallbackTitle, intro, doneText, progress }: MathReviewGame2Props) {
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
        setRounds(rows.map(toRound));
      } catch (err) {
        console.error(`Failed to load ${fallbackTitle} questions:`, err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId, fallbackTitle]);

  const total = rounds?.length ?? 0;
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [solvedId, setSolvedId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const attemptsRef = useRef(0);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = stage === "playing" ? rounds?.[roundIndex] : undefined;
  const title = activityName || fallbackTitle;
  const orderedChoices = useMemo(() => (round ? shuffle(choicesOf(round.task)) : []), [round]);
  const gapIndex = round?.task.kind === "patternGap" ? round.task.pattern.findIndex((p) => p === null) : -1;

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
    const prompt = promptSpeech(round.task);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), intro, prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(
    (earned: boolean) => {
      setResults((r) => [...r, earned]);
      setWrongId(null);
      setSolvedId(null);
      setRevealed(false);
      attemptsRef.current = 0;
      if (roundIndex + 1 >= total) {
        setStage("done");
      } else {
        setRoundIndex((i) => i + 1);
      }
      setLocked(false);
    },
    [roundIndex, total],
  );

  const tapChoice = useCallback(
    (id: string) => {
      if (!round || locked || solvedId) return;
      attemptsRef.current += 1;
      const firstTry = attemptsRef.current === 1;
      if (firstTry) answersRef.current = [...answersRef.current, { questionId: round.id, response: id }];

      if (id === round.answer) {
        if (firstTry) setScore((s) => s + 1);
        setLocked(true);
        setSolvedId(id);
        speak(rightSpeech(round.task, round.answer), () => advance(firstTry));
        return;
      }

      setLocked(true);
      setWrongId(id);
      window.setTimeout(() => setWrongId((w) => (w === id ? null : w)), 450);

      if (attemptsRef.current < 2) {
        speak(WRONG, () => setLocked(false));
        return;
      }

      setRevealed(true);
      speak(revealSpeech(round.task, round.answer), () => {
        setSolvedId(round.answer);
        advance(false);
      });
    },
    [round, locked, solvedId, speak, advance],
  );

  const finishedRef = useRef(false);
  const finishOnce = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.(answersRef.current);
  }, [onFinish]);

  const resultLine = `${doneText} You got ${score} out of ${total}.`;
  useEffect(() => {
    if (stage === "done") speak(resultLine, finishOnce);
  }, [stage, resultLine, speak, finishOnce]);

  if (loadError) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 text-center font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!rounds) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Getting the review ready…</p>
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

      <h1 className="relative z-[1] m-0 shrink-0 text-center text-[clamp(24px,5vh,42px)] font-extrabold leading-tight drop-shadow-[0_2px_0_white]">{title}</h1>

      {stage === "done" ? (
        <div className={`${styles.result} relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center`}>
          <div className="flex items-center gap-3">
            <div className={`${styles.resultStamp} rounded-md px-[clamp(14px,3vw,30px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>{doneText}</div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You got {score} of {total} correct!
          </p>
          <div aria-hidden className="mt-2">
            {progress(results, total)}
          </div>
        </div>
      ) : round ? (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{instruction(round.task)}</p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.task))}
              disabled={!!solvedId}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <div aria-hidden className={`${styles.progress} relative z-[1] mt-1 flex shrink-0 items-center justify-center`}>
            {progress(results, total)}
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(14px,3vh,28px)]">
            {round.task.kind === "shape" && (
              <div className={`${styles.referenceCard} flex items-center justify-center rounded-3xl p-[clamp(10px,2vh,20px)]`}>
                <ShapeGlyph shape={round.task.shape} color={round.task.reference.color} size={SIZE_PX[round.task.reference.size]} />
              </div>
            )}

            {(round.task.kind === "pattern" || round.task.kind === "patternGap") && (
              <div className="flex flex-wrap items-center justify-center gap-[clamp(8px,1.8vw,18px)]">
                {round.task.pattern.map((shape, i) =>
                  shape === null ? (
                    <div key={i} className={`${styles.patternSlot} flex h-[clamp(56px,11vh,80px)] w-[clamp(56px,11vh,80px)] shrink-0 items-center justify-center rounded-2xl text-[clamp(20px,4vh,30px)] font-extrabold`}>
                      {i === gapIndex && solvedId ? <ShapeGlyph shape={solvedId as ShapeName} color="blue" size={TILE_SIZE * 0.6} /> : "?"}
                    </div>
                  ) : (
                    <div key={i} className={`${styles.patternTile} flex h-[clamp(56px,11vh,80px)] w-[clamp(56px,11vh,80px)] shrink-0 items-center justify-center rounded-2xl`}>
                      <ShapeGlyph shape={shape} color="blue" size={TILE_SIZE * 0.6} />
                    </div>
                  ),
                )}
                {round.task.kind === "pattern" && (
                  <div className={`${styles.patternSlot} flex h-[clamp(56px,11vh,80px)] w-[clamp(56px,11vh,80px)] shrink-0 items-center justify-center rounded-2xl text-[clamp(20px,4vh,30px)] font-extrabold`}>
                    {solvedId ? <ShapeGlyph shape={solvedId as ShapeName} color="blue" size={TILE_SIZE * 0.6} /> : "?"}
                  </div>
                )}
              </div>
            )}

            {round.task.kind === "color" && (
              <div className={`${styles.referenceCard} flex items-center justify-center rounded-3xl p-[clamp(10px,2vh,20px)] text-[clamp(40px,8vh,64px)] leading-none`}>
                {OBJECTS[round.task.object].emoji}
              </div>
            )}

            {round.task.kind === "namedShape" && (
              <div className={`${styles.referenceCard} flex h-[clamp(70px,14vh,100px)] w-[clamp(70px,14vh,100px)] items-center justify-center rounded-full`}>
                <Volume2 aria-hidden size={TILE_SIZE * 0.5} strokeWidth={2.2} />
              </div>
            )}

            <div className="flex flex-wrap items-end justify-center gap-[clamp(10px,2.4vw,24px)]">
              {orderedChoices.map((c) => {
                const isWrong = wrongId === c.id;
                const isCorrect = solvedId === c.id;
                const isReveal = revealed && c.id === round.answer && !isCorrect;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => tapChoice(c.id)}
                    disabled={(locked && !isWrong) || !!solvedId}
                    aria-label={c.aria}
                    className={cn(
                      styles.choiceCard,
                      "flex h-[clamp(72px,14vh,112px)] w-[clamp(72px,14vh,112px)] shrink-0 items-center justify-center rounded-3xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] disabled:cursor-default",
                      isWrong && styles.choiceWrong,
                      isReveal && styles.choiceReveal,
                      isCorrect && styles.choiceCorrect,
                    )}
                  >
                    {c.render()}
                  </button>
                );
              })}
            </div>
          </main>
        </>
      ) : null}
    </div>
  );
}
