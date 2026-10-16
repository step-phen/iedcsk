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
  INSTRUCTION,
  LABELS,
  LOADING,
  REVEAL,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type Shape,
} from "./LettersAroundMe.data";
import styles from "./LettersAroundMe.module.css";

interface Round {
  key: string;
  label: string;
  target: string;
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

// How long the wrong letter wobbles on its own before the right one lights up.
const WRONG_MS = 600;

function buildRound(row: QuestionRow): Round {
  const { label, target } = (row.questionData ?? {}) as { label?: unknown; target?: unknown };
  if (typeof label !== "string" || !(label in LABELS)) throw new Error(`Question ${row.questionKey} needs a known "label"`);
  const choices = LABELS[label].word.split("");
  // Each letter appears once in its label, so the tapped letter alone says which tile was picked.
  if (typeof target !== "string" || row.correctAnswer.answer !== target || choices.filter((c) => c === target).length !== 1) {
    throw new Error(`Question ${row.questionKey} needs a "target" that appears once in its label and is its answer`);
  }
  return { key: row.questionKey, label, target, choices };
}

// Each label is drawn on a 200 x 160 board; the letters sit in the clear band of its shape.
const LETTER_BAND: Record<Shape, string> = {
  octagon: "inset-x-[12%] top-[32%] bottom-[32%]",
  carton: "inset-x-[18%] top-[42%] bottom-[16%]",
  bus: "inset-x-[8%] top-[48%] bottom-[22%]",
  sign: "inset-x-[10%] top-[28%] bottom-[24%]",
  box: "inset-x-[15%] top-[38%] bottom-[14%]",
};

function LabelArt({ shape, bg }: { shape: Shape; bg: string }) {
  return (
    <svg viewBox="0 0 200 160" className="absolute inset-0 size-full overflow-visible" aria-hidden>
      {shape === "octagon" && (
        <>
          <rect x="94" y="150" width="12" height="20" fill="#868e96" />
          <polygon points="60,4 140,4 196,60 196,100 140,156 60,156 4,100 4,60" fill={bg} stroke="#212529" strokeWidth="4" />
          <polygon points="64,14 136,14 186,64 186,96 136,146 64,146 14,96 14,64" fill="none" stroke="white" strokeWidth="5" />
        </>
      )}
      {shape === "carton" && (
        <>
          <rect x="84" y="0" width="32" height="14" rx="3" fill="#74c0fc" stroke="#212529" strokeWidth="3" />
          <polygon points="30,52 60,12 140,12 170,52" fill="#d0ebff" stroke="#212529" strokeWidth="4" strokeLinejoin="round" />
          <rect x="30" y="52" width="140" height="104" rx="6" fill={bg} stroke="#212529" strokeWidth="4" />
          <path d="M30 140 L170 140" stroke="#74c0fc" strokeWidth="10" />
        </>
      )}
      {shape === "bus" && (
        <>
          <rect x="6" y="14" width="188" height="118" rx="18" fill={bg} stroke="#212529" strokeWidth="4" />
          <rect x="18" y="26" width="36" height="34" rx="6" fill="#d0ebff" stroke="#212529" strokeWidth="3" />
          <rect x="62" y="26" width="36" height="34" rx="6" fill="#d0ebff" stroke="#212529" strokeWidth="3" />
          <rect x="106" y="26" width="36" height="34" rx="6" fill="#d0ebff" stroke="#212529" strokeWidth="3" />
          <rect x="150" y="26" width="32" height="70" rx="6" fill="#d0ebff" stroke="#212529" strokeWidth="3" />
          <rect x="14" y="72" width="128" height="44" rx="8" fill="white" stroke="#212529" strokeWidth="3" />
          <circle cx="46" cy="136" r="18" fill="#343a40" stroke="#212529" strokeWidth="3" />
          <circle cx="154" cy="136" r="18" fill="#343a40" stroke="#212529" strokeWidth="3" />
        </>
      )}
      {shape === "sign" && (
        <>
          <rect x="6" y="20" width="188" height="120" rx="12" fill={bg} stroke="#212529" strokeWidth="4" />
          <rect x="16" y="30" width="168" height="100" rx="8" fill="none" stroke="white" strokeWidth="4" />
          <path d="M70 116 L130 116 M118 106 L130 116 L118 126" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {shape === "box" && (
        <>
          <path d="M138 34 L150 4 L168 4" fill="none" stroke="#f06595" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="24" y="30" width="152" height="126" rx="10" fill={bg} stroke="#212529" strokeWidth="4" />
          <circle cx="56" cy="50" r="10" fill="#ffe066" stroke="#212529" strokeWidth="2" />
          <circle cx="76" cy="46" r="7" fill="#ffe066" stroke="#212529" strokeWidth="2" />
          <path d="M24 136 L176 136" stroke="#e8590c" strokeWidth="10" />
        </>
      )}
    </svg>
  );
}

export default function LettersAroundMe({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Letters Around Me questions:", err);
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
  const title = activityName || "Letters Around Me";
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
    const prompt = promptSpeech(round.label, round.target);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["letters around me"], prompt]);
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
    const earned = choice === round.target;
    answersRef.current = [...answersRef.current, { questionId: round.key, response: choice }];
    setResults((r) => [...r, earned]);
    if (earned) {
      setPicked(i);
      speak(correctSpeech(round.target), advance);
      return;
    }
    setWrong(i);
    const target = round.target;
    timerRef.current = window.setTimeout(() => {
      setReveal(true);
      speak(revealSpeech(target), advance, { minMs: REVEAL_MIN_MS });
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
      <div aria-hidden className={`${styles.town} pointer-events-none absolute inset-x-0 bottom-[14%] h-[34%]`} />
      <div aria-hidden className={`${styles.sidewalk} pointer-events-none absolute inset-x-0 bottom-0 h-[14%]`} />

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
            You found {score} of {total} letters!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(33,37,41,0.4)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.label, round.target))}
              disabled={locked}
              aria-label="Hear the letter again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(10px,3vh,30px)] py-2">
            <div className="relative">
              {reveal && <p className={`${styles.revealNote} absolute -top-12 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              {/* The pictured label; each of its letters is a tap target. */}
              <div key={round.key} className={`${styles.label} relative shrink-0`} aria-label={LABELS[round.label].name}>
                <LabelArt shape={LABELS[round.label].shape} bg={LABELS[round.label].bg} />
                <div className={`absolute ${LETTER_BAND[LABELS[round.label].shape]} flex items-stretch justify-center gap-[2%]`}>
                  {round.choices.map((letter, i) => {
                    const isTarget = letter === round.target;
                    return (
                      <button
                        key={`${round.key}-${i}`}
                        type="button"
                        onClick={() => pick(i)}
                        disabled={locked}
                        aria-label={`Letter ${letter}`}
                        style={{ color: LABELS[round.label].fg } as React.CSSProperties}
                        className={cn(
                          styles.tile,
                          "relative flex min-w-0 flex-1 items-center justify-center rounded-xl font-extrabold leading-none disabled:cursor-default",
                          wrong === i && styles.tileWrong,
                          picked === i && styles.tileRight,
                          reveal && isTarget && styles.tileReveal,
                          reveal && !isTarget && wrong !== i && "opacity-50",
                        )}
                      >
                        {letter}
                        {wrong === i && (
                          <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full text-base font-extrabold leading-none`}>
                            ✕
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
