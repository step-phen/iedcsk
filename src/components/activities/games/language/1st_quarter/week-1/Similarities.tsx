"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import Image from "next/image";
import { Check } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { getLearnerFirstName, getLearnerPhotoUrl, pickRandom, useSpeech } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { useImagePreload } from "@/hooks/useImagePreload";
import RealisticEffect from "@/components/effects/RealisticEffect";
import FireworksEffect from "@/components/effects/FireworksEffect";
import { cn } from "@/lib/utils";
import {
  ASSETS,
  SPEECH,
  correctSpeech,
  firstRoundSpeech,
  nextRoundSpeech,
  objectAsset,
  resultSpeech,
  roundPrompt,
  scoreBannerAsset,
  wordLabel,
  wrongSpeech,
} from "./Similarities.data";
import styles from "./Similarities.module.css";

/* ------------------------------------------------------------------ */
/*  SIMILARITIES — Kindergarten Language / Cognitive activity          */
/* ------------------------------------------------------------------ */

/** How long a wrongly-tapped card keeps its shake before settling. */
const WRONG_SHAKE_MS = 500;

interface Choice {
  id: string;
  object: string;
}

/** One round as consumed by this component, mapped from the API. */
interface RoundData {
  /** The question_key the pick is submitted under, so grading matches the DB row. */
  id: string;
  target: string;
  choices: Choice[];
}

interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "roundComplete" | "complete";

