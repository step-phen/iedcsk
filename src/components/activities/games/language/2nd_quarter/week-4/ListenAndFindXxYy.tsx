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
  PAD_SHADES,
  INSTRUCTION,
  LOADING,
  REVEAL,
  TODAY,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./ListenAndFindXxYy.data";
import styles from "./ListenAndFindXxYy.module.css";

interface Round {
  key: string;
  target: string;
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

// How long the wrong pad wobbles on its own before the right one lights up.
const WRONG_MS = 600;

const isLetter = (c: unknown): c is string => typeof c === "string" && /^[A-Za-z]$/.test(c);

function buildRound(row: QuestionRow): Round {
  const { target, choices } = (row.questionData ?? {}) as { target?: unknown; choices?: unknown };
  if (!isLetter(target) || row.correctAnswer.answer !== target) throw new Error(`Question ${row.questionKey} needs a one-letter "target" that is its answer`);
  if (!Array.isArray(choices) || choices.length < 2 || !choices.every(isLetter) || new Set(choices).size !== choices.length || !choices.includes(target)) {
    throw new Error(`Question ${row.questionKey} needs different one-letter "choices" that include its target`);
  }
  return { key: row.questionKey, target, choices };
}

function LilyPad({ shade }: { shade: string }) {
  return (
    <svg viewBox="0 0 120 80" className="absolute inset-0 size-full overflow-visible" aria-hidden>
      <ellipse cx="60" cy="46" rx="56" ry="30" fill="#2b8a3e" />
      <path d="M60 40 L104 22 A 56 30 0 1 0 112 34 Z" fill={shade} stroke="#1b4332" strokeWidth="3" strokeLinejoin="round" />
      <path d="M60 38 L22 52 M60 38 L44 64 M60 38 L84 64 M60 38 L104 50" stroke="#2b8a3e" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function Frog() {
  return (
    <svg viewBox="0 0 100 80" className="size-full overflow-visible" aria-hidden>
      <ellipse cx="50" cy="56" rx="38" ry="22" fill="#40c057" stroke="#1b4332" strokeWidth="3" />
      <ellipse cx="50" cy="62" rx="22" ry="12" fill="#d3f9d8" />
      <circle cx="30" cy="30" r="14" fill="#40c057" stroke="#1b4332" strokeWidth="3" />
      <circle cx="70" cy="30" r="14" fill="#40c057" stroke="#1b4332" strokeWidth="3" />
      <circle cx="30" cy="29" r="7" fill="white" />
      <circle cx="70" cy="29" r="7" fill="white" />
      <circle cx="31" cy="30" r="4" fill="#1e293b" />
      <circle cx="71" cy="30" r="4" fill="#1e293b" />
      <path d="M36 50 Q 50 60 64 50" fill="none" stroke="#1b4332" strokeWidth="3" strokeLinecap="round" />
      <circle cx="28" cy="52" r="4" fill="#ffa8a8" />
      <circle cx="72" cy="52" r="4" fill="#ffa8a8" />
    </svg>
  );
}

export default function ListenAndFindXxYy({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Listen and Find: Xx, Yy questions:", err);
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
  const title = activityName || "Listen and Find: Xx, Yy";
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
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["listen and find: xx, yy"], prompt]);
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
      <div aria-hidden className={`${styles.pond} pointer-events-none absolute inset-x-[-10%] bottom-[-8%] h-[62%] rounded-[50%]`} />
      <div aria-hidden className={`${styles.reeds} pointer-events-none absolute bottom-[30%] left-[3%] h-[22%] w-[clamp(30px,6vw,60px)]`} />
      <div aria-hidden className={`${styles.reeds} pointer-events-none absolute bottom-[26%] right-[4%] h-[18%] w-[clamp(26px,5vw,50px)] [animation-delay:-1.2s]`} />

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
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(27,67,50,0.4)]" />
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
            {/* Today's letters on a wooden pond sign. */}
            <div className={`${styles.sign} flex shrink-0 items-baseline gap-[0.5em] rounded-xl px-5 py-1 font-extrabold leading-none`} aria-label={`Today's letters: ${TODAY.join(" and ")}`}>
              {TODAY.map((pair) => (
                <span key={pair}>{pair}</span>
              ))}
            </div>

            <div className="relative">
              {reveal && <p className={`${styles.revealNote} absolute -top-12 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              <div className={`${styles.row} grid grid-cols-2 items-center justify-items-center sm:grid-cols-4`}>
                {round.choices.map((letter, i) => {
                  const isTarget = letter === round.target;
                  return (
                    <button
                      key={`${round.key}-${i}`}
                      type="button"
                      onClick={() => pick(i)}
                      disabled={locked}
                      aria-label={`Lily pad with ${letter === letter.toUpperCase() ? "big" : "small"} ${letter}`}
                      style={{ "--bob-delay": `${i * -0.6}s` } as React.CSSProperties}
                      className={cn(
                        styles.pad,
                        "relative shrink-0 rounded-[50%] disabled:cursor-default",
                        wrong === i && styles.padWrong,
                        picked === i && styles.padRight,
                        reveal && isTarget && styles.padReveal,
                        reveal && !isTarget && wrong !== i && "opacity-50",
                      )}
                    >
                      <LilyPad shade={PAD_SHADES[i % PAD_SHADES.length]} />
                      {picked === i && (
                        <span aria-hidden className={`${styles.frog} pointer-events-none absolute bottom-[55%] left-[15%] z-[2] w-[70%]`}>
                          <Frog />
                        </span>
                      )}
                      <span className={`${styles.letter} pointer-events-none absolute inset-x-[20%] top-[14%] bottom-[22%] flex items-center justify-center font-extrabold leading-none`}>{letter}</span>
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
