"use client";

import { useState, useRef, useLayoutEffect, useEffect, type ReactNode } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Stage, Layer, Line, Circle, Star, Arrow } from "react-konva";

// Shared Konva tracing pad for the Week 4 to Week 6 writing games: draws a dashed guide, judges one continuous stroke along it, and can demonstrate the stroke.

export interface Point {
  x: number;
  y: number;
}

// How close the finger must stay to the guide, in board units.
const CORRIDOR = 30;
// The share of the stroke that must stay inside the corridor.
const PASS_RATIO = 0.75;
// Checkpoints along the guide that must be reached in order, start to end.
const CHECKPOINTS = [0, 0.2, 0.4, 0.6, 0.8, 1];
// A stroke shorter than this is a stray tap, not an attempt.
const MIN_TRAVEL = 40;
const DEMO_MS = 1800;

/** Samples a path function f(t), t from 0 to 1, into evenly spaced points. */
export function samplePath(f: (t: number) => Point, samples = 60): Point[] {
  return Array.from({ length: samples }, (_, i) => f(i / (samples - 1)));
}

export const flat = (pts: Point[]) => pts.flatMap((p) => [p.x, p.y]);

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

const nearest = (p: Point, path: Point[]) => path.reduce((best, q) => Math.min(best, dist(p, q)), Infinity);

/** Whether a drawn stroke follows the guide: starts at its start, passes every checkpoint in order, and mostly stays on it. */
export function judgeStroke(stroke: Point[], path: Point[]): boolean {
  if (stroke.length < 2 || dist(stroke[0], path[0]) > CORRIDOR) return false;
  const marks = CHECKPOINTS.map((t) => path[Math.round(t * (path.length - 1))]);
  let next = 0;
  let inside = 0;
  for (const p of stroke) {
    if (nearest(p, path) <= CORRIDOR) inside++;
    if (next < marks.length && dist(p, marks[next]) <= CORRIDOR) next++;
  }
  return next === marks.length && inside / stroke.length >= PASS_RATIO;
}

/** Moves a point along a path over ms once active turns on, for a character that follows the traced line; calls onDone at the end. */
export function usePathRide(path: Point[], active: boolean, ms: number, onDone?: () => void): Point | null {
  const [t, setT] = useState(0);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / ms, 1);
      setT(p);
      if (p < 1) frame = requestAnimationFrame(tick);
      else doneRef.current?.();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, ms]);
  return active ? path[Math.round(t * (path.length - 1))] : null;
}

export interface TracePadProps {
  viewW: number;
  viewH: number;
  path: Point[];
  /** Konva nodes drawn under the guide (scenery, finished strokes). */
  under?: ReactNode;
  /** Konva nodes drawn over the stroke (faces, sparkles). */
  over?: ReactNode;
  guideColor: string;
  inkColor: string;
  inkWidth?: number;
  disabled: boolean;
  /** Plays the stroke along the guide with a glowing pencil tip, then calls onDemoEnd. */
  demo: boolean;
  onDemoEnd?: () => void;
  /** Called once per real attempt with whether it followed the guide. */
  onAttempt: (pass: boolean) => void;
  /** False hides the guide: a finished board, or a blank box to copy a shape into. */
  showGuide?: boolean;
  /** Judges a stroke in place of following the guide, such as a freehand copy; the guide is still what the demo draws. */
  judge?: (stroke: Point[]) => boolean;
  className?: string;
}

