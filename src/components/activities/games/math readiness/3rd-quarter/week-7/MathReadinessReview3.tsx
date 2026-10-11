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
  REVEAL_TEXT,
  THINGS,
  answerOf,
  correctSpeech,
  instruction,
  isLongThing,
  isThing,
  nameOf,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  thingImagePath,
  type LongThing,
  type Round,
} from "./MathReadinessReview3.data";
import styles from "./MathReadinessReview3.module.css";

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Step = "small" | "medium" | "big";

const STEP_FONT: Record<Step, string> = {
  small: "clamp(28px, 5.6vh, 46px)",
  medium: "clamp(44px, 9vh, 74px)",
  big: "clamp(64px, 13vh, 108px)",
};

function buildRound(row: QuestionRow): Round {
  const d = row.questionData as Record<string, unknown>;
  const key = row.questionKey;
  const bad = (why: string) => new Error(`Question ${key} ${why}`);
  let round: Round;
  switch (d.kind) {
    case "size":
      if (!isThing(d.object) || (d.ask !== "big" && d.ask !== "small")) throw bad('needs a known "object" and an "ask" of big or small');
      round = { key, kind: "size", object: d.object, ask: d.ask };
      break;
    case "length":
      if (!isLongThing(d.object) || (d.ask !== "long" && d.ask !== "short")) throw bad('needs a scarf or rope "object" and an "ask" of long or short');
      round = { key, kind: "length", object: d.object, ask: d.ask };
      break;
    case "order":
      if (!isThing(d.object) || (d.direction !== "smallToBig" && d.direction !== "bigToSmall") || typeof d.orderedFirst !== "boolean") {
        throw bad('needs a known "object", a "direction" and an "orderedFirst" flag');
      }
      round = { key, kind: "order", object: d.object, direction: d.direction, orderedFirst: d.orderedFirst };
      break;
    case "distance":
      if (!isThing(d.object) || (d.ask !== "near" && d.ask !== "far") || (d.side !== "left" && d.side !== "right")) throw bad('needs a known "object", an "ask" of near or far and a "side"');
      round = { key, kind: "distance", object: d.object, ask: d.ask, side: d.side };
      break;
    case "position":
      if (!isThing(d.object) || (d.ask !== "inside" && d.ask !== "outside")) throw bad('needs a known "object" and an "ask" of inside or outside');
      round = { key, kind: "position", object: d.object, ask: d.ask };
      break;
    default:
      throw bad("has an unknown kind");
  }
  if (row.correctAnswer.answer !== answerOf(round)) throw bad(`must have the answer "${answerOf(round)}"`);
  return round;
}

/** One circus thing's picture, sized by a clamp() string so callers can scale it per round. */
function ThingImg({ thing, size, className }: { thing: keyof typeof THINGS; size: string; className?: string }) {
  return <Image src={thingImagePath(thing)} alt="" width={200} height={200} aria-hidden className={cn("object-contain", className)} style={{ width: size, height: size }} />;
}

/** A scarf pulled out of a magic hat, or a rope tied to a stake; both start at the same spot on the left. */
function LongProp({ thing, long }: { thing: LongThing; long: boolean }) {
  return (
    <span className="flex w-full items-center" aria-hidden>
      {thing === "scarf" ? (
        <span className="z-[1] -mr-2 shrink-0 text-[clamp(34px,6.6vh,56px)] leading-none">🎩</span>
      ) : (
        <span className={`${styles.stake} z-[1] -mr-1 h-[clamp(40px,8vh,66px)] w-[clamp(10px,1.8vh,16px)] shrink-0 rounded-t-full`} />
      )}
      <span className={cn(thing === "scarf" ? styles.scarf : styles.rope, "h-[clamp(16px,3.4vh,28px)] rounded-r-full")} style={{ width: long ? "82%" : "36%" }} />
    </span>
  );
}

