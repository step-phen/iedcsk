"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Star, Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import RealisticEffect from "@/components/effects/RealisticEffect";
import ObjectGroup from "../week-3/ObjectGroup";
import {
  OBJECTS,
  SIDES,
  MAX_GROUP,
  WRONG,
  DONE_TEXT,
  type Ask,
  type Side,
  numberWord,
  objectName,
  instruction,
  answerSide,
  promptSpeech,
  rightSpeech,
  revealSpeech,
  resultSpeech,
} from "./MoreOrLess.data";
import styles from "./MoreOrLess.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// How long the tipped seesaw stays before the next pair.
const NEXT_PAUSE_MS = 1100;

// Three pictures across and two rows down, for groups of up to six.
const SEAT_PICTURE = "min(29cqw, 40cqh)";

interface Round {
  id: string;
  object: string;
  left: number;
  right: number;
  ask: Ask;
  answer: Side;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Stage = "playing" | "done";

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

const isGroup = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= MAX_GROUP;

export default function MoreOrLess({ activityId, activityName, onFinish }: GameComponentProps) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(true);
  // The side tapped by mistake, the right side glowing after a miss, the side picked right first time, and whether the seesaw has tipped.
  const [wrongPick, setWrongPick] = useState<Side | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [rightPick, setRightPick] = useState<Side | null>(null);
  const [tipped, setTipped] = useState(false);
  // The first side tapped for each pair is the graded answer.
  const answers = useRef<Record<string, string>>({});
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
        setRounds(
          rows.map((row) => {
            const data = (row.questionData ?? {}) as { object?: unknown; left?: unknown; right?: unknown; ask?: unknown };
            const ok =
              typeof data.object === "string" &&
              data.object in OBJECTS &&
              isGroup(data.left) &&
              isGroup(data.right) &&
              data.left !== data.right &&
              (data.ask === "more" || data.ask === "fewer") &&
              row.correctAnswer.answer === answerSide(data.left, data.right, data.ask);
            if (!ok) throw new Error(`Question ${row.questionKey} needs a known object, two different groups of 1 to ${MAX_GROUP}, and "more" or "fewer"`);
            const ask = data.ask as Ask;
            const [left, right] = [data.left as number, data.right as number];
            return { id: row.questionKey, object: data.object as string, left, right, ask, answer: answerSide(left, right, ask) };
          }),
        );
      } catch (err) {
        console.error("Failed to load More or Less questions:", err);
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

  // A ref, not only state, so two taps landing in the same tick can't both answer.
  const lockedRef = useRef(true);
  const lock = (on: boolean) => {
    lockedRef.current = on;
    setLocked(on);
  };

  // Reads each pair as it sits down, then lets the child choose; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!round) return;
    const prompt = promptSpeech(round.object, round.ask);
    const open = () => lock(false);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["more or less"], prompt], open);
      return;
    }
    speak(prompt, open);
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

  const finishedRef = useRef(false);
  const handleFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const submitted: SubmittedAnswer[] = Object.entries(answers.current).map(([id, response]) => ({ questionId: id, response }));
    onFinish?.(submitted);
  };

  // Pending pause after the seesaw tips, cleared on unmount so a late timer never moves a finished game on.
  const pauseRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (pauseRef.current) window.clearTimeout(pauseRef.current);
  }, []);

  // The seesaw has tipped: the next pair sits down, or the result is spoken and sent.
  const advanceLater = (earned: boolean) => {
    const isLast = index === total - 1;
    pauseRef.current = window.setTimeout(() => {
      setWrongPick(null);
      setRevealed(false);
      setRightPick(null);
      setTipped(false);
      if (!isLast) return setIndex((i) => i + 1);
      // Stars are the right first picks, so the final count is the score.
      setStage("done");
      playTones([392, 523, 659, 784, 1047], "sine");
      speak(resultSpeech(stars + (earned ? 1 : 0), total), handleFinish);
    }, NEXT_PAUSE_MS);
  };

  // One try per pair: the right side gets a star and the seesaw tips; a wrong one shakes with an X, then the right side glows and grows, with no star.
  const pick = (side: Side) => {
    if (!round || lockedRef.current) return;
    lock(true);
    answers.current[round.id] ??= side;
    const r = round;
    if (side === r.answer) {
      setStars((s) => Math.min(s + 1, total));
      setRightPick(side);
      setTipped(true);
      playTones([523, 659, 784], "sine");
      return speak(rightSpeech(r.left, r.right, r.object, r.ask), () => advanceLater(true));
    }
    playTones([330, 247], "triangle");
    setWrongPick(side);
    speak(WRONG, () => {
      setRevealed(true);
      setTipped(true);
      speak(revealSpeech(r.left, r.right, r.object, r.ask), () => advanceLater(false));
    });
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

  const seat = (r: Round, side: Side) => {
    const count = r[side];
    const isWrong = wrongPick === side;
    const isAnswer = revealed && side === r.answer;
    const isRight = rightPick === side;
    return (
      <motion.button
        key={`${r.id}-${side}`}
        type="button"
        onClick={() => pick(side)}
        disabled={locked}
        aria-label={`${numberWord(count)} ${objectName(r.object, count)}`}
        initial={{ opacity: 0, y: -40 }}
        animate={isWrong ? { opacity: 0.55, y: 0, scale: 1, x: [0, -8, 8, -4, 4, 0] } : { opacity: 1, y: 0, scale: isAnswer ? 1.1 : isRight ? 1.05 : 1 }}
        transition={{ duration: 0.45, ease: EASE_OUT, delay: wrongPick === null && !revealed && rightPick === null ? (side === "left" ? 0 : 0.1) : 0 }}
        className={`${styles.seat} ${isAnswer ? styles.showAnswer : isRight ? styles.right : ""} relative flex min-w-0 items-center justify-center rounded-3xl disabled:cursor-default ${focusRing}`}
      >
        <span className={`${styles.group} relative block`}>
          <ObjectGroup object={r.object} count={count} size={SEAT_PICTURE} />
        </span>
        {isWrong && (
          <motion.span
            aria-hidden
            className={`${styles.wrongMark} pointer-events-none absolute inset-0 flex items-center justify-center font-black leading-none`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
          >
            ✕
          </motion.span>
        )}
      </motion.button>
    );
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full select-none flex-col overflow-hidden px-4 pb-3 pt-3 sm:px-8 sm:pb-5 sm:pt-5`}>
        {/* header: learner, title, stars; upright phones put the title on its own line */}
        <div className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
          {/* Both sides grow equally, so the title sits in the true middle even though the learner pill is wider than the stars. */}
          <div className="flex flex-1 items-center gap-2">
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
                <span className={`${styles.learnerName} max-w-[8rem] truncate text-lg font-extrabold capitalize leading-none sm:max-w-[13rem] sm:text-2xl`}>{learnerName}</span>
              </div>
            )}
          </div>
          <h2 className={`${styles.title} order-last min-w-0 basis-full truncate text-center text-2xl font-extrabold leading-tight sm:order-none sm:basis-auto sm:text-4xl`}>
            {activityName || "More or Less?"}
          </h2>
          <div className="flex flex-1 justify-end">
            <div className={`${styles.pill} flex items-center gap-1.5 rounded-full px-3 py-1 text-lg font-extrabold sm:text-2xl`} aria-label={`${stars} stars`}>
              <Star aria-hidden="true" className="h-5 w-5 text-[#f2b134] sm:h-6 sm:w-6" fill="#f2b134" strokeWidth={2.2} />
              <span className="tabular-nums">{stars}</span>
            </div>
          </div>
        </div>

        {/* the instruction with the replay button; it says MORE or FEWER for this pair */}
        <div className={`${styles.promptRow} relative z-10 mt-2 flex shrink-0 justify-center`}>
          <div className={`${styles.promptPill} flex items-center gap-2 rounded-3xl py-1 pl-4 pr-1 sm:gap-3 sm:rounded-full sm:pl-6`}>
            <p className={`${styles.instruction} text-base font-bold leading-tight sm:text-2xl`}>{round ? instruction(round.ask) : DONE_TEXT}</p>
            <button
              type="button"
              onClick={() => round && speak(promptSpeech(round.object, round.ask))}
              disabled={!round || locked}
              aria-label="Hear the question again"
              className={`${styles.roundButton} ${styles.speaker} flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${focusRing}`}
            >
              <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {round ? (
          <div className={`${styles.playground} relative flex min-h-0 flex-1 flex-col items-center justify-end pb-1`}>
            {/* the seesaw: both seats ride the plank, which tips toward the side with more once the pair is answered */}
            <motion.div
              className={`${styles.seesaw} relative flex w-full flex-col items-stretch`}
              animate={{ rotate: tipped ? (round.left > round.right ? -7 : 7) : 0 }}
              transition={{ type: "spring", stiffness: 90, damping: 9 }}
              style={{ transformOrigin: "50% 100%" }}
            >
              <AnimatePresence mode="wait">
                <motion.div key={round.id} className={`${styles.seats} flex items-end justify-between`} exit={{ opacity: 0, y: -30 }} transition={{ duration: 0.3 }}>
                  {SIDES.map((side) => seat(round, side))}
                </motion.div>
              </AnimatePresence>
              <span aria-hidden className={`${styles.plank} block shrink-0 rounded-full`} />
            </motion.div>
            <span aria-hidden className={`${styles.pivot} block shrink-0`} />
          </div>
        ) : (
          <div className="relative flex min-h-0 flex-1 items-center justify-center py-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className={`${styles.doneCard} flex max-w-md flex-col items-center gap-4 rounded-3xl px-6 py-5 text-center`}
              role="status"
            >
              <p className={`${styles.doneTitle} text-2xl font-extrabold leading-tight sm:text-3xl`}>{DONE_TEXT}</p>
              <div className={`${styles.doneScore} flex items-center gap-2 text-4xl font-extrabold tabular-nums sm:text-5xl`}>
                <Star aria-hidden="true" className="h-9 w-9 text-[#f2b134] sm:h-11 sm:w-11" fill="#f2b134" strokeWidth={2.2} />
                {stars} / {total}
              </div>
              <p className="text-xl font-bold sm:text-2xl">
                You got {stars} of {total} correct!
              </p>
            </motion.div>
          </div>
        )}
        <RealisticEffect active={stage === "done"} />
      </div>
    </MotionConfig>
  );
}
