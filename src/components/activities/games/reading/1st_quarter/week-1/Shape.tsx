"use client";

import {
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
  useLayoutEffect,
  useSyncExternalStore,
} from "react";
import ReactDOM from "react-dom";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Konva from "konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { Stage, Layer, Group, Rect, Circle, Text, Image as KonvaImage } from "react-konva";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, pickRandom } from "@/hooks/useSpeech";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import {
  ASSETS,
  SPEECH,
  TITLE_LETTERS,
  correctSpeech,
  resultHeadline as headlineFor,
  resultSpeech,
  shapeAsset,
  starBadgeAsset,
} from "./Shape.data";
import styles from "./Shape.module.css";

// Confident, non-bouncy deceleration used for every authored entrance/tap
// response in this game.
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/* ============================================================
   DRAG-AND-DROP BOARD — react-konva canvas.
   Outline targets and draggable pieces both live in a fixed
   VBOX coordinate space; a ResizeObserver drives the Stage's
   pixel size + uniform scale, so hit-testing (piece center vs.
   outline rect) stays simple math in that same space regardless
   of how big the canvas renders on screen — same pattern as the
   tracing games' Stage sizing.
   ============================================================ */
const BOARD_COLS = 5;
const BOARD_BOX = 160;
const BOARD_GAP_X = 32;
const BOARD_ROW_GAP = 70;
const BOARD_PAD = 20;
const BOARD_VBOX_W =
  BOARD_PAD * 2 + BOARD_COLS * BOARD_BOX + (BOARD_COLS - 1) * BOARD_GAP_X;
const BOARD_VBOX_H = BOARD_PAD * 2 + BOARD_BOX * 2 + BOARD_ROW_GAP;
const boardColumnX = (i: number) => BOARD_PAD + i * (BOARD_BOX + BOARD_GAP_X);

/** Loads a plain HTMLImageElement for Konva.Image, cached by src across the
 * whole board (outline + piece for the same shape share one load). Konva
 * can't consume next/image's <img>, so this is the canvas equivalent of it. */
const shapeImageCache = new Map<string, HTMLImageElement>();
const shapeImageLoading = new Set<string>();
const shapeImageSubscribers = new Set<() => void>();

function loadShapeImage(src: string) {
  if (shapeImageCache.has(src) || shapeImageLoading.has(src)) return;
  shapeImageLoading.add(src);

  const img = new window.Image();
  const settle = () => {
    shapeImageLoading.delete(src);
    shapeImageCache.set(src, img);
    for (const notify of shapeImageSubscribers) notify();
  };

  // Handler before .src, plus the .complete fallback: a memory-cached image
  // can finish loading before a later-assigned onload would ever fire.
  img.onload = settle;
  img.src = src;
  if (img.complete && img.naturalWidth > 0) settle();
}

function subscribeToShapeImages(onChange: () => void) {
  shapeImageSubscribers.add(onChange);
  return () => {
    shapeImageSubscribers.delete(onChange);
  };
}

function useShapeImage(src: string): HTMLImageElement | undefined {
  const image = useSyncExternalStore(
    subscribeToShapeImages,
    () => shapeImageCache.get(src),
    () => undefined,
  );

  useEffect(() => {
    loadShapeImage(src);
  }, [src]);

  return image;
}

type Feedback = { kind: "error" | "success"; message: string } | null;

// The rest of the backdrop lives in .screen; the artwork path stays with the other assets.
const BG_STYLE = { backgroundImage: `url(${ASSETS.background})` } as const;

/** One shape piece as consumed by this component, mapped from the API. */
interface ShapeItem {
  id: string;
  shape: string;
  image: string;
  /** Position in the top outline row — deliberately not the piece order. */
  outlineIndex: number;
}

interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

/** One of the provided flat-color PNGs. `dimmed` is the unfilled outline
 * placeholder — same artwork at low opacity, per the pattern already used in
 * ThingsINeedForMyWritingActivities.tsx, since there's no separate outline-only asset.
 * `preload` is true for the live board's own outlines/pieces (there's only
 * one board, so that's simply "on screen now") and false for the result
 * screen's recap strip, which only renders after the activity ends. */
