"use client";

import { Fragment, useState, useRef, useLayoutEffect, useEffect, type ReactNode } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { Stage, Layer, Line, Circle, Text, Arrow } from "react-konva";
import { judgeStroke, flat, samplePath, type Point } from "../../1st-quarter/week-4/TracePad";

// Shared Konva pad for the letter games from Q2 on: numbers each stroke of a letter, judges them in order, and can animate the whole letter.

// A stroke shorter than this is a stray tap, not an attempt.
const MIN_TRAVEL = 40;
const DEMO_STROKE_MS = 1100;
// How near a tap must land to count as the dot of an i or j.
const DOT_REACH = 45;

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** A straight stroke from a to b, sampled for judging and the demo. */
export const straight = (a: Point, b: Point, samples = 40): Point[] => samplePath((t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }), samples);

/** An oval arc around (cx, cy) from angle a0 to a1 in radians (0 = right, growing clockwise on screen), for curved strokes. */
export const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, samples = 60): Point[] =>
  samplePath((t) => ({ x: cx + rx * Math.cos(a0 + (a1 - a0) * t), y: cy + ry * Math.sin(a0 + (a1 - a0) * t) }), samples);

/** Joins pieces drawn end to start into one stroke, dropping each repeated joining point. */
export const chain = (...pieces: Point[][]): Point[] => pieces.flatMap((piece, i) => (i === 0 ? piece : piece.slice(1)));

/** A dot, such as the one on a j: a tiny ring so the demo draws it as a blob. */
export const dot = (x: number, y: number): Point[] => arc(x, y, 6, 6, 0, 2 * Math.PI, 12);

const centre = (s: Point[]): Point => ({ x: s.reduce((t, p) => t + p.x, 0) / s.length, y: s.reduce((t, p) => t + p.y, 0) / s.length });
const isDot = (s: Point[]) => s.every((p) => dist(p, s[0]) < 16);

/** How many guide strokes, from step on, one drawn stroke traces in order: 0 for a miss. */
export function strokesCovered(stroke: Point[], strokes: Point[][], step: number): number {
  const cur = strokes[step];
  const next = strokes[step + 1];
  if (isDot(cur)) return stroke.every((p) => dist(p, centre(cur)) <= DOT_REACH) ? 1 : 0;
  if (judgeStroke(stroke, cur)) return 1;
  // Strokes that meet end to start (the corner of an L) may also be drawn as one, without lifting.
  return next && dist(cur[cur.length - 1], next[0]) < 4 && judgeStroke(stroke, [...cur, ...next.slice(1)]) ? 2 : 0;
}

export interface LetterTracePadProps {
  viewW: number;
  viewH: number;
  /** The letter's strokes, in the order they must be traced. */
  strokes: Point[][];
  /** Konva nodes drawn under the guide (writing lines, scenery). */
  under?: ReactNode;
  guideColor: string;
  inkColor: string;
  inkWidth?: number;
  disabled: boolean;
  /** Animates the letter stroke by stroke with a glowing pencil tip, then calls onDemoEnd. */
  demo: boolean;
  demoColor: string;
  onDemoEnd?: () => void;
  /** Called once per letter: true when every stroke followed its guide in order. */
  onAttempt: (pass: boolean) => void;
  className?: string;
}

