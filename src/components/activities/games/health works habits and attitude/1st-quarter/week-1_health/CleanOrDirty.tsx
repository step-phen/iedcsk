"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { useImagePreload } from "@/hooks/useImagePreload";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import RealisticEffect from "@/components/effects/RealisticEffect";
import FireworksEffect from "@/components/effects/FireworksEffect";
import { cn } from "@/lib/utils";
import {
  ASSETS,
  BINS,
  CORRECT_PAUSE_MS,
  PICTURES,
  WRONG_PAUSE_MS,
  answerSpeech,
  feedbackText,
  friendlyName,
  promptSpeech,
  questionSpeech,
  resultSpeech,
  type Choice,
} from "./CleanOrDirty.data";
import styles from "./CleanOrDirty.module.css";

/* ------------------------------------------------------------------ */
/*  CLEAN OR DIRTY? — Kindergarten Hygiene Sorting Game                 */
/*  Tap the correct bin. Auto-advances. Stars earned at the end.        */
/* ------------------------------------------------------------------ */

interface Round {
  id: string;
  name: string;
  clean: boolean;
  src: string;
}

/** Question data as stored in `activity_questions.question_data`. */
interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

// The picture itself comes from the data file, so it is set inline.
const BG_STYLE = { backgroundImage: `url(${ASSETS.background})` } as const;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ------------------------------ Sound ----------------------------------- */

function useChime() {
  const ctxRef = useRef<AudioContext | null>(null);
  return useCallback((positive: boolean) => {
    try {
      if (!ctxRef.current) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctxRef.current = new AC();
      }
      const ctx = ctxRef.current;
      const now = ctx.currentTime;
      const notes = positive ? [523.25, 659.25, 783.99] : [330, 262];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.2, now + i * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.22);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.24);
      });
    } catch {
      /* audio unavailable */
    }
  }, []);
}

/* -------------------------------- Parts ---------------------------------- */

type Feedback = "correct" | "wrong" | null;

/** One star, filled when earned. */
function StarIcon({ filled, className, style }: { filled: boolean; className: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} style={style}>
      <path
        className={cn(styles.starPath, filled && styles.starPathFilled)}
        d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.3l-5.8 3.1 1.1-6.45-4.7-4.6 6.5-.95L12 2.5z"
      />
    </svg>
  );
}

/** One star per picture: filled once answered right, empty after a miss, and bobbing for the current picture. */
function StarProgress({ results, current, total }: { results: boolean[]; current: number; total: number }) {
  return (
    <div role="img" aria-label={`Picture ${Math.min(current + 1, total)} of ${total}`} className={styles.stars}>
      {Array.from({ length: total }).map((_, i) => {
        const answered = results[i] !== undefined;
        return (
          <StarIcon
            key={i}
            filled={results[i] === true}
            className={cn(styles.star, !answered && i > current && styles.starAhead, !answered && i === current && styles.starCurrent)}
          />
        );
      })}
    </div>
  );
}

/** A big bin button; after an answer the right bin glows with a check. */
function Bin({ choice, state, onPick }: { choice: Choice; state: "idle" | "right" | "missed" | "dim"; onPick: () => void }) {
  const bin = BINS[choice];
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={state !== "idle"}
      aria-label={bin.label}
      className={cn(
        styles.press,
        styles.bin,
        choice === "clean" ? styles.binClean : styles.binDirty,
        state === "right" && styles.binRight,
        state === "missed" && styles.binMissed,
        state === "dim" && styles.binDim,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- local artwork in a fixed slot */}
      <img src={bin.src} alt="" className={styles.binImage} />
      {state === "right" && (
        <span className={styles.check} aria-hidden="true">
          ✓
        </span>
      )}
    </button>
  );
}

/* -------------------------------- App ------------------------------------ */

