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
  MATERIALS,
  REVEAL_TEXT,
  STATION,
  answerOf,
  correctSpeech,
  instruction,
  isMaterial,
  isShape,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type Material,
  type Round,
  type Shape,
} from "./MathSkillsReview4.data";
import styles from "./MathSkillsReview4.module.css";

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const isNumberList = (v: unknown): v is number[] => Array.isArray(v) && v.length >= 2 && v.every((n) => isInt(n, 0, 10));
const isShapeList = (v: unknown): v is Shape[] => Array.isArray(v) && v.length >= 2 && v.every(isShape);

function buildRound(row: QuestionRow): Round {
  const d = row.questionData as Record<string, unknown>;
  const key = row.questionKey;
  const bad = (why: string) => new Error(`Question ${key} ${why}`);
  let round: Round;
  switch (d.kind) {
    case "count":
      if (!isMaterial(d.object) || !isInt(d.count, 1, 10) || !isNumberList(d.choices)) throw bad('needs a known "object", a "count" and numeral "choices"');
      round = { key, kind: "count", object: d.object, count: d.count, choices: d.choices };
      break;
    case "add":
      if (!isMaterial(d.object) || !isInt(d.groupA, 1, 9) || !isInt(d.groupB, 1, 9) || d.groupA + d.groupB > 10 || !isNumberList(d.choices)) {
        throw bad('needs a known "object", two groups totaling up to 10 and numeral "choices"');
      }
      round = { key, kind: "add", object: d.object, groupA: d.groupA, groupB: d.groupB, choices: d.choices };
      break;
    case "takeAway":
      if (!isMaterial(d.object) || !isInt(d.start, 1, 10) || !isInt(d.removed, 1, 10) || d.removed > d.start || !isNumberList(d.choices)) {
        throw bad('needs a known "object", a "start", a "removed" no greater than start and numeral "choices"');
      }
      round = { key, kind: "takeAway", object: d.object, start: d.start, removed: d.removed, choices: d.choices };
      break;
    case "shape":
      if (!isShape(d.ask) || !isShapeList(d.choices)) throw bad('needs a shape "ask" and shape "choices"');
      round = { key, kind: "shape", ask: d.ask, choices: d.choices };
      break;
    case "pattern": {
      const seq = d.sequence;
      if (!isShapeList(seq) || seq.length < 3 || seq[0] === seq[1] || !seq.every((s, i) => s === seq[i % 2]) || !isShapeList(d.choices)) {
        throw bad('needs an AB shape "sequence" and shape "choices"');
      }
      round = { key, kind: "pattern", sequence: seq, choices: d.choices };
      break;
    }
    case "compare":
      if (!isMaterial(d.object) || !isInt(d.left, 1, 10) || !isInt(d.right, 1, 10) || d.left === d.right || (d.ask !== "more" && d.ask !== "fewer")) {
        throw bad('needs a known "object", two different group sizes and an "ask" of more or fewer');
      }
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

const SHAPE_COLOR: Record<Shape, string> = { circle: "#f472b6", square: "#38bdf8", triangle: "#facc15", rectangle: "#a78bfa" };

/** A felt cut-out shape with a white stitched edge. */
function FeltShape({ shape, size }: { shape: Shape; size: string }) {
  const common = { fill: SHAPE_COLOR[shape], stroke: "#fff", strokeWidth: 5, strokeDasharray: "7 5" };
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={styles.felt} style={{ width: size, height: size }}>
      {shape === "circle" && <circle cx="50" cy="50" r="42" {...common} />}
      {shape === "square" && <rect x="10" y="10" width="80" height="80" rx="4" {...common} />}
      {shape === "triangle" && <polygon points="50,8 94,90 6,90" strokeLinejoin="round" {...common} />}
      {shape === "rectangle" && <rect x="4" y="26" width="92" height="48" rx="4" {...common} />}
    </svg>
  );
}

function Pile({ object, count, faded = 0, className }: { object: Material; count: number; faded?: number; className?: string }) {
  return (
    <div className={cn(styles.mat, "flex flex-wrap content-center items-center justify-center gap-1 rounded-2xl p-3", className)}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} aria-hidden className={cn("relative text-[clamp(26px,5.4vh,44px)] leading-none", i < faded && styles.gone)}>
          {MATERIALS[object].emoji}
          {i < faded && <span className={`${styles.goneMark} absolute inset-0 flex items-center justify-center text-[0.8em] font-black`}>✕</span>}
        </span>
      ))}
    </div>
  );
}

