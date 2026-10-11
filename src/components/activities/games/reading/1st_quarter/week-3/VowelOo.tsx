"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Star, Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, pickRandom } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import {
  LETTER,
  SPEECH,
  TAP_NOW,
  WORDS,
  correctAnswerSpeech,
  correctSpeech,
  firstQuestionSpeech,
  nextQuestionSpeech,
  questionSpeech,
  resultHeadline,
  resultSpeech,
} from "./VowelOo.data";
import styles from "./VowelOo.module.css";

// Confident, non-bouncy deceleration used for every authored entrance/tap
// response in this game.
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Round shape as consumed by this component, mapped from the API response. */
interface Round {
  id: string;
  target: string;
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Feedback = { kind: "error" | "success"; message: string } | null;
type RoundStatus = "unanswered" | "correct" | "wrong";

interface RoundState {
  status: RoundStatus;
  lastChoice: string | null;
}

const initialRoundStates = (rounds: Round[]): Record<string, RoundState> =>
  Object.fromEntries(rounds.map((r) => [r.id, { status: "unanswered" as RoundStatus, lastChoice: null }]));

// Marks are drawn in a 100 x 100 box over the card, this far in from its edges.
const MARK_INSET = 6;

export default function VowelOo({ activityId, activityName, onFinish }: GameComponentProps) {
  const reduceMotion = useReducedMotion();
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [roundStates, setRoundStates] = useState<Record<string, RoundState>>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [showResult, setShowResult] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentRound = rounds ? rounds[currentIndex] : undefined;

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

        const mapped: Round[] = rows.map((row) => {
          const data = row.questionData as { choices?: unknown };
          const choices = Array.isArray(data.choices) ? data.choices : [];
          const target = row.correctAnswer.answer;
          if (choices.length < 2 || !choices.every((c) => typeof c === "string" && c in WORDS) || !choices.includes(target)) {
            throw new Error(`Question ${row.questionKey} needs choices from the word list that include the answer`);
          }
          return { id: row.questionKey, target, choices };
        });

        setRounds(mapped);
        setRoundStates(initialRoundStates(mapped));
      } catch (err) {
        console.error("Failed to load Vowel Oo questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId]);

  // Text-to-speech for each question — kindergarten learners can't necessarily read the prompt yet.
  const { speak, speakAll, stop } = useSpeech();

  // Which card is being named aloud right now; that card zooms in.
  const [namingIndex, setNamingIndex] = useState<number | null>(null);

  // Says the lead line, then names each picture while its card zooms in, then asks for the tap.
  const askQuestion = useCallback(
    (round: Round, lead: string, opts?: { interrupt?: boolean }) => {
      const sayName = (i: number) => {
        setNamingIndex(i);
        speak(
          WORDS[round.choices[i]].name,
          () => {
            if (i + 1 < round.choices.length) return sayName(i + 1);
            setNamingIndex(null);
            speak(TAP_NOW);
          },
          { pauseMs: 250 },
        );
      };
      speak(lead, () => sayName(0), opts);
    },
    [speak],
  );

  // Plays once, before the very first question, and chains into it via onEnd so the two lines never overlap.
  // "introState" (not just a boolean) keeps StrictMode's dev-only double mount from cutting the intro off.
  const introStateRef = useRef<"pending" | "speaking" | "done">("pending");
  useEffect(() => {
    if (!rounds || !currentRound) return;

    // Autoplay may be blocked until the child's first tap on some browsers; the 🔊 button covers that case.
    const questionText = questionSpeech();

    if (introStateRef.current === "pending") {
      introStateRef.current = "speaking";
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["vowel oo"]], () => {
        introStateRef.current = "done";
        askQuestion(currentRound, firstQuestionSpeech(questionText), { interrupt: false });
      });
      return;
    }

    if (introStateRef.current === "speaking") return;

    askQuestion(currentRound, nextQuestionSpeech(currentIndex + 1, currentIndex === rounds.length - 1, questionText));
  }, [rounds, currentRound, currentIndex, speakAll, askQuestion]);

  useEffect(() => stop, [stop]);

