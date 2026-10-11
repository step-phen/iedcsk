"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Star, Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { SHAPES, OBJECTS, INSTRUCTION, TRY_AGAIN, DONE_TEXT, promptSpeech, correctSpeech, revealSpeech, resultSpeech } from "./ShapeHunt.data";
import styles from "./ShapeHunt.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// Marks are drawn in a 100 x 100 box over the card, this far in from its edges.
const MARK_INSET = 6;

interface Round {
  id: string;
  shape: string;
  answer: string;
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

// The first pick is what the teacher's score is built from; attempts counts every tap until the right one.
interface RoundRecord {
  firstAnswer: string | null;
  attempts: number;
}

type Stage = "playing" | "done";

const shuffle = <T,>(list: T[]): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// Rounds keep their seeded order; only the three pictures inside each round move around.
const shuffleChoices = (rounds: Round[]): Round[] => rounds.map((r) => ({ ...r, choices: shuffle(r.choices) }));

const emptyRecords = (rounds: Round[]): Record<string, RoundRecord> =>
  Object.fromEntries(rounds.map((r) => [r.id, { firstAnswer: null, attempts: 0 }]));

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

export default function ShapeHunt({ activityId, activityName, onFinish }: GameComponentProps) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(false);
  const [wrongPicks, setWrongPicks] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  // Set after a second miss: the right card is shown zoomed and wiggling, and the round moves on with no point.
  const [revealed, setRevealed] = useState(false);
  const records = useRef<Record<string, RoundRecord>>({});
  const round = stage === "playing" ? rounds?.[index] : undefined;
  const total = rounds?.length ?? 0;

