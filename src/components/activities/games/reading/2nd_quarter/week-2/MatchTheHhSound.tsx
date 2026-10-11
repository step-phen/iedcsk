"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import Image from "next/image";
import { Star, Volume2 } from "lucide-react";
import Konva from "konva";
import { Stage, Layer, Group, Rect, Text, Image as KonvaImage } from "react-konva";
import { useSpeech } from "@/hooks/useSpeech";
import { shuffle } from "@/lib/utils";
import type { GameComponentProps } from "@/types/activity";
import {
  assetsFor,
  buildPictures,
  buildSubmission,
  INITIAL_STATE,
  pictureAsset,
  PICTURE_EMOJI,
  selectPicture,
  speechFor,
  taughtSound,
  wordLabel,
  type PictureTile,
} from "./MatchTheHhSound.data";
import styles from "./MatchTheHhSound.module.css";

/* ============================================================
   DRAG BOARD — react-konva canvas.
   The letter target and the picture tiles live in one fixed
   coordinate space; a ResizeObserver drives the Stage's pixel
   size and uniform scale, so hit-testing (tile centre vs. target
   rect) stays simple math regardless of the rendered size. Same
   pattern as Shape.tsx.
   ============================================================ */
const BOX = 150;
const GAP_X = 24;
const GAP_Y = 24;
const COLS = 6;
const PAD = 20;
const TARGET_W = 420;
const TARGET_H = 200;
const TARGET_GAP = 44;
const VBOX_W = PAD * 2 + COLS * BOX + (COLS - 1) * GAP_X;
const VBOX_H = PAD * 2 + TARGET_H + TARGET_GAP + BOX * 2 + GAP_Y;
const TARGET_X = (VBOX_W - TARGET_W) / 2;
const TRAY_Y = PAD + TARGET_H + TARGET_GAP;
const trayX = (index: number) => PAD + (index % COLS) * (BOX + GAP_X);
const trayY = (index: number) => TRAY_Y + Math.floor(index / COLS) * (BOX + GAP_Y);

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

/** The letter the pictures are dragged onto. */
function LetterTarget({
  src,
  label,
  isHot,
  collected,
}: {
  src: string;
  label: string;
  isHot: boolean;
  collected: string[];
}) {
  const img = useBoardImage(src);
  return (
    <Group x={TARGET_X} y={PAD} listening={false}>
      <Rect
        width={TARGET_W}
        height={TARGET_H}
        cornerRadius={28}
        fill={isHot ? "#fff3cd" : "#fffdf6"}
        stroke={isHot ? "#d99b16" : "#397348"}
        strokeWidth={6}
        strokeScaleEnabled={false}
        dash={isHot ? undefined : [18, 12]}
      />
      {img ? (
        <KonvaImage image={img} x={24} y={20} width={TARGET_H - 40} height={TARGET_H - 40} />
      ) : (
        <Text
          text={label}
          x={24}
          y={20}
          width={TARGET_H - 40}
          height={TARGET_H - 40}
          align="center"
          verticalAlign="middle"
          fontSize={96}
          fontStyle="bold"
          fontFamily="Trebuchet MS, Segoe UI, Verdana, sans-serif"
          fill="#25452e"
        />
      )}
      {/* Pictures that made it across, so the board shows the growing set. */}
      {collected.map((word, index) => (
        <Text
          key={word}
          text={PICTURE_EMOJI[word] ?? "❓"}
          x={TARGET_H + 4 + (index % 3) * 62}
          y={28 + Math.floor(index / 3) * 70}
          fontSize={52}
        />
      ))}
    </Group>
  );
}

