"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Star, Volume2 } from "lucide-react";
import { Line } from "react-konva";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import RealisticEffect from "@/components/effects/RealisticEffect";
import TracePad from "./TracePad";
import {
  VIEW_W,
  VIEW_H,
  RULES,
  STROKES,
  POSTURE_NAMES,
  POSTURE_IMAGES,
  TOOL_PROMPT,
  POSTURE_PROMPT,
  TRACE_TEXT,
  RIGHT,
  WRONG_TAP,
  WRONG_TRACE,
  POSTURE_REVEAL,
  DONE_TEXT,
  isStroke,
  isPosture,
  itemAsset,
  itemLabel,
  toolReveal,
  resultSpeech,
  type Stroke,
  type Posture,
} from "./WritingSkillsReview1.data";
import styles from "./WritingSkillsReview1.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// How long a finished page stays before it turns.
const NEXT_PAUSE_MS = 800;

// A page is a tap task (a writing tool or the right posture) or a stroke to trace.
type Task =
  | { id: string; type: "tool"; choices: string[]; answer: string }
  | { id: string; type: "posture"; choices: Posture[]; answer: Posture }
  | { id: string; type: "trace"; stroke: Stroke };

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Stage = "playing" | "done";

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

function toTask(row: QuestionRow): Task {
  const data = (row.questionData ?? {}) as { type?: unknown; choices?: unknown; stroke?: unknown };
  const answer = row.correctAnswer.answer;
  const choices = Array.isArray(data.choices) ? data.choices : [];
  if (data.type === "trace" && isStroke(data.stroke)) return { id: row.questionKey, type: "trace", stroke: data.stroke };
  if (data.type === "posture" && choices.length === 2 && choices.every(isPosture) && isPosture(answer) && choices.includes(answer)) {
    return { id: row.questionKey, type: "posture", choices, answer };
  }
  if (data.type === "tool" && choices.length >= 2 && choices.every((c): c is string => typeof c === "string" && c !== "") && choices.includes(answer)) {
    return { id: row.questionKey, type: "tool", choices, answer };
  }
  throw new Error(`Question ${row.questionKey} needs a tool, posture or trace task with its answer among the choices`);
}

