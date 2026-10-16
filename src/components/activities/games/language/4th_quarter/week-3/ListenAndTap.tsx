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
  INSTRUCTION,
  LOADING,
  PLACES,
  REVEAL,
  type Place,
  correctSpeech,
  directionText,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./ListenAndTap.data";
import styles from "./ListenAndTap.module.css";

interface Round {
  key: string;
  kind: "tap" | "move";
  steps: string[];
  place?: Place;
  animals: string[];
  direction: string;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

// How long the wrong animal shakes on its own before the right ones light up.
const WRONG_MS = 600;
// A press that moves less than this is a tap on the animal, not a drag.
const TAP_SLOP_PX = 8;

const isAnimal = (a: unknown): a is string => typeof a === "string" && Object.hasOwn(ANIMALS, a);

function buildRound(row: QuestionRow): Round {
  const { kind, steps, place, animals } = (row.questionData ?? {}) as { kind?: unknown; steps?: unknown; place?: unknown; animals?: unknown };
  if (kind !== "tap" && kind !== "move") throw new Error(`Question ${row.questionKey} needs a "kind" of tap or move`);
  if (!Array.isArray(animals) || animals.length < 2 || !animals.every(isAnimal) || new Set(animals).size !== animals.length) {
    throw new Error(`Question ${row.questionKey} needs different known "animals"`);
  }
  if (!Array.isArray(steps) || steps.length < 1 || steps.length > 2 || new Set(steps).size !== steps.length || !steps.every((s) => animals.includes(s))) {
    throw new Error(`Question ${row.questionKey} needs one or two different "steps" from its animals`);
  }
  if (kind === "move" && (steps.length !== 1 || !PLACES.includes(place as Place))) throw new Error(`Question ${row.questionKey} needs one animal to move and a "place" of pond or barn`);
  if (row.correctAnswer.answer !== steps.join("-")) throw new Error(`Question ${row.questionKey} needs its steps joined by "-" as its answer`);
  const where = kind === "move" ? (place as Place) : undefined;
  return { key: row.questionKey, kind, steps, place: where, animals, direction: directionText(kind, steps, where) };
}

// The drawn place an animal is sent to: a lily-pad pond or a little red barn.
function PlaceArt({ place }: { place: Place }) {
  if (place === "pond") {
    return (
      <svg viewBox="0 0 160 100" className="absolute inset-0 size-full" aria-hidden>
        <ellipse cx="80" cy="56" rx="76" ry="40" fill="#4dabf7" stroke="#1864ab" strokeWidth="5" />
        <ellipse cx="66" cy="50" rx="44" ry="20" fill="#74c0fc" opacity="0.7" />
        <circle cx="128" cy="70" r="11" fill="#69db7c" stroke="#2b8a3e" strokeWidth="3" />
        <circle cx="30" cy="40" r="8" fill="#69db7c" stroke="#2b8a3e" strokeWidth="3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 160 130" className="absolute inset-0 size-full" aria-hidden>
      <path d="M12 54 L80 8 L148 54 V126 H12 Z" fill="#e03131" stroke="#5c1a1a" strokeWidth="5" strokeLinejoin="round" />
      <path d="M4 58 L80 4 L156 58" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="48" y="66" width="64" height="60" fill="#fff5f5" stroke="#5c1a1a" strokeWidth="4" />
      <path d="M48 66 L112 126 M112 66 L48 126" stroke="#e03131" strokeWidth="5" />
    </svg>
  );
}

export default function ListenAndTap({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Listen and Tap questions:", err);
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
  // Animals tapped so far this round, in order.
  const [taps, setTaps] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);
  // Refs, not only state, so two taps landing in the same tick can't both count.
  const lockedRef = useRef(false);
  const tapsRef = useRef<string[]>([]);
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const [drag, setDrag] = useState<{ animal: string; x: number; y: number } | null>(null);
  const [overPlace, setOverPlace] = useState(false);
  const dragStartRef = useRef<{ animal: string; x: number; y: number } | null>(null);
  // Set once a press travels past the tap slop, so the click that follows a drag is ignored.
  const movedRef = useRef(false);
  const placeRef = useRef<HTMLDivElement | null>(null);

  const round = rounds?.[roundIndex];
  const title = activityName || "Listen and Tap";
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
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["listen and tap"], round.direction]);
      return;
    }
    speak(round.direction);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    // A drop disables the animals before their click can reset this, so clear it here for the next round.
    movedRef.current = false;
    tapsRef.current = [];
    setTaps([]);
    setSolved(false);
    setWrong(null);
    setReveal(false);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
    lockedRef.current = false;
    setLocked(false);
  }, [roundIndex, total]);

  // Each tap or drop adds one animal; the round ends on the first slip or once every step is done.
  const choose = (animal: string) => {
    if (!round || lockedRef.current) return;
    const next = [...tapsRef.current, animal];
    tapsRef.current = next;
    setTaps(next);
    const slipped = animal !== round.steps[next.length - 1];
    if (!slipped && next.length < round.steps.length) return;
    lockedRef.current = true;
    setLocked(true);
    answersRef.current = [...answersRef.current, { questionId: round.key, response: next.join("-") }];
    setResults((r) => [...r, !slipped]);
    if (!slipped) {
      setSolved(true);
      speak(correctSpeech(roundIndex), advance);
      return;
    }
    stop();
    setWrong(animal);
    const { direction } = round;
    timerRef.current = window.setTimeout(() => {
      setReveal(true);
      speak(revealSpeech(direction), advance, { minMs: REVEAL_MIN_MS });
    }, WRONG_MS);
  };

  const inPlace = (x: number, y: number) => {
    const r = placeRef.current?.getBoundingClientRect();
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const onPointerDown = (animal: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (lockedRef.current || round?.kind !== "move") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { animal, x: e.clientX, y: e.clientY };
    movedRef.current = false;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    const x = e.clientX - start.x;
    const y = e.clientY - start.y;
    if (!movedRef.current && Math.hypot(x, y) < TAP_SLOP_PX) return;
    movedRef.current = true;
    setDrag({ animal: start.animal, x, y });
    setOverPlace(inPlace(e.clientX, e.clientY));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    dragStartRef.current = null;
    setDrag(null);
    setOverPlace(false);
    if (movedRef.current && inPlace(e.clientX, e.clientY)) choose(start.animal);
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

  // The animal standing in the place: the one moved there, or the right one once it is shown.
  const placed = round.kind === "move" && (solved || reveal) ? round.steps[0] : null;

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      <div aria-hidden className={`${styles.field} pointer-events-none absolute inset-x-0 bottom-0 h-[62%]`} />
      <div aria-hidden className={`${styles.fence} pointer-events-none absolute inset-x-0 bottom-[62%] h-[clamp(18px,4dvh,34px)]`} />

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
            You followed {score} of {total} directions!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(43,87,24,0.4)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(15px,2.6vh,24px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speak(round.direction)}
              disabled={locked}
              aria-label="Hear the direction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main key={round.key} className="relative z-[1] flex min-h-0 w-full max-w-5xl flex-1 flex-col items-center justify-evenly gap-[clamp(6px,2vh,18px)] py-2">
            {/* The farmer's sign shows the direction she just said. */}
            <div className={`${styles.sign} relative flex shrink-0 items-center gap-3 rounded-2xl px-4 py-2`}>
              <span aria-hidden className="text-[clamp(30px,6vh,52px)] leading-none">👩‍🌾</span>
              <p className="m-0 text-[clamp(18px,3.4vh,30px)] font-extrabold leading-tight">{round.direction}</p>
            </div>

            <div className="relative flex w-full flex-1 flex-col items-center justify-center gap-[clamp(8px,2vh,20px)] landscape:flex-row">
              {round.place && (
                <div
                  ref={placeRef}
                  role="img"
                  aria-label={placed ? `The ${ANIMALS[placed].name} is in the ${round.place}` : `The ${round.place}`}
                  className={cn(styles.place, round.place === "barn" && styles.placeBarn, "relative flex shrink-0 items-center justify-center", overPlace && styles.placeHover, reveal && styles.placeReveal)}
                >
                  <PlaceArt place={round.place} />
                  {placed && <span className={cn(styles.animal, "relative leading-none", solved && styles.animalHop)}>{ANIMALS[placed].emoji}</span>}
                </div>
              )}

              <div className="relative grid shrink-0 grid-cols-2 gap-[clamp(8px,2.4vw,24px)] sm:grid-cols-4">
                {reveal && <p className={`${styles.revealNote} absolute -top-11 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
                {round.animals.map((animal) => {
                  const order = round.kind === "tap" ? taps.indexOf(animal) : -1;
                  const stepIndex = round.steps.indexOf(animal);
                  const shown = reveal && stepIndex >= 0;
                  const dragging = drag?.animal === animal;
                  // The step number shown on an animal: its place in the direction once revealed, else the order it was tapped.
                  const badge = round.kind !== "tap" ? -1 : shown ? stepIndex : wrong !== animal ? order : -1;
                  return (
                    <button
                      key={`${round.key}-${animal}`}
                      type="button"
                      onClick={() => {
                        if (!movedRef.current) choose(animal);
                        movedRef.current = false;
                      }}
                      onPointerDown={onPointerDown(animal)}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onPointerCancel={onPointerUp}
                      disabled={locked || order >= 0}
                      aria-label={ANIMALS[animal].name}
                      style={dragging ? { translate: `${drag.x}px ${drag.y}px` } : undefined}
                      className={cn(
                        styles.patch,
                        round.kind === "move" && styles.patchDrag,
                        "relative flex items-center justify-center rounded-full disabled:cursor-default",
                        dragging && styles.patchDragging,
                        placed === animal && "invisible",
                        order >= 0 && wrong !== animal && styles.patchTapped,
                        solved && round.kind === "tap" && order >= 0 && styles.patchRight,
                        wrong === animal && styles.patchWrong,
                        shown && round.kind === "tap" && styles.patchReveal,
                        reveal && !shown && wrong !== animal && "opacity-50",
                      )}
                    >
                      <span className={`${styles.animal} pointer-events-none leading-none`}>{ANIMALS[animal].emoji}</span>
                      {badge >= 0 && (
                        <span aria-hidden className={`${styles.stepBadge} absolute -left-1 -top-1 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                          {badge + 1}
                        </span>
                      )}
                      {wrong === animal && (
                        <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-1 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                          ✕
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
