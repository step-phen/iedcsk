"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import Image from "next/image";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { getLearnerFirstName, pickRandom, useSpeech } from "@/hooks/useSpeech";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { useImagePreload } from "@/hooks/useImagePreload";
import RealisticEffect from "@/components/effects/RealisticEffect";
import FireworksEffect from "@/components/effects/FireworksEffect";
import { cn } from "@/lib/utils";
import {
  ASSETS,
  KINDS,
  SIZE_SCALE,
  SPEECH,
  correctSpeech,
  firstRoundSpeech,
  instruction,
  itemAsset,
  itemLabel,
  nextRoundSpeech,
  resultSpeech,
  scoreBannerAsset,
  wrongSpeech,
  type Kind,
  type Size,
} from "./Differences.data";
import styles from "./Differences.module.css";

// 3 copies of the same picture + 1 different one, every round.
const TILE_COUNT = 4;

interface Tile {
  /** What a tap on this tile submits; the different tile's answer is its label, so a small cup differs from a cup. */
  answer: string;
  label: string;
  img: string;
  scale: number;
  isDifferent: boolean;
}

/** One round as consumed by this component, mapped from the API. */
interface Round {
  /** The row's own question_key, which grading matches answers on. */
  key: string;
  instruction: string;
  tiles: Tile[];
  different: Tile;
}

interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

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

/** A round from its DB row ({kind, base, diff, size?}), with the different tile shuffled in among the copies. */
function buildRound(row: QuestionRow): Round {
  const { kind, base, diff, size } = row.questionData as { kind: unknown; base: unknown; diff: unknown; size?: unknown };
  if (
    !KINDS.includes(kind as Kind) ||
    typeof base !== "string" ||
    typeof diff !== "string" ||
    (size !== undefined && !(typeof size === "string" && size in SIZE_SCALE))
  ) {
    throw new Error(`Question ${row.questionKey} needs a "kind", a "base" and a "diff" picture, and an optional "size"`);
  }
  const sized = size as Size | undefined;
  const baseLabel = itemLabel(base);
  const different: Tile = {
    answer: itemLabel(diff, sized),
    label: itemLabel(diff, sized),
    img: itemAsset(diff),
    scale: sized ? SIZE_SCALE[sized] : 1,
    isDifferent: true,
  };
  const copy: Tile = { answer: baseLabel, label: baseLabel, img: itemAsset(base), scale: 1, isDifferent: false };
  return {
    key: row.questionKey,
    instruction: instruction(kind as Kind),
    tiles: shuffle([...Array(TILE_COUNT - 1).fill(copy), different]),
    different,
  };
}

