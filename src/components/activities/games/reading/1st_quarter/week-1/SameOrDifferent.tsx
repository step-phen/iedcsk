"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, pickRandom } from "@/hooks/useSpeech";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { useImagePreload } from "@/hooks/useImagePreload";
import {
  ASSETS,
  SPEECH,
  correctAnswerSpeech,
  firstQuestionSpeech,
  nextQuestionSpeech,
  pairSpeech,
  pictureAsset,
  resultHeadline,
  resultSpeech,
  wordLabel,
} from "./SameOrDifferent.data";
import styles from "./SameOrDifferent.module.css";

// Confident, non-bouncy deceleration used for every authored entrance/tap
// response in this game.
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Round shape as consumed by this component, mapped from the API response. */
interface Round {
  id: string;
  imageA: string;
  imageB: string;
  labelA: string;
  labelB: string;
  same: boolean;
}

interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Choice = "same" | "different";
type Feedback = { kind: "error" | "success"; message: string } | null;
type RoundStatus = "unanswered" | "correct" | "wrong";

interface RoundState {
  status: RoundStatus;
  lastChoice: Choice | null;
}

const initialRoundStates = (rounds: Round[]): Record<string, RoundState> =>
  Object.fromEntries(
    rounds.map((r) => [
      r.id,
      { status: "unanswered" as RoundStatus, lastChoice: null },
    ]),
  );

// Hand-drawn wobbly circle, used to "circle" the correct answer. Scaled to
// sit over the icon medallion on the left of the same/different button art
// (the button itself is a wide pill, not a square — the mark only needs to
// ring the icon, not the whole label).
const CIRCLE_PATH =
  "M 40 50 C 38 28, 58 12, 80 14 C 100 16, 116 34, 112 54 C 108 74, 88 90, 66 88 C 46 86, 34 68, 40 50 Z";

// Two hand-drawn crossing strokes, used to mark a wrong answer permanently —
// same icon-medallion scale as CIRCLE_PATH above.
const X_PATHS = ["M 44 20 Q 75 50 106 80", "M 106 20 Q 75 50 44 80"];

// The rest of the background lives in .screen; the artwork path stays with the other assets.
const BG_STYLE = { backgroundImage: `url(${ASSETS.background})` } as const;

