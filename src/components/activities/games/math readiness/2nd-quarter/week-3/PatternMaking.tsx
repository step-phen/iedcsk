"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import {
  ASSETS,
  INSTRUCTION,
  PATTERN_DONE,
  PATTERN_DONE_MISSED,
  PROMPT,
  SHAPE_COLOR,
  correctSpeech,
  expectedAt,
  isShapeName,
  referenceOf,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type ShapeName,
} from "./PatternMaking.data";
import styles from "./PatternMaking.module.css";

// Glyph sizes track the viewport like the tiles around them, so 9 tiles fit one row without overflowing small screens.
const TILE_GLYPH = "clamp(38px, 8vh, 68px)";
const CHOICE_GLYPH = "clamp(60px, 13vh, 100px)";
const TILE_BOX = "h-[clamp(60px,12vh,104px)] w-[clamp(60px,12vh,104px)]";

/** A shape drawn with pure CSS, color-coded by shape — no art assets to ship. */
function ShapeGlyph({ shape, size }: { shape: ShapeName; size: string }) {
  const hex = SHAPE_COLOR[shape];
  const common = { background: hex } as const;
  if (shape === "circle") return <div style={{ ...common, width: size, height: size, borderRadius: "9999px" }} />;
  if (shape === "square") return <div style={{ ...common, width: size, height: size, borderRadius: `calc(${size} * 0.14)` }} />;
  if (shape === "rectangle") return <div style={{ ...common, width: `calc(${size} * 1.3)`, height: `calc(${size} * 0.68)`, borderRadius: `calc(${size} * 0.12)` }} />;
  return (
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: `calc(${size} / 2) solid transparent`,
        borderRight: `calc(${size} / 2) solid transparent`,
        borderBottom: `calc(${size} * 0.87) solid ${hex}`,
      }}
    />
  );
}

