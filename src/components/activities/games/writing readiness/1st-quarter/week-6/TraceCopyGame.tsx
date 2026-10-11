"use client";

import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Star, Volume2 } from "lucide-react";
import { Rect } from "react-konva";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting } from "@/lib/speech-lines";
import RealisticEffect from "@/components/effects/RealisticEffect";
import TracePad from "../week-4/TracePad";
import { PAD, judgeCopy, shapePath, type ShapeKind } from "./shapes";

// The shared play of the Week 6 trace-and-copy games: watch the pencil draw a shape, trace it, then copy it freehand in the empty box beside it.

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// How long a finished shape stays before the next round.
const NEXT_PAUSE_MS = 900;

export interface Round {
  id: string;
  kind: ShapeKind;
  w: number;
  h: number;
}

type Phase = "watch" | "trace" | "copy";

export interface TraceCopyLines {
  instruction: Record<Phase, string>;
  watch: (r: Round) => string;
  trace: (r: Round) => string;
  traced: string;
  copy: (r: Round) => string;
  right: (r: Round) => string;
  /** Said when the copy is good but the trace was missed, so there is no star. */
  copiedOnly: string;
  wrongTrace: string;
  wrongCopy: (r: Round) => string;
  revealCopy: (r: Round) => string;
  done: string;
  result: (score: number, total: number) => string;
}

export interface ProgressProps {
  rounds: Round[];
  results: boolean[];
  current: number;
  done: boolean;
}

