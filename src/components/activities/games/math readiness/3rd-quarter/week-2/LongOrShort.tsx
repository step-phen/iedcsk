"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, REVEAL_MIN_MS } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import { LengthItem, LENGTH_KINDS, UNIT, isLengthKind } from "./LengthItem";
import {
  ASSETS,
  GROUPS,
  INSTRUCTION,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type Group,
} from "./LongOrShort.data";
import styles from "./LongOrShort.module.css";

interface Round {
  key: string;
  kind: keyof typeof LENGTH_KINDS;
  length: number;
  reference: number;
  answer: Group;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

const ZERO = { x: 0, y: 0 };

function buildRound(row: QuestionRow): Round {
  const { item, length, reference } = row.questionData as { item: unknown; length: unknown; reference: unknown };
  if (!isLengthKind(item)) throw new Error(`Question ${row.questionKey} needs a known "item"`);
  if (!Number.isInteger(length) || !Number.isInteger(reference) || (length as number) < 2 || length === reference) {
    throw new Error(`Question ${row.questionKey} needs a whole "length" of at least 2 that differs from its "reference"`);
  }
  const answer: Group = (length as number) > (reference as number) ? "longer" : "shorter";
  if (row.correctAnswer.answer !== answer) throw new Error(`Question ${row.questionKey}'s answer must be "${answer}"`);
  return { key: row.questionKey, kind: item, length: length as number, reference: reference as number, answer };
}

export default function LongOrShort({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Long or Short questions:", err);
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
  const [dropped, setDropped] = useState<Group | null>(null);
  const [offset, setOffset] = useState(ZERO);
  const [settled, setSettled] = useState(false);
  const [activeBox, setActiveBox] = useState<Group | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);
  const boxRefs = useRef<Partial<Record<Group, HTMLDivElement | null>>>({});
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const round = rounds?.[roundIndex];
  const title = activityName || "Long or Short?";
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
    const prompt = promptSpeech(round.kind);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["long or short"], prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setDropped(null);
    setOffset(ZERO);
    setSettled(false);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  const boxUnder = useCallback((x: number, y: number): Group | null => {
    for (const { id } of GROUPS) {
      const r = boxRefs.current[id]?.getBoundingClientRect();
      if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return id;
    }
    return null;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!round || dropped) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setSettled(false);
      dragRef.current = { x: e.clientX, y: e.clientY };
    },
    [round, dropped],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d) return;
      setOffset({ x: e.clientX - d.x, y: e.clientY - d.y });
      setActiveBox(boxUnder(e.clientX, e.clientY));
    },
    [boxUnder],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d || !round) return;
      setActiveBox(null);
      setSettled(true);
      setOffset(ZERO);
      const target = boxUnder(e.clientX, e.clientY);
      if (!target) return;

      const correct = target === round.answer;
      setDropped(target);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: target }];
      setResults((r) => [...r, correct]);
      speak(correct ? correctSpeech(round.answer, round.kind) : revealSpeech(round.answer, round.kind), advance, correct ? undefined : { minMs: REVEAL_MIN_MS });
    },
    [round, boxUnder, speak, advance],
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Finding the measuring stick…</p>
      </div>
    );
  }

  const name = LENGTH_KINDS[round.kind].name;
  const droppedRight = dropped === round.answer;

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
            You measured {score} of {total} things!
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
              onClick={() => speak(promptSpeech(round.kind))}
              disabled={!!dropped}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-evenly">
            <div className={`${styles.station} rounded-3xl py-[clamp(12px,2.6vh,24px)] pl-[clamp(20px,4vw,40px)] pr-[clamp(14px,3vw,28px)]`}>
              <div className={`${styles.startLine} relative flex flex-col gap-[clamp(14px,3.4vh,30px)] py-1`} style={{ width: `calc(${UNIT} * 7.2)` }}>
                <span aria-hidden className={`${styles.endLine} pointer-events-none absolute inset-y-0`} style={{ left: `calc(${UNIT} * ${round.reference})` }} />
                <div className="flex items-center gap-2">
                  <LengthItem kind="stick" length={round.reference} />
                  <span className={`${styles.stickTag} rounded-full px-2.5 py-0.5 text-[clamp(11px,1.9vh,15px)] font-extrabold uppercase`}>Stick</span>
                </div>
                <div className="flex min-h-[clamp(34px,6.6vh,56px)] items-center">
                  {!dropped && (
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`${name}, drag it into the Longer or Shorter box`}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
                      className={cn(styles.object, settled && styles.objectSettled, "relative z-[2]")}
                    >
                      <LengthItem kind={round.kind} length={round.length} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start justify-center gap-[clamp(16px,5vw,56px)]">
              {GROUPS.map(({ id, label }) => {
                const isDropped = dropped === id;
                const isAnswer = id === round.answer;
                return (
                  <div key={id} className="flex flex-col items-center gap-2">
                    <div
                      ref={(el) => {
                        boxRefs.current[id] = el;
                      }}
                      aria-label={`${label} box`}
                      className={cn(
                        styles.box,
                        "relative flex h-[clamp(96px,19vh,160px)] w-[clamp(150px,30vw,250px)] items-center justify-center overflow-hidden rounded-3xl",
                        activeBox === id && styles.boxActive,
                        isDropped && !isAnswer && styles.boxWrong,
                        dropped && isAnswer && (droppedRight ? styles.boxCorrect : styles.boxReveal),
                      )}
                    >
                      {dropped && isAnswer && (
                        <div className={styles.inBox} style={{ transform: "scale(0.42)" }}>
                          <LengthItem kind={round.kind} length={round.length} />
                        </div>
                      )}
                      {isDropped && !isAnswer && (
                        <span aria-hidden className={`${styles.wrongMark} absolute right-2 top-2 flex size-10 items-center justify-center rounded-full text-2xl font-extrabold leading-none`}>
                          ✕
                        </span>
                      )}
                    </div>
                    <span className={`${styles.boxLabel} rounded-full px-4 py-1 text-[clamp(15px,2.8vh,22px)] font-extrabold uppercase tracking-wide`}>{label}</span>
                  </div>
                );
              })}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
