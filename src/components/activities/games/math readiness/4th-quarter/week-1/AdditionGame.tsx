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
  JOIN_TEXT,
  NUMBER_WORDS,
  PICK_SPEECH,
  PICK_TEXT,
  REVEAL_TEXT,
  correctSpeech,
  joinSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./AdditionGame.data";
import styles from "./AdditionGame.module.css";

type Color = "red" | "yellow";

interface Round {
  key: string;
  red: number;
  yellow: number;
  choices: number[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

const FRAME_CELLS = 10;

const isGroup = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 9;

function buildRound(row: QuestionRow): Round {
  const d = row.questionData as Record<string, unknown>;
  if (!isGroup(d.red) || !isGroup(d.yellow) || d.red + d.yellow > FRAME_CELLS) {
    throw new Error(`Question ${row.questionKey} needs "red" and "yellow" groups that fit on a ten frame`);
  }
  const sum = d.red + d.yellow;
  const choices = Array.isArray(d.choices) ? d.choices : [];
  if (choices.length < 2 || !choices.every((c) => Number.isInteger(c)) || !choices.includes(sum)) {
    throw new Error(`Question ${row.questionKey} needs numeral "choices" that include the total`);
  }
  if (row.correctAnswer.answer !== String(sum)) throw new Error(`Question ${row.questionKey}'s answer must be red plus yellow`);
  return { key: row.questionKey, red: d.red, yellow: d.yellow, choices: choices as number[] };
}

export default function AdditionGame({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Addition Game questions:", err);
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
  const [placed, setPlaced] = useState<Color[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Addition Game";
  const score = results.filter(Boolean).length;
  const sum = round ? round.red + round.yellow : 0;
  const joined = !!round && placed.length === sum;

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
    const prompt = joinSpeech(round.red, round.yellow);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["addition game"], prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPlaced([]);
    setPicked(null);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  // Joining is practice, not graded: each counter slides onto the ten frame as its count is said.
  const place = useCallback(
    (color: Color) => {
      if (!round || placed.length >= sum) return;
      const next = [...placed, color];
      setPlaced(next);
      if (next.length < sum) speak(NUMBER_WORDS[next.length]);
      else speakAll([NUMBER_WORDS[next.length], PICK_SPEECH]);
    },
    [round, placed, sum, speak, speakAll],
  );

  const tap = useCallback(
    (choice: number) => {
      if (!round || !joined || picked !== null) return;
      const correct = choice === sum;
      setPicked(choice);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: String(choice) }];
      setResults((r) => [...r, correct]);
      speak(correct ? correctSpeech(round.red, round.yellow) : revealSpeech(round.red, round.yellow), advance, correct ? undefined : { minMs: REVEAL_MIN_MS });
    },
    [round, joined, picked, sum, speak, advance],
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Setting out the counters…</p>
      </div>
    );
  }

  const pickedRight = picked === sum;
  const left: Record<Color, number> = {
    red: round.red - placed.filter((c) => c === "red").length,
    yellow: round.yellow - placed.filter((c) => c === "yellow").length,
  };

  const pile = (color: Color, label: string) => (
    <div className={`${styles.pile} relative flex min-h-[clamp(70px,14vh,112px)] w-[clamp(140px,38vw,300px)] flex-wrap content-center items-center justify-center gap-[clamp(4px,1vh,8px)] rounded-2xl px-2 pb-2 pt-4`}>
      <span className={`${styles.pileLabel} absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-sm font-extrabold`}>
        {label}
      </span>
      {Array.from({ length: left[color] }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => place(color)}
          aria-label={`Put a ${color} counter on the ten frame`}
          className={cn(styles.counter, styles[color], "size-[clamp(30px,6.4vh,52px)] rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#facc15]")}
        />
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
            <div className={`${styles.resultStamp} rounded-xl px-[clamp(16px,3vw,32px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You added {score} of {total} ten frames correctly!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(59,7,100,0.3)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={cn(styles.instruction, picked !== null && !pickedRight && styles.instructionReveal, "m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight")}>
              {picked !== null && !pickedRight ? REVEAL_TEXT : joined ? PICK_TEXT : JOIN_TEXT}
            </p>
            <button
              type="button"
              onClick={() => speak(joined ? PICK_SPEECH : joinSpeech(round.red, round.yellow))}
              disabled={picked !== null}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main key={round.key} className={`${styles.stage} relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(12px,2.8vh,24px)] py-2`}>
            {!joined && (
              <div className="flex items-center gap-[clamp(10px,3vw,28px)]">
                {pile("red", `${round.red} red`)}
                <span aria-hidden className={`${styles.plus} text-[clamp(30px,5.6vh,48px)] font-extrabold leading-none`}>+</span>
                {pile("yellow", `${round.yellow} yellow`)}
              </div>
            )}

            <div className={`${styles.frame} grid grid-cols-5 gap-[clamp(4px,0.8vh,8px)] rounded-2xl p-[clamp(6px,1.2vh,12px)]`} aria-label={`Ten frame with ${placed.length} counters`}>
              {Array.from({ length: FRAME_CELLS }, (_, i) => (
                <div key={i} className={`${styles.cell} flex size-[clamp(40px,8.6vh,72px)] items-center justify-center rounded-lg`}>
                  {placed[i] && <span aria-hidden className={cn(styles.counter, styles[placed[i]], styles.landed, "size-[78%] rounded-full")} />}
                </div>
              ))}
            </div>

            {joined && (
              <div className={`${styles.cards} flex items-center gap-[clamp(10px,2.4vw,20px)]`}>
                {round.choices.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => tap(n)}
                    disabled={picked !== null}
                    aria-label={`${n} in all`}
                    className={cn(
                      styles.card,
                      "relative flex size-[clamp(64px,13vh,100px)] items-center justify-center rounded-2xl text-[clamp(28px,6vh,44px)] font-extrabold leading-none tabular-nums focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#facc15] disabled:cursor-default",
                      picked === n && n !== sum && styles.cardWrong,
                      picked !== null && n === sum && (pickedRight ? styles.cardCorrect : styles.cardReveal),
                    )}
                  >
                    {n}
                    {picked === n && n !== sum && (
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
