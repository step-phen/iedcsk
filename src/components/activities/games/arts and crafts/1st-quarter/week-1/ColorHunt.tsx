"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Check, Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { useImagePreload } from "@/hooks/useImagePreload";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import RealisticEffect from "@/components/effects/RealisticEffect";
import FireworksEffect from "@/components/effects/FireworksEffect";
import { cn, shuffle } from "@/lib/utils";
import {
  ASSETS,
  COLORS,
  COLOR_KEYS,
  CORRECT_COUNT,
  FOUND_PAUSE_MS,
  MAX_ATTEMPTS,
  MISSED_PAUSE_MS,
  OBJECTS_PER_ROUND,
  SHAPES,
  correctTapSpeech,
  missedSpeech,
  objectImage,
  wrongTapSpeech,
  feedbackText,
  instructionText,
  isColorKey,
  questionSpeech,
  resultSpeech,
  type ColorKey,
  type ShapeKey,
} from "./ColorHunt.data";
import styles from "./ColorHunt.module.css";

/* ------------------------------------------------------------------ */
/*  COLOR HUNT — Kindergarten Arts and Crafts activity                  */
/*  Find the objects of the called-out color. Stars earned at the end.  */
/* ------------------------------------------------------------------ */

// The picture itself comes from the data file, so it is set inline.
const BG_STYLE = { backgroundImage: `url(${ASSETS.background})` } as const;

/** Question data as stored in `activity_questions.question_data`. */
interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

interface SceneObject {
  id: string;
  color: ColorKey;
  shape: ShapeKey;
}

interface Round {
  id: string;
  target: ColorKey;
  objects: SceneObject[];
}

type Phase = "playing" | "roundComplete" | "complete";
type RoundOutcome = "found" | "missed";

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRound(roundId: string, target: ColorKey): Round {
  const distractorCount = OBJECTS_PER_ROUND - CORRECT_COUNT;
  const otherColors = COLOR_KEYS.filter((c) => c !== target);

  const objects: SceneObject[] = [];
  for (let i = 0; i < CORRECT_COUNT; i++) {
    objects.push({ id: `${roundId}-c${i}`, color: target, shape: SHAPES[randInt(0, SHAPES.length - 1)] });
  }
  for (let i = 0; i < distractorCount; i++) {
    objects.push({
      id: `${roundId}-d${i}`,
      color: otherColors[randInt(0, otherColors.length - 1)],
      shape: SHAPES[randInt(0, SHAPES.length - 1)],
    });
  }

  return { id: roundId, target, objects: shuffle(objects) };
}

/* -------------------------------- Parts ---------------------------------- */

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

