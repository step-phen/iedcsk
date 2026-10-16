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
  BUBBLE_TINTS,
  EXPRESSIONS,
  INSTRUCTION,
  LOADING,
  REVEAL,
  SCENES,
  choiceSpeech,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./NeedsAndFeelings.data";
import styles from "./NeedsAndFeelings.module.css";

interface Round {
  key: string;
  scene: string;
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

// How long the wrong bubble shakes on its own before the right one lights up.
const WRONG_MS = 600;

const isExpression = (c: unknown): c is string => typeof c === "string" && Object.hasOwn(EXPRESSIONS, c);

function buildRound(row: QuestionRow): Round {
  const { scene, choices } = (row.questionData ?? {}) as { scene?: unknown; choices?: unknown };
  if (typeof scene !== "string" || !Object.hasOwn(SCENES, scene) || !isExpression(scene) || row.correctAnswer.answer !== scene) {
    throw new Error(`Question ${row.questionKey} needs a known "scene" that is its answer`);
  }
  if (!Array.isArray(choices) || choices.length < 2 || !choices.every(isExpression) || new Set(choices).size !== choices.length || !choices.includes(scene)) {
    throw new Error(`Question ${row.questionKey} needs different known "choices" that include its answer`);
  }
  return { key: row.questionKey, scene, choices };
}

export default function NeedsAndFeelings({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Needs and Feelings questions:", err);
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
  // The bubble whose sentence is being read aloud right now.
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
  const title = activityName || "Needs and Feelings";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  // Tells the scene, then reads each bubble while it lights up; a tap interrupts it, which drops the rest of the chain.
  const readRound = useCallback(
    (r: Round) => {
      const step = (i: number) => {
        if (i >= r.choices.length) {
          setLit(null);
          return;
        }
        speak(choiceSpeech(i, r.choices[i]), () => step(i + 1), { onStart: () => setLit(i) });
      };
      speak(promptSpeech(r.scene), () => step(0));
    },
    [speak],
  );

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["needs and feelings"]], () => readRound(round));
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
    const earned = choice === round.scene;
    answersRef.current = [...answersRef.current, { questionId: round.key, response: choice }];
    setResults((r) => [...r, earned]);
    if (earned) {
      setPicked(i);
      speak(correctSpeech(round.scene, roundIndex), advance);
      return;
    }
    stop();
    setWrong(i);
    const { scene } = round;
    timerRef.current = window.setTimeout(() => {
      setReveal(true);
      speak(revealSpeech(scene), advance, { minMs: REVEAL_MIN_MS });
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

  const scene = SCENES[round.scene];

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      <div aria-hidden className={`${styles.wallpaper} pointer-events-none absolute inset-0`} />

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
            You chose {score} of {total} right!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(95,61,196,0.35)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(15px,2.6vh,24px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => readRound(round)}
              disabled={locked}
              aria-label="Hear it all again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main key={round.key} className="relative z-[1] flex min-h-0 w-full max-w-5xl flex-1 flex-col items-center justify-evenly gap-[clamp(6px,2vh,18px)] py-2 landscape:flex-row">
            {/* The scene shows through a round window with curtains tied back. */}
            <div className={`${styles.window} relative shrink-0 rounded-full`}>
              <div role="img" aria-label={scene.caption} className="relative size-full overflow-hidden rounded-full" style={{ background: scene.backdrop }}>
                {scene.parts.map((part, i) => (
                  <span
                    key={i}
                    aria-hidden
                    className="absolute -translate-x-1/2 -translate-y-1/2 leading-none"
                    style={{ left: `${part.x}%`, top: `${part.y}%`, fontSize: `calc(var(--w) * ${part.size})` }}
                  >
                    {part.emoji}
                  </span>
                ))}
              </div>
              <span aria-hidden className={`${styles.cross} pointer-events-none absolute inset-0 rounded-full`} />
            </div>

            <div className="relative flex w-full max-w-xl flex-col gap-[clamp(6px,1.6vh,14px)]">
              {reveal && <p className={`${styles.revealNote} absolute -top-11 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              {round.choices.map((choice, i) => {
                const isAnswer = choice === round.scene;
                return (
                  <div
                    key={`${round.key}-${choice}`}
                    style={{ background: BUBBLE_TINTS[i % BUBBLE_TINTS.length] }}
                    className={cn(
                      styles.bubble,
                      "relative flex items-stretch",
                      lit === i && styles.bubbleLit,
                      wrong === i && styles.bubbleWrong,
                      picked === i && styles.bubbleRight,
                      reveal && isAnswer && styles.bubbleReveal,
                      reveal && !isAnswer && wrong !== i && "opacity-50",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => pick(i)}
                      disabled={locked}
                      className="flex min-w-0 flex-1 items-center gap-3 py-[clamp(6px,1.4vh,12px)] pl-3 pr-1 text-left disabled:cursor-default"
                    >
                      <span aria-hidden className={`${styles.face} shrink-0 leading-none`}>{EXPRESSIONS[choice].face}</span>
                      <span className="text-[clamp(15px,2.6vh,24px)] font-bold leading-snug">
                        <span className="sr-only">Number {i + 1}. </span>
                        {EXPRESSIONS[choice].sentence}
                      </span>
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
