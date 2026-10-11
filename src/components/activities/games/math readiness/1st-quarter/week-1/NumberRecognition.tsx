"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import Image from "next/image";

import { shuffle, cn } from "@/lib/utils";
import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, pickRandom } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { useImagePreload } from "@/hooks/useImagePreload";
import {
  ASSETS,
  MAX_CHOICE,
  OBJECTS,
  SPEECH,
  correctSpeech,
  firstRoundSpeech,
  nextRoundSpeech,
  objectAsset,
  objectName,
  resultHeadline,
  resultSpeech,
  roundPrompt,
  wrongSpeech,
} from "./NumberRecognition.data";
import styles from "./NumberRecognition.module.css";

// The rest of the backdrop lives in .screen.
const BG_STYLE = { backgroundImage: `url(${ASSETS.background})` } as const;

/** One round as consumed by this component, mapped from the API. */
interface Round {
  /** The row's own question_key, which grading matches answers on. */
  key: string;
  object: string;
  count: number;
  choices: number[];
}

interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "roundComplete" | "complete";

/** The right count and the two nearest other numbers from 1 up, shuffled. */
function buildChoices(count: number): number[] {
  const others = Array.from({ length: Math.max(MAX_CHOICE, count) }, (_, i) => i + 1)
    .filter((n) => n !== count)
    .sort((a, b) => Math.abs(a - count) - Math.abs(b - count));
  return shuffle([count, ...others.slice(0, 2)]);
}

/** A round from its DB row ({object, count}, answer the count as text). */
function buildRound(row: QuestionRow): Round {
  const { object, count } = row.questionData as { object: unknown; count: unknown };
  if (typeof object !== "string" || !(object in OBJECTS) || !Number.isInteger(count) || (count as number) < 1 || row.correctAnswer.answer !== String(count)) {
    throw new Error(`Question ${row.questionKey} needs a known "object" and a "count" matching its answer`);
  }
  return { key: row.questionKey, object, count: count as number, choices: buildChoices(count as number) };
}

