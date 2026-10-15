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
  LOADING,
  REVEAL,
  SOUNDS,
  STAMP_COLORS,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./ListenAndMatchSyllablesE.data";
import styles from "./ListenAndMatchSyllablesE.module.css";

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

// How long the wrong envelope wiggles on its own before the right one lights up.
const WRONG_MS = 600;

const isSyllable = (s: unknown): s is string => typeof s === "string" && Object.hasOwn(SOUNDS, s);

function buildRound(row: QuestionRow): Round {
  const { target, choices } = (row.questionData ?? {}) as { target?: unknown; choices?: unknown };
  if (!isSyllable(target) || row.correctAnswer.answer !== target) throw new Error(`Question ${row.questionKey} needs a known syllable "target" that is its answer`);
  if (!Array.isArray(choices) || choices.length < 2 || !choices.every(isSyllable) || new Set(choices).size !== choices.length || !choices.includes(target)) {
    throw new Error(`Question ${row.questionKey} needs different known syllable "choices" that include its target`);
  }
  return { key: row.questionKey, target, choices };
}

function Envelope({ stamp }: { stamp: string }) {
  return (
    <svg viewBox="0 0 140 96" className="absolute inset-0 size-full overflow-visible" aria-hidden>
      <rect x="4" y="4" width="132" height="88" rx="10" fill="#fffaf0" stroke="#3d2c5c" strokeWidth="4" />
      <path d="M8 10 L70 50 L132 10" fill="none" stroke="#3d2c5c" strokeWidth="3.5" strokeLinejoin="round" opacity="0.45" />
      <rect x="106" y="12" width="22" height="26" rx="3" fill={stamp} stroke="#3d2c5c" strokeWidth="2.5" strokeDasharray="3 2" />
      <path d="M112 30 L117 20 L122 30" fill="none" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

export default function ListenAndMatchSyllablesE({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Listen and Match Syllables: e questions:", err);
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
  const title = activityName || "Listen and Match Syllables: e";
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
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["listen and match syllables: e"], prompt]);
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
      <div aria-hidden className={`${styles.counter} pointer-events-none absolute inset-x-0 bottom-0 h-[30%]`} />

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
            You matched {score} of {total} syllables!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(61,44,92,0.35)]" />
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
              aria-label="Hear the syllable again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-evenly gap-2 py-2">
            {/* The mailbox the right envelope flies into. */}
            <div aria-hidden className={cn(styles.mailbox, picked !== null && styles.mailboxGulp, "relative shrink-0")}>
              <div className={`${styles.slot} absolute inset-x-[18%] top-[30%] h-[12%] rounded-full`} />
              <div className={`${styles.flag} absolute -right-[14%] top-[18%] h-[46%] w-[10%]`} />
            </div>

            <div className="relative">
              {reveal && <p className={`${styles.revealNote} absolute -top-12 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              <div className={`${styles.pile} flex flex-wrap items-center justify-center gap-[clamp(10px,3vw,36px)]`}>
                {round.choices.map((syllable, i) => {
                  const isTarget = syllable === round.target;
                  return (
                    <button
                      key={`${round.key}-${i}`}
                      type="button"
                      onClick={() => pick(i)}
                      disabled={locked}
                      aria-label={`Envelope with ${syllable}`}
                      style={{ "--tilt": `${(i - 1) * 4}deg` } as React.CSSProperties}
                      className={cn(
                        styles.envelope,
                        "relative shrink-0 rounded-xl disabled:cursor-default",
                        wrong === i && styles.envelopeWrong,
                        picked === i && styles.envelopeSend,
                        reveal && isTarget && styles.envelopeReveal,
                        reveal && !isTarget && wrong !== i && "opacity-50",
                      )}
                    >
                      <Envelope stamp={STAMP_COLORS[i % STAMP_COLORS.length]} />
                      <span className={`${styles.syllable} pointer-events-none absolute inset-y-[18%] left-[8%] right-[26%] flex items-center justify-center font-extrabold leading-none`}>
                        {syllable[0]}
                        <span className={styles.vowel}>{syllable[1]}</span>
                      </span>
                      {wrong === i && (
                        <span aria-hidden className={`${styles.wrongMark} absolute -left-2 -top-3 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
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