  // Display-only: the learner name and photo the child already picked on /learner; never used for grading.
  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);

  const total = rounds?.length ?? 0;
  const correctCount = useMemo(() => Object.values(roundStates).filter((s) => s.status === "correct").length, [roundStates]);
  const answeredCount = useMemo(() => Object.values(roundStates).filter((s) => s.status !== "unanswered").length, [roundStates]);
  const done = total > 0 && answeredCount === total;
  const headline = resultHeadline(correctCount, total);

  // Tap chime, synthesized via Web Audio — no .wav asset to ship or 404 on.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playTapSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") void ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.06);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // Ignore web audio exceptions if restricted
    }
  }, []);

  // One try per question: a miss marks the pick, shows the right picture, and moves on once the line is spoken.
  const handleChoice = useCallback(
    (round: Round, choice: string) => {
      if (!rounds) return;
      const st = roundStates[round.id];
      if (!st || st.status !== "unanswered") return;

      playTapSound();
      setNamingIndex(null);

      const isCorrect = choice === round.target;
      setRoundStates((prev) => ({ ...prev, [round.id]: { status: isCorrect ? "correct" : "wrong", lastChoice: choice } }));

      const isLastQuestion = currentIndex === rounds.length - 1;
      const advance = () => {
        setFeedback(null);
        if (isLastQuestion) setShowResult(true);
        else setCurrentIndex((i) => Math.min(i + 1, rounds.length - 1));
      };

      const targetName = WORDS[round.target].name;
      const message = isCorrect
        ? correctSpeech(pickRandom(SPEECH.correct), targetName)
        : `${pickRandom(SPEECH.wrong)} ${correctAnswerSpeech(targetName, isLastQuestion)}`;
      setFeedback({ kind: isCorrect ? "success" : "error", message });
      // The answer cuts off whatever is still being said; a cut-off intro never reaches its onEnd, so mark it done here.
      introStateRef.current = "done";
      speak(message, advance);
    },
    [rounds, roundStates, playTapSound, speak, currentIndex],
  );

  // No Finish button: the score is sent once the result line has been spoken.
  const finishedRef = useRef(false);
  const handleFinish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const submitted: SubmittedAnswer[] = Object.entries(roundStates)
      .filter(([, st]) => st.lastChoice !== null)
      .map(([id, st]) => ({ questionId: id, response: st.lastChoice as string }));
    onFinish?.(submitted);
  }, [onFinish, roundStates]);

  // A replay re-speaks the result and still finishes after it, since a newer line cancels the earlier onEnd.
  const speakResult = useCallback(() => speak(resultSpeech(correctCount, total), handleFinish), [speak, correctCount, total, handleFinish]);

  useEffect(() => {
    if (showResult) speakResult();
  }, [showResult, speakResult]);

  // A circle for the right pick, an X for a wrong one, drawn over the card.
  const drawnMark = (status: RoundStatus, color: string, delay = 0) => {
    const [lo, hi] = [MARK_INSET, 100 - MARK_INSET];
    return (
      <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full">
        {status === "correct" && (
          <motion.ellipse
            cx={50}
            cy={50}
            rx={50 - MARK_INSET}
            ry={50 - MARK_INSET}
            fill="none"
            stroke={color}
            strokeWidth={4}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={reduceMotion ? { duration: 0.15, delay, ease: "easeOut" } : { duration: 0.5, delay, ease: "easeInOut" }}
          />
        )}
        {status === "wrong" &&
          [`M ${lo} ${lo} L ${hi} ${hi}`, `M ${hi} ${lo} L ${lo} ${hi}`].map((d, i) => (
            <motion.path
              key={i}
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={5}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={reduceMotion ? { duration: 0.15, ease: "easeOut" } : { duration: 0.25, delay: i * 0.1, ease: "easeInOut" }}
            />
          ))}
      </svg>
    );
  };

  const picture = (round: Round, choice: string, index: number, st: RoundState) => {
    const word = WORDS[choice];
    const isNamed = namingIndex === index && st.status === "unanswered";
    const isThisChoice = st.lastChoice === choice;
    // A miss reveals the right answer: circled, glowing, zoomed in and wiggling.
    const showAnswer = st.status === "wrong" && choice === round.target;
    return (
      <motion.button
        key={choice}
        type="button"
        onClick={() => handleChoice(round, choice)}
        disabled={st.status !== "unanswered"}
        animate={
          isThisChoice && !reduceMotion
            ? st.status === "correct"
              ? { scale: [1, 1.08, 1] }
              : { x: [0, -6, 6, -3, 0] }
            : { scale: isNamed && !reduceMotion ? 1.12 : 1 }
        }
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className={`${styles.card} ${showAnswer ? styles.showAnswer : ""} ${isNamed ? styles.named : ""} relative flex aspect-square w-[clamp(120px,24dvh,210px)] shrink-0 flex-col items-center justify-center gap-1 rounded-3xl disabled:cursor-default focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2`}
      >
        <span className="relative size-[62%]">
          <Image src={word.image} alt="" fill priority sizes="210px" className="object-contain" draggable={false} />
        </span>
        <span className="text-lg font-extrabold leading-none sm:text-2xl">{word.name}</span>
        {isThisChoice && drawnMark(st.status, st.status === "wrong" ? "#b34a3c" : "#2f9e8f")}
        {showAnswer && drawnMark("correct", "#2f9e8f", 0.3)}
      </motion.button>
    );
  };

  if (loadError) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full flex-col items-center justify-center gap-3 px-4 text-center`}>
        <p className="text-lg font-bold">Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!rounds || !currentRound) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-4`}>
        <p className="text-lg font-bold">Loading…</p>
      </div>
    );
  }

  return (
    <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full flex-col overflow-hidden px-4 pb-3 pt-4 sm:px-8 sm:pb-5 sm:pt-6`}>
      {/* header */}
      <div className="relative mb-2 flex shrink-0 items-center justify-center gap-3">
        {learnerName && (
          <div className={`${styles.badge} absolute left-0 flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-4 sm:gap-3 sm:pr-5`}>
            <motion.span
              className={`${styles.avatar} flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none sm:h-11 sm:w-11 sm:text-2xl`}
              initial={{ rotate: 0 }}
              animate={{ rotate: reduceMotion ? 0 : [0, -18, 14, -10, 6, 0] }}
              transition={{ duration: 0.9, ease: EASE_OUT }}
              style={{ transformOrigin: "70% 70%" }}
            >
              <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className="h-full w-full" />
            </motion.span>
            <span className="max-w-[9rem] truncate text-base font-extrabold capitalize leading-none sm:max-w-[13rem] sm:text-xl">
              {learnerName}
            </span>
          </div>
        )}
        <h2 className={`${styles.title} max-w-[55%] truncate text-center text-3xl font-extrabold leading-tight sm:text-5xl`}>
          {activityName || "Vowel Oo"}
        </h2>
        <div
          className={`${styles.scorePill} absolute right-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-lg font-extrabold sm:text-2xl`}
          role="status"
          aria-label={`Score: ${correctCount} out of ${total} correct`}
        >
          <Star aria-hidden="true" className="h-5 w-5 text-[#f2b134] sm:h-6 sm:w-6" fill="#f2b134" strokeWidth={2.2} />
          <span className="tabular-nums">
            {correctCount}/{total}
          </span>
        </div>
      </div>

      <p className={`${styles.instruction} relative mb-2 shrink-0 text-center text-lg font-bold sm:text-2xl`}>
        Look at the pictures, then tap the one that starts with {LETTER.spoken}
      </p>

      {/* progress dots */}
      <div className="relative mb-2 flex shrink-0 items-center justify-center gap-2">
        {rounds.map((r, i) => {
          const st = roundStates[r.id];
          const dotColor =
            st.status === "correct" ? "#2f9e8f" : st.status === "wrong" ? "#b34a3c" : i === currentIndex ? "#f5c518" : "#e4d9bd";
          const ringWidth = i === currentIndex ? 3 : 2;
          const ringAlpha = i === currentIndex ? 0.5 : 0.3;
          return (
            <motion.span
              // Remounts the moment this dot's status flips, so answering pops it once.
              key={`${r.id}-${st.status}`}
              className="rounded-full"
              initial={st.status === "unanswered" || reduceMotion ? false : { scale: 0.5 }}
              animate={{
                width: i === currentIndex ? 18 : 14,
                height: i === currentIndex ? 18 : 14,
                scale: 1,
                boxShadow: `0 0 0 ${ringWidth}px rgba(34,49,79,${ringAlpha})`,
              }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              style={{ background: dotColor }}
            />
          );
        })}
      </div>

      <AnimatePresence>
        {feedback && (
          <motion.div
            key="feedback-toast"
            initial={{ opacity: 0, y: -14, scale: 0.96 }}
            animate={{ opacity: 1, y: reduceMotion ? 0 : [0, -3, 0], scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className={`${styles.toast} ${
              feedback.kind === "success" ? styles.toastSuccess : styles.toastError
            } pointer-events-none absolute right-6 top-24 z-20 max-w-xs rounded-lg px-4 py-2 text-sm font-bold sm:right-10 sm:top-28`}
          >
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!done || !showResult ? (
          <motion.div
            key="board"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className="flex min-h-0 flex-1 items-center justify-center"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentRound.id}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -40 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
                className={`${styles.board} flex w-full shrink-0 flex-col items-center justify-center gap-4 sm:gap-6`}
              >
                <div className={`${styles.promptPill} flex items-center gap-3 rounded-full py-1.5 pl-6 pr-1.5 sm:gap-4 sm:py-2 sm:pl-8 sm:pr-2`}>
                  <p className={`${styles.prompt} text-2xl font-extrabold leading-tight sm:text-4xl`}>
                    Which one starts with <span className={styles.askWord}>{LETTER.shown}</span>?
                  </p>
                  <button
                    type="button"
                    onClick={() => askQuestion(currentRound, questionSpeech())}
                    aria-label="Hear the question again"
                    className={`${styles.speakerButton} flex h-10 w-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2 sm:h-12 sm:w-12`}
                  >
                    <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
                  </button>
                </div>
                {/* Two by two when the screen is upright, one row of four when it is sideways. */}
                <div className="grid grid-cols-2 place-items-center gap-[clamp(10px,2.5vw,32px)] landscape:flex landscape:items-center landscape:justify-center">
                  {currentRound.choices.map((choice, i) => picture(currentRound, choice, i, roundStates[currentRound.id]))}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="closed"
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className={`${styles.result} flex flex-1 flex-col items-center justify-center gap-5`}
          >
            <div className="flex items-center gap-2">
              <motion.div
                initial={reduceMotion ? { scale: 1, rotate: -8, opacity: 0 } : { scale: 1.6, rotate: -22, opacity: 0 }}
                animate={{ scale: 1, rotate: -8, opacity: 1 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                className={`${styles.stamp} rounded-md px-6 py-2 text-2xl font-extrabold uppercase tracking-widest`}
              >
                {headline}
              </motion.div>
              <button
                type="button"
                onClick={speakResult}
                aria-label="Hear the result again"
                className={`${styles.replayButton} flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:h-10 sm:w-10 sm:text-lg`}
              >
                🔊
              </button>
            </div>

            <p className="text-xl font-bold">
              You got {correctCount} of {total} correct!
            </p>

            {/* recap strip: how each question went */}
            <div className="flex items-center justify-center gap-2">
              {rounds.map((r, i) => {
                const s = roundStates[r.id];
                return (
                  <div
                    key={r.id}
                    className={`${styles.recapChip} relative flex h-10 w-10 items-center justify-center rounded-full text-lg font-extrabold sm:h-12 sm:w-12 sm:text-xl`}
                  >
                    <span aria-hidden>{i + 1}</span>
                    <span
                      className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white sm:h-5 sm:w-5 ${
                        s.status === "correct" ? styles.recapCorrect : styles.recapMissed
                      }`}
                    >
                      {s.status === "correct" ? "✓" : "✕"}
                    </span>
                    <span className="sr-only">
                      {WORDS[r.target].name}: {s.status === "correct" ? "correct" : "missed"}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
