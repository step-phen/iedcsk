"use client";

import ReactDOM from "react-dom";
import { useState, useRef, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Stage, Layer, Circle, Line, Arrow, Star } from "react-konva";
import Image from "next/image";
import { Volume2 } from "lucide-react";
import { useReducedMotion } from "framer-motion";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, pickRandom } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import {
  ASSETS,
  COLORS,
  LINES,
  SPEECH,
  firstRoundSpeech,
  nextRoundSpeech,
  resultHeadline,
  resultSpeech,
  roundPrompt,
  traceSpeech,
  type Point,
} from "./Lines.data";
import styles from "./Lines.module.css";

// The rest of the backdrop lives in .screen.
const BG_STYLE = { backgroundImage: `url(${ASSETS.background})` } as const;

const SAMPLES = 40;
// The trace only finishes on the orange star itself (19px drawn radius plus a little room for a small finger), not near it.
const END_ZONE_PX = 20;
// How long the right path takes to draw itself after a messy trace.
const ANSWER_DRAW_MS = 1400;
const INK_WIDTH = 14;
// How many path samples one finger move may advance, enough for a quick swipe but not for jumping over part of the line.
const MAX_SAMPLE_JUMP = 4;
// Where the direction arrows sit along the line, the middle of each zigzag stroke, and how far beside it.
const ARROW_AT = [0.125, 0.375, 0.625, 0.875];
const ARROW_OFFSET_PX = 30;
// The three little sparks fanned behind the green dot and ahead of the orange star.
const SPARK_SPREAD = [-0.7, 0, 0.7];

function sparkPoints(at: Point, angle: number): number[] {
  return [at.x + Math.cos(angle) * 24, at.y + Math.sin(angle) * 24, at.x + Math.cos(angle) * 33, at.y + Math.sin(angle) * 33];
}

/** One round as consumed by this component, mapped from the API. */
interface Round {
  /** The row's own question_key, which grading matches answers on. */
  key: string;
  line: string;
}

interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

/** A round from its DB row ({line}); the answer is always "clean", and the game sends "off-path" for a trace that strayed. */
function buildRound(row: QuestionRow): Round {
  const { line } = row.questionData as { line: unknown };
  if (typeof line !== "string" || !(line in LINES)) {
    throw new Error(`Question ${row.questionKey} needs a known "line"`);
  }
  return { key: row.questionKey, line };
}

/** A run of the child's ink in one color; a new run starts whenever the finger crosses on or off the line. */
interface Stroke {
  color: string;
  points: number[];
}

