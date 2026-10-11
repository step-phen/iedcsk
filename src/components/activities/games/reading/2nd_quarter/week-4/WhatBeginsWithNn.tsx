"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";
import { Star, Volume2 } from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech";
import { shuffle } from "@/lib/utils";
import type { GameComponentProps } from "@/types/activity";
import {
  assetsFor,
  buildRounds,
  buildSubmission,
  INITIAL_STATE,
  pictureAsset,
  PICTURE_EMOJI,
  selectChoice,
  speechFor,
  taughtSound,
  wordLabel,
  type Round,
} from "./WhatBeginsWithNn.data";
import styles from "./WhatBeginsWithNn.module.css";

/** Missing or failed artwork always leaves a usable HTML fallback underneath. */
function Asset({
  src,
  children,
  className = "",
  replaceFallback = false,
  fit = "contain",
  sizes = "(max-width: 640px) 28vw, 180px",
}: {
  src: string;
  children?: ReactNode;
  className?: string;
  replaceFallback?: boolean;
  fit?: "contain" | "cover";
  sizes?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const artworkLoaded = Boolean(src) && loadedSrc === src && failedSrc !== src;
  return (
    <span className={`relative block ${className}`}>
      {replaceFallback ? (
        <span className={`contents ${artworkLoaded ? "invisible" : ""}`}>{children}</span>
      ) : children}
      {src && failedSrc !== src && (
        <Image
          src={src}
          alt=""
          fill
          sizes={sizes}
          unoptimized
          className={`pointer-events-none object-center ${fit === "cover" ? "object-cover" : "object-contain"}`}
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailedSrc(src)}
        />
      )}
    </span>
  );
}

export default function WhatBeginsWithNn(props: GameComponentProps) {
  // A new classroom activity must get fresh loading and round state.
  return <WhatBeginsWithNnLoader key={props.activityId ?? "unconfigured"} {...props} />;
}

function WhatBeginsWithNnLoader({ activityId, onFinish }: GameComponentProps) {
  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        if (!activityId) throw new Error("Missing activity ID");
        const response = await fetch(`/api/activities/${activityId}/questions`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Could not load picture questions");
        // Shuffle each round's four pictures once when loading (including a page
        // reload), never during rendering or taps. Round order stays as the
        // teacher sequenced it, and stable question IDs preserve server scoring.
        const loaded = buildRounds(await response.json()).map((round) => ({
          ...round,
          choices: shuffle(round.choices),
        }));
        if (!controller.signal.aborted) setRounds(loaded);
      } catch {
        if (!controller.signal.aborted) setLoadError(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [activityId, reload]);

  if (rounds) return <WhatBeginsWithNnBoard rounds={rounds} onFinish={onFinish} />;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#f4fae9] p-6 text-center text-[#25452e]">
      <h1 className="text-3xl font-extrabold">What Begins with…?</h1>
      <p role="status" className="text-xl">
        {loadError
          ? "We couldn’t load the pictures. Please try again or ask your teacher for help."
          : "Getting the pictures ready…"}
      </p>
      {loadError && (
        <button
          type="button"
          className="min-h-12 rounded-xl bg-[#25452e] px-6 font-bold text-white"
          onClick={() => {
            setLoadError(false);
            setReload((value) => value + 1);
          }}
        >
          Try again
        </button>
      )}
    </main>
  );
}

