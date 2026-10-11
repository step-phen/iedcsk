"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, pickRandom } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { useImagePreload } from "@/hooks/useImagePreload";
import {
  ASSETS,
  SPEECH,
  correctAnswerSpeech,
  firstQuestionSpeech,
  nextQuestionSpeech,
  pictureAsset,
  pictureWidth,
  questionSpeech,
  resultHeadline,
  resultSpeech,
  scoreBadgeAsset,
  wordLabel,
  type Length,
} from "./LongOrShort.data";
import styles from "./LongOrShort.module.css";

// Confident, non-bouncy deceleration used for every authored entrance/tap
// response in this game.
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// The longest picture's box is about 4.5 times wider than tall; every box keeps that height.
const PICTURE_ASPECT = 4.5;

/** Round shape as consumed by this component, mapped from the API response. */
interface Round {
  id: string;
  object: string;
  label: string;
  askFor: "longer" | "shorter";
}

interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Choice = Length;
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

const correctChoiceFor = (round: Round): Choice => (round.askFor === "longer" ? "long" : "short");

// The rest of the background lives in .screen; the artwork path stays with the other assets.
const BG_STYLE = { backgroundImage: `url(${ASSETS.background})` } as const;

// Marks are drawn in a box 100 units tall and as wide as the picture, this far in from its edges.
const MARK_INSET = 6;

