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
  isShape,
  isThing,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type Round,
  type Shape,
  type Thing,
} from "./MathReadinessReview4.data";
import styles from "./MathReadinessReview4.module.css";

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const isNumberList = (v: unknown): v is number[] => Array.isArray(v) && v.length >= 2 && v.every((n) => isInt(n, 0, 10));

function buildRound(row: QuestionRow): Round {
  const d = row.questionData as Record<string, unknown>;
  const key = row.questionKey;
  const bad = (why: string) => new Error(`Question ${key} ${why}`);
  let round: Round;
  switch (d.kind) {
    case "add":
      if (!isThing(d.object) || !isInt(d.groupA, 1, 9) || !isInt(d.groupB, 1, 9) || d.groupA + d.groupB > 10 || !isNumberList(d.choices)) throw bad("needs a thing, two groups up to 10 and numeral choices");
      round = { key, kind: "add", object: d.object, groupA: d.groupA, groupB: d.groupB, choices: d.choices };
      break;
    case "takeAway":
      if (!isThing(d.object) || !isInt(d.start, 1, 10) || !isInt(d.removed, 1, 10) || d.removed > d.start || !isNumberList(d.choices)) throw bad("needs a thing, a start, a removed no greater than start and numeral choices");
      round = { key, kind: "takeAway", object: d.object, start: d.start, removed: d.removed, choices: d.choices };
      break;
    case "next": {
      const seq = d.sequence;
      if (!isNumberList(seq) || !seq.every((n, i) => i === 0 || n === seq[i - 1] + 1) || seq[seq.length - 1] >= 10 || !isNumberList(d.choices)) throw bad("needs a forward sequence ending below 10 and numeral choices");
      round = { key, kind: "next", sequence: seq, choices: d.choices };
      break;
    }
    case "missing": {
      const raw = Array.isArray(d.sequence) ? (d.sequence as unknown[]) : [];
      const gap = raw.indexOf(null);
      const first = gap === 0 ? (raw[1] as number) - 1 : (raw[0] as number);
      if (raw.length < 3 || gap < 0 || raw.lastIndexOf(null) !== gap || !isInt(first, 1, 10) || !raw.every((n, i) => n === null || n === first + i) || first + raw.length - 1 > 10 || !isNumberList(d.choices)) {
        throw bad("needs a forward sequence with one null gap and numeral choices");
      }
      round = { key, kind: "missing", sequence: raw as (number | null)[], missing: first + gap, choices: d.choices };
      break;
    }
    case "count":
      if (!isThing(d.object) || !isInt(d.count, 1, 10) || !isNumberList(d.choices)) throw bad("needs a thing, a count and numeral choices");
      round = { key, kind: "count", object: d.object, count: d.count, choices: d.choices };
      break;
    case "shape":
      if (!isShape(d.ask) || !Array.isArray(d.choices) || d.choices.length < 2 || !d.choices.every(isShape)) throw bad("needs a shape ask and shape choices");
      round = { key, kind: "shape", ask: d.ask, choices: d.choices as Shape[] };
      break;
    case "compare":
      if (!isThing(d.object) || !isInt(d.left, 1, 10) || !isInt(d.right, 1, 10) || d.left === d.right || (d.ask !== "more" && d.ask !== "fewer")) throw bad("needs a thing, two different group sizes and an ask of more or fewer");
      round = { key, kind: "compare", object: d.object, left: d.left, right: d.right, ask: d.ask };
      break;
    default:
      throw bad("has an unknown kind");
  }
  const answer = answerOf(round);
  if ("choices" in round && !(round.choices as (string | number)[]).map(String).includes(answer)) throw bad(`needs choices that include "${answer}"`);
  if (row.correctAnswer.answer !== answer) throw bad(`must have the answer "${answer}"`);
  return round;
}

const FLAG_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7"];
const SHAPE_COLOR: Record<Shape, string> = { circle: "#f43f5e", square: "#0ea5e9", triangle: "#eab308", rectangle: "#10b981" };

/** A flat fiesta cut-out shape. */
function FiestaShape({ shape, size }: { shape: Shape; size: string }) {
  const fill = SHAPE_COLOR[shape];
  return (
    <svg viewBox="0 0 100 100" aria-hidden style={{ width: size, height: size }}>
      {shape === "circle" && <circle cx="50" cy="50" r="44" fill={fill} />}
      {shape === "square" && <rect x="8" y="8" width="84" height="84" fill={fill} />}
      {shape === "triangle" && <polygon points="50,6 96,92 4,92" fill={fill} />}
      {shape === "rectangle" && <rect x="2" y="24" width="96" height="52" fill={fill} />}
    </svg>
  );
}

function Things({ object, count, crossed = 0 }: { object: Thing; count: number; crossed?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} aria-hidden className={cn("relative text-[clamp(26px,5.4vh,44px)] leading-none", i >= count - crossed && styles.taken)}>
          {THINGS[object].emoji}
        </span>
      ))}
    </>
  );
}

