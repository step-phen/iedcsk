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
  KINDS,
  LOADING,
  ORDER_WORDS,
  PACKET_TINTS,
  PICS,
  REVEAL,
  TASK_LABEL,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type Kind,
} from "./LanguageReview4.data";
import styles from "./LanguageReview4.module.css";

interface Round {
  key: string;
  kind: Kind;
  prompt: string;
  choices: string[];
  // One picture id, or for an order task every picture id in the right order.
  answer: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

// How long the wrong pick shakes on its own before the right answer lights up.
const WRONG_MS = 600;

function buildRound(row: QuestionRow): Round {
  const { type, prompt, choices } = (row.questionData ?? {}) as { type?: unknown; prompt?: unknown; choices?: unknown };
  if (!KINDS.includes(type as Kind) || typeof prompt !== "string" || prompt.trim() === "") {
    throw new Error(`Question ${row.questionKey} needs a known "type" and a "prompt"`);
  }
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every((c) => typeof c === "string" && Object.hasOwn(PICS, c)) || new Set(choices).size !== 3) {
    throw new Error(`Question ${row.questionKey} needs three different known "choices"`);
  }
  const kind = type as Kind;
  const answer = kind === "order" ? row.correctAnswer.answer.split(">") : [row.correctAnswer.answer];
  const fits = kind === "order" ? answer.length === 3 && choices.every((c) => answer.includes(c)) : choices.includes(answer[0]);
  if (!fits) {
    throw new Error(`Question ${row.questionKey} has an answer that does not fit its choices`);
  }
  return { key: row.questionKey, kind, prompt, choices, answer };
}