/** Remount with a new key for each item, so the ink and demo start fresh. */
export default function TracePad({ viewW, viewH, path, under, over, guideColor, inkColor, inkWidth = 14, disabled, demo, onDemoEnd, onAttempt, showGuide = true, judge, className }: TracePadProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = size.w > 0 && size.h > 0 ? Math.min(size.w / viewW, size.h / viewH) : 0;

  // The stroke being drawn, and whether the last attempt missed (so its ink shows red).
  const [ink, setInk] = useState<Point[]>([]);
  const [missed, setMissed] = useState(false);
  const drawing = useRef(false);
  const strokeRef = useRef<Point[]>([]);

  const toBoard = (evt: KonvaEventObject<PointerEvent>): Point | null => {
    const pos = evt.target.getStage()?.getPointerPosition();
    return pos && scale > 0 ? { x: pos.x / scale, y: pos.y / scale } : null;
  };

  const down = (evt: KonvaEventObject<PointerEvent>) => {
    if (disabled || demo) return;
    evt.evt.preventDefault();
    try {
      (evt.evt.target as Element).setPointerCapture(evt.evt.pointerId);
    } catch {
      // Capture is only a nicety; tracing still works without it.
    }
    const p = toBoard(evt);
    if (!p) return;
    drawing.current = true;
    strokeRef.current = [p];
    setMissed(false);
    setInk([p]);
  };

  const move = (evt: KonvaEventObject<PointerEvent>) => {
    if (!drawing.current) return;
    evt.evt.preventDefault();
    const p = toBoard(evt);
    if (!p) return;
    // Fills fast swipes with in-between points, so no checkpoint is skipped over.
    const prev = strokeRef.current[strokeRef.current.length - 1];
    const steps = Math.max(1, Math.ceil(dist(prev, p) / 8));
    for (let s = 1; s <= steps; s++) strokeRef.current.push({ x: prev.x + ((p.x - prev.x) * s) / steps, y: prev.y + ((p.y - prev.y) * s) / steps });
    setInk([...strokeRef.current]);
  };

  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const stroke = strokeRef.current;
    let travel = 0;
    for (let i = 1; i < stroke.length; i++) travel += dist(stroke[i - 1], stroke[i]);
    // A stray tap is wiped without counting as the one try.
    if (travel < MIN_TRAVEL) return setInk([]);
    const pass = judge ? judge(stroke) : judgeStroke(stroke, path);
    setMissed(!pass);
    onAttempt(pass);
  };

  // The demonstration: a growing gold stroke led by a glowing pencil tip.
  const [demoT, setDemoT] = useState(0);
  const demoEndRef = useRef(onDemoEnd);
  useEffect(() => {
    demoEndRef.current = onDemoEnd;
  }, [onDemoEnd]);
  useEffect(() => {
    if (!demo) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / DEMO_MS, 1);
      setDemoT(t);
      if (t < 1) frame = requestAnimationFrame(tick);
      else demoEndRef.current?.();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [demo]);

  const demoPts = demo ? path.slice(0, Math.max(2, Math.round(demoT * (path.length - 1)) + 1)) : [];
  const tip = demoPts[demoPts.length - 1];
  const start = path[0];
  const end = path[path.length - 1];
  // A closed shape (a circle) ends where it starts, so an arrow by the dot shows which way to go instead of a star.
  const closed = dist(start, end) < 4;

  return (
    <div ref={wrapRef} className={`${className ?? ""} mx-auto flex items-center justify-center`} style={{ touchAction: "none" }}>
      {scale > 0 && (
        <Stage width={viewW * scale} height={viewH * scale} scaleX={scale} scaleY={scale} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}>
          <Layer listening={false}>
            {under}
            {/* the dashed guide, with a green start dot and an orange finish star */}
            {showGuide && (
              <>
                <Line points={flat(path)} stroke={guideColor} strokeWidth={8} dash={[14, 12]} lineCap="round" lineJoin="round" opacity={0.7} />
                {closed ? (
                  <Arrow points={flat(path.slice(3, Math.max(5, Math.round(path.length * 0.12))))} stroke="#3fae72" fill="#3fae72" strokeWidth={7} pointerLength={16} pointerWidth={18} lineCap="round" />
                ) : (
                  <Star x={end.x} y={end.y} numPoints={5} innerRadius={9} outerRadius={20} fill="#f2954e" stroke="white" strokeWidth={3} />
                )}
                <Circle x={start.x} y={start.y} radius={16} fill="#3fae72" stroke="white" strokeWidth={4} />
              </>
            )}
            {ink.length > 1 && <Line points={flat(ink)} stroke={missed ? "#e15a5a" : inkColor} strokeWidth={inkWidth} lineCap="round" lineJoin="round" tension={0.3} />}
            {demoPts.length > 1 && (
              <Line points={flat(demoPts)} stroke="#ffc928" strokeWidth={inkWidth + 2} lineCap="round" lineJoin="round" shadowColor="#ffd23f" shadowBlur={18} shadowOpacity={0.9} />
            )}
            {tip && <Circle x={tip.x} y={tip.y} radius={18} fill="#fff6c8" stroke="#e0a800" strokeWidth={5} shadowColor="#ffd23f" shadowBlur={24} shadowOpacity={1} />}
            {over}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
