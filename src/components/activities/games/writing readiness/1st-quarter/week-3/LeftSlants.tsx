"use client";

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Stage, Layer, Line } from "react-konva";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, pickRandom } from "@/hooks/useSpeech";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import {
  ASSETS,
  BOTTOM_Y,
  CODE_ROUNDS,
  COLORS,
  GREEN_TOL,
  MAX_JUMP,
  MID_Y,
  RED_TOL,
  ROW_DONE_LINES,
  ROW_DONE_TEXT,
  STROKES,
  TITLE,
  TOP_Y,
  TOTAL_POINTS,
  VIEW_H,
  VIEW_W,
  resultSpeech,
  scoreImage,
  type Point,
} from "./LeftSlants.data";
import styles from "./LeftSlants.module.css";

// The picture itself comes from the data file, so it is set inline.
const BG_STYLE = { backgroundImage: `url(${ASSETS.background})` } as const;

/* ---------------------------------------------------------------
   LEFT SLANTS — worksheet-style tracing, like the reference sheet:
   a row of ruled lines (blue top, red mid, blue bottom) with several
   dashed left-slanting strokes to trace between them. Each round is
   one row; the learner must trace every stroke in the row before it
   advances. Pointer-tracing mechanic follows the same coverage model
   as long-and-short-straight-lines.tsx / RightSlants.tsx, generalized
   to several guide segments per round instead of one, mirrored to
   lean left instead of right.

   Rendered with Konva/react-konva (Stage/Layer) instead of raw SVG —
   fixed VBOX coordinate space (VIEW_W x VIEW_H), a ResizeObserver on
   the wrapper div drives a uniform Stage scale, and Konva's own
   pointer events replace manual getBoundingClientRect() math, matching
   the pattern used in Overcurves.tsx / Shape.tsx.
--------------------------------------------------------------- */

type TrailState = "green" | "red";
type TrailEntry = { x: number; y: number; state: TrailState } | null;
type Phase = "playing" | "complete";
type CoverageState = "pending" | "green" | "red";

/** Question data as stored in `activity_questions.question_data`. Used only
 *  to gate on + order the rounds — the tracing geometry is code-owned in
 *  STROKES above. correct_answer.answer is always the fixed string
 *  "correct" — a round always completes once every guide dot in the row is
 *  traced green, so there's no wrong-answer outcome to distinguish. */
interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

