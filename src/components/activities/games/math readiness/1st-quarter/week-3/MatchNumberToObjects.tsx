"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup, MotionConfig } from "framer-motion";
import { Star, Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import RealisticEffect from "@/components/effects/RealisticEffect";
import ObjectGroup from "./ObjectGroup";
import {
  OBJECTS,
  MAX_COUNT,
  HOUSE_COLORS,
  INSTRUCTION,
  WRONG,
  DONE_TEXT,
  numberWord,
  objectName,
  promptSpeech,
  rightSpeech,
  revealSpeech,
  resultSpeech,
} from "./MatchNumberToObjects.data";
import styles from "./MatchNumberToObjects.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// How long the delivered letter stays before the next one.
const NEXT_PAUSE_MS = 900;

interface Round {
  id: string;
  number: number;
  object: string;
  houses: number[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Stage = "playing" | "done";

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

const isCount = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= MAX_COUNT;

export default function MatchNumberToObjects({ activityId, activityName, onFinish }: GameComponentProps) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(true);
  // The house tapped by mistake, the right house glowing after a miss, the object being counted aloud there, and the house the letter landed in.
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [counting, setCounting] = useState<number | null>(null);
  const [delivered, setDelivered] = useState<number | null>(null);
  // The first house tapped for each letter is the graded answer.
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
            const data = (row.questionData ?? {}) as { number?: unknown; object?: unknown; houses?: unknown };
            const houses = Array.isArray(data.houses) ? data.houses : [];
            const ok =
              isCount(data.number) &&
              typeof data.object === "string" &&
              data.object in OBJECTS &&
              row.correctAnswer.answer === String(data.number) &&
              houses.length >= 2 &&
              houses.every(isCount) &&
              houses.filter((h) => h === data.number).length === 1;
            if (!ok) throw new Error(`Question ${row.questionKey} needs a number from 1 to ${MAX_COUNT}, a known object, and houses with that number exactly once`);
            return { id: row.questionKey, number: data.number as number, object: data.object as string, houses: houses as number[] };
          }),
        );
      } catch (err) {
        console.error("Failed to load Match Number to Objects questions:", err);
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

  // Reads each letter as it arrives, then lets the child choose; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!round) return;
    const prompt = promptSpeech(round.number, round.object);
    const open = () => lock(false);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["match number to objects"], prompt], open);
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

  // Pending pause after a delivery, cleared on unmount so a late timer never moves a finished game on.
  const pauseRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (pauseRef.current) window.clearTimeout(pauseRef.current);
  }, []);

  // The letter is delivered: the next one comes, or the result is spoken and sent.
  const advanceLater = (earned: boolean) => {
    const isLast = index === total - 1;
    pauseRef.current = window.setTimeout(() => {
      setWrongPick(null);
      setRevealed(false);
      setCounting(null);
      setDelivered(null);
      if (!isLast) return setIndex((i) => i + 1);
      // Stars are the right first picks, so the final count is the score.
      setStage("done");
      playTones([392, 523, 659, 784, 1047], "sine");
      speak(resultSpeech(stars + (earned ? 1 : 0), total), handleFinish);
    }, NEXT_PAUSE_MS);
  };

  // Counts the objects in a house aloud, lighting each one up in turn.
  const countAloud = (n: number, onEnd: () => void) => {
    const say = (i: number) => {
      if (i >= n) {
        setCounting(null);
        return onEnd();
      }
      setCounting(i);
      speak(numberWord(i + 1), () => say(i + 1));
    };
    say(0);
  };

  // One try per letter: the right house gets the letter and a star; a wrong one shakes with an X, then the right house glows and grows and is counted aloud before the letter flies in, with no star.
  const pick = (h: number) => {
    if (!round || lockedRef.current) return;
    lock(true);
    const count = round.houses[h];
    answers.current[round.id] ??= String(count);
    if (count === round.number) {
      setStars((s) => Math.min(s + 1, total));
      setDelivered(h);
      playTones([523, 659, 784], "sine");
      return speak(rightSpeech(round.number, round.object), () => advanceLater(true));
    }
    playTones([330, 247], "triangle");
    setWrongPick(h);
    const right = round.houses.indexOf(round.number);
    const r = round;
    speak(WRONG, () => {
      setRevealed(true);
      countAloud(r.number, () => {
        setDelivered(right);
        speak(revealSpeech(r.number, r.object), () => advanceLater(false));
      });
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

  // The letter with its numeral; the same layoutId in the postbag and in a mailbox makes it fly to the house.
  const letter = (r: Round) => (
    <motion.span layoutId={`letter-${r.id}`} className={`${styles.letter} relative flex items-center justify-center font-extrabold leading-none tabular-nums`} transition={{ duration: 0.6, ease: EASE_OUT }}>
      {r.number}
    </motion.span>
  );

  const house = (r: Round, count: number, h: number) => {
    const isWrong = wrongPick === h;
    const isAnswer = revealed && count === r.number;
    const isRight = delivered === h && wrongPick === null;
    return (
      <motion.button
        key={`${r.id}-${h}`}
        type="button"
        onClick={() => pick(h)}
        disabled={locked}
        aria-label={`House with ${numberWord(count)} ${objectName(r.object, count)}`}
        initial={{ opacity: 0, y: 30 }}
        animate={isWrong ? { opacity: 0.55, y: 0, scale: 1, x: [0, -8, 8, -4, 4, 0] } : { opacity: 1, y: 0, scale: isAnswer ? 1.08 : isRight ? 1.04 : 1 }}
        transition={{ duration: 0.45, ease: EASE_OUT, delay: wrongPick === null && !revealed && delivered === null ? h * 0.08 : 0 }}
        className={`${styles.house} ${isAnswer ? styles.showAnswer : isRight ? styles.right : ""} relative flex min-h-0 min-w-0 flex-col items-stretch disabled:cursor-default ${focusRing}`}
      >
        <span aria-hidden className={`${styles.roof} block shrink-0`} />
        <span className={`${styles.wall} relative flex min-h-0 flex-1 items-stretch gap-[4%] p-[5%]`} style={{ background: HOUSE_COLORS[h % HOUSE_COLORS.length] }}>
          {/* the big window shows the group to count */}
          <span className={`${styles.window} relative block min-h-0 min-w-0 flex-1 rounded-xl`}>
            <ObjectGroup object={r.object} count={count} counting={isAnswer ? counting : null} />
          </span>
          {/* the mailbox, where the letter lands */}
          <span className={`${styles.mailbox} relative flex shrink-0 items-center justify-center rounded-lg`}>{delivered === h && letter(r)}</span>
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
            {activityName || "Match Number to Objects"}
          </h2>
          <div className="flex flex-1 justify-end">
            <div className={`${styles.pill} flex items-center gap-1.5 rounded-full px-3 py-1 text-lg font-extrabold sm:text-2xl`} aria-label={`${stars} stars`}>
              <Star aria-hidden="true" className="h-5 w-5 text-[#f2b134] sm:h-6 sm:w-6" fill="#f2b134" strokeWidth={2.2} />
              <span className="tabular-nums">{stars}</span>
            </div>
          </div>
        </div>

        {/* the instruction with the replay button */}
        <div className={`${styles.promptRow} relative z-10 mt-2 flex shrink-0 justify-center`}>
          <div className={`${styles.promptPill} flex items-center gap-2 rounded-3xl py-1 pl-4 pr-1 sm:gap-3 sm:rounded-full sm:pl-6`}>
            <p className={`${styles.instruction} text-base font-bold leading-tight sm:text-2xl`}>{round ? INSTRUCTION : DONE_TEXT}</p>
            <button
              type="button"
              onClick={() => round && speak(promptSpeech(round.number, round.object))}
              disabled={!round || locked}
              aria-label="Hear the question again"
              className={`${styles.roundButton} ${styles.speaker} flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${focusRing}`}
            >
              <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {round ? (
          <LayoutGroup id={round.id}>
            <div className={`${styles.street} relative flex min-h-0 flex-1 flex-col items-center py-2`}>
              {/* the postbag holding the letter to deliver */}
              <div className={`${styles.postbag} relative flex shrink-0 items-center justify-center rounded-2xl`}>
                <span aria-hidden className={`${styles.bagIcon} leading-none`}>
                  📮
                </span>
                <AnimatePresence>{delivered === null && letter(round)}</AnimatePresence>
              </div>
              <div className={`${styles.houses} flex min-h-0 w-full flex-1 items-stretch justify-center`}>{round.houses.map((c, h) => house(round, c, h))}</div>
            </div>
          </LayoutGroup>
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
