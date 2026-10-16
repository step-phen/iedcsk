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
  BELT_COPIES,
  INSTRUCTION,
  LOADING,
  REVEAL,
  WORDS,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./FirstSoundFinder.data";
import styles from "./FirstSoundFinder.module.css";

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

// How long the wrong crate rattles on its own before the right one lights up.
const WRONG_MS = 600;

const isWord = (c: unknown): c is string => typeof c === "string" && c in WORDS;

function buildRound(row: QuestionRow): Round {
  const { word, choices } = (row.questionData ?? {}) as { word?: unknown; choices?: unknown };
  const answer = row.correctAnswer.answer;
  if (!isWord(word)) throw new Error(`Question ${row.questionKey} needs a known "word"`);
  if (!Array.isArray(choices) || choices.length < 2 || !choices.every(isWord) || new Set(choices).size !== choices.length || !choices.includes(answer) || choices.includes(word)) {
    throw new Error(`Question ${row.questionKey} needs different known "choices" that include its answer and not the word itself`);
  }
  // Exactly one picture may start like the word, so a right-sounding pick is never graded wrong.
  if (choices.filter((c) => c[0] === word[0]).join() !== answer) throw new Error(`Question ${row.questionKey} needs only its answer to start like ${word}`);
  return { key: row.questionKey, word, choices, answer };
}

function Gear({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path
        d="M44 4 L56 4 L58 16 L68 20 L78 12 L88 22 L80 32 L84 42 L96 44 L96 56 L84 58 L80 68 L88 78 L78 88 L68 80 L58 84 L56 96 L44 96 L42 84 L32 80 L22 88 L12 78 L20 68 L16 58 L4 56 L4 44 L16 42 L20 32 L12 22 L22 12 L32 20 L42 16 Z"
        fill="#adb5bd"
        stroke="#495057"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="50" r="14" fill="#495057" />
    </svg>
  );
}

export default function FirstSoundFinder({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load First Sound Finder questions:", err);
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
  // Which crate on the belt was tapped; the belt repeats the choices, so this is the copy, not the choice.
  const [pickedCrate, setPickedCrate] = useState<number | null>(null);
  const [wrongCrate, setWrongCrate] = useState<number | null>(null);
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
  const title = activityName || "First Sound Finder";
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
    const prompt = promptSpeech(round.word, round.choices);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["first sound finder"], prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPickedCrate(null);
    setWrongCrate(null);
    setReveal(false);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
    lockedRef.current = false;
    setLocked(false);
  }, [roundIndex, total]);

  const pick = (crate: number) => {
    if (!round || lockedRef.current) return;
    lockedRef.current = true;
    setLocked(true);
    const choice = round.choices[crate % round.choices.length];
    const earned = choice === round.answer;
    answersRef.current = [...answersRef.current, { questionId: round.key, response: choice }];
    setResults((r) => [...r, earned]);
    if (earned) {
      setPickedCrate(crate);
      speak(correctSpeech(round.word, round.answer), advance);
      return;
    }
    setWrongCrate(crate);
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

  const crates = Array.from({ length: round.choices.length * BELT_COPIES }, (_, crate) => crate);

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      <div aria-hidden className={`${styles.pipes} pointer-events-none absolute inset-x-0 top-0 h-[16%]`} />
      <div aria-hidden className={`${styles.floor} pointer-events-none absolute inset-x-0 bottom-0 h-[14%]`} />

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
            You found {score} of {total} first sounds!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(0,0,0,0.3)]" />
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

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(10px,3vh,28px)] py-2">
            {/* The sound machine's screen shows the word the child hears. */}
            <div key={round.key} className={`${styles.machine} relative flex shrink-0 items-center justify-center gap-[6%] rounded-3xl`} aria-label={`The word is ${WORDS[round.word].name}`}>
              <Gear className={`${styles.gear} ${styles.gearLeft} absolute`} />
              <Gear className={`${styles.gear} ${styles.gearRight} absolute`} />
              <span aria-hidden className={`${styles.ear} leading-none`}>👂</span>
              <span className={`${styles.screenPanel} flex items-center justify-center rounded-2xl leading-none`}>{WORDS[round.word].emoji}</span>
            </div>

            <div className="relative w-full">
              {reveal && <p className={`${styles.revealNote} absolute -top-12 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              {/* The conveyor belt loops the choices past the child; it stops as soon as a crate is tapped. */}
              <div className={`${styles.belt} relative w-full overflow-hidden`}>
                <div key={round.key} className={cn(styles.track, "flex w-max items-center", locked && styles.trackPaused)}>
                  {crates.map((crate) => {
                    const choice = round.choices[crate % round.choices.length];
                    const isAnswer = choice === round.answer;
                    return (
                      <button
                        key={`${round.key}-${crate}`}
                        type="button"
                        onClick={() => pick(crate)}
                        disabled={locked}
                        aria-label={WORDS[choice].name}
                        aria-hidden={crate >= round.choices.length ? true : undefined}
                        tabIndex={crate >= round.choices.length ? -1 : undefined}
                        className={cn(
                          styles.crate,
                          crate >= round.choices.length && styles.crateCopy,
                          "relative flex shrink-0 items-center justify-center rounded-2xl leading-none disabled:cursor-default",
                          wrongCrate === crate && styles.crateWrong,
                          pickedCrate === crate && styles.crateRight,
                          reveal && isAnswer && styles.crateReveal,
                          reveal && !isAnswer && wrongCrate !== crate && "opacity-50",
                        )}
                      >
                        <span className="pointer-events-none">{WORDS[choice].emoji}</span>
                        {wrongCrate === crate && (
                          <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-1 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                            ✕
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div aria-hidden className={cn(styles.rollers, "pointer-events-none absolute inset-x-0 bottom-0", locked && styles.trackPaused)} />
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
