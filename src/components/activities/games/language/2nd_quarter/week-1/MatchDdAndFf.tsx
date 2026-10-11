"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Image from "next/image";
import { Star, Volume2 } from "lucide-react";
import Konva from "konva";
import {
  Stage,
  Layer,
  Group,
  Rect,
  Text,
  Line,
  Circle,
  Image as KonvaImage,
} from "react-konva";
import { useSpeech } from "@/hooks/useSpeech";
import { shuffle } from "@/lib/utils";
import type { GameComponentProps } from "@/types/activity";
import {
  ASSETS,
  buildRounds,
  buildSubmission,
  INITIAL_STATE,
  REWARD_EMOJI,
  rewardAsset,
  selectJoin,
  SPEECH,
  type RoundTile,
} from "./MatchDdAndFf.data";
import styles from "./MatchDdAndFf.module.css";

/* ============================================================
   MATCH BOARD — react-konva canvas.
   One round at a time: uppercase cards in the left column,
   shuffled lowercase cards in the right, and the learner drags a
   knob from an uppercase card to its partner. Everything lives in
   one fixed coordinate space; a ResizeObserver drives the Stage's
   pixel size and uniform scale, so hit-testing (knob centre vs.
   card rect) stays simple math regardless of the rendered size.
   Same pattern as MatchTheDdSound.tsx.
   ============================================================ */
const CARD_W = 260;
const CARD_H = 150;
const ROW_GAP = 34;
const PAD = 26;
const VBOX_W = 900;
const LEFT_X = PAD;
const RIGHT_X = VBOX_W - PAD - CARD_W;
const KNOB_R = 26;
const RUBBER = "#397348";
const vboxHeight = (rows: number) => PAD * 2 + rows * CARD_H + (rows - 1) * ROW_GAP;
/** A column with fewer cards than the tallest one is centred against it. */
const columnY = (rows: number, count: number, index: number) =>
  PAD + ((rows - count) * (CARD_H + ROW_GAP)) / 2 + index * (CARD_H + ROW_GAP);

/** Loads a plain HTMLImageElement for Konva.Image, cached by src across the
 * board. Konva cannot consume next/image's <img>, so this is its equivalent —
 * a src that never loads simply leaves the emoji fallback on screen. */
const imageCache = new Map<string, HTMLImageElement>();
const imageLoading = new Set<string>();
const imageSubscribers = new Set<() => void>();

function loadBoardImage(src: string) {
  if (imageCache.has(src) || imageLoading.has(src)) return;
  imageLoading.add(src);
  const img = new window.Image();
  const settle = (loaded: boolean) => {
    imageLoading.delete(src);
    if (loaded) imageCache.set(src, img);
    for (const notify of imageSubscribers) notify();
  };
  img.onload = () => settle(true);
  img.onerror = () => settle(false);
  img.src = src;
}

function subscribeToBoardImages(callback: () => void) {
  imageSubscribers.add(callback);
  return () => imageSubscribers.delete(callback);
}

function useBoardImage(src: string): HTMLImageElement | undefined {
  const image = useSyncExternalStore(
    subscribeToBoardImages,
    () => imageCache.get(src),
    () => undefined,
  );
  useEffect(() => {
    loadBoardImage(src);
  }, [src]);
  return image;
}

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

/** One letter card. Joined cards go green, the missed one flashes red. */
function LetterCard({
  x,
  y,
  letter,
  done,
  wrong,
  hinted,
}: {
  x: number;
  y: number;
  letter: string;
  done: boolean;
  wrong: boolean;
  hinted: boolean;
}) {
  const stroke = done ? "#397348" : wrong ? "#bd4545" : hinted ? "#d99b16" : "#b0c48a";
  return (
    <Group x={x} y={y} listening={false}>
      <Rect
        width={CARD_W}
        height={CARD_H}
        cornerRadius={24}
        fill={done ? "#d9f0ce" : wrong ? "#fff0ed" : "#ffffff"}
        stroke={stroke}
        strokeWidth={hinted || wrong ? 8 : 5}
        strokeScaleEnabled={false}
      />
      <Text
        text={letter}
        width={CARD_W}
        height={CARD_H}
        align="center"
        verticalAlign="middle"
        fontSize={96}
        fontStyle="bold"
        fontFamily="Arial, Helvetica, sans-serif"
        fill="#203d28"
      />
    </Group>
  );
}