export default function DifferencesGame({
  activityId,
  activityName,
  onFinish,
}: GameComponentProps) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [locked, setLocked] = useState(false);
  const [tappedIdx, setTappedIdx] = useState<number | null>(null);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  // Clears the wrong tile's shake so it settles into the dimmed look while the answer is shown.
  const [shaking, setShaking] = useState(false);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<SubmittedAnswer[]>([]);
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [roundResults, setRoundResults] = useState<(boolean | null)[]>([]);
  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [confettiOn, setConfettiOn] = useState(false);
  const [burstOrigin, setBurstOrigin] = useState({ x: 50, y: 50 });
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLearnerName(getLearnerFirstName());
  }, []);

  // Rounds live in the DB (activity_questions), null until loaded.
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

        const mapped = rows.map(buildRound);
        setRounds(mapped);
        setRoundResults(Array(mapped.length).fill(null));
      } catch (err) {
        console.error("Failed to load Differences questions:", err);
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

  const round = rounds ? rounds[roundIdx] : undefined;
  const total = rounds?.length ?? 0;
  const title = activityName || "Find the Differences";
  // Warm only the next round's tile art, never the whole activity at once.
  const nextRound = rounds ? rounds[roundIdx + 1] : undefined;
  useImagePreload(nextRound?.tiles.map((tile) => tile.img) ?? []);
  // CSS backgrounds aren't seen by <Image>, so this game's shared backdrop
  // gets a real preload link the same way <Image priority> images do.
  ReactDOM.preload(ASSETS.background, { as: "image" });

  // Text-to-speech — kindergarten learners can't necessarily read the instruction yet.
  const { speak, speakAll, stop } = useSpeech();
  useEffect(() => stop, [stop]);

  // Plays once, before the very first round, and chains into that round's own
  // instruction via onEnd so the two lines never overlap. "introState" (not a
  // boolean) is what keeps it safe under StrictMode's dev-only double-invoke.
  const introStateRef = useRef<"pending" | "speaking" | "done">("pending");
  useEffect(() => {
    if (!rounds || !round || finished) return;

    if (introStateRef.current === "pending") {
      introStateRef.current = "speaking";
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["differences"]], () => {
        introStateRef.current = "done";
        // interrupt: false so this never cuts off a feedback line whose onEnd advances the round.
        speak(firstRoundSpeech(round.instruction), undefined, { interrupt: false });
      });
      return;
    }

    if (introStateRef.current === "speaking") return;

    // interrupt: false so it queues behind the feedback line that advanced the round.
    speak(nextRoundSpeech(roundIdx + 1, roundIdx === rounds.length - 1, round.instruction), undefined, { interrupt: false });
  }, [rounds, round, roundIdx, finished, speak, speakAll]);

  // Advancement rides on the feedback line finishing, so a stray double-fire
  // would skip a round outright. One advance per round, enforced here.
  const advancingRef = useRef(false);
  useEffect(() => {
    advancingRef.current = false;
  }, [roundIdx]);

  const advanceRound = useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setLocked(false);
    setTappedIdx(null);
    setWasCorrect(null);
    // Drop back to false so the next correct answer is a fresh rising edge.
    setConfettiOn(false);
    if (roundIdx + 1 >= total) {
      setFinished(true);
    } else {
      setRoundIdx((r) => r + 1);
    }
  }, [roundIdx, total]);

  const handleTap = useCallback(
    (idx: number) => {
      if (locked || finished || !round) return;
      const tapped = round.tiles[idx];
      const isCorrect = tapped.isDifferent;

      setLocked(true);
      setTappedIdx(idx);
      setWasCorrect(isCorrect);
      setRoundResults((prev) => {
        const next = [...prev];
        next[roundIdx] = isCorrect;
        return next;
      });
      if (isCorrect) {
        setScore((s) => s + 1);
        // Fire the burst from the middle of the tile they actually tapped, so the celebration is tied to their choice.
        const el = tileRefs.current[idx];
        if (el) {
          const r = el.getBoundingClientRect();
          setBurstOrigin({
            x: ((r.left + r.width / 2) / window.innerWidth) * 100,
            y: ((r.top + r.height / 2) / window.innerHeight) * 100,
          });
        }
        setConfettiOn(true);
      } else {
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
      }
      // The row's own key, not the array position, since grading matches answers on question_key.
      setAnswers((prev) => [...prev, { questionId: round.key, response: tapped.answer }]);

      // Answering cuts off the intro or prompt still playing, so the feedback is heard right away.
      // An interrupted intro never runs its onEnd, so it is marked done here or later rounds would never be announced.
      introStateRef.current = "done";
      // The board advances from onEnd so narration and screen stay in step; useSpeech still runs onEnd when a clip fails.
      speak(
        isCorrect
          ? correctSpeech(pickRandom(SPEECH.correct), round.different.label)
          : wrongSpeech(pickRandom(SPEECH.wrong), tapped.label, round.different.label),
        advanceRound,
      );
    },
    [locked, finished, round, roundIdx, speak, advanceRound],
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
    if (finished) speak(resultLine, finishOnce);
  }, [finished, resultLine, speak, finishOnce]);

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

  const tileState = (idx: number): "correct" | "wrong" | "reveal" | "dimmed" | "default" => {
    if (tappedIdx === null) return "default";
    if (idx === tappedIdx) return wasCorrect ? "correct" : shaking ? "wrong" : "dimmed";
    if (!wasCorrect && round.tiles[idx].isDifferent) return "reveal";
    return "dimmed";
  };

  return (
    <div
      className={`${styles.screen} fixed inset-0 h-dvh w-full box-border flex flex-col items-center justify-center pt-[clamp(8px,1.5vh,16px)] px-[2vw] pb-[2vh] font-baloo2`}
      style={BG_STYLE}
    >
      <RealisticEffect active={confettiOn} originX={burstOrigin.x} originY={burstOrigin.y} />
      {/* Sustained celebration once the whole activity is done. */}
      <FireworksEffect active={finished} />
      {/* The title and name stay up on the result screen too; only the live score banner leaves with the board. */}
      <h1 className="m-0 flex shrink-0 justify-center">
        <Image
          src={ASSETS.title}
          alt={title}
          width={1560}
          height={520}
          priority
          className="mx-auto h-[clamp(140px,24vh,260px)] w-auto max-w-[98%] object-contain"
        />
      </h1>
      {learnerName && (
        <div
          className={`${styles.nameBanner} fixed top-[clamp(10px,1.8vh,18px)] left-[clamp(-20px,-2vw,-10px)] z-10 box-border flex items-center justify-center h-[clamp(72px,12vh,130px)] w-[clamp(220px,30vw,360px)] max-w-[48%]`}
          style={{ backgroundImage: `url(${ASSETS.nameBanner})` }}
        >
          <span className="w-full truncate pl-[15%] text-center font-extrabold capitalize text-[clamp(12px,3.4vh,20px)]">
            {learnerName}
          </span>
        </div>
      )}
      {!finished && (
        <Image
          src={scoreBannerAsset(score)}
          alt={`Score: ${score} / ${total}`}
          width={534}
          height={220}
          loading="eager"
          className="fixed top-[clamp(10px,1.8vh,18px)] right-[clamp(14px,2vw,24px)] z-10 h-[clamp(64px,11vh,110px)] w-auto object-contain"
        />
      )}

      <div className="relative flex-1 min-h-0 w-[min(99vw,1400px)] max-h-[min(90dvh,640px)] box-border flex flex-col justify-center">
        {finished ? (
          <div className={`${styles.result} flex-1 flex flex-col items-center justify-center text-center gap-[clamp(6px,1.2vh,14px)]`}>
            <h2 className="font-extrabold text-[clamp(22px,4vh,38px)] m-0 tracking-[0.5px]">{title.toUpperCase()} COMPLETE!</h2>
            <div className="flex items-center justify-center gap-2">
              <p className={`${styles.resultScore} font-extrabold text-[clamp(18px,3.2vh,28px)] m-0`}>
                Score: {score} / {total}
              </p>
              <button
                type="button"
                onClick={() => speak(resultLine, finishOnce)}
                aria-label="Hear the result again"
                className={`${styles.speakerButton} flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] sm:h-10 sm:w-10 sm:text-lg`}
              >
                🔊
              </button>
            </div>
            {/* Full row, not just the earned ones, since the gaps are what make the filled ones read as won. */}
            <div className="flex items-center justify-center gap-[clamp(4px,1vw,10px)]">
              {roundResults.map((result, i) => (
                <Image
                  key={i}
                  src={result ? ASSETS.starFilled : ASSETS.starEmpty}
                  alt=""
                  width={160}
                  height={160}
                  loading="lazy"
                  className="w-[clamp(30px,5vh,48px)] h-[clamp(30px,5vh,48px)] object-contain"
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 text-center font-extrabold tracking-[0.5px] text-[clamp(20px,3.6vh,34px)] mt-[clamp(2px,0.8vh,10px)] mb-[clamp(4px,1vh,10px)] flex-none">
              {round.instruction}
              <button
                type="button"
                // Only while the round is open: replaying over the feedback line would cancel the onEnd that moves to the next round.
                onClick={() => speak(round.instruction)}
                disabled={locked}
                aria-label="Hear the instruction again"
                className={`${styles.speakerButton} flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] sm:h-10 sm:w-10 sm:text-lg`}
              >
                🔊
              </button>
            </div>

            <div className="flex justify-center gap-[clamp(5px,0.8vw,10px)] flex-none mb-[clamp(4px,1vh,10px)] flex-wrap">
              {rounds.map((r, i) => (
                <div
                  key={r.key}
                  className={cn(
                    "box-border flex items-center justify-center w-[clamp(80px,11vh,112px)] h-[clamp(80px,11vh,112px)] rounded-[9px] transition-transform duration-[120ms] ease-in-out",
                    i === roundIdx && "scale-125 animate-pulse drop-shadow-[0_0_10px_rgba(240,180,41,0.9)]",
                  )}
                >
                  <Image
                    src={roundResults[i] === true ? ASSETS.starFilled : ASSETS.starEmpty}
                    alt=""
                    width={160}
                    height={160}
                    loading="eager"
                    className="w-[60%] h-[60%] object-contain"
                  />
                </div>
              ))}
            </div>

            <div className="text-center font-bold text-[clamp(13px,1.9vh,18px)] mb-[clamp(6px,1.2vh,14px)] flex-none min-h-[1.4em]">
              Tap the correct one!
            </div>

            <div className="flex-[1_1_auto] min-h-0 flex items-center justify-center gap-[clamp(8px,1.4vw,16px)] mt-[clamp(8px,2vh,24px)]">
              {round.tiles.map((tile, idx) => {
                const state = tileState(idx);
                const stamped = state === "correct" || state === "reveal" || (idx === tappedIdx && !wasCorrect);
                return (
                  <button
                    key={`${round.key}-${idx}`}
                    type="button"
                    ref={(el) => {
                      tileRefs.current[idx] = el;
                    }}
                    onClick={() => handleTap(idx)}
                    // The tile shows no text, so without this the button has no accessible name.
                    aria-label={tile.label}
                    className={cn(
                      styles.tile,
                      "relative flex-1 max-w-[clamp(120px,15vw,200px)] h-[clamp(110px,20vh,190px)] box-border rounded-[18px] flex items-center justify-center p-[clamp(10px,1.8vh,20px)] select-none",
                      locked ? "cursor-default" : "cursor-pointer",
                      state === "correct" && styles.tileCorrect,
                      state === "wrong" && styles.tileWrong,
                      state === "reveal" && styles.tileReveal,
                      state === "dimmed" && styles.tileDimmed,
                    )}
                  >
                    <Image
                      src={tile.img}
                      alt=""
                      width={320}
                      height={320}
                      priority
                      className="object-contain"
                      style={{ width: `${Math.round(tile.scale * 100)}%`, height: `${Math.round(tile.scale * 100)}%` }}
                    />
                    {stamped && (
                      <span
                        className={cn(
                          styles.stamp,
                          state === "correct" || state === "reveal" ? styles.stampCorrect : styles.stampWrong,
                          "absolute -top-[14px] -right-[14px] box-border w-[clamp(28px,4vh,38px)] h-[clamp(28px,4vh,38px)] rounded-full flex items-center justify-center font-black text-[clamp(15px,2.2vh,20px)]",
                        )}
                        aria-hidden="true"
                      >
                        {state === "correct" || state === "reveal" ? "✓" : "✗"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex-none flex items-center justify-center mt-[clamp(8px,1.4vh,16px)] min-h-[clamp(30px,5vh,40px)]">
              <div
                className={cn(
                  "font-extrabold text-[clamp(15px,2.4vh,22px)] px-6 py-[7px] rounded-full opacity-0 scale-90 transition-[opacity,transform] duration-[180ms] ease-in-out",
                  tappedIdx !== null && "opacity-100 scale-100",
                  wasCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
                )}
                aria-live="polite"
              >
                {tappedIdx === null ? "" : wasCorrect ? "Correct! Great eye! 🎉" : `The different one is the ${round.different.label}!`}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