function ShapeIcon({
  item,
  dimmed,
  className,
  preload = false,
}: {
  item: ShapeItem;
  dimmed?: boolean;
  className?: string;
  preload?: boolean;
}) {
  return (
    <Image
      src={item.image}
      alt={item.shape}
      width={64}
      height={64}
      priority={preload}
      loading={preload ? undefined : "lazy"}
      draggable={false}
      className={`object-contain ${className ?? "h-10 w-10 sm:h-12 sm:w-12"} ${dimmed ? "opacity-40 grayscale" : ""}`}
    />
  );
}

/** One outline drop-zone: a dashed/glowing target that fills in solid teal
 * (plus a checkmark badge) once its matching piece has landed on it. */
function OutlineCell({
  item,
  x,
  y,
  isFilled,
  isActive,
}: {
  item: ShapeItem;
  x: number;
  y: number;
  isFilled: boolean;
  isActive: boolean;
}) {
  const img = useShapeImage(item.image);
  const iconSize = BOARD_BOX * 0.72;
  const iconOffset = (BOARD_BOX - iconSize) / 2;

  const stroke = isFilled ? "#2f9e8f" : "#38bdf8";
  const shadowColor = isFilled
    ? "rgba(47,158,143,0.6)"
    : isActive
      ? "rgba(56,189,248,0.8)"
      : "rgba(56,189,248,0.45)";
  const shadowBlur = isFilled ? 20 : isActive ? 28 : 16;

  return (
    <Group x={x} y={y}>
      <Rect
        width={BOARD_BOX}
        height={BOARD_BOX}
        cornerRadius={20}
        fill="#0b1a3a"
        stroke={stroke}
        strokeWidth={4}
        strokeScaleEnabled={false}
        dash={isFilled ? undefined : [10, 8]}
        shadowColor={shadowColor}
        shadowBlur={shadowBlur}
        shadowOpacity={1}
      />
      {img && (
        <KonvaImage
          image={img}
          x={iconOffset}
          y={iconOffset}
          width={iconSize}
          height={iconSize}
          opacity={isFilled ? 1 : 0.4}
        />
      )}
      {isFilled && (
        <>
          <Circle
            x={BOARD_BOX / 2}
            y={0}
            radius={16}
            fill="#2f9e8f"
            stroke="white"
            strokeWidth={2}
            strokeScaleEnabled={false}
            shadowColor="rgba(34,49,79,0.4)"
            shadowBlur={4}
            shadowOffsetY={2}
          />
          <Text
            x={BOARD_BOX / 2 - 8}
            y={-9}
            text="✓"
            fontSize={18}
            fontStyle="bold"
            fill="white"
          />
        </>
      )}
    </Group>
  );
}

/** One draggable shape piece. Dragging is entirely Konva's own — position is
 * uncontrolled while the user drags, and only tweened back to its tray slot
 * (via the node's own `.to()`) on a miss; a correct drop just unmounts it,
 * since the caller removes it from `items` the moment it's placed. */
