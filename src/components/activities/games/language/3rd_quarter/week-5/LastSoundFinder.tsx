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
  BOW_COLORS,
  INSTRUCTION,
  LOADING,
  REVEAL,
  WORDS,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./LastSoundFinder.data";
import styles from "./LastSoundFinder.module.css";

interface Round {
  key: string;
  word: string;
  choices: string[];
  answer: string;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

// How long the wrong bow flutters on its own before the right one lights up.
const WRONG_MS = 600;

const isWord = (c: unknown): c is string => typeof c === "string" && c in WORDS;

function buildRound(row: QuestionRow): Round {
  const { word, choices } = (row.questionData ?? {}) as { word?: unknown; choices?: unknown };
  const answer = row.correctAnswer.answer;
  if (!isWord(word)) throw new Error(`Question ${row.questionKey} needs a known "word"`);
  if (!Array.isArray(choices) || choices.length < 2 || !choices.every(isWord) || new Set(choices).size !== choices.length || !choices.includes(answer) || choices.includes(word)) {
    throw new Error(`Question ${row.questionKey} needs different known "choices" that include its answer and not the word itself`);
  }
  // Exactly one picture may end like the word, so a right-sounding pick is never graded wrong.
  if (choices.filter((c) => WORDS[c].last === WORDS[word].last).join() !== answer) throw new Error(`Question ${row.questionKey} needs only its answer to end like ${word}`);
  return { key: row.questionKey, word, choices, answer };
}

function Kite() {
  return (
    <svg viewBox="0 0 120 150" className="absolute inset-0 size-full overflow-visible" aria-hidden>
      <path d="M60 4 L114 60 L60 146 L6 60 Z" fill="#ffd43b" stroke="#5f3dc4" strokeWidth="5" strokeLinejoin="round" />
      <path d="M60 4 L114 60 L60 60 Z" fill="#ff8787" />
      <path d="M60 60 L6 60 L60 146 Z" fill="#74c0fc" />
      <path d="M60 4 L114 60 L60 146 L6 60 Z" fill="none" stroke="#5f3dc4" strokeWidth="5" strokeLinejoin="round" />
      <path d="M60 4 L60 146 M6 60 L114 60" stroke="#5f3dc4" strokeWidth="3" />
    </svg>
  );
}

function Bow({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 140 90" className="absolute inset-0 size-full overflow-visible" aria-hidden>
      <path d="M70 45 L8 8 Q0 45 8 82 Z" fill={color} stroke="#343a40" strokeWidth="4" strokeLinejoin="round" />
      <path d="M70 45 L132 8 Q140 45 132 82 Z" fill={color} stroke="#343a40" strokeWidth="4" strokeLinejoin="round" />
      <path d="M22 26 L50 42 M118 26 L90 42" stroke="white" strokeOpacity="0.5" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export default function LastSoundFinder({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Last Sound Finder questions:", err);
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
  const title = activityName || "Last Sound Finder";
  const score = results.filter(Boolean).length;
  // The empty knot at the end of the kite's tail takes the right picture once it is found or shown.
  const tied = round && (picked !== null || reveal) ? round.answer : null;

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
    const prompt = promptSpeech(round.word, round.choices);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["last sound finder"], prompt]);
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
      speak(correctSpeech(round.word, round.answer), advance);
      return;
    }
    setWrong(i);
    const { word, answer } = round;
    timerRef.current = window.setTimeout(() => {
      setReveal(true);
      speak(revealSpeech(word, answer), advance, { minMs: REVEAL_MIN_MS });
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
      <div aria-hidden className={`${styles.cloud} pointer-events-none absolute left-[6%] top-[22%] h-[clamp(36px,7vh,64px)] w-[clamp(90px,18vh,160px)] rounded-full`} />
      <div aria-hidden className={`${styles.cloud} ${styles.cloudSlow} pointer-events-none absolute right-[4%] top-[40%] h-[clamp(30px,6vh,54px)] w-[clamp(76px,15vh,140px)] rounded-full`} />
      <div aria-hidden className={`${styles.hill} pointer-events-none absolute inset-x-[-10%] bottom-[-8%] h-[20%] rounded-[50%]`} />

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
            You tied {score} of {total} bows to the kite!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(95,61,196,0.3)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(15px,2.6vh,24px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.word, round.choices))}
              disabled={locked}
              aria-label="Hear the word again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main key={round.key} className="relative z-[1] flex min-h-0 w-full max-w-3xl flex-1 flex-col items-center justify-evenly py-1">
            {/* The kite carries the heard word; its tail ends in an empty knot where the matching bow gets tied. */}
            <div className="flex shrink-0 items-center gap-[clamp(6px,2vw,20px)]">
              <div className={`${styles.kite} relative shrink-0`} aria-label={`The word is ${WORDS[round.word].name}`}>
                <Kite />
                <span className={`${styles.kitePicture} absolute left-1/2 top-[40%] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full leading-none`}>{WORDS[round.word].emoji}</span>
              </div>
              <svg viewBox="0 0 120 40" className={`${styles.tail} shrink-0 overflow-visible`} aria-hidden>
                <path d="M0 20 Q 20 0 40 20 T 80 20 T 120 20" fill="none" stroke="#5f3dc4" strokeWidth="4" strokeDasharray="2 7" strokeLinecap="round" />
              </svg>
              <div
                className={cn(styles.knot, "flex shrink-0 items-center justify-center rounded-full leading-none", tied && styles.knotTied, reveal && styles.knotReveal)}
                aria-label={tied ? `The tail ends with ${WORDS[tied].name}` : "The end of the tail is empty"}
              >
                {tied ? WORDS[tied].emoji : "?"}
              </div>
            </div>

            <div className="relative flex w-full items-end justify-center gap-[clamp(8px,3vw,32px)]">
              {reveal && <p className={`${styles.revealNote} absolute -top-12 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              {round.choices.map((choice, i) => {
                const isAnswer = choice === round.answer;
                return (
                  <button
                    key={`${round.key}-${i}`}
                    type="button"
                    onClick={() => pick(i)}
                    disabled={locked}
                    aria-label={WORDS[choice].name}
                    style={{ "--sway-delay": `${i * -0.7}s` } as React.CSSProperties}
                    className={cn(
                      styles.bow,
                      "relative flex shrink-0 items-center justify-center disabled:cursor-default",
                      picked === i && styles.bowRight,
                      wrong === i && styles.bowWrong,
                      reveal && isAnswer && styles.bowReveal,
                      reveal && !isAnswer && wrong !== i && "opacity-50",
                    )}
                  >
                    <Bow color={BOW_COLORS[i % BOW_COLORS.length]} />
                    <span className={`${styles.bowPicture} pointer-events-none relative flex items-center justify-center rounded-full leading-none`}>{WORDS[choice].emoji}</span>
                    {wrong === i && (
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