/* ---------------------------------------------------------------
   TRACE BOARD — the Konva canvas. Owns the responsive Stage scale and
   translates pointer events into VBOX-space points for the caller;
   all tracing state (coverage, trail, completion) stays in the main
   component, same separation as Overcurves.tsx's TraceBoard.
--------------------------------------------------------------- */
function TraceBoard({
  trail,
  phase,
  completed,
  justCompleted,
  onPointerDownAt,
  onPointerMoveAt,
  onPointerUp,
}: {
  trail: TrailEntry[];
  phase: Phase;
  completed: boolean;
  justCompleted: boolean;
  onPointerDownAt: (p: Point) => void;
  onPointerMoveAt: (p: Point) => void;
  onPointerUp: () => void;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = wrapperRef.current;
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

  const scale = size.w > 0 && size.h > 0 ? Math.min(size.w / VIEW_W, size.h / VIEW_H) : 0;

  // Konva's getPointerPosition() returns raw stage-container pixels, not the
  // Stage's own scaled coordinate space — divide by scale to land back in
  // VBOX units (same convention as Konva's own zoom/pan examples).
  const localPoint = (evt: KonvaEventObject<PointerEvent>): Point | null => {
    const stage = evt.target.getStage();
    if (!stage || scale === 0) return null;
    const pos = stage.getPointerPosition();
    if (!pos) return null;
    return { x: pos.x / scale, y: pos.y / scale };
  };

  const handleDown = (evt: KonvaEventObject<PointerEvent>) => {
    if (completed || phase !== "playing") return;
    evt.evt.preventDefault();
    try {
      // Capture on the native event target (the real <canvas>), not
      // Konva's container div — a capture request on an element that never
      // received the pointerdown is a silent no-op.
      (evt.evt.target as Element).setPointerCapture(evt.evt.pointerId);
    } catch {
      /* ignore */
    }
    const p = localPoint(evt);
    if (p) onPointerDownAt(p);
  };

  const handleMove = (evt: KonvaEventObject<PointerEvent>) => {
    if (phase !== "playing") return;
    evt.evt.preventDefault();
    const p = localPoint(evt);
    if (p) onPointerMoveAt(p);
  };

  return (
    <div ref={wrapperRef} className={styles.trace}>
      {scale > 0 && (
        <Stage
          width={VIEW_W * scale}
          height={VIEW_H * scale}
          scaleX={scale}
          scaleY={scale}
          className={styles.stage}
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <Layer>
            {/* ruled lines — reference only, never colored in */}
            <Line points={[0, TOP_Y, VIEW_W, TOP_Y]} stroke={COLORS.ruleBlue} strokeWidth={3} strokeScaleEnabled={false} />
            <Line points={[0, MID_Y, VIEW_W, MID_Y]} stroke={COLORS.ruleRed} strokeWidth={2.5} strokeScaleEnabled={false} />
            <Line points={[0, BOTTOM_Y, VIEW_W, BOTTOM_Y]} stroke={COLORS.ruleBlue} strokeWidth={3} strokeScaleEnabled={false} />

            {/* dashed guide strokes to trace */}
            {STROKES.map((stroke, i) => (
              <Line
                key={i}
                points={[stroke.a.x, stroke.a.y, stroke.b.x, stroke.b.y]}
                stroke={COLORS.guide}
                strokeWidth={6}
                dash={[10, 8]}
                lineCap="round"
                opacity={0.55}
                strokeScaleEnabled={false}
              />
            ))}

            {/* the learner's actual drawn path */}
            {trail.slice(1).map((curr, i) => {
              const prev = trail[i];
              if (!prev || !curr) return null;
              const strokeColor = curr.state === "green" ? COLORS.traceGreen : COLORS.traceRed;
              return (
                <Line
                  key={i}
                  points={[prev.x, prev.y, curr.x, curr.y]}
                  stroke={strokeColor}
                  strokeWidth={7}
                  lineCap="round"
                  strokeScaleEnabled={false}
                />
              );
            })}
          </Layer>
        </Stage>
      )}

      {justCompleted && (
        <div className={styles.cheer}>
          <div className={styles.cheerPill}>
            <Sparkles size={18} /> {ROW_DONE_TEXT}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------
   MAIN COMPONENT
--------------------------------------------------------------- */
/** Rounds built from `activity_questions` rows. */
function buildRounds(rows: { questionKey: string }[]): string[] {
  return rows.map((row) => row.questionKey);
}

export default function LeftSlants({
  activityId,
  activityName,
  onFinish,
}: GameComponentProps) {
  const { speak, speakAll, stop } = useSpeech();

  const [questionKeys, setQuestionKeys] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Question data lives in the DB (activity_questions), fetched once — every
  // other activity in this app works the same way. Only the ordered list of
  // question keys comes from the server; the tracing geometry is code-owned
  // in STROKES above and reused for every round (row).
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

        setQuestionKeys(buildRounds(rows));
      } catch (err) {
        console.error("Failed to load Left Slants questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const total = questionKeys ? Math.min(questionKeys.length, CODE_ROUNDS) : 0;

  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [, setRenderVersion] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);
  const [answers, setAnswers] = useState<SubmittedAnswer[]>([]);

  const coverageRef = useRef<CoverageState[][]>([]); // one array per stroke
  const tracePathRef = useRef<TrailEntry[]>([]);
  const completedRef = useRef(false);
  const scoredRef = useRef(false);
  const draggingRef = useRef(false);
  const prevPointRef = useRef<Point | null>(null);

  useEffect(() => stop, [stop]);

  const [learnerName, setLearnerName] = useState<string | null>(null);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLearnerName(getLearnerFirstName());
  }, []);

  const introStateRef = useRef<"pending" | "speaking" | "done">("pending");
  useEffect(() => {
    if (!questionKeys) return;
    if (introStateRef.current === "pending") {
      introStateRef.current = "speaking";
      speakAll([
        learnerGreeting(getLearnerFirstName()),
        GAME_INTRO_LINES["left slant trails"],
      ]);
      introStateRef.current = "done";
    }
  }, [questionKeys, speakAll]);

  const finishedRef = useRef(false);
  const handleFinish = useCallback(
    (finalAnswers: SubmittedAnswer[]) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      stop();
      onFinish?.(finalAnswers);
    },
    [onFinish, stop],
  );

  useEffect(() => {
    if (total === 0) return;
    coverageRef.current = STROKES.map((s) => new Array<CoverageState>(s.points.length).fill("pending"));
    tracePathRef.current = [];
    completedRef.current = false;
    scoredRef.current = false;
    prevPointRef.current = null;
    setRenderVersion((v) => v + 1);
  }, [roundIdx, total]);

  /** Finds the closest guide point across every stroke in the row —
   *  unclamped perpendicular distance so overshooting past either tip of a
   *  stroke is still measured fairly, same rule as the single-line game. */
  const nearestAcrossStrokes = (p: Point): { strokeIdx: number; idx: number; dist: number } => {
    let best = { strokeIdx: 0, idx: 0, dist: Infinity };
    STROKES.forEach((stroke, strokeIdx) => {
      const { a, b, points } = stroke;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      const t = lenSq === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
      const footX = a.x + t * dx;
      const footY = a.y + t * dy;
      const dist = Math.hypot(p.x - footX, p.y - footY);
      if (dist < best.dist) {
        const tClamped = Math.max(0, Math.min(1, t));
        const idx = Math.min(points.length - 1, Math.max(0, Math.round(tClamped * (points.length - 1))));
        best = { strokeIdx, idx, dist };
      }
    });
    return best;
  };

  const triggerCompletion = useCallback(() => {
    if (scoredRef.current) return;
    scoredRef.current = true;
    completedRef.current = true;
    draggingRef.current = false;
    setScore((s) => s + 1);
    setJustCompleted(true);

    const key = questionKeys?.[roundIdx];
    let nextAnswers = answers;
    if (key) {
      nextAnswers = [...answers, { questionId: key, response: "correct" }];
      setAnswers(nextAnswers);
    }

    // Wait for the praise line to finish speaking before moving on — the
    // next row's guide strokes would otherwise render mid-sentence.
    speak(
      pickRandom(ROW_DONE_LINES),
      () => {
        setJustCompleted(false);
        const isLastRound = roundIdx === total - 1;
        if (isLastRound) {
          setPhase("complete");
          return;
        }
        setRoundIdx((idx) => idx + 1);
      },
      { interrupt: false },
    );
  }, [roundIdx, total, answers, questionKeys, speak]);

  const evaluatePoint = (p: Point): { state: TrailState | null } => {
    const { strokeIdx, idx, dist } = nearestAcrossStrokes(p);
    let state: TrailState | null = null;
    if (dist <= GREEN_TOL) state = "green";
    else if (dist <= RED_TOL) state = "red";

    const arr = coverageRef.current[strokeIdx];
    if (state === "green") {
      if (arr[idx] !== "green") arr[idx] = "green";
    } else if (state === "red") {
      if (arr[idx] === "pending") arr[idx] = "red";
    }
    return { state };
  };

  const pushTrail = (entry: TrailEntry) => {
    const arr = tracePathRef.current;
    if (entry === null) {
      if (arr.length > 0 && arr[arr.length - 1] !== null) arr.push(null);
    } else {
      arr.push(entry);
    }
  };

  const afterPointerUpdate = () => {
    setRenderVersion((v) => v + 1);
    const greenCount = coverageRef.current.reduce(
      (sum, arr) => sum + arr.filter((s) => s === "green").length,
      0,
    );
    if (!completedRef.current && greenCount >= TOTAL_POINTS) {
      triggerCompletion();
    }
  };

  const handlePointerDownAt = (p: Point) => {
    if (completedRef.current || phase !== "playing") return;
    draggingRef.current = true;
    pushTrail(null);
    prevPointRef.current = p;
    const { state } = evaluatePoint(p);
    pushTrail(state ? { x: p.x, y: p.y, state } : null);
    afterPointerUpdate();
  };

  const handlePointerMoveAt = (p: Point) => {
    if (!draggingRef.current || completedRef.current || phase !== "playing") return;
    const prev = prevPointRef.current || p;
    const jumpDist = Math.hypot(p.x - prev.x, p.y - prev.y);

    if (jumpDist > MAX_JUMP) {
      pushTrail(null);
      const { state } = evaluatePoint(p);
      pushTrail(state ? { x: p.x, y: p.y, state } : null);
    } else {
      const STEPS = 4;
      for (let s = 1; s <= STEPS; s++) {
        const t = s / STEPS;
        const ix = prev.x + (p.x - prev.x) * t;
        const iy = prev.y + (p.y - prev.y) * t;
        const { state } = evaluatePoint({ x: ix, y: iy });
        pushTrail(state ? { x: ix, y: iy, state } : null);
      }
    }

    prevPointRef.current = p;
    afterPointerUpdate();
  };

  const stopDragging = () => {
    draggingRef.current = false;
  };

  // The result screen reads the score out, and the answers are sent once that line has ended.
  useEffect(() => {
    if (phase !== "complete") return;
    speak(resultSpeech(score, total), () => handleFinish(answers));
    // Runs once, when the last row is done.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (loadError) {
    return (
      <div className={cn(styles.screen, styles.centered)} style={BG_STYLE}>
        <p className={styles.message}>Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!questionKeys || total === 0) {
    return (
      <div className={cn(styles.screen, styles.centered)} style={BG_STYLE}>
        <p className={styles.message}>Loading…</p>
      </div>
    );
  }

  const learnerBadgeContent = learnerName && (
    <div className={styles.nameChip}>
      <span className={styles.nameEmoji} aria-hidden>
        🙋
      </span>
      <span className={styles.nameText}>{learnerName}</span>
    </div>
  );

  return (
    <div className={cn(styles.screen, styles.playing)} style={BG_STYLE}>
      {phase === "complete" ? (
        <>
          {learnerBadgeContent && (
            <div className={styles.nameCorner}>{learnerBadgeContent}</div>
          )}
        <div className={styles.resultWrap}>
          <div className={cn(styles.card, styles.resultCard)}>
            <h1 className={styles.resultTitle}>{(activityName || TITLE).toUpperCase()} COMPLETE!</h1>
            <p className={styles.resultScore}>
              Score: {score} / {total}
            </p>
          </div>
        </div>
        </>
      ) : (
        <div className={styles.board}>
          <div className={styles.header}>
            <div className={styles.sidebar}>
              {learnerBadgeContent}
              <div className={styles.rowCard}>
                <div className={styles.rowLabel}>
                  Row <span className={styles.rowNumber}>{roundIdx + 1}</span> of {total}
                </div>
                <div className={styles.dots}>
                  {Array.from({ length: total }, (_, i) => (
                    <span key={i} className={cn(styles.dot, i === roundIdx && styles.dotActive)} />
                  ))}
                </div>
              </div>
            </div>

            <Image
              src={ASSETS.titleBanner}
              alt="Left Slants — Trace the slanting lines."
              width={2172}
              height={724}
              priority
              draggable={false}
              className={styles.banner}
            />

            <Image
              src={scoreImage(score)}
              alt={`Score: ${score}`}
              width={1536}
              height={1024}
              draggable={false}
              className={styles.scoreImage}
            />
          </div>

          <div className={styles.sheetWrap}>
            <div className={cn(styles.card, styles.sheet)}>
              {/* eslint-disable react-hooks/refs -- intentional: renderVersion state already forces the re-render, this just reads the latest ref values into it */}
              <TraceBoard
                trail={tracePathRef.current}
                phase={phase}
                completed={completedRef.current}
                justCompleted={justCompleted}
                onPointerDownAt={handlePointerDownAt}
                onPointerMoveAt={handlePointerMoveAt}
                onPointerUp={stopDragging}
              />
              {/* eslint-enable react-hooks/refs */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
