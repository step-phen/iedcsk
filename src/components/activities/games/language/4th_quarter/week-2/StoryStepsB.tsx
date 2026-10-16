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
  ASKS,
  ASSETS,
  INSTRUCTION,
  LOADING,
  REVEAL,
  STONE_COLORS,
  STORIES,
  type Ask,
  type Step,
  correctSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  storySpeech,
} from "./StoryStepsB.data";
import styles from "./StoryStepsB.module.css";

interface Round {
  key: string;
  story: string;
  ask: Ask;
  choices: Step[];
  answer: Step;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

// How long the wrong stone shakes on its own before the right one glows.
const WRONG_MS = 600;

const isAsk = (a: unknown): a is Ask => ASKS.includes(a as Ask);

function buildRound(row: QuestionRow): Round {
  const { story, ask, choices } = (row.questionData ?? {}) as { story?: unknown; ask?: unknown; choices?: unknown };
  if (typeof story !== "string" || !Object.hasOwn(STORIES, story) || !isAsk(ask)) {
    throw new Error(`Question ${row.questionKey} needs a known "story" and an "ask" of first, next or last`);
  }
  const steps = STORIES[story];
  const answer = steps[ASKS.indexOf(ask)];
  if (row.correctAnswer.answer !== answer.id) throw new Error(`Question ${row.questionKey} needs ${answer.id}, the ${ask} event, as its answer`);
  if (!Array.isArray(choices) || choices.length < 2 || new Set(choices).size !== choices.length || !choices.includes(answer.id) || !choices.every((c) => steps.some((s) => s.id === c))) {
    throw new Error(`Question ${row.questionKey} needs different "choices" from the ${story} story that include its answer`);
  }
  return { key: row.questionKey, story, ask, choices: choices.map((c) => steps.find((s) => s.id === c)!), answer };
}

export default function StoryStepsB({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Story Steps B questions:", err);
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
  const title = activityName || "Story Steps B";
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
    const story = storySpeech(round.story, round.ask);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["story steps b"], ...story]);
      return;
    }
    speakAll(story);
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
    const earned = choice.id === round.answer.id;
    answersRef.current = [...answersRef.current, { questionId: round.key, response: choice.id }];
    setResults((r) => [...r, earned]);
    if (earned) {
      setPicked(i);
      speak(correctSpeech(round.answer, round.ask, roundIndex), advance);
      return;
    }
    stop();
    setWrong(i);
    const { answer, ask } = round;
    timerRef.current = window.setTimeout(() => {
      setReveal(true);
      speak(revealSpeech(answer, ask), advance, { minMs: REVEAL_MIN_MS });
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
      <div aria-hidden className={`${styles.stars} pointer-events-none absolute inset-0`} />
      <div aria-hidden className={`${styles.hills} pointer-events-none absolute inset-x-0 bottom-0 h-[22%]`} />

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
            You answered {score} of {total} story questions!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_0_10px_rgba(255,183,77,0.6)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(15px,2.6vh,24px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speakAll(storySpeech(round.story, round.ask))}
              disabled={locked}
              aria-label="Hear the story again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          {/* Three painted story stones sit around the campfire; the question glows above the flames. */}
          <main key={round.key} className="relative z-[1] flex min-h-0 w-full max-w-4xl flex-1 flex-col items-center justify-evenly gap-[clamp(6px,2vh,18px)] py-2">
            <div className={`${styles.question} flex shrink-0 flex-col items-center gap-1 rounded-3xl px-6 py-2`}>
              <p className="m-0 text-center text-[clamp(20px,4vh,36px)] font-extrabold leading-tight">
                What happened <span className={styles.askWord}>{round.ask}</span>?
              </p>
              <div className="flex items-center gap-3" aria-hidden>
                {ASKS.map((a) => (
                  <span key={a} className={cn(styles.ember, "rounded-full px-3 text-[clamp(12px,2vh,17px)] font-bold uppercase tracking-wider", a === round.ask && styles.emberLit)}>
                    {a}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative flex w-full shrink-0 items-end justify-center gap-[clamp(10px,4vw,44px)]">
              {reveal && <p className={`${styles.revealNote} absolute -top-12 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              {round.choices.map((step, i) => {
                const isAnswer = step.id === round.answer.id;
                return (
                  <button
                    key={`${round.key}-${step.id}`}
                    type="button"
                    onClick={() => pick(i)}
                    disabled={locked}
                    aria-label={step.name}
                    style={{ background: STONE_COLORS[i % STONE_COLORS.length] }}
                    className={cn(
                      styles.stone,
                      "relative flex shrink-0 items-center justify-center disabled:cursor-default",
                      i === 1 && "mb-[clamp(10px,4dvh,40px)]",
                      picked === i && styles.stoneRight,
                      wrong === i && styles.stoneWrong,
                      reveal && isAnswer && styles.stoneReveal,
                      reveal && !isAnswer && wrong !== i && "opacity-50",
                    )}
                  >
                    <span className={`${styles.picture} pointer-events-none leading-none`}>{step.emoji}</span>
                    {wrong === i && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-1 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div aria-hidden className="relative flex shrink-0 flex-col items-center">
              <div className={`${styles.fire} relative`}>
                <span className={`${styles.flame} absolute bottom-0 left-1/2`} />
                <span className={`${styles.flame} ${styles.flameSmall} absolute bottom-0 left-1/2`} />
              </div>
              <div className={`${styles.logs} -mt-1`} />
            </div>
          </main>
        </>
      )}
    </div>
  );
}