/** One picture the learner can drag. A miss glides back to its tray slot. */
function DraggablePicture({
  tile,
  x,
  y,
  hinted,
  onHotChange,
  onDrop,
}: {
  tile: PictureTile;
  x: number;
  y: number;
  hinted: boolean;
  onHotChange: (isHot: boolean) => void;
  onDrop: (tile: PictureTile, onTarget: boolean) => void;
}) {
  const img = useBoardImage(pictureAsset(tile.word));
  const groupRef = useRef<Konva.Group | null>(null);
  const isDraggingRef = useRef(false);
  const iconSize = BOX * 0.72;
  const iconOffset = (BOX - iconSize) / 2;

  // Reflow: when this tile's slot moves (a tile ahead of it left the tray),
  // glide to the new spot instead of jumping — but never fight a live drag.
  useEffect(() => {
    const node = groupRef.current;
    if (!node || isDraggingRef.current) return;
    node.to({ x, y, duration: 0.25, easing: Konva.Easings.EaseOut });
  }, [x, y]);

  const overTarget = (node: Konva.Node) => {
    const cx = node.x() + BOX / 2;
    const cy = node.y() + BOX / 2;
    return cx >= TARGET_X && cx <= TARGET_X + TARGET_W && cy >= PAD && cy <= PAD + TARGET_H;
  };

  return (
    <Group
      ref={groupRef}
      x={x}
      y={y}
      draggable
      onDragStart={() => {
        isDraggingRef.current = true;
      }}
      onDragMove={(e) => onHotChange(overTarget(e.target))}
      onDragEnd={(e) => {
        isDraggingRef.current = false;
        const onTarget = overTarget(e.target);
        onHotChange(false);
        // Every tile goes home; a correct one unmounts as the reducer removes it.
        e.target.to({ x, y, duration: 0.25, easing: Konva.Easings.EaseOut });
        onDrop(tile, onTarget);
      }}
    >
      <Rect
        width={BOX}
        height={BOX}
        cornerRadius={20}
        fill="#ffffff"
        stroke={hinted ? "#d99b16" : "#b0c48a"}
        strokeWidth={hinted ? 7 : 4}
        strokeScaleEnabled={false}
      />
      {img ? (
        <KonvaImage image={img} x={iconOffset} y={iconOffset} width={iconSize} height={iconSize} />
      ) : (
        <Text
          text={PICTURE_EMOJI[tile.word] ?? "❓"}
          width={BOX}
          height={BOX}
          align="center"
          verticalAlign="middle"
          fontSize={76}
        />
      )}
    </Group>
  );
}

