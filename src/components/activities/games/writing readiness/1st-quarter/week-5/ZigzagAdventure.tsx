"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Star, Volume2 } from "lucide-react";
import { Circle, Text } from "react-konva";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import RealisticEffect from "@/components/effects/RealisticEffect";
import TracePad, { usePathRide, type Point } from "../week-4/TracePad";
import {
  VIEW_W,
  VIEW_H,
  ITEMS,
  INSTRUCTION,
  WRONG,
  REVEAL,
  DONE_TEXT,
  zigzagPath,
  isItem,
  promptSpeech,
  rightSpeech,
  resultSpeech,
  type ItemKey,
} from "./ZigzagAdventure.data";
import styles from "./ZigzagAdventure.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// How long the explorer stays at the landmark before the next trail.
const NEXT_PAUSE_MS = 900;
// How long the explorer takes to walk a trail.
const WALK_MS = 1900;

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Stage = "playing" | "done";

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

/** A treasure-map trail: dotted map marks, the landmark at the end, and the explorer who walks the zigzag once it is traced. */
function MapTrail({ item, path, walking }: { item: ItemKey; path: Point[]; walking: boolean }) {
  const walker = usePathRide(path, walking, WALK_MS);
  const end = path[path.length - 1];
  const at = walker ?? path[0];
  return (
    <>
      {[[150, 70], [420, 60], [700, 90], [260, 360], [560, 370]].map(([x, y], i) => (
        <Circle key={i} x={x} y={y} radius={5} fill="#a0743c" opacity={0.5} />
      ))}
      <Text x={end.x + 20} y={end.y - 70} text={ITEMS[item].landmark} fontSize={76} />
      <Text x={at.x - 30} y={at.y - 70} text="🧒" fontSize={56} />
    </>
  );
}

