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
import { ASSETS, INSTRUCTION, RIGHT, WRONG, DONE_TEXT, promptSpeech, foundSpeech, resultSpeech } from "./ListenFindLetter.data";
import styles from "./ListenFindLetter.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

interface Round {
  id: string;
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Stage = "playing" | "done";

const shuffle = <T,>(list: T[]): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

export default function ListenFindLetter({ activityId, activityName, onFinish }: GameComponentProps) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(false);
  // The chest tapped by mistake, the chest that is open, and whether it was opened for the child after a miss.
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  // The first chest tapped in each round is the graded answer.
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
        const mapped = rows.map((row) => {
          const data = row.questionData as { choices?: unknown };
          const choices = Array.isArray(data.choices) ? data.choices : [];
          const answer = row.correctAnswer.answer;
          if (choices.length < 2 || !choices.every((c) => typeof c === "string") || !choices.includes(answer)) {
            throw new Error(`Question ${row.questionKey} needs letter choices that include the answer`);
          }
          // Rounds keep their seeded order; only the chests' places change.
          return { id: answer, choices: shuffle(choices as string[]) };
        });
        setRounds(mapped);
      } catch (err) {
        console.error("Failed to load Listen and Find the Letter questions:", err);
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

  // Says each letter as its round appears; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!round) return;
    const prompt = promptSpeech(round.id);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["listen and find the letter"], prompt]);
      return;
    }
    speak(prompt);
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

  // Opens the right chest, names its letter, then moves on; only a right first pick earns a star.
  const openChest = (r: Round, earned: boolean, lead: string) => {
    playTones([523, 659, 784, 1046], "sine");
    setOpened(r.id);
    if (earned) setStars((s) => Math.min(s + 1, total));
    const isLast = index === total - 1;
    speak(`${lead} ${foundSpeech(r.id)}`.trim(), () => {
      setOpened(null);
      setWrongPick(null);
      setRevealed(false);
      lock(false);
      if (!isLast) return setIndex((i) => i + 1);
      // Stars are the right first picks, so the final count is the score; it is sent once the result line has been spoken.
      setStage("done");
      speak(resultSpeech(stars + (earned ? 1 : 0), total), handleFinish);
    });
  };

  // One try per round: a miss keeps that chest shut with an X, then the right chest glows and opens with no star.
  const pick = (letter: string) => {
    if (!round || lockedRef.current) return;
    lock(true);
    answers.current[round.id] ??= letter;
    if (letter === round.id) return openChest(round, true, RIGHT);

    playTones([330, 247], "triangle");
    setWrongPick(letter);
    const r = round;
    speak(WRONG, () => {
      setRevealed(true);
      openChest(r, false, "");
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

  const chest = (r: Round, letter: string) => {
    const isOpen = opened === letter;
    const isWrong = wrongPick === letter;
    const isAnswer = revealed && letter === r.id;
    return (
      <motion.button
        key={letter}
        type="button"
        onClick={() => pick(letter)}
        disabled={locked}
        aria-label={`Treasure chest with the letter ${letter.toUpperCase()}`}
        animate={isWrong ? { x: [0, -10, 10, -6, 6, 0], opacity: 0.6 } : { scale: isAnswer ? 1.12 : 1, opacity: opened && !isOpen ? 0.6 : 1 }}
        transition={{ duration: 0.45, ease: EASE_OUT }}
        style={{ transformOrigin: "50% 100%" }}
        className={`${styles.chest} ${isAnswer ? styles.showAnswer : ""} relative block shrink-0 rounded-2xl disabled:cursor-default ${focusRing}`}
      >
        {/* The open chest fades in over the closed one with a little pop; the lid and treasure are in its art. */}
        <motion.span
          className="pointer-events-none absolute inset-0 block"
          animate={isOpen ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
          style={{ transformOrigin: "50% 100%" }}
        >
          <Image src={ASSETS.chestClosed} alt="" fill sizes="240px" draggable={false} className="object-contain" />
          <motion.span className="absolute inset-0 block" initial={false} animate={{ opacity: isOpen ? 1 : 0 }} transition={{ duration: 0.25 }}>
            <Image src={ASSETS.chestOpen} alt="" fill sizes="240px" draggable={false} className="object-contain" />
          </motion.span>
          {/* the letter on the gold plate, placed where the plate sits in both chest images */}
          <span className={`${styles.plate} absolute bottom-[12.6%] left-[29.8%] right-[29.4%] top-[68.6%] flex items-center justify-center font-extrabold leading-none`}>
            {letter.toUpperCase()}
            {letter}
          </span>
        </motion.span>
        {isWrong && (
          <motion.span
            aria-hidden
            className={`${styles.wrongMark} pointer-events-none absolute inset-0 z-20 flex items-center justify-center font-black leading-none`}
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
            {activityName || "Listen and Find the Letter"}
          </h2>
          <div className="flex flex-1 justify-end">
            <div className={`${styles.pill} flex items-center gap-1.5 rounded-full px-3 py-1 text-lg font-extrabold sm:text-2xl`} aria-label={`${stars} stars`}>
              <Star aria-hidden="true" className="h-5 w-5 text-[#f2b134] sm:h-6 sm:w-6" fill="#f2b134" strokeWidth={2.2} />
              <span className="tabular-nums">{stars}</span>
            </div>
          </div>
        </div>

        {/* instruction; the letter itself is only ever heard, never shown here */}
        <div className={`${styles.promptRow} relative z-10 mt-2 flex shrink-0 justify-center`}>
          <p className={`${styles.promptPill} ${styles.instruction} rounded-3xl px-4 py-1.5 text-center text-base font-bold leading-tight sm:rounded-full sm:px-6 sm:text-2xl`}>
            {INSTRUCTION}
          </p>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center py-2">
          <AnimatePresence mode="wait">
            {round ? (
              <motion.div
                key={`${round.id}-${index}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
                className={`${styles.board} flex flex-col items-center justify-center gap-[clamp(12px,3dvh,32px)]`}
              >
                <button
                  type="button"
                  onClick={() => speak(promptSpeech(round.id))}
                  disabled={locked}
                  aria-label="Hear the letter again"
                  className={`${styles.listen} flex shrink-0 items-center justify-center rounded-full ${focusRing}`}
                >
                  <Volume2 aria-hidden="true" className="h-1/2 w-1/2" strokeWidth={2.5} />
                </button>
                <div className="flex items-end justify-center gap-[clamp(10px,3vw,36px)]">{round.choices.map((c) => chest(round, c))}</div>
              </motion.div>
            ) : (
              <motion.div
                key="done"
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
          </AnimatePresence>
        </div>
        <RealisticEffect active={stage === "done"} />
      </div>
    </MotionConfig>
  );
}
