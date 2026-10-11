"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Check, Star, Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import RealisticEffect from "@/components/effects/RealisticEffect";
import { objectAsset } from "../week-1/NumberRecognition.data";
import {
  OBJECTS,
  MAX_COUNT,
  INSTRUCTION,
  WRONG,
  DONE_TEXT,
  type Layout,
  type Spot,
  spots,
  readingOrder,
  numberWord,
  objectName,
  promptSpeech,
  rightSpeech,
  revealSpeech,
  resultSpeech,
} from "./CountingDetective.data";
import styles from "./CountingDetective.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// How long the solved scene stays before the next one.
const NEXT_PAUSE_MS = 1000;

interface Round {
  id: string;
  object: string;
  count: number;
  layout: Layout;
  spots: Spot[];
  choices: number[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Stage = "playing" | "done";

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

const isCount = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= MAX_COUNT;

export default function CountingDetective({ activityId, activityName, onFinish }: GameComponentProps) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(true);
  // Pictures the child has tapped while counting; each can be marked only once.
  const [marked, setMarked] = useState<number[]>([]);
  // The tag tapped by mistake, the right tag glowing after a miss, and the right tag picked first time.
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [rightPick, setRightPick] = useState<number | null>(null);
  // While counting aloud after a miss: the number given to each picture, and the one being said.
  const [tags, setTags] = useState<Record<number, number>>({});
  const [counting, setCounting] = useState<number | null>(null);
  // The first tag tapped for each scene is the graded answer.
  const answers = useRef<Record<string, string>>({});
  const round = stage === "playing" ? rounds?.[index] : undefined;
  const total = rounds?.length ?? 0;
  const answered = wrongPick !== null || rightPick !== null;

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
            const data = (row.questionData ?? {}) as { object?: unknown; count?: unknown; layout?: unknown; choices?: unknown };
            const choices = Array.isArray(data.choices) ? data.choices : [];
            const ok =
              typeof data.object === "string" &&
              data.object in OBJECTS &&
              isCount(data.count) &&
              (data.layout === "rows" || data.layout === "scattered") &&
              row.correctAnswer.answer === String(data.count) &&
              choices.length >= 2 &&
              choices.every(isCount) &&
              choices.filter((c) => c === data.count).length === 1;
            if (!ok) throw new Error(`Question ${row.questionKey} needs a known object, a count from 1 to ${MAX_COUNT}, rows or scattered, and choices with that count exactly once`);
            const layout = data.layout as Layout;
            const count = data.count as number;
            return { id: row.questionKey, object: data.object as string, count, layout, spots: spots(layout, count), choices: choices as number[] };
          }),
        );
      } catch (err) {
        console.error("Failed to load Counting Detective questions:", err);
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

  // Reads each scene as it lights up, then lets the child count; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!round) return;
    const prompt = promptSpeech(round.object);
    const open = () => lock(false);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["counting detective"], prompt], open);
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

  // Pending pause after an answer, cleared on unmount so a late timer never moves a finished game on.
  const pauseRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (pauseRef.current) window.clearTimeout(pauseRef.current);
  }, []);

  // The scene is solved: the next one lights up, or the result is spoken and sent.
  const advanceLater = (earned: boolean) => {
    const isLast = index === total - 1;
    pauseRef.current = window.setTimeout(() => {
      setMarked([]);
      setWrongPick(null);
      setRevealed(false);
      setRightPick(null);
      setTags({});
      setCounting(null);
      if (!isLast) return setIndex((i) => i + 1);
      // Stars are the right first picks, so the final count is the score.
      setStage("done");
      playTones([392, 523, 659, 784, 1047], "sine");
      speak(resultSpeech(stars + (earned ? 1 : 0), total), handleFinish);
    }, NEXT_PAUSE_MS);
  };

  // Marks a picture as counted; a picture already marked stays as it is, so nothing is counted twice.
  const mark = (i: number) => {
    if (lockedRef.current || answered || marked.includes(i)) return;
    setMarked((m) => [...m, i]);
    playTones([880], "sine");
  };

  // Counts every picture aloud in reading order, numbering each one as it is said.
  const countAloud = (r: Round, onEnd: () => void) => {
    const order = readingOrder(r.spots);
    const say = (k: number) => {
      if (k >= order.length) {
        setCounting(null);
        return onEnd();
      }
      setCounting(order[k]);
      setTags((t) => ({ ...t, [order[k]]: k + 1 }));
      speak(numberWord(k + 1), () => say(k + 1));
    };
    say(0);
  };

  // One try per scene: the right tag earns a star; a wrong one shakes with an X, then every picture is counted aloud once and the right tag glows and grows, with no star.
  const pick = (n: number) => {
    if (!round || lockedRef.current) return;
    lock(true);
    answers.current[round.id] ??= String(n);
    const r = round;
    if (n === r.count) {
      setStars((s) => Math.min(s + 1, total));
      setRightPick(n);
      playTones([523, 659, 784], "sine");
      return speak(rightSpeech(r.count, r.object), () => advanceLater(true));
    }
    playTones([330, 247], "triangle");
    setWrongPick(n);
    speak(WRONG, () => {
      setMarked([]);
      countAloud(r, () => {
        setRevealed(true);
        speak(revealSpeech(r.count, r.object), () => advanceLater(false));
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

  // One picture in the scene; the outer span places it, so its own scale and tilt never fight the centring.
  const clue = (r: Round, spot: Spot, i: number) => {
    const isMarked = marked.includes(i);
    const tag = tags[i];
    return (
      <span key={`${r.id}-${i}`} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${spot.x}%`, top: `${spot.y}%` }}>
        <motion.button
          type="button"
          onClick={() => mark(i)}
          disabled={locked || answered}
          aria-label={isMarked ? `${objectName(r.object, 1)}, counted` : objectName(r.object, 1)}
          aria-pressed={isMarked}
          initial={{ opacity: 0, scale: 0.4, rotate: spot.tilt }}
          animate={{ opacity: 1, scale: counting === i ? 1.3 : isMarked ? 0.92 : 1, rotate: spot.tilt }}
          transition={{ duration: 0.35, ease: EASE_OUT, delay: answered ? 0 : i * 0.05 }}
          className={`${styles.clue} ${isMarked || tag ? styles.clueMarked : ""} ${counting === i ? styles.clueCounting : ""} relative block rounded-full disabled:cursor-default ${focusRing}`}
        >
          <Image src={objectAsset(r.object)} alt="" fill sizes="96px" className="object-contain p-[8%]" draggable={false} />
          {(isMarked || tag) && (
            <motion.span
              aria-hidden
              className={`${styles.stamp} absolute flex items-center justify-center rounded-full font-extrabold leading-none tabular-nums`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 16 }}
            >
              {tag ?? <Check className="h-3/4 w-3/4" strokeWidth={4} />}
            </motion.span>
          )}
        </motion.button>
      </span>
    );
  };

  // A yellow evidence tent with a numeral; the tent shape is clipped inside, so the glow can sit on the button.
  const marker = (r: Round, n: number, i: number) => {
    const isWrong = wrongPick === n;
    const isAnswer = revealed && n === r.count;
    const isRight = rightPick === n;
    return (
      <motion.button
        key={`${r.id}-${n}`}
        type="button"
        onClick={() => pick(n)}
        disabled={locked}
        aria-label={`Number ${n}`}
        initial={{ opacity: 0, y: 30 }}
        animate={isWrong ? { opacity: 0.55, y: 0, scale: 1, x: [0, -8, 8, -4, 4, 0] } : { opacity: 1, y: 0, scale: isAnswer ? 1.2 : isRight ? 1.08 : 1 }}
        transition={{ duration: 0.45, ease: EASE_OUT, delay: !answered ? 0.3 + i * 0.08 : 0 }}
        className={`${styles.marker} ${isAnswer ? styles.showAnswer : isRight ? styles.right : ""} relative flex shrink-0 disabled:cursor-default ${focusRing}`}
      >
        <span className={`${styles.tent} flex h-full w-full items-end justify-center font-extrabold leading-none tabular-nums`}>{n}</span>
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
            {activityName || "Counting Detective"}
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
              onClick={() => round && speak(promptSpeech(round.object))}
              disabled={!round || locked}
              aria-label="Hear the question again"
              className={`${styles.roundButton} ${styles.speaker} flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${focusRing}`}
            >
              <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {round ? (
          <div className={`${styles.caseRoom} relative flex min-h-0 flex-1 flex-col items-center py-2`}>
            {/* the scene, lit by the detective's flashlight */}
            <AnimatePresence mode="wait">
              <motion.div
                key={round.id}
                className={`${styles.scene} relative min-h-0 w-full flex-1`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
              >
                <span aria-hidden className={`${styles.flashlight} pointer-events-none absolute leading-none`}>
                  🔦
                </span>
                <div className={`${styles.field} absolute`}>{round.spots.map((s, i) => clue(round, s, i))}</div>
              </motion.div>
            </AnimatePresence>
            {/* the numbered evidence tents to choose from */}
            <div className={`${styles.markers} flex shrink-0 items-end justify-center`}>{round.choices.map((n, i) => marker(round, n, i))}</div>
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
