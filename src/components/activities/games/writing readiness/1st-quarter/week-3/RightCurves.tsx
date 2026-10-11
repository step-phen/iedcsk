"use client";

import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Stage, Layer, Line, Path } from "react-konva";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, pickRandom } from "@/hooks/useSpeech";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import {
  BOTTOM_Y,
  CODE_ROUNDS,
  COLORS,
  CORRIDOR_TOL,
  COVERAGE_PASS_RATIO,
  CURVE_FAIL_TEXT,
  CURVE_OK_TEXT,
  DIRECTION_TEXT,
  MAX_JUMP,
  MID_Y,
  STROKES,
  STROKE_COUNT,
  TITLE,
  TOP_Y,
  TRACE_PRAISE_LINES,
  TRACE_RETRY_LINES,
  VIEW_H,
  VIEW_W,
  getBadgeTier,
  resultSpeech,
  type Point,
} from "./RightCurves.data";
import styles from "./RightCurves.module.css";

/* ---------------------------------------------------------------
   RIGHT CURVES — worksheet-style tracing, same format as
   LeftCurves.tsx: a row of ruled lines (blue top, red mid, blue
   bottom) with several dashed curves — bulging right, open on the
   left, the pre-writing stroke behind letters like d/b/p/g — to trace
   between them. Each round is one row; the learner must correctly
   trace every curve in the row, in order, before it advances.

   Per-curve validation, not just point-density coverage: each curve
   is only traceable once every curve before it in the row is locked
   correct (activeCurveRef). One continuous pointer gesture (down to
   up) is one attempt at the currently-active curve, judged as a whole
   at pointer-up against three things — see finishAttempt below:
     1. it started near the curve's top endpoint,
     2. it passed near a fixed sequence of checkpoints along the curve
        in order (so a straight top-to-bottom shortcut fails at the
        curve's own bulge, which sits outside checkpoint tolerance),
     3. most of the drawn path (COVERAGE_PASS_RATIO) stayed inside a
        tolerance corridor around the true curve.
   A failed attempt shows red/orange briefly with a shake + spoken
   "try again", then only THAT stroke is discarded — earlier locked
   curves are untouched. A successful attempt recolors green, locks,
   and unlocks the next curve; completing all curves in the row is
   what triggers the existing row-advance/finish flow.

   Rendered with Konva/react-konva (Stage/Layer) instead of raw SVG —
   fixed VBOX coordinate space (VIEW_W x VIEW_H), a ResizeObserver on
   the wrapper div drives a uniform Stage scale, and Konva's own
   pointer events replace manual getBoundingClientRect() math, matching
   the pattern used in Overcurves.tsx / Shape.tsx. Konva's pointer
   events are backed by the browser's unified Pointer Events API, so
   mouse, touch, and stylus input all go through the same handlers.
--------------------------------------------------------------- */

type TrailState = "green" | "red";
type TrailEntry = { x: number; y: number; state: TrailState } | null;
type Phase = "playing" | "complete";
type Feedback = "success" | "fail" | null;

/** One continuous pointer-down-to-up gesture's progress against the
 *  currently-active curve. Reset on every new gesture, so a lifted-and-
 *  restarted stroke never carries over partial checkpoint progress —
 *  that's what makes the trace have to be continuous. */
interface Attempt {
  checkpointIdx: number;
  insideCount: number;
  totalCount: number;
  startLen: number; // tracePathRef length when this attempt began
}

/** Question data as stored in `activity_questions.question_data`. Used only
 *  to gate on + order the rounds — the tracing geometry is code-owned in
 *  STROKES above. correct_answer.answer is always the fixed string
 *  "correct" — a round always completes once every curve in the row is
 *  correctly traced, so there's no wrong-answer outcome to distinguish. */
interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

