"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, REVEAL_MIN_MS } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import { LengthItem, LENGTH_KINDS, UNIT, isLengthKind } from "./LengthItem";
import {
  ASSETS,
  correctSpeech,
  instruction,
  isAsk,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type Ask,
} from "./CompareLengths.data";
import styles from "./CompareLengths.module.css";

interface Round {
  key: string;
  kind: keyof typeof LENGTH_KINDS;
  lengths: [number, number];
  ask: Ask;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

function buildRound(row: QuestionRow): Round {
  const { item, lengths, ask } = row.questionData as { item: unknown; lengths: unknown; ask: unknown };
  if (!isLengthKind(item)) throw new Error(`Question ${row.questionKey} needs a known "item"`);
  if (!Array.isArray(lengths) || lengths.length !== 2 || !lengths.every((n) => Number.isInteger(n) && n >= 2) || lengths[0] === lengths[1]) {
    throw new Error(`Question ${row.questionKey} needs two different "lengths" of at least 2`);
  }
  if (!isAsk(ask) || row.correctAnswer.answer !== ask) throw new Error(`Question ${row.questionKey} needs an "ask" of long or short that matches its answer`);
  return { key: row.questionKey, kind: item, lengths: lengths as [number, number], ask };
}

/** Whether lane `i` holds the long or the short one of the pair. */
const laneLabel = (lengths: [number, number], i: number): Ask => (lengths[i] > lengths[1 - i] ? "long" : "short");

export default function CompareLengths({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Compare Lengths questions:", err);
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
  const [pickedLane, setPickedLane] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Compare Lengths";
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
    const prompt = promptSpeech(round.ask, round.kind);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["compare lengths"], prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPickedLane(null);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  const tapLane = useCallback(
    (lane: number) => {
      if (!round || pickedLane !== null) return;
      const label = laneLabel(round.lengths, lane);
      const correct = label === round.ask;
      setPickedLane(lane);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: label }];
      setResults((r) => [...r, correct]);
      speak(correct ? correctSpeech(round.ask, round.kind) : revealSpeech(round.ask, round.kind), advance, correct ? undefined : { minMs: REVEAL_MIN_MS });
    },
    [round, pickedLane, speak, advance],
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Lining things up…</p>
      </div>
    );
  }

  const pickedRight = pickedLane !== null && laneLabel(round.lengths, pickedLane) === round.ask;

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
            You compared {score} of {total} lengths!
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
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{instruction(round.ask, round.kind)}</p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.ask, round.kind))}
              disabled={pickedLane !== null}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 items-center justify-center">
            <div className={`${styles.board} relative rounded-3xl py-[clamp(14px,3vh,28px)] pl-[clamp(20px,4vw,40px)] pr-[clamp(14px,3vw,28px)]`}>
              <span className={`${styles.startTag} absolute -top-4 left-[clamp(4px,1.6vw,18px)] rounded-full px-3 py-0.5 text-sm font-extrabold uppercase tracking-wide`}>Start</span>
              <div className={`${styles.startLine} flex flex-col gap-[clamp(14px,4vh,36px)]`} style={{ width: `calc(${UNIT} * 7.2)` }}>
                {round.lengths.map((length, lane) => {
                  const label = laneLabel(round.lengths, lane);
                  const isPicked = pickedLane === lane;
                  const isAnswer = label === round.ask;
                  return (
                    <button
                      key={lane}
                      type="button"
                      onClick={() => tapLane(lane)}
                      disabled={pickedLane !== null}
                      aria-label={`${label} ${LENGTH_KINDS[round.kind].name}`}
                      className={cn(
                        styles.lane,
                        "relative flex w-full items-center rounded-r-2xl py-[clamp(8px,1.8vh,16px)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] disabled:cursor-default",
                        isPicked && !isAnswer && styles.laneWrong,
                        pickedLane !== null && isAnswer && (pickedRight ? styles.laneCorrect : styles.laneReveal),
                      )}
                    >
                      <span className={cn("block", pickedLane !== null && isAnswer && styles.itemCheer)}>
                        <LengthItem kind={round.kind} length={length} />
                      </span>
                      {isPicked && !isAnswer && (
                        <span aria-hidden className={`${styles.wrongMark} absolute -top-3 right-2 flex size-10 items-center justify-center rounded-full text-2xl font-extrabold leading-none`}>
                          ✕
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
