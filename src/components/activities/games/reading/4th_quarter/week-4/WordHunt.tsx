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
  REVEAL_TEXT,
  correctSpeech,
  questionSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./WordHunt.data";
import styles from "./WordHunt.module.css";

interface Round {
  key: string;
  tokens: string[];
  target: string;
  targetIndex: number;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Stage = "listening" | "choosing" | "feedback";

// The response is the bare lowercase word, so "The" and "the." both submit "the".
function bare(token: string): string {
  return token.replace(/[^a-z]/gi, "").toLowerCase();
}

function buildRound(row: QuestionRow): Round {
  const { text, target } = row.questionData as { text: unknown; target: unknown };
  if (typeof text !== "string" || typeof target !== "string") {
    throw new Error(`Question ${row.questionKey} needs a "text" and a "target"`);
  }
  const tokens = text.trim().split(/\s+/);
  const hits = tokens.map(bare).filter((w) => w === target);
  if (hits.length !== 1 || row.correctAnswer.answer !== target) {
    throw new Error(`Question ${row.questionKey} must have its target, which is the answer, exactly once in the text`);
  }
  return { key: row.questionKey, tokens, target, targetIndex: tokens.map(bare).indexOf(target) };
}

export default function WordHunt({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Word Hunt questions:", err);
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
  const [stage, setStage] = useState<Stage>("listening");
  const [picked, setPicked] = useState<number | null>(null);
  const [reveal, setReveal] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Word Hunt";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  const askWord = useCallback(() => {
    if (!round) return;
    setStage("listening");
    speak(questionSpeech(round.target), undefined, { onStart: () => setStage("choosing") });
  }, [round, speak]);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["word hunt"]], askWord);
      return;
    }
    askWord();
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    setReveal(null);
    setStage("listening");
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  const tap = useCallback(
    (index: number) => {
      if (stage !== "choosing" || !round) return;
      setStage("feedback");
      setPicked(index);
      const response = bare(round.tokens[index]);
      answersRef.current = [...answersRef.current, { questionId: round.key, response }];
      const earned = response === round.target;
      setResults((r) => [...r, earned]);
      if (earned) {
        speak(correctSpeech(round.target, roundIndex), advance);
        return;
      }
      setReveal(round.targetIndex);
      speak(revealSpeech(round.target), advance, { minMs: REVEAL_MIN_MS });
    },
    [stage, round, roundIndex, speak, advance],
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

  const backdrop = (
    <>
      <div aria-hidden className={`${styles.sky} pointer-events-none absolute inset-x-0 top-0 h-[40%]`} />
      <div aria-hidden className={`${styles.lake} pointer-events-none absolute inset-x-0 bottom-0 h-[60%]`} />
    </>
  );

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
        {backdrop}
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Freezing the lake…</p>
      </div>
    );
  }

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      {backdrop}

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
            <div className={`${styles.headline} rounded-xl px-[clamp(26px,5vw,52px)] py-[clamp(8px,1.6vh,14px)] text-[clamp(20px,3.8vh,34px)] font-extrabold`}>{resultHeadline(score, total)}</div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You found {score} of {total} words!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(10,40,70,0.35)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={askWord}
              disabled={stage !== "choosing"}
              aria-label="Hear the word again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(10px,3vh,30px)]">
            <span aria-hidden className={cn(styles.penguin, "text-[clamp(48px,10vh,96px)] leading-none", picked !== null && picked === round.targetIndex && styles.penguinHop)}>
              🐧
            </span>
            <div key={round.key} className="flex w-[min(96vw,900px)] flex-wrap items-end justify-center gap-x-[clamp(8px,1.8vw,18px)] gap-y-[clamp(18px,4vh,36px)]">
              {round.tokens.map((token, i) => {
                const isPicked = picked === i;
                const won = isPicked && i === round.targetIndex;
                return (
                  <div key={`${round.key}-${i}`} className={styles.floeSlot} style={{ animationDelay: `-${i * 0.35}s` }}>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => tap(i)}
                        disabled={stage !== "choosing"}
                        aria-label={bare(token)}
                        className={cn(
                          styles.floe,
                          "relative flex min-w-[clamp(64px,13vw,120px)] items-center justify-center rounded-[40%_46%_38%_44%] px-[clamp(10px,2vw,20px)] pb-[clamp(8px,1.8vh,16px)] pt-[clamp(6px,1.4vh,12px)] text-[clamp(28px,6.4vh,56px)] font-extrabold leading-none",
                          won && styles.floeWon,
                          isPicked && !won && styles.floeWrong,
                          reveal === i && styles.floeReveal,
                        )}
                      >
                        {token}
                      </button>
                      {isPicked && !won && (
                        <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-2 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                          ✕
                        </span>
                      )}
                      {reveal === i && (
                        <span className={`${styles.revealTag} absolute -top-9 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[clamp(13px,2.2vh,18px)] font-extrabold`}>{REVEAL_TEXT}</span>
                      )}
                    </div>
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