/** A joined pair: the line draws itself in, then its reward picture appears. */
function LockedLine({
  from,
  to,
  reward,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  reward: string;
}) {
  const lineRef = useRef<Konva.Line | null>(null);
  const rewardRef = useRef<Konva.Group | null>(null);
  const img = useBoardImage(rewardAsset(reward));

  useEffect(() => {
    const line = lineRef.current;
    const badge = rewardRef.current;
    if (!line || !badge) return;
    // Draw the connection rather than snapping it on, so the match is visible.
    line.points([from.x, from.y, from.x, from.y]);
    line.to({ points: [from.x, from.y, to.x, to.y], duration: 0.28 });
    badge.scale({ x: 0, y: 0 });
    badge.to({ scaleX: 1, scaleY: 1, duration: 0.25, easing: Konva.Easings.BackEaseOut });
  }, [from.x, from.y, to.x, to.y]);

  return (
    <Group listening={false}>
      <Line
        ref={lineRef}
        points={[from.x, from.y, to.x, to.y]}
        stroke="#397348"
        strokeWidth={10}
        lineCap="round"
        strokeScaleEnabled={false}
      />
      <Group
        ref={rewardRef}
        x={(from.x + to.x) / 2}
        y={(from.y + to.y) / 2}
        offsetX={40}
        offsetY={40}
      >
        <Rect
          width={80}
          height={80}
          cornerRadius={18}
          fill="#fffdf6"
          stroke="#397348"
          strokeWidth={4}
          strokeScaleEnabled={false}
        />
        {img ? (
          <KonvaImage image={img} x={8} y={8} width={64} height={64} />
        ) : (
          <Text
            text={REWARD_EMOJI[reward] ?? "❓"}
            width={80}
            height={80}
            align="center"
            verticalAlign="middle"
            fontSize={48}
          />
        )}
      </Group>
    </Group>
  );
}

