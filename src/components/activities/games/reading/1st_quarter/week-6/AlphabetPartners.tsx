"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from "framer-motion";
import { Star, Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import RealisticEffect from "@/components/effects/RealisticEffect";
import { FISH_IMAGES, INSTRUCTION, RIGHT, WRONG, DONE_TEXT, promptSpeech, pairSpeech, revealLead, resultSpeech } from "./AlphabetPartners.data";
import styles from "./AlphabetPartners.module.css";

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

// Even lanes swim left-to-right first, odd lanes the other way; the body turns at each end, the letter never mirrors.
const SWIM_TIMES = [0, 0.47, 0.5, 0.97, 1];
const swimLeft = (lane: number) => (lane % 2 === 0 ? ["14%", "86%", "86%", "14%", "14%"] : ["86%", "14%", "14%", "86%", "86%"]);
const swimFlip = (lane: number) => (lane % 2 === 0 ? [1, 1, -1, -1, 1] : [-1, -1, 1, 1, -1]);
// Where each lane's fish waits when motion is reduced.
const STILL_LEFT = ["22%", "74%", "40%", "60%", "30%"];

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

export default function AlphabetPartners({ activityId, activityName, onFinish }: GameComponentProps) {
  const reduceMotion = useReducedMotion();
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(false);
  // The fish tapped by mistake, and the fish being reeled in (the right one, after a right pick or a miss).
  const [wrongPick, setWrongPick] = useState<string | null>(null);
  const [caught, setCaught] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  // The first fish tapped in each round is the graded answer.
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
          if (choices.length < 2 || choices.length > FISH_IMAGES.length || !choices.every((c) => typeof c === "string") || !choices.includes(answer)) {
            throw new Error(`Question ${row.questionKey} needs 2-${FISH_IMAGES.length} letter choices that include its partner`);
          }
          // Rounds keep their seeded order; only which lane each fish swims in changes.
          return { id: answer, choices: shuffle(choices as string[]) };
        });
        setRounds(mapped);
      } catch (err) {
        console.error("Failed to load Alphabet Partners questions:", err);
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

  // Asks for each letter's partner as its round appears; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!round) return;
    const prompt = promptSpeech(round.id);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["alphabet partners"], prompt]);
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

  // Reels in the right fish, says the pair, then moves on; only a right first pick earns a star.
  const reelIn = (r: Round, earned: boolean, lead: string) => {
    playTones([523, 659, 784], "sine");
    setCaught(r.id);
    if (earned) setStars((s) => Math.min(s + 1, total));
    const isLast = index === total - 1;
    speak(`${lead} ${pairSpeech(r.id)}`, () => {
      setCaught(null);
      setWrongPick(null);
      setRevealed(false);
      lock(false);
      if (!isLast) return setIndex((i) => i + 1);
      // Stars are the right first picks, so the final count is the score; it is sent once the result line has been spoken.
      setStage("done");
      speak(resultSpeech(stars + (earned ? 1 : 0), total), handleFinish);
    });
  };

  // One try per round: a miss marks that fish, then the right one glows and is reeled in with no star.
  const pick = (letter: string) => {
    if (!round || lockedRef.current) return;
    lock(true);
    answers.current[round.id] ??= letter;
    if (letter === round.id) return reelIn(round, true, RIGHT);

    playTones([330, 247], "triangle");
    setWrongPick(letter);
    const r = round;
    speak(WRONG, () => {
      setRevealed(true);
      reelIn(r, false, revealLead(r.id));
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

  const fish = (r: Round, letter: string, lane: number) => {
    const isCaught = caught === letter;
    const isWrong = wrongPick === letter;
    const isAnswer = revealed && letter === r.id;
    const swimming = !reduceMotion && !caught;
    return (
      <motion.button
        key={letter}
        type="button"
        onClick={() => pick(letter)}
        disabled={locked}
        aria-label={`Fish with small ${letter}`}
        className={`${styles.fish} ${isAnswer ? styles.showAnswer : ""} absolute rounded-full disabled:cursor-default ${focusRing}`}
        style={{ top: `${5 + lane * 18}%`, zIndex: isCaught ? 2 : 1 }}
        initial={{ left: reduceMotion ? STILL_LEFT[lane] : swimLeft(lane)[0], opacity: 0 }}
        animate={
          isCaught
            ? { left: "50%", top: "-6%", scale: 1.25, opacity: 1 }
            : swimming
              ? { left: swimLeft(lane), opacity: caught ? 0.35 : 1 }
              : { opacity: caught && !isCaught ? 0.35 : 1 }
        }
        transition={
          isCaught
            ? { duration: 0.6, ease: EASE_OUT }
            : { left: { duration: 10 + lane * 1.8, times: SWIM_TIMES, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.3 } }
        }
      >
        <motion.span
          className="absolute inset-0 block"
          animate={isWrong ? { x: [0, -8, 8, -4, 4, 0] } : { y: [0, -5, 0] }}
          transition={isWrong ? { duration: 0.45 } : { duration: 2 + lane * 0.3, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Only the body turns around; the letter sits on top and always reads the right way. */}
          <motion.span
            className="absolute inset-0 block"
            aria-hidden
            animate={{ scaleX: swimming ? swimFlip(lane) : 1 }}
            transition={swimming ? { duration: 10 + lane * 1.8, times: SWIM_TIMES, repeat: Infinity, ease: "linear" } : { duration: 0.2 }}
          >
            <Image src={FISH_IMAGES[lane]} alt="" fill sizes="180px" draggable={false} className="object-contain" />
          </motion.span>
          {/* The belly patch sits in the middle of every fish image, so the letter stays centred whichever way the fish faces. */}
          <span className={`${styles.letter} pointer-events-none absolute inset-0 flex items-center justify-center font-extrabold leading-none`}>
            {letter}
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
            {activityName || "Alphabet Partners"}
          </h2>
          <div className="flex flex-1 justify-end">
            <div className={`${styles.pill} flex items-center gap-1.5 rounded-full px-3 py-1 text-lg font-extrabold sm:text-2xl`} aria-label={`${stars} stars`}>
              <Star aria-hidden="true" className="h-5 w-5 text-[#f2b134] sm:h-6 sm:w-6" fill="#f2b134" strokeWidth={2.2} />
              <span className="tabular-nums">{stars}</span>
            </div>
          </div>
        </div>

        {/* instruction with the replay button */}
        <div className={`${styles.promptRow} relative z-10 mt-2 flex shrink-0 justify-center`}>
          <div className={`${styles.promptPill} flex items-center gap-2 rounded-3xl py-1 pl-4 pr-1 sm:gap-3 sm:rounded-full sm:pl-6`}>
            <p className={`${styles.instruction} text-base font-bold leading-tight sm:text-2xl`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => round && speak(promptSpeech(round.id))}
              disabled={!round || locked}
              aria-label="Hear which letter to find"
              className={`${styles.roundButton} ${styles.speaker} flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${focusRing}`}
            >
              <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col py-2">
          <AnimatePresence mode="wait">
            {round ? (
              <motion.div
                key={`${round.id}-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`${styles.board} flex min-h-0 flex-1 flex-col items-center gap-[clamp(8px,2dvh,20px)]`}
              >
                {/* the big letter to find a partner for */}
                <div
                  role="img"
                  aria-label={`Big ${round.id.toUpperCase()}`}
                  className={`${styles.sign} flex aspect-square shrink-0 items-center justify-center rounded-3xl font-extrabold leading-none`}
                >
                  {round.id.toUpperCase()}
                </div>
                {/* the pond; one lane per fish */}
                <div className={`${styles.pond} relative min-h-0 w-full flex-1 overflow-visible rounded-[32px]`}>
                  {round.choices.map((c, lane) => fish(round, c, lane))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
                className="flex flex-1 items-center justify-center"
              >
                <div className={`${styles.doneCard} flex max-w-md flex-col items-center gap-4 rounded-3xl px-6 py-5 text-center`} role="status">
                  <p className={`${styles.doneTitle} text-2xl font-extrabold leading-tight sm:text-3xl`}>{DONE_TEXT}</p>
                  <div className={`${styles.doneScore} flex items-center gap-2 text-4xl font-extrabold tabular-nums sm:text-5xl`}>
                    <Star aria-hidden="true" className="h-9 w-9 text-[#f2b134] sm:h-11 sm:w-11" fill="#f2b134" strokeWidth={2.2} />
                    {stars} / {total}
                  </div>
                  <p className="text-xl font-bold sm:text-2xl">
                    You got {stars} of {total} correct!
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <RealisticEffect active={stage === "done"} />
      </div>
    </MotionConfig>
  );
}