export default function MathSkillsReview4({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Math Skills Review 4 questions:", err);
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
  const title = activityName || "Math Skills Review 4";
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
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["math skills review 4"], prompt]);
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Setting up the stations…</p>
      </div>
    );
  }

  const answer = answerOf(round);
  const pickedRight = picked === answer;
  const station = STATION[round.kind];

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
      {choices.map((n) => choice(String(n), `Number ${n}`, n, `${styles.ticket} size-[clamp(62px,12.6vh,96px)] rounded-2xl text-[clamp(28px,6vh,44px)] font-extrabold leading-none tabular-nums`))}
    </div>
  );

  const shapeCards = (choices: Shape[]) => (
    <div className="flex items-center gap-[clamp(10px,3vw,28px)]">
      {choices.map((s) => choice(s, s, <FeltShape shape={s} size="clamp(56px, 12vh, 100px)" />, `${styles.ticket} rounded-2xl p-[clamp(6px,1.4vh,12px)]`))}
    </div>
  );

  const body = (() => {
    switch (round.kind) {
      case "count":
        return (
          <>
            <Pile object={round.object} count={round.count} className="min-h-[clamp(90px,18vh,150px)] w-[min(90vw,520px)]" />
            {numberCards(round.choices)}
          </>
        );
      case "add":
        return (
          <>
            <div className="flex items-center gap-[clamp(8px,2vw,18px)]">
              <Pile object={round.object} count={round.groupA} className="min-h-[clamp(84px,17vh,140px)] w-[clamp(120px,30vw,230px)]" />
              <span aria-hidden className={`${styles.sign} text-[clamp(30px,5.6vh,48px)] font-extrabold leading-none`}>+</span>
              <Pile object={round.object} count={round.groupB} className="min-h-[clamp(84px,17vh,140px)] w-[clamp(120px,30vw,230px)]" />
            </div>
            {numberCards(round.choices)}
          </>
        );
      case "takeAway":
        return (
          <>
            <Pile object={round.object} count={round.start} faded={round.removed} className="min-h-[clamp(90px,18vh,150px)] w-[min(90vw,520px)]" />
            {numberCards(round.choices)}
          </>
        );
      case "shape":
        return shapeCards(round.choices);
      case "pattern":
        return (
          <>
            <div className={`${styles.mat} flex items-center gap-[clamp(6px,1.6vw,14px)] rounded-2xl p-[clamp(8px,1.8vh,14px)]`}>
              {round.sequence.map((s, i) => (
                <FeltShape key={i} shape={s} size="clamp(44px, 9.4vh, 78px)" />
              ))}
              <span className={`${styles.mystery} flex size-[clamp(44px,9.4vh,78px)] items-center justify-center rounded-xl text-[clamp(26px,5.6vh,46px)] font-extrabold`}>?</span>
            </div>
            {shapeCards(round.choices)}
          </>
        );
      case "compare":
        return (
          <div className="flex items-stretch gap-[clamp(12px,3vw,32px)]">
            {(["left", "right"] as const).map((side) =>
              choice(
                side,
                `Group of ${round[side]} ${MATERIALS[round.object].plural}`,
                <span className="flex flex-wrap content-center items-center justify-center gap-1">
                  {Array.from({ length: round[side] }, (_, i) => (
                    <span key={i} aria-hidden className="text-[clamp(26px,5.4vh,44px)] leading-none">
                      {MATERIALS[round.object].emoji}
                    </span>
                  ))}
                </span>,
                `${styles.ticket} min-h-[clamp(120px,26vh,210px)] w-[clamp(130px,36vw,260px)] rounded-3xl p-3`,
              ),
            )}
          </div>
        );
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
            <div className={`${styles.resultStamp} rounded-2xl px-[clamp(16px,3vw,32px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You finished {score} of {total} stations correctly!
          </p>
          <div className="flex max-w-[92vw] flex-wrap items-center justify-center gap-[clamp(4px,1vw,10px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(30px,6.4vh,56px)] object-contain drop-shadow-[0_4px_3px_rgba(80,7,36,0.3)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 flex-wrap items-center justify-center gap-2">
            <span className={`${styles.signpost} flex items-center gap-1.5 rounded-lg px-3 py-1 text-[clamp(14px,2.4vh,20px)] font-extrabold uppercase tracking-wide`}>
              <span aria-hidden>{station.icon}</span>
              Station {roundIndex + 1}: {station.label}
            </span>
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
