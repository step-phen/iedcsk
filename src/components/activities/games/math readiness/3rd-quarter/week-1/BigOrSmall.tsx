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
  EATERS,
  SNACKS,
  correctSpeech,
  instruction,
  isSize,
  isSnack,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type Size,
} from "./BigOrSmall.data";
import styles from "./BigOrSmall.module.css";

const SNACK_FONT: Record<Size, string> = {
  big: "clamp(96px, 22vh, 180px)",
  small: "clamp(34px, 7vh, 58px)",
};

interface Round {
  key: string;
  snack: keyof typeof SNACKS;
  ask: Size;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

function buildRound(row: QuestionRow): Round {
  const { object, ask } = row.questionData as { object: unknown; ask: unknown };
  if (!isSnack(object)) throw new Error(`Question ${row.questionKey} needs a known "object"`);
  if (!isSize(ask) || row.correctAnswer.answer !== ask) throw new Error(`Question ${row.questionKey} needs an "ask" of big or small that matches its answer`);
  return { key: row.questionKey, snack: object, ask };
}

export default function BigOrSmall({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Big or Small questions:", err);
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
  const [picked, setPicked] = useState<Size | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Big or Small?";
  const score = results.filter(Boolean).length;

  // The big snack swaps sides across rounds, so position never gives the answer away.
  const order: Size[] = roundIndex % 3 === 1 ? ["big", "small"] : ["small", "big"];

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
    const prompt = promptSpeech(round.ask, round.snack);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["big or small"], prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  const tapSnack = useCallback(
    (size: Size) => {
      if (!round || picked) return;
      const correct = size === round.ask;
      setPicked(size);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: size }];
      setResults((r) => [...r, correct]);
      speak(correct ? correctSpeech(round.ask, round.snack) : revealSpeech(round.ask, round.snack), advance, correct ? undefined : { minMs: REVEAL_MIN_MS });
    },
    [round, picked, speak, advance],
  );

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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Getting the snacks ready…</p>
      </div>
    );
  }

  const eater = EATERS[round.ask];
  const snack = SNACKS[round.snack];
  const pickedRight = picked === round.ask;

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
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

      <h1 className="relative z-[1] m-0 shrink-0 text-center text-[clamp(26px,5.5vh,46px)] font-extrabold leading-tight drop-shadow-[0_2px_0_white]">{title}</h1>

      {phase === "complete" ? (
        <div className={`${styles.result} relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center`}>
          <div className="flex items-center gap-3">
            <div className={`${styles.resultStamp} rounded-md px-[clamp(14px,3vw,30px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You fed {score} of {total} hungry friends!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(34,49,79,0.25)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{instruction(round.ask, round.snack)}</p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.ask, round.snack))}
              disabled={!!picked}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-evenly">
            <div className="flex items-end gap-3">
              <span
                aria-hidden
                className={cn(styles.eater, pickedRight && styles.eaterChomp, "leading-none")}
                style={{ fontSize: round.ask === "big" ? "clamp(80px, 17vh, 140px)" : "clamp(52px, 10vh, 84px)" }}
              >
                {eater.emoji}
              </span>
              <div className={`${styles.bubble} mb-[clamp(20px,5vh,48px)] rounded-3xl px-5 py-2 font-extrabold uppercase leading-none`}>
                <span style={{ fontSize: round.ask === "big" ? "clamp(32px, 6.4vh, 56px)" : "clamp(16px, 3vh, 24px)" }}>{round.ask}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-[clamp(18px,5vw,56px)]">
              {order.map((size) => {
                const isPicked = picked === size;
                const isAnswer = size === round.ask;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => tapSnack(size)}
                    disabled={!!picked}
                    aria-label={`${size} ${snack.name}`}
                    className={cn(
                      styles.plate,
                      "relative flex size-[clamp(150px,30vh,250px)] shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] disabled:cursor-default",
                      isPicked && !isAnswer && styles.plateWrong,
                      picked && isAnswer && (pickedRight ? styles.plateCorrect : styles.plateReveal),
                    )}
                  >
                    <span aria-hidden className={cn(styles.snack, isPicked && isAnswer && styles.snackEaten, "leading-none")} style={{ fontSize: SNACK_FONT[size] }}>
                      {snack.emoji}
                    </span>
                    {isPicked && !isAnswer && (
                      <span aria-hidden className={`${styles.wrongMark} absolute right-1 top-1 flex size-11 items-center justify-center rounded-full text-2xl font-extrabold leading-none`}>
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
