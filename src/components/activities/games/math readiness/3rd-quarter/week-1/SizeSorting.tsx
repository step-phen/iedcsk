"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, REVEAL_MIN_MS } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import {
  ASSETS,
  CORRECT,
  DONE,
  DONE_MISSED,
  INSTRUCTION,
  OBJECTS,
  OBJECT_FONT,
  SIZES,
  STEP_HEIGHT,
  isObjectId,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type Size,
} from "./SizeSorting.data";
import styles from "./SizeSorting.module.css";

interface Round {
  key: string;
  objectId: keyof typeof OBJECTS;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

const ZERO = { x: 0, y: 0 };

function buildRound(row: QuestionRow): Round {
  const { object } = row.questionData as { object: unknown };
  if (!isObjectId(object)) throw new Error(`Question ${row.questionKey} needs a known "object"`);
  if (row.correctAnswer.answer !== SIZES.join(",")) throw new Error(`Question ${row.questionKey}'s answer must be "${SIZES.join(",")}"`);
  return { key: row.questionKey, objectId: object };
}

const shuffle = <T,>(list: readonly T[]): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export default function SizeSorting({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Size Sorting questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const total = rounds?.length ?? 0;
  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [locked, setLocked] = useState(false);
  const [placed, setPlaced] = useState<Size[]>([]);
  const [offsets, setOffsets] = useState<Partial<Record<Size, { x: number; y: number }>>>({});
  const [settled, setSettled] = useState<Size | null>(null);
  const [activeStep, setActiveStep] = useState<Size | null>(null);
  const [wrongStep, setWrongStep] = useState<Size | null>(null);
  const [revealStep, setRevealStep] = useState<Size | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);
  // The step each object was first dropped on, which is what gets graded.
  const firstDropRef = useRef<Partial<Record<Size, Size>>>({});
  const stepRefs = useRef<Partial<Record<Size, HTMLDivElement | null>>>({});
  const dragRef = useRef<{ size: Size; x: number; y: number } | null>(null);

  const round = rounds?.[roundIndex];
  const title = activityName || "Size Sorting";
  const score = results.filter(Boolean).length;
  const roundDone = placed.length === SIZES.length;

  const trayOrder = useMemo(() => (round ? shuffle(SIZES) : []), [round]);

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
    const prompt = promptSpeech(round.objectId);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["size sorting"], prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPlaced([]);
    setOffsets({});
    setWrongStep(null);
    setRevealStep(null);
    firstDropRef.current = {};
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
    setLocked(false);
  }, [roundIndex, total]);

  // Locks the stairs once all three are up, grades the round from the first drops, then moves on by itself.
  const afterPlace = useCallback(
    (nextPlaced: Size[]) => {
      setWrongStep(null);
      setRevealStep(null);
      if (!round || nextPlaced.length < SIZES.length) {
        setLocked(false);
        return;
      }
      const response = SIZES.map((s) => firstDropRef.current[s]).join(",");
      const earned = response === SIZES.join(",");
      answersRef.current = [...answersRef.current, { questionId: round.key, response }];
      setResults((r) => [...r, earned]);
      speak(earned ? DONE : DONE_MISSED, advance);
    },
    [round, speak, advance],
  );

  const stepUnder = useCallback((x: number, y: number): Size | null => {
    for (const size of SIZES) {
      const r = stepRefs.current[size]?.getBoundingClientRect();
      if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return size;
    }
    return null;
  }, []);

  const handlePointerDown = useCallback(
    (size: Size) => (e: React.PointerEvent<HTMLDivElement>) => {
      if (locked || placed.includes(size)) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setSettled(null);
      dragRef.current = { size, x: e.clientX, y: e.clientY };
    },
    [locked, placed],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d) return;
      setOffsets((o) => ({ ...o, [d.size]: { x: e.clientX - d.x, y: e.clientY - d.y } }));
      setActiveStep(stepUnder(e.clientX, e.clientY));
    },
    [stepUnder],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d || !round) return;
      setActiveStep(null);
      setSettled(d.size);
      setOffsets((o) => ({ ...o, [d.size]: ZERO }));
      const target = stepUnder(e.clientX, e.clientY);
      // Dropped on empty space or an already-filled step: just slide back, no penalty.
      if (!target || placed.includes(target)) return;

      firstDropRef.current[d.size] ??= target;
      const nextPlaced = [...placed, d.size];
      setLocked(true);

      if (target === d.size) {
        setPlaced(nextPlaced);
        speak(CORRECT[d.size], () => afterPlace(nextPlaced));
        return;
      }

      // Wrong step: mark it, light up the right one, and put the object there for the child.
      setWrongStep(target);
      setRevealStep(d.size);
      speak(
        revealSpeech(d.size, round.objectId),
        () => {
          setPlaced(nextPlaced);
          afterPlace(nextPlaced);
        },
        { minMs: REVEAL_MIN_MS },
      );
    },
    [round, placed, stepUnder, speak, afterPlace],
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Building the stairs…</p>
      </div>
    );
  }

  const object = OBJECTS[round.objectId];
  const perfectDone = roundDone && results[roundIndex];

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
            <Image
              key={r.key}
              src={results[i] ? ASSETS.starFilled : ASSETS.starEmpty}
              alt=""
              width={128}
              height={128}
              loading="eager"
              className={cn("size-[clamp(20px,3.6vh,30px)] object-contain transition-transform", i === roundIndex && "scale-125")}
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
            You lined up {score} of {total} sets!
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
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.objectId))}
              disabled={locked}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-evenly">
            <div className="flex items-end">
              {SIZES.map((size) => (
                <div
                  key={size}
                  ref={(el) => {
                    stepRefs.current[size] = el;
                  }}
                  aria-label={`${size} step`}
                  className="relative flex w-[clamp(100px,22vw,180px)] flex-col items-center justify-end"
                >
                  <div className="flex h-[clamp(80px,16vh,130px)] items-end justify-center pb-1">
                    {placed.includes(size) && (
                      <span aria-hidden className={`${styles.placed} leading-none`} style={{ fontSize: OBJECT_FONT[size] }}>
                        {object.emoji}
                      </span>
                    )}
                  </div>
                  <div
                    className={cn(
                      styles.step,
                      "w-full rounded-t-xl",
                      activeStep === size && styles.stepActive,
                      wrongStep === size && styles.stepWrong,
                      revealStep === size && styles.stepReveal,
                      perfectDone && styles.stepDone,
                    )}
                    style={{ height: STEP_HEIGHT[size] }}
                  />
                  {wrongStep === size && (
                    <span aria-hidden className={`${styles.wrongMark} absolute -top-2 right-2 flex size-10 items-center justify-center rounded-full text-2xl font-extrabold leading-none`}>
                      ✕
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className={`${styles.tray} flex min-h-[clamp(100px,19vh,150px)] min-w-[min(90vw,520px)] items-center justify-center gap-[clamp(20px,5vw,56px)] rounded-3xl px-6`}>
              {trayOrder.map((size) =>
                placed.includes(size) ? null : (
                  <div
                    key={size}
                    role="button"
                    tabIndex={0}
                    aria-label={`${size} ${object.name}, drag it onto a step`}
                    onPointerDown={handlePointerDown(size)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{ transform: `translate(${(offsets[size] ?? ZERO).x}px, ${(offsets[size] ?? ZERO).y}px)`, fontSize: OBJECT_FONT[size] }}
                    className={cn(styles.object, settled === size && styles.objectSettled, revealStep === size && "opacity-40", "relative z-[2] leading-none")}
                  >
                    {object.emoji}
                  </div>
                ),
              )}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
