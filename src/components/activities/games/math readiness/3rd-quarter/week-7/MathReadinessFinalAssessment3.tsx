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
  STEPS,
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
  type Round,
  type Step,
} from "./MathReadinessFinalAssessment3.data";
import styles from "./MathReadinessFinalAssessment3.module.css";

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

const STEP_FONT: Record<Step, string> = {
  small: "clamp(26px, 5.2vh, 42px)",
  medium: "clamp(42px, 8.4vh, 68px)",
  big: "clamp(62px, 12.4vh, 100px)",
};

// Fixed twinkle spots so the sky never reshuffles between renders.
const SKY_STARS = [
  [6, 12], [18, 30], [27, 8], [39, 22], [52, 6], [63, 28], [74, 10], [86, 24], [94, 8], [12, 52], [90, 48], [4, 78], [96, 82],
] as const;

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
      if (!isLongThing(d.object) || (d.ask !== "long" && d.ask !== "short")) throw bad('needs a comet "object" and an "ask" of long or short');
      round = { key, kind: "length", object: d.object, ask: d.ask };
      break;
    case "order":
      if (!isThing(d.object) || !STEPS.includes(d.missing as Step)) throw bad('needs a known "object" and a "missing" of small, medium or big');
      round = { key, kind: "order", object: d.object, missing: d.missing as Step };
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

/** A comet whose glowing head flies right and whose tail starts at the same left line for both choices. */
function Comet({ long }: { long: boolean }) {
  return (
    <span className="flex h-full w-full items-center" aria-hidden>
      <span className={`${styles.cometTail} h-[clamp(14px,3vh,24px)] rounded-l-full`} style={{ width: long ? "76%" : "30%" }} />
      <span className={`${styles.cometHead} -ml-2 size-[clamp(30px,6vh,50px)] shrink-0 rounded-full`} />
    </span>
  );
}