function WhatBeginsWithNnBoard({
  rounds,
  onFinish,
}: {
  rounds: Round[];
  onFinish: GameComponentProps["onFinish"];
}) {
  const { speak, stop } = useSpeech();
  const [state, dispatch] = useReducer(
    (previous: typeof INITIAL_STATE, action: Parameters<typeof selectChoice>[1]) =>
      selectChoice(previous, action, rounds),
    INITIAL_STATE,
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const submittedRef = useRef(false);
  const sound = useMemo(() => taughtSound(rounds), [rounds]);
  const speech = useMemo(() => speechFor(sound), [sound]);
  const assets = useMemo(() => assetsFor(sound), [sound]);
  const title = `What Begins with ${sound}${sound.toLowerCase()}?`;
  const targetCount = rounds.length;
  const foundCount = state.correctIds.length;
  const { correctIds, assistedIds } = state;
  const isComplete = state.roundIndex === targetCount;
  const round = rounds[state.roundIndex];
  const submission = useMemo(
    () => buildSubmission({ correctIds, assistedIds }, rounds),
    [correctIds, assistedIds, rounds],
  );

  const finishActivity = useCallback(() => {
    if (!isComplete || submittedRef.current || !onFinish) return;
    submittedRef.current = true;
    stop();
    // The classroom page owns identity, server scoring, and result navigation.
    onFinish(submission);
  }, [isComplete, onFinish, submission, stop]);

  const say = useCallback(
    (message: string, onEnd?: () => void) => {
      setIsSpeaking(true);
      // The shared helper interrupts playback and discards superseded requests.
      speak(message, () => {
        setIsSpeaking(false);
        onEnd?.();
      });
    },
    [speak],
  );

  useEffect(() => {
    // Defer the intro past StrictMode's setup/cleanup cycle; each tap replaces
    // pending speech instead of building an unbounded feedback queue.
    // Finish after the celebration is spoken. The shared speech helper also
    // calls onEnd on playback failure, so unavailable audio cannot block saving.
    const timer = window.setTimeout(
      () => say(state.feedback || speech.instruction, isComplete ? finishActivity : undefined),
      0,
    );
    return () => {
      window.clearTimeout(timer);
      stop();
    };
  }, [state.feedback, state.attempt, isComplete, finishActivity, say, stop, speech.instruction]);

  useEffect(() => {
    if (!state.wrongWord) return;
    const timer = window.setTimeout(() => dispatch({ type: "clear-wrong" }), 500);
    return () => window.clearTimeout(timer);
  }, [state.wrongWord, state.attempt]);

  useEffect(() => {
    if (state.hintAttempt === null) return;
    const attempt = state.hintAttempt;
    const timer = window.setTimeout(() => dispatch({ type: "clear-hint", attempt }), 1200);
    return () => window.clearTimeout(timer);
  }, [state.hintAttempt]);

  const focus =
    "focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#25452e]";

  return (
    <main
      className={`${styles.root} relative isolate min-h-dvh w-full bg-[#f4fae9] px-3 py-3 text-[#25452e] sm:px-6 sm:py-4 font-[Trebuchet_MS,Segoe_UI,Verdana,sans-serif]`}
    >
      <Asset
        src={assets.background}
        fit="cover"
        sizes="100vw"
        className="pointer-events-none fixed! inset-0 -z-10"
      />
      <div className={`${styles.shell} mx-auto flex w-full max-w-5xl flex-col gap-3 sm:gap-4`}>
        <header className="relative text-center">
          <h1 className="sr-only">{title}</h1>
          <Asset
            src={assets.titleBanner}
            replaceFallback
            sizes="(max-height: 700px) 210px, 360px"
            className={`${styles.title} mx-auto flex! items-center justify-center`}
          >
            <span aria-hidden="true" className="rounded-2xl bg-[#ffeaa0] px-4 py-2 text-2xl font-extrabold">{title}</span>
          </Asset>
          <div
            role="progressbar"
            aria-label="Stars earned"
            aria-valuemin={0}
            aria-valuemax={targetCount}
            aria-valuenow={foundCount}
            className={`${styles.stars} ${isComplete ? styles.celebrate : ""}`}
          >
            <Asset
              src={assets.starContainer}
              replaceFallback
              sizes="(max-width: 640px) 40vw, 220px"
              className="pointer-events-none absolute! inset-0"
            >
              <span className="absolute inset-0 rounded-2xl bg-white/95" />
              {/* Empty slots the plank artwork carves for itself. */}
              <span className={styles.starRow}>
                {rounds.map((item) => (
                  <Star key={item.id} className="h-full w-auto fill-white/80 text-[#8a5a12]" />
                ))}
              </span>
            </Asset>
            <span className={styles.starRow} aria-hidden="true">
              {rounds.map((item, index) => (
                <Star
                  key={item.id}
                  className={`h-full w-auto fill-[#ffd23f] text-[#8a5a12] ${index < foundCount ? "" : "opacity-0"}`}
                />
              ))}
            </span>
            <span className={styles.starCount}>
              {foundCount} / {targetCount}
            </span>
          </div>
        </header>

        <div
          className={`${styles.instruction} mx-auto flex w-full max-w-5xl items-center justify-center gap-2 sm:gap-3`}
        >
          <button
            type="button"
            aria-label="Repeat instruction"
            aria-busy={isSpeaking}
            disabled={isComplete}
            onClick={() => say(speech.instruction)}
            className={`flex size-14 shrink-0 items-center justify-center rounded-full sm:size-16 ${focus}`}
          >
            <Asset src={assets.speakerButton} replaceFallback sizes="64px" className="size-full">
              <span className="flex size-full items-center justify-center rounded-full border-2 border-[#ac7915] bg-[#fff0b8]">
                <Volume2 className="size-8" aria-hidden="true" />
              </span>
            </Asset>
          </button>
          <div className="relative isolate flex min-h-20 min-w-0 flex-1 items-center justify-center px-6 py-5 sm:px-10">
            <Asset
              src={assets.instructionBanner}
              replaceFallback
              sizes="(max-width: 640px) 80vw, 940px"
              className={`${styles.instructionArtwork} pointer-events-none absolute! inset-0 -z-10`}
            >
              <span className="absolute inset-x-2 inset-y-1 rounded-3xl bg-[#fff4d9]" />
            </Asset>
            <p className="relative text-center text-lg font-bold leading-snug sm:text-xl">{speech.instruction}</p>
          </div>
        </div>

        <section
          aria-label={`Picture choices, round ${Math.min(state.roundIndex + 1, targetCount)} of ${targetCount}`}
          className={`${styles.grid} mx-auto grid w-full max-w-3xl grid-cols-2 gap-3 p-2 sm:grid-cols-4 sm:gap-4`}
        >
          {round?.choices.map((choice) => {
            const wrong = state.wrongWord === choice.word;
            const hinted = state.hintAttempt !== null && choice.isCorrect;
            return (
              <button
                key={`${round.id}-${choice.word}`}
                type="button"
                aria-label={wordLabel(choice.word)}
                onClick={() => dispatch({ type: "tap", word: choice.word })}
                className={`relative min-h-[96px] min-w-0 touch-manipulation rounded-2xl border-[3px] p-2 ${focus} ${wrong ? "border-[#bd4545] bg-[#fff0ed]" : "border-[#b0c48a] bg-white"}`}
              >
                <span
                  key={wrong ? state.attempt : "idle"}
                  className={`block ${wrong ? styles.wrong : ""}`}
                >
                  <Asset
                    src={pictureAsset(choice.word)}
                    replaceFallback
                    className={`${styles.picture} mx-auto flex! h-[clamp(72px,14dvh,132px)] w-full max-w-40 items-center justify-center`}
                  >
                    <span aria-hidden="true" className="text-[clamp(48px,10dvh,84px)] leading-none">
                      {PICTURE_EMOJI[choice.word] ?? "❓"}
                    </span>
                  </Asset>
                </span>
                {hinted && (
                  <span
                    key={`hint-${state.hintAttempt}`}
                    aria-hidden="true"
                    className={`${styles.hint} pointer-events-none absolute inset-0 rounded-xl border-[3px] border-[#d99b16] bg-[#ffeaa0]/20`}
                  />
                )}
              </button>
            );
          })}
        </section>

        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`${styles.feedback} flex min-h-[5.25rem] items-center justify-center px-2 text-center text-xl font-extrabold sm:min-h-14 sm:text-2xl`}
        >
          <p className={state.wrongWord ? "text-[#a63c3c]" : undefined}>
            {isComplete && (
              <span aria-hidden="true" className={`mr-2 inline-block ${styles.celebrate}`}>
                ✨
              </span>
            )}
            {state.feedback || speech.idle}
            {state.hintAttempt !== null && (
              <span className="sr-only"> Hint: Look at the glowing picture.</span>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