/** One pattern; every question row is one blank to fill, in order. */
interface Pattern {
  reference: ShapeName[];
  choices: ShapeName[];
  blanks: { key: string; shape: ShapeName }[];
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

function buildPattern(rows: QuestionRow[]): Pattern {
  const { shapes } = rows[0].questionData as { shapes: unknown };
  if (!Array.isArray(shapes) || shapes.length !== 2 || !shapes.every(isShapeName)) {
    throw new Error(`Question ${rows[0].questionKey} needs a "shapes" pair of known shapes`);
  }
  const pair = shapes as [ShapeName, ShapeName];
  const blanks = rows.map((row, i) => {
    if (row.correctAnswer.answer !== expectedAt(pair, i)) {
      throw new Error(`Question ${row.questionKey}'s answer must continue the ${pair.join("/")} pattern`);
    }
    return { key: row.questionKey, shape: expectedAt(pair, i) };
  });
  return { reference: referenceOf(pair), choices: pair, blanks };
}

export default function PatternMaking({ activityId, activityName, onFinish }: GameComponentProps) {
  const { speak, speakAll, stop } = useSpeech();

  const [pattern, setPattern] = useState<Pattern | null>(null);
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
        setPattern(buildPattern(rows));
      } catch (err) {
        console.error("Failed to load Pattern Making questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const total = pattern?.blanks.length ?? 0;
  const [phase, setPhase] = useState<Phase>("playing");
  const [locked, setLocked] = useState(false);
  const [slotIndex, setSlotIndex] = useState(0);
  const [placedShape, setPlacedShape] = useState<ShapeName | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [wrongShape, setWrongShape] = useState<ShapeName | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const score = results.filter(Boolean).length;
  const title = activityName || "Pattern Making";
  const allDone = total > 0 && slotIndex >= total;
  const perfect = allDone && score === total;

  const orderedChoices = useMemo(() => (pattern ? shuffle(pattern.choices) : []), [pattern]);

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (!pattern) return;
    speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["pattern making"], PROMPT]);
  }, [pattern, speakAll]);

  // Moves past the current blank; after the last one the board stays locked while the finished pattern is praised.
  const finishSlot = useCallback(
    (earned: boolean) => {
      const next = [...results, earned];
      setResults(next);
      setPlacedShape(null);
      setRevealed(false);
      setWrongShape(null);
      setSlotIndex(slotIndex + 1);
      if (slotIndex + 1 >= total) {
        speak(next.every(Boolean) ? PATTERN_DONE : PATTERN_DONE_MISSED, () => setPhase("complete"));
        return;
      }
      setLocked(false);
    },
    [results, slotIndex, total, speak],
  );

  const tapChoice = useCallback(
    (shape: ShapeName) => {
      if (!pattern || locked || slotIndex >= total) return;
      const blank = pattern.blanks[slotIndex];
      setLocked(true);
      answersRef.current = [...answersRef.current, { questionId: blank.key, response: shape }];

      if (shape === blank.shape) {
        setPlacedShape(shape);
        speak(correctSpeech(shape), () => finishSlot(true));
        return;
      }

      // One wrong tap costs this blank its point: mark the wrong pick, then show the right one — no retry.
      setWrongShape(shape);
      setRevealed(true);
      setPlacedShape(blank.shape);
      speak(revealSpeech(blank.shape), () => finishSlot(false));
    },
    [pattern, locked, slotIndex, total, speak, finishSlot],
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

  if (!pattern) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Getting the blocks ready…</p>
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
          {pattern.blanks.map((b, i) => (
            <Image
              key={b.key}
              src={results[i] ? ASSETS.starFilled : ASSETS.starEmpty}
              alt=""
              width={128}
              height={128}
              loading="eager"
              className={cn("size-[clamp(20px,3.6vh,30px)] object-contain transition-transform", i === slotIndex && "scale-125")}
            />
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
            You got {score} of {total} shapes right!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(34,49,79,0.25)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.6vh,24px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button type="button" onClick={() => speak(PROMPT)} disabled={locked} aria-label="Hear the instruction again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(18px,4vh,40px)]">
            <div className="flex flex-wrap items-center justify-center gap-[clamp(6px,1.2vw,14px)]">
              {pattern.reference.map((shape, i) => (
                <div key={`ref-${i}`} className={`${styles.patternTile} ${TILE_BOX} flex shrink-0 items-center justify-center rounded-2xl`}>
                  <ShapeGlyph shape={shape} size={TILE_GLYPH} />
                </div>
              ))}
              {pattern.blanks.map((blank, i) => {
                const isActive = i === slotIndex;
                const isDone = i < slotIndex;
                const shapeHere = isDone ? blank.shape : isActive ? placedShape : null;
                return (
                  <div
                    key={blank.key}
                    className={cn(
                      TILE_BOX,
                      "flex shrink-0 items-center justify-center rounded-2xl text-[clamp(22px,4.4vh,34px)] font-extrabold",
                      isDone || (isActive && placedShape && !revealed) ? styles.patternSlotFilled : styles.patternSlot,
                      perfect && styles.patternSlotDone,
                      isActive && !placedShape && styles.patternSlotActive,
                      isActive && revealed && styles.patternSlotReveal,
                    )}
                  >
                    {shapeHere ? <ShapeGlyph shape={shapeHere} size={TILE_GLYPH} /> : "?"}
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-[clamp(10px,2.4vw,24px)]">
              {orderedChoices.map((shape) => {
                const isWrong = wrongShape === shape;
                const isCorrect = placedShape === shape && !revealed;
                const isReveal = revealed && placedShape === shape;
                return (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => tapChoice(shape)}
                    disabled={locked || allDone}
                    aria-label={shape}
                    className={cn(
                      styles.choiceCard,
                      "relative flex h-[clamp(96px,20vh,150px)] w-[clamp(96px,20vh,150px)] shrink-0 items-center justify-center rounded-3xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] disabled:cursor-default",
                      isWrong && styles.choiceWrong,
                      isCorrect && styles.choiceCorrect,
                      isReveal && styles.choiceReveal,
                    )}
                  >
                    <ShapeGlyph shape={shape} size={CHOICE_GLYPH} />
                    {isWrong && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-3 -top-3 flex size-10 items-center justify-center rounded-full text-2xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
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
