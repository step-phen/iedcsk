"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import Image from "next/image";
import { Volume2, Eraser, RotateCcw, Brush } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, pickRandom } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { useImagePreload } from "@/hooks/useImagePreload";
import RealisticEffect from "@/components/effects/RealisticEffect";
import FireworksEffect from "@/components/effects/FireworksEffect";
import { cn } from "@/lib/utils";
import {
  ASSETS,
  CRAYONS,
  OBJECTS,
  SPEECH,
  doneSpeech,
  objectAsset,
  objectName,
  resultHeadline,
  resultSpeech,
  rightCrayonSpeech,
  roundPrompt,
  shortInstruction,
  wrongCrayonSpeech,
} from "./NumberColoring.data";
import styles from "./NumberColoring.module.css";

/**
 * The numeral is painted at a fixed internal resolution and scaled by CSS, so
 * the mask, the paint layer and the coverage maths all work in one stable
 * coordinate space no matter how big the box is drawn on screen.
 */
const BOX_SIZE = 340;
const BRUSH_RADIUS = 20;
// A round counts as colored once most of the numeral has been brushed over —
// not literally every pixel, which a wobbly kid brush stroke would never hit.
const COMPLETE_THRESHOLD = 0.75;
// Only every 4th pixel is sampled when checking coverage — a full per-pixel
// scan is overkill for a rough completion percentage.
const COVERAGE_SAMPLE_STEP = 4;
// Thickness of the navy numeral outline, and how many offsets approximate the
// circular brush used to grow/shrink the silhouette when building it.
const OUTLINE_WIDTH = 5;
const OUTLINE_DILATE_STEPS = 24;
/** How long a wrongly-picked crayon keeps its shake. */
const WRONG_SHAKE_MS = 500;

const INK = "#22314f";

// The rest of the backdrop lives in .screen.
const BG_STYLE = { backgroundImage: `url(${ASSETS.background})` } as const;

/**
 * The numeral is drawn in the app's Baloo 2 (the same face the rest of the
 * learner UI uses). next/font self-hosts it under a generated family name
 * exposed as --font-baloo2, so the literal "Baloo 2" would never match — the
 * variable has to be read back off the document.
 */
function digitFont(px: number): string {
  let family = "'Comic Sans MS', cursive";
  if (typeof window !== "undefined") {
    const resolved = getComputedStyle(document.documentElement).getPropertyValue("--font-baloo2").trim();
    if (resolved) family = `${resolved}, ${family}`;
  }
  return `bold ${px}px ${family}`;
}

function blankCanvas(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = BOX_SIZE;
  canvas.height = BOX_SIZE;
  return canvas;
}