export default function CleanOrDirty({
  activityId,
  activityName,
  onFinish,
}: GameComponentProps) {
  const { speak, speakAll, stop } = useSpeech();

  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Question data lives in the DB (activity_questions), fetched once — every
  // other activity in this app works the same way. Only which key is clean
  // vs dirty comes from the server; the pictures are in the data file.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    if (!activityId) {
      setLoadError(true);
      return;
    }

    let cancelled = false;
    setLoadError(false);

    (async () => {
      try {
        const res = await fetch(`/api/activities/${activityId}/questions`);
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        const rows: QuestionRow[] = await res.json();
        if (cancelled) return;

        const mapped: Round[] = rows
          .filter((row) => row.questionKey in PICTURES)
          .map((row) => ({
            id: row.questionKey,
            name: PICTURES[row.questionKey].name,
            clean: row.correctAnswer.answer === "clean",
            src: PICTURES[row.questionKey].src,
          }));

        setRounds(shuffle(mapped));
      } catch (err) {
        console.error("Failed to load Clean or Dirty questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId, attempt]);

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [chosen, setChosen] = useState<Choice | null>(null);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<SubmittedAnswer[]>([]);
  // One entry per answered picture, true when it was right; drives the stars.
  const [results, setResults] = useState<boolean[]>([]);
  const [confettiOn, setConfettiOn] = useState(false);
  const playChime = useChime();

  const total = rounds?.length ?? 0;
  const item = rounds ? rounds[index] : undefined;
  // The next picture loads while this one is on screen.
  useImagePreload([rounds?.[index + 1]?.src]);
  const rightChoice: Choice | null = item ? (item.clean ? "clean" : "dirty") : null;

  useEffect(() => stop, [stop]);

  // Runs after the spoken answer, but never before the minimum pause, so a short line still leaves time to look.
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    },
    [],
  );

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);

  // The intro plays once, then chains into the first picture's question; later pictures queue behind the answer line.
  const introStateRef = useRef<"pending" | "speaking" | "done">("pending");
  useEffect(() => {
    if (!rounds || !item || finished) return;

    if (introStateRef.current === "pending") {
      introStateRef.current = "speaking";
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["clean or dirty"]], () => {
        introStateRef.current = "done";
        speak(questionSpeech(index, total, item.name), undefined, { interrupt: false });
      });
      return;
    }

    if (introStateRef.current === "speaking") return;

    speak(questionSpeech(index, total, item.name), undefined, { interrupt: false });
  }, [rounds, item, index, total, finished, speak, speakAll]);

  const finishedRef = useRef(false);
  const finishOnce = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    stop();
    onFinish?.(answers);
  }, [onFinish, stop, answers]);

  // The result is read out, then the answers are sent; the replay button also finishes, since replaying cancels the first line's onEnd.
  const resultLine = resultSpeech(score, total);
  useEffect(() => {
    if (finished) speak(resultLine, finishOnce);
  }, [finished, resultLine, speak, finishOnce]);

  const handleChoice = (choice: Choice) => {
    if (feedback || !item) return;
    const isCorrect = (choice === "clean") === item.clean;
    setChosen(choice);
    setFeedback(isCorrect ? "correct" : "wrong");
    playChime(isCorrect);
    setResults((r) => [...r, isCorrect]);
    if (isCorrect) {
      setScore((s) => s + 1);
      setConfettiOn(true);
    }

    const nextAnswers = [...answers, { questionId: item.id, response: choice }];
    setAnswers(nextAnswers);

    const advance = () => {
      setConfettiOn(false);
      if (rounds && index < rounds.length - 1) {
        setIndex((i) => i + 1);
        setFeedback(null);
        setChosen(null);
      } else {
        setFinished(true);
      }
    };

    // Answering cuts off the intro or question still playing, so the answer line is heard right away.
    // The next picture comes when the line ends (useSpeech still calls onEnd when a clip fails), not on a fixed timer.
    introStateRef.current = "done";
    const shownAt = Date.now();
    const minimum = isCorrect ? CORRECT_PAUSE_MS : WRONG_PAUSE_MS;
    speak(answerSpeech(isCorrect, item.clean), () => {
      advanceTimerRef.current = setTimeout(advance, Math.max(0, minimum - (Date.now() - shownAt)));
    });
  };

  const binState = (choice: Choice): "idle" | "right" | "missed" | "dim" => {
    if (!feedback) return "idle";
    if (choice === rightChoice) return "right";
    return chosen === choice ? "missed" : "dim";
  };

  if (loadError) {
    return (
      <div className={cn(styles.screen, styles.centered)} style={BG_STYLE}>
        <p className={styles.message}>We couldn&apos;t get the pictures ready.</p>
        <button type="button" className={cn(styles.press, styles.retryButton)} onClick={() => setAttempt((a) => a + 1)}>
          Try Again 🔄
        </button>
      </div>
    );
  }

  if (!rounds || !item) {
    return (
      <div className={cn(styles.screen, styles.centered)} style={BG_STYLE}>
        <span aria-hidden="true" className={styles.loadingIcon}>
          🧼
        </span>
        <p className={styles.message}>Getting ready…</p>
      </div>
    );
  }

  return (
    <div className={styles.screen} style={BG_STYLE}>
      <RealisticEffect active={confettiOn} originX={50} originY={42} />
      {/* A longer celebration once all the pictures are done. */}
      <FireworksEffect active={finished} />

      {learnerName && (
        <div className={styles.nameChip}>
          <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={styles.avatar} />
          <span className={styles.nameChipText}>{learnerName}</span>
        </div>
      )}

      <div className={styles.starsCorner}>
        <StarProgress results={results} current={index} total={total} />
        {feedback && (
          <div key={index} role="status" className={cn(styles.feedback, feedback === "correct" ? styles.feedbackCorrect : styles.feedbackTry)}>
            <span aria-hidden="true">{feedback === "correct" ? "⭐" : "💡"}</span>
            {feedbackText(feedback === "correct", item.clean)}
          </div>
        )}
      </div>

      <div className={styles.board}>
        <h1 className={styles.title}>{activityName || "Clean or Dirty?"}</h1>


        {!finished ? (
          <>
            <div className={styles.question}>
              <span>
                Is it <span className={styles.questionClean}>CLEAN</span> or <span className={styles.questionDirty}>DIRTY</span>?
              </span>
              <button
                type="button"
                className={cn(styles.press, styles.iconButton)}
                onClick={() => speak(promptSpeech(item.name))}
                disabled={!!feedback}
                aria-label="Hear the question again"
              >
                <Volume2 size={22} strokeWidth={2.6} color="#1e3a5f" />
              </button>
            </div>

            <div className={styles.pictureArea}>
              <div key={index} className={styles.pictureCard}>
                {/* eslint-disable-next-line @next/next/no-img-element -- plain img so the preload above hits the same URL */}
                <img src={item.src} alt="" className={styles.picture} />
                <div className={styles.pictureName}>{friendlyName(item.name)}</div>

              </div>
            </div>

            <div className={styles.bins}>
              <Bin choice="clean" state={binState("clean")} onPick={() => handleChoice("clean")} />
              <Bin choice="dirty" state={binState("dirty")} onPick={() => handleChoice("dirty")} />
            </div>
          </>
        ) : (
          <div className={styles.done}>
            <div className={styles.doneTitle}>{learnerName ? `Great job, ${learnerName}!` : "Great job!"}</div>
            <div className={cn(styles.stars, styles.starsLarge)} role="img" aria-label={`${score} out of ${total} stars`}>
              {Array.from({ length: total }).map((_, i) => (
                <StarIcon
                  key={i}
                  filled={i < score}
                  className={cn(styles.starLarge, i < score && styles.starEarned)}
                  style={i < score ? { animationDelay: `${i * 0.15}s` } : undefined}
                />
              ))}
            </div>
            <div className={styles.doneScore}>
              {score} out of {total}
            </div>
            <button
              type="button"
              className={cn(styles.press, styles.iconButton, styles.iconButtonLarge)}
              onClick={() => speak(resultLine, finishOnce)}
              aria-label="Hear it again"
            >
              <Volume2 size={32} strokeWidth={2.6} color="#1e3a5f" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
