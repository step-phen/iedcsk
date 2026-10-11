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
  RECOGNIZE_CHOICES,
  MAX_COUNT,
  WRONG,
  WRONG_COUNT,
  DONE_TEXT,
  type Task,
  numberWord,
  objectName,
  answerSide,
  instruction,
  promptSpeech,
  rightSpeech,
  answerLine,
  resultSpeech,
} from "./MathSkillsReview1.data";
import styles from "./MathSkillsReview1.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// How long the answered task stays before the next one rolls in.
const NEXT_PAUSE_MS = 1000;

// Comparing groups are small, so three pictures fit across.
const SMALL_GROUP = "min(29cqw, 40cqh)";

interface Round {
  id: string;
  task: Task;
  answer: string;
}

// One button under the task: a numeral card, or a group card holding n pictures.
interface Choice {
  value: string;
  n: number;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Stage = "playing" | "done";

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

const inRange = (n: unknown, max: number): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= max;
const numberList = (v: unknown, max: number): number[] | null => (Array.isArray(v) && v.length >= 2 && v.every((n) => inRange(n, max)) ? (v as number[]) : null);

/** Checks one row and works out its answer, so a bad seed fails loudly instead of grading wrong. */
function toRound(row: QuestionRow): Round {
  const d = (row.questionData ?? {}) as Record<string, unknown>;
  const object = typeof d.object === "string" && d.object in OBJECTS ? d.object : null;
  let task: Task | null = null;
  let answer = "";
  if (d.kind === "recognize" && inRange(d.number, RECOGNIZE_CHOICES.length)) {
    task = { kind: "recognize", number: d.number };
    answer = String(d.number);
  } else if (d.kind === "count" && object && inRange(d.count, MAX_COUNT)) {
    const choices = numberList(d.choices, MAX_COUNT);
    if (choices?.filter((n) => n === d.count).length === 1) task = { kind: "count", object, count: d.count, choices };
    answer = String(d.count);
  } else if (d.kind === "match" && object && inRange(d.number, MAX_COUNT)) {
    const groups = numberList(d.groups, MAX_COUNT);
    if (groups?.filter((n) => n === d.number).length === 1) task = { kind: "match", object, number: d.number, groups };
    answer = String(d.number);
  } else if (d.kind === "compare" && object && inRange(d.left, 6) && inRange(d.right, 6) && d.left !== d.right && (d.ask === "more" || d.ask === "fewer")) {
    task = { kind: "compare", object, left: d.left, right: d.right, ask: d.ask };
    answer = answerSide(d.left, d.right, d.ask);
  }
  if (!task || row.correctAnswer.answer !== answer) throw new Error(`Question ${row.questionKey} is not a valid recognize, count, match or compare task`);
  return { id: row.questionKey, task, answer };
}

function choicesOf(task: Task): Choice[] {
  switch (task.kind) {
    case "recognize":
      return RECOGNIZE_CHOICES.map((n) => ({ value: String(n), n }));
    case "count":
      return task.choices.map((n) => ({ value: String(n), n }));
    case "match":
      return task.groups.map((n) => ({ value: String(n), n }));
    case "compare":
      return [
        { value: "left", n: task.left },
        { value: "right", n: task.right },
      ];
  }
}

export default function MathSkillsReview1({ activityId, activityName, onFinish }: GameComponentProps) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(true);
  // The choice tapped by mistake, the right choice glowing after a miss, the right choice picked first time, and the picture being counted aloud.
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [rightPick, setRightPick] = useState<string | null>(null);
  const [counting, setCounting] = useState<number | null>(null);
  // One train car per task: a star when it was right first time.
  const [cars, setCars] = useState<boolean[]>([]);
  // The first choice tapped for each task is the graded answer.
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
        setRounds(rows.map(toRound));
      } catch (err) {
        console.error("Failed to load Math Skills Review 1 questions:", err);
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

  // Reads each task as it rolls in, then lets the child choose; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!round) return;
    const prompt = promptSpeech(round.task);
    const open = () => lock(false);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["math skills review 1"], prompt], open);
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

  // The task is answered: its car joins the train, then the next task rolls in, or the result is spoken and sent.
  const advanceLater = (earned: boolean) => {
    const isLast = index === total - 1;
    setCars((c) => [...c, earned]);
    pauseRef.current = window.setTimeout(() => {
      setWrongPick(null);
      setRevealed(false);
      setRightPick(null);
      setCounting(null);
      if (!isLast) return setIndex((i) => i + 1);
      // Stars are the right first picks, so the final count is the score.
      setStage("done");
      playTones([392, 523, 659, 784, 1047], "sine");
      speak(resultSpeech(stars + (earned ? 1 : 0), total), handleFinish);
    }, NEXT_PAUSE_MS);
  };

  // Counts n pictures aloud, lighting each one up in turn.
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

  // One try per task: the right choice gets a star; a wrong one shakes with an X, then the right one glows and grows (counted aloud on counting tasks), with no star.
  const pick = (value: string) => {
    if (!round || lockedRef.current) return;
    lock(true);
    answers.current[round.id] ??= value;
    const { task } = round;
    if (value === round.answer) {
      setStars((s) => Math.min(s + 1, total));
      setRightPick(value);
      playTones([523, 659, 784], "sine");
      return speak(rightSpeech(task), () => advanceLater(true));
    }
    playTones([330, 247], "triangle");
    setWrongPick(value);
    const reveal = () => speak(answerLine(task), () => advanceLater(false));
    if (task.kind === "count" || task.kind === "match") {
      const n = task.kind === "count" ? task.count : task.number;
      return speak(WRONG_COUNT, () => {
        setRevealed(true);
        countAloud(n, reveal);
      });
    }
    speak(WRONG, () => {
      setRevealed(true);
      reveal();
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

  // What the task shows above its choices.
  const face = (r: Round) => {
    const { task } = r;
    switch (task.kind) {
      case "recognize":
        return (
          <button
            type="button"
            onClick={() => speak(promptSpeech(task))}
            disabled={locked}
            aria-label="Hear the number again"
            className={`${styles.listen} flex shrink-0 items-center justify-center rounded-full disabled:cursor-default ${focusRing}`}
          >
            <Volume2 aria-hidden="true" className="h-1/2 w-1/2" strokeWidth={2.5} />
          </button>
        );
      case "count":
        return (
          <div className={`${styles.board} relative flex min-h-0 w-full flex-1 items-center justify-center rounded-3xl`}>
            <span className={`${styles.boardGroup} relative block`}>
              <ObjectGroup object={task.object} count={task.count} counting={counting} />
            </span>
          </div>
        );
      case "match":
        return <span className={`${styles.bigNumber} flex shrink-0 items-center justify-center rounded-3xl font-extrabold leading-none tabular-nums`}>{task.number}</span>;
      case "compare":
        return <span className={`${styles.askBadge} shrink-0 rounded-full font-extrabold leading-none`}>{task.ask === "more" ? "MORE" : "FEWER"}</span>;
    }
  };

  const choice = (r: Round, c: Choice, i: number) => {
    const { task } = r;
    const asGroup = task.kind === "match" || task.kind === "compare";
    const object = asGroup ? task.object : "";
    const isWrong = wrongPick === c.value;
    const isAnswer = revealed && c.value === r.answer;
    const isRight = rightPick === c.value;
    return (
      <motion.button
        key={`${r.id}-${c.value}`}
        type="button"
        onClick={() => pick(c.value)}
        disabled={locked}
        aria-label={asGroup ? `${numberWord(c.n)} ${objectName(object, c.n)}` : `Number ${c.n}`}
        initial={{ opacity: 0, y: 30 }}
        animate={isWrong ? { opacity: 0.55, y: 0, scale: 1, x: [0, -8, 8, -4, 4, 0] } : { opacity: 1, y: 0, scale: isAnswer ? 1.12 : isRight ? 1.05 : 1 }}
        transition={{ duration: 0.45, ease: EASE_OUT, delay: wrongPick === null && !revealed && rightPick === null ? i * 0.06 : 0 }}
        className={`${asGroup ? styles.groupCard : styles.numeral} ${isAnswer ? styles.showAnswer : isRight ? styles.right : ""} relative flex min-h-0 min-w-0 items-center justify-center rounded-3xl font-extrabold leading-none tabular-nums disabled:cursor-default ${focusRing}`}
      >
        {asGroup ? (
          <span className={`${styles.cardGroup} relative block`}>
            <ObjectGroup object={object} count={c.n} counting={isAnswer && task.kind === "match" ? counting : null} size={task.kind === "compare" ? SMALL_GROUP : undefined} />
          </span>
        ) : (
          c.n
        )}
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
            {activityName || "Math Skills Review 1"}
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
            <p className={`${styles.instruction} text-base font-bold leading-tight sm:text-2xl`}>{round ? instruction(round.task) : DONE_TEXT}</p>
            <button
              type="button"
              onClick={() => round && speak(promptSpeech(round.task))}
              disabled={!round || locked}
              aria-label="Hear the question again"
              className={`${styles.roundButton} ${styles.speaker} flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${focusRing}`}
            >
              <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {round ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={round.id}
              className={`${styles.stage} relative flex min-h-0 w-full flex-1 flex-col items-center justify-center py-2`}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -60 }}
              transition={{ duration: 0.35, ease: EASE_OUT }}
            >
              {face(round)}
              <div className={`${styles.choices} ${round.task.kind === "match" ? styles.stack : ""} ${round.task.kind === "match" || round.task.kind === "compare" ? "min-h-0 flex-1" : "shrink-0"} flex w-full items-stretch justify-center`}>
                {choicesOf(round.task).map((c, i) => choice(round, c, i))}
              </div>
            </motion.div>
          </AnimatePresence>
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

        {/* the number train: the engine pulls one car per task, starred when it was right first time */}
        <div aria-hidden className={`${styles.train} relative flex shrink-0 items-end justify-center`}>
          <span className={`${styles.engine} leading-none`}>🚂</span>
          {Array.from({ length: total }, (_, i) => (
            <motion.span
              key={i}
              className={`${styles.car} ${i < cars.length ? styles.carDone : i === index && stage === "playing" ? styles.carNow : ""} relative flex items-center justify-center rounded-md`}
              animate={i === cars.length - 1 ? { y: [0, -8, 0] } : { y: 0 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            >
              {cars[i] && <Star className="h-3/5 w-3/5 text-[#f2b134]" fill="#f2b134" strokeWidth={2.2} />}
            </motion.span>
          ))}
        </div>
        <RealisticEffect active={stage === "done"} />
      </div>
    </MotionConfig>
  );
}