/** One star per round: filled once its colors were found, empty after a miss, and bobbing for the current round. */
function StarProgress({ results, current, total }: { results: boolean[]; current: number; total: number }) {
  return (
    <div role="img" aria-label={`Round ${Math.min(current + 1, total)} of ${total}`} className={styles.stars}>
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

/* -------------------------------- Game ----------------------------------- */

export default function ColorHunt({ activityId, activityName, onFinish }: GameComponentProps) {
  const { speak, speakAll, stop } = useSpeech();

  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Only the target color comes from the server; the scene layout is rolled fresh each playthrough for variety.
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

        setRounds(
          rows.map((row) => {
            const data = row.questionData as { target?: string };
            return generateRound(row.questionKey, isColorKey(data.target) ? data.target : COLOR_KEYS[0]);
          }),
        );
      } catch (err) {
        console.error("Failed to load Color Hunt questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId, attempt]);

  const totalRounds = rounds?.length ?? 0;

  const [roundIndex, setRoundIndex] = useState(0);
  const [foundIds, setFoundIds] = useState<Set<string>>(() => new Set());
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("playing");
  const [outcomes, setOutcomes] = useState<Record<string, RoundOutcome>>({});
  // One entry per finished round, true when all its colors were found; drives the stars.
  const [results, setResults] = useState<boolean[]>([]);
  const [confettiOn, setConfettiOn] = useState(false);
  // The line shown in the result pill is the same one that is spoken.
  const [roundLine, setRoundLine] = useState("");

  const round = rounds?.[roundIndex];
  useImagePreload([...(round?.objects ?? []), ...(rounds?.[roundIndex + 1]?.objects ?? [])].map((o) => objectImage(o.shape, o.color)));
  const stars = results.filter(Boolean).length;
  const complete = phase === "complete";

  useEffect(() => stop, [stop]);

  // Runs after the spoken result, but never before the minimum pause, so a short line still leaves time to look.
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

  // The intro plays once, then chains into the first round's question; later rounds queue behind the result line.
  const introStateRef = useRef<"pending" | "speaking" | "done">("pending");
  useEffect(() => {
    if (!rounds || !round) return;

    if (introStateRef.current === "pending") {
      introStateRef.current = "speaking";
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["color hunt"]], () => {
        introStateRef.current = "done";
        speak(questionSpeech(roundIndex, totalRounds, round.target), undefined, { interrupt: false });
      });
      return;
    }

    if (introStateRef.current === "speaking") return;
    speak(questionSpeech(roundIndex, totalRounds, round.target), undefined, { interrupt: false });
  }, [rounds, round, roundIndex, totalRounds, speak, speakAll]);

  const finishedRef = useRef(false);
  const finishOnce = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    stop();
    const submitted: SubmittedAnswer[] = Object.entries(outcomes).map(([id, outcome]) => ({ questionId: id, response: outcome }));
    onFinish?.(submitted);
  }, [onFinish, stop, outcomes]);

  // The result is read out, then the answers are sent; the replay button also finishes, since replaying cancels the first line's onEnd.
  const resultLine = resultSpeech(stars, totalRounds);
  useEffect(() => {
    if (complete) speak(resultLine, finishOnce);
  }, [complete, resultLine, speak, finishOnce]);

  const finishRound = (found: boolean, lastWasWrong = false) => {
    if (!round) return;
    setOutcomes((o) => ({ ...o, [round.id]: found ? "found" : "missed" }));
    setResults((r) => [...r, found]);
    setPhase("roundComplete");
    if (found) setConfettiOn(true);

    const advance = () => {
      setConfettiOn(false);
      if (rounds && roundIndex < rounds.length - 1) {
        setRoundIndex((i) => i + 1);
        setFoundIds(new Set());
        setAttemptsUsed(0);
        setWrongId(null);
        setPhase("playing");
      } else {
        setPhase("complete");
      }
    };

    // The next round waits for both the spoken line (useSpeech still calls onEnd when a clip fails) and the minimum pause.
    introStateRef.current = "done";
    let spoken = false;
    let waited = false;
    const tryAdvance = () => {
      if (spoken && waited) advance();
    };
    advanceTimerRef.current = setTimeout(() => {
      waited = true;
      tryAdvance();
    }, found ? FOUND_PAUSE_MS : MISSED_PAUSE_MS);
    const line = found ? feedbackText(true) : missedSpeech(round.target, lastWasWrong);
    setRoundLine(line);
    speak(line, () => {
      spoken = true;
      tryAdvance();
    });
  };

  const handleTap = (obj: SceneObject) => {
    if (phase !== "playing" || !round || foundIds.has(obj.id)) return;

    const nextAttempts = attemptsUsed + 1;
    setAttemptsUsed(nextAttempts);

    let allFound = false;
    if (obj.color === round.target) {
      const next = new Set(foundIds);
      next.add(obj.id);
      setFoundIds(next);
      allFound = next.size === CORRECT_COUNT;
      // The last one is answered by the round's own feedback line instead.
      if (!allFound) speak(correctTapSpeech(round.target, next.size));
    } else {
      setWrongId(obj.id);
      setTimeout(() => setWrongId((id) => (id === obj.id ? null : id)), 450);
      // The last pick is answered by the round's own line instead.
      if (nextAttempts < MAX_ATTEMPTS) speak(wrongTapSpeech(round.target));
    }

    // The round always moves on: every color found, or all the picks used.
    if (allFound || nextAttempts >= MAX_ATTEMPTS) finishRound(allFound, obj.color !== round.target);
  };

  if (loadError) {
    return (
      <div className={cn(styles.screen, styles.centered)} style={BG_STYLE}>
        <p className={styles.message}>We couldn&apos;t get the game ready.</p>
        <button type="button" className={cn(styles.press, styles.retryButton)} onClick={() => setAttempt((a) => a + 1)}>
          Try Again 🔄
        </button>
      </div>
    );
  }

  if (!rounds || !round) {
    return (
      <div className={cn(styles.screen, styles.centered)} style={BG_STYLE}>
        <span aria-hidden="true" className={styles.loadingIcon}>
          🎨
        </span>
        <p className={styles.message}>Getting ready…</p>
      </div>
    );
  }

  const target = COLORS[round.target];
  const picksLeft = Math.max(0, MAX_ATTEMPTS - attemptsUsed);
  const lastResult = results[results.length - 1];
  // After a missed round the right objects are pointed out and the rest fade back.
  const revealing = phase === "roundComplete" && lastResult === false;

  return (
    <div className={styles.screen} style={BG_STYLE}>
      <RealisticEffect active={confettiOn} originX={50} originY={55} />
      {/* A longer celebration once all the rounds are done. */}
      <FireworksEffect active={complete} />

      {learnerName && (
        <div className={styles.nameChip}>
          <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={styles.avatar} />
          <span className={styles.nameChipText}>{learnerName}</span>
        </div>
      )}

      <div className={styles.starsCorner}>
        <StarProgress results={results} current={roundIndex} total={totalRounds} />
        {phase === "roundComplete" && (
          <div key={roundIndex} role="status" className={cn(styles.feedback, lastResult ? styles.feedbackFound : styles.feedbackMissed)}>
            <span aria-hidden="true">{lastResult ? "⭐" : "💡"}</span>
            {roundLine}
          </div>
        )}
      </div>

      <div className={styles.board}>
        <h1 className={styles.title}>{activityName || "Color Hunt"}</h1>

        {!complete ? (
          <>
            <div className={styles.question}>
              <span>{instructionText(round.target)}</span>
              <button
                type="button"
                className={cn(styles.press, styles.iconButton)}
                onClick={() => speak(questionSpeech(0, totalRounds, round.target))}
                disabled={phase !== "playing"}
                aria-label="Hear the instruction again"
              >
                <Volume2 size={22} strokeWidth={2.6} color="#16215c" />
              </button>
            </div>

            <div className={styles.swatch} style={{ "--light": target.light, "--dark": target.dark } as React.CSSProperties}>
              <span className={styles.swatchDot} />
              {target.name}
            </div>

            <div className={styles.picks} role="img" aria-label={`${picksLeft} picks left`}>
              {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                <span key={i} className={cn(styles.pick, i >= picksLeft && styles.pickSpent)} />
              ))}
            </div>

            <main className={styles.scene}>
              {round.objects.map((obj) => {
                const found = foundIds.has(obj.id);
                return (
                  <button
                    key={obj.id}
                    type="button"
                    className={cn(
                      styles.press,
                      styles.object,
                      found && styles.objectFound,
                      wrongId === obj.id && styles.objectWrong,
                      revealing && !found && (obj.color === round.target ? styles.objectReveal : styles.objectDim),
                    )}
                    onClick={() => handleTap(obj)}
                    disabled={phase !== "playing"}
                    aria-label={`${COLORS[obj.color].name.toLowerCase()} ${obj.shape}`}
                  >
                    {found && (
                      <span className={styles.check} aria-hidden="true">
                        <Check size={20} strokeWidth={4} color="#ffffff" />
                      </span>
                    )}
                    {/* eslint-disable-next-line @next/next/no-img-element -- plain img so the preload hits the same URL */}
                    <img src={objectImage(obj.shape, obj.color)} alt="" draggable={false} className={styles.objectArt} />
                  </button>
                );
              })}
            </main>
          </>
        ) : (
          <div className={styles.done}>
            <div className={styles.doneTitle}>Great job!</div>
            <div className={cn(styles.stars, styles.starsLarge)} role="img" aria-label={`${stars} out of ${totalRounds} stars`}>
              {Array.from({ length: totalRounds }).map((_, i) => (
                <StarIcon
                  key={i}
                  filled={i < stars}
                  className={cn(styles.starLarge, i < stars && styles.starEarned)}
                  style={i < stars ? { animationDelay: `${i * 0.15}s` } : undefined}
                />
              ))}
            </div>
            <div className={styles.doneScore}>
              {stars} out of {totalRounds}
            </div>
            <button
              type="button"
              className={cn(styles.press, styles.iconButton, styles.iconButtonLarge)}
              onClick={() => speak(resultLine, finishOnce)}
              aria-label="Hear it again"
            >
              <Volume2 size={32} strokeWidth={2.6} color="#16215c" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
