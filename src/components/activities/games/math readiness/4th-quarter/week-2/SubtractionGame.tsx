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
  NUMBER_WORDS,
  PICK_SPEECH,
  PICK_TEXT,
  REVEAL_TEXT,
  correctSpeech,
  removeSpeech,
  removeText,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./SubtractionGame.data";
import styles from "./SubtractionGame.module.css";

interface Round {
  key: string;
  start: number;
  remove: number;
  choices: number[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

function buildRound(row: QuestionRow): Round {
  const d = row.questionData as Record<string, unknown>;
  const { start, remove } = d;
  if (!Number.isInteger(start) || !Number.isInteger(remove) || (start as number) < 1 || (start as number) > 10 || (remove as number) < 1 || (remove as number) > (start as number)) {
    throw new Error(`Question ${row.questionKey} needs a "start" from 1 to 10 and a "remove" from 1 to start`);
  }
  const left = (start as number) - (remove as number);
  const choices = Array.isArray(d.choices) ? d.choices : [];
  if (choices.length < 2 || !choices.every((c) => Number.isInteger(c)) || !choices.includes(left)) {
    throw new Error(`Question ${row.questionKey} needs numeral "choices" that include what is left`);
  }
  if (row.correctAnswer.answer !== String(left)) throw new Error(`Question ${row.questionKey}'s answer must be start minus remove`);
  return { key: row.questionKey, start: start as number, remove: remove as number, choices: choices as number[] };
}

export default function SubtractionGame({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Subtraction Game questions:", err);
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
  const [removed, setRemoved] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Subtraction Game";
  const score = results.filter(Boolean).length;
  const left = round ? round.start - round.remove : 0;
  const takenAll = !!round && removed.length === round.remove;

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
    const prompt = removeSpeech(round.start, round.remove);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["subtraction game"], prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setRemoved([]);
    setPicked(null);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  // Taking away is practice, not graded: each tapped counter drops in the cup as its count is said, and the rest lock once enough are out.
  const takeAway = useCallback(
    (spot: number) => {
      if (!round || removed.length >= round.remove || removed.includes(spot)) return;
      const next = [...removed, spot];
      setRemoved(next);
      if (next.length < round.remove) speak(NUMBER_WORDS[next.length]);
      else speakAll([NUMBER_WORDS[next.length], PICK_SPEECH]);
    },
    [round, removed, speak, speakAll],
  );

  const tap = useCallback(
    (choice: number) => {
      if (!round || !takenAll || picked !== null) return;
      const correct = choice === left;
      setPicked(choice);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: String(choice) }];
      setResults((r) => [...r, correct]);
      speak(correct ? correctSpeech(round.start, round.remove) : revealSpeech(round.start, round.remove), advance, correct ? undefined : { minMs: REVEAL_MIN_MS });
    },
    [round, takenAll, picked, left, speak, advance],
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Putting counters on the board…</p>
      </div>
    );
  }

  const pickedRight = picked === left;

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
            <div className={`${styles.resultStamp} rounded-lg px-[clamp(16px,3vw,32px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You counted {score} of {total} boards correctly!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(4,47,46,0.3)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={cn(styles.instruction, picked !== null && !pickedRight && styles.instructionReveal, "m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight")}>
              {picked !== null && !pickedRight ? REVEAL_TEXT : takenAll ? PICK_TEXT : removeText(round.remove)}
            </p>
            <button
              type="button"
              onClick={() => speak(takenAll ? PICK_SPEECH : removeSpeech(round.start, round.remove))}
              disabled={picked !== null}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main key={round.key} className={`${styles.stage} relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(12px,2.8vh,24px)] py-2`}>
            <div className="flex flex-wrap items-end justify-center gap-[clamp(12px,3vw,28px)]">
              <div className={`${styles.board} grid grid-cols-5 gap-[clamp(6px,1.4vh,12px)] rounded-2xl p-[clamp(10px,2vh,18px)]`} aria-label={`Board with ${round.start - removed.length} counters`}>
                {Array.from({ length: round.start }, (_, i) =>
                  removed.includes(i) ? (
                    <span key={i} aria-hidden className={`${styles.gap} size-[clamp(36px,7.6vh,62px)] rounded-full`} />
                  ) : (
                    <button
                      key={i}
                      type="button"
                      onClick={() => takeAway(i)}
                      disabled={takenAll}
                      aria-label="Take away this counter"
                      className={`${styles.counter} size-[clamp(36px,7.6vh,62px)] rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#facc15] disabled:cursor-default`}
                    />
                  ),
                )}
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className={`${styles.cup} flex h-[clamp(80px,16vh,130px)] w-[clamp(76px,14vh,120px)] flex-wrap-reverse content-start items-end justify-center gap-0.5 rounded-b-[1.6rem] rounded-t-md p-1.5`} aria-label={`${removed.length} counters taken away`}>
                  {removed.map((spot) => (
                    <span key={spot} aria-hidden className={`${styles.counter} ${styles.dropped} size-[clamp(16px,3.4vh,26px)] rounded-full`} />
                  ))}
                </div>
                <span className={`${styles.cupLabel} rounded-full px-3 py-0.5 text-sm font-extrabold`}>
                  {removed.length} of {round.remove} out
                </span>
              </div>
            </div>

            {takenAll && (
              <div className={`${styles.cards} flex items-center gap-[clamp(10px,2.4vw,20px)]`}>
                {round.choices.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => tap(n)}
                    disabled={picked !== null}
                    aria-label={`${n} left`}
                    className={cn(
                      styles.card,
                      "relative flex size-[clamp(64px,13vh,100px)] items-center justify-center rounded-2xl text-[clamp(28px,6vh,44px)] font-extrabold leading-none tabular-nums focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#facc15] disabled:cursor-default",
                      picked === n && n !== left && styles.cardWrong,
                      picked !== null && n === left && (pickedRight ? styles.cardCorrect : styles.cardReveal),
                    )}
                  >
                    {n}
                    {picked === n && n !== left && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-2 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}