export default function NumberRecognition({ activityId, activityName, onFinish }: GameComponentProps) {
  // CSS backgrounds aren't seen by the browser's preload scanner, so the shared backdrop gets a real preload link.
  ReactDOM.preload(ASSETS.background, { as: "image" });
  const { speak, speakAll, stop } = useSpeech();

  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Per-round outcome: true for a right first tap, false for a miss, null while not answered yet.
  const [roundResults, setRoundResults] = useState<(boolean | null)[]>([]);

  // Rounds live in the DB (activity_questions), null until loaded.
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

        const mapped = rows.map(buildRound);
        setRounds(mapped);
        setRoundResults(Array(mapped.length).fill(null));
      } catch (err) {
        console.error("Failed to load Number Recognition questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId, reloadKey]);

  const handleRetry = useCallback(() => {
    setLoadError(false);
    setReloadKey((key) => key + 1);
  }, []);

  const total = rounds?.length ?? 0;

  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<SubmittedAnswer[]>([]);
  // How many objects have been counted aloud after a miss; those light up.
  const [counted, setCounted] = useState(0);

  const round = rounds?.[roundIndex];
  // Warm only the next round's picture, never the whole activity at once.
  const nextRound = rounds?.[roundIndex + 1];
  useImagePreload(nextRound ? [objectAsset(nextRound.object)] : []);
  const title = activityName || "Number Recognition";
  const prompt = round ? roundPrompt(round.object) : "";

  useEffect(() => stop, [stop]);

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);

  // Plays once, before the very first round, and chains into that round's own
  // prompt via onEnd so the two lines never overlap. "introState" (not a
  // boolean) is what keeps it safe under StrictMode's dev-only double-invoke.
  const introStateRef = useRef<"pending" | "speaking" | "done">("pending");
  useEffect(() => {
    if (!rounds || !round || phase === "complete") return;

    if (introStateRef.current === "pending") {
      introStateRef.current = "speaking";
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["number recognition"]], () => {
        introStateRef.current = "done";
        // interrupt: false so this never cuts off a feedback line whose onEnd advances the round.
        speak(firstRoundSpeech(prompt), undefined, { interrupt: false });
      });
      return;
    }

    if (introStateRef.current === "speaking") return;

    // Only while a round is in play, or the playing -> roundComplete flip would re-announce the round just finished.
    if (phase !== "playing") return;

    // interrupt: false so it queues behind the feedback line that advanced the round.
    speak(nextRoundSpeech(roundIndex + 1, roundIndex === rounds.length - 1, prompt), undefined, { interrupt: false });
    // prompt is derived from the round, so keying on the index keeps this to one line per round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex, phase, speak, speakAll]);

  // Advancement rides on the feedback line finishing, so a stray double-fire
  // would skip a round outright. One advance per round, enforced here.
  const advancingRef = useRef(false);
  useEffect(() => {
    advancingRef.current = false;
  }, [roundIndex]);

  const advanceRound = useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    if (roundIndex + 1 >= total) {
      setPhase("complete");
    } else {
      setPicked(null);
      setCounted(0);
      setPhase("playing");
      setRoundIndex(roundIndex + 1);
    }
  }, [roundIndex, total]);

  const handleChoice = useCallback(
    (choice: number) => {
      // One tap per round: the first answer is the one graded.
      if (phase !== "playing" || !round) return;

      const isCorrect = choice === round.count;
      setPicked(choice);
      setPhase("roundComplete");
      if (isCorrect) setScore((s) => s + 1);
      setRoundResults((prev) => {
        const next = [...prev];
        next[roundIndex] = isCorrect;
        return next;
      });
      setAnswers((prev) => [...prev, { questionId: round.key, response: String(choice) }]);

      // Answering cuts off the intro or prompt still playing, so the feedback is heard right away.
      // An interrupted intro never runs its onEnd, so it is marked done here or later rounds would never be announced.
      introStateRef.current = "done";
      // The board advances from onEnd so narration and screen stay in step; useSpeech still runs onEnd when a clip fails.
      if (isCorrect) {
        speak(correctSpeech(pickRandom(SPEECH.correct), round.object, round.count), advanceRound);
        return;
      }

      // A miss counts the objects together while the right number zooms in: each line's end lights the next object just as its number is said.
      const { lead, counting, closing } = wrongSpeech(pickRandom(SPEECH.wrong), choice, round.object, round.count);
      // No pause after the lead and between numbers, so the count flows like a teacher counting aloud.
      speak(lead, () => setCounted(1), { pauseMs: 0 });
      counting.forEach((line, i) => speak(line, i + 1 < counting.length ? () => setCounted(i + 2) : undefined, { interrupt: false, pauseMs: 0 }));
      speak(closing, advanceRound, { interrupt: false });
    },
    [phase, round, roundIndex, speak, advanceRound],
  );

  // No Finish button: once the result line has been spoken, the answers are sent and the learner goes on to the class-ended page.
  const finishedRef = useRef(false);
  const finishOnce = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.(answers);
  }, [onFinish, answers]);

  // Read out on the completion screen; its 🔊 replay also finishes, since replaying cancels the first line's onEnd.
  const resultLine = resultSpeech(score, total);
  useEffect(() => {
    if (phase === "complete") speak(resultLine, finishOnce);
  }, [phase, resultLine, speak, finishOnce]);

  if (loadError) {
    return (
      <div style={BG_STYLE} className={`${styles.screen} fixed inset-0 flex h-dvh w-full flex-col items-center justify-center gap-5 px-6 text-center`}>
        <p className="text-xl font-bold sm:text-2xl">We couldn&apos;t get the numbers ready.</p>
        <button
          type="button"
          onClick={handleRetry}
          className={`${styles.retryButton} min-h-14 rounded-full px-10 py-3 text-xl font-bold outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0]/50 sm:text-2xl`}
        >
          Try Again 🔄
        </button>
      </div>
    );
  }

  if (!rounds || !round) {
    return (
      <div style={BG_STYLE} className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 text-center`}>
        <p className="text-xl font-bold sm:text-2xl">Getting the numbers ready…</p>
      </div>
    );
  }

  const missed = phase === "roundComplete" && roundResults[roundIndex] === false;

  const choiceState = (choice: number): "correct" | "reveal" | "wrong" | "dimmed" | "default" => {
    if (phase !== "roundComplete") return "default";
    if (choice === picked) return missed ? "wrong" : "correct";
    if (missed && choice === round.count) return "reveal";
    return "dimmed";
  };

  return (
    <div style={BG_STYLE} className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full flex-col items-center overflow-hidden px-4 pb-3 pt-20 short:pt-2 lg:pt-4`}>
      {/* The name stays in the top-left corner on the result screen too; the live score leaves with the board. */}
      {learnerName && (
        <div className={`${styles.badge} fixed left-3 top-3 z-10 flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-xl font-extrabold short:py-1 short:text-base`}>
          <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={`${styles.avatar} size-11 text-xl short:size-8 short:text-base`} />
          <span className="max-w-48 truncate capitalize leading-none">{learnerName}</span>
        </div>
      )}
      {phase !== "complete" && (
        <div
          className={`${styles.badge} fixed right-3 top-3 z-10 flex items-center gap-1.5 rounded-full px-4 py-2 text-lg font-extrabold tabular-nums short:py-1 short:text-base`}
          aria-label={`Score: ${score} of ${total}`}
        >
          <span aria-hidden="true">⭐</span>
          {score}/{total}
        </div>
      )}

      {/* Still an h1 so the heading survives; height-capped since the 3:1 banner would crowd the board if sized by width. */}
      <h1 className="m-0 flex max-w-full shrink-0 justify-center">
        <Image
          src={ASSETS.title}
          alt={title}
          width={2172}
          height={724}
          priority
          draggable={false}
          className="h-[clamp(72px,19dvh,170px)] w-auto max-w-full select-none object-contain"
        />
      </h1>

      {phase === "complete" ? (
        <div className={`${styles.result} flex flex-1 flex-col items-center justify-center gap-5 text-center`}>
          <div className="flex items-center gap-3">
            <div className={`${styles.resultStamp} rounded-md px-6 py-2 text-2xl font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button
              type="button"
              onClick={() => speak(resultLine, finishOnce)}
              aria-label="Hear the result again"
              className={`${styles.speakerButton} flex size-10 shrink-0 items-center justify-center rounded-full text-lg`}
            >
              🔊
            </button>
          </div>
          <p className="m-0 text-xl font-bold">
            You got {score} of {total} correct!
          </p>
          <p className="m-0 text-[clamp(28px,5vh,44px)] tracking-[4px]" aria-label={`${score} of ${total} stars`}>
            {roundResults.map((result, i) => (
              <span key={i} className={result ? "" : "opacity-25 grayscale"} aria-hidden="true">
                ⭐
              </span>
            ))}
          </p>
        </div>
      ) : (
        <>
          <p className="m-0 shrink-0 text-center text-[clamp(16px,2.6vh,22px)] font-bold">
            Count the {OBJECTS[round.object].many}, then tap the right number.
          </p>

          <div className="mt-2 flex shrink-0 items-center justify-center gap-3 short:mt-1">
            {rounds.map((r, i) => (
              <span
                key={r.key}
                className={cn(
                  styles.dot,
                  i === roundIndex && styles.dotCurrent,
                  roundResults[i] === true && styles.dotRight,
                  roundResults[i] === false && styles.dotMissed,
                  "size-2.5 rounded-full transition-transform",
                )}
              />
            ))}
          </div>

          <main key={round.key} className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(12px,3.5vh,32px)]">
            <div className="flex items-center gap-2">
              <p className="m-0 text-center text-[clamp(22px,4vh,34px)] font-extrabold leading-tight">How many {OBJECTS[round.object].many}?</p>
              <button
                type="button"
                // Only while the round is open: replaying over the feedback line would cancel the onEnd that moves to the next round.
                onClick={() => speak(prompt)}
                disabled={phase !== "playing"}
                aria-label="Hear the question again"
                className={`${styles.speakerButton} flex size-10 shrink-0 items-center justify-center rounded-full text-lg short:size-8 short:text-base`}
              >
                🔊
              </button>
            </div>

            <div role="img" className="flex max-w-4xl flex-wrap items-center justify-center gap-[clamp(10px,2vh,18px)]" aria-label={`${round.count} ${objectName(round.object, round.count)}`}>
              {Array.from({ length: round.count }, (_, i) => (
                <Image
                  key={i}
                  src={objectAsset(round.object)}
                  alt=""
                  width={320}
                  height={320}
                  loading="eager"
                  draggable={false}
                  className={cn("size-[clamp(64px,min(18vh,17vw),160px)] select-none object-contain", i < counted && styles.objectCounted)}
                />
              ))}
            </div>

            <div className="flex items-center justify-center gap-[clamp(14px,3vw,28px)]">
              {round.choices.map((choice) => {
                const state = choiceState(choice);
                return (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => handleChoice(choice)}
                    disabled={phase !== "playing"}
                    className={cn(
                      styles.choice,
                      state === "correct" && styles.choiceCorrect,
                      state === "reveal" && styles.choiceReveal,
                      state === "wrong" && styles.choiceWrong,
                      state === "dimmed" && styles.choiceDimmed,
                      "relative flex size-[clamp(72px,15vh,112px)] items-center justify-center rounded-2xl text-[clamp(36px,7.5vh,60px)] font-extrabold leading-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2",
                      phase === "playing" ? "cursor-pointer" : "cursor-default",
                    )}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
