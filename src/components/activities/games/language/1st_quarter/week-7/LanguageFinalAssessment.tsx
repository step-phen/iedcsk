"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Star, Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import RealisticEffect from "@/components/effects/RealisticEffect";
import { TaskFace, toRounds, type Round } from "./LanguageReview";
import { RIGHT, WRONG, REVEAL, choiceName, questionText, questionSpeech } from "./LanguageReview.data";
import { PUZZLE_COLUMNS, PIECE_COLORS, PRIZE_TEXT, DONE_TEXT, resultSpeech } from "./LanguageFinalAssessment.data";
import styles from "./LanguageFinalAssessment.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// How long the answered task stays before the next one.
const NEXT_PAUSE_MS = 800;

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Stage = "playing" | "done";

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

export default function LanguageFinalAssessment({ activityId, activityName, onFinish }: GameComponentProps) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  // Whether each answered task was right on the first tap; the puzzle pieces show it.
  const [results, setResults] = useState<boolean[]>([]);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(false);
  // The card being named, the card tapped by mistake, whether the right one is glowing after a miss, and whether the task is answered.
  const [naming, setNaming] = useState<number | null>(null);
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  // The first card tapped for each task is the graded answer.
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
        setRounds(toRounds(rows));
      } catch (err) {
        console.error("Failed to load Language Final Assessment questions:", err);
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

  // Names each card in turn, lighting it up, so the child knows every choice before answering; a tap cuts it short.
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

  // Reads each task, then its cards, as it comes up; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!round) return;
    const prompt = questionSpeech(round);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["language final assessment"], prompt], () => nameChoices(round));
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

  // Pending pause after a task, cleared on unmount so a late timer never moves a finished game on.
  const pauseRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (pauseRef.current) window.clearTimeout(pauseRef.current);
  }, []);

  // The task is answered: its puzzle piece lifts away (or only fades after a miss), then the next task comes, or the result is spoken and sent.
  const finishTask = (earned: boolean) => {
    setSolved(true);
    setResults((r) => [...r, earned]);
    const isLast = index === total - 1;
    pauseRef.current = window.setTimeout(() => {
      setNaming(null);
      setWrongPick(null);
      setRevealed(false);
      setSolved(false);
      lock(false);
      if (!isLast) return setIndex((i) => i + 1);
      // Stars are the right first picks, so the final count is the score.
      setStage("done");
      playTones([392, 523, 659, 784, 1047], "sine");
      speak(resultSpeech(stars + (earned ? 1 : 0), total), handleFinish);
    }, NEXT_PAUSE_MS);
  };

  // One try per task: the right card turns green and lifts a puzzle piece with a star; a wrong one shakes with an X, then the right one glows and grows, with no star.
  const pick = (i: number) => {
    if (!round || lockedRef.current) return;
    lock(true);
    setNaming(null);
    const choice = round.choices[i];
    answers.current[round.id] ??= choice;
    if (choice === round.answer) {
      playTones([523, 659, 784], "sine");
      setSolved(true);
      return speak(RIGHT, () => finishTask(true));
    }

    playTones([330, 247], "triangle");
    setWrongPick(i);
    speak(WRONG, () => {
      setRevealed(true);
      speak(REVEAL, () => finishTask(false));
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

  const card = (r: Round, choice: string, i: number) => {
    const isWrong = wrongPick === i;
    const isRight = wrongPick === null && solved && choice === r.answer;
    const isAnswer = revealed && choice === r.answer;
    const name = choiceName(r.type, choice);
    return (
      <motion.button
        key={`${r.id}-${i}`}
        type="button"
        onClick={() => pick(i)}
        disabled={locked}
        aria-label={name ?? `Letter ${choice}`}
        initial={{ opacity: 0, rotate: -6, scale: 0.85 }}
        animate={
          isWrong
            ? { opacity: 0.55, rotate: 0, scale: 1, x: [0, -8, 8, -4, 4, 0] }
            : { opacity: 1, rotate: 0, scale: isAnswer ? 1.15 : naming === i || isRight ? 1.06 : 1 }
        }
        transition={{ duration: 0.45, ease: EASE_OUT, delay: wrongPick === null && !solved && !revealed ? i * 0.08 : 0 }}
        style={{ borderColor: isAnswer || isRight ? undefined : PIECE_COLORS[i % PIECE_COLORS.length] }}
        className={`${styles.card} ${isAnswer ? styles.showAnswer : isRight ? styles.right : naming === i ? styles.naming : ""} relative flex aspect-square shrink-0 items-center justify-center rounded-3xl disabled:cursor-default ${focusRing}`}
      >
        <TaskFace type={r.type} value={choice} asTarget={false} solved={solved} letterClass={styles.letter} labelClass={styles.label} />
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
            {activityName || "Language Final Assessment"}
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

        <div className={`${styles.stage} relative flex min-h-0 flex-1 items-center justify-center gap-[clamp(12px,3vw,40px)] py-2`}>
          {/* the prize puzzle: one piece per task lifts away when it is answered right, and only fades after a miss */}
          <div className={`${styles.board} relative shrink-0 overflow-hidden rounded-2xl`} aria-label={`${results.length} of ${total} puzzle pieces done`}>
            <motion.div
              aria-hidden
              className={`${styles.prize} absolute inset-0 flex flex-col items-center justify-center`}
              animate={stage === "done" ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={{ duration: 0.8, ease: EASE_OUT, repeat: stage === "done" ? 2 : 0 }}
            >
              <span className={`${styles.trophy} leading-none`}>🏆</span>
              <span className={`${styles.prizeText} font-extrabold leading-none`}>{PRIZE_TEXT}</span>
            </motion.div>
            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${PUZZLE_COLUMNS}, 1fr)` }}>
              {Array.from({ length: total }, (_, i) => {
                const done = i < results.length;
                return (
                  <motion.span
                    key={i}
                    aria-hidden
                    className={`${styles.piece} ${!done && i === index && round ? styles.pieceNow : ""} flex items-center justify-center font-extrabold`}
                    style={{ background: done && !results[i] ? "#9aa3c4" : PIECE_COLORS[(i + Math.floor(i / PUZZLE_COLUMNS)) % PIECE_COLORS.length] }}
                    animate={done ? (results[i] ? { opacity: 0, rotateY: 90, scale: 0.6 } : { opacity: 0.45 }) : { opacity: 1, rotateY: 0, scale: 1 }}
                    transition={{ duration: 0.55, ease: EASE_OUT }}
                  >
                    {!done && i + 1}
                  </motion.span>
                );
              })}
            </div>
          </div>

          {round ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={round.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className={`${styles.task} flex flex-col items-center justify-center gap-[clamp(10px,2.5dvh,28px)]`}
              >
                {/* the card the task is about: the picture to match or pair, the object with a missing part, or the direction; letter and arrow-you-hear tasks have none */}
                {round.target && round.type !== "letter" && round.type !== "point" && (
                  <div className={`${styles.target} flex aspect-square shrink-0 items-center justify-center overflow-hidden rounded-3xl`}>
                    <TaskFace type={round.type} value={round.target} asTarget solved={solved} letterClass={styles.letter} labelClass={styles.label} />
                  </div>
                )}
                <div className="flex items-center justify-center gap-[clamp(8px,2vw,24px)]">{round.choices.map((c, i) => card(round, c, i))}</div>
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
