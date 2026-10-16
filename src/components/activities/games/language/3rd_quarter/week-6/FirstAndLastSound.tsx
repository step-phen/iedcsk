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
  LETTER_SOUNDS,
  LOADING,
  PASSENGERS,
  REVEAL,
  WORDS,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./FirstAndLastSound.data";
import styles from "./FirstAndLastSound.module.css";

interface Round {
  key: string;
  word: string;
  position: "first" | "last";
  choices: string[];
  answer: string;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

// How long the wrong passenger waves on their own before the right one lights up.
const WRONG_MS = 600;

const isLetter = (c: unknown): c is string => typeof c === "string" && c in LETTER_SOUNDS;

function buildRound(row: QuestionRow): Round {
  const { word, position, choices } = (row.questionData ?? {}) as { word?: unknown; position?: unknown; choices?: unknown };
  const answer = row.correctAnswer.answer;
  if (typeof word !== "string" || !(word in WORDS)) throw new Error(`Question ${row.questionKey} needs a known "word"`);
  if (position !== "first" && position !== "last") throw new Error(`Question ${row.questionKey} needs a "position" of first or last`);
  if (answer !== (position === "first" ? word[0] : word.at(-1))) throw new Error(`Question ${row.questionKey} answer must be the ${position} letter of ${word}`);
  if (!Array.isArray(choices) || choices.length < 2 || !choices.every(isLetter) || new Set(choices).size !== choices.length || !choices.includes(answer)) {
    throw new Error(`Question ${row.questionKey} needs different known letter "choices" that include its answer`);
  }
  return { key: row.questionKey, word, position, choices, answer };
}

export default function FirstAndLastSound({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load First and Last Sound questions:", err);
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
  const title = activityName || "First and Last Sound";
  const score = results.filter(Boolean).length;
  // The empty window is the front one for a first sound and the back one for a last sound.
  const gap = round ? (round.position === "first" ? 0 : round.word.length - 1) : -1;
  const boarded = picked !== null || reveal;

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
    const prompt = promptSpeech(round.word, round.position);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["first and last sound"], prompt]);
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
      speak(correctSpeech(round.word, round.position, round.answer), advance);
      return;
    }
    setWrong(i);
    const { word, position, answer } = round;
    timerRef.current = window.setTimeout(() => {
      setReveal(true);
      speak(revealSpeech(word, position, answer), advance, { minMs: REVEAL_MIN_MS });
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
      <div aria-hidden className={`${styles.road} pointer-events-none absolute inset-x-0 bottom-0 h-[30%]`} />

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
            You found {score} of {total} sounds!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(52,58,64,0.35)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(15px,2.6vh,24px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.word, round.position))}
              disabled={locked}
              aria-label="Hear the word again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          {/* The word rides the bus one letter per window; the missing first or last seat waits for the right passenger. */}
          <main key={round.key} className="relative z-[1] flex min-h-0 w-full max-w-4xl flex-1 flex-col items-center justify-evenly py-1">
            <div className={`${styles.bus} relative flex shrink-0 flex-col`} aria-label={`The bus carries ${WORDS[round.word].name}`}>
              <span className={`${styles.roofSign} absolute left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl px-3 leading-none`}>
                <span className={styles.signPicture}>{WORDS[round.word].emoji}</span>
                <span className={`${styles.signTag} rounded-full px-2 py-0.5 font-extrabold uppercase`}>{round.position}</span>
              </span>
              <div className="flex flex-1 items-center gap-[4%] pl-[4%] pr-[5%]">
                <span aria-hidden className={`${styles.windshield} shrink-0 self-stretch`} />
                {[...round.word].map((letter, i) => {
                  const empty = i === gap;
                  return (
                    <span
                      key={i}
                      className={cn(
                        styles.window,
                        "flex flex-1 items-center justify-center rounded-xl font-extrabold leading-none",
                        empty && styles.windowEmpty,
                        empty && boarded && styles.windowFilled,
                        empty && reveal && styles.windowReveal,
                      )}
                    >
                      {empty ? (boarded ? round.answer : "?") : letter}
                    </span>
                  );
                })}
              </div>
              <span aria-hidden className={`${styles.wheel} absolute left-[16%]`} />
              <span aria-hidden className={`${styles.wheel} absolute right-[14%]`} />
            </div>

            <div className="relative flex w-full shrink-0 items-end justify-center gap-[clamp(10px,4vw,40px)]">
              {reveal && <p className={`${styles.revealNote} absolute -top-12 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              {round.choices.map((letter, i) => {
                const isAnswer = letter === round.answer;
                return (
                  <button
                    key={`${round.key}-${i}`}
                    type="button"
                    onClick={() => pick(i)}
                    disabled={locked}
                    aria-label={`Passenger with the letter ${letter}`}
                    className={cn(
                      styles.passenger,
                      "relative flex shrink-0 flex-col items-center disabled:cursor-default",
                      picked === i && styles.passengerRight,
                      wrong === i && styles.passengerWrong,
                      reveal && isAnswer && styles.passengerReveal,
                      reveal && !isAnswer && wrong !== i && "opacity-50",
                    )}
                  >
                    <span className={`${styles.person} pointer-events-none leading-none`}>{PASSENGERS[i % PASSENGERS.length]}</span>
                    <span className={`${styles.card} pointer-events-none flex items-center justify-center rounded-xl font-extrabold leading-none`}>{letter}</span>
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
