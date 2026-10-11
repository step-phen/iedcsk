"use client";

import React, { useState, useRef, useLayoutEffect, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Eraser, Check, RotateCcw, Star, Trophy, Home } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName } from "@/hooks/useSpeech";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import {
  GUIDE,
  INK,
  LOOKAHEAD,
  ROUNDS,
  SAMPLE_COUNT,
  START_TOLERANCE,
  SUCCESS,
  TIER_COLORS,
  TOLERANCE,
  TOTAL_ROUNDS,
  TRACE,
  VIEW_H,
  VIEW_W,
  scoreRound,
  type Point,
  type RoundResult,
} from "./DrawTheLines.data";
import styles from "./DrawTheLines.module.css";

/* ------------------------------------------------------------------ */
/*  DRAW THE LINES — kindergarten tracing game                         */
/*  Drag from the start dot along the guide. Lenient tolerance,        */
/*  never blocks progress, never shows failure.                        */
/*                                                                      */
/*  NOTE: the visible ink now ONLY follows the child's actual pointer  */
/*  path (strokeSegments). Lifting the finger starts a new segment but */
/*  never erases earlier ones, so the trace always reads as one        */
/*  continuous line rather than being cut into disconnected pieces.    */
/*  Each round's accuracy is scored from how closely the pointer       */
/*  tracked the guide, and shown as badges on the finished screen.     */
/* ------------------------------------------------------------------ */

/** Question data as stored in `activity_questions.question_data`. Used only
 *  to gate on + order the rounds — the line geometry is code-owned in
 *  DrawTheLines.data.ts — correctness is judged client-side by the tracing
 *  mechanic itself (this game never blocks or fails a round, only scores
 *  its accuracy), so the DB's correct_answer.answer is always the fixed
 *  string "correct". */
interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