/** The tracing area for one line, drawn with react-konva and sized to its box; it reports once, when the finger reaches the orange star. */
function TracingBoard({
  line,
  locked,
  reveal,
  onTraced,
}: {
  line: string;
  locked: boolean;
  /** After a messy trace: hides the child's ink and draws the right path from the green dot to the orange one. */
  reveal: boolean;
  onTraced: (clean: boolean) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const path = useMemo<Point[]>(
    () =>
      size.w > 0
        ? Array.from({ length: SAMPLES }, (_, i) => {
            const p = LINES[line].at(i / (SAMPLES - 1));
            return { x: p.x * size.w, y: p.y * size.h };
          })
        : [],
    [line, size],
  );
  const tolerance = Math.max(26, Math.min(size.w, size.h) * 0.1);

  // A resize moves the path, so ink drawn against the old one is cleared, adjusting state during render rather than in an effect.
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [drawnFor, setDrawnFor] = useState(path);
  if (path !== drawnFor) {
    setDrawnFor(path);
    setStrokes([]);
  }

  const drawingRef = useRef(false);
  const mistakeRef = useRef(false);
  const doneRef = useRef(false);
  // The furthest path sample the finger has followed to, so the orange star only counts after the whole line was traced.
  const reachedRef = useRef(-1);
  const wasInsideRef = useRef(true);

  const nearestSample = (pos: Point) => {
    let best = -1;
    let bestDist = tolerance;
    path.forEach((p, i) => {
      const d = Math.hypot(p.x - pos.x, p.y - pos.y);
      if (d <= bestDist) {
        best = i;
        bestDist = d;
      }
    });
    return best;
  };

  // Extends the current run, or starts a new one from the last point when the color changes, so the ink stays one unbroken line.
  const addPoint = (pos: Point, color: string) =>
    setStrokes((current) => {
      const last = current[current.length - 1];
      if (last && last.color === color) return [...current.slice(0, -1), { color, points: [...last.points, pos.x, pos.y] }];
      return [...current, { color, points: [...(last ? last.points.slice(-2) : [pos.x, pos.y]), pos.x, pos.y] }];
    });

  const pointer = (e: KonvaEventObject<PointerEvent>) => e.target.getStage()?.getPointerPosition() ?? null;

  const handleDown = (e: KonvaEventObject<PointerEvent>) => {
    const pos = pointer(e);
    if (locked || doneRef.current || !pos) return;
    // Starts only on the green dot, or picks up where a lifted finger left off, so a tap near the orange star can't skip the line.
    const from = path[Math.max(reachedRef.current, 0)];
    if (Math.hypot(pos.x - from.x, pos.y - from.y) > tolerance) return;
    reachedRef.current = Math.max(reachedRef.current, 0);
    wasInsideRef.current = true;
    drawingRef.current = true;
    addPoint(pos, COLORS.onPath);
  };

  const handleMove = (e: KonvaEventObject<PointerEvent>) => {
    const pos = pointer(e);
    if (!drawingRef.current || doneRef.current || !pos) return;
    const sample = nearestSample(pos);
    const inside = sample !== -1;
    if (!inside) mistakeRef.current = true;
    // Progress moves a few samples at a time along the line; after straying it may rejoin further on, since that trace already lost its star.
    if (inside && (sample <= reachedRef.current + MAX_SAMPLE_JUMP || !wasInsideRef.current)) {
      reachedRef.current = Math.max(reachedRef.current, sample);
    }
    wasInsideRef.current = inside;
    const color = inside ? COLORS.onPath : COLORS.offPath;
    addPoint(pos, color);

    const end = path[path.length - 1];
    if (reachedRef.current >= path.length - 1 - MAX_SAMPLE_JUMP && Math.hypot(pos.x - end.x, pos.y - end.y) <= END_ZONE_PX) {
      // Joins the ink to the dot's center so the finished line visibly reaches it.
      addPoint(end, color);
      doneRef.current = true;
      drawingRef.current = false;
      onTraced(!mistakeRef.current);
    }
  };

  const handleUp = () => {
    drawingRef.current = false;
  };

  // Draws the right path in over ANSWER_DRAW_MS, or all at once for reduced motion.
  const reduceMotion = useReducedMotion();
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const answerProgress = reduceMotion ? 1 : animatedProgress;
  useEffect(() => {
    if (!reveal || reduceMotion) return;
    let frame = 0;
    const startedAt = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startedAt) / ANSWER_DRAW_MS, 1);
      setAnimatedProgress(progress);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [reveal, reduceMotion]);

  const answerPoints = path.slice(0, Math.max(2, Math.round(answerProgress * (path.length - 1)) + 1)).flatMap((p) => [p.x, p.y]);

  // Direction of travel at t in board pixels, which turns the arrows and points the dots' sparks.
  const heading = (t: number) => {
    const a = LINES[line].at(Math.max(0, t - 0.01));
    const b = LINES[line].at(Math.min(1, t + 0.01));
    return Math.atan2((b.y - a.y) * size.h, (b.x - a.x) * size.w);
  };
  const start = path[0];
  const end = path[path.length - 1];
  const startAngle = heading(0) + Math.PI;
  const endAngle = heading(1);

  return (
    <div ref={wrapRef} className="absolute inset-0 touch-none">
      {path.length > 0 && (
        <Stage
          width={size.w}
          height={size.h}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerLeave={handleUp}
          onPointerCancel={handleUp}
          style={{ cursor: locked ? "default" : "pointer" }}
        >
          <Layer listening={false}>
            <Line points={path.flatMap((p) => [p.x, p.y])} stroke={COLORS.guide} strokeWidth={10} dash={[16, 14]} lineCap="round" lineJoin="round" />
            {ARROW_AT.map((t) => {
              const p = LINES[line].at(t);
              const angle = heading(t);
              return (
                <Arrow
                  key={t}
                  x={p.x * size.w + Math.sin(angle) * ARROW_OFFSET_PX}
                  y={p.y * size.h - Math.cos(angle) * ARROW_OFFSET_PX}
                  rotation={(angle * 180) / Math.PI}
                  points={[-12, 0, 12, 0]}
                  stroke={COLORS.arrow}
                  fill={COLORS.arrow}
                  strokeWidth={4}
                  pointerLength={7}
                  pointerWidth={10}
                  lineCap="round"
                  lineJoin="round"
                />
              );
            })}
            {!reveal &&
              strokes.map((stroke, i) => (
                <Line key={i} points={stroke.points} stroke={stroke.color} strokeWidth={INK_WIDTH} lineCap="round" lineJoin="round" />
              ))}
            {reveal && <Line points={answerPoints} stroke={COLORS.answer} strokeWidth={INK_WIDTH} lineCap="round" lineJoin="round" />}
            {SPARK_SPREAD.map((d) => (
              <Line key={`s${d}`} points={sparkPoints(start, startAngle + d)} stroke={COLORS.start} strokeWidth={4} lineCap="round" />
            ))}
            {SPARK_SPREAD.map((d) => (
              <Line key={`e${d}`} points={sparkPoints(end, endAngle + d)} stroke={COLORS.end} strokeWidth={4} lineCap="round" />
            ))}
            <Circle x={start.x} y={start.y} radius={15} fill={COLORS.start} stroke={COLORS.outline} strokeWidth={3} />
            <Star x={end.x} y={end.y} numPoints={5} innerRadius={9} outerRadius={19} fill={COLORS.end} stroke={COLORS.outline} strokeWidth={3} lineJoin="round" />
          </Layer>
        </Stage>
      )}
    </div>
  );
}