export default function WritingSkillsReview1({ activityId, activityName, onFinish }: GameComponentProps) {
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(true);
  // The choice tapped by mistake, whether the right one glows after a miss, whether a trace missed, the stroke demo, and the page's star sticker.
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [traceMissed, setTraceMissed] = useState(false);
  const [demo, setDemo] = useState(false);
  const [sticker, setSticker] = useState(false);
  // The first answer on each page is the graded one.
  const answers = useRef<Record<string, string>>({});
  const task = stage === "playing" ? tasks?.[index] : undefined;
  const total = tasks?.length ?? 0;

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
        setTasks(rows.map(toTask));
      } catch (err) {
        console.error("Failed to load Writing Skills Review 1 questions:", err);
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

  // A ref, not only state, so two answers landing in the same tick can't both count.
  const lockedRef = useRef(true);
  const lock = (on: boolean) => {
    lockedRef.current = on;
    setLocked(on);
  };

  const promptOf = (t: Task) => (t.type === "tool" ? TOOL_PROMPT : t.type === "posture" ? POSTURE_PROMPT : STROKES[t.stroke].prompt);

  // Reads each page as it opens, then lets the child answer; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!task) return;
    const prompt = task.type === "tool" ? TOOL_PROMPT : task.type === "posture" ? POSTURE_PROMPT : STROKES[task.stroke].prompt;
    const open = () => lock(false);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["writing skills review 1"], prompt], open);
      return;
    }
    speak(prompt, open);
  }, [task, speak, speakAll]);

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

  // Pending pause after a page, cleared on unmount so a late timer never moves a finished game on.
  const pauseRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (pauseRef.current) window.clearTimeout(pauseRef.current);
  }, []);

  // The page is done: it turns to the next one, or the notebook closes and the result is spoken and sent.
  const turnPage = (earned: boolean) => {
    const isLast = index === total - 1;
    pauseRef.current = window.setTimeout(() => {
      setWrongPick(null);
      setRevealed(false);
      setTraceMissed(false);
      setDemo(false);
      setSticker(false);
      if (!isLast) return setIndex((i) => i + 1);
      // Stars are the right first answers, so the final count is the score.
      setStage("done");
      playTones([392, 523, 659, 784, 1047], "sine");
      speak(resultSpeech(stars + (earned ? 1 : 0), total), handleFinish);
    }, NEXT_PAUSE_MS);
  };

  const earn = () => {
    setStars((s) => Math.min(s + 1, total));
    setSticker(true);
    playTones([523, 659, 784], "sine");
    speak(RIGHT, () => turnPage(true));
  };

  // One try per tap page: the right choice earns a sticker; a wrong one shakes with an X, then the right one glows and grows, with no star.
  const pick = (i: number) => {
    if (!task || task.type === "trace" || lockedRef.current) return;
    lock(true);
    const choice = task.choices[i];
    answers.current[task.id] ??= choice;
    if (choice === task.answer) return earn();
    playTones([330, 247], "triangle");
    setWrongPick(i);
    const reveal = task.type === "tool" ? toolReveal(task.answer, itemLabel(task.answer)) : POSTURE_REVEAL;
    speak(WRONG_TAP, () => {
      setRevealed(true);
      speak(reveal, () => turnPage(false));
    });
  };

  // One try per trace page: a good stroke earns a sticker; a miss turns red, then the pencil shows the stroke glowing, with no star.
  const onAttempt = (pass: boolean) => {
    if (!task || task.type !== "trace" || lockedRef.current) return;
    lock(true);
    answers.current[task.id] ??= pass ? "correct" : "missed";
    if (pass) return earn();
    playTones([330, 247], "triangle");
    setTraceMissed(true);
    speak(WRONG_TRACE, () => setDemo(true));
  };

  const onDemoEnd = () => {
    if (task?.type === "trace") speak(STROKES[task.stroke].reveal, () => turnPage(false));
  };

  if (loadError) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-4 text-center`}>
        <p className="text-lg font-bold">Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!tasks) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-4`}>
        <p className="text-lg font-bold">Loading…</p>
      </div>
    );
  }

  // The ruled writing lines every trace page is printed with.
  const rules = (
    <>
      <Line points={[40, RULES.top, VIEW_W - 40, RULES.top]} stroke="#5b8ef4" strokeWidth={4} />
      <Line points={[40, RULES.mid, VIEW_W - 40, RULES.mid]} stroke="#e15a5a" strokeWidth={3} dash={[16, 12]} />
      <Line points={[40, RULES.base, VIEW_W - 40, RULES.base]} stroke="#5b8ef4" strokeWidth={4} />
    </>
  );

  const choiceButton = (t: Extract<Task, { type: "tool" | "posture" }>, choice: string, i: number) => {
    const isWrong = wrongPick === i;
    const isAnswer = revealed && choice === t.answer;
    const isRight = wrongPick === null && sticker && choice === t.answer;
    const name = t.type === "tool" ? itemLabel(choice) : POSTURE_NAMES[choice as Posture];
    return (
      <motion.button
        key={`${t.id}-${i}`}
        type="button"
        onClick={() => pick(i)}
        disabled={locked}
        aria-label={name}
        initial={{ opacity: 0, y: 18 }}
        animate={isWrong ? { opacity: 0.55, y: 0, scale: 1, x: [0, -8, 8, -4, 4, 0] } : { opacity: 1, y: 0, scale: isAnswer ? 1.12 : isRight ? 1.05 : 1 }}
        transition={{ duration: 0.45, ease: EASE_OUT, delay: wrongPick === null && !revealed && !sticker ? i * 0.08 : 0 }}
        className={`${t.type === "tool" ? styles.toolCard : styles.postureCard} ${isAnswer ? styles.showAnswer : isRight ? styles.right : ""} relative flex shrink-0 flex-col items-center justify-center gap-[4%] rounded-3xl p-[5%] disabled:cursor-default ${focusRing}`}
      >
        <span className="pointer-events-none relative block min-h-0 w-full flex-1">
          <Image
            src={t.type === "tool" ? itemAsset(choice) : POSTURE_IMAGES[choice as Posture]}
            alt=""
            fill
            sizes="360px"
            className="object-contain"
            draggable={false}
          />
        </span>
        {t.type === "tool" && <span className={`${styles.label} font-extrabold leading-none`}>{name}</span>}
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
            {activityName || "Writing Skills Review 1"}
          </h2>
          <div className="flex flex-1 justify-end">
            <div className={`${styles.pill} flex items-center gap-1.5 rounded-full px-3 py-1 text-lg font-extrabold sm:text-2xl`} aria-label={`${stars} stars`}>
              <Star aria-hidden="true" className="h-5 w-5 text-[#f2b134] sm:h-6 sm:w-6" fill="#f2b134" strokeWidth={2.2} />
              <span className="tabular-nums">{stars}</span>
            </div>
          </div>
        </div>

        {/* the page's question with the replay button */}
        <div className={`${styles.promptRow} relative z-10 mt-2 flex shrink-0 justify-center`}>
          <div className={`${styles.promptPill} flex items-center gap-2 rounded-3xl py-1 pl-4 pr-1 sm:gap-3 sm:rounded-full sm:pl-6`}>
            <p className={`${styles.instruction} text-base font-bold leading-tight sm:text-2xl`}>
              {!task ? DONE_TEXT : task.type === "trace" ? TRACE_TEXT : promptOf(task)}
            </p>
            <button
              type="button"
              onClick={() => task && speak(promptOf(task))}
              disabled={!task || demo}
              aria-label="Hear the question again"
              className={`${styles.roundButton} ${styles.speaker} flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${focusRing}`}
            >
              <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* the notebook: each task is a page that turns when it is done */}
        <div className={`${styles.desk} relative flex min-h-0 flex-1 items-center justify-center py-2`}>
          {task ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={task.id}
                initial={{ opacity: 0, rotateY: -80 }}
                animate={traceMissed && !demo ? { opacity: 1, rotateY: 0, x: [0, -10, 10, -6, 6, 0] } : { opacity: 1, rotateY: 0, x: 0 }}
                exit={{ opacity: 0, rotateY: 80 }}
                transition={{ duration: 0.45, ease: EASE_OUT }}
                style={{ transformPerspective: 1400, transformOrigin: "0% 50%" }}
                className={`${styles.page} relative flex h-full w-full flex-col items-center justify-center rounded-2xl`}
              >
                {/* the spiral binding down the left edge */}
                <span aria-hidden className={`${styles.spiral} pointer-events-none absolute inset-y-[4%] left-0`} />
                {task.type === "trace" ? (
                  <TracePad
                    viewW={VIEW_W}
                    viewH={VIEW_H}
                    path={STROKES[task.stroke].path}
                    under={rules}
                    guideColor="#22314f"
                    inkColor="#3fae72"
                    disabled={locked}
                    demo={demo}
                    onDemoEnd={onDemoEnd}
                    onAttempt={onAttempt}
                    className="h-full w-full"
                  />
                ) : (
                  <div className={`${styles.choices} flex h-full w-full items-center justify-center`}>{task.choices.map((c, i) => choiceButton(task, c, i))}</div>
                )}
                <AnimatePresence>
                  {sticker && (
                    <motion.span
                      aria-hidden
                      className={`${styles.sticker} pointer-events-none absolute right-[3%] top-[4%] flex items-center justify-center rounded-full leading-none`}
                      initial={{ scale: 0, rotate: -40 }}
                      animate={{ scale: 1, rotate: 12 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.45, ease: EASE_OUT }}
                    >
                      ⭐
                    </motion.span>
                  )}
                  {traceMissed && !demo && (
                    <motion.span
                      aria-hidden
                      className={`${styles.traceWrong} pointer-events-none absolute inset-0 flex items-center justify-center font-black leading-none`}
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
            </AnimatePresence>
          ) : (
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
          )}
        </div>
        <RealisticEffect active={stage === "done"} />
      </div>
    </MotionConfig>
  );
}
