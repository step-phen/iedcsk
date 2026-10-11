"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Star, Volume2 } from "lucide-react";
import { Circle, Group, Line, Rect } from "react-konva";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import RealisticEffect from "@/components/effects/RealisticEffect";
import TracePad from "../week-4/TracePad";
import {
  VIEW_W,
  VIEW_H,
  CENTER,
  ITEMS,
  INSTRUCTION,
  WRONG,
  DONE_TEXT,
  circlePath,
  isItem,
  promptSpeech,
  rightSpeech,
  revealSpeech,
  resultSpeech,
  type ItemKey,
} from "./CircleTrails.data";
import styles from "./CircleTrails.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// How long the round thing stays on show before the next circle.
const NEXT_PAUSE_MS = 900;

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Stage = "playing" | "done";

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

/** The round thing hiding in a circle, drawn to fill it once the circle is traced. */
function RoundThing({ item }: { item: ItemKey }) {
  const { x, y } = CENTER;
  const r = ITEMS[item].r;
  const ring = { stroke: "#3b2a1a", strokeWidth: 8 };
  switch (item) {
    case "orange":
      return (
        <Group>
          <Circle x={x} y={y} radius={r} fill="#ffa53a" {...ring} />
          {[[-0.4, -0.3], [0.35, -0.1], [-0.1, 0.4], [0.45, 0.45], [-0.5, 0.25]].map(([dx, dy], i) => (
            <Circle key={i} x={x + dx * r} y={y + dy * r} radius={r * 0.035} fill="#e08214" />
          ))}
          <Line points={[x - r * 0.05, y - r - 4, x + r * 0.35, y - r - 40, x + r * 0.55, y - r - 6]} closed tension={0.5} fill="#4cc36b" stroke="#3b2a1a" strokeWidth={5} />
        </Group>
      );
    case "cookie":
      return (
        <Group>
          <Circle x={x} y={y} radius={r} fill="#dca868" {...ring} />
          {[[-0.45, -0.35], [0.3, -0.5], [0.5, 0.1], [-0.1, 0.05], [-0.5, 0.35], [0.15, 0.55], [0.05, -0.25]].map(([dx, dy], i) => (
            <Circle key={i} x={x + dx * r} y={y + dy * r} radius={r * 0.08} fill="#5b3418" />
          ))}
        </Group>
      );
    case "ball":
      return (
        <Group>
          <Circle x={x} y={y} radius={r} fill="#ff5a5a" {...ring} />
          <Line points={[x - r * 0.97, y - r * 0.2, x, y + r * 0.15, x + r * 0.97, y - r * 0.2]} tension={0.5} stroke="white" strokeWidth={r * 0.14} />
          <Circle x={x - r * 0.4} y={y - r * 0.5} radius={r * 0.12} fill="white" opacity={0.6} />
        </Group>
      );
    case "clock":
      return (
        <Group>
          <Circle x={x} y={y} radius={r} fill="white" stroke="#3b4a6b" strokeWidth={12} />
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI) / 6;
            return <Line key={i} points={[x + Math.sin(a) * r * 0.78, y - Math.cos(a) * r * 0.78, x + Math.sin(a) * r * 0.9, y - Math.cos(a) * r * 0.9]} stroke="#3b4a6b" strokeWidth={i % 3 ? 5 : 10} lineCap="round" />;
          })}
          <Line points={[x, y, x, y - r * 0.62]} stroke="#3b4a6b" strokeWidth={10} lineCap="round" />
          <Line points={[x, y, x + r * 0.42, y + r * 0.1]} stroke="#e15a5a" strokeWidth={10} lineCap="round" />
          <Circle x={x} y={y} radius={12} fill="#3b4a6b" />
        </Group>
      );
    case "donut":
      return (
        <Group>
          <Circle x={x} y={y} radius={r} fill="#e3a868" {...ring} />
          <Circle x={x} y={y} radius={r * 0.84} fill="#ff8fc0" />
          {[[-0.5, -0.3, 20], [0.3, -0.55, -30], [0.55, 0.2, 60], [-0.2, 0.6, 10], [-0.6, 0.3, -50], [0.1, -0.7, 80], [0.6, -0.25, -10]].map(([dx, dy, rot], i) => (
            <Rect key={i} x={x + dx * r} y={y + dy * r} width={r * 0.14} height={r * 0.045} cornerRadius={4} rotation={rot} fill={["#4a8ff0", "#ffd23f", "#4cc36b", "#ffffff"][i % 4]} />
          ))}
          {/* the hole is cut right through, so the background shows */}
          <Circle x={x} y={y} radius={r * 0.3} fill="black" globalCompositeOperation="destination-out" />
          <Circle x={x} y={y} radius={r * 0.3} stroke="#3b2a1a" strokeWidth={8} />
        </Group>
      );
  }
}

export default function CircleTrails({ activityId, activityName, onFinish }: GameComponentProps) {
  const [items, setItems] = useState<ItemKey[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  // Whether each item was traced right on the first try.
  const [results, setResults] = useState<boolean[]>([]);
  // The round thing appears in its circle once the circle is done.
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
            if (!isItem(row.questionKey)) throw new Error(`Question ${row.questionKey} needs to be a known round thing`);
            return row.questionKey;
          }),
        );
      } catch (err) {
        console.error("Failed to load Circle Trails questions:", err);
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
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["circle trails"], prompt], open);
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

  // The round thing is on show: the next circle comes, or the result is spoken and sent.
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

  // One try per circle: a good trace shows the round thing with a star; a miss turns red, then the pencil goes round glowing, with no star.
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

  const onDemoEnd = () => item && speak(revealSpeech(item), () => finishItem(false));

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
            {activityName || "Circle Trails"}
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

        {/* the circle board: the round thing fills the circle and hops once it is traced */}
        <motion.div
          className="relative flex min-h-0 flex-1 items-center justify-center py-2"
          animate={wrong && !demo ? { x: [0, -10, 10, -6, 6, 0] } : celebrating ? { y: [0, -18, 0, -8, 0] } : { x: 0, y: 0 }}
          transition={{ duration: celebrating ? 0.7 : 0.45 }}
        >
          {item ? (
            <TracePad
              key={item}
              viewW={VIEW_W}
              viewH={VIEW_H}
              path={circlePath(item)}
              under={celebrating ? <RoundThing item={item} /> : undefined}
              guideColor="#3b2a1a"
              inkColor="#4a8ff0"
              inkWidth={14}
              disabled={locked}
              demo={demo}
              onDemoEnd={onDemoEnd}
              onAttempt={onAttempt}
              className={`${styles.board} h-full w-full`}
            />
          ) : (
            // every round thing from the game in a row (pale if missed), once it is done
            <div className={`${styles.parade} flex flex-wrap content-center items-center justify-center`} aria-hidden>
              {items.map((it, i) => (
                <motion.span
                  key={it}
                  className={`${styles.mini} relative block`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: results[i] ? 1 : 0.5, scale: 1, rotate: [0, 8, -8, 0] }}
                  transition={{ opacity: { delay: i * 0.12 }, scale: { delay: i * 0.12, duration: 0.4 }, rotate: { repeat: Infinity, duration: 2, delay: i * 0.2 } }}
                >
                  <TracePad
                    viewW={VIEW_W}
                    viewH={VIEW_H}
                    path={circlePath(it)}
                    under={<RoundThing item={it} />}
                    guideColor="transparent"
                    inkColor="transparent"
                    disabled
                    demo={false}
                    onAttempt={() => {}}
                    showGuide={false}
                    className="h-full w-full"
                  />
                </motion.span>
              ))}
            </div>
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
