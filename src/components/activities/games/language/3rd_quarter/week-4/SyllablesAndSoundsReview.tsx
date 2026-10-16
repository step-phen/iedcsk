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
  LOADING,
  REVEAL,
  SOUNDS,
  TASKS,
  WORDS,
  choiceName,
  correctSpeech,
  instruction,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type Task,
} from "./SyllablesAndSoundsReview.data";
import styles from "./SyllablesAndSoundsReview.module.css";

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

// How long the wrong card wobbles on its own before the right one lights up.
const WRONG_MS = 600;

// Spaces per row on the board; the second row runs back the other way like a real board game.
const ROW = 5;

const isWord = (c: unknown): c is string => typeof c === "string" && c in WORDS;
const isSmallLetter = (c: unknown): c is string => typeof c === "string" && /^[a-z]$/.test(c);
const isSyllable = (c: unknown): c is string => typeof c === "string" && c in SOUNDS;

function buildRound(row: QuestionRow): Round {
  const { task, target, choices } = (row.questionData ?? {}) as { task?: unknown; target?: unknown; choices?: unknown };
  const answer = row.correctAnswer.answer;
  if (!TASKS.includes(task as Task)) throw new Error(`Question ${row.questionKey} needs a known "task"`);
  const t = task as Task;
  const targetOk = t === "syllable" ? isSyllable(target) && target === answer : isWord(target);
  const fits = t === "syllable" ? isSyllable : t === "first-letter" ? isSmallLetter : isWord;
  if (!targetOk || !Array.isArray(choices) || choices.length < 2 || !choices.every(fits) || new Set(choices).size !== choices.length || !choices.includes(answer)) {
    throw new Error(`Question ${row.questionKey} needs a "target" and different "choices" that fit its task and include its answer`);
  }
  if (t === "first-letter" && answer !== (target as string)[0]) throw new Error(`Question ${row.questionKey} answer must be the first letter of its picture`);
  // Exactly one other picture may start like the heard word, so a right-sounding pick is never graded wrong.
  if (t === "first-sound" && (choices.includes(target as string) || choices.filter((c) => c[0] === (target as string)[0]).join() !== answer)) {
    throw new Error(`Question ${row.questionKey} needs only its answer to start like ${target as string}, and not the word itself`);
  }
  return { key: row.questionKey, task: t, target: target as string, choices, answer };
}

function Pawn() {
  return (
    <svg viewBox="0 0 60 80" className="size-full overflow-visible" aria-hidden>
      <ellipse cx="30" cy="74" rx="24" ry="6" fill="#c92a2a" stroke="#212529" strokeWidth="3" />
      <path d="M16 72 C 18 52, 24 44, 30 44 C 36 44, 42 52, 44 72 Z" fill="#fa5252" stroke="#212529" strokeWidth="3" />
      <circle cx="30" cy="28" r="18" fill="#fa5252" stroke="#212529" strokeWidth="3" />
      <circle cx="24" cy="22" r="5" fill="white" opacity="0.6" />
    </svg>
  );
}

export default function SyllablesAndSoundsReview({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Syllables and Sounds Review questions:", err);
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
  const title = activityName || "Syllables and Sounds Review";
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
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["syllables and sounds review"], prompt]);
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

  // The pawn stands on the space of the task being played, and stays on the last space once every task is done.
  const pawnAt = phase === "complete" ? total - 1 : roundIndex;

  const board = (
    <div className={`${styles.board} grid shrink-0 rounded-3xl`} style={{ gridTemplateColumns: `repeat(${ROW}, minmax(0, 1fr))` }} aria-label={`Game board, ${results.length} of ${total} spaces played`}>
      {rounds.map((r, i) => {
        const row = Math.floor(i / ROW);
        // Odd rows run right to left so the path snakes back like a real board.
        const col = row % 2 === 0 ? i % ROW : ROW - 1 - (i % ROW);
        const played = i < results.length;
        return (
          <div
            key={r.key}
            aria-hidden
            style={{ gridRow: row + 1, gridColumn: col + 1 }}
            className={cn(styles.space, "relative flex items-center justify-center rounded-full font-extrabold leading-none", played && (results[i] ? styles.spaceRight : styles.spaceMissed), i === pawnAt && styles.spaceNow)}
          >
            {played ? (results[i] ? "★" : "•") : i + 1}
            {i === pawnAt && (
              <span key={`pawn-${pawnAt}`} className={`${styles.pawn} pointer-events-none absolute bottom-[30%]`}>
                <Pawn />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
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

      <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(24px,5vh,42px)] font-extrabold leading-tight`}>{title}</h1>

      {phase === "complete" ? (
        <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(10px,2.4vh,22px)] text-center">
          {board}
          <div className="flex items-center gap-3">
            <div className={`${styles.resultStamp} rounded-2xl px-[clamp(14px,3vw,30px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You got {score} of {total} right!
          </p>
          <div className="flex max-w-[92vw] flex-wrap items-center justify-center gap-[clamp(4px,1.2vw,12px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(28px,6vh,56px)] object-contain drop-shadow-[0_4px_3px_rgba(0,0,0,0.3)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(15px,2.6vh,24px)] font-extrabold leading-tight`}>{instruction(round.task)}</p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.task, round.target, round.choices))}
              disabled={locked}
              aria-label="Hear the question again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(8px,2.2vh,22px)] py-2">
            {board}

            {/* The task card drawn for this space: an ear for sounds to hear, plus the picture when there is one. */}
            <div key={round.key} className={`${styles.card} relative flex shrink-0 flex-col items-center gap-[clamp(8px,2vh,18px)] rounded-3xl`}>
              <div className={`${styles.cue} flex items-center justify-center gap-3 leading-none`} aria-label={round.task === "syllable" ? "Listen" : WORDS[round.target].name}>
                {round.task !== "first-letter" && <span aria-hidden>👂</span>}
                {round.task !== "syllable" && <span aria-hidden>{WORDS[round.target].emoji}</span>}
              </div>

              <div className="relative">
                {reveal && <p className={`${styles.revealNote} absolute -top-11 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(14px,2.4vh,20px)] font-extrabold`}>{REVEAL}</p>}
                <div className="flex items-center justify-center gap-[clamp(8px,2.4vw,22px)]">
                  {round.choices.map((choice, i) => {
                    const isAnswer = choice === round.answer;
                    return (
                      <button
                        key={`${round.key}-${i}`}
                        type="button"
                        onClick={() => pick(i)}
                        disabled={locked}
                        aria-label={choiceName(round.task, choice)}
                        style={{ "--deal-delay": `${i * 90}ms` } as React.CSSProperties}
                        className={cn(
                          styles.choice,
                          "relative flex shrink-0 items-center justify-center rounded-2xl font-extrabold leading-none disabled:cursor-default",
                          round.task === "first-sound" && styles.choicePicture,
                          wrong === i && styles.choiceWrong,
                          picked === i && styles.choiceRight,
                          reveal && isAnswer && styles.choiceReveal,
                          reveal && !isAnswer && wrong !== i && "opacity-50",
                        )}
                      >
                        <span className="pointer-events-none">{round.task === "first-sound" ? WORDS[choice].emoji : choice}</span>
                        {wrong === i && (
                          <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-full text-lg font-extrabold leading-none`}>
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
