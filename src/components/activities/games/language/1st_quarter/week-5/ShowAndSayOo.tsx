"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, MotionConfig } from "framer-motion";
import { Star, Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import RealisticEffect from "@/components/effects/RealisticEffect";
import { LETTER, SIGN_COLORS, INSTRUCTION, WRONG, DONE_TEXT, promptSpeech, rightSpeech, revealSpeech, resultSpeech } from "./ShowAndSayOo.data";
import styles from "./ShowAndSayOo.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// How long the game waits after "Say it with me" so the child can say the letter aloud.
const SAY_PAUSE_MS = 1300;

interface Round {
  id: string;
  target: string;
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Stage = "playing" | "done";

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

export default function ShowAndSayOo({ activityId, activityName, onFinish }: GameComponentProps) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(false);
  // The owl hooting with joy, the owl tapped by mistake, and whether the right owl is being shown after a miss.
  const [hooting, setHooting] = useState<number | null>(null);
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  // The first owl tapped in each round is the graded answer.
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
            const data = (row.questionData ?? {}) as { target?: unknown; choices?: unknown };
            const choices = Array.isArray(data.choices) ? data.choices : [];
            const target = row.correctAnswer.answer;
            const isLetter = (c: unknown) => typeof c === "string" && c.length === 1;
            if (data.target !== target || choices.length < 2 || choices.length > SIGN_COLORS.length || !choices.every(isLetter) || !choices.includes(target)) {
              throw new Error(`Question ${row.questionKey} needs 2-${SIGN_COLORS.length} single-letter owls that include its letter`);
            }
            return { id: row.questionKey, target, choices };
          }),
        );
      } catch (err) {
        console.error("Failed to load Show and Say Oo questions:", err);
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

  // Says which letter to find as each branch of owls appears; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!round) return;
    const prompt = promptSpeech(round.target);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["show and say oo"], prompt]);
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

  // Pending "say it" pause, cleared on unmount so a late timer never moves a finished game on.
  const pauseRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (pauseRef.current) window.clearTimeout(pauseRef.current);
  }, []);

  // The right owl hops and flaps while the letter is named; after a moment for the child to say it, the next branch comes; only a right first pick earns a star.
  const hoot = (r: Round, earned: boolean) => {
    playTones([523, 659, 784], "sine");
    setHooting(r.choices.indexOf(r.target));
    if (earned) setStars((s) => Math.min(s + 1, total));
    const isLast = index === total - 1;
    speak(earned ? rightSpeech(r.target) : revealSpeech(r.target), () => {
      pauseRef.current = window.setTimeout(() => {
        setHooting(null);
        setWrongPick(null);
        setRevealed(false);
        lock(false);
        if (!isLast) return setIndex((i) => i + 1);
        // Stars are the right first picks, so the final count is the score; it is sent once the result line has been spoken.
        setStage("done");
        speak(resultSpeech(stars + (earned ? 1 : 0), total), handleFinish);
      }, SAY_PAUSE_MS);
    });
  };

  // One try per branch: a wrong owl turns away with an X, then the right owl glows, grows and flaps with no star.
  const pick = (i: number) => {
    if (!round || lockedRef.current) return;
    lock(true);
    const choice = round.choices[i];
    answers.current[round.id] ??= choice;
    if (choice === round.target) return hoot(round, true);

    playTones([330, 247], "triangle");
    setWrongPick(i);
    const r = round;
    speak(WRONG, () => {
      setRevealed(true);
      hoot(r, false);
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

  const owl = (r: Round, letter: string, i: number) => {
    const isWrong = wrongPick === i;
    const isHooting = hooting === i;
    const isAnswer = revealed && letter === r.target;
    return (
      <motion.button
        key={`${r.id}-${i}`}
        type="button"
        onClick={() => pick(i)}
        disabled={locked}
        aria-label={`Owl with ${letter === letter.toUpperCase() ? "big" : "small"} ${letter}`}
        initial={{ opacity: 0, y: -20 }}
        animate={isWrong ? { opacity: 0.6, y: 0 } : { opacity: 1, y: 0, scale: isAnswer ? 1.12 : 1 }}
        transition={{ duration: 0.45, ease: EASE_OUT, delay: wrongPick === null && hooting === null ? i * 0.08 : 0 }}
        style={{ transformOrigin: "50% 100%", "--sign-color": SIGN_COLORS[i] } as React.CSSProperties}
        className={`${styles.owlSlot} ${isAnswer ? styles.showAnswer : ""} relative flex shrink-0 flex-col items-center rounded-3xl disabled:cursor-default ${focusRing}`}
      >
        {/* the owl: hops and flaps when it is the right one, turns away when it is not */}
        <motion.span
          aria-hidden
          className={`${styles.owl} block leading-none`}
          animate={
            isHooting
              ? { y: [0, -18, 0, -10, 0], rotate: [0, -12, 12, -6, 0], scaleX: 1 }
              : isWrong
                ? { scaleX: -1, rotate: 0, y: 0 }
                : { y: 0, rotate: 0, scaleX: 1 }
          }
          transition={{ duration: isHooting ? 0.9 : 0.35, ease: EASE_OUT }}
        >
          🦉
        </motion.span>
        <span className={`${styles.sign} relative -mt-[8%] flex aspect-square items-center justify-center rounded-2xl font-extrabold leading-none`}>
          {letter}
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
        </span>
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
            {activityName || "Show and Say Oo"}
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
              onClick={() => round && speak(promptSpeech(round.target))}
              disabled={!round || locked}
              aria-label="Hear the letter again"
              className={`${styles.roundButton} ${styles.speaker} flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12 ${focusRing}`}
            >
              <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className={`${styles.board} relative flex min-h-0 flex-1 flex-col items-center justify-around gap-[clamp(10px,2.5dvh,28px)] py-2`}>
          {/* today's letter, so the child sees big O and small o together */}
          <div className={`${styles.letterCard} flex shrink-0 items-baseline gap-[0.15em] rounded-3xl px-5 py-1 font-extrabold leading-none`} aria-label={`Today's letter: big ${LETTER.upper} and small ${LETTER.lower}`}>
            <span>{LETTER.upper}</span>
            <span>{LETTER.lower}</span>
          </div>
          {round ? (
            <div className={`${styles.tree} flex flex-col items-center`}>
              <div className="relative z-10 flex items-end justify-center gap-[clamp(6px,2vw,28px)] px-[clamp(8px,2vw,24px)]">{round.choices.map((c, i) => owl(round, c, i))}</div>
              <span className={`${styles.branch} -mt-[calc(var(--owl-w)*0.5)] block w-full rounded-full`} />
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
