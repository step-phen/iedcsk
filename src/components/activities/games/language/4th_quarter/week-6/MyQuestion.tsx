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
  QUESTIONS,
  REVEAL,
  SCENES,
  choiceSpeech,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./MyQuestion.data";
import styles from "./MyQuestion.module.css";

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

// How long the wrong card shakes on its own before the right one lights up.
const WRONG_MS = 600;

const MIC_TINTS: Record<string, string> = { Who: styles.micWho, What: styles.micWhat, Where: styles.micWhere };

const isQuestion = (c: unknown): c is string => typeof c === "string" && Object.hasOwn(QUESTIONS, c);

function buildRound(row: QuestionRow): Round {
  const { scene, choices } = (row.questionData ?? {}) as { scene?: unknown; choices?: unknown };
  if (typeof scene !== "string" || !Object.hasOwn(SCENES, scene) || row.correctAnswer.answer !== SCENES[scene].question) {
    throw new Error(`Question ${row.questionKey} needs a known "scene" whose question is its answer`);
  }
  if (!Array.isArray(choices) || choices.length < 2 || !choices.every(isQuestion) || new Set(choices).size !== choices.length || !choices.includes(SCENES[scene].question)) {
    throw new Error(`Question ${row.questionKey} needs different known "choices" that include its answer`);
  }
  return { key: row.questionKey, scene, choices };
}

export default function MyQuestion({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load My Question questions:", err);
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
  // The card whose question is being read aloud right now.
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
  const title = activityName || "My Question";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  // Tells the picture, then reads each card while its microphone lights up; a tap interrupts it, which drops the rest of the chain.
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
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["my question"]], () => readRound(round));
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
    const earned = choice === SCENES[round.scene].question;
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
        <p className={`${styles.pill} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!rounds || !round) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 font-baloo2`}>
        <p className={`${styles.pill} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>{LOADING}</p>
      </div>
    );
  }

  const scene = SCENES[round.scene];
  const answered = picked !== null || reveal;

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      <div aria-hidden className={`${styles.studio} pointer-events-none absolute inset-0`} />

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
          <span aria-hidden className={`${styles.onAir} rounded-lg px-4 py-1 text-[clamp(16px,3vh,26px)] font-extrabold tracking-widest`}>THAT&apos;S A WRAP</span>
          <div className="flex items-center gap-3">
            <div className={`${styles.headline} rounded-2xl px-[clamp(14px,3vw,30px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You chose {score} of {total} right!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(8,47,73,0.45)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(15px,2.6vh,24px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
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

          <main key={round.key} className="relative z-[1] flex min-h-0 w-full max-w-4xl flex-1 flex-col items-center justify-evenly gap-[clamp(8px,2vh,18px)] py-2">
            {/* The picture shows on a camera viewfinder under an ON AIR light. */}
            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <span aria-hidden className={cn(styles.onAir, "rounded-md px-3 text-[clamp(11px,1.8vh,16px)] font-extrabold tracking-widest", answered && styles.onAirLive)}>ON AIR</span>
              <div className={`${styles.camera} relative rounded-[18px] p-[clamp(6px,1.2vh,12px)]`}>
                <div
                  role="img"
                  aria-label={scene.caption}
                  className={`${styles.viewfinder} relative aspect-[4/3] h-[min(34dvh,52vw)] overflow-hidden rounded-xl [--h:min(34dvh,52vw)] short:h-[30dvh] short:[--h:30dvh]`}
                  style={{ background: scene.backdrop }}
                >
                  {scene.parts.map((part, i) => (
                    <span
                      key={i}
                      aria-hidden
                      className="absolute -translate-x-1/2 -translate-y-1/2 leading-none"
                      style={{ left: `${part.x}%`, top: `${part.y}%`, fontSize: `calc(var(--h) * ${part.size})` }}
                    >
                      {part.emoji}
                    </span>
                  ))}
                  <span aria-hidden className={`${styles.brackets} pointer-events-none absolute inset-2`} />
                  <span aria-hidden className={`${styles.rec} absolute left-3 top-2 flex items-center gap-1 text-xs font-extrabold`}>REC</span>
                </div>
              </div>
            </div>

            <div className="relative grid w-full grid-cols-3 gap-[clamp(6px,1.6vw,16px)]">
              {reveal && <p className={`${styles.revealNote} absolute -top-11 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              {round.choices.map((choice, i) => {
                const isAnswer = choice === scene.question;
                const q = QUESTIONS[choice];
                return (
                  <div
                    key={`${round.key}-${choice}`}
                    className={cn(
                      styles.card,
                      "relative flex flex-col items-center rounded-2xl",
                      lit === i && styles.cardLit,
                      wrong === i && styles.cardWrong,
                      picked === i && styles.cardRight,
                      reveal && isAnswer && styles.cardReveal,
                      reveal && !isAnswer && wrong !== i && "opacity-50",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => pick(i)}
                      disabled={locked}
                      className="flex w-full flex-1 flex-col items-center gap-[clamp(2px,0.8vh,8px)] px-2 pt-[clamp(6px,1.4vh,12px)] text-center disabled:cursor-default"
                    >
                      <span aria-hidden className={cn(styles.mic, MIC_TINTS[q.word], "flex size-[clamp(40px,8vh,64px)] items-center justify-center rounded-full")}>
                        <span className={`${styles.micWord} rounded-full px-1.5 text-[clamp(11px,1.8vh,15px)] font-extrabold uppercase leading-tight`}>{q.word}</span>
                      </span>
                      <span className="text-[clamp(14px,2.5vh,22px)] font-bold leading-tight">
                        <span className="sr-only">Question {i + 1}. </span>
                        {q.text}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => hearOne(i)}
                      disabled={locked}
                      aria-label={`Hear question ${i + 1}`}
                      className={`${styles.iconButton} my-[clamp(4px,1vh,8px)] flex size-9 shrink-0 items-center justify-center rounded-full`}
                    >
                      <Volume2 size={16} strokeWidth={2.6} />
                    </button>
                    {wrong === i && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-3 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
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