export default function Lines({
  activityId,
  activityName,
  onFinish,
}: GameComponentProps) {
  // CSS backgrounds aren't seen by the browser's preload scanner, so the shared backdrop gets a real preload link.
  ReactDOM.preload(ASSETS.background, { as: "image" });
  const { speak, speakAll, stop } = useSpeech();

  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Per-round outcome: true for a clean trace, false for one that strayed, null while not traced yet.
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
        console.error("Failed to load Lines questions:", err);
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
  const [gameComplete, setGameComplete] = useState(false);
  const [roundDone, setRoundDone] = useState(false);
  const [answers, setAnswers] = useState<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Follow the Lines";
  const prompt = round ? roundPrompt(round.line) : "";

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
    if (!rounds || !round || gameComplete) return;

    if (introStateRef.current === "pending") {
      introStateRef.current = "speaking";
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["follow the lines"]], () => {
        introStateRef.current = "done";
        // interrupt: false so this never cuts off a feedback line whose onEnd advances the round.
        speak(firstRoundSpeech(prompt), undefined, { interrupt: false });
      });
      return;
    }

    if (introStateRef.current === "speaking") return;

    // interrupt: false so it queues behind the feedback line that advanced the round.
    speak(nextRoundSpeech(roundIndex + 1, roundIndex === rounds.length - 1, prompt), undefined, { interrupt: false });
    // prompt is derived from the round, so keying on the round keeps this to one line per round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, round, roundIndex, gameComplete, speak, speakAll]);

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
      setGameComplete(true);
    } else {
      // The board is keyed by round, so it starts fresh for the next line.
      setRoundDone(false);
      setRoundIndex(roundIndex + 1);
    }
  }, [roundIndex, total]);

  const handleTraced = useCallback(
    (clean: boolean) => {
      if (!round) return;
      setRoundDone(true);
      if (clean) setScore((s) => s + 1);
      setRoundResults((prev) => {
        const next = [...prev];
        next[roundIndex] = clean;
        return next;
      });
      setAnswers((prev) => [...prev, { questionId: round.key, response: clean ? "clean" : "off-path" }]);

      // Finishing a trace cuts off the intro or prompt still playing, so the feedback is heard right away.
      // An interrupted intro never runs its onEnd, so it is marked done here or later rounds would never be announced.
      introStateRef.current = "done";
      // The board advances from onEnd so narration and screen stay in step; useSpeech still runs onEnd when a clip fails.
      speak(traceSpeech(round.line, clean, pickRandom(clean ? SPEECH.clean : SPEECH.offPath)), advanceRound);
    },
    [round, roundIndex, speak, advanceRound],
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
    if (gameComplete) speak(resultLine, finishOnce);
  }, [gameComplete, resultLine, speak, finishOnce]);

  if (loadError) {
    return (
      <div style={BG_STYLE} className={`${styles.screen} fixed inset-0 flex h-dvh w-full flex-col items-center justify-center gap-5 px-6 text-center`}>
        <p className="text-xl font-bold sm:text-2xl">We couldn&apos;t get the lines ready.</p>
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
        <p className="text-xl font-bold sm:text-2xl">Getting the lines ready…</p>
      </div>
    );
  }

  const lastResult = roundResults[roundIndex];

  return (
    <div style={BG_STYLE} className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full justify-center overflow-hidden px-3 pb-3 pt-20 sm:pt-3 short:pt-2`}>
      {/* In the screen's top-left corner beside the title; it stays on the result screen too. */}
      {learnerName && (
        <div className={`${styles.badge} fixed left-3 top-3 z-10 flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-xl font-extrabold short:py-1 short:text-base`}>
          <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={`${styles.avatar} size-11 text-xl short:size-8 short:text-base`} />
          <span className="max-w-48 truncate capitalize">{learnerName}</span>
        </div>
      )}
      <div className="flex h-full w-full max-w-[1000px] flex-col items-center">
        <h1 className="m-0 shrink-0">
          <Image
            src={ASSETS.title}
            alt={title}
            width={2172}
            height={724}
            priority
            draggable={false}
            className="h-[clamp(56px,13dvh,110px)] w-auto select-none"
          />
        </h1>

        {gameComplete ? (
          <div className={cn(styles.stage, styles.result, "mt-3 flex w-full max-w-xl flex-col items-center gap-2 rounded-[28px] px-6 py-6 text-center")}>
            <p className="m-0 text-[clamp(20px,3vw,30px)] font-black">{resultHeadline(score, total)}</p>
            <div className="flex items-center justify-center gap-2">
              <p className={`${styles.resultScore} m-0 text-[clamp(16px,2vw,20px)] font-extrabold`}>
                Score: {score} / {total}
              </p>
              <button
                type="button"
                onClick={() => speak(resultLine, finishOnce)}
                aria-label="Hear the result again"
                className={`${styles.roundButton} flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full`}
              >
                <Volume2 className="size-5" aria-hidden="true" />
              </button>
            </div>
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
            {/* The speaker button overlaps the pill's right end, as in the design. */}
            <div className="relative mt-1 flex max-w-full items-center short:mt-0">
              <p className={`${styles.instruction} m-0 rounded-full py-2 pl-6 pr-12 text-[clamp(14px,1.8vw,19px)] font-extrabold short:py-1`}>
                {LINES[round.line].instruction}
              </p>
              <button
                type="button"
                // Only while the round is open: replaying over the feedback line would cancel the onEnd that moves to the next round.
                onClick={() => speak(prompt)}
                disabled={roundDone}
                aria-label="Hear the instruction again"
                className={`${styles.roundButton} -ml-9 flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full short:size-9`}
              >
                <Volume2 className="size-6 short:size-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-3 flex justify-center gap-2.5 short:mt-1.5">
              {rounds.map((r, i) => (
                <div
                  key={r.key}
                  className={cn(
                    styles.pip,
                    i === roundIndex && styles.pipActive,
                    roundResults[i] === true && styles.pipClean,
                    roundResults[i] === false && styles.pipMessy,
                    "flex size-10 shrink-0 items-center justify-center rounded-full text-base font-extrabold short:size-8 short:text-sm",
                  )}
                  aria-label={roundResults[i] === null ? `Line ${i + 1}` : `Line ${i + 1}: ${roundResults[i] ? "neat" : "try again next time"}`}
                >
                  {roundResults[i] ? "⭐" : i + 1}
                </div>
              ))}
            </div>

            <div className={`${styles.stage} relative mt-4 max-h-[min(52dvh,460px)] min-h-0 w-full flex-1 overflow-hidden rounded-[28px] short:mt-2`}>
              <TracingBoard key={round.key} line={round.line} locked={roundDone} reveal={roundDone && lastResult === false} onTraced={handleTraced} />
              {/* At the top of the stage rather than over it, so a messy trace can watch the right path draw itself underneath. */}
              {roundDone && (
                <div
                  className={`${styles.feedback} pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-2xl px-6 py-2 text-lg font-black`}
                  aria-live="polite"
                >
                  {lastResult ? "Nice tracing! ⭐" : "Good try! Watch the green line 👀"}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