function Board({
  letterSrc,
  letterLabel,
  tray,
  collected,
  hintedIds,
  onDrop,
}: {
  letterSrc: string;
  letterLabel: string;
  tray: PictureTile[];
  collected: string[];
  hintedIds: string[];
  onDrop: (tile: PictureTile, onTarget: boolean) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [isHot, setIsHot] = useState(false);

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

  const scale = size.w > 0 && size.h > 0 ? Math.min(size.w / VBOX_W, size.h / VBOX_H) : 0;

  return (
    <div
      ref={wrapperRef}
      className={`${styles.board} flex w-full flex-1 items-center justify-center`}
    >
      {scale > 0 && (
        <Stage width={VBOX_W * scale} height={VBOX_H * scale} scaleX={scale} scaleY={scale}>
          <Layer>
            <LetterTarget src={letterSrc} label={letterLabel} isHot={isHot} collected={collected} />
            {tray.map((tile, index) => (
              <DraggablePicture
                key={tile.id}
                tile={tile}
                x={trayX(index)}
                y={trayY(index)}
                hinted={hintedIds.includes(tile.id)}
                onHotChange={setIsHot}
                onDrop={onDrop}
              />
            ))}
          </Layer>
        </Stage>
      )}
    </div>
  );
}

export default function MatchTheHhSound(props: GameComponentProps) {
  // A new classroom activity must get fresh loading and board state.
  return <MatchTheHhSoundLoader key={props.activityId ?? "unconfigured"} {...props} />;
}

function MatchTheHhSoundLoader({ activityId, onFinish }: GameComponentProps) {
  const [pictures, setPictures] = useState<PictureTile[] | null>(null);
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
        const tiles = buildPictures(await response.json());
        // Shuffle once when loading a board (including a page reload), never
        // during rendering or drops. Stable question IDs preserve server scoring.
        if (!controller.signal.aborted) setPictures(shuffle(tiles));
      } catch {
        if (!controller.signal.aborted) setLoadError(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [activityId, reload]);

  if (pictures) return <MatchTheHhSoundBoard pictures={pictures} onFinish={onFinish} />;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[#f4fae9] p-6 text-center text-[#25452e]">
      <h1 className="text-3xl font-extrabold">Match the Sound</h1>
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

function MatchTheHhSoundBoard({
  pictures,
  onFinish,
}: {
  pictures: PictureTile[];
  onFinish: GameComponentProps["onFinish"];
}) {
  const { speak, stop } = useSpeech();
  const [state, dispatch] = useReducer(
    (previous: typeof INITIAL_STATE, action: Parameters<typeof selectPicture>[1]) =>
      selectPicture(previous, action, pictures),
    INITIAL_STATE,
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const submittedRef = useRef(false);
  const sound = useMemo(() => taughtSound(pictures), [pictures]);
  const speech = useMemo(() => speechFor(sound), [sound]);
  const assets = useMemo(() => assetsFor(sound), [sound]);
  const letterLabel = `${sound}${sound.toLowerCase()}`;
  const title = `Match the ${letterLabel} Sound`;
  const targets = useMemo(() => pictures.filter((tile) => tile.isTarget), [pictures]);
  const targetCount = targets.length;
  const foundCount = state.foundIds.length;
  const { foundIds, assistedIds } = state;
  const isComplete = targetCount > 0 && foundCount + assistedIds.length === targetCount;
  const placed = useMemo(() => new Set([...foundIds, ...assistedIds]), [foundIds, assistedIds]);
  const tray = useMemo(() => pictures.filter((tile) => !placed.has(tile.id)), [pictures, placed]);
  const collected = useMemo(
    () => pictures.filter((tile) => placed.has(tile.id)).map((tile) => tile.word),
    [pictures, placed],
  );
  const hintedIds = useMemo(
    () =>
      state.hintAttempt === null || isComplete
        ? []
        : targets.filter((tile) => !placed.has(tile.id)).map((tile) => tile.id),
    [state.hintAttempt, isComplete, targets, placed],
  );

  const finishActivity = useCallback(() => {
    if (!isComplete || submittedRef.current || !onFinish) return;
    submittedRef.current = true;
    stop();
    // The classroom page owns identity, server scoring, and result navigation.
    onFinish(buildSubmission({ foundIds, assistedIds }, pictures));
  }, [isComplete, pictures, onFinish, foundIds, assistedIds, stop]);

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

  const handleDrop = useCallback((tile: PictureTile, onTarget: boolean) => {
    // A picture dropped anywhere else is simply put back, never graded.
    if (onTarget) dispatch({ type: "drop", id: tile.id });
  }, []);

  const focus =
    "focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#25452e]";

  return (
    <main
      className={`${styles.root} relative isolate flex min-h-dvh w-full flex-col bg-[#f4fae9] px-3 py-3 text-[#25452e] sm:px-6 sm:py-4 font-[Trebuchet_MS,Segoe_UI,Verdana,sans-serif]`}
    >
      <Asset
        src={assets.background}
        fit="cover"
        sizes="100vw"
        className="pointer-events-none fixed! inset-0 -z-10"
      />
      <div className={`${styles.shell} mx-auto flex w-full max-w-5xl flex-1 flex-col gap-3 sm:gap-4`}>
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

        <Board
          letterSrc={assets.letterTarget}
          letterLabel={letterLabel}
          tray={tray}
          collected={collected}
          hintedIds={hintedIds}
          onDrop={handleDrop}
        />

        {/* The canvas cannot be reached by keyboard, so the same drop action is
            offered as a plain button per picture for switch and reader users. */}
        <ul className="sr-only">
          {tray.map((tile) => (
            <li key={tile.id}>
              <button type="button" onClick={() => dispatch({ type: "drop", id: tile.id })}>
                Move {wordLabel(tile.word)} to the letter {letterLabel}
              </button>
            </li>
          ))}
        </ul>

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
              <span className="sr-only"> Hint: Look at the glowing pictures.</span>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