  // Question data lives in the DB (activity_questions) — fetched once on mount.
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
        const mapped = rows.map((row) => {
          const data = row.questionData as { shape?: unknown; choices?: unknown };
          const choices = Array.isArray(data.choices) ? data.choices : [];
          const answer = row.correctAnswer.answer;
          if (typeof data.shape !== "string" || !(data.shape in SHAPES)) {
            throw new Error(`Question ${row.questionKey} needs a known "shape"`);
          }
          if (choices.length < 2 || !choices.every((c) => typeof c === "string" && c in OBJECTS) || !choices.includes(answer)) {
            throw new Error(`Question ${row.questionKey} needs choices from the object list that include the answer`);
          }
          return { id: row.questionKey, shape: data.shape, answer, choices: choices as string[] };
        });
        records.current = emptyRecords(mapped);
        setRounds(shuffleChoices(mapped));
      } catch (err) {
        console.error("Failed to load Shape Hunt questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  // Display-only: the learner name and photo the child already picked on /learner; never used for grading.
  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);

  const { speak, speakAll, stop } = useSpeech();
  useEffect(() => stop, [stop]);

  // Asks for each shape as its round appears; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!round) return;
    const prompt = promptSpeech(round.shape);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["shape hunt"], prompt]);
      return;
    }
    introDone.current = true;
    speak(prompt);
  }, [round, speak, speakAll]);

  // Short tones synthesized via Web Audio — no audio file to ship or 404 on.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playTones = useCallback((freqs: number[], type: OscillatorType) => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.1;
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.15, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        osc.start(t);
        osc.stop(t + 0.36);
      });
    } catch {
      // Ignore web audio exceptions if restricted
    }
  }, []);

  // A ref, not only state, so two taps landing in the same tick can't both answer.
  const lockedRef = useRef(false);
  const lock = (on: boolean) => {
    lockedRef.current = on;
    setLocked(on);
  };

  // Retries are allowed until the right picture is found, but only a right first pick scores the point.
  const choose = (choice: string) => {
    if (!round || lockedRef.current || solved) return;
    lock(true);
    const rec = records.current[round.id];
    rec.attempts += 1;
    rec.firstAnswer ??= choice;

    const isLast = index === total - 1;
    const next = (finalScore: number) => {
      setWrongPicks([]);
      setSolved(false);
      setRevealed(false);
      lock(false);
      if (!isLast) return setIndex((i) => i + 1);
      // Score is sent once the result line has been spoken.
      setStage("done");
      speak(resultSpeech(finalScore, total), handleFinish);
    };

    if (choice !== round.answer) {
      playTones([330, 247], "triangle");
      setWrongPicks((w) => [...w, choice]);
      // First miss gets another try; the second miss shows the answer instead.
      if (rec.attempts < 2) return speak(TRY_AGAIN, () => lock(false));
      setSolved(true);
      setRevealed(true);
      return speak(revealSpeech(round.answer, round.shape), () => next(score));
    }

    if (rec.attempts === 1) setScore((s) => Math.min(s + 1, total));
    setSolved(true);
    playTones([523, 659, 784], "sine");
    speak(correctSpeech(choice, round.shape), () => next(score + (rec.attempts === 1 ? 1 : 0)));
  };

  // No Finish button: the score is sent once the result line has been spoken (see `next` above).
  const finishedRef = useRef(false);
  const handleFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const submitted: SubmittedAnswer[] = Object.entries(records.current)
      .filter(([, r]) => r.firstAnswer !== null)
      .map(([id, r]) => ({ questionId: id, response: r.firstAnswer as string }));
    onFinish?.(submitted);
  };

  // A circle for the right pick, an X for a wrong one, drawn over the card.
  const drawnMark = (right: boolean) => {
    const [lo, hi] = [MARK_INSET, 100 - MARK_INSET];
    const color = right ? "#2f9e8f" : "#c4574a";
    return (
      <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {right ? (
          <motion.ellipse
            cx={50}
            cy={50}
            rx={50 - MARK_INSET}
            ry={50 - MARK_INSET}
            fill="none"
            stroke={color}
            strokeWidth={4}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        ) : (
          [`M ${lo} ${lo} L ${hi} ${hi}`, `M ${hi} ${lo} L ${lo} ${hi}`].map((d, i) => (
            <motion.path
              key={i}
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.7}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.25, delay: i * 0.1, ease: "easeInOut" }}
            />
          ))
        )}
      </svg>
    );
  };

  if (loadError) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-4 text-center`}>
        <p className="text-lg font-bold">Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!rounds) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-4`}>
        <p className="text-lg font-bold">Loading…</p>
      </div>
    );
  }

  const choiceCard = (r: Round, choice: string) => {
    const obj = OBJECTS[choice];
    const isWrong = wrongPicks.includes(choice);
    const isRight = solved && choice === r.answer;
    return (
      <motion.button
        key={choice}
        type="button"
        onClick={() => choose(choice)}
        disabled={locked || isWrong || solved}
        aria-label={isWrong ? `${obj.name}, not this one` : obj.name}
        animate={
          isWrong
            ? { x: [0, -8, 8, -4, 4, 0] }
            : isRight && revealed
              ? { scale: 1.15, rotate: [0, -4, 4, -3, 3, 0] }
              : isRight
                ? { scale: [1, 1.1, 1.04] }
                : { scale: 1 }
        }
        transition={
          isRight && revealed
            ? { scale: { duration: 0.4, ease: EASE_OUT }, rotate: { duration: 0.9, repeat: Infinity, ease: "easeInOut" } }
            : { duration: 0.45, ease: EASE_OUT }
        }
        style={{ zIndex: isRight ? 1 : undefined }}
        className={`${styles.card} ${isWrong ? styles.wrong : ""} ${isRight ? styles.right : ""} relative flex aspect-square shrink-0 flex-col items-center justify-center gap-[3%] rounded-3xl disabled:cursor-default ${focusRing}`}
      >
        <span className="pointer-events-none relative flex h-[62%] w-[78%] items-center justify-center">
          {obj.image ? (
            <Image src={obj.image} alt="" fill sizes="230px" className="object-contain" draggable={false} />
          ) : (
            // Emoji stands in until real art exists — see ShapeHunt.data.ts.
            <span className="text-[clamp(40px,9dvh,96px)] leading-none" aria-hidden>
              {obj.emoji}
            </span>
          )}
        </span>
        <span className="pointer-events-none text-[clamp(16px,3.6dvh,30px)] font-extrabold leading-none">{obj.name}</span>
        {isWrong && drawnMark(false)}
        {isRight && drawnMark(true)}
      </motion.button>
    );
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full select-none flex-col overflow-hidden px-4 pb-3 pt-3 sm:px-8 sm:pb-5 sm:pt-5`}>
        {/* header: learner, title, score; upright phones put the title on its own line */}
        <div className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <div className="flex shrink-0 items-center gap-2">
            {learnerName && (
              <div className={`${styles.pill} flex items-center gap-2 rounded-full py-1 pl-1 pr-3 sm:pr-4`}>
                <motion.span
                  className={`${styles.avatar} flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-2xl leading-none sm:h-14 sm:w-14 sm:text-3xl`}
                  animate={{ rotate: [0, -18, 14, -10, 6, 0] }}
                  transition={{ duration: 0.9, ease: EASE_OUT }}
                  style={{ transformOrigin: "70% 70%" }}
                >
                  <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className="h-full w-full" />
                </motion.span>
                <span className={`${styles.learnerName} max-w-[7rem] truncate text-lg font-extrabold capitalize leading-none sm:max-w-[12rem] sm:text-2xl`}>
                  {learnerName}
                </span>
              </div>
            )}
          </div>
          <h2 className={`${styles.title} order-last min-w-0 basis-full truncate text-center text-2xl font-extrabold leading-tight sm:order-none sm:basis-auto sm:text-4xl`}>
            {activityName || "Shape Hunt"}
          </h2>
          <div className="flex shrink-0 items-center gap-2">
            <div
              className={`${styles.pill} ${styles.headerPill} flex items-center gap-1.5 rounded-full px-3 py-1 text-lg font-extrabold tabular-nums sm:text-2xl`}
              aria-label={`Score: ${score} out of ${total}`}
            >
              <Star aria-hidden="true" className="h-5 w-5 text-[#f2b134] sm:h-6 sm:w-6" fill="#f2b134" strokeWidth={2.2} />
              {score} / {total}
            </div>
          </div>
        </div>

        {/* instruction with the replay button */}
        <div className={`${styles.promptRow} relative z-10 mt-2 flex shrink-0 justify-center`}>
          <div className={`${styles.promptPill} flex items-center gap-2 rounded-3xl py-1 pl-4 pr-1 sm:gap-3 sm:rounded-full sm:pl-6`}>
            <p className={`${styles.instruction} text-base font-bold leading-tight sm:text-2xl`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => round && speak(promptSpeech(round.shape))}
              disabled={!round || locked}
              aria-label="Hear which shape to find"
              className={`${styles.roundButton} ${styles.speaker} flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${focusRing}`}
            >
              <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center py-2">
          <AnimatePresence mode="wait">
            {round ? (
              <motion.div
                key={`${round.id}-${index}`}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
                className={`${styles.board} flex flex-col items-center justify-center gap-[clamp(10px,2.5dvh,28px)]`}
              >
                {/* the shape to find */}
                <div
                  role="img"
                  aria-label={`Find the ${SHAPES[round.shape].name.toLowerCase()}`}
                  className={`${styles.shapeCard} flex aspect-square shrink-0 flex-col items-center justify-center gap-[3%] rounded-3xl`}
                >
                  <span className="pointer-events-none relative h-[64%] w-[76%]">
                    <Image src={SHAPES[round.shape].image} alt="" fill preload sizes="220px" className="object-contain" draggable={false} />
                  </span>
                  <span className="text-[clamp(16px,3.6dvh,30px)] font-extrabold leading-none">{SHAPES[round.shape].name}</span>
                </div>
                <div className="flex items-center justify-center gap-[clamp(8px,2vw,28px)]">{round.choices.map((c) => choiceCard(round, c))}</div>
              </motion.div>
            ) : (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
                className={`${styles.doneCard} flex max-w-md flex-col items-center gap-4 rounded-3xl px-6 py-5 text-center`}
                role="status"
              >
                <p className={`${styles.doneTitle} text-2xl font-extrabold leading-tight sm:text-3xl`}>{DONE_TEXT}</p>
                <div className={`${styles.doneScore} flex items-center gap-2 text-4xl font-extrabold tabular-nums sm:text-5xl`}>
                  <Star aria-hidden="true" className="h-9 w-9 text-[#f2b134] sm:h-11 sm:w-11" fill="#f2b134" strokeWidth={2.2} />
                  {score} / {total}
                </div>
                <p className="text-xl font-bold sm:text-2xl">
                  You got {score} of {total} correct!
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