export default function ZigzagAdventure({ activityId, activityName, onFinish }: GameComponentProps) {
  const [items, setItems] = useState<ItemKey[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  // Whether each item was traced right on the first try.
  const [results, setResults] = useState<boolean[]>([]);
  // The explorer walks the trail once it is traced.
  const [celebrating, setCelebrating] = useState(false);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(true);
  const [wrong, setWrong] = useState(false);
  const [demo, setDemo] = useState(false);
  // The first try at each item is the graded answer.
  const answers = useRef<Record<string, string>>({});
  const item = stage === "playing" ? items?.[index] : undefined;
  const total = items?.length ?? 0;
  const stars = results.filter(Boolean).length;

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
        setItems(
          rows.map((row) => {
            if (!isItem(row.questionKey)) throw new Error(`Question ${row.questionKey} needs to be a known trail`);
            return row.questionKey;
          }),
        );
      } catch (err) {
        console.error("Failed to load Zigzag Adventure questions:", err);
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

  // A ref, not only state, so a stroke landing as the lock flips can't count twice.
  const lockedRef = useRef(true);
  const lock = (on: boolean) => {
    lockedRef.current = on;
    setLocked(on);
  };

  // Reads each item as it comes up, then opens the board; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!item) return;
    const prompt = promptSpeech(item);
    const open = () => lock(false);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["zigzag adventure"], prompt], open);
      return;
    }
    speak(prompt, open);
  }, [item, speak, speakAll]);

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

  // Pending pause after an item, cleared on unmount so a late timer never moves a finished game on.
  const pauseRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (pauseRef.current) window.clearTimeout(pauseRef.current);
  }, []);

  // The explorer reached the landmark: the next trail comes, or the result is spoken and sent.
  const finishItem = (earned: boolean) => {
    setResults((r) => [...r, earned]);
    setCelebrating(true);
    const isLast = index === total - 1;
    pauseRef.current = window.setTimeout(() => {
      setWrong(false);
      setDemo(false);
      setCelebrating(false);
      if (!isLast) return setIndex((i) => i + 1);
      // Stars are the right first tries, so the final count is the score.
      setStage("done");
      playTones([392, 523, 659, 784, 1047], "sine");
      speak(resultSpeech(stars + (earned ? 1 : 0), total), handleFinish);
    }, NEXT_PAUSE_MS);
  };

  // One try per trail: a good trace sends the explorer walking with a star; a miss turns red, then the pencil follows every turn glowing, with no star.
  const onAttempt = (pass: boolean) => {
    if (!item || lockedRef.current) return;
    lock(true);
    answers.current[item] ??= pass ? "correct" : "missed";
    if (pass) {
      playTones([523, 659, 784], "sine");
      setCelebrating(true);
      return speak(rightSpeech(item), () => finishItem(true));
    }
    playTones([330, 247], "triangle");
    setWrong(true);
    speak(WRONG, () => setDemo(true));
  };

  const onDemoEnd = () => speak(REVEAL, () => finishItem(false));

  if (loadError) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-4 text-center`}>
        <p className="text-lg font-bold">Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!items) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-4`}>
        <p className="text-lg font-bold">Loading…</p>
      </div>
    );
  }

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
            {activityName || "Zigzag Adventure"}
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
            <p className={`${styles.instruction} text-base font-bold leading-tight sm:text-2xl`}>{item ? INSTRUCTION : DONE_TEXT}</p>
            <button
              type="button"
              onClick={() => item && speak(promptSpeech(item))}
              disabled={!item || demo}
              aria-label="Hear the instruction again"
              className={`${styles.roundButton} ${styles.speaker} flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${focusRing}`}
            >
              <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* the map board: each trail slides in like the next part of the map */}
        <motion.div
          className="relative flex min-h-0 flex-1 items-center justify-center py-2"
          animate={wrong && !demo ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0 }}
          transition={{ duration: 0.45 }}
        >
          {item ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={item}
                initial={{ opacity: 0, x: 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -60 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
                className={`${styles.map} h-full w-full rounded-3xl`}
              >
                <TracePad
                  viewW={VIEW_W}
                  viewH={VIEW_H}
                  path={zigzagPath(item)}
                  under={<MapTrail item={item} path={zigzagPath(item)} walking={celebrating} />}
                  guideColor="#7a4a22"
                  inkColor="#e15a2f"
                  inkWidth={12}
                  disabled={locked}
                  demo={demo}
                  onDemoEnd={onDemoEnd}
                  onAttempt={onAttempt}
                  className="h-full w-full"
                />
              </motion.div>
            </AnimatePresence>
          ) : (
            // the treasure, found
            <motion.div
              aria-hidden
              className={`${styles.finale} flex items-end justify-center leading-none`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: [1, 1.1, 1] }}
              transition={{ opacity: { duration: 0.4 }, scale: { repeat: Infinity, duration: 1.6 } }}
            >
              <span>🧒</span>
              <span>💰</span>
            </motion.div>
          )}
          <AnimatePresence>
            {wrong && !demo && (
              <motion.span
                aria-hidden
                className={`${styles.wrongMark} pointer-events-none absolute inset-0 flex items-center justify-center font-black leading-none`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
              >
                ✕
              </motion.span>
            )}
          </AnimatePresence>
          {stage === "done" && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.3 }}
              className={`${styles.doneCard} absolute bottom-[6%] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 rounded-3xl px-6 py-3 text-center`}
              role="status"
            >
              <div className={`${styles.doneScore} flex items-center gap-2 text-4xl font-extrabold tabular-nums sm:text-5xl`}>
                <Star aria-hidden="true" className="h-9 w-9 text-[#f2b134] sm:h-11 sm:w-11" fill="#f2b134" strokeWidth={2.2} />
                {stars} / {total}
              </div>
              <p className="whitespace-nowrap text-lg font-bold sm:text-2xl">
                You got {stars} of {total} correct!
              </p>
            </motion.div>
          )}
        </motion.div>
        <RealisticEffect active={stage === "done"} />
      </div>
    </MotionConfig>
  );
}