export default function SameOrDifferent({
  activityId,
  activityName,
  onFinish,
}: GameComponentProps) {
  const reduceMotion = useReducedMotion();
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [roundStates, setRoundStates] = useState<Record<string, RoundState>>(
    {},
  );
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [showResult, setShowResult] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentRound = rounds ? rounds[currentIndex] : undefined;
  const nextRound = rounds ? rounds[currentIndex + 1] : undefined;
  // Warm only the next round's art, never the whole activity at once.
  useImagePreload([nextRound?.imageA, nextRound?.imageB]);

  // Where the current round's tap landed, so the circle/X mark can show in
  // that box and both boxes lock until the next round starts.
  const [dropMark, setDropMark] = useState<{
    box: Choice;
    status: RoundStatus;
  } | null>(null);

  // Question data lives in the DB now (activity_questions) — fetched once on
  // mount.
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
        if (!res.ok)
          throw new Error(`Request failed with status ${res.status}`);
        const rows: QuestionRow[] = await res.json();
        if (cancelled) return;

        const mapped: Round[] = rows.map((row) => {
          const { a, b } = row.questionData as { a: unknown; b: unknown };
          if (typeof a !== "string" || typeof b !== "string") {
            throw new Error(
              `Question ${row.questionKey} needs words "a" and "b"`,
            );
          }
          return {
            id: row.questionKey,
            imageA: pictureAsset(a),
            imageB: pictureAsset(b),
            labelA: wordLabel(a),
            labelB: wordLabel(b),
            same: row.correctAnswer.answer === "same",
          };
        });

        setRounds(mapped);
        setRoundStates(initialRoundStates(mapped));
      } catch (err) {
        console.error("Failed to load Similar and Different questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId]);

  // Text-to-speech for each question — kindergarten learners can't
  // necessarily read the prompt yet.
  const { speak, speakAll, stop } = useSpeech();

  // Plays once, before the very first question — chains into that
  // question's own TTS via onEnd so the two lines never overlap.
  //
  // "introState" (not just a boolean) is what makes this safe under React
  // StrictMode's dev-only double-invoke of mount effects: the first
  // invocation flips it to "speaking" and kicks off intro -> question via
  // onEnd; the immediate duplicate invocation sees "speaking" and does
  // nothing, instead of racing a second speak(questionText) that would cut
  // the intro off mid-sentence.
  const introStateRef = useRef<"pending" | "speaking" | "done">("pending");
  useEffect(() => {
    if (!rounds || !currentRound) return;

    const questionText = pairSpeech(currentRound);

    if (introStateRef.current === "pending") {
      introStateRef.current = "speaking";
      speakAll(
        [
          learnerGreeting(getLearnerFirstName()),
          GAME_INTRO_LINES["similar and different"],
        ],
        () => {
          introStateRef.current = "done";
          // interrupt: false so this never cuts off a feedback line the
          // learner triggered during the intro — that line's onEnd is what
          // advances the round.
          speak(firstQuestionSpeech(questionText), undefined, {
            interrupt: false,
          });
        },
      );
      return;
    }

    if (introStateRef.current === "speaking") return;

    // Every question after the first (that one gets its own "The first
    // question is..." lead-in above) gets a numbered transition line so
    // jumping straight into the next prompt doesn't feel abrupt.
    speak(
      nextQuestionSpeech(
        currentIndex + 1,
        currentIndex === rounds.length - 1,
        questionText,
      ),
    );
  }, [rounds, currentRound, currentIndex, speak, speakAll]);

  useEffect(() => stop, [stop]);

  // Display-only: the learner name the child already picked on /learner.
  // Never used for grading/identity. Note: the unauthenticated picker
  // endpoint that fills this (/api/classroom-session/learners) deliberately
  // returns firstName only — middle/last name are withheld from that
  // unauthenticated caller. There's nothing more to display here.
  const [learnerName, setLearnerName] = useState<string | null>(null);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLearnerName(getLearnerFirstName());
  }, []);

  const total = rounds?.length ?? 0;
  const correctCount = useMemo(
    () =>
      Object.values(roundStates).filter((s) => s.status === "correct").length,
    [roundStates],
  );

  const headline = resultHeadline(correctCount, total);

  // Tap chime, synthesized via Web Audio — no .wav asset to ship or 404 on.
  // Correct/wrong feedback is spoken instead of a sound effect.
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSynthTap = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }

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

  const playTapSound = useCallback(() => {
    playSynthTap();
  }, [playSynthTap]);

  useEffect(() => {
    if (showResult) {
      speak(resultSpeech(correctCount, total));
    }
  }, [showResult, correctCount, total, speak]);

  const handleChoice = useCallback(
    (choice: Choice) => {
      // Boxes lock the instant an answer registers — see the `disabled`
      // prop on the box buttons below.
      if (dropMark) return;
      if (!rounds || !currentRound) return;

      playTapSound();

      const round = currentRound;
      const isCorrect = (choice === "same") === round.same;
      const isLastQuestion = currentIndex === rounds.length - 1;

      setRoundStates((prev) => ({
        ...prev,
        [round.id]: {
          status: isCorrect ? "correct" : "wrong",
          lastChoice: choice,
        },
      }));
      setDropMark({ box: choice, status: isCorrect ? "correct" : "wrong" });

      // The next question's TTS — or, on the last question, the results
      // speech — only starts once the correct/wrong feedback has actually
      // finished speaking. Otherwise the two voices overlap/cut each other
      // off.
      const advance = () => {
        setFeedback(null);
        if (isLastQuestion) {
          setShowResult(true);
        } else {
          setDropMark(null);
          setCurrentIndex((i) => Math.min(i + 1, rounds.length - 1));
        }
      };

      const message = isCorrect
        ? pickRandom(SPEECH.correct)
        : `${pickRandom(SPEECH.wrong)} ${correctAnswerSpeech(round, isLastQuestion)}`;
      setFeedback({ kind: isCorrect ? "success" : "error", message });
      // The answer cuts off whatever is still being said; a cut-off intro never reaches its onEnd, so mark it done here.
      introStateRef.current = "done";
      speak(message, advance);
    },
    [dropMark, rounds, currentRound, currentIndex, playTapSound, speak],
  );

  const handleFinish = useCallback(() => {
    // roundStates is already keyed by round id and holds the child's choice;
    // each round only registers one drop, so lastChoice is their single
    // answer.
    const submitted: SubmittedAnswer[] = Object.entries(roundStates)
      .filter(([, st]) => st.lastChoice !== null)
      .map(([id, st]) => ({
        questionId: id,
        response: st.lastChoice as string,
      }));
    onFinish?.(submitted);
  }, [onFinish, roundStates]);

  const drawnMark = (status: RoundStatus, color: string, delay = 0) => (
    <svg
      viewBox="0 0 300 100"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {status === "correct" && (
        <motion.path
          d={CIRCLE_PATH}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={
            reduceMotion
              ? { duration: 0.15, delay, ease: "easeOut" }
              : { duration: 0.5, delay, ease: "easeInOut" }
          }
        />
      )}
      {status === "wrong" &&
        X_PATHS.map((d, i) => (
          <motion.path
            key={d}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={7}
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={
              reduceMotion
                ? { duration: 0.15, ease: "easeOut" }
                : { duration: 0.25, delay: i * 0.1, ease: "easeInOut" }
            }
          />
        ))}
    </svg>
  );

  const dropBox = (choice: Choice) => {
    const mark = dropMark?.box === choice ? dropMark : null;
    const isSame = choice === "same";
    // After a wrong tap the right button is circled, glows and pulses so the child sees the answer.
    const showAnswer =
      dropMark?.status === "wrong" && currentRound?.same === isSame;
    return (
      <button
        type="button"
        onClick={() => handleChoice(choice)}
        disabled={!!dropMark}
        aria-label={isSame ? "Same" : "Different"}
        className={`${styles.answerButton} ${showAnswer ? styles.showAnswer : ""} relative h-12 w-auto shrink-0 overflow-hidden rounded-full disabled:cursor-default sm:h-24 lg:h-32`}
      >
        <Image
          src={ASSETS.buttons[choice]}
          alt=""
          fill
          sizes="(min-width: 1024px) 24rem, (min-width: 640px) 18rem, 9rem"
          draggable={false}
          className="scale-x-[1.12] object-fill"
        />
        {mark &&
          drawnMark(
            mark.status,
            mark.status === "wrong" ? "#b34a3c" : "#2f9e8f",
          )}
        {showAnswer && drawnMark("correct", "#2f9e8f", 0.3)}
      </button>
    );
  };

  if (loadError) {
    return (
      <div
        className={`${styles.screen} fixed inset-0 flex h-dvh w-full flex-col items-center justify-center gap-3 px-4 text-center`}
        style={BG_STYLE}
      >
        <p className="text-lg font-bold">
          Couldn&apos;t load this activity. Please try again.
        </p>
      </div>
    );
  }

  if (!rounds || !currentRound) {
    return (
      <div
        className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-4`}
        style={BG_STYLE}
      >
        <p className="text-lg font-bold">Loading…</p>
      </div>
    );
  }

  return (
    <div
      className={`${styles.screen} fixed inset-0 flex h-dvh w-full flex-col overflow-hidden px-4 pb-3 pt-4 sm:px-8 sm:pb-5 sm:pt-6`}
      style={BG_STYLE}
    >
      <header className={`${styles.header} relative mb-1 flex shrink-0 items-center justify-center gap-2 px-14 sm:gap-3 sm:px-20`}>
        {learnerName && (
          <div className={`${styles.learnerBadge} absolute left-0 flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1.5 sm:gap-2.5 sm:px-4 sm:py-2.5`}>
            <span
              aria-hidden="true"
              className="text-base leading-none sm:text-2xl md:text-3xl"
            >
              {"\uD83D\uDE4B"}
            </span>
            <span className="max-w-[4rem] truncate text-xs font-extrabold leading-none sm:max-w-[9rem] sm:text-base md:max-w-[13rem] md:text-xl">
              Learner: {learnerName}
            </span>
          </div>
        )}
        <h1 className="flex min-w-0 justify-center">
          <Image
            src={ASSETS.title}
            alt={activityName || "Same or Different?"}
            width={2172}
            height={724}
            priority
            className={`${styles.title} w-auto max-w-full object-contain`}
          />
        </h1>
        <div
          className={`${styles.scorePill} absolute right-0 flex shrink-0 items-center gap-1 rounded-full px-3 py-2 sm:gap-1.5 sm:px-4 sm:py-2.5`}
          role="status"
          aria-label={`Score: ${correctCount} out of ${total} correct`}
        >
          {rounds.map((r, i) => (
            <motion.span
              key={r.id}
              className="block"
              animate={
                !reduceMotion && i === currentIndex
                  ? { scale: [1, 1.2, 1] }
                  : { scale: 1 }
              }
              transition={{ duration: 0.6, ease: EASE_OUT }}
            >
              <Image
                src={
                  roundStates[r.id]?.status === "correct"
                    ? ASSETS.starFilled
                    : ASSETS.starEmpty
                }
                alt=""
                width={32}
                height={32}
                className={`${styles.star} h-5 w-5 object-contain sm:h-8 sm:w-8`}
              />
            </motion.span>
          ))}
        </div>
      </header>

      <div className="relative mb-2 flex shrink-0 justify-center">
        <Image
          src={ASSETS.instruction}
          alt="Look at the two pictures. Are they the same or different?"
          width={3000}
          height={478}
          priority
          className={`${styles.instruction} h-14 w-auto max-w-full object-contain sm:h-24 md:h-32`}
        />
      </div>

      <AnimatePresence mode="wait">
        {!showResult ? (
          <motion.div
            key="board"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className={`${styles.board} flex min-h-0 flex-1 flex-col items-center justify-center gap-3 sm:gap-6`}
          >
            {/* the current pair */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentRound.id}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -40 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
                className={`${styles.pictures} flex items-center justify-center gap-3 sm:gap-5`}
              >
                {[
                  { image: currentRound.imageA, label: currentRound.labelA },
                  { image: currentRound.imageB, label: currentRound.labelB },
                ].map((picture, index) => (
                  <div
                    key={index}
                    className={`${styles.pictureCard} relative h-28 w-28 shrink-0 overflow-hidden rounded-xl sm:h-52 sm:w-52 lg:h-72 lg:w-72`}
                  >
                    <Image
                      src={picture.image}
                      alt={picture.label}
                      fill
                      sizes="(min-width: 1024px) 18rem, (min-width: 640px) 13rem, 7rem"
                      priority
                      draggable={false}
                      className="object-contain p-2 sm:p-3 lg:p-5"
                    />
                  </div>
                ))}
              </motion.div>
            </AnimatePresence>

            {/* the two answer boxes */}
            <div className={`${styles.answers} flex items-center justify-center gap-4 sm:gap-8 lg:gap-12`}>
              {dropBox("same")}
              {dropBox("different")}
            </div>
            <div
              className={`${styles.feedbackRow} relative flex min-h-[3rem] shrink-0 items-center justify-center px-2`}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={feedback ? "answer" : "prompt"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0 : 0.15 }}
                  className={`${styles.feedback} ${
                    feedback?.kind === "error" ? styles.feedbackError : styles.feedbackSuccess
                  } flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold sm:text-lg`}
                >
                  <Star
                    aria-hidden="true"
                    className={`${styles.feedbackStar} h-4 w-4 shrink-0 sm:h-6 sm:w-6`}
                  />
                  <span>
                    {feedback?.message ?? "Look carefully. Tap your answer!"}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
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
                initial={
                  reduceMotion
                    ? { scale: 1, rotate: -8, opacity: 0 }
                    : { scale: 1.6, rotate: -22, opacity: 0 }
                }
                animate={{ scale: 1, rotate: -8, opacity: 1 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
                className={`${styles.stamp} rounded-md px-6 py-2 text-2xl font-extrabold uppercase tracking-widest`}
              >
                {headline}
              </motion.div>
              <button
                type="button"
                onClick={() => speak(resultSpeech(correctCount, total))}
                aria-label="Hear the result again"
                className={`${styles.replayButton} flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:h-10 sm:w-10 sm:text-lg`}
              >
                🔊
              </button>
            </div>

            <p className="text-xl font-bold">
              You got {correctCount} of {total} correct!
            </p>

            {/* recap strip: what the child actually compared this round */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {rounds.map((r) => {
                const s = roundStates[r.id];
                return (
                  <div
                    key={r.id}
                    className={`${styles.recapChip} relative flex h-10 w-10 items-center justify-center rounded-full text-lg sm:h-12 sm:w-12 sm:text-xl`}
                  >
                    <span aria-hidden>{r.same ? "🟰" : "🔀"}</span>
                    <span
                      className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white sm:h-5 sm:w-5 ${
                        s.status === "correct" ? styles.recapCorrect : styles.recapMissed
                      }`}
                    >
                      {s.status === "correct" ? "✓" : "✕"}
                    </span>
                    <span className="sr-only">
                      {r.labelA} and {r.labelB}:{" "}
                      {s.status === "correct" ? "correct" : "missed"}
                    </span>
                  </div>
                );
              })}
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              onClick={handleFinish}
              className={`${styles.finishButton} rounded-full px-10 py-3 text-xl font-extrabold uppercase tracking-wide focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f1e3]`}
            >
              Finish ✅
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
