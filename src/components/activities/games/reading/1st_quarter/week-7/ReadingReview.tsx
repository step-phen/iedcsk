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
import { ASSETS, ITEMS, TASK_TYPES, NAMED_TYPES, isLetter, RIGHT, WRONG, REVEAL, DONE_TEXT, questionText, questionSpeech, resultSpeech, type Task, type TaskType } from "./ReadingReview.data";
import styles from "./ReadingReview.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

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

const known = (choice: unknown): choice is string => typeof choice === "string" && (isLetter(choice) || choice in ITEMS);

export default function ReadingReview({ activityId, activityName, onFinish }: GameComponentProps) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(false);
  // How each stone ended (true = star, false = missed), the card tapped right or wrong, and whether the right card is being shown after a miss.
  const [results, setResults] = useState<boolean[]>([]);
  const [rightPick, setRightPick] = useState<number | null>(null);
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  // The card whose name is being said right now.
  const [naming, setNaming] = useState<number | null>(null);
  // The first card tapped for each task is the graded answer.
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
            const choices = Array.isArray(data.choices) ? data.choices : [];
            const answer = row.correctAnswer.answer;
            if (!TASK_TYPES.includes(data.type as TaskType) || choices.length < 2 || !choices.every(known) || !choices.includes(answer)) {
              throw new Error(`Question ${row.questionKey} needs a task type and known choices that include its answer`);
            }
            return {
              id: row.questionKey,
              type: data.type as TaskType,
              target: typeof data.target === "string" ? data.target : null,
              choices,
              answer,
            };
          }),
        );
      } catch (err) {
        console.error("Failed to load Reading Review questions:", err);
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

  // Names each card in turn, lighting it up, so the child knows every picture before answering; a tap cuts it short.
  const nameChoices = useCallback(
    (r: Round) => {
      if (!NAMED_TYPES.includes(r.type)) return;
      const say = (i: number) => {
        if (i >= r.choices.length) return setNaming(null);
        setNaming(i);
        speak(ITEMS[r.choices[i]].name, () => say(i + 1));
      };
      say(0);
    },
    [speak],
  );

  // Reads each task, then its cards, as its stone is reached; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!round) return;
    const prompt = questionSpeech(round);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["reading review"], prompt], () => nameChoices(round));
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

  // The token hops to the next stone; after the last one the result is spoken and sent.
  const advance = (earned: boolean) => {
    setRightPick(null);
    setWrongPick(null);
    setRevealed(false);
    lock(false);
    if (index < total - 1) return setIndex((i) => i + 1);
    // Stars are the right first picks, so the final count is the score.
    setStage("done");
    speak(resultSpeech(stars + (earned ? 1 : 0), total), handleFinish);
  };

  // One try per task: a right card earns the stone a star; a wrong one gets an X, then the right card lights up and the stone stays grey.
  const pick = (i: number) => {
    if (!round || lockedRef.current) return;
    lock(true);
    setNaming(null);
    const choice = round.choices[i];
    answers.current[round.id] ??= choice;
    const correct = choice === round.answer;
    setResults((r) => {
      const next = [...r];
      next[index] = correct;
      return next;
    });
    if (correct) {
      playTones([523, 659, 784], "sine");
      setRightPick(i);
      setStars((s) => Math.min(s + 1, total));
      return speak(RIGHT, () => advance(true));
    }

    playTones([330, 247], "triangle");
    setWrongPick(i);
    speak(WRONG, () => {
      setRevealed(true);
      speak(REVEAL, () => advance(false));
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

  // The learner's own avatar walks the trail; one shared element, so it hops from stone to stone.
  const token = (
    <motion.span
      layoutId="trail-token"
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className={`${styles.token} pointer-events-none absolute bottom-[calc(100%+4px)] left-1/2 z-10 flex -translate-x-1/2 items-center justify-center overflow-hidden rounded-full`}
      aria-hidden
    >
      <LearnerAvatar photoUrl={photoUrl} firstName={learnerName ?? "?"} className="h-full w-full text-[calc(var(--stone)*0.6)]" />
    </motion.span>
  );
  const at = stage === "done" ? total : index;

  // What a card shows: a letter, an emoji stand-in, or a picture.
  const face = (choice: string, big = false) => {
    if (isLetter(choice)) return <span className={`${styles.letter} font-extrabold leading-none`}>{choice}</span>;
    const item = ITEMS[choice];
    if (item.emoji) return <span className={`${styles.emoji} leading-none`}>{item.emoji}</span>;
    return (
      <span className="pointer-events-none relative block h-[82%] w-[82%]">
        <Image src={item.image!} alt="" fill sizes={big ? "220px" : "190px"} className="object-contain" draggable={false} />
      </span>
    );
  };

  const choiceCard = (r: Round, choice: string, i: number) => {
    const isWrong = wrongPick === i;
    const isRight = rightPick === i;
    const isAnswer = revealed && choice === r.answer;
    return (
      <motion.button
        key={`${r.id}-${i}`}
        type="button"
        onClick={() => pick(i)}
        disabled={locked}
        aria-label={isLetter(choice) ? `Letter ${choice}` : ITEMS[choice].name}
        initial={{ opacity: 0, y: 16 }}
        animate={
          isWrong
            ? { opacity: 0.6, y: 0, x: [0, -8, 8, -4, 4, 0] }
            : isRight
              ? { opacity: 1, y: 0, scale: [1, 1.12, 1.05] }
              : { opacity: 1, y: 0, scale: isAnswer ? 1.12 : naming === i ? 1.08 : 1 }
        }
        transition={{ duration: 0.45, ease: EASE_OUT, delay: wrongPick === null && rightPick === null ? i * 0.06 : 0 }}
        className={`${styles.choice} ${isAnswer ? styles.showAnswer : naming === i ? styles.naming : ""} relative flex aspect-square shrink-0 items-center justify-center rounded-3xl disabled:cursor-default ${focusRing}`}
      >
        {face(choice, true)}
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
            {activityName || "Reading Review"}
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

        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-around gap-[clamp(8px,2dvh,24px)] py-2">
          {/* the trail: a stone per task, gold with a star when earned, grey when missed, then the finish flag */}
          <ol className={`${styles.trail} flex shrink-0 items-center gap-[clamp(3px,0.8vw,10px)]`} aria-label={`${stars} stars on the trail`}>
            {rounds.map((r, i) => (
              <li
                key={r.id}
                className={`${styles.stone} ${results[i] === false ? styles.stoneMissed : ""} ${i === at ? styles.stoneCurrent : ""} relative flex shrink-0 items-center justify-center`}
              >
                <Image src={results[i] === true ? ASSETS.stoneGold : ASSETS.stone} alt="" fill sizes="80px" draggable={false} className="object-contain" />
                {results[i] === true && <Star aria-hidden="true" className="relative h-[60%] w-[60%] -translate-y-[6%] text-[#c08a00]" fill="#fff3b0" strokeWidth={2.4} />}
                {i === at && token}
              </li>
            ))}
            <li className={`${styles.flag} relative shrink-0`} aria-hidden>
              <Image src={ASSETS.flag} alt="" fill sizes="80px" draggable={false} className="object-contain" />
              {at === total && token}
            </li>
          </ol>

          {round ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={round.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className={`${styles.task} flex min-h-0 flex-col items-center justify-center gap-[clamp(10px,2.5dvh,28px)]`}
              >
                {/* the card the task is about: the picture to match, or the big letter to partner */}
                {(round.type === "same" || round.type === "partner") && round.target && (
                  <div className={`${styles.target} flex aspect-square shrink-0 items-center justify-center rounded-3xl`} aria-label={`Look at ${isLetter(round.target) ? `big ${round.target}` : ITEMS[round.target].name}`}>
                    {face(round.target)}
                  </div>
                )}
                <div className="flex items-center justify-center gap-[clamp(8px,2vw,24px)]">{round.choices.map((c, i) => choiceCard(round, c, i))}</div>
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
