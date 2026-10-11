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
  TOYS,
  answerOf,
  correctSpeech,
  instruction,
  isShape,
  isToy,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type Round,
  type Shape,
} from "./MathGame.data";
import styles from "./MathGame.module.css";

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

const isNumberList = (v: unknown): v is number[] => Array.isArray(v) && v.length >= 2 && v.every((n) => Number.isInteger(n) && n >= 0 && n <= 10);

function buildRound(row: QuestionRow): Round {
  const d = row.questionData as Record<string, unknown>;
  const key = row.questionKey;
  const bad = (why: string) => new Error(`Question ${key} ${why}`);
  let round: Round;
  switch (d.kind) {
    case "count":
      if (!isToy(d.object) || !Number.isInteger(d.count) || (d.count as number) < 1 || (d.count as number) > 10 || !isNumberList(d.choices)) {
        throw bad('needs a known toy "object", a "count" from 1 to 10 and numeral "choices"');
      }
      round = { key, kind: "count", toy: d.object, count: d.count as number, choices: d.choices };
      break;
    case "shape":
      if (!isShape(d.ask) || !Array.isArray(d.choices) || d.choices.length < 2 || !d.choices.every(isShape)) throw bad('needs a shape "ask" and shape "choices"');
      round = { key, kind: "shape", ask: d.ask, choices: d.choices };
      break;
    case "countShape":
      if (!isShape(d.ask) || !Array.isArray(d.shapes) || d.shapes.length < 2 || d.shapes.length > 10 || !d.shapes.every(isShape) || !isNumberList(d.choices)) {
        throw bad('needs a shape "ask", up to 10 "shapes" and numeral "choices"');
      }
      round = { key, kind: "countShape", ask: d.ask, shapes: d.shapes, choices: d.choices };
      break;
    default:
      throw bad("has an unknown kind");
  }
  const answer = answerOf(round);
  if (!(round.choices as (string | number)[]).map(String).includes(answer)) throw bad(`needs choices that include "${answer}"`);
  if (row.correctAnswer.answer !== answer) throw bad(`must have the answer "${answer}"`);
  return round;
}

const SHAPE_COLOR: Record<Shape, string> = { circle: "#ef4444", square: "#3b82f6", triangle: "#f59e0b", rectangle: "#22c55e" };

/** A painted wooden toy block in one of the four taught shapes. */
function ShapeBlock({ shape, size }: { shape: Shape; size: string }) {
  const fill = SHAPE_COLOR[shape];
  const stroke = "#1e1b4b";
  return (
    <svg viewBox="0 0 100 100" aria-hidden style={{ width: size, height: size }}>
      {shape === "circle" && <circle cx="50" cy="50" r="42" fill={fill} stroke={stroke} strokeWidth="6" />}
      {shape === "square" && <rect x="10" y="10" width="80" height="80" rx="6" fill={fill} stroke={stroke} strokeWidth="6" />}
      {shape === "triangle" && <polygon points="50,8 94,90 6,90" fill={fill} stroke={stroke} strokeWidth="6" strokeLinejoin="round" />}
      {shape === "rectangle" && <rect x="4" y="26" width="92" height="48" rx="6" fill={fill} stroke={stroke} strokeWidth="6" />}
    </svg>
  );
}

export default function MathGame({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Math Game questions:", err);
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
  const title = activityName || "Math Game";
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
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["math game"], prompt]);
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Opening the toy shop…</p>
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
      {choices.map((n) =>
        choice(String(n), `Number ${n}`, n, `${styles.tag} size-[clamp(64px,13vh,100px)] rounded-2xl text-[clamp(28px,6vh,44px)] font-extrabold leading-none tabular-nums`),
      )}
    </div>
  );

  const body = (() => {
    switch (round.kind) {
      case "count":
        return (
          <>
            <div className={`${styles.shelf} flex min-h-[clamp(90px,18vh,150px)] w-[min(92vw,620px)] flex-wrap items-end justify-center gap-[clamp(4px,1.2vw,12px)] rounded-t-xl px-4 pb-3 pt-4`}>
              {Array.from({ length: round.count }, (_, i) => (
                <span key={i} aria-hidden className="text-[clamp(32px,7vh,58px)] leading-none">
                  {TOYS[round.toy].emoji}
                </span>
              ))}
            </div>
            {numberCards(round.choices)}
          </>
        );
      case "shape":
        return (
          <div className={`${styles.shelf} flex w-[min(92vw,640px)] items-end justify-center gap-[clamp(12px,4vw,40px)] rounded-t-xl px-4 pb-4 pt-6`}>
            {round.choices.map((s) => choice(s, s, <ShapeBlock shape={s} size="clamp(70px, 15vh, 130px)" />, `${styles.slot} rounded-2xl p-2`))}
          </div>
        );
      case "countShape":
        return (
          <>
            <div className={`${styles.pegboard} flex w-[min(92vw,620px)] flex-wrap items-center justify-center gap-[clamp(6px,1.6vw,16px)] rounded-2xl p-[clamp(10px,2vh,18px)]`}>
              {round.shapes.map((s, i) => (
                <ShapeBlock key={i} shape={s} size="clamp(40px, 8.6vh, 72px)" />
              ))}
            </div>
            {numberCards(round.choices)}
          </>
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
            You solved {score} of {total} toy shop tasks!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(30,27,75,0.3)]" />
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
