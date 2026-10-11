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
import { ASSETS, FLOWERS, PICTURES, INSTRUCTION, RIGHT, WRONG, DONE_TEXT, promptSpeech, soundSpeech, resultSpeech, type Vowel } from "./BeginningVowelMatch.data";
import styles from "./BeginningVowelMatch.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

interface Round {
  id: string;
  answer: Vowel;
}

interface QuestionRow {
  questionKey: string;
  correctAnswer: { answer: string };
}

type Stage = "playing" | "done";

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

export default function BeginningVowelMatch({ activityId, activityName, onFinish }: GameComponentProps) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(false);
  // Where the bee has landed, the flower picked by mistake, the flower in bloom, and whether it was shown after a miss.
  const [beeAt, setBeeAt] = useState<Vowel | null>(null);
  const [wrongPick, setWrongPick] = useState<Vowel | null>(null);
  const [bloom, setBloom] = useState<Vowel | null>(null);
  const [revealed, setRevealed] = useState(false);
  // The first flower tapped for each picture is the graded answer.
  const answers = useRef<Record<string, Vowel>>({});
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
            const answer = row.correctAnswer.answer as Vowel;
            if (!(row.questionKey in PICTURES) || !FLOWERS.some((f) => f.id === answer)) {
              throw new Error(`Question ${row.questionKey} needs a known picture and a vowel answer`);
            }
            return { id: row.questionKey, answer };
          }),
        );
      } catch (err) {
        console.error("Failed to load Beginning Vowel Match questions:", err);
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

  // Says each picture's name as its round appears; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!round) return;
    const prompt = promptSpeech(round.id);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["beginning vowel match"], prompt]);
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

  // The bee lands on the right flower, it blooms, and the sound is said; only a right first pick earns a star.
  const blossom = (r: Round, earned: boolean, lead: string) => {
    playTones([523, 659, 784], "sine");
    setBeeAt(r.answer);
    setBloom(r.answer);
    if (earned) setStars((s) => Math.min(s + 1, total));
    const isLast = index === total - 1;
    const vowel = FLOWERS.find((f) => f.id === r.answer)!;
    speak(`${lead} ${soundSpeech(r.id, vowel)}`.trim(), () => {
      setBeeAt(null);
      setBloom(null);
      setWrongPick(null);
      setRevealed(false);
      lock(false);
      if (!isLast) return setIndex((i) => i + 1);
      // Stars are the right first picks, so the final count is the score; it is sent once the result line has been spoken.
      setStage("done");
      speak(resultSpeech(stars + (earned ? 1 : 0), total), handleFinish);
    });
  };

  // One try per picture: the bee lands on a wrong flower, it droops with an X, then the bee moves to the right one with no star.
  const pick = (vowel: Vowel) => {
    if (!round || lockedRef.current) return;
    lock(true);
    answers.current[round.id] ??= vowel;
    if (vowel === round.answer) return blossom(round, true, RIGHT);

    playTones([330, 247], "triangle");
    setBeeAt(vowel);
    setWrongPick(vowel);
    const r = round;
    speak(WRONG, () => {
      setRevealed(true);
      blossom(r, false, "");
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

  // The bee is one shared element, so it flies from the picture to whichever flower it lands on.
  const bee = (
    <motion.span layoutId="bee" className={`${styles.bee} pointer-events-none block`} transition={{ duration: 0.7, ease: EASE_OUT }} aria-hidden>
      <Image src={ASSETS.bee} alt="" width={602} height={654} draggable={false} className="h-auto w-full" />
    </motion.span>
  );

  const flower = (r: Round, f: (typeof FLOWERS)[number]) => {
    const isWrong = wrongPick === f.id;
    const isBloom = bloom === f.id;
    const isAnswer = revealed && f.id === r.answer;
    return (
      <motion.button
        key={f.id}
        type="button"
        onClick={() => pick(f.id)}
        disabled={locked}
        aria-label={`Flower ${f.label}`}
        animate={{ scale: isAnswer ? 1.12 : 1 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        style={{ transformOrigin: "50% 100%" }}
        className={`${styles.flower} ${isAnswer ? styles.showAnswer : ""} relative flex shrink-0 flex-col items-center rounded-2xl disabled:cursor-default ${focusRing}`}
      >
        <span className="pointer-events-none absolute -top-[30%] left-1/2 z-20 -translate-x-1/2">{beeAt === f.id && bee}</span>
        <motion.span
          className="relative block aspect-square w-full"
          animate={isWrong ? { rotate: 22, y: "8%", opacity: 0.65 } : isBloom ? { scale: [1, 1.22, 1.12], rotate: 0 } : { scale: 1, rotate: 0, y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
          style={{ transformOrigin: "50% 100%" }}
        >
          <Image src={f.image} alt="" fill sizes="170px" draggable={false} className="object-contain" />
          {/* The yellow centre of every flower image sits just below the middle, so the letter does too. */}
          <span
            className={`${styles.center} ${isBloom ? styles.lit : ""} absolute left-1/2 top-[51.5%] flex h-[42%] w-[42%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-extrabold leading-none`}
          >
            {f.label}
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
            {activityName || "Beginning Vowel Match"}
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
              aria-label="Hear the picture's name again"
              className={`${styles.roundButton} ${styles.speaker} flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${focusRing}`}
            >
              <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center py-2">
          {round ? (
            <div className={`${styles.board} flex w-full flex-col items-center justify-around gap-[clamp(10px,2.5dvh,28px)]`}>
              {/* the picture the bee carries; the bee waits here until a flower is tapped */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${round.id}-${index}`}
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                  className="relative flex shrink-0 flex-col items-center"
                >
                  <span className="absolute -right-[14%] -top-[10%] z-10">{beeAt === null && bee}</span>
                  <div className={`${styles.card} flex aspect-square flex-col items-center justify-center gap-[3%] rounded-3xl`}>
                    <span className="pointer-events-none relative h-[66%] w-[78%]">
                      <Image src={PICTURES[round.id].image} alt={PICTURES[round.id].name} fill preload sizes="230px" className="object-contain" draggable={false} />
                    </span>
                    <span className="text-[clamp(16px,4dvh,32px)] font-extrabold leading-none">{PICTURES[round.id].name}</span>
                  </div>
                </motion.div>
              </AnimatePresence>
              {/* the garden: one flower per vowel */}
              <div className="flex items-end justify-center gap-[clamp(4px,1.2vw,20px)]">{FLOWERS.map((f) => flower(round, f))}</div>
            </div>
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