// The rest of the backdrop lives in .screen; the artwork path stays with the other assets.
const BG_STYLE = { backgroundImage: `url(${ASSETS.background})` } as const;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Similarities({
  activityId,
  activityName,
  onFinish,
}: GameComponentProps) {
  // Rounds live in the DB (activity_questions), null until loaded; the target and distractors are shuffled here.
  const [rounds, setRounds] = useState<RoundData[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [selectedCorrectId, setSelectedCorrectId] = useState<string | null>(null);
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  // Per-round outcome, so a star is only filled for a round actually got right.
  const [roundResults, setRoundResults] = useState<(boolean | null)[]>([]);
  const [phase, setPhase] = useState<Phase>("playing");
  const [answers, setAnswers] = useState<SubmittedAnswer[]>([]);
  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [confettiOn, setConfettiOn] = useState(false);
  const [burstOrigin, setBurstOrigin] = useState({ x: 50, y: 50 });
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const { speak, speakAll, stop } = useSpeech();
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);

  // Leaving mid-round must not leave a praise line playing over the next screen.
  useEffect(() => stop, [stop]);

  useEffect(() => {
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

        const mapped: RoundData[] = rows.map((row, r) => {
          const { target, distractors } = row.questionData as { target: unknown; distractors: unknown };
          if (
            typeof target !== "string" ||
            !Array.isArray(distractors) ||
            !distractors.every((d) => typeof d === "string" && d !== target)
          ) {
            throw new Error(`Question ${row.questionKey} needs a "target" and "distractors" that differ from it`);
          }
          const choices = shuffle([target, ...(distractors as string[])]).map((object, c) => ({ id: `r${r}-c${c}`, object }));
          return { id: row.questionKey, target, choices };
        });

        setRounds(mapped);
        setRoundResults(Array(mapped.length).fill(null));
      } catch (err) {
        console.error("Failed to load Similarities questions:", err);
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
  const round = rounds?.[roundIndex];
  const title = (activityName || "SIMILARITIES").toUpperCase();
  // Warm only the next round's art, never the whole activity at once.
  const nextRound = rounds?.[roundIndex + 1];
  useImagePreload(nextRound ? nextRound.choices.map((c) => objectAsset(c.object)) : []);
  // CSS backgrounds aren't seen by <Image>, so this game's shared backdrop
  // gets a real preload link the same way <Image priority> images do.
  ReactDOM.preload(ASSETS.background, { as: "image" });

  // What the child is being asked to find this round — spoken, and repeatable from the 🔊 button beside the target.
  const prompt = round ? roundPrompt(round.target) : "";

  // Plays once, before the very first round, and chains into that round's own
  // prompt via onEnd so the two lines never overlap. "introState" (not a
  // boolean) is what keeps it safe under StrictMode's dev-only double-invoke.
  const introStateRef = useRef<"pending" | "speaking" | "done">("pending");
  useEffect(() => {
    if (!round || phase === "complete") return;

    if (introStateRef.current === "pending") {
      introStateRef.current = "speaking";
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["similarities"]], () => {
        introStateRef.current = "done";
        // interrupt: false so this never cuts off a feedback line whose onEnd advances the round.
        speak(firstRoundSpeech(prompt), undefined, { interrupt: false });
      });
      return;
    }

    if (introStateRef.current === "speaking") return;

    // Only while a round is in play, or the playing -> roundComplete flip would re-announce the round just finished.
    if (phase !== "playing") return;

    // interrupt: false so it queues behind the praise/nudge line that advanced the round.
    speak(nextRoundSpeech(roundIndex + 1, roundIndex === total - 1, prompt), undefined, { interrupt: false });
    // prompt is derived from roundIndex, so keying on the index alone keeps this to one line per round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex, phase, speak, speakAll]);

  // Advancement is driven by speech finishing, so a stray double-fire would
  // skip a question outright. One advance per round, enforced here.
  const advancingRef = useRef(false);
  useEffect(() => {
    advancingRef.current = false;
  }, [roundIndex]);

  const goToNextRound = useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    // Drop back to false so the next correct pick is a fresh rising edge.
    setConfettiOn(false);
    if (roundIndex < total - 1) {
      setSelectedCorrectId(null);
      setPhase("playing");
      setRoundIndex(roundIndex + 1);
    } else {
      setPhase("complete");
    }
  }, [roundIndex, total]);

  const handleCardClick = useCallback(
    (card: Choice) => {
      // There is one correct choice per round, so any pick ends the round.
      if (phase !== "playing" || !round) return;

      const isCorrect = card.object === round.target;
      const nextAnswers = [...answers, { questionId: round.id, response: card.object }];

      if (isCorrect) {
        setSelectedCorrectId(card.id);
        setScore((s) => s + 1);

        // Burst from the middle of the card they actually tapped, so the celebration is tied to their choice.
        const el = cardRefs.current[card.id];
        if (el) {
          const r = el.getBoundingClientRect();
          setBurstOrigin({
            x: ((r.left + r.width / 2) / window.innerWidth) * 100,
            y: ((r.top + r.height / 2) / window.innerHeight) * 100,
          });
        }
        setConfettiOn(true);
      } else {
        setWrongId(card.id);
        setTimeout(() => setWrongId((id) => (id === card.id ? null : id)), WRONG_SHAKE_MS);
      }

      // A miss names what they tapped, then the target, which the reveal zooms in on at the same time.
      const feedback = isCorrect
        ? correctSpeech(pickRandom(SPEECH.correct), card.object)
        : wrongSpeech(pickRandom(SPEECH.wrong), card.object, round.target);

      setRoundResults((prev) => {
        const next = [...prev];
        next[roundIndex] = isCorrect;
        return next;
      });
      setPhase("roundComplete");
      setAnswers(nextAnswers);

      // Answering cuts off the intro or prompt still playing, so the feedback is heard right away.
      // An interrupted intro never runs its onEnd, so it is marked done here or later rounds would never be announced.
      introStateRef.current = "done";
      // Advancing from onEnd holds the reveal on screen for as long as the line takes; useSpeech still calls onEnd if TTS fails.
      speak(feedback, goToNextRound);
    },
    [phase, round, roundIndex, answers, goToNextRound, speak],
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
      <div
        className={`${styles.screen} fixed inset-0 flex h-dvh w-full flex-col items-center justify-center gap-5 px-6 text-center font-baloo2`}
        style={BG_STYLE}
      >
        <p className="text-xl font-bold sm:text-2xl">We couldn&apos;t get the pictures ready.</p>
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
      <div
        className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 text-center font-baloo2`}
        style={BG_STYLE}
      >
        <p className="text-xl font-bold sm:text-2xl">Getting the pictures ready…</p>
      </div>
    );
  }

  // A missed round is the only chance the child gets to see which one matched.
  const missedRound = phase === "roundComplete" && roundResults[roundIndex] === false;

  const cardState = (card: Choice): "correct" | "reveal" | "wrong" | "dimmed" | "default" => {
    if (selectedCorrectId === card.id) return "correct";
    if (wrongId === card.id) return "wrong";
    if (missedRound) return card.object === round.target ? "reveal" : "dimmed";
    return "default";
  };

  return (
    <div
      className={`${styles.screen} fixed inset-0 h-dvh w-full box-border flex flex-col overflow-hidden font-baloo2 pt-[var(--top)] px-[clamp(14px,3vw,30px)] pb-[clamp(10px,2vh,20px)]`}
      style={BG_STYLE}
    >
      <RealisticEffect active={confettiOn} originX={burstOrigin.x} originY={burstOrigin.y} />
      {/* Sustained celebration once the whole activity is done. */}
      <FireworksEffect active={phase === "complete"} />

      {/* The name and title stay up on the result screen too; only the live score banner leaves with the board. */}
      {learnerName && (
        <div
          className={`${styles.badge} fixed top-[var(--edge)] left-[var(--side)] z-10 flex max-w-[var(--badge-max)] items-center gap-2 rounded-full py-1.5 pl-1.5 pr-5 text-[clamp(17px,2.6vh,24px)] font-extrabold`}
        >
          <LearnerAvatar
            photoUrl={photoUrl}
            firstName={learnerName}
            className={`${styles.avatar} h-[clamp(32px,5vh,44px)] w-[clamp(32px,5vh,44px)] text-[clamp(16px,2.4vh,22px)]`}
          />
          <span className="truncate capitalize leading-none">{learnerName}</span>
        </div>
      )}
      {/* Still an h1 so the heading survives; sized by --title-h, which keeps the ~2.9:1 banner clear of the badge and score. */}
      <h1 className="fixed top-[var(--title-top)] left-1/2 -translate-x-1/2 z-10 m-0 flex justify-center">
        <Image
          src={ASSETS.title}
          alt={title}
          width={846}
          height={290}
          priority
          className="h-[var(--title-h)] w-auto max-w-none object-contain"
        />
      </h1>

      {phase !== "complete" && (
        <>
          {/* The number is baked into the art, so alt carries the score and the total, which the art does not show. */}
          <Image
            src={scoreBannerAsset(score)}
            alt={`Score: ${score} / ${total}`}
            width={466}
            height={192}
            loading="eager"
            className="fixed top-[var(--edge)] right-[var(--side)] z-10 h-[var(--score-h)] w-auto object-contain"
          />

          {/* ---------- TOP ---------- */}
          <header className={`${styles.top} flex flex-col items-center justify-center gap-[2px] shrink-0`}>
            <div className={`${styles.instruction} text-[clamp(18px,3vh,30px)] font-bold mt-[2px] text-center`}>
              Tap the pictures that are the same.
            </div>

            <div className="flex gap-[clamp(6px,1vw,9px)] mt-[6px] flex-wrap justify-center">
              {rounds.map((r, i) => (
                <div
                  key={r.id}
                  className={cn(
                    "box-border flex items-center justify-center w-[clamp(30px,4.5vh,46px)] h-[clamp(30px,4.5vh,46px)] shrink-0 transition-transform duration-[120ms] ease-in-out",
                    i === roundIndex && "scale-125 animate-pulse drop-shadow-[0_0_10px_rgba(245,185,66,0.9)]",
                  )}
                >
                  <StarIcon filled={roundResults[i] === true} loading="eager" className="w-full h-full object-contain" />
                </div>
              ))}
            </div>
          </header>

          {/* ---------- CENTER: target on top, choices below ---------- */}
          <main className={`${styles.board} flex-1 flex flex-col items-center justify-center gap-[clamp(8px,1.8vh,16px)] min-h-0 mt-[2px]`}>
            <div className="flex flex-col items-center gap-[clamp(4px,1vh,8px)] shrink-0 mt-[clamp(6px,1.6vh,20px)]">
              <div className={`${styles.targetLabel} text-[clamp(10px,1.4vh,12px)] font-extrabold tracking-[2px]`}>TARGET</div>
              <div className="flex flex-col items-center gap-[clamp(4px,1vh,8px)] shrink-0">
                <div
                  key={round.id}
                  className={`${styles.targetCard} box-border w-[clamp(96px,18vh,150px)] h-[clamp(96px,18vh,150px)] rounded-[26px] flex items-center justify-center p-[clamp(10px,1.8vh,18px)] shrink-0`}
                >
                  <div className="flex-1 min-h-0 w-full flex items-center justify-center">
                    <ObjectIcon object={round.target} />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[clamp(18px,2.8vh,24px)] font-extrabold">
                  {wordLabel(round.target)}
                  <button
                    type="button"
                    // Only while the round is open: replaying over the feedback line would cancel the onEnd that moves to the next round.
                    onClick={() => speak(prompt)}
                    disabled={phase !== "playing"}
                    aria-label="Hear the question again"
                    className={`${styles.speakerButton} flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] sm:h-10 sm:w-10 sm:text-lg`}
                  >
                    🔊
                  </button>
                </div>
              </div>
            </div>

            {/* Card size comes from this box's own room (see .choices), so the three always fit without scrolling. */}
            <div className={`${styles.choices} flex flex-wrap justify-center content-center w-full max-w-[960px] flex-1 self-stretch mx-auto min-w-0 min-h-0`}>
              {round.choices.map((card) => {
                const state = cardState(card);
                return (
                  <button
                    key={card.id}
                    ref={(el) => {
                      cardRefs.current[card.id] = el;
                    }}
                    onClick={() => handleCardClick(card)}
                    // The card shows no text, so without this the button has no accessible name.
                    aria-label={wordLabel(card.object)}
                    className={cn(
                      // Width, height and padding come from .choices' --card.
                      styles.card,
                      "relative box-border flex items-center justify-center rounded-3xl font-[inherit] shrink-0",
                      phase === "playing" ? "cursor-pointer" : "cursor-default",
                      state === "correct" && styles.cardCorrect,
                      state === "reveal" && styles.cardReveal,
                      state === "wrong" && styles.cardWrong,
                      state === "dimmed" && styles.cardDimmed,
                    )}
                  >
                    {(state === "correct" || state === "reveal") && (
                      <div className={`${styles.check} absolute -top-[12px] -right-[12px] w-[34px] h-[34px] rounded-full flex items-center justify-center`}>
                        <Check size={16} strokeWidth={4} color="#ffffff" />
                      </div>
                    )}
                    <ObjectIcon object={card.object} />
                  </button>
                );
              })}
            </div>
          </main>
        </>
      )}

      {phase === "complete" && (
        <CompleteScreen
          title={title}
          score={score}
          total={total}
          learnerName={learnerName}
          roundResults={roundResults}
          onReplayResult={() => speak(resultLine, finishOnce)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Completion screen                                                  */
/* ------------------------------------------------------------------ */

function CompleteScreen({
  title,
  score,
  total,
  learnerName,
  roundResults,
  onReplayResult,
}: {
  title: string;
  score: number;
  total: number;
  learnerName: string | null;
  roundResults: (boolean | null)[];
  onReplayResult: () => void;
}) {
  return (
    <div className={`${styles.result} flex-1 flex flex-col items-center justify-center gap-[10px] text-center`}>
      <h2 className="text-[clamp(24px,3.6vw,38px)] font-black mt-[6px] mb-0 mx-0">{title} COMPLETE!</h2>
      {learnerName && (
        <div className={`${styles.resultName} text-[clamp(16px,2.4vh,22px)] font-extrabold capitalize`}>
          Great job, {learnerName}! 🎉
        </div>
      )}
      <div className="flex items-center justify-center gap-2">
        <div className={`${styles.resultScore} text-[20px] font-bold`}>
          Score: {score} / {total}
        </div>
        <button
          type="button"
          onClick={onReplayResult}
          aria-label="Hear the result again"
          className={`${styles.speakerButton} flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] sm:h-10 sm:w-10 sm:text-lg`}
        >
          🔊
        </button>
      </div>
      {/* Full row, not just the earned ones, since the gaps are what make the filled ones read as won. */}
      <div className="flex items-center justify-center gap-[clamp(4px,1vw,10px)]">
        {roundResults.map((result, i) => (
          <StarIcon
            key={i}
            filled={result === true}
            loading="lazy"
            className="w-[clamp(30px,5vh,48px)] h-[clamp(30px,5vh,48px)] object-contain"
          />
        ))}
      </div>
    </div>
  );
}

/** Always the current round's target or a visible choice card, so it always warrants a preload. */
function ObjectIcon({ object }: { object: string }) {
  return (
    <Image src={objectAsset(object)} alt="" width={320} height={320} priority className="w-full h-full object-contain" />
  );
}

/** Filled = the round was answered correctly; the in-play row is eager and the completion screen lazy. */
function StarIcon({ filled, className, loading }: { filled: boolean; className: string; loading: "eager" | "lazy" }) {
  return (
    <Image
      src={filled ? ASSETS.starFilled : ASSETS.starEmpty}
      alt=""
      width={128}
      height={128}
      loading={loading}
      className={className}
    />
  );
}
