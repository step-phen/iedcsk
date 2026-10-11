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
  KIND_CHIP,
  LENGTH_THINGS,
  REVEAL_TEXT,
  SIZE_THINGS,
  correctSpeech,
  instruction,
  isLengthThing,
  isSizeThing,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type Ask,
  type LengthThing,
} from "./CompareAndChoose.data";
import styles from "./CompareAndChoose.module.css";

type Round =
  | { key: string; kind: "size"; object: keyof typeof SIZE_THINGS; ask: "big" | "small" }
  | { key: string; kind: "length"; object: LengthThing; ask: "long" | "short" };

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

function buildRound(row: QuestionRow): Round {
  const { kind, object, ask } = row.questionData as { kind: unknown; object: unknown; ask: unknown };
  if (row.correctAnswer.answer !== ask) throw new Error(`Question ${row.questionKey}'s answer must match its "ask"`);
  if (kind === "size" && isSizeThing(object) && (ask === "big" || ask === "small")) return { key: row.questionKey, kind, object, ask };
  if (kind === "length" && isLengthThing(object) && (ask === "long" || ask === "short")) return { key: row.questionKey, kind, object, ask };
  throw new Error(`Question ${row.questionKey} needs a size round (big/small) or a length round (long/short) with a known "object"`);
}

const nameOf = (round: Round) => (round.kind === "size" ? SIZE_THINGS[round.object].name : LENGTH_THINGS[round.object].name);

/** A long sea thing standing on the sand, drawn so both choices share the same base line. */
function LongThing({ thing, ask }: { thing: LengthThing; ask: "long" | "short" }) {
  const height = ask === "long" ? "88%" : "36%";
  if (thing === "seaweed") {
    return (
      <svg viewBox="0 0 60 200" preserveAspectRatio="none" className="w-[46%]" style={{ height }} aria-hidden>
        <path d="M30 200 C 8 170, 52 140, 30 110 S 8 50, 30 4" fill="none" stroke="#15803d" strokeWidth="16" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d="M30 200 C 8 170, 52 140, 30 110 S 8 50, 30 4" fill="none" stroke="#4ade80" strokeWidth="6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }
  return (
    <div className="flex w-[40%] flex-col items-center" style={{ height }} aria-hidden>
      <span className={`${styles.buoy} size-[clamp(18px,3.4vh,28px)] shrink-0 rounded-full`} />
      <span className={`${styles.rope} w-[clamp(8px,1.4vh,12px)] flex-1 rounded-full`} />
      <span className="-mt-1 text-[clamp(28px,5.6vh,48px)] leading-none">⚓</span>
    </div>
  );
}

export default function CompareAndChoose({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Compare and Choose questions:", err);
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
  const [picked, setPicked] = useState<Ask | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Compare and Choose";
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
    const prompt = promptSpeech(round.kind, round.ask, nameOf(round));
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["compare and choose"], prompt]);
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
    (choice: Ask) => {
      if (!round || picked) return;
      const correct = choice === round.ask;
      setPicked(choice);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: choice }];
      setResults((r) => [...r, correct]);
      const name = nameOf(round);
      speak(correct ? correctSpeech(round.ask, name) : revealSpeech(round.ask, name), advance, correct ? undefined : { minMs: REVEAL_MIN_MS });
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Diving under the sea…</p>
      </div>
    );
  }

  const name = nameOf(round);
  const pair: Ask[] = round.kind === "size" ? ["big", "small"] : ["long", "short"];
  // The answer swaps sides across rounds, so position never gives it away.
  const order = roundIndex % 2 === 0 ? pair : [...pair].reverse();
  const pickedRight = picked === round.ask;
  const chip = KIND_CHIP[round.kind];

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      {[8, 22, 47, 71, 90].map((left, i) => (
        <span key={left} aria-hidden className={`${styles.bubble} pointer-events-none absolute bottom-0 rounded-full`} style={{ left: `${left}%`, animationDelay: `${i * 1.3}s` }} />
      ))}

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
            You chose {score} of {total} sea things!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(4,47,73,0.35)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 flex-wrap items-center justify-center gap-2">
            <span className={`${styles.chip} flex items-center gap-1.5 rounded-full px-3 py-1 text-[clamp(14px,2.4vh,20px)] font-extrabold uppercase tracking-wide`}>
              <span aria-hidden>{chip.icon}</span>
              {chip.label}
            </span>
            <p className={cn(styles.instruction, picked && !pickedRight && styles.instructionReveal, "m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight")}>
              {picked && !pickedRight ? REVEAL_TEXT : instruction(round.ask, name)}
            </p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.kind, round.ask, name))}
              disabled={!!picked}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 items-center justify-center gap-[clamp(18px,6vw,72px)] py-[clamp(8px,2vh,20px)]">
            {order.map((choice) => {
              const isPicked = picked === choice;
              const isAnswer = choice === round.ask;
              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => tap(choice)}
                  disabled={!!picked}
                  aria-label={`${choice} ${name}`}
                  className={cn(
                    styles.window,
                    "relative flex h-[clamp(190px,46vh,380px)] w-[clamp(130px,30vw,240px)] shrink-0 flex-col items-center justify-end overflow-visible rounded-[2.2rem] pb-[clamp(18px,4vh,34px)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#facc15] disabled:cursor-default",
                    isPicked && !isAnswer && styles.windowWrong,
                    picked && isAnswer && (pickedRight ? styles.windowCorrect : styles.windowReveal),
                  )}
                >
                  <span aria-hidden className={`${styles.sand} absolute inset-x-0 bottom-0 h-[clamp(22px,5vh,40px)] rounded-b-[2rem]`} />
                  <span className={cn("relative flex h-full w-full items-end justify-center", isPicked && isAnswer && styles.wiggle)}>
                    {round.kind === "size" ? (
                      <span aria-hidden className={`${styles.creature} leading-none`} style={{ fontSize: choice === "big" ? "clamp(96px, 24vh, 200px)" : "clamp(36px, 8vh, 64px)" }}>
                        {SIZE_THINGS[round.object].emoji}
                      </span>
                    ) : (
                      <LongThing thing={round.object} ask={choice as "long" | "short"} />
                    )}
                  </span>
                  {isPicked && !isAnswer && (
                    <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-2 flex size-11 items-center justify-center rounded-full text-2xl font-extrabold leading-none`}>
                      ✕
                    </span>
                  )}
                </button>
              );
            })}
          </main>
        </>
      )}
    </div>
  );
}