export default function LanguageReview4({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Language Review questions:", err);
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
  // Packets tapped so far, in tap order; a single-choice task taps just one.
  const [tapped, setTapped] = useState<number[]>([]);
  const [won, setWon] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);
  // A ref, not only state, so two taps landing in the same tick can't both count.
  const tappedRef = useRef<number[]>([]);
  const lockedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const round = rounds?.[roundIndex];
  const title = activityName || "Language Review";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  const readRound = useCallback((r: Round) => speak(promptSpeech(r.kind, r.prompt, r.choices)), [speak]);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["language review 4"]], () => readRound(round));
      return;
    }
    readRound(round);
    // speak/speakAll/readRound are stable; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    tappedRef.current = [];
    setTapped([]);
    setWon(false);
    setWrong(false);
    setReveal(false);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
    lockedRef.current = false;
    setLocked(false);
  }, [roundIndex, total]);

  const tap = (i: number) => {
    if (!round || lockedRef.current || tappedRef.current.includes(i)) return;
    const next = [...tappedRef.current, i];
    tappedRef.current = next;
    setTapped(next);
    if (round.kind === "order" && next.length < round.choices.length) {
      stop();
      return;
    }
    lockedRef.current = true;
    setLocked(true);
    const response = next.map((n) => round.choices[n]).join(">");
    const earned = response === round.answer.join(">");
    answersRef.current = [...answersRef.current, { questionId: round.key, response }];
    setResults((r) => [...r, earned]);
    if (earned) {
      setWon(true);
      speak(correctSpeech(round.kind, round.answer, roundIndex), advance);
      return;
    }
    stop();
    setWrong(true);
    const { kind, answer } = round;
    timerRef.current = window.setTimeout(() => {
      setReveal(true);
      speak(revealSpeech(kind, answer), advance, { minMs: REVEAL_MIN_MS });
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

  const isOrder = round.kind === "order";
  const label = TASK_LABEL[round.kind];

  // A row of flower pots: each right answer grows a flower.
  const pots = (
    <div aria-hidden className="flex items-end justify-center gap-[clamp(2px,0.8vw,8px)]">
      {rounds.map((r, i) => (
        <span key={r.key} className="flex flex-col items-center">
          <span className={cn("h-[clamp(18px,3.4vh,30px)] text-[clamp(16px,3vh,26px)] leading-none", results[i] && styles.bloom)}>{results[i] ? "🌷" : ""}</span>
          <span className={`${styles.pot} h-[clamp(12px,2.2vh,18px)] w-[clamp(16px,3vh,26px)]`} />
        </span>
      ))}
    </div>
  );

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      <div aria-hidden className={`${styles.glasshouse} pointer-events-none absolute inset-0`} />

      {learnerName && (
        <div className={`${styles.badge} fixed left-3 top-3 z-10 flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-xl font-extrabold short:py-1 short:text-base`}>
          <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={`${styles.avatar} size-11 text-xl short:size-8 short:text-base`} />
          <span className="max-w-48 truncate capitalize leading-none">{learnerName}</span>
        </div>
      )}
      {phase !== "complete" && (
        <div className={`${styles.badge} fixed right-3 top-3 z-10 flex items-center gap-0.5 rounded-full px-2.5 py-1.5`} aria-label={`Score: ${score} of ${total}`}>
          {rounds.map((r, i) => (
            <Image
              key={r.key}
              src={results[i] ? ASSETS.starFilled : ASSETS.starEmpty}
              alt=""
              width={128}
              height={128}
              loading="eager"
              className={cn("size-[clamp(14px,2.8vh,24px)] object-contain transition-transform", i === roundIndex && "scale-125")}
            />
          ))}
        </div>
      )}

      <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(26px,5.5vh,46px)] font-extrabold leading-tight`}>{title}</h1>

      {phase === "complete" ? (
        <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center">
          {pots}
          <div className="flex items-center gap-3">
            <div className={`${styles.headline} rounded-2xl px-[clamp(14px,3vw,30px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You got {score} of {total} right!
          </p>
          <div className="flex max-w-xl flex-wrap items-center justify-center gap-[clamp(4px,1.2vw,10px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(30px,6.5vh,56px)] object-contain drop-shadow-[0_4px_3px_rgba(22,101,52,0.35)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(15px,2.6vh,24px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
          </div>

          <main key={round.key} className="relative z-[1] flex min-h-0 w-full max-w-4xl flex-1 flex-col items-center justify-evenly gap-[clamp(8px,2vh,18px)] py-2">
            {/* The task is clipped to a garden clipboard. */}
            <div className={`${styles.clipboard} relative flex max-w-full shrink-0 items-center gap-3 rounded-xl px-4 pb-[clamp(6px,1.2vh,12px)] pt-[clamp(14px,2.6vh,22px)]`}>
              <span aria-hidden className={`${styles.clip} absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 rounded-md`} />
              <span className={`${styles.taskLabel} shrink-0 rounded-full px-2.5 py-0.5 text-[clamp(13px,2.2vh,18px)] font-extrabold`}>
                <span aria-hidden>{label.icon} </span>
                {label.text}
              </span>
              <p className="m-0 min-w-0 text-[clamp(17px,3vh,28px)] font-extrabold leading-tight">{round.prompt}</p>
              <button
                type="button"
                onClick={() => readRound(round)}
                disabled={locked}
                aria-label="Hear the task again"
                className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
              >
                <Volume2 size={18} strokeWidth={2.6} />
              </button>
            </div>

            <div className="relative grid w-full max-w-[min(42rem,calc((100dvh-17rem)*2.4))] grid-cols-3 gap-[clamp(8px,2.4vw,24px)] short:max-w-[min(42rem,calc((100dvh-9rem)*2.4))]">
              {reveal && <p className={`${styles.revealNote} absolute -top-11 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              {round.choices.map((choice, i) => {
                const place = tapped.indexOf(i);
                const isAnswer = round.answer.includes(choice);
                const wrongHere = wrong && (isOrder ? round.answer[place] !== choice : place === 0);
                return (
                  <button
                    key={`${round.key}-${choice}`}
                    type="button"
                    onClick={() => tap(i)}
                    disabled={locked || place !== -1}
                    aria-label={PICS[choice].said}
                    className={cn(
                      styles.packet,
                      "relative flex flex-col items-center rounded-b-lg pb-[clamp(6px,1.4vh,12px)] pt-[clamp(12px,2.4vh,20px)]",
                      place !== -1 && !wrong && !won && isOrder && styles.packetTapped,
                      won && place !== -1 && styles.packetRight,
                      wrongHere && styles.packetWrong,
                      reveal && isAnswer && styles.packetReveal,
                      reveal && !isAnswer && "opacity-50",
                    )}
                    style={{ background: PACKET_TINTS[i % PACKET_TINTS.length] }}
                  >
                    <span aria-hidden className={`${styles.window} flex aspect-square w-[72%] items-center justify-center rounded-full text-[clamp(30px,8vh,72px)] leading-none`}>
                      {PICS[choice].emoji}
                    </span>
                    {isOrder && (place !== -1 || reveal) && (
                      <span
                        aria-hidden
                        className={cn(styles.orderTag, reveal && styles.orderTagReveal, "absolute -right-2 -top-3 rounded-full px-2 text-[clamp(12px,2.2vh,17px)] font-extrabold")}
                      >
                        {ORDER_WORDS[reveal ? round.answer.indexOf(choice) : place]}
                      </span>
                    )}
                    {wrongHere && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -left-2 -top-3 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="shrink-0 short:hidden">{pots}</div>
          </main>
        </>
      )}
    </div>
  );
}