interface TraceCopyGameProps extends GameComponentProps {
  title: string;
  intro: string;
  /** Each round's shape and size, keyed by the seeder's question keys. */
  shapes: Record<string, Omit<Round, "id">>;
  lines: TraceCopyLines;
  styles: Record<string, string>;
  ink: string;
  /** The game's own picture of what the child has built so far. */
  progress: (props: ProgressProps) => ReactNode;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Stage = "playing" | "done";

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

// The paper each pad is drawn on; the copy box gets a dashed edge to draw inside.
const paper = (dashed: boolean) => (
  <Rect x={10} y={10} width={PAD - 20} height={PAD - 20} cornerRadius={28} fill="white" stroke={dashed ? "#9aa3c4" : "#d8dcea"} strokeWidth={dashed ? 6 : 4} dash={dashed ? [18, 12] : undefined} />
);

export default function TraceCopyGame({ activityId, activityName, onFinish, title, intro, shapes, lines, styles, ink, progress }: TraceCopyGameProps) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  // Whether each round's trace and copy were both right on the first try.
  const [results, setResults] = useState<boolean[]>([]);
  const [stage, setStage] = useState<Stage>("playing");
  const [phase, setPhase] = useState<Phase>("watch");
  const [locked, setLocked] = useState(true);
  // The pencil demos on each pad, and which pad just missed.
  const [traceDemo, setTraceDemo] = useState(false);
  const [copyDemo, setCopyDemo] = useState(false);
  const [wrongPad, setWrongPad] = useState<"trace" | "copy" | null>(null);
  // The first trace and the first copy of each round are the graded ones.
  const traceOk = useRef(false);
  const answers = useRef<Record<string, string>>({});
  const round = stage === "playing" ? rounds?.[index] : undefined;
  const total = rounds?.length ?? 0;
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
        setRounds(
          rows.map((row) => {
            const shape = shapes[row.questionKey];
            if (!shape) throw new Error(`Question ${row.questionKey} needs to be a known shape`);
            return { id: row.questionKey, ...shape };
          }),
        );
      } catch (err) {
        console.error(`Failed to load ${title} questions:`, err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId, shapes, title]);

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

  // Each round opens with the pencil drawing the shape while it is named; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!round) return;
    const watch = lines.watch(round);
    const show = () => setTraceDemo(true);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), intro, watch], show);
      return;
    }
    speak(watch, show);
  }, [round, lines, intro, speak, speakAll]);

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

  // Pending pause after a round, cleared on unmount so a late timer never moves a finished game on.
  const pauseRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (pauseRef.current) window.clearTimeout(pauseRef.current);
  }, []);

  // The round is done: the next shape comes, or the result is spoken and sent.
  const finishRound = (earned: boolean) => {
    setResults((r) => [...r, earned]);
    const isLast = index === total - 1;
    pauseRef.current = window.setTimeout(() => {
      setPhase("watch");
      setTraceDemo(false);
      setCopyDemo(false);
      setWrongPad(null);
      if (!isLast) return setIndex((i) => i + 1);
      // Stars are the rounds traced and copied right first time, so the final count is the score.
      setStage("done");
      playTones([392, 523, 659, 784, 1047], "sine");
      speak(lines.result(stars + (earned ? 1 : 0), total), handleFinish);
    }, NEXT_PAUSE_MS);
  };

  const startCopy = (r: Round) => {
    setTraceDemo(false);
    setPhase("copy");
    speak(lines.copy(r), () => lock(false));
  };

  // The pencil finished drawing on the trace pad: after the opening demo the child traces; after a missed trace the child moves on to copying.
  const onTraceDemoEnd = () => {
    if (!round) return;
    if (phase === "watch") {
      setTraceDemo(false);
      setPhase("trace");
      return speak(lines.trace(round), () => lock(false));
    }
    startCopy(round);
  };

  // One try at the trace: a good one moves straight on to copying; a miss turns red, then the pencil traces it glowing.
  const onTrace = (pass: boolean) => {
    if (!round || lockedRef.current || phase !== "trace") return;
    lock(true);
    traceOk.current = pass;
    if (pass) {
      playTones([523, 659], "sine");
      return speak(lines.traced, () => startCopy(round));
    }
    playTones([330, 247], "triangle");
    setWrongPad("trace");
    speak(lines.wrongTrace, () => {
      setWrongPad(null);
      setTraceDemo(true);
    });
  };

  // One try at the copy: the star needs both the trace and the copy right; a missed copy turns red, then the pencil draws the shape glowing in the box.
  const onCopy = (pass: boolean) => {
    if (!round || lockedRef.current || phase !== "copy") return;
    lock(true);
    const earned = pass && traceOk.current;
    answers.current[round.id] ??= earned ? "correct" : "missed";
    if (pass) {
      playTones([523, 659, 784], "sine");
      return speak(earned ? lines.right(round) : lines.copiedOnly, () => finishRound(earned));
    }
    playTones([330, 247], "triangle");
    setWrongPad("copy");
    speak(lines.wrongCopy(round), () => {
      setWrongPad(null);
      setCopyDemo(true);
    });
  };

  const onCopyDemoEnd = () => round && speak(lines.revealCopy(round), () => finishRound(false));

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

  // A pad with its label; the one the child should use now glows, and a miss shakes it with an X.
  const pad = (which: "trace" | "copy", label: string, active: boolean, body: ReactNode) => (
    <motion.div
      className={`${styles.pad} ${active ? styles.padActive : ""} relative flex min-h-0 min-w-0 flex-1 flex-col items-center rounded-3xl p-[1.5%]`}
      animate={wrongPad === which ? { x: [0, -10, 10, -6, 6, 0] } : { x: 0, opacity: active || phase === "watch" ? 1 : 0.75 }}
      transition={{ duration: 0.45 }}
    >
      <span className={`${styles.padLabel} shrink-0 rounded-full px-3 py-0.5 font-extrabold leading-tight`}>{label}</span>
      {body}
      <AnimatePresence>
        {wrongPad === which && (
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
    </motion.div>
  );

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
            {activityName || title}
          </h2>
          <div className="flex flex-1 justify-end">
            <div className={`${styles.pill} flex items-center gap-1.5 rounded-full px-3 py-1 text-lg font-extrabold sm:text-2xl`} aria-label={`${stars} stars`}>
              <Star aria-hidden="true" className="h-5 w-5 text-[#f2b134] sm:h-6 sm:w-6" fill="#f2b134" strokeWidth={2.2} />
              <span className="tabular-nums">{stars}</span>
            </div>
          </div>
        </div>

        {/* what to do now, with the replay button */}
        <div className={`${styles.promptRow} relative z-10 mt-2 flex shrink-0 justify-center`}>
          <div className={`${styles.promptPill} flex items-center gap-2 rounded-3xl py-1 pl-4 pr-1 sm:gap-3 sm:rounded-full sm:pl-6`}>
            <p className={`${styles.instruction} text-base font-bold leading-tight sm:text-2xl`}>{round ? lines.instruction[phase] : lines.done}</p>
            <button
              type="button"
              onClick={() => round && speak(phase === "watch" ? lines.watch(round) : phase === "trace" ? lines.trace(round) : lines.copy(round))}
              disabled={!round || traceDemo || copyDemo}
              aria-label="Hear the instruction again"
              className={`${styles.roundButton} ${styles.speaker} flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${focusRing}`}
            >
              <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* what the child has built so far, one piece per round */}
        <div className={`${styles.progress} relative mt-2 flex shrink-0 items-end justify-center`}>{progress({ rounds, results, current: index, done: stage === "done" })}</div>

        {round ? (
          <div className={`${styles.pads} relative flex min-h-0 flex-1 items-stretch justify-center py-2`}>
            {pad(
              "trace",
              "✏️ Trace",
              phase !== "copy",
              <TracePad
                key={`${round.id}-trace`}
                viewW={PAD}
                viewH={PAD}
                path={shapePath(round.kind, round.w, round.h)}
                under={paper(false)}
                guideColor="#22314f"
                inkColor={ink}
                disabled={locked || phase !== "trace"}
                demo={traceDemo}
                onDemoEnd={onTraceDemoEnd}
                onAttempt={onTrace}
                className="min-h-0 w-full flex-1"
              />,
            )}
            {pad(
              "copy",
              "✍️ Copy",
              phase === "copy",
              <TracePad
                key={`${round.id}-copy`}
                viewW={PAD}
                viewH={PAD}
                path={shapePath(round.kind, round.w, round.h)}
                under={paper(true)}
                guideColor="transparent"
                inkColor={ink}
                disabled={locked || phase !== "copy"}
                demo={copyDemo}
                onDemoEnd={onCopyDemoEnd}
                onAttempt={onCopy}
                showGuide={false}
                judge={(stroke) => judgeCopy(stroke, round.kind)}
                className="min-h-0 w-full flex-1"
              />,
            )}
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
              <p className={`${styles.doneTitle} text-2xl font-extrabold leading-tight sm:text-3xl`}>{lines.done}</p>
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
