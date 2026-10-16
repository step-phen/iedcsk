"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, REVEAL_MIN_MS } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import {
  ASSETS,
  FRAME_COLORS,
  INSTRUCTION,
  LOADING,
  ORDER_WORDS,
  REVEAL,
  STORIES,
  type Step,
  correctSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  storySpeech,
} from "./StoryStepsA.data";
import styles from "./StoryStepsA.module.css";

interface Round {
  key: string;
  story: string;
  cards: Step[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

// How long the wrong frames wobble on their own before the right order is pinned up.
const WRONG_MS = 600;
// A press that moves less than this is a tap on the card, not a drag.
const TAP_SLOP_PX = 8;

const orderOf = (story: string) => STORIES[story].map((s) => s.id).join("-");

function buildRound(row: QuestionRow): Round {
  const { story, cards } = (row.questionData ?? {}) as { story?: unknown; cards?: unknown };
  if (typeof story !== "string" || !Object.hasOwn(STORIES, story) || row.correctAnswer.answer !== orderOf(story)) {
    throw new Error(`Question ${row.questionKey} needs a known "story" whose order is its answer`);
  }
  const steps = STORIES[story];
  if (!Array.isArray(cards) || cards.length !== steps.length || [...cards].sort().join() !== steps.map((s) => s.id).sort().join()) {
    throw new Error(`Question ${row.questionKey} needs "cards" holding each picture of ${story} once`);
  }
  return { key: row.questionKey, story, cards: cards.map((id) => steps.find((s) => s.id === id)!) };
}

export default function StoryStepsA({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Story Steps A questions:", err);
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
  // Which tray card sits in each frame, left to right.
  const [frames, setFrames] = useState<(number | null)[]>([null, null, null]);
  const [solved, setSolved] = useState(false);
  const [wrongFrames, setWrongFrames] = useState<number[]>([]);
  const [reveal, setReveal] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);
  // A ref, not only state, so two drops landing in the same tick can't both answer.
  const lockedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const [drag, setDrag] = useState<{ i: number; x: number; y: number } | null>(null);
  const [overFrame, setOverFrame] = useState<number | null>(null);
  const dragStartRef = useRef<{ i: number; x: number; y: number } | null>(null);
  // Set once a press travels past the tap slop, so the click that follows a drag is ignored.
  const movedRef = useRef(false);
  const frameRefs = useRef<(HTMLDivElement | null)[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Story Steps A";
  const score = results.filter(Boolean).length;

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
    const story = storySpeech(round.story);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["story steps a"], ...story]);
      return;
    }
    speakAll(story);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    // A drop disables the cards before their click can reset this, so clear it here for the next round.
    movedRef.current = false;
    setFrames([null, null, null]);
    setSolved(false);
    setWrongFrames([]);
    setReveal(false);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
    lockedRef.current = false;
    setLocked(false);
  }, [roundIndex, total]);

  // Once all three frames hold a card, the order is checked and the round ends.
  const check = (placed: number[]) => {
    if (!round) return;
    lockedRef.current = true;
    setLocked(true);
    const steps = STORIES[round.story];
    const response = placed.map((c) => round.cards[c].id).join("-");
    const earned = response === orderOf(round.story);
    answersRef.current = [...answersRef.current, { questionId: round.key, response }];
    setResults((r) => [...r, earned]);
    if (earned) {
      setSolved(true);
      speak(correctSpeech(roundIndex), advance);
      return;
    }
    stop();
    setWrongFrames(placed.flatMap((c, k) => (round.cards[c].id === steps[k].id ? [] : [k])));
    const story = round.story;
    timerRef.current = window.setTimeout(() => {
      setReveal(true);
      speak(revealSpeech(story), advance, { minMs: REVEAL_MIN_MS });
    }, WRONG_MS);
  };

  const place = (card: number, frame: number) => {
    if (lockedRef.current) return;
    const next = frames.map((c) => (c === card ? null : c));
    next[frame] = card;
    setFrames(next);
    if (next.every((c) => c !== null)) check(next as number[]);
  };

  const tapCard = (card: number) => {
    const empty = frames.indexOf(null);
    if (empty >= 0) place(card, empty);
  };

  const unpin = (frame: number) => {
    if (lockedRef.current) return;
    setFrames((f) => f.map((c, k) => (k === frame ? null : c)));
  };

  const frameAt = (x: number, y: number) =>
    frameRefs.current.findIndex((el) => {
      const r = el?.getBoundingClientRect();
      return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });

  const onPointerDown = (i: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (lockedRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { i, x: e.clientX, y: e.clientY };
    movedRef.current = false;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    const x = e.clientX - start.x;
    const y = e.clientY - start.y;
    if (!movedRef.current && Math.hypot(x, y) < TAP_SLOP_PX) return;
    movedRef.current = true;
    setDrag({ i: start.i, x, y });
    const f = frameAt(e.clientX, e.clientY);
    setOverFrame(f >= 0 ? f : null);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    dragStartRef.current = null;
    setDrag(null);
    setOverFrame(null);
    const f = frameAt(e.clientX, e.clientY);
    if (movedRef.current && f >= 0) place(start.i, f);
  };

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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>{LOADING}</p>
      </div>
    );
  }

  const steps = STORIES[round.story];

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
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

      <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(26px,5.5vh,46px)] font-extrabold leading-tight`}>{title}</h1>

      {phase === "complete" ? (
        <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center">
          <div className="flex items-center gap-3">
            <div className={`${styles.resultStamp} rounded-2xl px-[clamp(14px,3vw,30px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You put {score} of {total} stories in order!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(80,45,10,0.4)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(15px,2.6vh,24px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speakAll(storySpeech(round.story))}
              disabled={locked}
              aria-label="Hear the story again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          {/* A corkboard with three numbered frames; story cards from the tray get pinned into them. */}
          <main key={round.key} className="relative z-[1] flex min-h-0 w-full max-w-5xl flex-1 flex-col items-center justify-evenly gap-[clamp(6px,2vh,20px)] py-2">
            <div className={`${styles.board} relative flex shrink-0 items-center justify-center gap-[clamp(8px,2.4vw,26px)] rounded-3xl`}>
              {reveal && <p className={`${styles.revealNote} absolute -top-5 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              {frames.map((card, k) => {
                const step = reveal ? steps[k] : card !== null ? round.cards[card] : null;
                return (
                  <div
                    key={k}
                    ref={(el) => {
                      frameRefs.current[k] = el;
                    }}
                    className={cn(
                      styles.frame,
                      "relative flex flex-col items-center rounded-2xl",
                      overFrame === k && styles.frameHover,
                      solved && styles.frameRight,
                      wrongFrames.includes(k) && !reveal && styles.frameWrong,
                      reveal && styles.frameReveal,
                    )}
                  >
                    <span className={`${styles.frameLabel} flex w-full items-center justify-center gap-1 rounded-t-xl py-0.5 text-[clamp(13px,2.2vh,20px)] font-extrabold`} style={{ background: FRAME_COLORS[k] }}>
                      {k + 1} · {ORDER_WORDS[k]}
                    </span>
                    {step ? (
                      <button
                        type="button"
                        onClick={() => unpin(k)}
                        disabled={locked}
                        aria-label={`${ORDER_WORDS[k]}: ${step.name}. Tap to take it off.`}
                        className="flex flex-1 items-center justify-center disabled:cursor-default"
                      >
                        <span className={`${styles.picture} leading-none`}>{step.emoji}</span>
                      </button>
                    ) : (
                      <span role="img" aria-label={`${ORDER_WORDS[k]}: empty`} className={`${styles.emptySpot} m-[8%] flex-1 rounded-xl`} />
                    )}
                    <span aria-hidden className={`${styles.pin} absolute -top-2 left-1/2 size-4 -translate-x-1/2 rounded-full`} style={{ background: FRAME_COLORS[k] }} />
                    {wrongFrames.includes(k) && !reveal && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-3 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className={`${styles.tray} flex shrink-0 items-center justify-center gap-[clamp(10px,3vw,30px)] rounded-2xl px-[clamp(10px,3vw,28px)] py-[clamp(6px,1.4vh,12px)]`}>
              {round.cards.map((step, i) => {
                const pinned = frames.includes(i) || reveal;
                const dragging = drag?.i === i;
                return (
                  <button
                    key={`${round.key}-${step.id}`}
                    type="button"
                    onClick={() => {
                      if (!movedRef.current) tapCard(i);
                      movedRef.current = false;
                    }}
                    onPointerDown={onPointerDown(i)}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    disabled={locked || pinned}
                    aria-label={step.name}
                    style={dragging ? { translate: `${drag.x}px ${drag.y}px` } : undefined}
                    className={cn(styles.card, "relative flex shrink-0 items-center justify-center rounded-xl disabled:cursor-default", dragging && styles.cardDragging, pinned && "invisible")}
                  >
                    <span className={`${styles.picture} pointer-events-none leading-none`}>{step.emoji}</span>
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