export default function MathReadinessReview4({ activityId, activityName, onFinish }: GameComponentProps) {
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
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["math readiness review 4"], prompt]);
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
      if (!round || picked !== null) return;
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Hanging up the fiesta flags…</p>
      </div>
    );
  }

  const answer = answerOf(round);
  const pickedRight = picked === answer;

  /** One tappable answer with the shared wrong / reveal / correct marks. */
  const choice = (id: string, label: string, content: React.ReactNode, className: string) => (
    <button
      key={id}
      type="button"
      onClick={() => tap(id)}
      disabled={picked !== null}
      aria-label={label}
      className={cn(
        "relative flex items-center justify-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#facc15] disabled:cursor-default",
        className,
        picked === id && id !== answer && styles.choiceWrong,
        picked !== null && id === answer && (pickedRight ? styles.choiceCorrect : styles.choiceReveal),
      )}
    >
      {content}
      {picked === id && id !== answer && (
        <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-2 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
          ✕
        </span>
      )}
    </button>
  );

  const numberCards = (choices: number[]) => (
    <div className="flex items-center gap-[clamp(10px,2.4vw,20px)]">
      {choices.map((n) => choice(String(n), `Number ${n}`, n, `${styles.card} size-[clamp(62px,12.6vh,96px)] rounded-2xl text-[clamp(28px,6vh,44px)] font-extrabold leading-none tabular-nums`))}
    </div>
  );

  /** Numbers on a string of banderitas, with a blank flag for the one to find. */
  const bunting = (cells: (number | null)[]) => (
    <div className={`${styles.string} flex items-start justify-center gap-[clamp(2px,0.8vw,8px)] px-3 pt-2`}>
      {cells.map((n, i) => (
        <span
          key={i}
          className={cn(styles.flag, n === null && styles.flagBlank, "flex h-[clamp(64px,13vh,104px)] w-[clamp(46px,min(10vh,14vw),80px)] items-start justify-center pt-[clamp(6px,1.4vh,12px)] text-[clamp(22px,4.6vh,38px)] font-extrabold tabular-nums")}
          style={n === null ? undefined : { background: FLAG_COLORS[i % FLAG_COLORS.length] }}
        >
          {n ?? "?"}
        </span>
      ))}
    </div>
  );

  const body = (() => {
    switch (round.kind) {
      case "add":
        return (
          <>
            <div className="flex items-center gap-[clamp(8px,2vw,18px)]">
              <div className={`${styles.tray} flex min-h-[clamp(80px,16vh,130px)] w-[clamp(120px,30vw,230px)] flex-wrap content-center items-center justify-center gap-1 rounded-2xl p-3`}>
                <Things object={round.object} count={round.groupA} />
              </div>
              <span aria-hidden className={`${styles.sign} text-[clamp(30px,5.6vh,48px)] font-extrabold leading-none`}>+</span>
              <div className={`${styles.tray} flex min-h-[clamp(80px,16vh,130px)] w-[clamp(120px,30vw,230px)] flex-wrap content-center items-center justify-center gap-1 rounded-2xl p-3`}>
                <Things object={round.object} count={round.groupB} />
              </div>
            </div>
            {numberCards(round.choices)}
          </>
        );
      case "takeAway":
        return (
          <>
            <div className={`${styles.tray} flex min-h-[clamp(80px,16vh,130px)] w-[min(90vw,520px)] flex-wrap content-center items-center justify-center gap-1 rounded-2xl p-3`}>
              <Things object={round.object} count={round.start} crossed={round.removed} />
            </div>
            {numberCards(round.choices)}
          </>
        );
      case "next":
        return (
          <>
            {bunting([...round.sequence, null])}
            {numberCards(round.choices)}
          </>
        );
      case "missing":
        return (
          <>
            {bunting(round.sequence)}
            {numberCards(round.choices)}
          </>
        );
      case "count":
        return (
          <>
            <div className={`${styles.tray} flex min-h-[clamp(80px,16vh,130px)] w-[min(90vw,520px)] flex-wrap content-center items-center justify-center gap-1 rounded-2xl p-3`}>
              <Things object={round.object} count={round.count} />
            </div>
            {numberCards(round.choices)}
          </>
        );
      case "shape":
        return (
          <div className="flex items-center gap-[clamp(12px,3.4vw,32px)]">
            {round.choices.map((s) => choice(s, s, <FiestaShape shape={s} size="clamp(64px, 14vh, 120px)" />, `${styles.card} rounded-2xl p-[clamp(8px,1.6vh,14px)]`))}
          </div>
        );
      case "compare":
        return (
          <div className="flex items-stretch gap-[clamp(12px,3vw,32px)]">
            {(["left", "right"] as const).map((side) =>
              choice(
                side,
                `Side with ${round[side]} ${THINGS[round.object].plural}`,
                <span className="flex flex-wrap content-center items-center justify-center gap-1">
                  <Things object={round.object} count={round[side]} />
                </span>,
                `${styles.card} min-h-[clamp(120px,26vh,210px)] w-[clamp(130px,36vw,260px)] rounded-3xl p-3`,
              ),
            )}
          </div>
        );
    }
  })();

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      <div aria-hidden className={`${styles.topBunting} pointer-events-none absolute inset-x-0 top-0 h-6`} />
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
            <div className={`${styles.resultStamp} rounded-2xl px-[clamp(16px,3vw,32px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You got {score} of {total} fiesta tasks right!
          </p>
          <div className="flex max-w-[92vw] flex-wrap items-center justify-center gap-[clamp(4px,1vw,10px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(30px,6.4vh,56px)] object-contain drop-shadow-[0_4px_3px_rgba(49,46,129,0.3)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={cn(styles.instruction, picked !== null && !pickedRight && styles.instructionReveal, "m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight")}>
              {picked !== null && !pickedRight ? REVEAL_TEXT : instruction(round)}
            </p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round))}
              disabled={picked !== null}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main key={round.key} className={`${styles.stage} relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(12px,2.8vh,24px)] py-2`}>
            {body}
          </main>
        </>
      )}
    </div>
  );
}
