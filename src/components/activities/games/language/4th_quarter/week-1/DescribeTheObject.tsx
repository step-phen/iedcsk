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
  BADGE_COLORS,
  INSTRUCTION,
  LOADING,
  OBJECTS,
  REVEAL,
  choiceSpeech,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./DescribeTheObject.data";
import styles from "./DescribeTheObject.module.css";

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

// How long the wrong card shakes on its own before the right one lights up.
const WRONG_MS = 600;

const isObject = (o: unknown): o is string => typeof o === "string" && Object.hasOwn(OBJECTS, o);

function buildRound(row: QuestionRow): Round {
  const { target, choices } = (row.questionData ?? {}) as { target?: unknown; choices?: unknown };
  if (!isObject(target) || row.correctAnswer.answer !== target) throw new Error(`Question ${row.questionKey} needs a known object "target" that is its answer`);
  if (!Array.isArray(choices) || choices.length < 2 || !choices.every(isObject) || new Set(choices).size !== choices.length || !choices.includes(target)) {
    throw new Error(`Question ${row.questionKey} needs different known object "choices" that include its target`);
  }
  return { key: row.questionKey, target, choices };
}

export default function DescribeTheObject({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Describe the Object questions:", err);
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
  // The card whose sentence is being read aloud right now.
  const [lit, setLit] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);
  // A ref, not only state, so two taps landing in the same tick can't both answer.
  const lockedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const round = rounds?.[roundIndex];
  const title = activityName || "Describe the Object";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  // Reads the question, then each sentence while its card lights up; a tap interrupts it, which drops the rest of the chain.
  const readRound = useCallback(
    (r: Round) => {
      const step = (i: number) => {
        if (i >= r.choices.length) {
          setLit(null);
          return;
        }
        speak(choiceSpeech(i, r.choices[i]), () => step(i + 1), { onStart: () => setLit(i) });
      };
      speak(promptSpeech(r.target), () => step(0));
    },
    [speak],
  );

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["describe the object"]], () => readRound(round));
      return;
    }
    readRound(round);
    // speak/speakAll/readRound are stable; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const hearOne = (i: number) => {
    if (!round || lockedRef.current) return;
    speak(choiceSpeech(i, round.choices[i]), () => setLit(null), { onStart: () => setLit(i) });
  };

  const advance = useCallback(() => {
    setPicked(null);
    setWrong(null);
    setReveal(false);
    setLit(null);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
    lockedRef.current = false;
    setLocked(false);
  }, [roundIndex, total]);

  const pick = (i: number) => {
    if (!round || lockedRef.current) return;
    lockedRef.current = true;
    setLocked(true);
    setLit(null);
    const choice = round.choices[i];
    const earned = choice === round.target;
    answersRef.current = [...answersRef.current, { questionId: round.key, response: choice }];
    setResults((r) => [...r, earned]);
    if (earned) {
      setPicked(i);
      speak(correctSpeech(round.target, roundIndex), advance);
      return;
    }
    stop();
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

  const object = OBJECTS[round.target];

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      <div aria-hidden className={`${styles.floor} pointer-events-none absolute inset-x-0 bottom-0 h-[24%]`} />
      <div aria-hidden className={`${styles.curtain} pointer-events-none absolute inset-y-0 left-0 w-[9%]`} />
      <div aria-hidden className={`${styles.curtain} pointer-events-none absolute inset-y-0 right-0 w-[9%] scale-x-[-1]`} />
      <div aria-hidden className={`${styles.valance} pointer-events-none absolute inset-x-0 top-0 h-[clamp(16px,3vh,28px)]`} />

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
            You matched {score} of {total} objects!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(0,0,0,0.4)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => readRound(round)}
              disabled={locked}
              aria-label="Hear the sentences again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full max-w-5xl flex-1 flex-col items-center justify-evenly gap-[clamp(8px,2vh,20px)] px-[8%] py-2 landscape:flex-row">
            {/* The object stands on a pedestal in the spotlight. */}
            <div className="relative flex shrink-0 flex-col items-center">
              <div aria-hidden className={`${styles.spotlight} pointer-events-none absolute -top-[30%] left-1/2 h-[130%] w-[160%] -translate-x-1/2`} />
              <span role="img" aria-label={object.name} className={cn(styles.object, picked !== null && styles.objectBow, "relative leading-none")}>
                {object.emoji}
              </span>
              <div aria-hidden className={`${styles.pedestal} relative rounded-t-lg`} />
            </div>

            <div className="relative flex w-full max-w-xl flex-col gap-[clamp(6px,1.6vh,14px)]">
              {reveal && <p className={`${styles.revealNote} absolute -top-11 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              {round.choices.map((choice, i) => {
                const isTarget = choice === round.target;
                return (
                  <div
                    key={`${round.key}-${i}`}
                    className={cn(
                      styles.card,
                      "relative flex items-stretch rounded-2xl",
                      lit === i && styles.cardLit,
                      wrong === i && styles.cardWrong,
                      picked === i && styles.cardRight,
                      reveal && isTarget && styles.cardReveal,
                      reveal && !isTarget && wrong !== i && "opacity-50",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => pick(i)}
                      disabled={locked}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl py-[clamp(6px,1.4vh,12px)] pl-3 pr-1 text-left disabled:cursor-default"
                    >
                      <span aria-hidden className={`${styles.number} flex size-[clamp(34px,5.6vh,48px)] shrink-0 items-center justify-center rounded-full text-[clamp(18px,3vh,26px)] font-extrabold`} style={{ background: BADGE_COLORS[i % BADGE_COLORS.length] }}>
                        {i + 1}
                      </span>
                      <span className="text-[clamp(15px,2.6vh,24px)] font-bold leading-snug">{OBJECTS[choice].description}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => hearOne(i)}
                      disabled={locked}
                      aria-label={`Hear sentence ${i + 1}`}
                      className={`${styles.iconButton} m-2 flex size-10 shrink-0 items-center justify-center self-center rounded-full`}
                    >
                      <Volume2 size={18} strokeWidth={2.6} />
                    </button>
                    {wrong === i && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -left-2 -top-3 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
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