export default function DrawTheLines({ activityId, activityName, onFinish }: GameComponentProps) {
  const router = useRouter();
  const { speakAll, stop } = useSpeech();

  const [questionKeys, setQuestionKeys] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Question data lives in the DB (activity_questions), fetched once — every
  // other activity in this app works the same way. Only the ordered list of
  // question keys comes from the server; the line geometry is code-owned
  // in DrawTheLines.data.ts and mapped onto that order.
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

        setQuestionKeys(rows.map((row) => row.questionKey));
      } catch (err) {
        console.error("Failed to load Draw the Lines questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const total = questionKeys ? Math.min(questionKeys.length, TOTAL_ROUNDS) : 0;

  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<"tracing" | "roundComplete" | "finished">("tracing");
  // strokeSegments: array of point-arrays. A new segment starts every time
  // the child lifts their finger and touches down again, but EARLIER
  // segments are always kept and rendered — nothing gets erased or cut
  // when they lift, so the trace reads as one continuous line, not
  // broken-up pieces.
  const [strokeSegments, setStrokeSegments] = useState<Point[][]>([]);
  const [reachedIndex, setReachedIndex] = useState(0);
  const [samplePoints, setSamplePoints] = useState<Point[]>([]);
  const [showNudge, setShowNudge] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const reachedIndexRef = useRef(0);
  const drawingRef = useRef(false);
  const deviationsRef = useRef<number[]>([]); // per-round accuracy samples, for scoring
  // Guards markComplete against firing more than once per round: pointer
  // events keep arriving (and satisfying the "reached the end" check) for a
  // few more moves after the first completion, before the phase state
  // update actually re-renders and stops them.
  const roundCompletedRef = useRef(false);
  const answersRef = useRef<SubmittedAnswer[]>([]);

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
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["draw the lines"]]);
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

  const goHome = useCallback(() => {
    stop();
    router.push("/learner");
  }, [stop, router]);

  const round = ROUNDS[roundIndex];

  // Re-sample the guide path into evenly spaced points whenever the round
  // changes. Also re-runs once loading finishes (`total` flips from 0):
  // while `questionKeys` is still loading, the component renders the
  // "Loading…" placeholder instead of the <path> this effect measures, so
  // pathRef.current is null on that first commit — without `total` in the
  // deps, this effect (keyed only on roundIndex, which is still 0) would
  // never fire again once the real tracing UI actually mounts.
  useLayoutEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const pathLength = el.getTotalLength();
    const pts = [];
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const p = el.getPointAtLength((i / (SAMPLE_COUNT - 1)) * pathLength);
      pts.push({ x: p.x, y: p.y });
    }
    setSamplePoints(pts);
    setStrokeSegments([]);
    setReachedIndex(0);
    reachedIndexRef.current = 0;
    deviationsRef.current = [];
    roundCompletedRef.current = false;
    setShowNudge(false);
    setPhase("tracing");
  }, [roundIndex, total]);

  const toSvgPoint = useCallback((clientX: number, clientY: number): Point => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const transformed = pt.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  }, []);

  const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

  const markComplete = useCallback(() => {
    // handlePointerMove keeps firing (and re-satisfying "reached the end")
    // for a few more pointer events after the first completion, before the
    // phase state update actually re-renders — without this guard each of
    // those calls would push another duplicate round result/answer.
    if (roundCompletedRef.current) return;
    roundCompletedRef.current = true;

    const { score, tier, tierLabel } = scoreRound(deviationsRef.current);
    setRoundResults((prev) => [...prev, { title: ROUNDS[roundIndex].title, score, tier, tierLabel }]);

    // Grading is server-authoritative (see activity_questions) and, like
    // every other tracing game in this app, per-round completion is always
    // "correct" — this game never blocks or fails a round, only scores its
    // accuracy (the bronze/silver/gold tiers above), so the round always
    // completes once reached.
    const key = questionKeys?.[roundIndex];
    if (key) {
      answersRef.current = [...answersRef.current, { questionId: key, response: "correct" }];
    }

    setPhase("roundComplete");
  }, [roundIndex, questionKeys]);

  // Auto-advance: once a round is complete, move on by itself after a
  // short celebratory pause — no button needed.
  useLayoutEffect(() => {
    if (phase !== "roundComplete") return;
    const timer = setTimeout(() => {
      const isLast = roundIndex >= total - 1;
      if (isLast) {
        setPhase("finished");
        handleFinish(answersRef.current);
      } else {
        setRoundIndex((i) => i + 1);
      }
    }, 1400);
    return () => clearTimeout(timer);
  }, [phase, roundIndex, total, handleFinish]);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (phase !== "tracing" || samplePoints.length === 0) return;
    const p = toSvgPoint(e.clientX, e.clientY);
    // Begin a stroke near the start dot, OR near wherever the child last
    // left off — so lifting the finger mid-line and touching back down
    // continues the same line instead of forcing a restart from zero.
    const nearStart = dist(p, samplePoints[0]) <= START_TOLERANCE;
    const nearProgress =
      dist(p, samplePoints[reachedIndexRef.current]) <= START_TOLERANCE;
    if (!nearStart && !nearProgress) return;
    e.preventDefault();
    drawingRef.current = true;
    setIsDrawing(true);
    // Push a brand-new segment, keeping every earlier segment intact.
    setStrokeSegments((prev) => [...prev, [p]]);
  };

  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!drawingRef.current || samplePoints.length === 0) return;
      const p = toSvgPoint(clientX, clientY);
      // Only ever draw exactly where the child's own finger/cursor goes —
      // this is the ONLY thing rendered as ink. Nothing is snapped or
      // auto-filled onto the guide. Append to the current segment only —
      // earlier segments stay put, so the full trace never gets cut.
      setStrokeSegments((prev) => {
        if (prev.length === 0) return [[p]];
        const next = prev.slice();
        next[next.length - 1] = [...next[next.length - 1], p];
        return next;
      });

      // Progress tracking (for completion) still checks how close the
      // actual point is to the guide, but this no longer drives any
      // separate rendered line — it's purely bookkeeping.
      const start = reachedIndexRef.current;
      const end = Math.min(samplePoints.length - 1, start + LOOKAHEAD);
      let best = -1;
      let bestDist = Infinity;
      for (let i = start; i <= end; i++) {
        const d = dist(p, samplePoints[i]);
        if (d < TOLERANCE && d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      if (best > reachedIndexRef.current) {
        reachedIndexRef.current = best;
        setReachedIndex(best);
        setShowNudge(false);
        deviationsRef.current.push(bestDist);
        if (best >= samplePoints.length - 2) {
          markComplete();
        }
      } else {
        // Not close enough to advance — gently invite them back, no penalty.
        const nearestNow = dist(p, samplePoints[reachedIndexRef.current]);
        setShowNudge(nearestNow > TOLERANCE * 1.4);
      }
    },
    [samplePoints, toSvgPoint, markComplete]
  );

  useLayoutEffect(() => {
    if (!isDrawing) return;
    const onMove = (e: PointerEvent) => handlePointerMove(e.clientX, e.clientY);
    const onUp = () => {
      drawingRef.current = false;
      setIsDrawing(false);
      setShowNudge(false);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [isDrawing, handlePointerMove]);

  const handleClear = () => {
    drawingRef.current = false;
    setIsDrawing(false);
    setStrokeSegments([]);
    setReachedIndex(0);
    reachedIndexRef.current = 0;
    deviationsRef.current = [];
    roundCompletedRef.current = false;
    setShowNudge(false);
    setPhase("tracing");
  };

  const handlePlayAgain = () => {
    setRoundIndex(0);
    setPhase("tracing");
    setStrokeSegments([]);
    setReachedIndex(0);
    reachedIndexRef.current = 0;
    deviationsRef.current = [];
    roundCompletedRef.current = false;
    setRoundResults([]);
    answersRef.current = [];
    finishedRef.current = false;
  };

  const markerPoint = samplePoints[reachedIndex] || round.start;
  const endPoint = samplePoints[samplePoints.length - 1];
  const overallScore = useMemo(() => {
    if (roundResults.length === 0) return 0;
    return Math.round(
      roundResults.reduce((a, r) => a + r.score, 0) / roundResults.length
    );
  }, [roundResults]);

  if (loadError) {
    return (
      <div className={cn(styles.screen, styles.centered)}>
        <p style={{ fontSize: 18, fontWeight: 800, color: INK }}>
          Couldn&apos;t load this activity. Please try again.
        </p>
      </div>
    );
  }

  if (!questionKeys || total === 0) {
    return (
      <div className={cn(styles.screen, styles.centered)}>
        <p style={{ fontSize: 18, fontWeight: 800, color: INK }}>Loading…</p>
      </div>
    );
  }

  const homeButton = (
    <button type="button" onClick={goHome} aria-label="Go home" className={styles.homeButton}>
      <Home size={16} strokeWidth={2.6} color={INK} />
    </button>
  );
  const learnerBadge = learnerName && (
    <div className={styles.learnerBadge}>
      <span style={{ fontSize: 15, lineHeight: 1 }} aria-hidden>
        🙋
      </span>
      <span className={styles.learnerBadgeName}>{learnerName}</span>
    </div>
  );

  return (
    <div className={styles.screen}>
      {learnerBadge}
      {homeButton}

      {phase !== "finished" && (
        <>
          <header className={styles.header}>
            <div className={styles.eyebrow}>
              ROUND {roundIndex + 1} OF {total}
            </div>
            <h1 className={styles.title}>DRAW THE LINES</h1>
            <div className={styles.instruction}>Trace the line!</div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{
                  transform: `scaleX(${(roundIndex + (phase === "roundComplete" ? 1 : 0)) / total})`,
                }}
              />
            </div>
          </header>

          <main className={styles.canvasWrap}>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              className={styles.canvas}
              onPointerDown={handlePointerDown}
            >
              {/* dotted guide, always visible underneath everything */}
              <path
                ref={pathRef}
                d={round.d}
                fill="none"
                stroke={GUIDE}
                strokeWidth="18"
                strokeLinecap="butt"
                strokeLinejoin="round"
                strokeDasharray="22 16"
              />

              {/* the child's own freehand stroke — the ONLY ink drawn,
                  exactly where the pointer actually moved. Every segment
                  the child has drawn stays visible, so lifting the finger
                  never cuts the line — it just continues it. */}
              {strokeSegments.map(
                (seg, i) =>
                  seg.length > 1 && (
                    <polyline
                      key={i}
                      points={seg.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none"
                      stroke={phase === "roundComplete" ? SUCCESS : TRACE}
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.9"
                    />
                  )
              )}

              {/* start marker — pulses until the child begins */}
              {reachedIndex === 0 && phase === "tracing" && (
                <g style={{ pointerEvents: "none" }}>
                  <circle cx={round.start.x} cy={round.start.y} r="26" fill={TRACE} opacity="0.25" className={styles.startPulse} />
                  <circle cx={round.start.x} cy={round.start.y} r="14" fill={TRACE} stroke="#ffffff" strokeWidth="4" />
                </g>
              )}

              {/* end marker */}
              {endPoint && (
                <circle
                  cx={endPoint.x}
                  cy={endPoint.y}
                  r="14"
                  fill={phase === "roundComplete" ? SUCCESS : "#ffffff"}
                  stroke={INK}
                  strokeWidth="4"
                  style={{ pointerEvents: "none" }}
                />
              )}
              {phase === "roundComplete" && endPoint && (
                <g transform={`translate(${endPoint.x - 11}, ${endPoint.y - 11})`} style={{ pointerEvents: "none" }} className={styles.checkPop}>
                  <path d="M4,11 L9,16 L18,5" fill="none" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              )}

              {/* gentle nudge — never red, never "wrong", just an invitation back */}
              {showNudge && (
                <circle
                  cx={markerPoint.x}
                  cy={markerPoint.y}
                  r="22"
                  fill="none"
                  stroke="#F5B942"
                  strokeWidth="4"
                  style={{ pointerEvents: "none" }}
                  className={styles.nudgePulse}
                />
              )}
            </svg>

            {phase === "roundComplete" && (
              <div className={cn(styles.toast, styles.toastPop)}>
                Great Job! 🎉
              </div>
            )}
          </main>

          <footer className={styles.footer}>
            <button className={styles.clearButton} onClick={handleClear}>
              <Eraser size={20} strokeWidth={2.5} />
              CLEAR
            </button>
          </footer>
        </>
      )}

      {phase === "finished" && (
        <div className={cn(styles.completeWrap, styles.statusPop)}>
          <Confetti />
          <div className={styles.finishedBadge}>
            <Check size={40} strokeWidth={4} color="#ffffff" />
          </div>
          <h1 className={styles.finishedTitle}>
            {(activityName || "DRAWING").toUpperCase()} COMPLETE!
          </h1>
          <div className={styles.scoreRow}>
            <Trophy size={26} strokeWidth={2.5} color="#F5B942" />
            <span className={styles.scoreText}>{overallScore}% Accuracy</span>
          </div>

          <div className={styles.badgeGrid}>
            {roundResults.map((r, i) => (
              <div key={i} className={styles.badgeCard}>
                <Star
                  size={30}
                  strokeWidth={2.2}
                  color={TIER_COLORS[r.tier]}
                  fill={TIER_COLORS[r.tier]}
                />
                <div className={styles.badgeTitle}>{r.title}</div>
                <div className={styles.badgeTier} style={{ color: TIER_COLORS[r.tier] }}>
                  {r.tierLabel}
                </div>
                <div className={styles.badgeScore}>{r.score}%</div>
              </div>
            ))}
          </div>

          <button className={styles.playAgainButton} onClick={handlePlayAgain}>
            <RotateCcw size={20} strokeWidth={3} />
            PLAY AGAIN
          </button>
        </div>
      )}
    </div>
  );
}

function Confetti() {
  const pieces = [
    { left: "20%", color: "#F5B942", delay: "0s" },
    { left: "35%", color: "#4CAF63", delay: "0.15s" },
    { left: "50%", color: "#3E5FC4", delay: "0.05s" },
    { left: "65%", color: "#FF6B4A", delay: "0.2s" },
    { left: "80%", color: "#8E6FE0", delay: "0.1s" },
  ];
  return (
    <div className={styles.confettiWrap}>
      {pieces.map((p, i) => (
        <span
          key={i}
          className={styles.confettiPiece}
          style={{ left: p.left, background: p.color, animationDelay: p.delay }}
        />
      ))}
    </div>
  );
}
