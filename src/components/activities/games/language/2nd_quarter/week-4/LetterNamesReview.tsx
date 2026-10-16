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
  FROSTING,
  LOADING,
  PICTURES,
  REVEAL,
  TASKS,
  choiceSpeech,
  correctSpeech,
  instruction,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type Task,
} from "./LetterNamesReview.data";
import styles from "./LetterNamesReview.module.css";

interface Round {
  key: string;
  task: Task;
  target: string;
  choices: string[];
  answer: string;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

// How long the wrong cookie wobbles on its own before the right one lights up.
const WRONG_MS = 600;

const isLetter = (c: unknown): c is string => typeof c === "string" && /^[A-Za-z]$/.test(c);

function buildRound(row: QuestionRow): Round {
  const { task, target, choices } = (row.questionData ?? {}) as { task?: unknown; target?: unknown; choices?: unknown };
  const answer = row.correctAnswer.answer;
  if (!TASKS.includes(task as Task) || !isLetter(target)) throw new Error(`Question ${row.questionKey} needs a known "task" and a one-letter "target"`);
  const fits = task === "picture" ? (c: unknown) => typeof c === "string" && c in PICTURES : isLetter;
  if (!Array.isArray(choices) || choices.length < 2 || !choices.every(fits) || new Set(choices).size !== choices.length || !choices.includes(answer)) {
    throw new Error(`Question ${row.questionKey} needs different drawable "choices" that include its answer`);
  }
  return { key: row.questionKey, task: task as Task, target, choices, answer };
}

function Cookie({ frosting }: { frosting: string }) {
  return (
    <svg viewBox="0 0 120 120" className="absolute inset-0 size-full overflow-visible" aria-hidden>
      <circle cx="60" cy="64" r="54" fill="#a0612b" />
      <circle cx="60" cy="58" r="54" fill="#d9964f" stroke="#5c3317" strokeWidth="4" />
      <path d="M22 50 C 20 28, 44 14, 62 18 C 84 12, 104 30, 98 52 C 106 74, 86 96, 62 92 C 38 100, 14 78, 22 50 Z" fill={frosting} stroke="#5c3317" strokeWidth="3" />
      <ellipse cx="44" cy="34" rx="12" ry="5" fill="white" opacity="0.55" transform="rotate(-25 44 34)" />
      <rect x="16" y="78" width="6" height="3" rx="1.5" fill="#ff6b6b" transform="rotate(30 19 79)" />
      <rect x="96" y="40" width="6" height="3" rx="1.5" fill="#51cf66" transform="rotate(-40 99 41)" />
      <rect x="88" y="92" width="6" height="3" rx="1.5" fill="#339af0" transform="rotate(15 91 93)" />
    </svg>
  );
}

export default function LetterNamesReview({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Language Review questions:", err);
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
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);
  // A ref, not only state, so two taps landing in the same tick can't both answer.
  const lockedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const round = rounds?.[roundIndex];
  const title = activityName || "Language Review";
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
    const prompt = promptSpeech(round.task, round.target, round.choices);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["letter names review"], prompt]);
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

  const pick = (i: number) => {
    if (!round || lockedRef.current) return;
    lockedRef.current = true;
    setLocked(true);
    const choice = round.choices[i];
    const earned = choice === round.answer;
    answersRef.current = [...answersRef.current, { questionId: round.key, response: choice }];
    setResults((r) => [...r, earned]);
    if (earned) {
      setPicked(i);
      speak(correctSpeech(round.task, round.target, round.answer), advance);
      return;
    }
    setWrong(i);
    const { task, target, answer } = round;
    timerRef.current = window.setTimeout(() => {
      setReveal(true);
      speak(revealSpeech(task, target, answer), advance, { minMs: REVEAL_MIN_MS });
    }, WRONG_MS);
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
        <p className={`${styles.ticket} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!rounds || !round) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 font-baloo2`}>
        <p className={`${styles.ticket} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>{LOADING}</p>
      </div>
    );
  }

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      <div aria-hidden className={`${styles.awning} pointer-events-none absolute inset-x-0 top-0 h-[clamp(18px,4vh,34px)]`} />
      <div aria-hidden className={`${styles.counter} pointer-events-none absolute inset-x-0 bottom-0 h-[30%]`} />

      {learnerName && (
        <div className={`${styles.badge} fixed left-3 top-3 z-10 flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-xl font-extrabold short:py-1 short:text-base`}>
          <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={`${styles.avatar} size-11 text-xl short:size-8 short:text-base`} />
          <span className="max-w-48 truncate capitalize leading-none">{learnerName}</span>
        </div>
      )}
      {phase !== "complete" && (
        <div className={`${styles.badge} fixed right-3 top-3 z-10 flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center justify-end gap-0.5 rounded-3xl px-2.5 py-1.5 sm:max-w-none`} aria-label={`Score: ${score} of ${total}`}>
          {rounds.map((r, i) => (
            <Image
              key={r.key}
              src={results[i] ? ASSETS.starFilled : ASSETS.starEmpty}
              alt=""
              width={128}
              height={128}
              loading="eager"
              className={cn("size-[clamp(16px,3vh,26px)] object-contain transition-transform", i === roundIndex && "scale-125")}
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
          <p className={`${styles.ticket} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You got {score} of {total} cookies!
          </p>
          <div className="flex max-w-[92vw] flex-wrap items-center justify-center gap-[clamp(4px,1.2vw,12px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(30px,6.5vh,60px)] object-contain drop-shadow-[0_4px_3px_rgba(92,51,23,0.35)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.ticket} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{instruction(round.task, round.target)}</p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.task, round.target, round.choices))}
              disabled={locked}
              aria-label="Hear the order again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(10px,3vh,30px)] py-2">
            {/* The baker's order card: the shown letter, or an ear when the order is only heard. */}
            <div key={round.key} className={`${styles.order} relative flex shrink-0 flex-col items-center justify-center rounded-2xl`} aria-label={round.task === "listen" ? "Listen to the order" : `Order: letter ${round.target}`}>
              <span className={`${styles.orderTag} absolute -top-[0.9em] rounded-full px-3 font-extrabold uppercase tracking-wider`}>Order</span>
              <span className={`${styles.orderLetter} font-extrabold leading-none`}>{round.task === "listen" ? "👂" : round.target}</span>
            </div>

            <div className="relative">
              {reveal && <p className={`${styles.revealNote} absolute -top-11 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              <div className={`${styles.tray} flex items-center justify-center rounded-[2rem]`}>
                {round.choices.map((choice, i) => {
                  const isAnswer = choice === round.answer;
                  return (
                    <button
                      key={`${round.key}-${i}`}
                      type="button"
                      onClick={() => pick(i)}
                      disabled={locked}
                      aria-label={`Cookie with ${choiceSpeech(round.task, choice)}`}
                      style={{ "--pop-delay": `${i * 90}ms` } as React.CSSProperties}
                      className={cn(
                        styles.cookie,
                        "relative shrink-0 rounded-full disabled:cursor-default",
                        wrong === i && styles.cookieWrong,
                        picked === i && styles.cookieRight,
                        reveal && isAnswer && styles.cookieReveal,
                        reveal && !isAnswer && wrong !== i && "opacity-50",
                      )}
                    >
                      <Cookie frosting={FROSTING[i % FROSTING.length]} />
                      <span className={`${round.task === "picture" ? styles.picture : styles.letter} pointer-events-none absolute inset-[16%] flex items-center justify-center font-extrabold leading-none`}>
                        {round.task === "picture" ? PICTURES[choice].emoji : choice}
                      </span>
                      {wrong === i && (
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