export default function MathReadinessReview3({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Math Readiness Review questions:", err);
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
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Math Readiness Review";
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
    const prompt = promptSpeech(round);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["math readiness review 3"], prompt]);
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
    (choice: string) => {
      if (!round || picked) return;
      const correct = choice === answerOf(round);
      setPicked(choice);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: choice }];
      setResults((r) => [...r, correct]);
      speak(correct ? correctSpeech(round) : revealSpeech(round), advance, correct ? undefined : { minMs: REVEAL_MIN_MS });
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>The circus show is about to start…</p>
      </div>
    );
  }

  const answer = answerOf(round);
  const pickedRight = picked === answer;
  const name = nameOf(round);
  // Answers swap sides across rounds, so position never gives them away.
  const flip = roundIndex % 2 === 1;

  /** One tappable act with the shared wrong / reveal / correct marks. */
  const choice = (id: string, label: string, content: React.ReactNode, className: string, style?: React.CSSProperties) => (
    <button
      key={id}
      type="button"
      onClick={() => tap(id)}
      disabled={!!picked}
      aria-label={label}
      style={style}
      className={cn(
        "relative flex items-center justify-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#facc15] disabled:cursor-default",
        className,
        picked === id && id !== answer && styles.choiceWrong,
        picked && id === answer && (pickedRight ? styles.choiceCorrect : styles.choiceReveal),
      )}
    >
      {content}
      {picked === id && id !== answer && (
        <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-2 flex size-10 items-center justify-center rounded-full text-2xl font-extrabold leading-none`}>
          ✕
        </span>
      )}
    </button>
  );

  const body = (() => {
    switch (round.kind) {
      case "size": {
        const ids = flip ? ["small", "big"] : ["big", "small"];
        return (
          <div className="flex items-end justify-center gap-[clamp(20px,6vw,72px)]">
            {ids.map((id) =>
              choice(
                id,
                `${id} ${name}`,
                <ThingImg thing={round.object} size={id === "big" ? "clamp(90px, 21vh, 176px)" : "clamp(34px, 7vh, 58px)"} />,
                `${styles.pedestal} h-[clamp(170px,38vh,300px)] w-[clamp(130px,28vw,230px)] items-end rounded-t-[50%] rounded-b-2xl pb-[clamp(30px,7vh,60px)]`,
              ),
            )}
          </div>
        );
      }
      case "length": {
        const ids = flip ? ["short", "long"] : ["long", "short"];
        return (
          <div className="flex w-[min(92vw,640px)] flex-col gap-[clamp(14px,3.6vh,30px)]">
            {ids.map((id) =>
              choice(id, `${id} ${name}`, <LongProp thing={round.object} long={id === "long"} />, `${styles.act} w-full justify-start rounded-2xl px-[clamp(10px,2vw,20px)] py-[clamp(8px,2vh,16px)]`),
            )}
          </div>
        );
      }
      case "order": {
        const rows: Record<string, Step[]> =
          round.direction === "smallToBig"
            ? { ordered: ["small", "medium", "big"], mixed: ["medium", "big", "small"] }
            : { ordered: ["big", "medium", "small"], mixed: ["small", "big", "medium"] };
        const ids = round.orderedFirst ? ["ordered", "mixed"] : ["mixed", "ordered"];
        return (
          <div className="flex flex-col gap-[clamp(12px,3vh,26px)]">
            {ids.map((id, i) =>
              choice(
                id,
                `Row ${i + 1} of ${name}s`,
                <span aria-hidden className="flex items-end gap-[clamp(14px,4vw,40px)]">
                  {rows[id].map((step, j) => (
                    <ThingImg key={j} thing={round.object} size={STEP_FONT[step]} />
                  ))}
                </span>,
                `${styles.act} min-h-[clamp(84px,17vh,140px)] w-[min(88vw,520px)] items-end rounded-2xl px-6 pb-2`,
              ),
            )}
          </div>
        );
      }
      case "distance": {
        const x = (pct: number) => (round.side === "left" ? pct : 100 - pct);
        return (
          <div className={`${styles.ring} relative h-[clamp(210px,44vh,380px)] w-[min(96vw,880px)] overflow-hidden rounded-[2rem]`}>
            <Image
              src={ASSETS.clown}
              alt=""
              width={200}
              height={200}
              aria-hidden
              className="absolute bottom-[14%] -translate-x-1/2 object-contain"
              style={{ left: `${x(12)}%`, width: "clamp(70px, 15vh, 128px)", height: "clamp(70px, 15vh, 128px)" }}
            />
            {(["near", "far"] as const).map((id) =>
              choice(
                id,
                `${name} ${id === "near" ? "near" : "far from"} the clown`,
                <ThingImg thing={round.object} size="clamp(44px, 9vh, 78px)" />,
                `${styles.performer} absolute bottom-[12%] size-[clamp(72px,15vh,124px)] -translate-x-1/2 rounded-full`,
                { left: `${x(id === "near" ? 31 : 86)}%` },
              ),
            )}
          </div>
        );
      }
      case "position": {
        const x = (pct: number) => (flip ? 100 - pct : pct);
        return (
          <div className={`${styles.ring} relative h-[clamp(210px,44vh,380px)] w-[min(96vw,880px)] overflow-hidden rounded-[2rem]`}>
            <span aria-hidden className={`${styles.circusRing} absolute top-1/2 h-[70%] w-[46%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]`} style={{ left: `${x(34)}%` }} />
            {(["inside", "outside"] as const).map((id) =>
              choice(
                id,
                `${name} ${id} the ring`,
                <ThingImg thing={round.object} size="clamp(44px, 9vh, 78px)" />,
                `${styles.performer} absolute top-1/2 size-[clamp(72px,15vh,124px)] -translate-x-1/2 -translate-y-1/2 rounded-full`,
                { left: `${x(id === "inside" ? 34 : 82)}%` },
              ),
            )}
          </div>
        );
      }
    }
  })();

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      {learnerName && (
        <div className={`${styles.badge} fixed left-3 top-3 z-10 flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-xl font-extrabold short:py-1 short:text-base`}>
          <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={`${styles.avatar} size-11 text-xl short:size-8 short:text-base`} />
          <span className="max-w-48 truncate capitalize leading-none">{learnerName}</span>
        </div>
      )}
      {phase !== "complete" && (
        <div className={`${styles.badge} fixed right-3 top-3 z-10 flex max-w-[52vw] flex-wrap items-center justify-end gap-0.5 rounded-3xl px-3 py-1.5`} aria-label={`Score: ${score} of ${total}`}>
          {rounds.map((r, i) => (
            <Image
              key={r.key}
              src={results[i] ? ASSETS.starFilled : ASSETS.starEmpty}
              alt=""
              width={128}
              height={128}
              loading="eager"
              className={cn("size-[clamp(16px,2.8vh,24px)] object-contain transition-transform", i === roundIndex && "scale-125")}
            />
          ))}
        </div>
      )}

      <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(26px,5.5vh,46px)] font-extrabold leading-tight`}>{title}</h1>

      {phase === "complete" ? (
        <div className={`${styles.result} relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center`}>
          <div className="flex items-center gap-3">
            <div className={`${styles.resultStamp} rounded-2xl px-[clamp(14px,3vw,30px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You got {score} of {total} circus acts right!
          </p>
          <div className="flex max-w-[92vw] flex-wrap items-center justify-center gap-[clamp(4px,1vw,10px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(30px,6.4vh,56px)] object-contain drop-shadow-[0_4px_3px_rgba(76,5,25,0.3)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={cn(styles.instruction, picked && !pickedRight && styles.instructionReveal, "m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight")}>
              {picked && !pickedRight ? REVEAL_TEXT : instruction(round)}
            </p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round))}
              disabled={!!picked}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main key={round.key} className={`${styles.stage} relative z-[1] flex min-h-0 w-full flex-1 items-center justify-center py-[clamp(8px,2vh,20px)]`}>
            {body}
          </main>
        </>
      )}
    </div>
  );
}