function Board({
  round,
  choiceOrder,
  joined,
  wrongLetter,
  hinted,
  onConnect,
}: {
  round: RoundTile;
  choiceOrder: string[];
  joined: string[];
  wrongLetter: string | null;
  hinted: boolean;
  onConnect: (from: string, to: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const rubberRef = useRef<Konva.Line | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const rows = Math.max(round.prompts.length, choiceOrder.length);
  const vboxH = vboxHeight(rows);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = size.w > 0 && size.h > 0 ? Math.min(size.w / VBOX_W, size.h / vboxH) : 0;
  const promptTop = (index: number) => columnY(rows, round.prompts.length, index);
  const choiceTop = (index: number) => columnY(rows, choiceOrder.length, index);
  const leftAnchor = (index: number) => ({ x: LEFT_X + CARD_W, y: promptTop(index) + CARD_H / 2 });
  const rightAnchor = (index: number) => ({ x: RIGHT_X, y: choiceTop(index) + CARD_H / 2 });

  /** The lowercase card under a dropped knob, if any. */
  const cardUnder = (x: number, y: number) => {
    const index = choiceOrder.findIndex((_, i) => {
      const top = choiceTop(i);
      return x >= RIGHT_X && x <= RIGHT_X + CARD_W && y >= top && y <= top + CARD_H;
    });
    return index === -1 ? undefined : choiceOrder[index];
  };

  return (
    <div
      ref={wrapperRef}
      className={`${styles.board} flex w-full flex-1 items-center justify-center`}
    >
      {scale > 0 && (
        <Stage width={VBOX_W * scale} height={vboxH * scale} scaleX={scale} scaleY={scale}>
          <Layer>
            {round.prompts.map((letter, index) =>
              joined.includes(letter) ? (
                <LockedLine
                  key={`line-${letter}`}
                  from={leftAnchor(index)}
                  to={rightAnchor(choiceOrder.indexOf(letter.toLowerCase()))}
                  reward={round.rewards[letter]}
                />
              ) : null,
            )}

            {round.prompts.map((letter, index) => (
              <LetterCard
                key={`upper-${letter}`}
                x={LEFT_X}
                y={promptTop(index)}
                letter={letter}
                done={joined.includes(letter)}
                wrong={wrongLetter === letter}
                hinted={hinted && !joined.includes(letter)}
              />
            ))}
            {choiceOrder.map((letter, index) => (
              <LetterCard
                key={`lower-${letter}`}
                x={RIGHT_X}
                y={choiceTop(index)}
                letter={letter}
                done={joined.includes(letter.toUpperCase())}
                wrong={false}
                hinted={
                  hinted &&
                  round.prompts.includes(letter.toUpperCase()) &&
                  !joined.includes(letter.toUpperCase())
                }
              />
            ))}

            {/* One rubber line follows whichever knob is being dragged. */}
            <Line
              ref={rubberRef}
              points={[0, 0, 0, 0]}
              visible={false}
              stroke={RUBBER}
              strokeWidth={10}
              lineCap="round"
              dash={[16, 12]}
              strokeScaleEnabled={false}
              listening={false}
            />

            {round.prompts.map((letter, index) => {
              if (joined.includes(letter)) return null;
              const home = leftAnchor(index);
              return (
                <Circle
                  key={`knob-${letter}`}
                  x={home.x}
                  y={home.y}
                  radius={KNOB_R}
                  fill={hinted ? "#ffd23f" : "#397348"}
                  stroke="#ffffff"
                  strokeWidth={4}
                  strokeScaleEnabled={false}
                  draggable
                  onDragStart={() => rubberRef.current?.visible(true)}
                  onDragMove={(e) =>
                    rubberRef.current?.points([home.x, home.y, e.target.x(), e.target.y()])
                  }
                  onDragEnd={(e) => {
                    const knob = e.target;
                    const hit = cardUnder(knob.x(), knob.y());
                    const rubber = rubberRef.current;
                    knob.to({ x: home.x, y: home.y, duration: 0.2, easing: Konva.Easings.EaseOut });
                    if (rubber) {
                      if (hit && hit !== letter.toLowerCase()) {
                        // A wrong join flashes red and fades out where it was drawn.
                        rubber.stroke("#bd4545");
                        rubber.to({
                          opacity: 0,
                          duration: 0.35,
                          onFinish: () => {
                            rubber.opacity(1);
                            rubber.stroke(RUBBER);
                            rubber.visible(false);
                          },
                        });
                      } else {
                        rubber.visible(false);
                      }
                    }
                    // A knob dropped on nothing is simply put back, never graded.
                    if (hit) onConnect(letter, hit);
                  }}
                />
              );
            })}
          </Layer>
        </Stage>
      )}
    </div>
  );
}

export default function MatchDdAndFf(props: GameComponentProps) {
  // A new classroom activity must get fresh loading and board state.
  return <MatchDdAndFfLoader key={props.activityId ?? "unconfigured"} {...props} />;
}

function MatchDdAndFfLoader({ activityId, activityName, onFinish }: GameComponentProps) {
  const [rounds, setRounds] = useState<RoundTile[] | null>(null);
  const [choiceOrders, setChoiceOrders] = useState<string[][] | null>(null);
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
        const tiles = buildRounds(await response.json());
        if (controller.signal.aborted) return;
        // Only each round's lowercase column is shuffled, and only once per
        // board load — never during rendering or drops. Rounds keep the
        // teacher's order, and stable question IDs preserve server scoring.
        setRounds(tiles);
        setChoiceOrders(tiles.map((round) => shuffle(round.choices)));
      } catch {
        if (!controller.signal.aborted) setLoadError(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [activityId, reload]);

  if (rounds && choiceOrders)
    return (
      <MatchDdAndFfBoard
        rounds={rounds}
        choiceOrders={choiceOrders}
        activityName={activityName}
        onFinish={onFinish}
      />
    );

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#f4fae9] p-6 text-center text-[#25452e]">
      <h1 className="text-3xl font-extrabold">{activityName ?? "Match the Letter Friends"}</h1>
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

function MatchDdAndFfBoard({
  rounds,
  choiceOrders,
  activityName,
  onFinish,
}: {
  rounds: RoundTile[];
  choiceOrders: string[][];
  activityName: GameComponentProps["activityName"];
  onFinish: GameComponentProps["onFinish"];
}) {
  const { speak, stop } = useSpeech();
  const [state, dispatch] = useReducer(
    (previous: typeof INITIAL_STATE, action: Parameters<typeof selectJoin>[1]) =>
      selectJoin(previous, action, rounds),
    INITIAL_STATE,
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const submittedRef = useRef(false);
  const title = activityName ?? "Match the Letter Friends";
  const total = rounds.length;
  const starCount = state.correctIds.length;
  const { correctIds, assistedIds } = state;
  const isComplete = state.roundIndex === total;
  const round = isComplete ? undefined : rounds[state.roundIndex];
  // The round's own prose wins; the generic line is only for the intro screen.
  const instruction = round?.instruction ?? SPEECH.instruction;

  const finishActivity = useCallback(() => {
    if (!isComplete || submittedRef.current || !onFinish) return;
    submittedRef.current = true;
    stop();
    // The classroom page owns identity, server scoring, and result navigation.
    onFinish(buildSubmission({ correctIds, assistedIds }, rounds));
  }, [isComplete, rounds, onFinish, correctIds, assistedIds, stop]);

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
    // Defer the intro past StrictMode's setup/cleanup cycle; each drop replaces
    // pending speech instead of building an unbounded feedback queue.
    // Finish after the celebration is spoken. The shared speech helper also
    // calls onEnd on playback failure, so unavailable audio cannot block saving.
    const timer = window.setTimeout(
      () => say(state.feedback || instruction, isComplete ? finishActivity : undefined),
      0,
    );
    return () => {
      window.clearTimeout(timer);
      stop();
    };
  }, [state.feedback, state.attempt, isComplete, finishActivity, say, stop, instruction]);

  useEffect(() => {
    if (!state.wrongLetter) return;
    const timer = window.setTimeout(() => dispatch({ type: "clear-wrong" }), 500);
    return () => window.clearTimeout(timer);
  }, [state.wrongLetter, state.attempt]);

  useEffect(() => {
    if (state.hintAttempt === null) return;
    const attempt = state.hintAttempt;
    const timer = window.setTimeout(() => dispatch({ type: "clear-hint", attempt }), 1200);
    return () => window.clearTimeout(timer);
  }, [state.hintAttempt]);

  const handleConnect = useCallback(
    (from: string, to: string) => dispatch({ type: "connect", from, to }),
    [],
  );

  const focus =
    "focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#25452e]";

  return (
    <main
      className={`${styles.root} relative isolate flex min-h-dvh w-full flex-col bg-[#f4fae9] px-3 py-3 text-[#25452e] sm:px-6 sm:py-4 font-[Trebuchet_MS,Segoe_UI,Verdana,sans-serif]`}
    >
      <Asset
        src={ASSETS.background}
        fit="cover"
        sizes="100vw"
        className="pointer-events-none fixed! inset-0 -z-10"
      />
      <div
        className={`${styles.shell} mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 sm:gap-4`}
      >
        <header className="relative text-center">
          <h1 className="sr-only">{title}</h1>
          <Asset
            src={ASSETS.titleBanner}
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
            aria-valuemax={total}
            aria-valuenow={starCount}
            className={`${styles.stars} ${isComplete ? styles.celebrate : ""}`}
          >
            <Asset
              src={ASSETS.starContainer}
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
                  className={`h-full w-auto fill-[#ffd23f] text-[#8a5a12] ${index < starCount ? "" : "opacity-0"}`}
                />
              ))}
            </span>
            <span className={styles.starCount}>
              {starCount} / {total}
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
            onClick={() => say(instruction)}
            className={`flex size-14 shrink-0 items-center justify-center rounded-full sm:size-16 ${focus}`}
          >
            <Asset src={ASSETS.speakerButton} replaceFallback sizes="64px" className="size-full">
              <span className="flex size-full items-center justify-center rounded-full border-2 border-[#ac7915] bg-[#fff0b8]">
                <Volume2 className="size-8" aria-hidden="true" />
              </span>
            </Asset>
          </button>
          <div className="relative isolate flex min-h-20 min-w-0 flex-1 items-center justify-center px-6 py-5 sm:px-10">
            <Asset
              src={ASSETS.instructionBanner}
              replaceFallback
              sizes="(max-width: 640px) 80vw, 940px"
              className={`${styles.instructionArtwork} pointer-events-none absolute! inset-0 -z-10`}
            >
              <span className="absolute inset-x-2 inset-y-1 rounded-3xl bg-[#fff4d9]" />
            </Asset>
            <p className="relative text-center text-lg font-bold leading-snug sm:text-xl">{instruction}</p>
          </div>
        </div>

        {round && (
          <Board
            // A fresh board per round, so no line or knob survives the advance.
            key={round.id}
            round={round}
            choiceOrder={choiceOrders[state.roundIndex]}
            joined={state.joined}
            wrongLetter={state.wrongLetter}
            hinted={state.hintAttempt !== null}
            onConnect={handleConnect}
          />
        )}

        {/* The canvas cannot be reached by keyboard, so the same connect action
            is offered as a plain button per candidate for switch and reader users. */}
        <ul className="sr-only">
          {round?.prompts
            .filter((letter) => !state.joined.includes(letter))
            .flatMap((letter) =>
              choiceOrders[state.roundIndex].map((choice) => (
                <li key={`${letter}-${choice}`}>
                  <button type="button" onClick={() => handleConnect(letter, choice)}>
                    Match {letter} with {choice}
                  </button>
                </li>
              )),
            )}
        </ul>

        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`${styles.feedback} flex min-h-[5.25rem] items-center justify-center px-2 text-center text-xl font-extrabold sm:min-h-14 sm:text-2xl`}
        >
          <p className={state.feedback === SPEECH.wrong ? "text-[#a63c3c]" : undefined}>
            {isComplete && (
              <span aria-hidden="true" className={`mr-2 inline-block ${styles.celebrate}`}>
                ✨
              </span>
            )}
            {state.feedback || SPEECH.idle}
            {state.hintAttempt !== null && (
              <span className="sr-only"> Hint: Look at the glowing letters.</span>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
