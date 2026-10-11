"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, REVEAL_MIN_MS } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import { ASSETS, INSTRUCTION, OBJECTS, REVEAL_TEXT, correctSpeech, isObject, promptSpeech, resultHeadline, resultSpeech, revealSpeech } from "./CountAndAdd.data";
import styles from "./CountAndAdd.module.css";

interface Round {
  key: string;
  object: keyof typeof OBJECTS;
  groupA: number;
  groupB: number;
  choices: number[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

const isCount = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 9;

function buildRound(row: QuestionRow): Round {
  const d = row.questionData as Record<string, unknown>;
  if (!isObject(d.object)) throw new Error(`Question ${row.questionKey} needs a known "object"`);
  if (!isCount(d.groupA) || !isCount(d.groupB)) throw new Error(`Question ${row.questionKey} needs "groupA" and "groupB" from 1 to 9`);
  const total = d.groupA + d.groupB;
  const choices = Array.isArray(d.choices) ? d.choices : [];
  if (choices.length < 2 || !choices.every((c) => Number.isInteger(c)) || !choices.includes(total)) {
    throw new Error(`Question ${row.questionKey} needs numeral "choices" that include the sum`);
  }
  if (row.correctAnswer.answer !== String(total)) throw new Error(`Question ${row.questionKey}'s answer must be the sum of its two groups`);
  return { key: row.questionKey, object: d.object, groupA: d.groupA, groupB: d.groupB, choices: choices as number[] };
}

export default function CountAndAdd({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Count and Add questions:", err);
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
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Count and Add";
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
    const prompt = promptSpeech(OBJECTS[round.object].plural);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["count and add"], prompt]);
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

  const tap = useCallback(
    (choice: number) => {
      if (!round || picked !== null) return;
      const answer = round.groupA + round.groupB;
      const correct = choice === answer;
      const plural = OBJECTS[round.object].plural;
      setPicked(choice);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: String(choice) }];
      setResults((r) => [...r, correct]);
      speak(correct ? correctSpeech(answer, plural) : revealSpeech(answer, plural), advance, correct ? undefined : { minMs: REVEAL_MIN_MS });
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Picking the garden baskets…</p>
      </div>
    );
  }

  const answer = round.groupA + round.groupB;
  const pickedRight = picked === answer;
  const emoji = OBJECTS[round.object].emoji;
  const basket = (count: number, label: string) => (
    <div className={`${styles.basket} relative flex min-h-[clamp(96px,20vh,160px)] w-[clamp(140px,30vw,240px)] flex-wrap content-center items-center justify-center gap-1 rounded-b-[2rem] rounded-t-xl p-3`}>
      <span className={`${styles.basketLabel} absolute -top-4 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 text-sm font-extrabold uppercase tracking-wide`}>{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} aria-hidden className="text-[clamp(26px,5.4vh,44px)] leading-none">
          {emoji}
        </span>
      ))}
    </div>
  );

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

      <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(26px,5.5vh,46px)] font-extrabold leading-tight`}>{title}</h1>

      {phase === "complete" ? (
        <div className={`${styles.result} relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center`}>
          <div className="flex items-center gap-3">
            <div className={`${styles.resultStamp} rounded-full px-[clamp(16px,3vw,32px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You added {score} of {total} baskets correctly!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(20,60,20,0.3)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={cn(styles.instruction, picked !== null && !pickedRight && styles.instructionReveal, "m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight")}>
              {picked !== null && !pickedRight ? REVEAL_TEXT : INSTRUCTION}
            </p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(OBJECTS[round.object].plural))}
              disabled={picked !== null}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main key={round.key} className={`${styles.stage} relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(10px,2.4vh,20px)] py-2`}>
            <div className="flex items-center gap-[clamp(10px,2.4vw,22px)]">
              {basket(round.groupA, "Basket 1")}
              <span aria-hidden className={`${styles.operator} text-[clamp(32px,6vh,52px)] font-extrabold leading-none`}>+</span>
              {basket(round.groupB, "Basket 2")}
            </div>
            <div className="flex items-center gap-[clamp(10px,2.4vw,20px)]">
              {round.choices.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => tap(n)}
                  disabled={picked !== null}
                  aria-label={`Total ${n}`}
                  className={cn(
                    styles.card,
                    "relative flex size-[clamp(64px,13vh,100px)] items-center justify-center rounded-2xl text-[clamp(28px,6vh,44px)] font-extrabold leading-none tabular-nums focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#facc15] disabled:cursor-default",
                    picked === n && n !== answer && styles.cardWrong,
                    picked !== null && n === answer && (pickedRight ? styles.cardCorrect : styles.cardReveal),
                  )}
                >
                  {n}
                  {picked === n && n !== answer && (
                    <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-2 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                      ✕
                    </span>
                  )}
                </button>
              ))}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
