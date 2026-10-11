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
import { Check, Star, Volume2 } from "lucide-react";
import { useSpeech } from "@/hooks/useSpeech";
import { shuffle } from "@/lib/utils";
import type { GameComponentProps } from "@/types/activity";
import {
  assetsFor,
  buildLetters,
  buildSubmission,
  huntedLetter,
  INITIAL_STATE,
  letterAsset,
  selectLetter,
  speechFor,
  type LetterTile,
} from "./FindTheJj.data";
import styles from "./FindTheJj.module.css";

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

export default function FindTheJj(props: GameComponentProps) {
  // A new classroom activity must get fresh loading and board state.
  return <FindTheJjLoader key={props.activityId ?? "unconfigured"} {...props} />;
}

function FindTheJjLoader({ activityId, activityName, onFinish }: GameComponentProps) {
  const [letters, setLetters] = useState<LetterTile[] | null>(null);
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
        if (!response.ok) throw new Error("Could not load letter questions");
        const tiles = buildLetters(await response.json());
        // Shuffle once when loading a board (including a page reload), never
        // during rendering or taps. Stable question IDs preserve server scoring.
        if (!controller.signal.aborted) setLetters(shuffle(tiles));
      } catch {
        if (!controller.signal.aborted) setLoadError(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [activityId, reload]);

  if (letters)
    return <FindTheJjBoard letters={letters} activityName={activityName} onFinish={onFinish} />;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#f4fae9] p-6 text-center text-[#25452e]">
      <h1 className="text-3xl font-extrabold">{activityName ?? "Letter Hunt"}</h1>
      <p role="status" className="text-xl">
        {loadError
          ? "We couldn’t load the letters. Please try again or ask your teacher for help."
          : "Getting the letters ready…"}
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

function FindTheJjBoard({
  letters,
  activityName,
  onFinish,
}: {
  letters: LetterTile[];
  activityName: GameComponentProps["activityName"];
  onFinish: GameComponentProps["onFinish"];
}) {
  const { speak, stop } = useSpeech();
  const [state, dispatch] = useReducer(
    (previous: typeof INITIAL_STATE, action: Parameters<typeof selectLetter>[1]) =>
      selectLetter(previous, action, letters),
    INITIAL_STATE,
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const submittedRef = useRef(false);
  const letter = useMemo(() => huntedLetter(letters), [letters]);
  const speech = useMemo(() => speechFor(letter), [letter]);
  const assets = useMemo(() => assetsFor(letter), [letter]);
  // Each week names this board differently ("Letter Hunt: Ff", "Find the Jj"),
  // so the teacher's own activity name wins over anything built here.
  const title = activityName ?? `Letter Hunt: ${letter}${letter.toLowerCase()}`;
  const targets = useMemo(() => letters.filter((tile) => tile.isTarget), [letters]);
  const targetCount = targets.length;
  const foundCount = state.foundIds.length;
  const { foundIds, assistedIds } = state;
  const isComplete = targetCount > 0 && foundCount + assistedIds.length === targetCount;

  const finishActivity = useCallback(() => {
    if (!isComplete || submittedRef.current || !onFinish) return;
    submittedRef.current = true;
    stop();
    // The classroom page owns identity, server scoring, and result navigation.
    onFinish(buildSubmission({ foundIds, assistedIds }, letters));
  }, [isComplete, letters, onFinish, foundIds, assistedIds, stop]);

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
    if (!state.wrongId) return;
    const timer = window.setTimeout(() => dispatch({ type: "clear-wrong" }), 500);
    return () => window.clearTimeout(timer);
  }, [state.wrongId, state.attempt]);

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
                {targets.map((tile) => (
                  <Star key={tile.id} className="h-full w-auto fill-white/80 text-[#8a5a12]" />
                ))}
              </span>
            </Asset>
            <span className={styles.starRow} aria-hidden="true">
              {targets.map((tile, index) => (
                <Star
                  key={tile.id}
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
          aria-label="Letter board"
          className={`${styles.grid} mx-auto grid w-full max-w-3xl grid-cols-3 gap-3 p-2 sm:grid-cols-4 sm:gap-4`}
        >
          {letters.map((tile) => {
            const assisted = state.assistedIds.includes(tile.id);
            const found = state.foundIds.includes(tile.id) || assisted;
            const wrong = state.wrongId === tile.id;
            const hinted = state.hintAttempt !== null && tile.isTarget && !found && !isComplete;
            return (
              <button
                key={tile.id}
                type="button"
                aria-label={`Letter ${tile.letter}${assisted ? ", shown with help" : ""}`}
                aria-pressed={found}
                disabled={found || isComplete}
                onClick={() => dispatch({ type: "tap", id: tile.id })}
                className={`relative min-h-[76px] min-w-0 touch-manipulation rounded-2xl border-[3px] p-2 disabled:cursor-default ${focus} ${found ? `border-[#397348] bg-[#d9f0ce] ${styles.correct}` : wrong ? "border-[#bd4545] bg-[#fff0ed]" : "border-[#b0c48a] bg-white"}`}
              >
                <span
                  key={wrong ? state.attempt : "idle"}
                  className={`block ${wrong ? styles.wrong : ""}`}
                >
                  <Asset
                    src={letterAsset(tile.letter)}
                    replaceFallback
                    className={`${styles.letter} mx-auto flex! h-[clamp(60px,12dvh,116px)] w-full max-w-40 items-center justify-center`}
                  >
                    <span
                      aria-hidden="true"
                      className="font-[Arial,Helvetica,sans-serif] text-[clamp(44px,8dvh,72px)] font-semibold leading-none text-[#203d28]"
                    >
                      {tile.letter}
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
                {found && (
                  <span className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-[#397348] text-white">
                    <Check aria-hidden="true" className="size-5" />
                    <span className="sr-only">{assisted ? "Shown with help" : "Found"}</span>
                  </span>
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
          <p className={state.wrongId ? "text-[#a63c3c]" : undefined}>
            {isComplete && (
              <span aria-hidden="true" className={`mr-2 inline-block ${styles.celebrate}`}>
                ✨
              </span>
            )}
            {state.feedback || speech.idle}
            {state.hintAttempt !== null && (
              <span className="sr-only"> Hint: Look at the glowing letters.</span>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
