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
  isThing,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type Round,
  type Thing,
} from "./MathReadinessFinalAssessment4.data";
import styles from "./MathReadinessFinalAssessment4.module.css";

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
    default:
      throw bad("has an unknown kind");
  }
  const answer = answerOf(round);
  if (!round.choices.includes(answer)) throw bad(`needs choices that include ${answer}`);
  if (row.correctAnswer.answer !== String(answer)) throw bad(`must have the answer "${answer}"`);
  return round;
}

function Desk({ object, count, crossed = 0, className }: { object: Thing; count: number; crossed?: number; className?: string }) {
  return (
    <div className={cn(styles.desk, "flex min-h-[clamp(80px,16vh,130px)] flex-wrap content-center items-center justify-center gap-1 rounded-2xl p-3", className)}>
      {Array.from({ length: count }, (_, i) => {
        const gone = i >= count - crossed;
        return (
          <span key={i} aria-hidden className={cn("relative text-[clamp(24px,5vh,42px)] leading-none", gone && styles.gone)}>
            {THINGS[object].emoji}
            {gone && <span className={`${styles.goneMark} absolute inset-0 flex items-center justify-center text-[0.8em] font-black`}>✕</span>}
          </span>
        );
      })}
    </div>
  );
}

export default function MathReadinessFinalAssessment4({ activityId, activityName, onFinish }: GameComponentProps) {
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
  const [picked, setPicked] = useState<number | null>(null);
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
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["math readiness final assessment 4"], prompt]);
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
    (choice: number) => {
      if (!round || picked !== null) return;
      const correct = choice === answerOf(round);
      setPicked(choice);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: String(choice) }];
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Getting ready for Moving Up Day…</p>
      </div>
    );
  }

  const answer = answerOf(round);
  const pickedRight = picked === answer;

  /** Numbers on graduation caps, with an empty cap for the one to find. */
  const caps = (cells: (number | null)[]) => (
    <div className="flex items-end justify-center gap-[clamp(4px,1.2vw,12px)]">
      {cells.map((n, i) => (
        <span
          key={i}
          className={cn(styles.cap, n === null && styles.capBlank, "relative flex size-[clamp(44px,min(10vh,14vw),80px)] items-center justify-center rounded-md text-[clamp(22px,4.6vh,38px)] font-extrabold tabular-nums")}
        >
          {n ?? "?"}
        </span>
      ))}
    </div>
  );

  const scene = (() => {
    switch (round.kind) {
      case "add":
        return (
          <div className="flex items-center gap-[clamp(8px,2vw,18px)]">
            <Desk object={round.object} count={round.groupA} className="w-[clamp(120px,30vw,230px)]" />
            <span aria-hidden className={`${styles.sign} text-[clamp(30px,5.6vh,48px)] font-extrabold leading-none`}>+</span>
            <Desk object={round.object} count={round.groupB} className="w-[clamp(120px,30vw,230px)]" />
          </div>
        );
      case "takeAway":
        return <Desk object={round.object} count={round.start} crossed={round.removed} className="w-[min(90vw,520px)]" />;
      case "next":
        return caps([...round.sequence, null]);
      case "missing":
        return caps(round.sequence);
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
              className={cn("size-[clamp(14px,2.4vh,22px)] object-contain transition-transform", i === roundIndex && "scale-125")}
            />
          ))}
        </div>
      )}

      <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(24px,5vh,42px)] font-extrabold leading-tight`}>{title}</h1>

      {phase === "complete" ? (
        <div className={`${styles.result} relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center`}>
          <span aria-hidden className="text-[clamp(48px,10vh,90px)] leading-none">🎓</span>
          <div className="flex items-center gap-3">
            <div className={`${styles.resultStamp} rounded-md px-[clamp(16px,3vw,32px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You answered {score} of {total} tasks correctly!
          </p>
          <div className="flex max-w-[92vw] flex-wrap items-center justify-center gap-[clamp(3px,0.8vw,8px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(26px,5.4vh,46px)] object-contain drop-shadow-[0_4px_3px_rgba(0,0,0,0.35)]" />
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

          <main key={round.key} className={`${styles.stage} relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(14px,3.2vh,26px)] py-2`}>
            {scene}
            <div className="flex items-center gap-[clamp(10px,2.4vw,20px)]">
              {round.choices.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => tap(n)}
                  disabled={picked !== null}
                  aria-label={`Number ${n}`}
                  className={cn(
                    styles.diploma,
                    "relative flex size-[clamp(62px,12.6vh,96px)] items-center justify-center rounded-xl text-[clamp(28px,6vh,44px)] font-extrabold leading-none tabular-nums focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#facc15] disabled:cursor-default",
                    picked === n && n !== answer && styles.choiceWrong,
                    picked !== null && n === answer && (pickedRight ? styles.choiceCorrect : styles.choiceReveal),
                  )}
                >
                  {n}
                  {picked === n && n !== answer && (
                    <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-2 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                      ✕
                    </span>
                  )}
                </button>
              ))}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