export default function MathReadinessFinalAssessment3({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Math Readiness Final Assessment questions:", err);
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
  const title = activityName || "Math Readiness Final Assessment";
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
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["math readiness final assessment 3"], prompt]);
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Counting down to launch…</p>
      </div>
    );
  }

  const answer = answerOf(round);
  const pickedRight = picked === answer;
  const name = nameOf(round);
  // Answers swap sides across rounds, so position never gives them away.
  const flip = roundIndex % 2 === 1;

  /** One tappable answer with the shared wrong / reveal / correct marks. */
  const choice = (id: string, label: string, content: React.ReactNode, className: string, style?: React.CSSProperties) => (
    <button
      key={id}
      type="button"
      onClick={() => tap(id)}
      disabled={!!picked}
      aria-label={label}
      style={style}
      className={cn(
        "relative flex items-center justify-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#fde047] disabled:cursor-default",
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
        const thing = THINGS[round.object];
        const ids = flip ? ["small", "big"] : ["big", "small"];
        return (
          <div className="flex items-center justify-center gap-[clamp(20px,6vw,72px)]">
            {ids.map((id) =>
              choice(
                id,
                `${id} ${name}`,
                <span aria-hidden className="leading-none" style={{ fontSize: id === "big" ? "clamp(90px, 21vh, 176px)" : "clamp(34px, 7vh, 58px)" }}>
                  {thing.emoji}
                </span>,
                `${styles.porthole} size-[clamp(160px,34vh,280px)] rounded-full`,
              ),
            )}
          </div>
        );
      }
      case "length": {
        const ids = flip ? ["short", "long"] : ["long", "short"];
        return (
          <div className={`${styles.launchLine} flex w-[min(92vw,640px)] flex-col gap-[clamp(14px,3.6vh,30px)]`}>
            {ids.map((id) => choice(id, `${id} ${name}`, <Comet long={id === "long"} />, `${styles.orbit} h-[clamp(64px,13vh,104px)] w-full justify-start rounded-r-full px-2`))}
          </div>
        );
      }
      case "order": {
        const thing = THINGS[round.object];
        const choices = flip ? [...STEPS].reverse() : STEPS;
        return (
          <div className="flex flex-col items-center gap-[clamp(14px,3.6vh,32px)]">
            <div className={`${styles.shelf} flex min-h-[clamp(96px,19vh,156px)] items-end gap-[clamp(14px,4vw,44px)] rounded-3xl px-[clamp(16px,4vw,40px)] pb-3`} aria-label={`Small to big ${name}s with one missing`}>
              {STEPS.map((step) =>
                step === round.missing ? (
                  <span
                    key={step}
                    aria-hidden
                    className={cn(styles.gap, picked && styles.gapFilled, "flex items-center justify-center rounded-2xl text-[clamp(18px,3.6vh,30px)] font-extrabold leading-none")}
                    style={{ width: STEP_FONT[step], height: STEP_FONT[step], fontSize: picked ? `calc(${STEP_FONT[step]} * 0.8)` : undefined }}
                  >
                    {picked ? thing.emoji : "?"}
                  </span>
                ) : (
                  <span key={step} aria-hidden className="leading-none" style={{ fontSize: STEP_FONT[step] }}>
                    {thing.emoji}
                  </span>
                ),
              )}
            </div>
            <div className="flex items-end justify-center gap-[clamp(12px,4vw,40px)]">
              {choices.map((step) =>
                choice(
                  step,
                  `${step} ${name}`,
                  <span aria-hidden className="leading-none" style={{ fontSize: STEP_FONT[step] }}>
                    {thing.emoji}
                  </span>,
                  `${styles.porthole} size-[clamp(96px,19vh,156px)] rounded-full`,
                ),
              )}
            </div>
          </div>
        );
      }
      case "distance": {
        const thing = THINGS[round.object];
        const x = (pct: number) => (round.side === "left" ? pct : 100 - pct);
        return (
          <div className={`${styles.space} relative h-[clamp(210px,44vh,380px)] w-[min(96vw,880px)] overflow-hidden rounded-[2rem]`}>
            <span aria-hidden className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-[clamp(78px,17vh,140px)] leading-none" style={{ left: `${x(12)}%` }}>
              🌕
            </span>
            {(["near", "far"] as const).map((id) =>
              choice(
                id,
                `${name} ${id === "near" ? "near" : "far from"} the moon`,
                <span aria-hidden className="text-[clamp(42px,8.6vh,74px)] leading-none">{thing.emoji}</span>,
                `${styles.floater} absolute top-1/2 size-[clamp(72px,15vh,124px)] -translate-x-1/2 -translate-y-1/2 rounded-full`,
                { left: `${x(id === "near" ? 32 : 87)}%` },
              ),
            )}
          </div>
        );
      }
      case "position": {
        const thing = THINGS[round.object];
        const x = (pct: number) => (flip ? 100 - pct : pct);
        return (
          <div className={`${styles.space} relative h-[clamp(210px,44vh,380px)] w-[min(96vw,880px)] overflow-hidden rounded-[2rem]`}>
            <span aria-hidden className={`${styles.ground} absolute inset-x-0 bottom-0 h-[22%]`} />
            <span aria-hidden className={`${styles.dome} absolute bottom-[20%] h-[66%] w-[42%] -translate-x-1/2 rounded-t-full`} style={{ left: `${x(32)}%` }} />
            {(["inside", "outside"] as const).map((id) =>
              choice(
                id,
                `${name} ${id} the dome`,
                <span aria-hidden className="text-[clamp(42px,8.6vh,74px)] leading-none">{thing.emoji}</span>,
                `${styles.floater} absolute bottom-[24%] size-[clamp(72px,15vh,124px)] -translate-x-1/2 rounded-full`,
                { left: `${x(id === "inside" ? 32 : 80)}%` },
              ),
            )}
          </div>
        );
      }
    }
  })();

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      {SKY_STARS.map(([left, top], i) => (
        <span key={i} aria-hidden className={`${styles.twinkle} pointer-events-none absolute size-1.5 rounded-full`} style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${(i % 5) * 0.6}s` }} />
      ))}

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
              className={cn("size-[clamp(14px,2.6vh,22px)] object-contain transition-transform", i === roundIndex && "scale-125")}
            />
          ))}
        </div>
      )}

      <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(24px,5vh,42px)] font-extrabold leading-tight`}>{title}</h1>

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
            You answered {score} of {total} space tasks!
          </p>
          <div className="flex max-w-[92vw] flex-wrap items-center justify-center gap-[clamp(4px,1vw,10px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(26px,5.4vh,48px)] object-contain drop-shadow-[0_0_6px_rgba(253,224,71,0.45)]" />
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

          <main key={round.key} className={`${styles.warp} relative z-[1] flex min-h-0 w-full flex-1 items-center justify-center py-[clamp(8px,2vh,20px)]`}>
            {body}
          </main>
        </>
      )}
    </div>
  );
}