function DraggablePiece({
  item,
  x,
  y,
  size,
  outlineRects,
  onDragStart,
  onActiveOutlineChange,
  onDrop,
}: {
  item: ShapeItem;
  x: number;
  y: number;
  size: number;
  outlineRects: { shape: string; x: number; y: number }[];
  onDragStart: () => void;
  onActiveOutlineChange: (shape: string | null) => void;
  onDrop: (item: ShapeItem, targetShape: string | null) => void;
}) {
  const img = useShapeImage(item.image);
  const groupRef = useRef<Konva.Group | null>(null);
  const isDraggingRef = useRef(false);
  const iconSize = size * 0.72;
  const iconOffset = (size - iconSize) / 2;

  // Reflow: when this piece's tray slot moves (another piece ahead of it
  // got placed and removed), glide to the new spot instead of jumping —
  // but never fight the user's own in-progress drag.
  useEffect(() => {
    const node = groupRef.current;
    if (!node || isDraggingRef.current) return;
    node.to({ x, y, duration: 0.25, easing: Konva.Easings.EaseOut });
  }, [x, y]);

  const outlineAt = (cx: number, cy: number): string | null => {
    for (const r of outlineRects) {
      if (cx >= r.x && cx <= r.x + BOARD_BOX && cy >= r.y && cy <= r.y + BOARD_BOX) {
        return r.shape;
      }
    }
    return null;
  };

  const setCursor = (cursor: string) => (e: KonvaEventObject<Event>) => {
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = cursor;
  };

  return (
    <Group
      ref={groupRef}
      x={x}
      y={y}
      draggable
      // Keeps the whole card on the canvas so a piece can never be dragged out of sight.
      dragBoundFunc={(pos) => {
        const node = groupRef.current;
        const stage = node?.getStage();
        if (!node || !stage) return pos;
        const px = size * node.getAbsoluteScale().x;
        return {
          x: Math.min(Math.max(pos.x, 0), stage.width() - px),
          y: Math.min(Math.max(pos.y, 0), stage.height() - px),
        };
      }}
      onDragStart={(e) => {
        isDraggingRef.current = true;
        e.target.moveToTop();
        onDragStart();
      }}
      onDragMove={(e) => {
        const node = e.target;
        onActiveOutlineChange(outlineAt(node.x() + size / 2, node.y() + size / 2));
      }}
      onDragEnd={(e) => {
        isDraggingRef.current = false;
        const node = e.target;
        const target = outlineAt(node.x() + size / 2, node.y() + size / 2);
        onActiveOutlineChange(null);
        if (target !== item.shape) {
          node.to({ x, y, duration: 0.25, easing: Konva.Easings.EaseOut });
        }
        onDrop(item, target);
      }}
      onMouseEnter={setCursor("grab")}
      onMouseLeave={setCursor("default")}
      onMouseDown={setCursor("grabbing")}
      onMouseUp={setCursor("grab")}
    >
      <Rect
        width={size}
        height={size}
        cornerRadius={20}
        fill="#fffdf6"
        stroke="#9333ea"
        strokeWidth={4}
        strokeScaleEnabled={false}
        shadowColor="rgba(147,51,234,0.55)"
        shadowBlur={18}
        shadowOpacity={1}
      />
      {img && (
        <KonvaImage image={img} x={iconOffset} y={iconOffset} width={iconSize} height={iconSize} />
      )}
    </Group>
  );
}

/** The board itself: outline row + piece tray, both laid out in a fixed
 * coordinate space and scaled uniformly to fit whatever the wrapper's
 * actual size is (same responsive-Stage pattern as ShapesTracing.tsx). */
