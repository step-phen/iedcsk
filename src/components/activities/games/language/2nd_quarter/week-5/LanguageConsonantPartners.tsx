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
  CHICK_COLORS,
  INSTRUCTION,
  LOADING,
  REVEAL,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./LanguageConsonantPartners.data";
import styles from "./LanguageConsonantPartners.module.css";

interface Round {
  key: string;
  target: string;
  answer: string;
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

// How long the wrong chick wobbles on its own before the right one lights up.
const WRONG_MS = 600;

const isUpper = (c: unknown): c is string => typeof c === "string" && /^[A-Z]$/.test(c);
const isLower = (c: unknown): c is string => typeof c === "string" && /^[a-z]$/.test(c);

function buildRound(row: QuestionRow): Round {
  const { target, choices } = (row.questionData ?? {}) as { target?: unknown; choices?: unknown };
  const answer = row.correctAnswer.answer;
  if (!isUpper(target) || answer !== target.toLowerCase()) throw new Error(`Question ${row.questionKey} needs a big-letter "target" whose answer is its small partner`);
  if (!Array.isArray(choices) || choices.length < 2 || !choices.every(isLower) || new Set(choices).size !== choices.length || !choices.includes(answer)) {
    throw new Error(`Question ${row.questionKey} needs different small-letter "choices" that include its answer`);
  }
  return { key: row.questionKey, target, answer, choices };
}

function Hen() {
  return (
    <svg viewBox="0 0 160 140" className="absolute inset-0 size-full overflow-visible" aria-hidden>
      <path d="M128 40 C 150 30, 156 60, 140 76" fill="#e8590c" stroke="#5c3317" strokeWidth="4" />
      <ellipse cx="80" cy="84" rx="64" ry="50" fill="white" stroke="#5c3317" strokeWidth="4" />
      <circle cx="44" cy="44" r="28" fill="white" stroke="#5c3317" strokeWidth="4" />
      <path d="M30 20 C 32 6, 42 8, 42 16 C 46 4, 58 8, 54 20" fill="#fa5252" stroke="#5c3317" strokeWidth="3" />
      <path d="M16 46 L2 52 L16 56 Z" fill="#fab005" stroke="#5c3317" strokeWidth="3" strokeLinejoin="round" />
      <path d="M20 58 C 16 70, 26 72, 26 62" fill="#fa5252" stroke="#5c3317" strokeWidth="2" />
      <circle cx="36" cy="40" r="5" fill="#212529" />
      <path d="M118 70 C 136 74, 134 104, 112 106" fill="#f1f3f5" stroke="#5c3317" strokeWidth="3" />
      <path d="M62 132 L62 140 M98 132 L98 140" stroke="#fab005" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function Chick({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible" aria-hidden>
      <ellipse cx="50" cy="60" rx="42" ry="36" fill={color} stroke="#5c3317" strokeWidth="4" />
      <path d="M40 24 C 40 14, 46 12, 50 22 C 52 12, 60 12, 58 24" fill="none" stroke="#5c3317" strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="40" r="4.5" fill="#212529" />
      <circle cx="68" cy="40" r="4.5" fill="#212529" />
      <path d="M44 44 L50 52 L56 44 Z" fill="#fd7e14" stroke="#5c3317" strokeWidth="2" strokeLinejoin="round" />
      <path d="M6 64 C 0 54, 10 50, 14 58 M94 64 C 100 54, 90 50, 86 58" fill="none" stroke="#5c3317" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function LanguageConsonantPartners({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Consonant Partners questions:", err);
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
  const title = activityName || "Consonant Partners";
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
    const prompt = promptSpeech(round.target);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["language consonant partners"], prompt]);
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
      <div aria-hidden className={`${styles.barn} pointer-events-none absolute bottom-[34%] right-[3%] h-[24%] w-[clamp(70px,16vw,170px)]`} />
      <div aria-hidden className={`${styles.grass} pointer-events-none absolute inset-x-0 bottom-0 h-[36%]`} />
      <div aria-hidden className={`${styles.fence} pointer-events-none absolute inset-x-0 bottom-[30%] h-[clamp(24px,6vh,48px)]`} />

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
            You matched {score} of {total} letters!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(92,51,23,0.4)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.target))}
              disabled={locked}
              aria-label="Hear the letter again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(10px,3vh,30px)] py-2">
            {/* Mama Hen wears the big letter; her baby chicks wait below. */}
            <div key={round.key} className={`${styles.hen} relative shrink-0`} aria-label={`Mama Hen with big ${round.target}`}>
              <Hen />
              <span className={`${styles.henLetter} pointer-events-none absolute bottom-[14%] left-[32%] flex h-[44%] w-[44%] items-center justify-center rounded-full font-extrabold leading-none`}>{round.target}</span>
              {picked !== null && <span aria-hidden className={`${styles.heart} absolute -right-[6%] top-[4%] leading-none`}>💛</span>}
            </div>

            <div className="relative">
              {reveal && <p className={`${styles.revealNote} absolute -top-12 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              <div className={`${styles.nest} flex items-end justify-center rounded-[50%]`}>
                {round.choices.map((letter, i) => {
                  const isTarget = letter === round.answer;
                  return (
                    <button
                      key={`${round.key}-${i}`}
                      type="button"
                      onClick={() => pick(i)}
                      disabled={locked}
                      aria-label={`Baby chick with small ${letter}`}
                      style={{ "--peck-delay": `${i * -0.5}s` } as React.CSSProperties}
                      className={cn(
                        styles.chick,
                        "relative shrink-0 rounded-full disabled:cursor-default",
                        wrong === i && styles.chickWrong,
                        picked === i && styles.chickRight,
                        reveal && isTarget && styles.chickReveal,
                        reveal && !isTarget && wrong !== i && "opacity-50",
                      )}
                    >
                      <Chick color={CHICK_COLORS[i % CHICK_COLORS.length]} />
                      <span className={`${styles.letter} pointer-events-none absolute inset-x-[22%] bottom-[8%] top-[50%] flex items-center justify-center font-extrabold leading-none`}>{letter}</span>
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
