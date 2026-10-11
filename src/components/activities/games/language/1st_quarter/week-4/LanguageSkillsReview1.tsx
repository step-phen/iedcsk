"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Star, Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import RealisticEffect from "@/components/effects/RealisticEffect";
import { ObjectPicture, PartIcon } from "../week-2/MissingPartsOfObjects";
import { OBJECTS, PARTS, type PartKey } from "../week-2/MissingPartsOfObjects.data";
import { DirectionIcon } from "../week-3/OppositeDirections";
import { isDirection, type Direction } from "../week-3/OppositeDirections.data";
import {
  PICTURES,
  TASK_TYPES,
  RIGHT,
  WRONG,
  REVEAL,
  DONE_TEXT,
  drawable,
  isLetter,
  isMissingObject,
  choiceName,
  questionText,
  questionSpeech,
  resultSpeech,
  type Task,
  type TaskType,
} from "./LanguageSkillsReview1.data";
import styles from "./LanguageSkillsReview1.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// How long a popped bubble's star stays before the next question.
const POP_PAUSE_MS = 700;

interface Round extends Task {
  id: string;
  choices: string[];
  answer: string;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Stage = "playing" | "done";

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

/** Whether a task's target can be drawn: a picture, an object with a missing part, a direction, a letter, or none for "different". */
function targetOk(type: TaskType, target: unknown): boolean {
  if (type === "different") return target === null;
  if (typeof target !== "string") return false;
  if (type === "missing") return isMissingObject(target);
  if (type === "opposite") return isDirection(target);
  if (type === "letter") return isLetter(target);
  return target in PICTURES;
}

export default function LanguageSkillsReview1({ activityId, activityName, onFinish }: GameComponentProps) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(false);
  // The bubble being named, the bubble tapped by mistake, whether the right one is glowing after a miss, and the bubble that popped.
  const [naming, setNaming] = useState<number | null>(null);
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [popped, setPopped] = useState<number | null>(null);
  // The first bubble tapped for each task is the graded answer.
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
            const data = (row.questionData ?? {}) as { type?: unknown; target?: unknown; choices?: unknown };
            const type = data.type as TaskType;
            const choices = Array.isArray(data.choices) ? data.choices : [];
            const answer = row.correctAnswer.answer;
            const ok =
              TASK_TYPES.includes(type) &&
              targetOk(type, data.target ?? null) &&
              choices.length >= 2 &&
              choices.every((c): c is string => typeof c === "string" && drawable(type, c)) &&
              choices.includes(answer);
            if (!ok) throw new Error(`Question ${row.questionKey} needs a task type, a drawable target and choices that include its answer`);
            return { id: row.questionKey, type, target: (data.target as string | null) ?? null, choices, answer };
          }),
        );
      } catch (err) {
        console.error("Failed to load Language Skills Review 1 questions:", err);
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

  // Names each bubble in turn, lighting it up, so the child knows every choice before answering; a tap cuts it short.
  const nameChoices = useCallback(
    (r: Round) => {
      const names = r.choices.map((c) => choiceName(r.type, c));
      if (names.some((n) => n === null)) return;
      const say = (i: number) => {
        if (i >= names.length) return setNaming(null);
        setNaming(i);
        speak(names[i]!, () => say(i + 1));
      };
      say(0);
    },
    [speak],
  );

  // Reads each task, then its bubbles, as it comes up; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!round) return;
    const prompt = questionSpeech(round);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["language skills review 1"], prompt], () => nameChoices(round));
      return;
    }
    speak(prompt, () => nameChoices(round));
  }, [round, speak, speakAll, nameChoices]);

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

  const finishedRef = useRef(false);
  const handleFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const submitted: SubmittedAnswer[] = Object.entries(answers.current).map(([id, response]) => ({ questionId: id, response }));
    onFinish?.(submitted);
  };

  // Pending pause after a pop, cleared on unmount so a late timer never moves a finished game on.
  const pauseRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (pauseRef.current) window.clearTimeout(pauseRef.current);
  }, []);

  // The right bubble pops into a star, and a missing-part object fills in.
  const popAnswer = (r: Round) => {
    playTones([523, 659, 784], "sine");
    setPopped(r.choices.indexOf(r.answer));
  };

  // After a short look at the star, the next task comes, or the result is spoken and sent.
  const advanceLater = (earned: boolean) => {
    const isLast = index === total - 1;
    pauseRef.current = window.setTimeout(() => {
      setNaming(null);
      setWrongPick(null);
      setRevealed(false);
      setPopped(null);
      lock(false);
      if (!isLast) return setIndex((i) => i + 1);
      // Stars are the right first picks, so the final count is the score.
      setStage("done");
      speak(resultSpeech(stars + (earned ? 1 : 0), total), handleFinish);
    }, POP_PAUSE_MS);
  };

  // One try per task: the right bubble pops and earns a star; a wrong one shakes with an X, then the right one glows and grows before it pops, with no star.
  const pick = (i: number) => {
    if (!round || lockedRef.current) return;
    lock(true);
    setNaming(null);
    const choice = round.choices[i];
    answers.current[round.id] ??= choice;
    if (choice === round.answer) {
      setStars((s) => Math.min(s + 1, total));
      popAnswer(round);
      return speak(RIGHT, () => advanceLater(true));
    }

    playTones([330, 247], "triangle");
    setWrongPick(i);
    const r = round;
    speak(WRONG, () => {
      setRevealed(true);
      speak(REVEAL, () => {
        popAnswer(r);
        advanceLater(false);
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

  // What a bubble or the target card shows: a letter, a direction arrow, a part or object drawing, or a picture with its name.
  const face = (r: Round, value: string, asTarget: boolean) => {
    if (r.type === "letter") return <span className={`${styles.letter} font-extrabold leading-none`}>{value}</span>;
    if (r.type === "opposite") {
      return (
        <span className="pointer-events-none relative block h-[58%] w-[58%]">
          <DirectionIcon direction={value as Direction} />
        </span>
      );
    }
    if (r.type === "missing" && asTarget && isMissingObject(value)) {
      // The object fills in its missing part once the right bubble pops.
      return (
        <span className="pointer-events-none relative block h-[84%] w-[84%]">
          <ObjectPicture type={value} fill={OBJECTS[value].fill} showPart={popped !== null} />
        </span>
      );
    }
    const part = r.type === "missing" ? PARTS[value as PartKey] : null;
    return (
      <span className="pointer-events-none flex h-full w-full flex-col items-center justify-center gap-[3%] pb-[4%]">
        <span className="relative block h-[56%] w-[62%]">
          {part ? (
            <PartIcon type={value as PartKey} fill={part.fill} />
          ) : (
            <Image src={PICTURES[value].image} alt="" fill sizes="200px" className="object-contain" draggable={false} />
          )}
        </span>
        <span className={`${styles.label} font-extrabold leading-none`}>{part ? part.name : PICTURES[value].name}</span>
      </span>
    );
  };

  const bubble = (r: Round, choice: string, i: number) => {
    const isWrong = wrongPick === i;
    const isAnswer = revealed && choice === r.answer;
    const isPopped = popped === i;
    const name = choiceName(r.type, choice);
    return (
      <motion.button
        key={`${r.id}-${i}`}
        type="button"
        onClick={() => pick(i)}
        disabled={locked}
        aria-label={name ?? `Letter ${choice}`}
        initial={{ opacity: 0, y: 24, scale: 0.8 }}
        animate={
          isWrong
            ? { opacity: 0.55, y: 0, scale: 1, x: [0, -8, 8, -4, 4, 0] }
            : { opacity: 1, y: 0, scale: isAnswer ? 1.15 : naming === i ? 1.08 : 1 }
        }
        transition={{ duration: 0.45, ease: EASE_OUT, delay: wrongPick === null && popped === null && !revealed ? i * 0.08 : 0 }}
        className={`${styles.bubble} ${isAnswer ? styles.showAnswer : naming === i ? styles.naming : ""} relative aspect-square shrink-0 rounded-full disabled:cursor-default ${focusRing}`}
      >
        {/* each bubble bobs on its own beat, so the row feels like it is floating */}
        <motion.span
          className="absolute inset-0 block"
          animate={isPopped ? { y: 0 } : { y: [0, -7, 0] }}
          transition={isPopped ? { duration: 0.2 } : { duration: 2.4 + i * 0.35, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
        >
          <motion.span
            className={`${styles.film} pointer-events-none absolute inset-0 rounded-full`}
            animate={isPopped ? { scale: 1.35, opacity: 0 } : { scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
          />
          <span className={`${styles.face} pointer-events-none absolute inset-[13%] flex items-center justify-center overflow-hidden rounded-full`}>{face(r, choice, false)}</span>
          <AnimatePresence>
            {isPopped && (
              <motion.span
                aria-hidden
                className={`${styles.burst} pointer-events-none absolute -top-[8%] left-1/2 -translate-x-1/2 leading-none`}
                initial={{ scale: 0, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: -6 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
              >
                ⭐
              </motion.span>
            )}
          </AnimatePresence>
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
        </motion.span>
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
            {activityName || "Language Skills Review 1"}
          </h2>
          <div className="flex flex-1 justify-end">
            <div className={`${styles.pill} flex items-center gap-1.5 rounded-full px-3 py-1 text-lg font-extrabold sm:text-2xl`} aria-label={`${stars} stars`}>
              <Star aria-hidden="true" className="h-5 w-5 text-[#f2b134] sm:h-6 sm:w-6" fill="#f2b134" strokeWidth={2.2} />
              <span className="tabular-nums">{stars}</span>
            </div>
          </div>
        </div>

        {/* the task's question with the replay button */}
        <div className={`${styles.promptRow} relative z-10 mt-2 flex shrink-0 justify-center`}>
          <div className={`${styles.promptPill} flex items-center gap-2 rounded-3xl py-1 pl-4 pr-1 sm:gap-3 sm:rounded-full sm:pl-6`}>
            <p className={`${styles.instruction} text-base font-bold leading-tight sm:text-2xl`}>{round ? questionText(round) : DONE_TEXT}</p>
            <button
              type="button"
              onClick={() => round && speak(questionSpeech(round), () => nameChoices(round))}
              disabled={!round || locked}
              aria-label="Hear the question again"
              className={`${styles.roundButton} ${styles.speaker} flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${focusRing}`}
            >
              <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center py-2">
          {round ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={round.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className={`${styles.task} flex flex-col items-center justify-center gap-[clamp(14px,3dvh,36px)]`}
              >
                {/* the card the task is about: the picture to match or pair, the object with a missing part, or the direction */}
                {round.target && round.type !== "letter" && (
                  <div className={`${styles.target} flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-3xl`}>{face(round, round.target, true)}</div>
                )}
                <div className="flex items-center justify-center gap-[clamp(8px,2.2vw,28px)]">{round.choices.map((c, i) => bubble(round, c, i))}</div>
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