function ShapeBoard({
  items,
  outlineOrder,
  placed,
  activeOutlineId,
  onDragStart,
  onActiveOutlineChange,
  onDrop,
}: {
  items: ShapeItem[];
  outlineOrder: string[];
  placed: Record<string, boolean>;
  activeOutlineId: string | null;
  onDragStart: () => void;
  onActiveOutlineChange: (shape: string | null) => void;
  onDrop: (item: ShapeItem, targetShape: string | null) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0, zone: 0, card: 0 });

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    // --shape-drop-zone and --shape-card are 0px on desktop, where the board just fills the space; the tablet media query sets them.
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const css = getComputedStyle(el);
      setSize({
        w: rect.width,
        h: rect.height,
        zone: parseFloat(css.getPropertyValue("--shape-drop-zone")) || 0,
        card: parseFloat(css.getPropertyValue("--shape-card")) || 0,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Card size in board units, kept between 60% and 112% of a drop zone so tray cards keep a gap between them.
  const cardSize = size.zone > 0 && size.card > 0 ? BOARD_BOX * Math.min(Math.max(size.card / size.zone, 0.6), 1.12) : BOARD_BOX;
  const cardInset = (BOARD_BOX - cardSize) / 2;
  // Cards bigger than a drop zone stick out past the board's edge columns, so the fit leaves room for them.
  const overhang = Math.max(0, -cardInset);
  const fit = size.w > 0 && size.h > 0 ? Math.min(size.w / (BOARD_VBOX_W + 2 * overhang), size.h / BOARD_VBOX_H) : 0;
  const scale = size.zone > 0 ? Math.min(fit, size.zone / BOARD_BOX) : fit;

  const outlineRects = useMemo(
    () => outlineOrder.map((shape, i) => ({ shape, x: boardColumnX(i), y: BOARD_PAD })),
    [outlineOrder],
  );
  // The tray re-centers as pieces leave it, so the remaining cards stay in the middle under the outlines.
  const unplaced = useMemo(() => items.filter((it) => !placed[it.id]), [items, placed]);

  return (
    <div ref={wrapperRef} className="relative min-h-0 w-full flex-1 overflow-visible">
      {/* The canvas covers the whole play area with the board centered in it, so a dragged card or its glow is never cut at the board's edge. */}
      {scale > 0 && (
        <Stage width={size.w} height={size.h} className="absolute inset-0">
          <Layer
            x={(size.w - BOARD_VBOX_W * scale) / 2}
            y={(size.h - BOARD_VBOX_H * scale) / 2}
            scaleX={scale}
            scaleY={scale}
          >
            {outlineOrder.map((shape, i) => {
              const item = items.find((it) => it.shape === shape)!;
              const isFilled = !!placed[item.id];
              return (
                <OutlineCell
                  key={shape}
                  item={item}
                  x={boardColumnX(i)}
                  y={BOARD_PAD}
                  isFilled={isFilled}
                  isActive={activeOutlineId === shape && !isFilled}
                />
              );
            })}

            {unplaced.map((item, i) => (
              <DraggablePiece
                key={item.id}
                item={item}
                x={boardColumnX(i + (BOARD_COLS - unplaced.length) / 2) + cardInset}
                y={BOARD_PAD + BOARD_BOX + BOARD_ROW_GAP + cardInset}
                size={cardSize}
                outlineRects={outlineRects}
                onDragStart={onDragStart}
                onActiveOutlineChange={onActiveOutlineChange}
                onDrop={onDrop}
              />
            ))}
          </Layer>
        </Stage>
      )}
    </div>
  );
}

function ShapeTitle({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="flex items-center justify-center" role="img" aria-label="Shape">
      {TITLE_LETTERS.map((letter, i) => (
        <motion.span
          key={letter.alt}
          className={i === 0 ? "" : letter.alt === "E" ? "-ml-5 sm:-ml-7" : "-ml-4 sm:-ml-6"}
          initial={reduceMotion ? false : { scale: 0, opacity: 0, rotate: -15 }}
          animate={
            reduceMotion
              ? { scale: 1, opacity: 1 }
              : { scale: 1, opacity: 1, rotate: 0, y: [0, -8, 0] }
          }
          transition={
            reduceMotion
              ? { duration: 0.2 }
              : {
                  scale: { duration: 0.5, delay: i * 0.08, ease: EASE_OUT },
                  opacity: { duration: 0.5, delay: i * 0.08, ease: EASE_OUT },
                  rotate: { duration: 0.5, delay: i * 0.08, ease: EASE_OUT },
                  y: {
                    duration: 0.9,
                    delay: 0.6 + i * 0.12,
                    repeat: Infinity,
                    repeatDelay: 1.6,
                    ease: EASE_OUT,
                  },
                }
          }
        >
          <Image
            src={letter.src}
            alt={letter.alt}
            width={64}
            height={64}
            loading="eager"
            className={`object-contain ${className ?? "h-10 w-10 sm:h-12 sm:w-12"}`}
          />
        </motion.span>
      ))}
    </div>
  );
}

/** Decorative floating planets shared by the intro and board screens. */
function ShapePlanets() {
  const reduceMotion = useReducedMotion();
  return (
    <>
      <motion.div
        className="pointer-events-none absolute left-1 top-16 hidden sm:block sm:left-3 sm:top-28"
        animate={reduceMotion ? {} : { y: [0, -14, 0], rotate: [0, 4, -4, 0] }}
        transition={
          reduceMotion
            ? undefined
            : { duration: 6, repeat: Infinity, ease: EASE_OUT }
        }
      >
        <Image
          src={ASSETS.planets[0]}
          alt=""
          aria-hidden="true"
          width={160}
          height={160}
          loading="lazy"
          className="h-48 w-48 object-contain sm:h-72 sm:w-72"
        />
      </motion.div>
      <motion.div
        className="pointer-events-none absolute -right-4 top-40 hidden sm:block sm:-right-8 sm:top-50"
        animate={reduceMotion ? {} : { x: [0, -10, 0], scale: [1, 1.06, 1] }}
        transition={
          reduceMotion
            ? undefined
            : { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
        }
      >
        <Image
          src={ASSETS.planets[1]}
          alt=""
          aria-hidden="true"
          width={160}
          height={160}
          loading="lazy"
          className="h-48 w-48 object-contain sm:h-72 sm:w-72"
        />
      </motion.div>
      <motion.div
        className="pointer-events-none absolute right-16 top-[20rem] hidden sm:block sm:right-24 sm:top-[31rem]"
        animate={reduceMotion ? {} : { rotate: 360 }}
        transition={
          reduceMotion
            ? undefined
            : { duration: 14, repeat: Infinity, ease: "linear" }
        }
      >
        <Image
          src={ASSETS.planets[2]}
          alt=""
          aria-hidden="true"
          width={160}
          height={160}
          loading="lazy"
          className="h-24 w-24 object-contain sm:h-40 sm:w-40"
        />
      </motion.div>
    </>
  );
}

export default function Shape({
  activityId,
  onFinish,
}: GameComponentProps) {
  const reduceMotion = useReducedMotion();
  // CSS backgrounds aren't seen by <Image>, so this game's shared backdrop
  // gets a real preload link the same way <Image priority> images do.
  ReactDOM.preload(ASSETS.background, { as: "image" });
  // Shape data lives in the DB (activity_questions) — null until loaded.
  const [items, setItems] = useState<ShapeItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [wrongAttempts, setWrongAttempts] = useState(0);
  // A piece that's ever dropped in the wrong spot loses its star even once
  // it's eventually placed correctly — the checkmark still shows (it's
  // solved), the star just doesn't light up for that one.
  const [missedOnce, setMissedOnce] = useState<Record<string, boolean>>({});
  // The shape each piece was FIRST dropped on — correct or not. This, not a
  // hardcoded correct answer, is what gets submitted for grading, so the
  // server score matches what the star badge already shows.
  const [firstAttempt, setFirstAttempt] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [showResult, setShowResult] = useState(false);
  const [activeOutlineId, setActiveOutlineId] = useState<string | null>(null);

  // Text-to-speech — kindergarten learners can't necessarily read yet.
  const { speak, speakAll, stop } = useSpeech();

  // Plays once, when the board first becomes interactive.
  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (introSpokenRef.current) return;
    introSpokenRef.current = true;
    speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["match the shapes"]]);
  }, [speakAll]);

  useEffect(() => stop, [stop]);

  // Display-only: the learner name the child already picked on /learner.
  // Never used for grading/identity. Note: the unauthenticated picker
  // endpoint that fills this (/api/classroom-session/learners) deliberately
  // returns firstName only — middle/last name are withheld from that
  // unauthenticated caller. There's nothing more to display here.
  const [learnerName, setLearnerName] = useState<string | null>(null);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLearnerName(getLearnerFirstName());
  }, []);

  // Fetched once per activity (and again on Retry, via reloadKey). Kept in
  // question_order so the bottom tray keeps its authored piece order.
  useEffect(() => {
    if (!activityId) {
      setLoadError(true);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/activities/${activityId}/questions`);
        if (!res.ok)
          throw new Error(`Request failed with status ${res.status}`);
        const rows: QuestionRow[] = await res.json();
        if (cancelled) return;

        const mapped: ShapeItem[] = rows.map((row) => {
          const { shape, outlineIndex } = row.questionData as { shape: unknown; outlineIndex: unknown };
          if (typeof shape !== "string" || typeof outlineIndex !== "number") {
            throw new Error(`Question ${row.questionKey} needs a "shape" and a numeric "outlineIndex"`);
          }
          return { id: row.questionKey, shape, image: shapeAsset(shape), outlineIndex };
        });

        setItems(mapped);
      } catch (err) {
        console.error("Failed to load Shape Match questions:", err);
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

  // Top-row outline order, derived from the DB's outlineIndex — deliberately
  // not the same order as the pieces below, so the child has to match shapes
  // rather than drag straight up.
  const outlineOrder = useMemo(
    () =>
      [...(items ?? [])]
        .sort((a, b) => a.outlineIndex - b.outlineIndex)
        .map((item) => item.shape),
    [items],
  );

  const total = items?.length ?? 0;
  const starsEarned = useMemo(
    () =>
      (items ?? []).filter((item) => placed[item.id] && !missedOnce[item.id])
        .length,
    [items, placed, missedOnce],
  );

  const resultHeadline = headlineFor(wrongAttempts);

  // Drag-and-drop pickup chime, synthesised with Web Audio. This used to
  // load /sounds/pickup.wav and fall back to the synth when the file was
  // blocked, but that file has never existed in the repo: every mount spent
  // a request on a 404 and logged an error, then played the synth anyway.
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playTapSound = useCallback(() => {
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

  // Called by ShapeBoard on drop, with the outline shape (if any) the piece
  // landed on already resolved from Konva-space coordinates — no DOM rects
  // to measure here.
  const handleDrop = useCallback(
    (item: ShapeItem, targetId: string | null) => {
      if (targetId === item.shape) {
        const nextPlaced = { ...placed, [item.id]: true };
        setPlaced(nextPlaced);
        setFirstAttempt((prev) => (item.id in prev ? prev : { ...prev, [item.id]: targetId }));
        const message = correctSpeech(pickRandom(SPEECH.correct), !missedOnce[item.id]);
        setFeedback({ kind: "success", message });

        // On the last shape, the results speech only starts once this
        // line has actually finished — otherwise the two voices overlap.
        const isLastShape = Object.keys(nextPlaced).length === total;
        speak(message, () => {
          setFeedback(null);
          if (isLastShape) {
            setShowResult(true);
          }
        });
      } else if (targetId) {
        setWrongAttempts((n) => n + 1);
        setMissedOnce((prev) => ({ ...prev, [item.id]: true }));
        setFirstAttempt((prev) =>
          item.id in prev ? prev : { ...prev, [item.id]: targetId },
        );
        const message = pickRandom(SPEECH.wrong);
        setFeedback({ kind: "error", message });
        speak(message, () => setFeedback(null));
      }
    },
    [speak, placed, missedOnce, total],
  );

  const handleFinish = useCallback(() => {
    // The shape the learner actually first dropped it on — item.shape only
    // as a defensive fallback, since every piece has gone through at least
    // one attempt by the time Finish is reachable.
    const submitted: SubmittedAnswer[] = (items ?? []).map((item) => ({
      questionId: item.id,
      response: firstAttempt[item.id] ?? item.shape,
    }));
    onFinish?.(submitted);
  }, [onFinish, firstAttempt, items]);

  // No Finish button: once the result line has been spoken, the score is sent and the learner goes on to the class-ended page.
  const finishedRef = useRef(false);
  useEffect(() => {
    if (!showResult) return;
    speak(resultSpeech(wrongAttempts, starsEarned, total), () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      handleFinish();
    });
  }, [showResult, wrongAttempts, starsEarned, total, speak, handleFinish]);

  if (loadError) {
    return (
      <div
        className={`${styles.screen} fixed inset-0 flex h-dvh w-full flex-col items-center justify-center gap-5 px-6 text-center`}
        style={BG_STYLE}
      >
        <p className="text-xl font-bold sm:text-2xl">
          We couldn&apos;t get the shapes ready.
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className={`${styles.retryButton} min-h-14 rounded-full px-10 py-3 text-xl font-bold outline-none focus-visible:ring-4 focus-visible:ring-[#2f9e8f]/50 sm:text-2xl`}
        >
          Try Again 🔄
        </button>
      </div>
    );
  }

  if (!items) {
    return (
      <div
        className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 text-center`}
        style={BG_STYLE}
      >
        <p className="text-xl font-bold sm:text-2xl">
          Getting the shapes ready…
        </p>
      </div>
    );
  }

  return (
    <div
      className={`${styles.screen} fixed inset-0 flex h-dvh w-full flex-col overflow-hidden px-4 pb-3 pt-4 sm:px-8 sm:pb-5 sm:pt-6`}
      style={BG_STYLE}
    >
      <ShapePlanets />

      {/* header — stacked (title on top, badges below) on narrow phones;
          a true 3-column grid from sm: up keeps the title dead-center
          regardless of the name badge / star tracker's differing widths. */}
      <div className="relative z-10 mb-0 flex w-full shrink-0 flex-col items-center gap-1 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-3">
        <div className="order-1 sm:order-2 sm:justify-self-center">
          <ShapeTitle className={`${styles.titleLetter} h-14 w-14 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28`} />
        </div>
        <div className="order-2 flex items-center justify-center gap-2 sm:contents">
          {learnerName && (
            <div
              className={`${styles.nameBanner} relative aspect-[2172/724] w-28 shrink-0 sm:order-1 sm:w-64 sm:justify-self-start md:w-80 lg:w-96`}
              style={{ backgroundImage: `url(${ASSETS.nameBanner})` }}
            >
              <span className={`${styles.nameText} absolute left-[32%] top-1 flex h-full w-[48%] items-center justify-center truncate text-center text-[10px] font-extrabold leading-none sm:text-base md:text-xl lg:text-2xl`}>
                {learnerName}
              </span>
            </div>
          )}
          <Image
            src={starBadgeAsset(starsEarned)}
            alt={`${starsEarned} of ${total} stars earned`}
            width={320}
            height={107}
            loading="eager"
            className={`${styles.starBadge} h-9 w-auto object-contain sm:order-3 sm:h-16 sm:justify-self-end md:h-20 lg:h-24`}
          />
        </div>
      </div>

      {!showResult && (
        <div
          className={`${styles.instructionPanel} relative mx-auto -mt-1 mb-2 aspect-[2172/724] w-full max-w-[280px] shrink-0 sm:-mt-6 sm:mb-3 sm:max-w-xl md:max-w-2xl`}
          style={{ backgroundImage: `url(${ASSETS.instructionPanel})` }}
        >
          <p className={`${styles.instructionText} absolute left-[21%] top-[56%] w-[68%] -translate-y-1/2 text-center text-[11px] font-bold leading-tight sm:text-lg md:text-xl`}>
            Drag each colored shape up to the
            <br />
            outline it fits
          </p>
        </div>
      )}

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
            } pointer-events-none absolute right-2 top-[18vh] z-20 max-w-[46vw] rounded-lg px-3 py-1.5 text-[clamp(10px,2.4vw,16px)] font-bold sm:right-10 sm:top-36 sm:max-w-none sm:px-4 sm:py-2`}
          >
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {!showResult ? (
          <motion.div
            key="board"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            className={`${styles.boardArea} -mt-4 flex min-h-0 flex-1 flex-col items-center justify-center sm:-mt-8`}
          >
            <ShapeBoard
              items={items}
              outlineOrder={outlineOrder}
              placed={placed}
              activeOutlineId={activeOutlineId}
              onDragStart={playTapSound}
              onActiveOutlineChange={setActiveOutlineId}
              onDrop={handleDrop}
            />
          </motion.div>
        ) : (
          <motion.div
            key="closed"
            initial={{
              opacity: 0,
              scale: reduceMotion ? 1 : 0.85,
              y: reduceMotion ? 0 : 30,
            }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="flex flex-1 flex-col items-center justify-center gap-5"
          >
            <motion.div
              initial={
                reduceMotion
                  ? { scale: 1, opacity: 0 }
                  : { scale: 1.6, opacity: 0 }
              }
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className={`${styles.stamp} rounded-lg px-8 py-3 text-3xl font-extrabold uppercase tracking-widest sm:px-10 sm:py-4 sm:text-4xl`}
            >
              {resultHeadline}
            </motion.div>

            <p className={`${styles.starsEarned} flex items-center gap-2 rounded-full px-6 py-2 text-2xl font-bold sm:text-3xl`}>
              You earned {starsEarned} of {total} stars
              <Image
                src={ASSETS.starGif}
                alt=""
                width={48}
                height={48}
                loading="lazy"
                unoptimized
                className="h-10 w-10 object-contain sm:h-14 sm:w-14"
              />
            </p>

            {/* recap strip */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {items.map((item) => (
                <ShapeIcon
                  key={item.id}
                  item={item}
                  className="h-16 w-16 sm:h-20 sm:w-20"
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