export default function LongOrShort({
  activityId,
  activityName,
  onFinish,
}: GameComponentProps) {
  const reduceMotion = useReducedMotion();
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [roundStates, setRoundStates] = useState<Record<string, RoundState>>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [showResult, setShowResult] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentRound = rounds ? rounds[currentIndex] : undefined;
  const nextRound = rounds ? rounds[currentIndex + 1] : undefined;
  // Warm only the next round's art, never the whole activity at once.
  useImagePreload([
    nextRound && pictureAsset(nextRound.object, "short"),
    nextRound && pictureAsset(nextRound.object, "long"),
  ]);

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
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        const rows: QuestionRow[] = await res.json();
        if (cancelled) return;

        const mapped: Round[] = rows.map((row) => {
          const { object, askFor } = row.questionData as { object: unknown; askFor: unknown };
          if (typeof object !== "string" || (askFor !== "longer" && askFor !== "shorter")) {
            throw new Error(`Question ${row.questionKey} needs an "object" and "askFor" longer or shorter`);
          }
          return { id: row.questionKey, object, label: wordLabel(object), askFor };
        });

        setRounds(mapped);
        setRoundStates(initialRoundStates(mapped));
      } catch (err) {
        console.error("Failed to load Long and Short questions:", err);
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
  // "introState" (not just a boolean) is what makes this safe under
  // React StrictMode's dev-only double-invoke of mount effects: the first
  // invocation flips it to "speaking" and kicks off intro -> question via
  // onEnd; the immediate duplicate invocation sees "speaking" and does
  // nothing, instead of racing a second speak(questionText) that would cut
  // the intro off mid-sentence.
  const introStateRef = useRef<"pending" | "speaking" | "done">("pending");
  useEffect(() => {
    if (!rounds || !currentRound) return;

    // Autoplay may be blocked until the child's first tap on some browsers
    // (notably iOS Safari) — the 🔊 button on the card covers that case.
    const questionText = questionSpeech(currentRound);

    if (introStateRef.current === "pending") {
      introStateRef.current = "speaking";
      speakAll(
        [learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["long and short"]],
        () => {
          introStateRef.current = "done";
          speak(firstQuestionSpeech(questionText), undefined, { interrupt: false });
        },
      );
      return;
    }

    if (introStateRef.current === "speaking") return;

    // Every question after the first (that one gets its own "The first
    // question is..." lead-in above) gets a numbered transition line so
    // jumping straight into the next prompt doesn't feel abrupt.
    speak(nextQuestionSpeech(currentIndex + 1, currentIndex === rounds.length - 1, questionText));
  }, [rounds, currentRound, currentIndex, speak, speakAll]);

  useEffect(() => stop, [stop]);

  // Display-only: the learner name the child already picked on /learner.
  // Never used for grading/identity. Note: the unauthenticated picker
  // endpoint that fills this (/api/classroom-session/learners) deliberately
  // returns firstName only — middle/last name are withheld from that
  // unauthenticated caller. There's nothing more to display here.
  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLearnerName(getLearnerFirstName());
    // The learner's own photo, shown beside their name.
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);

  const total = rounds?.length ?? 0;
  const correctCount = useMemo(
    () =>
      Object.values(roundStates).filter((s) => s.status === "correct").length,
    [roundStates],
  );
  const answeredCount = useMemo(
    () =>
      Object.values(roundStates).filter((s) => s.status !== "unanswered")
        .length,
    [roundStates],
  );
  const done = total > 0 && answeredCount === total;
  const headline = resultHeadline(correctCount, total);

  // Tap chime, synthesized via Web Audio — no .wav asset to ship or 404 on.
  // Correct/wrong feedback is spoken (see handleChoice) instead of a sound effect.
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
    (round: Round, choice: Choice) => {
      if (!rounds) return;
      const st = roundStates[round.id];
      if (!st || st.status !== "unanswered") return;

      playTapSound();

      const isCorrect = choice === correctChoiceFor(round);

      setRoundStates((prev) => ({
        ...prev,
        [round.id]: {
          status: isCorrect ? "correct" : "wrong",
          lastChoice: choice,
        },
      }));

      const isLastQuestion = currentIndex === rounds.length - 1;

      // The next question's TTS — or, on the last question, the results
      // speech — only starts once the correct/wrong feedback has actually
      // finished speaking.
      const advance = () => {
        setFeedback(null);
        if (isLastQuestion) {
          setShowResult(true);
        } else {
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
    [rounds, roundStates, playTapSound, speak, currentIndex],
  );

  const handleFinish = useCallback(() => {
    const submitted: SubmittedAnswer[] = Object.entries(roundStates)
      .filter(([, st]) => st.lastChoice !== null)
      .map(([id, st]) => ({ questionId: id, response: st.lastChoice as string }));
    onFinish?.(submitted);
  }, [onFinish, roundStates]);

  // aspect = the picture box's width / height, so the oval and the X follow the picture's own proportions.
  const drawnMark = (status: RoundStatus, color: string, aspect: number, delay = 0) => {
    const w = 100 * aspect;
    const [left, top, right, bottom] = [MARK_INSET, MARK_INSET, w - MARK_INSET, 100 - MARK_INSET];
    const crossLines = [
      `M ${left} ${top} L ${right} ${bottom}`,
      `M ${right} ${top} L ${left} ${bottom}`,
    ];
    return (
    <svg viewBox={`0 0 ${w} 100`} className="pointer-events-none absolute inset-0 h-full w-full">
      {status === "correct" && (
        <motion.ellipse
          cx={w / 2}
          cy={50}
          rx={w / 2 - MARK_INSET}
          ry={50 - MARK_INSET}
          fill="none"
          stroke={color}
          strokeWidth={4}
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
        crossLines.map((d, i) => (
          <motion.path
            key={i}
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={5}
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
  };

  const picture =(round: Round, choice: Choice, st: RoundState) => {
    const isThisChoice = st.lastChoice === choice;
    // A miss reveals the right answer on the other picture: circled, glowing, zoomed in and wiggling.
    const showAnswer = st.status === "wrong" && choice === correctChoiceFor(round);
    const width = pictureWidth(round.object, choice);
    const aspect = width * PICTURE_ASPECT;
    return (
      <motion.button
        key={choice}
        type="button"
        onClick={() => handleChoice(round, choice)}
        disabled={st.status !== "unanswered"}
        animate={
          isThisChoice && !reduceMotion
            ? st.status === "correct"
              ? { scaleX: [1, 1.08, 1] }
              : { x: [0, -6, 6, -3, 0] }
            : {}
        }
        transition={{ duration: 0.35, ease: EASE_OUT }}
        style={{ width: `${width * 100}%`, aspectRatio: aspect }}
        className={`${styles.picture} ${showAnswer ? styles.showAnswer : ""} relative shrink-0 rounded-xl disabled:cursor-default focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f1e3]`}
      >
        <Image
          src={pictureAsset(round.object, choice)}
          alt={`${choice} ${round.label}`}
          fill
          priority
          sizes="(min-width: 832px) 52rem, 100vw"
          className="object-contain object-left p-1"
          draggable={false}
        />
        {isThisChoice && drawnMark(st.status, st.status === "wrong" ? "#b34a3c" : "#2f9e8f", aspect)}
        {showAnswer && drawnMark("correct", "#2f9e8f", aspect, 0.3)}
      </motion.button>
    );
  };

  if (loadError) {
    return (
      <div style={BG_STYLE} className={`${styles.screen} fixed inset-0 flex h-dvh w-full flex-col items-center justify-center gap-3 px-4 text-center`}>
        <p className="text-lg font-bold">Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!rounds || !currentRound) {
    return (
      <div style={BG_STYLE} className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-4`}>
        <p className="text-lg font-bold">Loading…</p>
      </div>
    );
  }

  return (
    <div style={BG_STYLE} className={`${styles.screen} fixed inset-0 flex h-dvh w-full flex-col overflow-hidden px-4 pb-3 pt-4 sm:px-8 sm:pb-5 sm:pt-6`}>
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
        {/* The banner art has empty space above and below; the 6:1 box crops it to the drawing. */}
        <h2 className={`${styles.title} relative aspect-[6/1] h-12 max-w-[60%] sm:h-16 lg:h-20`}>
          <Image src={ASSETS.title} alt={activityName || "Long and Short"} fill priority sizes="480px" className="object-cover" />
        </h2>
        <div
          className={`${styles.scoreBadge} absolute right-0 aspect-[12/5] h-10 shrink-0 sm:h-14`}
          role="status"
          aria-label={`Score: ${correctCount} out of ${total} correct`}
        >
          <Image src={scoreBadgeAsset(correctCount)} alt="" fill priority sizes="160px" className="object-cover" />
        </div>
      </div>

      <p className={`${styles.instruction} relative mb-2 shrink-0 text-center text-sm font-bold sm:text-base`}>
        Look at the pair, then tap the one you&apos;re asked for
      </p>

      {/* progress dots */}
      <div className="relative mb-2 flex shrink-0 items-center justify-center gap-2">
        {rounds.map((r, i) => {
          const st = roundStates[r.id];
          const dotColor =
            st.status === "correct"
              ? "#2f9e8f"
              : st.status === "wrong"
                ? "#b34a3c"
                // Plain tan read almost invisibly against the cream paper —
                // every dot keeps a navy ring so its edge stays legible
                // regardless of fill.
                : i === currentIndex
                  ? "#f5c518"
                  : "#e4d9bd";
          const ringWidth = i === currentIndex ? 3 : 2;
          const ringAlpha = i === currentIndex ? 0.5 : 0.3;
          return (
            <motion.span
              // remounts (and replays initial->animate once) the moment this
              // dot's status flips away from "unanswered" — the visible
              // consequence of answering, not a decorative loop.
              key={`${r.id}-${st.status}`}
              className="rounded-full"
              initial={
                st.status === "unanswered" || reduceMotion
                  ? false
                  : { scale: 0.5 }
              }
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
            } pointer-events-none absolute right-6 top-24 z-20 max-w-xs sm:top-28 rounded-lg px-4 py-2 text-sm font-bold sm:right-10`}
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
              {(() => {
                const st = roundStates[currentRound.id];
                // deterministic top/bottom order (no Math.random -> no hydration mismatch)
                const order: Choice[] = currentIndex % 2 === 0 ? ["short", "long"] : ["long", "short"];

                return (
                  <motion.div
                    key={currentRound.id}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -40 }}
                    transition={{ duration: 0.35, ease: EASE_OUT }}
                    className={`${styles.board} flex w-full shrink-0 flex-col items-center justify-center gap-4 sm:gap-5`}
                  >
                    <div className={`${styles.promptPill} flex items-center gap-3 rounded-full py-1.5 pl-6 pr-1.5 sm:gap-4 sm:py-2 sm:pl-8 sm:pr-2`}>
                      <p className={`${styles.prompt} text-2xl font-extrabold leading-tight sm:text-4xl`}>
                        Tap the <span className={styles.askWord}>{currentRound.askFor.toUpperCase()}</span>{" "}
                        {currentRound.label.toLowerCase()}
                      </p>
                      <button
                        type="button"
                        onClick={() => speak(questionSpeech(currentRound))}
                        aria-label="Hear the question again"
                        className={`${styles.speakerButton} flex h-10 w-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2 sm:h-12 sm:w-12`}
                      >
                        <Volume2 aria-hidden="true" className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.5} />
                      </button>
                    </div>
                    {/* Both pictures start at the same left edge, so the child compares where they end. */}
                    <div className={`${styles.pictures} relative flex flex-col items-start justify-center gap-4 sm:gap-6`}>
                      {order.map((choice) => picture(currentRound, choice, st))}
                    </div>
                  </motion.div>
                );
              })()}
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
                      {r.label}: {s.status === "correct" ? "correct" : "missed"}
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
