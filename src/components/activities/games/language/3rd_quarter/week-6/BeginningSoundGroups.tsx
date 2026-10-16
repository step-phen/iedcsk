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
  CHESTS,
  INSTRUCTION,
  LOADING,
  PICTURES,
  REVEAL,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./BeginningSoundGroups.data";
import styles from "./BeginningSoundGroups.module.css";

interface Round {
  key: string;
  picture: string;
  groups: string[];
  answer: string;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

// How long the wrong chest rattles on its own before the right one lights up.
const WRONG_MS = 600;

const isPicture = (c: unknown): c is string => typeof c === "string" && c in PICTURES;
const isChest = (c: unknown): c is string => typeof c === "string" && c in CHESTS;

function buildRound(row: QuestionRow): Round {
  const { picture, groups } = (row.questionData ?? {}) as { picture?: unknown; groups?: unknown };
  const answer = row.correctAnswer.answer;
  if (!isPicture(picture)) throw new Error(`Question ${row.questionKey} needs a known "picture"`);
  if (!Array.isArray(groups) || groups.length < 2 || !groups.every(isChest) || new Set(groups).size !== groups.length || !groups.includes(answer)) {
    throw new Error(`Question ${row.questionKey} needs different known "groups" that include its answer`);
  }
  if (picture[0] !== answer) throw new Error(`Question ${row.questionKey} answer must be the chest for the first sound of ${picture}`);
  return { key: row.questionKey, picture, groups, answer };
}

function Chest({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 160 120" className="absolute inset-0 size-full overflow-visible" aria-hidden>
      <path d="M10 40 Q 80 -8 150 40 Z" fill={color} stroke="#5c3d1e" strokeWidth="5" strokeLinejoin="round" />
      <rect x="10" y="40" width="140" height="76" rx="8" fill={color} stroke="#5c3d1e" strokeWidth="5" />
      <path d="M10 58 L150 58" stroke="#5c3d1e" strokeWidth="4" />
      <rect x="22" y="40" width="10" height="76" fill="#ffd43b" stroke="#5c3d1e" strokeWidth="3" />
      <rect x="128" y="40" width="10" height="76" fill="#ffd43b" stroke="#5c3d1e" strokeWidth="3" />
    </svg>
  );
}

export default function BeginningSoundGroups({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Beginning Sound Groups questions:", err);
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
  const [picked, setPicked] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  // Every toy put away so far, by chest, so the groups build up over the game.
  const [sorted, setSorted] = useState<{ picture: string; group: string }[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);
  // A ref, not only state, so two drops landing in the same tick can't both answer.
  const lockedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const chestRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const round = rounds?.[roundIndex];
  const title = activityName || "Beginning Sound Groups";
  const score = results.filter(Boolean).length;
  const putAway = picked !== null || reveal;

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
    const prompt = promptSpeech(round.picture, round.groups);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["beginning sound groups"], prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    setWrong(null);
    setReveal(false);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
    lockedRef.current = false;
    setLocked(false);
  }, [roundIndex, total]);

  const pick = (group: string) => {
    if (!round || lockedRef.current) return;
    lockedRef.current = true;
    setLocked(true);
    const earned = group === round.answer;
    answersRef.current = [...answersRef.current, { questionId: round.key, response: group }];
    setResults((r) => [...r, earned]);
    if (earned) {
      setPicked(group);
      setSorted((s) => [...s, { picture: round.picture, group }]);
      speak(correctSpeech(round.picture, group), advance);
      return;
    }
    setWrong(group);
    const { picture, answer } = round;
    timerRef.current = window.setTimeout(() => {
      setReveal(true);
      setSorted((s) => [...s, { picture, group: answer }]);
      speak(revealSpeech(picture, answer), advance, { minMs: REVEAL_MIN_MS });
    }, WRONG_MS);
  };

  const chestAt = (x: number, y: number) =>
    round?.groups.find((g) => {
      const r = chestRefs.current[g]?.getBoundingClientRect();
      return r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }) ?? null;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (lockedRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0 });
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    setDrag({ x: e.clientX - start.x, y: e.clientY - start.y });
    setHover(chestAt(e.clientX, e.clientY));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;
    dragStartRef.current = null;
    setDrag(null);
    setHover(null);
    const group = chestAt(e.clientX, e.clientY);
    if (group) pick(group);
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

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      <div aria-hidden className={`${styles.floor} pointer-events-none absolute inset-x-0 bottom-0 h-[34%]`} />

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
            You sorted {score} of {total} toys!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(92,61,30,0.35)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(15px,2.6vh,24px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.picture, round.groups))}
              disabled={locked}
              aria-label="Hear the toy's name again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          {/* The toy waits on the rug; the child drags it (or taps a chest) to put it away with toys that start the same way. */}
          <main className="relative z-[1] flex min-h-0 w-full max-w-4xl flex-1 flex-col items-center justify-between py-2">
            <div className="relative flex flex-1 items-center justify-center">
              <div className={`${styles.rug} flex items-center justify-center rounded-[50%]`}>
                {!putAway && (
                  <div
                    key={round.key}
                    role="img"
                    aria-label={`The toy is a ${PICTURES[round.picture].name}`}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    style={drag ? { translate: `${drag.x}px ${drag.y}px` } : undefined}
                    className={cn(styles.toy, "flex items-center justify-center rounded-3xl leading-none", drag && styles.toyDragging, locked && "pointer-events-none")}
                  >
                    {PICTURES[round.picture].emoji}
                  </div>
                )}
              </div>
            </div>

            <div className="relative flex w-full shrink-0 items-end justify-center gap-[clamp(8px,3vw,36px)]">
              {reveal && <p className={`${styles.revealNote} absolute -top-12 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              {round.groups.map((group) => {
                const chest = CHESTS[group];
                const isAnswer = group === round.answer;
                const inside = sorted.filter((s) => s.group === group);
                return (
                  <button
                    key={group}
                    ref={(el) => {
                      chestRefs.current[group] = el;
                    }}
                    type="button"
                    onClick={() => pick(group)}
                    disabled={locked}
                    aria-label={`${chest.name} chest${inside.length ? ` with ${inside.map((s) => PICTURES[s.picture].name).join(", ")}` : ""}`}
                    className={cn(
                      styles.chest,
                      "relative flex shrink-0 flex-col items-center disabled:cursor-default",
                      hover === group && styles.chestHover,
                      picked === group && styles.chestRight,
                      wrong === group && styles.chestWrong,
                      reveal && isAnswer && styles.chestReveal,
                      reveal && !isAnswer && wrong !== group && "opacity-50",
                    )}
                  >
                    <Chest color={chest.color} />
                    <span className={`${styles.label} pointer-events-none relative flex items-center justify-center rounded-full leading-none`}>{chest.emoji}</span>
                    <span className={`${styles.pile} pointer-events-none relative flex flex-wrap items-center justify-center leading-none`}>
                      {inside.map((s, i) => (
                        <span key={i} className={styles.pileItem}>
                          {PICTURES[s.picture].emoji}
                        </span>
                      ))}
                    </span>
                    {wrong === group && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-1 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
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
