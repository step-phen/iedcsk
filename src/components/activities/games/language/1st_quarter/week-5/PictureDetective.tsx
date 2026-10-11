"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Star, Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import RealisticEffect from "@/components/effects/RealisticEffect";
import { ObjectPicture, PartIcon } from "../week-2/MissingPartsOfObjects";
import { OBJECTS, PARTS, type ObjectKey, type PartKey } from "../week-2/MissingPartsOfObjects.data";
import { MISSING_SPOT, INSTRUCTION, WRONG, DONE_TEXT, partName, promptSpeech, rightSpeech, revealSpeech, resultSpeech } from "./PictureDetective.data";
import styles from "./PictureDetective.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// How long the solved case stays on screen before the next one.
const SOLVED_PAUSE_MS = 900;

interface Round {
  id: ObjectKey;
  choices: PartKey[];
  answer: PartKey;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Stage = "playing" | "done";

const focusRing = "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2";

export default function PictureDetective({ activityId, activityName, onFinish }: GameComponentProps) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [index, setIndex] = useState(0);
  const [stars, setStars] = useState(0);
  const [stage, setStage] = useState<Stage>("playing");
  const [locked, setLocked] = useState(false);
  // The clue being named, the clue picked by mistake, whether the right clue is glowing after a miss, and whether the case is solved.
  const [naming, setNaming] = useState<number | null>(null);
  const [wrongPick, setWrongPick] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  // The first clue tapped for each case is the graded answer.
  const answers = useRef<Record<string, PartKey>>({});
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
            const answer = row.correctAnswer.answer as PartKey;
            const isPart = (c: unknown): c is PartKey => typeof c === "string" && c in PARTS;
            if (!(row.questionKey in OBJECTS) || !Array.isArray(choices) || choices.length < 2 || !choices.every(isPart) || !choices.includes(answer)) {
              throw new Error(`Question ${row.questionKey} needs a known object and part clues that include its missing part`);
            }
            return { id: row.questionKey as ObjectKey, choices, answer };
          }),
        );
      } catch (err) {
        console.error("Failed to load Picture Detective questions:", err);
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

  // Names each clue in turn, lighting it up, so the child knows every part before answering; a tap cuts it short.
  const nameClues = useCallback(
    (r: Round) => {
      const say = (i: number) => {
        if (i >= r.choices.length) return setNaming(null);
        setNaming(i);
        speak(partName(r.choices[i]), () => say(i + 1));
      };
      say(0);
    },
    [speak],
  );

  // Opens each case, then names its clues; the very first one comes after the greeting and intro.
  const introDone = useRef(false);
  useEffect(() => {
    if (!round) return;
    const prompt = promptSpeech(round.id);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["picture detective"], prompt], () => nameClues(round));
      return;
    }
    speak(prompt, () => nameClues(round));
  }, [round, speak, speakAll, nameClues]);

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

  // Pending pause after a solved case, cleared on unmount so a late timer never moves a finished game on.
  const pauseRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (pauseRef.current) window.clearTimeout(pauseRef.current);
  }, []);

  // The part fills in and the case is stamped solved; after a short look, the next case opens, or the result is spoken and sent.
  const solve = (r: Round, earned: boolean, line: string) => {
    playTones([523, 659, 784], "sine");
    setSolved(true);
    const isLast = index === total - 1;
    speak(line, () => {
      pauseRef.current = window.setTimeout(() => {
        setNaming(null);
        setWrongPick(null);
        setRevealed(false);
        setSolved(false);
        lock(false);
        if (!isLast) return setIndex((i) => i + 1);
        // Stars are the right first picks, so the final count is the score.
        setStage("done");
        speak(resultSpeech(stars + (earned ? 1 : 0), total), handleFinish);
      }, SOLVED_PAUSE_MS);
    });
  };

  // One try per case: the right clue solves it; a wrong clue gets an X, then the right clue glows and grows before the case is solved with no star.
  const pick = (i: number) => {
    if (!round || lockedRef.current) return;
    lock(true);
    setNaming(null);
    const choice = round.choices[i];
    answers.current[round.id] ??= choice;
    if (choice === round.answer) {
      setStars((s) => Math.min(s + 1, total));
      return solve(round, true, rightSpeech(round.id, round.answer));
    }

    playTones([330, 247], "triangle");
    setWrongPick(i);
    const r = round;
    speak(WRONG, () => {
      setRevealed(true);
      solve(r, false, revealSpeech(r.id, r.answer));
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

  const clueCard = (r: Round, part: PartKey, i: number) => {
    const isWrong = wrongPick === i;
    const isAnswer = revealed && part === r.answer;
    return (
      <motion.button
        key={`${r.id}-${i}`}
        type="button"
        onClick={() => pick(i)}
        disabled={locked}
        aria-label={partName(part)}
        initial={{ opacity: 0, y: 16, rotate: i % 2 ? 3 : -3 }}
        animate={
          isWrong
            ? { opacity: 0.6, y: 0, rotate: 0, x: [0, -8, 8, -4, 4, 0] }
            : { opacity: 1, y: 0, rotate: 0, scale: isAnswer ? 1.12 : naming === i ? 1.08 : 1 }
        }
        transition={{ duration: 0.45, ease: EASE_OUT, delay: wrongPick === null && !revealed ? i * 0.07 : 0 }}
        className={`${styles.clue} ${isAnswer ? styles.showAnswer : naming === i ? styles.naming : ""} relative flex aspect-[1/1.15] shrink-0 flex-col items-center justify-center gap-[4%] rounded-2xl disabled:cursor-default ${focusRing}`}
      >
        <span className={`${styles.clip} pointer-events-none absolute -top-[9%] left-[16%] block`} aria-hidden />
        <span className="pointer-events-none relative block size-[58%]">
          <PartIcon type={part} fill={PARTS[part].fill} />
        </span>
        <span className={`${styles.clueName} font-extrabold leading-none`}>{partName(part)}</span>
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
            {activityName || "Picture Detective"}
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
              onClick={() => round && speak(promptSpeech(round.id), () => nameClues(round))}
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
                className={`${styles.desk} flex flex-col items-center justify-center gap-[clamp(14px,3dvh,40px)]`}
              >
                {/* the case file: the picture with its missing part, a magnifier over the gap, and a stamp once solved */}
                <div className={`${styles.caseFile} relative shrink-0 rounded-b-2xl rounded-tr-2xl p-[6%] pt-[4%]`}>
                  <span className={`${styles.tab} absolute -top-[11%] left-[6%] rounded-t-xl px-[8%] py-[2%] font-extrabold leading-none`}>CASE #{index + 1}</span>
                  <div className={`${styles.photo} relative aspect-square w-full rounded-xl p-[6%]`}>
                    <span className="relative block h-full w-full">
                      <ObjectPicture type={round.id} fill={OBJECTS[round.id].fill} showPart={solved} />
                      {!solved && (
                        <motion.span
                          aria-hidden
                          className={`${styles.magnifier} pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 leading-none`}
                          style={{ left: `${MISSING_SPOT[round.id].x}%`, top: `${MISSING_SPOT[round.id].y}%` }}
                          animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 0] }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        >
                          🔍
                        </motion.span>
                      )}
                    </span>
                    <AnimatePresence>
                      {solved && (
                        <motion.span
                          className={`${styles.stamp} pointer-events-none absolute left-1/2 top-1/2 rounded-xl px-[0.4em] py-[0.1em] font-black leading-none`}
                          initial={{ scale: 2.2, opacity: 0, rotate: -18, x: "-50%", y: "-50%" }}
                          animate={{ scale: 1, opacity: 1, rotate: -12, x: "-50%", y: "-50%" }}
                          transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.25 }}
                        >
                          SOLVED!
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-[clamp(8px,2vw,24px)]">{round.choices.map((c, i) => clueCard(round, c, i))}</div>
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
