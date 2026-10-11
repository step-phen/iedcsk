"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, MotionConfig } from "framer-motion";
import { Star, Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import RealisticEffect from "@/components/effects/RealisticEffect";
import { LETTER, BOTH_FOUND, INSTRUCTION, PROMPT, WRONG, REVEAL, DONE_TEXT, foundSpeech, resultSpeech } from "./ShowAndSayIi.data";
import styles from "./ShowAndSayIi.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// How long the game waits after "Say it with me" so the child can say the letter aloud.
const SAY_PAUSE_MS = 1300;

interface Round {
  id: string;
  choices: string[];
}

const isTarget = (letter: string) => letter === LETTER.upper || letter === LETTER.lower;

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Stage = "playing" | "done";

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

export default function ShowAndSayIi({ activityId, activityName, onFinish }: GameComponentProps) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(false);
  // The igloos found so far this round, the igloo tapped by mistake, and whether the still-dark ones are being shown after a miss.
  const [found, setFound] = useState<number[]>([]);
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  // One answer per round: both letters with no miss, or the first wrong igloo.
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
            const data = (row.questionData ?? {}) as { choices?: unknown };
            const choices = Array.isArray(data.choices) ? data.choices : [];
            const isLetter = (c: unknown): c is string => typeof c === "string" && c.length === 1;
            if (row.correctAnswer.answer !== BOTH_FOUND || !choices.every(isLetter) || choices.filter(isTarget).length !== 2 || !choices.includes(LETTER.upper) || !choices.includes(LETTER.lower)) {
              throw new Error(`Question ${row.questionKey} needs single-letter igloos with exactly one ${LETTER.upper} and one ${LETTER.lower}`);
            }
            return { id: row.questionKey, choices };
          }),
        );
      } catch (err) {
        console.error("Failed to load Show and Say Ii questions:", err);
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

  // Asks for both letters as each village appears; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["show and say ii"], PROMPT]);
      return;
    }
    speak(PROMPT);
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

  // Pending "say it" pause, cleared on unmount so a late timer never moves a finished game on.
  const pauseRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (pauseRef.current) window.clearTimeout(pauseRef.current);
  }, []);

  // After a moment for the child to say the letter, the next village comes, or the result is spoken and sent.
  const next = (earned: boolean) => {
    const isLast = index === total - 1;
    pauseRef.current = window.setTimeout(() => {
      setFound([]);
      setWrongPick(null);
      setRevealed(false);
      lock(false);
      if (!isLast) return setIndex((i) => i + 1);
      // Stars are the rounds won with no miss, so the final count is the score.
      setStage("done");
      speak(resultSpeech(stars + (earned ? 1 : 0), total), handleFinish);
    }, SAY_PAUSE_MS);
  };

  // Both letters must be found with no miss: each find lights its igloo and a penguin peeks out; a wrong igloo gets an X, then the dark ones glow and light up with no star.
  const pick = (i: number) => {
    if (!round || lockedRef.current || found.includes(i)) return;
    const letter = round.choices[i];
    if (isTarget(letter)) {
      playTones([523, 659, 784], "sine");
      const nowFound = [...found, i];
      setFound(nowFound);
      if (nowFound.length < 2) return speak(foundSpeech(letter, false));
      lock(true);
      answers.current[round.id] ??= BOTH_FOUND;
      setStars((s) => Math.min(s + 1, total));
      return speak(foundSpeech(letter, true), () => next(true));
    }

    lock(true);
    answers.current[round.id] ??= letter;
    playTones([330, 247], "triangle");
    setWrongPick(i);
    speak(WRONG, () => {
      setRevealed(true);
      playTones([523, 659, 784], "sine");
      speak(REVEAL, () => next(false));
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

  const igloo = (r: Round, letter: string, i: number) => {
    const isWrong = wrongPick === i;
    const isShown = revealed && isTarget(letter) && !found.includes(i);
    const isLit = found.includes(i) || isShown;
    return (
      <motion.button
        key={`${r.id}-${i}`}
        type="button"
        onClick={() => pick(i)}
        disabled={locked}
        aria-label={`Igloo with ${letter === letter.toUpperCase() ? "big" : "small"} ${letter}`}
        initial={{ opacity: 0, y: 16 }}
        animate={isWrong ? { opacity: 0.6, y: 0, x: [0, -8, 8, -4, 4, 0] } : { opacity: 1, y: 0, scale: isShown ? 1.12 : 1 }}
        transition={{ duration: 0.45, ease: EASE_OUT, delay: wrongPick === null && found.length === 0 ? i * 0.06 : 0 }}
        style={{ transformOrigin: "50% 100%" }}
        className={`${styles.igloo} ${isShown ? styles.showAnswer : ""} relative shrink-0 rounded-t-[50%] disabled:cursor-default ${focusRing}`}
      >
        <span className={`${styles.dome} ${isLit ? styles.lit : ""} pointer-events-none absolute inset-0`} />
        <span className={`${styles.letter} pointer-events-none absolute inset-x-0 top-[14%] flex h-[38%] items-center justify-center font-extrabold leading-none`}>{letter}</span>
        {/* the door: dark until the igloo is found, then warm light and a penguin peeking out */}
        <span className={`${styles.door} ${isLit ? styles.doorLit : ""} pointer-events-none absolute bottom-0 left-1/2 h-[44%] w-[36%] -translate-x-1/2 overflow-hidden`}>
          <motion.span
            aria-hidden
            className={`${styles.penguin} absolute inset-x-0 bottom-0 flex justify-center leading-none`}
            initial={false}
            animate={isLit ? { y: "0%", opacity: 1 } : { y: "100%", opacity: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT, delay: isLit ? 0.15 : 0 }}
          >
            🐧
          </motion.span>
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
            {activityName || "Show and Say Ii"}
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
              onClick={() => round && speak(PROMPT)}
              disabled={!round || locked}
              aria-label="Hear the letters again"
              className={`${styles.roundButton} ${styles.speaker} flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${focusRing}`}
            >
              <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className={`${styles.board} relative flex min-h-0 flex-1 flex-col items-center justify-around gap-[clamp(10px,2.5dvh,28px)] py-2`}>
          {/* today's letter, so the child sees big I and small i together */}
          <div className={`${styles.letterCard} flex shrink-0 items-baseline gap-[0.15em] rounded-3xl px-5 py-1 font-extrabold leading-none`} aria-label={`Today's letter: big ${LETTER.upper} and small ${LETTER.lower}`}>
            <span>{LETTER.upper}</span>
            <span>{LETTER.lower}</span>
          </div>
          {round ? (
            <div className={`${styles.village} flex flex-wrap items-end justify-center gap-x-[clamp(6px,1.6vw,24px)] gap-y-[clamp(10px,2.5dvh,24px)]`}>{round.choices.map((c, i) => igloo(round, c, i))}</div>
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