function BadgeSvg({ emoji }: { emoji: string }) {
  return (
    <svg width="118" height="126" viewBox="0 0 140 150">
      <polygon points="45,80 30,148 70,128 110,148 95,80" fill="#E8734A" stroke="#1E2A4A" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="70" cy="62" r="52" fill="#F0B429" stroke="#1E2A4A" strokeWidth="4" />
      <circle cx="70" cy="62" r="40" fill="#FCE4A8" stroke="#1E2A4A" strokeWidth="3" />
      <text x="70" y="76" textAnchor="middle" fontSize="40" fontFamily="Arial, sans-serif">{emoji}</text>
    </svg>
  );
}

/* ---------------------------------------------------------------
   TRACE BOARD — the Konva canvas. Owns the responsive Stage scale and
   translates pointer events into VBOX-space points for the caller;
   all tracing state (attempts, trail, completion) stays in the main
   component, same separation as Overcurves.tsx's TraceBoard.
--------------------------------------------------------------- */
function TraceBoard({
  trail,
  phase,
  completed,
  feedback,
  shaking,
  onPointerDownAt,
  onPointerMoveAt,
  onPointerUp,
}: {
  trail: TrailEntry[];
  phase: Phase;
  completed: boolean;
  feedback: Feedback;
  shaking: boolean;
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
  // VBOX units (same convention as Konva's own zoom/pan examples). Backed by
  // the Pointer Events API, so this covers mouse, touch, and stylus alike.
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
    <div ref={wrapperRef} className={cn(styles.trace, shaking && styles.shake)}>
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

            {/* dashed guide curves to trace */}
            {STROKES.map((stroke, i) => (
              <Path
                key={i}
                data={`M ${stroke.a.x} ${stroke.a.y} Q ${stroke.c.x} ${stroke.c.y} ${stroke.b.x} ${stroke.b.y}`}
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

      {feedback && (
        <div className={styles.cheer}>
          <div className={cn(styles.cheerPill, feedback === "success" ? styles.cheerOk : styles.cheerFail)}>
            <Sparkles size={18} />
            {feedback === "success" ? CURVE_OK_TEXT : CURVE_FAIL_TEXT}
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

export default function RightCurves({
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
        console.error("Failed to load Right Curves questions:", err);
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
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [shaking, setShaking] = useState(false);
  const [answers, setAnswers] = useState<SubmittedAnswer[]>([]);

  const tracePathRef = useRef<TrailEntry[]>([]);
  const completedRef = useRef(false); // whole row (all curves) done + scored
  const scoredRef = useRef(false);
  const draggingRef = useRef(false);
  const prevPointRef = useRef<Point | null>(null);
  // Which curve (0..STROKE_COUNT-1) is currently traceable — curves before it
  // are locked correct, curves after it don't accept input yet.
  const activeCurveRef = useRef(0);
  // True while the success/fail toast is showing, so a fresh gesture can't
  // start mid-feedback.
  const inputLockedRef = useRef(false);
  const attemptRef = useRef<Attempt | null>(null);
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

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
        GAME_INTRO_LINES["right curve paths"],
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
    tracePathRef.current = [];
    completedRef.current = false;
    scoredRef.current = false;
    prevPointRef.current = null;
    activeCurveRef.current = 0;
    inputLockedRef.current = false;
    attemptRef.current = null;
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedback(null);
    setShaking(false);
    setRenderVersion((v) => v + 1);
  }, [roundIdx, total]);

  /** Nearest distance from p to the currently-active curve's dense sample
   *  points — brute-force, since a bezier curve has no closed-form
   *  projection formula. */
  const distanceToActiveCurve = (p: Point): number => {
    const stroke = STROKES[activeCurveRef.current];
    let best = Infinity;
    for (const pt of stroke.points) {
      const d = Math.hypot(p.x - pt.x, p.y - pt.y);
      if (d < best) best = d;
    }
    return best;
  };

  /** Folds one recorded point into the in-progress attempt: tallies
   *  corridor coverage and advances the checkpoint sequence if this point
   *  reaches the next expected checkpoint. The start checkpoint (index 0)
   *  can only be satisfied by the gesture's very first point — a later pass
   *  near the top doesn't count as "starting" there. */
  const evaluateAttemptPoint = (p: Point, isFirstPointOfGesture: boolean): TrailState => {
    const attempt = attemptRef.current;
    const stroke = STROKES[activeCurveRef.current];
    const dist = distanceToActiveCurve(p);
    const inside = dist <= CORRIDOR_TOL;

    if (attempt) {
      attempt.totalCount += 1;
      if (inside) attempt.insideCount += 1;

      const nextCheckpoint = stroke.checkpoints[attempt.checkpointIdx];
      if (nextCheckpoint && (attempt.checkpointIdx > 0 || isFirstPointOfGesture)) {
        const cpDist = Math.hypot(p.x - nextCheckpoint.x, p.y - nextCheckpoint.y);
        if (cpDist <= CORRIDOR_TOL) attempt.checkpointIdx += 1;
      }
    }

    return inside ? "green" : "red";
  };

  const pushTrail = (entry: TrailEntry) => {
    const arr = tracePathRef.current;
    if (entry === null) {
      if (arr.length > 0 && arr[arr.length - 1] !== null) arr.push(null);
    } else {
      arr.push(entry);
    }
  };

  // Row-level completion — fires once every curve in this row is locked
  // correct (see finishAttempt). Unchanged from the row-scoring model: one
  // point per completed row, out of `total` rows.
  const triggerCompletion = useCallback(() => {
    if (scoredRef.current) return;
    scoredRef.current = true;
    completedRef.current = true;
    setScore((s) => s + 1);

    const key = questionKeys?.[roundIdx];
    let nextAnswers = answers;
    if (key) {
      nextAnswers = [...answers, { questionId: key, response: "correct" }];
      setAnswers(nextAnswers);
    }

    // Wait for the praise line to finish speaking before moving on — the
    // next row's guide strokes would otherwise render mid-sentence.
    speak(
      pickRandom(TRACE_PRAISE_LINES),
      () => {
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

  // Judges one whole gesture (pointer down to up) against the active curve.
  // A pass locks the curve green and unlocks the next one immediately; a
  // fail keeps the red stroke on screen briefly (with a shake + spoken
  // nudge) before discarding just that attempt — earlier locked curves are
  // never touched either way.
  const finishAttempt = useCallback(() => {
    draggingRef.current = false;
    const attempt = attemptRef.current;
    attemptRef.current = null;
    if (!attempt || completedRef.current || phase !== "playing" || inputLockedRef.current) return;

    const stroke = STROKES[activeCurveRef.current];
    const coverageRatio = attempt.totalCount > 0 ? attempt.insideCount / attempt.totalCount : 0;
    const success = attempt.checkpointIdx >= stroke.checkpoints.length && coverageRatio >= COVERAGE_PASS_RATIO;

    inputLockedRef.current = true;

    if (success) {
      // Recolor the whole attempt green regardless of any momentary red
      // blips — COVERAGE_PASS_RATIO already guaranteed it was mostly on-path.
      for (let i = attempt.startLen; i < tracePathRef.current.length; i++) {
        const entry = tracePathRef.current[i];
        if (entry) entry.state = "green";
      }
      pushTrail(null); // pen-lift so the next curve starts its own segment
      setFeedback("success");
      speak(pickRandom(TRACE_PRAISE_LINES), undefined, { interrupt: false });
      activeCurveRef.current += 1;

      feedbackTimeoutRef.current = setTimeout(() => {
        setFeedback(null);
        inputLockedRef.current = false;
        setRenderVersion((v) => v + 1);
        if (activeCurveRef.current >= STROKE_COUNT) {
          triggerCompletion();
        }
      }, 700);
    } else {
      // Keep the failed stroke visible (in red) for the feedback window
      // instead of discarding it immediately — the learner should see what
      // went wrong before it disappears.
      setFeedback("fail");
      setShaking(true);
      speak(pickRandom(TRACE_RETRY_LINES));

      feedbackTimeoutRef.current = setTimeout(() => {
        tracePathRef.current.length = attempt.startLen;
        setFeedback(null);
        setShaking(false);
        inputLockedRef.current = false;
        setRenderVersion((v) => v + 1);
      }, 800);
    }

    setRenderVersion((v) => v + 1);
  }, [phase, speak, triggerCompletion]);

  const handlePointerDownAt = (p: Point) => {
    if (completedRef.current || phase !== "playing" || inputLockedRef.current) return;
    if (activeCurveRef.current >= STROKE_COUNT) return;
    draggingRef.current = true;
    pushTrail(null);
    prevPointRef.current = p;
    attemptRef.current = { checkpointIdx: 0, insideCount: 0, totalCount: 0, startLen: tracePathRef.current.length };
    const state = evaluateAttemptPoint(p, true);
    pushTrail({ x: p.x, y: p.y, state });
    setRenderVersion((v) => v + 1);
  };

  const handlePointerMoveAt = (p: Point) => {
    if (!draggingRef.current || completedRef.current || phase !== "playing" || inputLockedRef.current) return;
    const prev = prevPointRef.current || p;
    const jumpDist = Math.hypot(p.x - prev.x, p.y - prev.y);

    if (jumpDist > MAX_JUMP) {
      pushTrail(null);
      const state = evaluateAttemptPoint(p, false);
      pushTrail({ x: p.x, y: p.y, state });
    } else {
      const STEPS = 4;
      for (let s = 1; s <= STEPS; s++) {
        const t = s / STEPS;
        const ix = prev.x + (p.x - prev.x) * t;
        const iy = prev.y + (p.y - prev.y) * t;
        const state = evaluateAttemptPoint({ x: ix, y: iy }, false);
        pushTrail({ x: ix, y: iy, state });
      }
    }

    prevPointRef.current = p;
    setRenderVersion((v) => v + 1);
  };

  // Read out the badge/score once the result screen appears — the same
  // "wait for it to finish" concern doesn't apply here since nothing
  // advances off this speech, it's just feedback.
  useEffect(() => {
    if (phase !== "complete") return;
    speak(resultSpeech(score, total));
  }, [phase, score, total, speak]);

  if (loadError) {
    return (
      <div className={styles.screen}>
        <p className={styles.message}>Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!questionKeys || total === 0) {
    return (
      <div className={styles.screen}>
        <p className={styles.message}>Loading…</p>
      </div>
    );
  }

  const tier = getBadgeTier(score, total);

  const learnerBadge = learnerName && (
    <div className={styles.nameChip}>
      <span className={styles.nameEmoji} aria-hidden>
        🙋
      </span>
      <span className={styles.nameText}>{learnerName}</span>
    </div>
  );

  return (
    <div className={cn(styles.screen, styles.patterned)}>
      <div className={styles.sheet}>
        <div className={styles.cornerLeft} />
        <div className={styles.cornerRight} />
        {learnerBadge}
        {phase === "complete" ? (
          <div className={styles.result}>
            <h1 className={styles.resultTitle}>{(activityName || TITLE).toUpperCase()} COMPLETE!</h1>
            <p className={styles.resultScore}>
              Score: {score} / {total}
            </p>
            <div className={styles.resultBadge}>
              <BadgeSvg emoji={tier.emoji} />
            </div>
            <div className={styles.tierTitle}>{tier.title}</div>
            <div className={styles.tierSub}>{tier.sub}</div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              onClick={() => handleFinish(answers)}
              className={styles.finishButton}
            >
              Finish ✅
            </motion.button>
          </div>
        ) : (
          <>
            <div className={styles.header}>
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
              <div className={styles.scorePill}>Score: {score}</div>
            </div>

            <h1 className={styles.title}>{TITLE}</h1>
            <div className={styles.direction}>{DIRECTION_TEXT}</div>

            {/* eslint-disable react-hooks/refs -- intentional: renderVersion state already forces the re-render, this just reads the latest ref values into it */}
            <TraceBoard
              trail={tracePathRef.current}
              phase={phase}
              completed={completedRef.current}
              feedback={feedback}
              shaking={shaking}
              onPointerDownAt={handlePointerDownAt}
              onPointerMoveAt={handlePointerMoveAt}
              onPointerUp={finishAttempt}
            />
            {/* eslint-enable react-hooks/refs */}
          </>
        )}
      </div>
    </div>
  );
}
