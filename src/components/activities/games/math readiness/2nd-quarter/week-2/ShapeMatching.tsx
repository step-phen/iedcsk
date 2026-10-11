"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import {
  COLOR_HEX,
  INSTRUCTION,
  SIZE_PX,
  TRY_AGAIN,
  correctSpeech,
  isShapeName,
  parseChoice,
  parseReference,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type Choice,
  type ShapeName,
} from "./ShapeMatching.data";
import styles from "./ShapeMatching.module.css";

/** A shape drawn with pure CSS — no art assets, so color and size can vary freely per round. */
function ShapeGlyph({ shape, color, size }: { shape: ShapeName; color: string; size: number }) {
  const hex = COLOR_HEX[color];
  const common = { background: hex, boxShadow: "0 3px 0 rgba(34,49,79,0.3)" } as const;
  if (shape === "circle") return <div style={{ ...common, width: size, height: size, borderRadius: "9999px" }} />;
  if (shape === "square") return <div style={{ ...common, width: size, height: size, borderRadius: size * 0.14 }} />;
  if (shape === "rectangle") return <div style={{ ...common, width: size * 1.35, height: size * 0.7, borderRadius: size * 0.12 }} />;
  // triangle
  return (
    <div
      style={{
        width: 0,
        height: 0,
        borderLeft: `${size / 2}px solid transparent`,
        borderRight: `${size / 2}px solid transparent`,
        borderBottom: `${size * 0.87}px solid ${hex}`,
        filter: "drop-shadow(0 3px 0 rgba(34,49,79,0.3))",
      }}
    />
  );
}

interface Round {
  key: string;
  shape: ShapeName;
  reference: { color: string; size: keyof typeof SIZE_PX };
  choices: Choice[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

const shuffle = <T,>(list: readonly T[]): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

function buildRound(row: QuestionRow): Round {
  const { shape, reference, choices } = row.questionData as { shape: unknown; reference: unknown; choices: unknown };
  if (!isShapeName(shape)) throw new Error(`Question ${row.questionKey} needs a known "shape"`);
  if (!Array.isArray(choices) || choices.length === 0) throw new Error(`Question ${row.questionKey} needs "choices"`);
  const parsedChoices = choices.map(parseChoice);
  if (!parsedChoices.some((c) => c.id === row.correctAnswer.answer)) {
    throw new Error(`Question ${row.questionKey}'s correct answer must be one of its choices`);
  }
  return { key: row.questionKey, shape, reference: parseReference(reference), choices: parsedChoices };
}

export default function ShapeMatching({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Shape Matching questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const total = rounds?.length ?? 0;
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [locked, setLocked] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [correctId, setCorrectId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const attemptsRef = useRef(0);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Shape Matching";
  const answer = round ? round.choices.find((c) => c.shape === round.shape)!.id : null;

  // Choices keep the DB's content but land in a freshly-shuffled order each round.
  const orderedChoices = useMemo(() => (round ? shuffle(round.choices) : []), [round]);

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
    const prompt = promptSpeech(round.shape);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["shape matching"], prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setWrongId(null);
    setCorrectId(null);
    setRevealed(false);
    attemptsRef.current = 0;
    if (roundIndex + 1 >= total) {
      setPhase("complete");
    } else {
      setRoundIndex((i) => i + 1);
    }
    setLocked(false);
  }, [roundIndex, total]);

  const tapChoice = useCallback(
    (choice: Choice) => {
      if (!round || !answer || locked || correctId) return;
      attemptsRef.current += 1;
      const firstTry = attemptsRef.current === 1;
      if (firstTry) answersRef.current = [...answersRef.current, { questionId: round.key, response: choice.id }];

      if (choice.id === answer) {
        if (firstTry) setScore((s) => s + 1);
        setLocked(true);
        setCorrectId(choice.id);
        speak(correctSpeech(round.shape), advance);
        return;
      }

      setLocked(true);
      setWrongId(choice.id);
      window.setTimeout(() => setWrongId((id) => (id === choice.id ? null : id)), 450);

      if (attemptsRef.current < 2) {
        speak(TRY_AGAIN, () => setLocked(false));
        return;
      }

      setRevealed(true);
      speak(revealSpeech(round.shape), () => {
        setCorrectId(answer);
        advance();
      });
    },
    [round, answer, locked, correctId, speak, advance],
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Getting the shapes ready…</p>
      </div>
    );
  }

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
            <span key={r.key} aria-hidden className={cn("inline-block text-[clamp(16px,3vh,24px)] leading-none transition-transform", i === roundIndex && "scale-125")}>
              {i < roundIndex || (i === roundIndex && correctId === answer) ? "⭐" : "☆"}
            </span>
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
            You matched {score} of {total} shapes!
          </p>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.shape))}
              disabled={!!correctId}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(14px,3vh,32px)]">
            <div className={`${styles.referenceCard} flex items-center justify-center rounded-3xl p-[clamp(10px,2vh,20px)]`}>
              <ShapeGlyph shape={round.shape} color={round.reference.color} size={SIZE_PX[round.reference.size]} />
            </div>

            <div className="flex flex-wrap items-end justify-center gap-[clamp(10px,2.4vw,24px)]">
              {orderedChoices.map((choice) => {
                const isWrong = wrongId === choice.id;
                const isCorrect = correctId === choice.id;
                const isReveal = revealed && choice.id === answer && !isCorrect;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => tapChoice(choice)}
                    disabled={(locked && !isWrong) || !!correctId}
                    aria-label={`${choice.color} ${choice.size} ${choice.shape}`}
                    className={cn(
                      styles.choiceCard,
                      "flex h-[clamp(80px,16vh,132px)] w-[clamp(80px,16vh,132px)] shrink-0 items-center justify-center rounded-3xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] disabled:cursor-default",
                      isWrong && styles.choiceWrong,
                      isReveal && styles.choiceReveal,
                      isCorrect && styles.choiceCorrect,
                    )}
                  >
                    <ShapeGlyph shape={choice.shape} color={choice.color} size={SIZE_PX[choice.size]} />
                  </button>
                );
              })}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
