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
import { ObjectPicture } from "../week-2/MissingPartsOfObjects";
import { OBJECTS } from "../week-2/MissingPartsOfObjects.data";
import { TOYS, INSTRUCTION, WRONG, DONE_TEXT, isToy, promptSpeech, rightSpeech, revealSpeech, resultSpeech } from "./FindTheDifferentOne.data";
import styles from "./FindTheDifferentOne.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// How long the tagged toy stays on screen before the next shelf.
const TAG_PAUSE_MS = 900;

interface Round {
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

/** A toy as it sits in its cubby: a Week 2 drawing, or a picture sized and maybe mirrored to show how it differs. */
function ToyFace({ id }: { id: string }) {
  const toy = TOYS[id];
  if (toy.drawing) {
    return (
      <span className="pointer-events-none relative block h-[80%] w-[80%]">
        <ObjectPicture type={toy.drawing.object} fill={OBJECTS[toy.drawing.object].fill} showPart={toy.drawing.whole} />
      </span>
    );
  }
  const size = `${82 * (toy.size ?? 1)}%`;
  return (
    <span className="pointer-events-none relative block" style={{ width: size, height: size, transform: toy.flip ? "scaleX(-1)" : undefined }}>
      <Image src={toy.image!} alt="" fill sizes="240px" className="object-contain object-bottom" draggable={false} />
    </span>
  );
}

export default function FindTheDifferentOne({ activityId, activityName, onFinish }: GameComponentProps) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(false);
  // The toy tapped by mistake, whether the different toy is glowing after a miss, and whether it wears its tag.
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [tagged, setTagged] = useState(false);
  // The first toy tapped on each shelf is the graded answer.
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
            const choices = (row.questionData as { choices?: unknown } | null)?.choices;
            const answer = row.correctAnswer.answer;
            if (!Array.isArray(choices) || choices.length < 3 || !choices.every(isToy) || choices.filter((c) => c === answer).length !== 1) {
              throw new Error(`Question ${row.questionKey} needs known toys with its answer on the shelf exactly once`);
            }
            return { id: row.questionKey, choices, answer };
          }),
        );
      } catch (err) {
        console.error("Failed to load Find the Different One questions:", err);
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

  // Reads each shelf as it comes up; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!round) return;
    const prompt = promptSpeech(round.answer);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["find the different one"], prompt]);
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

  // Pending pause after a tag, cleared on unmount so a late timer never moves a finished game on.
  const pauseRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (pauseRef.current) window.clearTimeout(pauseRef.current);
  }, []);

  // After a short look at the tagged toy, the next shelf comes, or the result is spoken and sent.
  const advanceLater = (earned: boolean) => {
    const isLast = index === total - 1;
    pauseRef.current = window.setTimeout(() => {
      setWrongPick(null);
      setRevealed(false);
      setTagged(false);
      lock(false);
      if (!isLast) return setIndex((i) => i + 1);
      // Stars are the right first picks, so the final count is the score.
      setStage("done");
      speak(resultSpeech(stars + (earned ? 1 : 0), total), handleFinish);
    }, TAG_PAUSE_MS);
  };

  // One try per shelf: the different toy hops and gets its tag with a star; a wrong one shakes with an X, then the different one glows and grows before its tag, with no star.
  const pick = (i: number) => {
    if (!round || lockedRef.current) return;
    lock(true);
    const choice = round.choices[i];
    answers.current[round.id] ??= choice;
    if (choice === round.answer) {
      setStars((s) => Math.min(s + 1, total));
      playTones([523, 659, 784], "sine");
      setTagged(true);
      return speak(rightSpeech(round.answer), () => advanceLater(true));
    }

    playTones([330, 247], "triangle");
    setWrongPick(i);
    const r = round;
    speak(WRONG, () => {
      setRevealed(true);
      speak(revealSpeech(r.answer), () => {
        setTagged(true);
        playTones([523, 659], "sine");
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

  const cubby = (r: Round, choice: string, i: number) => {
    const isOdd = choice === r.answer;
    const isWrong = wrongPick === i;
    const isAnswer = revealed && isOdd;
    return (
      <motion.button
        key={`${r.id}-${i}`}
        type="button"
        onClick={() => pick(i)}
        disabled={locked}
        aria-label={TOYS[choice].name}
        initial={{ opacity: 0, y: -18 }}
        animate={
          isWrong
            ? { opacity: 1, y: 0, scale: 1, x: [0, -8, 8, -4, 4, 0] }
            : { opacity: tagged && !isOdd ? 0.5 : 1, y: 0, scale: isAnswer ? 1.12 : 1 }
        }
        transition={{ duration: 0.45, ease: EASE_OUT, delay: wrongPick === null && !tagged && !revealed ? i * 0.08 : 0 }}
        className={`${styles.cubby} ${isAnswer ? styles.showAnswer : ""} relative flex aspect-square items-end justify-center overflow-visible rounded-xl pb-[9%] disabled:cursor-default ${focusRing}`}
      >
        {/* the different toy hops when it is found */}
        <motion.span
          className="flex h-full w-full items-end justify-center"
          animate={tagged && isOdd ? { y: [0, -16, 0, -8, 0] } : { y: 0 }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
        >
          <ToyFace id={choice} />
        </motion.span>
        <AnimatePresence>
          {tagged && isOdd && (
            <motion.span
              aria-hidden
              className={`${styles.tag} pointer-events-none absolute -top-[6%] left-1/2 flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-0.5 font-extrabold leading-none`}
              style={{ x: "-50%", transformOrigin: "50% 0%" }}
              initial={{ opacity: 0, rotate: -40, y: -10 }}
              animate={{ opacity: 1, rotate: [-40, 14, -8, 4, 0], y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: EASE_OUT }}
            >
              {wrongPick === null && "⭐"} Different!
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
            {activityName || "Find the Different One"}
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
            <p className={`${styles.instruction} text-base font-bold leading-tight sm:text-2xl`}>{round ? INSTRUCTION : DONE_TEXT}</p>
            <button
              type="button"
              onClick={() => round && speak(promptSpeech(round.answer))}
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
              {/* the toy shelf: each new shelf slides in from the side */}
              <motion.div
                key={round.id}
                initial={{ opacity: 0, x: 80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -80 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
                className={`${styles.shelf} grid rounded-2xl`}
              >
                {round.choices.map((c, i) => cubby(round, c, i))}
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