/** Remount with a new key for each round, so the ink starts fresh. */
export default function LetterTracePad({ viewW, viewH, strokes, under, guideColor, inkColor, inkWidth = 16, disabled, demo, demoColor, onDemoEnd, onAttempt, className }: LetterTracePadProps) {
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

  // Finished strokes, how many guide strokes they cover, the stroke being drawn, and whether the try missed.
  const [kept, setKept] = useState<Point[][]>([]);
  const [step, setStep] = useState(0);
  const [ink, setInk] = useState<Point[]>([]);
  const [missed, setMissed] = useState(false);
  const drawing = useRef(false);
  const strokeRef = useRef<Point[]>([]);

  const toBoard = (evt: KonvaEventObject<PointerEvent>): Point | null => {
    const pos = evt.target.getStage()?.getPointerPosition();
    return pos && scale > 0 ? { x: pos.x / scale, y: pos.y / scale } : null;
  };

  const down = (evt: KonvaEventObject<PointerEvent>) => {
    if (disabled || demo || missed || step >= strokes.length) return;
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
    const covered = strokesCovered(stroke, strokes, step);
    // A stray tap is wiped without counting as the one try, unless it is the tap a dot asks for.
    if (!covered && travel < MIN_TRAVEL) return setInk([]);
    if (!covered) {
      setMissed(true);
      return onAttempt(false);
    }
    setKept((k) => [...k, stroke]);
    setInk([]);
    setStep(step + covered);
    if (step + covered >= strokes.length) onAttempt(true);
  };

  // The demonstration: each stroke grows in turn, led by a glowing pencil tip.
  const [demoT, setDemoT] = useState(0);
  const demoEndRef = useRef(onDemoEnd);
  useEffect(() => {
    demoEndRef.current = onDemoEnd;
  }, [onDemoEnd]);
  useEffect(() => {
    if (!demo) return;
    let frame = 0;
    const start = performance.now();
    const totalMs = DEMO_STROKE_MS * strokes.length;
    const tick = (now: number) => {
      const t = Math.min((now - start) / totalMs, 1);
      setDemoT(t);
      if (t < 1) frame = requestAnimationFrame(tick);
      else demoEndRef.current?.();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [demo, strokes.length]);

  const demoLines = demo
    ? strokes.map((s, i) => {
        const f = Math.min(Math.max(demoT * strokes.length - i, 0), 1);
        return f > 0 ? s.slice(0, Math.max(2, Math.round(f * (s.length - 1)) + 1)) : [];
      })
    : [];
  const drawingLine = demoLines.filter((l) => l.length > 0).pop();
  const tip = drawingLine?.[drawingLine.length - 1];

  return (
    <div ref={wrapRef} className={`${className ?? ""} flex items-center justify-center`} style={{ touchAction: "none" }}>
      {scale > 0 && (
        <Stage width={viewW * scale} height={viewH * scale} scaleX={scale} scaleY={scale} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}>
          <Layer listening={false}>
            {under}
            {strokes.map((s, i) => (
              <Line key={`g${i}`} points={flat(s)} stroke={guideColor} strokeWidth={10} dash={[16, 12]} lineCap="round" opacity={i === step ? 0.85 : 0.4} />
            ))}
            {/* Numbered start dots, the next one green with an arrow showing which way to go; drawn last-first so stroke 1 sits on top. */}
            {strokes
              .map((s, i) => {
                if (i < step) return null;
                const current = i === step && !demo;
                const a = s[0];
                const b = s[Math.min(10, s.length - 1)];
                const len = dist(a, b) || 1;
                const off = { x: ((b.x - a.x) / len) * 30, y: ((b.y - a.y) / len) * 30 };
                return (
                  <Fragment key={`d${i}`}>
                    {current && !isDot(s) && <Arrow points={[a.x + off.x, a.y + off.y, a.x + off.x * 2.6, a.y + off.y * 2.6]} stroke="#2f9e5f" fill="#2f9e5f" strokeWidth={7} pointerLength={14} pointerWidth={16} lineCap="round" />}
                    <Circle x={a.x} y={a.y} radius={20} fill={current ? "#3fae72" : "white"} stroke={current ? "white" : guideColor} strokeWidth={4} />
                    <Text x={a.x - 20} y={a.y - 13} width={40} align="center" text={String(i + 1)} fontSize={26} fontStyle="bold" fill={current ? "white" : guideColor} />
                  </Fragment>
                );
              })
              .reverse()}
            {kept.map((s, i) =>
              isDot(s) ? (
                <Circle key={`k${i}`} x={s[0].x} y={s[0].y} radius={inkWidth} fill={inkColor} opacity={demo ? 0.25 : 1} />
              ) : (
                <Line key={`k${i}`} points={flat(s)} stroke={inkColor} strokeWidth={inkWidth} lineCap="round" lineJoin="round" tension={0.3} opacity={demo ? 0.25 : 1} />
              ),
            )}
            {ink.length > 1 && <Line points={flat(ink)} stroke={missed ? "#e04848" : inkColor} strokeWidth={inkWidth} lineCap="round" lineJoin="round" tension={0.3} opacity={demo ? 0.25 : 1} />}
            {demoLines.map((l, i) => l.length > 1 && <Line key={`m${i}`} points={flat(l)} stroke={demoColor} strokeWidth={inkWidth + 2} lineCap="round" shadowColor={demoColor} shadowBlur={18} shadowOpacity={0.9} />)}
            {tip && <Circle x={tip.x} y={tip.y} radius={18} fill="#fff6c8" stroke="#e0a800" strokeWidth={5} shadowColor="#ffd23f" shadowBlur={24} shadowOpacity={1} />}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
