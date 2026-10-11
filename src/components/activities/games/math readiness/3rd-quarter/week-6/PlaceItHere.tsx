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
  ANIMALS,
  ASSETS,
  REVEAL_TEXT,
  correctSpeech,
  instruction,
  isAnimal,
  isSpot,
  pairOf,
  placeOf,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  spotXY,
  type Side,
  type Spot,
} from "./PlaceItHere.data";
import styles from "./PlaceItHere.module.css";

interface Round {
  key: string;
  animal: keyof typeof ANIMALS;
  ask: Spot;
  side: Side;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

const ZERO = { x: 0, y: 0 };
// Extra px around a spot that still counts as a drop on it, so small fingers don't have to be exact.
const DROP_SLACK = 24;

function buildRound(row: QuestionRow): Round {
  const { animal, ask, side } = row.questionData as { animal: unknown; ask: unknown; side: unknown };
  if (!isAnimal(animal)) throw new Error(`Question ${row.questionKey} needs a known "animal"`);
  if (!isSpot(ask) || row.correctAnswer.answer !== ask) throw new Error(`Question ${row.questionKey} needs an "ask" of inside, outside, near or far that matches its answer`);
  if (side !== "left" && side !== "right") throw new Error(`Question ${row.questionKey} needs a "side" of left or right`);
  return { key: row.questionKey, animal, ask, side };
}

const RAIL = { fill: "#b45309", stroke: "#451a03", strokeWidth: 1.5, vectorEffect: "non-scaling-stroke" } as const;
const POST = { fill: "#92400e", stroke: "#451a03", strokeWidth: 1.5, vectorEffect: "non-scaling-stroke", rx: 2 } as const;

/** A dirt yard with a fence only around its edges, so the open middle clearly reads as inside the pen. */
function Pen() {
  return (
    <svg viewBox="0 0 200 120" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
      <rect x="6" y="8" width="188" height="106" fill="#e7c08f" />
      {[[40, 40], [150, 34], [70, 86], [128, 78], [30, 70], [170, 90]].map(([x, y]) => (
        <path key={`${x}-${y}`} d={`M${x} ${y} l8 -3 M${x + 2} ${y + 4} l7 1`} stroke="#c9974f" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      ))}
      {[5, 13].map((y) => <rect key={`back${y}`} x="4" y={y} width="192" height="5" {...RAIL} />)}
      {[4, 190].map((x) => <rect key={`side${x}`} x={x} y="8" width="6" height="104" {...RAIL} />)}
      {[98, 107].map((y) => <rect key={`front${y}`} x="4" y={y} width="192" height="6" {...RAIL} />)}
      {[4, 52, 100, 148, 190].map((x) => <rect key={`bp${x}`} x={x - 1} y="1" width="8" height="22" {...POST} />)}
      {[4, 52, 100, 148, 190].map((x) => <rect key={`fp${x}`} x={x - 1} y="93" width="8" height="26" {...POST} />)}
      {[4, 190].map((x) => <rect key={`mp${x}`} x={x - 1} y="52" width="8" height="16" {...POST} />)}
    </svg>
  );
}

/** A red barn with a white X door and a hay loft window. */
function Barn() {
  return (
    <svg viewBox="0 0 100 110" className="size-full" aria-hidden>
      <path d="M8 46 L50 8 L92 46 Z" fill="#7f1d1d" stroke="#2b0a0a" strokeWidth="3" strokeLinejoin="round" />
      <rect x="14" y="44" width="72" height="62" fill="#dc2626" stroke="#2b0a0a" strokeWidth="3" />
      <rect x="40" y="26" width="20" height="14" fill="#fde68a" stroke="#2b0a0a" strokeWidth="2.5" />
      <rect x="34" y="66" width="32" height="40" fill="#fef2f2" stroke="#2b0a0a" strokeWidth="3" />
      <path d="M34 66 L66 106 M66 66 L34 106" stroke="#dc2626" strokeWidth="4" />
    </svg>
  );
}

export default function PlaceItHere({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Place It Here questions:", err);
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
  const [dropped, setDropped] = useState<Spot | null>(null);
  const [offset, setOffset] = useState(ZERO);
  const [settled, setSettled] = useState(false);
  const [hoverSpot, setHoverSpot] = useState<Spot | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);
  const spotRefs = useRef<Partial<Record<Spot, HTMLDivElement | null>>>({});
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const round = rounds?.[roundIndex];
  const title = activityName || "Place It Here";
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
    const prompt = promptSpeech(round.animal, round.ask);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["place it here"], prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setDropped(null);
    setOffset(ZERO);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  const spotUnder = useCallback(
    (x: number, y: number): Spot | null => {
      if (!round) return null;
      for (const spot of pairOf(round.ask)) {
        const r = spotRefs.current[spot]?.getBoundingClientRect();
        if (r && x >= r.left - DROP_SLACK && x <= r.right + DROP_SLACK && y >= r.top - DROP_SLACK && y <= r.bottom + DROP_SLACK) return spot;
      }
      return null;
    },
    [round],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dropped) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setSettled(false);
      dragRef.current = { x: e.clientX, y: e.clientY };
    },
    [dropped],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d) return;
      setOffset({ x: e.clientX - d.x, y: e.clientY - d.y });
      setHoverSpot(spotUnder(e.clientX, e.clientY));
    },
    [spotUnder],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d || !round) return;
      setHoverSpot(null);
      setSettled(true);
      setOffset(ZERO);
      const spot = spotUnder(e.clientX, e.clientY);
      // Dropped on open grass: the animal just walks back to the wagon, no penalty.
      if (!spot) return;
      const correct = spot === round.ask;
      setDropped(spot);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: spot }];
      setResults((r) => [...r, correct]);
      speak(correct ? correctSpeech(round.animal, round.ask) : revealSpeech(round.animal, round.ask), advance, correct ? undefined : { minMs: REVEAL_MIN_MS });
    },
    [round, spotUnder, speak, advance],
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Opening the farm gate…</p>
      </div>
    );
  }

  const animal = ANIMALS[round.animal];
  const place = placeOf(round.ask);
  const droppedRight = dropped === round.ask;
  const left = round.side === "left";

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

      <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(26px,5.5vh,46px)] font-extrabold leading-tight`}>{title}</h1>

      {phase === "complete" ? (
        <div className={`${styles.result} relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center`}>
          <div className="flex items-center gap-3">
            <div className={`${styles.resultStamp} rounded-xl px-[clamp(14px,3vw,30px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You placed {score} of {total} farm animals!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(54,83,20,0.35)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={cn(styles.instruction, dropped && !droppedRight && styles.instructionReveal, "m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight")}>
              {dropped && !droppedRight ? REVEAL_TEXT : instruction(round.animal, round.ask)}
            </p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.animal, round.ask))}
              disabled={!!dropped}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-evenly gap-[clamp(6px,1.6vh,16px)]">
            <div className={`${styles.field} relative h-[clamp(220px,46vh,420px)] w-[min(96vw,900px)] overflow-hidden rounded-[2rem]`}>
              <span aria-hidden className={`${styles.cloud} absolute left-[14%] top-[8%] h-[9%] w-[14%] rounded-full`} />
              <span aria-hidden className={`${styles.cloud} absolute right-[20%] top-[14%] h-[7%] w-[11%] rounded-full`} />

              {place === "pen" ? (
                <div className={cn("absolute bottom-[6%] top-[36%] w-[40%]", left ? "left-[6%]" : "right-[6%]")}>
                  <Pen />
                </div>
              ) : (
                <div className={cn("absolute bottom-[8%] h-[70%] w-[22%]", left ? "left-[2%]" : "right-[2%]")}>
                  <Barn />
                </div>
              )}

              {pairOf(round.ask).map((spot) => {
                const { x, y } = spotXY(spot, round.side);
                const isDropped = dropped === spot;
                const isAnswer = spot === round.ask;
                const showAnimal = (isDropped && isAnswer) || (dropped && !droppedRight && isAnswer);
                return (
                  <div
                    key={spot}
                    ref={(el) => {
                      spotRefs.current[spot] = el;
                    }}
                    aria-label={`Spot ${spot === "far" ? "far from" : spot} the ${place}`}
                    className={cn(
                      styles.spot,
                      "absolute flex size-[clamp(66px,13vh,112px)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full",
                      hoverSpot === spot && styles.spotHover,
                      isDropped && !isAnswer && styles.spotWrong,
                      showAnimal && (droppedRight ? styles.spotCorrect : styles.spotReveal),
                    )}
                    style={{ left: `${x}%`, top: `${y}%` }}
                  >
                    {(isDropped || showAnimal) && (
                      <Image
                        src={animal.image}
                        alt=""
                        width={144}
                        height={144}
                        className={cn(styles.placed, isDropped && !isAnswer && "opacity-45", "size-[clamp(80px,16vh,144px)] object-contain")}
                      />
                    )}
                    {isDropped && !isAnswer && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-1 flex size-10 items-center justify-center rounded-full text-2xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="relative flex h-[clamp(84px,15vh,124px)] w-[min(56vw,300px)] items-center justify-center">
              <Image src="/images/activities/place-it-here/wagon.webp" alt="" fill sizes="300px" aria-hidden className="object-contain" />
              {!dropped && (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`${animal.name}, drag it ${round.ask === "far" ? "far from" : round.ask} the ${place}`}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
                  className={cn(styles.animal, settled && styles.animalSettled, offset.x || offset.y ? "z-[4]" : "z-[2]", "relative touch-none select-none")}
                >
                  <Image src={animal.image} alt="" width={170} height={170} className="size-[clamp(100px,20vh,170px)] -translate-y-[40%] object-contain" draggable={false} />
                </div>
              )}
              {/* Front panel of the wagon drawn again over the animal so it sits inside. */}
              <Image src="/images/activities/place-it-here/wagon.webp" alt="" fill sizes="300px" aria-hidden className="pointer-events-none z-[3] object-contain [clip-path:inset(26%_0_0_0)]" />
            </div>
          </main>
        </>
      )}
    </div>
  );
}