/** Grows a silhouette by `radius`, stamping it around a circle of offsets. */
function dilate(source: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  const out = blankCanvas();
  const ctx = out.getContext("2d");
  if (!ctx) return out;
  for (let i = 0; i < OUTLINE_DILATE_STEPS; i += 1) {
    const angle = (i / OUTLINE_DILATE_STEPS) * Math.PI * 2;
    ctx.drawImage(source, Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  return out;
}

/**
 * The numeral's navy edge band, derived from the silhouette rather than from
 * strokeText().
 *
 * strokeText() strokes *every* contour in the glyph, and fonts build digits
 * out of overlapping sub-shapes — the 1's stem sitting on its foot, the 4's
 * stem crossing its bar — so the seams where those shapes overlap were stroked
 * too and showed up as stray lines inside the numeral. Growing the silhouette
 * and subtracting the shrunk silhouette leaves only its true perimeter: the
 * outer edge plus genuine counters such as the 4's triangle.
 */
function buildOutline(mask: HTMLCanvasElement): HTMLCanvasElement {
  const radius = OUTLINE_WIDTH / 2;

  // Everything the numeral does *not* cover.
  const complement = blankCanvas();
  const complementCtx = complement.getContext("2d");
  if (!complementCtx) return complement;
  complementCtx.fillStyle = "#000";
  complementCtx.fillRect(0, 0, BOX_SIZE, BOX_SIZE);
  complementCtx.globalCompositeOperation = "destination-out";
  complementCtx.drawImage(mask, 0, 0);
  complementCtx.globalCompositeOperation = "source-over";

  // Shrinking the numeral == the numeral minus the grown complement.
  const eroded = blankCanvas();
  const erodedCtx = eroded.getContext("2d");
  if (!erodedCtx) return eroded;
  erodedCtx.drawImage(mask, 0, 0);
  erodedCtx.globalCompositeOperation = "destination-out";
  erodedCtx.drawImage(dilate(complement, radius), 0, 0);
  erodedCtx.globalCompositeOperation = "source-over";

  const ring = dilate(mask, radius);
  const ringCtx = ring.getContext("2d");
  if (!ringCtx) return ring;
  ringCtx.globalCompositeOperation = "destination-out";
  ringCtx.drawImage(eroded, 0, 0);
  ringCtx.globalCompositeOperation = "source-in";
  ringCtx.fillStyle = INK;
  ringCtx.fillRect(0, 0, BOX_SIZE, BOX_SIZE);
  ringCtx.globalCompositeOperation = "source-over";
  return ring;
}

/** One round as consumed by this component, mapped from the API. */
interface Round {
  /** The row's own question_key, which grading matches answers on. */
  key: string;
  number: number;
  color: string;
  colorHex: string;
  object: string;
}

interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

/** A round from its DB row ({number, color, object}); the answer is the color, graded on the first crayon picked. */
function buildRound(row: QuestionRow): Round {
  const { number, color, object } = row.questionData as { number: unknown; color: unknown; object: unknown };
  const crayon = CRAYONS.find((c) => c.name === color);
  if (!Number.isInteger(number) || (number as number) < 1 || !crayon || typeof object !== "string" || !(object in OBJECTS) || row.correctAnswer.answer !== color) {
    throw new Error(`Question ${row.questionKey} needs a "number", a known crayon "color" matching its answer, and a known "object"`);
  }
  return { key: row.questionKey, number: number as number, color: crayon.name, colorHex: crayon.hex, object };
}

export default function NumberColoring({ activityId, activityName, onFinish }: GameComponentProps) {
  // CSS backgrounds aren't seen by the browser's preload scanner, so the shared backdrop gets a real preload link.
  ReactDOM.preload(ASSETS.background, { as: "image" });
  const { speak, speakAll, stop } = useSpeech();

  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Per-round outcome of the first crayon picked: true when it was the named color, null while not picked yet.
  const [roundResults, setRoundResults] = useState<(boolean | null)[]>([]);

  // Rounds live in the DB (activity_questions) and play in authored order, since 1 to 5 is a progression.
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
        console.error("Failed to load Number Coloring questions:", err);
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
  const [answers, setAnswers] = useState<SubmittedAnswer[]>([]);
  const [roundDone, setRoundDone] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [tool, setTool] = useState<"brush" | "eraser">("brush");
  const [wrongCrayon, setWrongCrayon] = useState<string | null>(null);
  // After a wrong pick the right crayon stays pointed out until the child picks it.
  const [reveal, setReveal] = useState(false);
  const [glow, setGlow] = useState(false);
  const [confettiOn, setConfettiOn] = useState(false);
  const [fontReady, setFontReady] = useState(false);

  const round = rounds?.[roundIndex];
  const title = activityName || "Number Coloring";
  const prompt = round ? roundPrompt(round.number, round.object, round.color) : "";
  // Warm only the next round's art, never the whole activity at once.
  const nextRound = rounds?.[roundIndex + 1];
  useImagePreload(nextRound ? [objectAsset(nextRound.object)] : []);

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);

  // Read inside pointer handlers, which must not be re-created (and re-bound) on every color or tool change mid-stroke.
  const selectedColorRef = useRef<string | null>(null);
  const toolRef = useRef<"brush" | "eraser">("brush");
  useEffect(() => {
    selectedColorRef.current = selectedColor;
  }, [selectedColor]);
  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);

  // Visible canvas the learner brushes on, plus two offscreen canvases: a mask
  // (the numeral's silhouette, rebuilt whenever the round changes) and an
  // accumulating paint layer that's re-clipped to that mask after every stroke
  // so paint can never spill outside the digit. The outline is prebuilt too.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const paintCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const outlineCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPaintingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Every pending timeout, so leaving the activity can't leave one firing into an unmounted tree.
  const timersRef = useRef<number[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    return () => {
      // Narration and timers both outlive React on their own — stop them.
      stop();
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, [stop]);

  // The numeral is drawn with Baloo 2; measuring it before the face loads would bake the fallback's metrics into the mask.
  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) setFontReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Draws the numeral (light fill), then the learner's paint, then the prebuilt outline on top — after every stroke and on round change.
  const renderDisplay = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !round) return;

    ctx.clearRect(0, 0, BOX_SIZE, BOX_SIZE);
    ctx.font = digitFont(BOX_SIZE * 0.86);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fffdf6";
    ctx.fillText(String(round.number), BOX_SIZE / 2, BOX_SIZE * 0.54);

    const paint = paintCanvasRef.current;
    if (paint) ctx.drawImage(paint, 0, 0);

    // Prebuilt band rather than strokeText() — see buildOutline() for why.
    const outline = outlineCanvasRef.current;
    if (outline) ctx.drawImage(outline, 0, 0);
  }, [round]);

  // Rebuilds the mask, outline and paint layer for whichever round is current.
  useEffect(() => {
    if (!round || !fontReady) return;

    if (!maskCanvasRef.current) maskCanvasRef.current = blankCanvas();
    if (!paintCanvasRef.current) paintCanvasRef.current = blankCanvas();

    const mask = maskCanvasRef.current;
    const maskCtx = mask.getContext("2d");
    if (maskCtx) {
      maskCtx.clearRect(0, 0, BOX_SIZE, BOX_SIZE);
      maskCtx.font = digitFont(BOX_SIZE * 0.86);
      maskCtx.textAlign = "center";
      maskCtx.textBaseline = "middle";
      maskCtx.fillStyle = "#000";
      maskCtx.fillText(String(round.number), BOX_SIZE / 2, BOX_SIZE * 0.54);
    }

    paintCanvasRef.current.getContext("2d")?.clearRect(0, 0, BOX_SIZE, BOX_SIZE);
    outlineCanvasRef.current = buildOutline(mask);
    renderDisplay();
  }, [round, fontReady, renderDisplay]);

  // The canvas is keyed by round, so drawing from the ref callback catches the moment each round's canvas mounts.
  const setCanvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      canvasRef.current = node;
      if (node) renderDisplay();
    },
    [renderDisplay],
  );

  // Plays once, before the very first round, and chains into that round's own
  // prompt via onEnd so the two lines never overlap. "introState" (not a
  // boolean) is what keeps it safe under StrictMode's dev-only double-invoke.
  const introStateRef = useRef<"pending" | "speaking" | "done">("pending");
  useEffect(() => {
    if (!rounds || !round || phase === "complete") return;

    if (introStateRef.current === "pending") {
      introStateRef.current = "speaking";
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["number coloring"]], () => {
        introStateRef.current = "done";
        // interrupt: false so this never cuts off a feedback line the learner triggered during the intro.
        speak(prompt, undefined, { interrupt: false });
      });
      return;
    }

    if (introStateRef.current === "speaking") return;

    // interrupt: false so it queues behind the praise line that advanced the round.
    speak(prompt, undefined, { interrupt: false });
    // prompt is derived from the round, so keying on the index keeps this to one line per round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex, phase, speak, speakAll]);

  // ---- painting -------------------------------------------------------
  const clipPaintToMask = useCallback(() => {
    const paint = paintCanvasRef.current;
    const mask = maskCanvasRef.current;
    const ctx = paint?.getContext("2d");
    if (!paint || !mask || !ctx) return;
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = "source-over";
  }, []);

  /** Brush and eraser differ only in composite mode, so they share a path. */
  const strokeSegment = useCallback((from: { x: number; y: number } | null, to: { x: number; y: number }) => {
    const ctx = paintCanvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = toolRef.current === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = selectedColorRef.current ?? "#000";
    ctx.fillStyle = selectedColorRef.current ?? "#000";
    ctx.lineWidth = BRUSH_RADIUS * 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    if (from) {
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    } else {
      ctx.arc(to.x, to.y, BRUSH_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }, []);

  // The canvas is drawn at a fixed internal size and scaled by CSS, so pointer coordinates are mapped back into that space.
  const getCanvasPos = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * BOX_SIZE,
      y: ((e.clientY - rect.top) / rect.height) * BOX_SIZE,
    };
  }, []);

  /** Rough painted-vs-paintable ratio, measured only inside the numeral. */
  const computeCoverage = useCallback((): number => {
    const maskCtx = maskCanvasRef.current?.getContext("2d");
    const paintCtx = paintCanvasRef.current?.getContext("2d");
    if (!maskCtx || !paintCtx) return 0;

    const maskData = maskCtx.getImageData(0, 0, BOX_SIZE, BOX_SIZE).data;
    const paintData = paintCtx.getImageData(0, 0, BOX_SIZE, BOX_SIZE).data;

    let maskCount = 0;
    let paintedCount = 0;
    for (let i = 3; i < maskData.length; i += 4 * COVERAGE_SAMPLE_STEP) {
      if (maskData[i] > 10) {
        maskCount += 1;
        if (paintData[i] > 10) paintedCount += 1;
      }
    }
    return maskCount ? paintedCount / maskCount : 0;
  }, []);

  // Advancement rides on the praise line finishing, so a stray double-fire would skip a round. One advance per round, enforced here.
  const advancingRef = useRef(false);
  useEffect(() => {
    advancingRef.current = false;
  }, [roundIndex]);

  const advanceRound = useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setGlow(false);
    if (roundIndex + 1 >= total) {
      setPhase("complete");
    } else {
      setRoundDone(false);
      setSelectedColor(null);
      setTool("brush");
      setReveal(false);
      setRoundIndex(roundIndex + 1);
    }
  }, [roundIndex, total]);

  const completeRound = useCallback(() => {
    if (!round || roundDone) return;
    setRoundDone(true);
    setGlow(true);
    setConfettiOn(true);
    later(() => setConfettiOn(false), 600);
    // Interrupts whatever is still playing, then advances once the praise has been heard.
    speak(doneSpeech(pickRandom(SPEECH.done), round.number), advanceRound);
  }, [round, roundDone, later, speak, advanceRound]);

  const canPaint = !!round && !roundDone && (tool === "eraser" || selectedColor === round.colorHex);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!canPaint) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      isPaintingRef.current = true;
      const pos = getCanvasPos(e);
      lastPointRef.current = pos;
      strokeSegment(null, pos);
      clipPaintToMask();
      renderDisplay();
    },
    [canPaint, getCanvasPos, strokeSegment, clipPaintToMask, renderDisplay],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isPaintingRef.current) return;
      const pos = getCanvasPos(e);
      strokeSegment(lastPointRef.current, pos);
      lastPointRef.current = pos;
      clipPaintToMask();
      renderDisplay();
    },
    [getCanvasPos, strokeSegment, clipPaintToMask, renderDisplay],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isPaintingRef.current) return;
      isPaintingRef.current = false;
      lastPointRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Capture may already be gone (pointer cancel) — harmless.
      }
      if (computeCoverage() >= COMPLETE_THRESHOLD) completeRound();
    },
    [computeCoverage, completeRound],
  );

  // ---- crayons --------------------------------------------------------
  const chooseCrayon = useCallback(
    (crayon: { name: string; hex: string }) => {
      if (!round || roundDone || selectedColor === crayon.hex) return;
      const isRight = crayon.hex === round.colorHex;

      // Only the first crayon picked for a number is graded.
      if (roundResults[roundIndex] === null) {
        setRoundResults((prev) => {
          const next = [...prev];
          next[roundIndex] = isRight;
          return next;
        });
        setAnswers((prev) => [...prev, { questionId: round.key, response: crayon.name }]);
        if (isRight) setScore((s) => s + 1);
      }

      // Picking cuts off the intro or prompt still playing; an interrupted intro never runs its onEnd, so it is marked done here.
      introStateRef.current = "done";

      if (isRight) {
        setSelectedColor(crayon.hex);
        setTool("brush");
        setReveal(false);
        speak(rightCrayonSpeech(pickRandom(SPEECH.rightCrayon), round.color, round.number));
        return;
      }

      // Wrong crayon: nothing gets painted; it shakes while the right one zooms in and stays pointed out.
      setWrongCrayon(crayon.hex);
      later(() => setWrongCrayon((hex) => (hex === crayon.hex ? null : hex)), WRONG_SHAKE_MS);
      setReveal(true);
      speak(wrongCrayonSpeech(pickRandom(SPEECH.wrongCrayon), crayon.name, round.color, round.number));
    },
    [round, roundDone, selectedColor, roundResults, roundIndex, speak, later],
  );

  const clearPaint = useCallback(() => {
    if (roundDone) return;
    paintCanvasRef.current?.getContext("2d")?.clearRect(0, 0, BOX_SIZE, BOX_SIZE);
    renderDisplay();
  }, [roundDone, renderDisplay]);

  // No Finish button: once the result line has been spoken, the answers are sent and the learner goes on to the class-ended page.
  const finishedRef = useRef(false);
  const finishOnce = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.(answers);
  }, [onFinish, answers]);

  // Read out on the completion screen; its replay button also finishes, since replaying cancels the first line's onEnd.
  const resultLine = resultSpeech(score, total);
  useEffect(() => {
    if (phase === "complete") speak(resultLine, finishOnce);
  }, [phase, resultLine, speak, finishOnce]);

  // ---- render ---------------------------------------------------------
  if (loadError) {
    return (
      <div style={BG_STYLE} className={`${styles.screen} fixed inset-0 flex h-dvh w-full flex-col items-center justify-center gap-5 px-6 text-center font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>We couldn&apos;t get the numbers ready.</p>
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
      <div style={BG_STYLE} className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 text-center font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Getting the numbers ready…</p>
      </div>
    );
  }

  const toolButton = "flex size-[clamp(42px,7.6vh,58px)] shrink-0 items-center justify-center rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0]";

  return (
    <div style={BG_STYLE} className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      <RealisticEffect active={confettiOn} originY={45} pieceCount={160} />
      <FireworksEffect active={phase === "complete"} />

      {/* The name stays in the top-left corner on the result screen too; the progress stars leave with the board. */}
      {learnerName && (
        <div className={`${styles.badge} fixed left-3 top-3 z-10 flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-xl font-extrabold short:py-1 short:text-base`}>
          <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={`${styles.avatar} size-11 text-xl short:size-8 short:text-base`} />
          <span className="max-w-48 truncate capitalize leading-none">{learnerName}</span>
        </div>
      )}
      {phase !== "complete" && (
        <div className={`${styles.badge} fixed right-3 top-3 z-10 flex items-center gap-1 rounded-full px-3 py-1.5`} aria-label={`Score: ${score} of ${total}`}>
          {rounds.map((r, i) => (
            <Image
              key={r.key}
              src={roundResults[i] ? ASSETS.starFilled : ASSETS.starEmpty}
              alt=""
              width={128}
              height={128}
              loading="eager"
              className={cn("size-[clamp(20px,3.6vh,30px)] object-contain transition-transform", i === roundIndex && "scale-125")}
            />
          ))}
        </div>
      )}

      <h1 className="relative z-[1] m-0 shrink-0 text-center text-[clamp(26px,5.5vh,46px)] font-extrabold leading-tight drop-shadow-[0_2px_0_white]">{title}</h1>

      {phase === "complete" ? (
        <div className={`${styles.result} relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center`}>
          <div className="flex items-center gap-3">
            <div className={`${styles.resultStamp} rounded-md px-[clamp(14px,3vw,30px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You picked the right color for {score} of {total} numbers!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {roundResults.map((result, i) => (
              <Image key={i} src={result ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(34,49,79,0.25)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>
              {shortInstruction(round.number, round.color)}
            </p>
            <button
              type="button"
              // Only while the round is open: replaying over the praise line would cancel the onEnd that moves to the next round.
              onClick={() => speak(prompt)}
              disabled={roundDone}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          {/* Objects beside the numeral when held sideways, above it when upright. */}
          <main className="relative z-[1] flex min-h-0 w-full flex-1 items-center justify-center gap-[clamp(8px,2vh,20px)] portrait:flex-col landscape:flex-row landscape:gap-[clamp(16px,4vw,56px)]">
            <div
              role="img"
              aria-label={`${round.number} ${objectName(round.object, round.number)}`}
              className="flex max-w-[min(92vw,440px)] flex-wrap items-center justify-center gap-[clamp(4px,1.2vw,14px)] landscape:max-w-[min(38vw,440px)]"
            >
              {Array.from({ length: round.number }, (_, i) => (
                <Image
                  key={`${round.key}-${i}`}
                  src={objectAsset(round.object)}
                  alt=""
                  width={320}
                  height={320}
                  loading="eager"
                  draggable={false}
                  className="size-[clamp(44px,10vh,92px)] select-none object-contain drop-shadow-[0_3px_2px_rgba(34,49,79,0.18)]"
                />
              ))}
            </div>

            <div
              className="shrink-0 rounded-3xl"
              style={{ filter: glow ? `drop-shadow(0 0 18px ${round.colorHex})` : "none", transition: "filter 300ms ease-out" }}
            >
              <canvas
                key={round.key}
                ref={setCanvasRef}
                width={BOX_SIZE}
                height={BOX_SIZE}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onPointerCancel={handlePointerUp}
                aria-label={`Number ${round.number} to color`}
                style={{ touchAction: "none", cursor: roundDone ? "default" : canPaint ? "crosshair" : "not-allowed" }}
                className="size-[min(36dvh,78vw,340px)] select-none landscape:size-[min(50dvh,36vw,380px)]"
              />
            </div>
          </main>

          <div className="relative z-[1] mt-[clamp(4px,1vh,12px)] flex shrink-0 flex-wrap items-end justify-center gap-[clamp(8px,1.6vw,18px)]">
            {CRAYONS.map((crayon) => {
              const isRight = crayon.hex === round.colorHex;
              return (
                <button
                  key={crayon.hex}
                  type="button"
                  onClick={() => chooseCrayon(crayon)}
                  disabled={roundDone}
                  aria-label={crayon.name}
                  aria-pressed={selectedColor === crayon.hex}
                  className={cn(
                    styles.crayon,
                    "relative h-[clamp(52px,11vh,88px)] w-[clamp(30px,5.4vh,44px)] shrink-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0]",
                    selectedColor === crayon.hex && styles.crayonSelected,
                    reveal && isRight && styles.crayonReveal,
                    wrongCrayon === crayon.hex && styles.crayonWrong,
                    reveal && !isRight && wrongCrayon !== crayon.hex && styles.crayonDimmed,
                  )}
                >
                  <span className={`${styles.crayonBody} absolute inset-0 block`} style={{ background: crayon.hex }}>
                    <span className="pointer-events-none absolute inset-x-0 top-[28%] h-[16%] bg-white/35" />
                    <span className="pointer-events-none absolute inset-x-0 bottom-[10%] h-[16%] bg-white/25" />
                  </span>
                </button>
              );
            })}

            <div className="mx-1 h-[clamp(34px,6vh,52px)] w-px self-center bg-[#22314f]/25" />

            <button type="button" onClick={() => setTool("brush")} aria-label="Brush" aria-pressed={tool === "brush"} className={cn(styles.iconButton, tool === "brush" && styles.iconButtonOn, toolButton)}>
              <Brush size={20} strokeWidth={2.6} />
            </button>
            <button type="button" onClick={() => setTool("eraser")} aria-label="Eraser" aria-pressed={tool === "eraser"} className={cn(styles.iconButton, tool === "eraser" && styles.iconButtonOn, toolButton)}>
              <Eraser size={20} strokeWidth={2.6} />
            </button>
            <button type="button" onClick={clearPaint} aria-label="Clear the whole number" className={cn(styles.iconButton, toolButton)}>
              <RotateCcw size={20} strokeWidth={2.6} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
