"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, pickRandom } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import RealisticEffect from "@/components/effects/RealisticEffect";
import FireworksEffect from "@/components/effects/FireworksEffect";
import { cn } from "@/lib/utils";
import {
  GROUPS,
  INSTRUCTION,
  ITEM_FILL,
  SPEECH,
  correctSpeech,
  firstRoundSpeech,
  itemLabel,
  nextRoundSpeech,
  resultSpeech,
  roundPrompt,
  wrongSpeech,
} from "./ObjectsThatDoNotBelong.data";
import styles from "./ObjectsThatDoNotBelong.module.css";

/* ============================================================
   COLOR + SHADING HELPERS (same system as Differences game)
   ============================================================ */
function hexToRgb(hex: string) {
  hex = hex.replace("#", "");
  const n = parseInt(hex, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r: number, g: number, b: number) {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}
function shade(hex: string, percent: number) {
  const { r, g, b } = hexToRgb(hex);
  const amt = percent / 100;
  if (amt >= 0) return rgbToHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
  return rgbToHex(r * (1 + amt), g * (1 + amt), b * (1 + amt));
}

const STROKE = "#1E2A4A";
let uidCounter = 0;
function nextUid() {
  return "u" + uidCounter++;
}

function GradDef({ uid, fill }: { uid: string; fill: string }) {
  const light = shade(fill, 45);
  const dark = shade(fill, -28);
  return (
    <radialGradient id={`g${uid}`} cx="35%" cy="28%" r="80%">
      <stop offset="0%" stopColor={light} />
      <stop offset="55%" stopColor={fill} />
      <stop offset="100%" stopColor={dark} />
    </radialGradient>
  );
}
function Highlight({ cx, cy, rx, ry }: { cx: number; cy: number; rx: number; ry: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#ffffff" opacity="0.55" />;
}

/* ============================================================
   3D GLOSSY ICON LIBRARY
   ============================================================ */
type IconType =
  | "apple" | "banana" | "orange" | "mango" | "watermelon"
  | "cat" | "dog" | "fish" | "bird" | "rabbit"
  | "pencil" | "book" | "eraser" | "ruler" | "crayon"
  | "hat" | "shirt" | "shoe" | "socks" | "pants"
  | "ball" | "doll" | "teddybear" | "car" | "blocks";

const ICON_RENDERERS: Record<IconType, (u: string, fill: string) => React.ReactElement> = {
  apple: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <path d="M50 30 C33 22 15 34 15 58 C15 78 32 90 47 90 C50 90 50 90 53 90 C68 90 85 78 85 58 C85 34 67 22 50 30 Z"
        fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" strokeLinejoin="round" />
      <path d="M50 30 C50 22 47 16 42 13" fill="none" stroke={STROKE} strokeWidth="4" strokeLinecap="round" />
      <path d="M50 18 C58 12 66 14 68 20 C60 24 53 22 50 18 Z" fill="#3FAE72" stroke={STROKE} strokeWidth="2.5" strokeLinejoin="round" />
      <Highlight cx={33} cy={50} rx={9} ry={6} />
    </svg>
  ),
  banana: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <path d="M22 78 C18 55 30 28 60 18 C68 15 75 18 74 25 C73 30 66 30 62 33 C42 45 34 60 34 80 C34 88 24 88 22 78 Z"
        fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" strokeLinejoin="round" />
      <Highlight cx={46} cy={32} rx={10} ry={4} />
    </svg>
  ),
  orange: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <circle cx="50" cy="54" r="36" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" />
      <rect x="47" y="14" width="6" height="10" rx="2" fill="#4b6b3a" stroke={STROKE} strokeWidth="1.5" />
      <path d="M53 18 C60 12 68 14 70 20 C63 23 56 21 53 18 Z" fill="#3FAE72" stroke={STROKE} strokeWidth="2" strokeLinejoin="round" />
      <Highlight cx={37} cy={38} rx={10} ry={6} />
    </svg>
  ),
  mango: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <path d="M30 30 C15 45 15 70 35 84 C55 96 82 82 82 58 C82 36 62 20 46 22 C40 23 34 26 30 30 Z"
        fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" strokeLinejoin="round" />
      <path d="M46 22 C48 18 52 15 57 15" fill="none" stroke="#4b6b3a" strokeWidth="4" strokeLinecap="round" />
      <Highlight cx={40} cy={42} rx={9} ry={6} />
    </svg>
  ),
  watermelon: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <path d="M12 46 A38 38 0 0 0 88 46 Z" fill="#3FAE72" stroke={STROKE} strokeWidth="4" strokeLinejoin="round" />
      <path d="M18 46 A32 32 0 0 0 82 46 Z" fill="#FCE4A8" stroke={STROKE} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M24 46 A26 26 0 0 0 76 46 Z" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="42" cy="38" r="2.4" fill={STROKE} />
      <circle cx="50" cy="34" r="2.4" fill={STROKE} />
      <circle cx="58" cy="38" r="2.4" fill={STROKE} />
      <Highlight cx={38} cy={36} rx={7} ry={3} />
    </svg>
  ),
  cat: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <polygon points="22,26 36,44 16,46" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="3.5" strokeLinejoin="round" />
      <polygon points="78,26 64,44 84,46" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="50" cy="56" r="34" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" />
      <circle cx="38" cy="52" r="4" fill={STROKE} />
      <circle cx="62" cy="52" r="4" fill={STROKE} />
      <path d="M45 64 Q50 68 55 64" fill="none" stroke={STROKE} strokeWidth="3" strokeLinecap="round" />
      <Highlight cx={36} cy={42} rx={9} ry={5} />
    </svg>
  ),
  dog: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <ellipse cx="24" cy="42" rx="12" ry="18" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="3.5" transform="rotate(-18 24 42)" />
      <ellipse cx="76" cy="42" rx="12" ry="18" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="3.5" transform="rotate(18 76 42)" />
      <circle cx="50" cy="56" r="34" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" />
      <ellipse cx="50" cy="66" rx="14" ry="10" fill="#fff" stroke={STROKE} strokeWidth="2.5" />
      <circle cx="38" cy="50" r="4" fill={STROKE} />
      <circle cx="62" cy="50" r="4" fill={STROKE} />
      <ellipse cx="50" cy="62" rx="4.5" ry="3.5" fill={STROKE} />
      <Highlight cx={36} cy={42} rx={9} ry={5} />
    </svg>
  ),
  fish: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <ellipse cx="42" cy="52" rx="32" ry="22" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" />
      <polygon points="72,52 94,34 94,70" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" strokeLinejoin="round" />
      <circle cx="26" cy="46" r="4.5" fill={STROKE} />
      <Highlight cx={32} cy={42} rx={8} ry={4} />
    </svg>
  ),
  bird: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <ellipse cx="46" cy="58" rx="30" ry="24" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" />
      <circle cx="72" cy="40" r="16" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="3.5" />
      <polygon points="86,40 98,36 98,46" fill="#F0B429" stroke={STROKE} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="76" cy="35" r="3" fill={STROKE} />
      <path d="M30 62 Q18 58 14 66 Q24 68 32 68 Z" fill={shade(fill, -15)} stroke={STROKE} strokeWidth="2.5" strokeLinejoin="round" />
      <Highlight cx={36} cy={48} rx={8} ry={5} />
    </svg>
  ),
  rabbit: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <ellipse cx="38" cy="24" rx="8" ry="24" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="3.5" transform="rotate(-10 38 24)" />
      <ellipse cx="62" cy="24" rx="8" ry="24" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="3.5" transform="rotate(10 62 24)" />
      <circle cx="50" cy="60" r="32" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" />
      <circle cx="40" cy="56" r="4" fill={STROKE} />
      <circle cx="60" cy="56" r="4" fill={STROKE} />
      <ellipse cx="50" cy="66" rx="4" ry="3" fill="#F2789F" stroke={STROKE} strokeWidth="1.5" />
      <Highlight cx={38} cy={48} rx={8} ry={5} />
    </svg>
  ),
  pencil: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <polygon points="20,80 30,90 88,32 78,22" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" strokeLinejoin="round" />
      <polygon points="78,22 88,32 92,20 82,10" fill="#E8734A" stroke={STROKE} strokeWidth="3" strokeLinejoin="round" />
      <polygon points="20,80 30,90 16,92" fill="#4b5876" stroke={STROKE} strokeWidth="2.5" strokeLinejoin="round" />
      <Highlight cx={50} cy={52} rx={8} ry={3} />
    </svg>
  ),
  book: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <rect x="16" y="20" width="68" height="60" rx="6" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" />
      <line x1="50" y1="20" x2="50" y2="80" stroke={STROKE} strokeWidth="3" />
      <line x1="24" y1="34" x2="42" y2="34" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <line x1="24" y1="44" x2="42" y2="44" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <line x1="58" y1="34" x2="76" y2="34" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <line x1="58" y1="44" x2="76" y2="44" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <Highlight cx={32} cy={30} rx={8} ry={4} />
    </svg>
  ),
  eraser: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <rect x="14" y="34" width="72" height="34" rx="10" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" />
      <rect x="14" y="34" width="26" height="34" rx="10" fill="#fff" opacity="0.35" />
      <Highlight cx={30} cy={44} rx={8} ry={4} />
    </svg>
  ),
  ruler: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <rect x="10" y="40" width="80" height="22" rx="5" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" />
      <line x1="24" y1="40" x2="24" y2="50" stroke={STROKE} strokeWidth="2.5" />
      <line x1="38" y1="40" x2="38" y2="50" stroke={STROKE} strokeWidth="2.5" />
      <line x1="52" y1="40" x2="52" y2="50" stroke={STROKE} strokeWidth="2.5" />
      <line x1="66" y1="40" x2="66" y2="50" stroke={STROKE} strokeWidth="2.5" />
      <line x1="80" y1="40" x2="80" y2="50" stroke={STROKE} strokeWidth="2.5" />
      <Highlight cx={30} cy={46} rx={9} ry={3} />
    </svg>
  ),
  crayon: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <polygon points="30,20 70,20 70,60 50,90 30,60" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" strokeLinejoin="round" />
      <rect x="30" y="20" width="40" height="14" fill="#fff" opacity="0.4" />
      <Highlight cx={42} cy={32} rx={7} ry={4} />
    </svg>
  ),
  hat: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <ellipse cx="50" cy="72" rx="42" ry="10" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" />
      <path d="M32 74 L36 24 C36 16 64 16 64 24 L68 74 Z" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" strokeLinejoin="round" />
      <rect x="32" y="52" width="36" height="8" fill="#F0B429" opacity="0.9" />
      <Highlight cx={44} cy={36} rx={7} ry={10} />
    </svg>
  ),
  shirt: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <path d="M35 16 L50 26 L65 16 L88 30 L76 46 L68 40 L68 88 L32 88 L32 40 L24 46 L12 30 Z"
        fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" strokeLinejoin="round" />
      <Highlight cx={40} cy={40} rx={8} ry={10} />
    </svg>
  ),
  shoe: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <path d="M12 66 L12 48 C12 44 16 42 20 42 L36 42 L48 30 C52 26 58 26 60 30 L60 42 L82 42 C90 42 92 50 92 58 L92 66 C92 72 86 76 78 76 L20 76 C15 76 12 71 12 66 Z"
        fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" strokeLinejoin="round" />
      <path d="M12 66 L92 66" stroke={STROKE} strokeWidth="2.5" opacity="0.5" />
      <Highlight cx={30} cy={54} rx={9} ry={4} />
    </svg>
  ),
  socks: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <path d="M36 10 L64 10 L64 52 C64 52 84 60 84 76 C84 86 74 90 62 90 L40 90 C34 90 30 86 30 80 L30 20 C30 14 32 10 36 10 Z"
        fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" strokeLinejoin="round" />
      <rect x="30" y="10" width="34" height="14" fill="#fff" opacity="0.4" />
      <Highlight cx={42} cy={30} rx={7} ry={9} />
    </svg>
  ),
  pants: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <path d="M22 12 L78 12 L82 88 L62 88 L54 34 L46 88 L26 88 Z"
        fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" strokeLinejoin="round" />
      <rect x="22" y="12" width="56" height="10" fill="#fff" opacity="0.35" />
      <Highlight cx={36} cy={30} rx={7} ry={10} />
    </svg>
  ),
  ball: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <circle cx="50" cy="54" r="38" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" />
      <polygon points="50,32 60,42 56,54 44,54 40,42" fill="#fff" stroke={STROKE} strokeWidth="2.5" strokeLinejoin="round" />
      <line x1="50" y1="32" x2="50" y2="16" stroke={STROKE} strokeWidth="2.5" />
      <line x1="60" y1="42" x2="76" y2="34" stroke={STROKE} strokeWidth="2.5" />
      <line x1="56" y1="54" x2="66" y2="70" stroke={STROKE} strokeWidth="2.5" />
      <line x1="44" y1="54" x2="34" y2="70" stroke={STROKE} strokeWidth="2.5" />
      <line x1="40" y1="42" x2="24" y2="34" stroke={STROKE} strokeWidth="2.5" />
      <Highlight cx={37} cy={38} rx={10} ry={6} />
    </svg>
  ),
  doll: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <circle cx="50" cy="28" r="18" fill="#FCE0BD" stroke={STROKE} strokeWidth="3.5" />
      <path d="M32 24 C32 10 68 10 68 24 C68 16 58 12 50 12 C42 12 32 16 32 24 Z" fill="#8B5A3C" stroke={STROKE} strokeWidth="2.5" />
      <circle cx="43" cy="28" r="2.5" fill={STROKE} />
      <circle cx="57" cy="28" r="2.5" fill={STROKE} />
      <path d="M22 90 C18 60 30 44 50 44 C70 44 82 60 78 90 Z"
        fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" strokeLinejoin="round" />
      <Highlight cx={38} cy={62} rx={8} ry={10} />
    </svg>
  ),
  teddybear: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <circle cx="24" cy="22" r="11" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="3.5" />
      <circle cx="76" cy="22" r="11" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="3.5" />
      <circle cx="50" cy="46" r="28" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" />
      <ellipse cx="50" cy="80" rx="30" ry="16" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" />
      <circle cx="41" cy="42" r="3.5" fill={STROKE} />
      <circle cx="59" cy="42" r="3.5" fill={STROKE} />
      <ellipse cx="50" cy="52" rx="7" ry="5" fill="#FCE4A8" stroke={STROKE} strokeWidth="2" />
      <Highlight cx={38} cy={36} rx={7} ry={4} />
    </svg>
  ),
  car: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <path d="M10 66 L16 46 C18 40 24 37 30 37 L70 37 C76 37 82 40 84 46 L90 66 Z"
        fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" strokeLinejoin="round" />
      <rect x="10" y="60" width="80" height="14" rx="6" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="4" />
      <path d="M30 44 L34 52 L66 52 L70 44 C64 40 36 40 30 44 Z" fill="#EAF3FF" stroke={STROKE} strokeWidth="2.5" />
      <circle cx="30" cy="76" r="9" fill="#33405f" stroke={STROKE} strokeWidth="3" />
      <circle cx="70" cy="76" r="9" fill="#33405f" stroke={STROKE} strokeWidth="3" />
      <Highlight cx={40} cy={48} rx={8} ry={3} />
    </svg>
  ),
  blocks: (u, fill) => (
    <svg viewBox="0 0 100 100">
      <defs><GradDef uid={u} fill={fill} /></defs>
      <rect x="14" y="52" width="30" height="30" rx="6" fill={`url(#g${u})`} stroke={STROKE} strokeWidth="3.5" />
      <rect x="52" y="52" width="30" height="30" rx="6" fill="#F0B429" stroke={STROKE} strokeWidth="3.5" />
      <rect x="33" y="16" width="30" height="30" rx="6" fill="#3FAE72" stroke={STROKE} strokeWidth="3.5" />
      <Highlight cx={24} cy={60} rx={6} ry={4} />
    </svg>
  ),
};

function Icon({ type, fill }: { type: IconType; fill: string }) {
  const uid = useMemo(() => nextUid(), []);
  const svgEl = ICON_RENDERERS[type](uid, fill) as React.ReactElement<{ style?: React.CSSProperties }>;
  return React.cloneElement(svgEl, {
    style: { width: "100%", height: "100%", display: "block", ...svgEl.props.style },
  });
}

/* ============================================================
   ROUND DATA — the DB (activity_questions) holds each round's group,
   the three objects that belong, and the odd one out, by word only.
   ============================================================ */
interface Tile {
  object: IconType;
  label: string;
  isOdd: boolean;
}

/** One round as consumed by this component, mapped from the API. */
interface Round {
  /** The row's own question_key, which grading matches answers on. */
  key: string;
  /** How the belonging objects are named aloud, e.g. "fruits". */
  group: string;
  tiles: Tile[];
  odd: Tile;
}

interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

const isIcon = (word: unknown): word is IconType => typeof word === "string" && word in ICON_RENDERERS && word in ITEM_FILL;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A round from its DB row ({group, belong, odd}), with the odd one shuffled in among the others. */
function buildRound(row: QuestionRow): Round {
  const { group, belong, odd } = row.questionData as { group: unknown; belong: unknown; odd: unknown };
  if (typeof group !== "string" || !(group in GROUPS) || !Array.isArray(belong) || !belong.every(isIcon) || !isIcon(odd)) {
    throw new Error(`Question ${row.questionKey} needs a known "group", drawable "belong" objects and a drawable "odd" one`);
  }
  const oddTile: Tile = { object: odd, label: itemLabel(odd), isOdd: true };
  const tiles = shuffle([...belong.map((object) => ({ object, label: itemLabel(object), isOdd: false })), oddTile]);
  return { key: row.questionKey, group: GROUPS[group], tiles, odd: oddTile };
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function ObjectsThatDoNotBelong({
  activityId,
  activityName,
  onFinish,
}: GameComponentProps) {
  const { speak, speakAll, stop } = useSpeech();

  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // Per-round outcome, so a star is only filled for a round actually got right.
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

        const mapped = rows.map(buildRound);
        setRounds(mapped);
        setRoundResults(Array(mapped.length).fill(null));
      } catch (err) {
        console.error("Failed to load Objects That Do Not Belong questions:", err);
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

  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [tappedIdx, setTappedIdx] = useState<number | null>(null);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  // Clears the wrong tile's shake so it settles into the dimmed look while the answer is shown.
  const [shaking, setShaking] = useState(false);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<SubmittedAnswer[]>([]);
  const [confettiOn, setConfettiOn] = useState(false);
  const [burstOrigin, setBurstOrigin] = useState({ x: 50, y: 50 });
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const total = rounds?.length ?? 0;
  const round = rounds ? rounds[roundIdx] : undefined;
  const locked = tappedIdx !== null;
  const title = (activityName || "Objects That Do Not Belong").toUpperCase();
  const prompt = round ? roundPrompt(round.tiles.map((t) => t.label)) : "";

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
    if (!rounds || !round || finished) return;

    if (introStateRef.current === "pending") {
      introStateRef.current = "speaking";
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["objects that do not belong"]], () => {
        introStateRef.current = "done";
        // interrupt: false so this never cuts off a feedback line whose onEnd advances the round.
        speak(firstRoundSpeech(prompt), undefined, { interrupt: false });
      });
      return;
    }

    if (introStateRef.current === "speaking") return;

    // interrupt: false so it queues behind the feedback line that advanced the round.
    speak(nextRoundSpeech(roundIdx + 1, roundIdx === rounds.length - 1, prompt), undefined, { interrupt: false });
    // prompt is derived from the round, so keying on the round keeps this to one line per round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, round, roundIdx, finished, speak, speakAll]);

  // Advancement rides on the feedback line finishing, so a stray double-fire
  // would skip a round outright. One advance per round, enforced here.
  const advancingRef = useRef(false);
  useEffect(() => {
    advancingRef.current = false;
  }, [roundIdx]);

  const advanceRound = useCallback(() => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    setTappedIdx(null);
    setWasCorrect(null);
    // Drop back to false so the next correct answer is a fresh rising edge.
    setConfettiOn(false);
    if (roundIdx + 1 >= total) {
      setFinished(true);
    } else {
      setRoundIdx((r) => r + 1);
    }
  }, [roundIdx, total]);

  const handleTap = useCallback(
    (idx: number) => {
      if (locked || finished || !round) return;
      const tapped = round.tiles[idx];
      const isCorrect = tapped.isOdd;

      setTappedIdx(idx);
      setWasCorrect(isCorrect);
      setRoundResults((prev) => {
        const next = [...prev];
        next[roundIdx] = isCorrect;
        return next;
      });
      if (isCorrect) {
        setScore((s) => s + 1);
        // Fire the burst from the middle of the tile they actually tapped, so the celebration is tied to their choice.
        const el = tileRefs.current[idx];
        if (el) {
          const r = el.getBoundingClientRect();
          setBurstOrigin({
            x: ((r.left + r.width / 2) / window.innerWidth) * 100,
            y: ((r.top + r.height / 2) / window.innerHeight) * 100,
          });
        }
        setConfettiOn(true);
      } else {
        setShaking(true);
        setTimeout(() => setShaking(false), 500);
      }
      setAnswers((prev) => [...prev, { questionId: round.key, response: tapped.object }]);

      // Answering cuts off the intro or prompt still playing, so the feedback is heard right away.
      // An interrupted intro never runs its onEnd, so it is marked done here or later rounds would never be announced.
      introStateRef.current = "done";
      // The board advances from onEnd so narration and screen stay in step; useSpeech still runs onEnd when a clip fails.
      speak(
        isCorrect
          ? correctSpeech(pickRandom(SPEECH.correct), round.odd.label, round.group)
          : wrongSpeech(pickRandom(SPEECH.wrong), tapped.label, round.odd.label, round.group),
        advanceRound,
      );
    },
    [locked, finished, round, roundIdx, speak, advanceRound],
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
    if (finished) speak(resultLine, finishOnce);
  }, [finished, resultLine, speak, finishOnce]);

  const progressPct = finished ? 100 : total > 0 ? Math.round((roundIdx / total) * 100) : 0;

  if (loadError) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full flex-col items-center justify-center gap-5 px-6 text-center`}>
        <p className="text-xl font-bold sm:text-2xl">We couldn&apos;t get the pictures ready.</p>
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
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 text-center`}>
        <p className="text-xl font-bold sm:text-2xl">Getting the pictures ready…</p>
      </div>
    );
  }

  const tileState = (idx: number): "correct" | "wrong" | "reveal" | "dimmed" | "default" => {
    if (tappedIdx === null) return "default";
    if (idx === tappedIdx) return wasCorrect ? "correct" : shaking ? "wrong" : "dimmed";
    if (!wasCorrect && round.tiles[idx].isOdd) return "reveal";
    return "dimmed";
  };

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full items-center justify-center overflow-hidden px-[1.5vw] pb-[1.5vh] pt-20`}>
      {/* Outside the card in the screen's top-left corner, in the band the screen's top padding keeps free; it stays on the result screen too. */}
      {learnerName && (
        <div className={`${styles.badge} fixed left-3 top-3 z-10 flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-xl font-extrabold`}>
          <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={`${styles.avatar} size-11 text-xl`} />
          <span className="max-w-48 truncate capitalize">{learnerName}</span>
        </div>
      )}
      <RealisticEffect active={confettiOn} originX={burstOrigin.x} originY={burstOrigin.y} />
      {/* Sustained celebration once the whole activity is done. */}
      <FireworksEffect active={finished} />
      <div
        className={`${styles.card} relative box-border flex h-[min(calc(100dvh-5.5rem),560px)] w-[min(98vw,1180px)] flex-col rounded-[26px] px-[clamp(18px,3vw,36px)] py-[clamp(10px,1.8vh,20px)]`}
      >
        <div className={`${styles.corner} ${styles.cornerLeft}`} />
        <div className={`${styles.corner} ${styles.cornerRight}`} />


        {finished ? (
          <div className={`${styles.result} flex flex-1 flex-col items-center justify-center gap-[clamp(4px,1vh,10px)] text-center`}>
            <h1 className="m-0 max-w-[90%] text-[clamp(18px,3.4vh,30px)] tracking-[0.5px]">{title} COMPLETE!</h1>
            <div className="flex items-center justify-center gap-2">
              <p className={`${styles.resultScore} m-0 text-[clamp(16px,2.8vh,24px)] font-extrabold`}>
                Score: {score} / {total}
              </p>
              <button
                type="button"
                onClick={() => speak(resultLine, finishOnce)}
                aria-label="Hear the result again"
                className={`${styles.roundButton} flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-base`}
              >
                🔊
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
            <div className="mt-5 flex flex-none items-center justify-between">
              <div className={`${styles.eyebrow} text-[clamp(11px,1.5vh,15px)] font-extrabold uppercase tracking-[1px]`}>
                Round {roundIdx + 1} of {total}
              </div>
              <div className={`${styles.scoreChip} rounded-full px-3 py-[3px] text-[clamp(10px,1.4vh,13px)] font-extrabold`}>Score: {score}</div>
            </div>

            <div className="mx-0 mb-[clamp(4px,0.8vh,8px)] mt-[clamp(2px,0.6vh,8px)] flex flex-none items-center justify-center gap-2 text-center text-[clamp(18px,3.2vh,30px)] font-extrabold tracking-[0.5px]">
              {INSTRUCTION}
              <button
                type="button"
                // Only while the round is open: replaying over the feedback line would cancel the onEnd that moves to the next round.
                onClick={() => speak(prompt)}
                disabled={locked}
                aria-label="Hear the question again"
                className={`${styles.roundButton} flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-base`}
              >
                🔊
              </button>
            </div>

            <div className={`${styles.progressTrack} mx-auto mb-[clamp(6px,1vh,12px)] h-[clamp(10px,1.6vh,16px)] w-[min(80%,620px)] flex-none overflow-hidden rounded-full`}>
              {/* Grows by scaling rather than width, so the bar animates without re-laying out the card. */}
              <div className={`${styles.progressFill} h-full w-full rounded-full`} style={{ transform: `scaleX(${progressPct / 100})` }} />
            </div>

            <div className={`${styles.subtitle} mb-[clamp(4px,1vh,10px)] min-h-[1.4em] flex-none text-center text-[clamp(12px,1.7vh,16px)] font-bold`}>
              Tap the one that does not belong!
            </div>

            {/* Padded so the zoomed answer has room inside the card. */}
            <div className="flex min-h-0 flex-[1_1_auto] items-stretch justify-center gap-[clamp(10px,1.8vw,20px)] px-2 py-[clamp(8px,2vh,20px)]">
              {round.tiles.map((tile, idx) => {
                const state = tileState(idx);
                return (
                  <button
                    key={`${round.key}-${tile.object}`}
                    type="button"
                    ref={(el) => {
                      tileRefs.current[idx] = el;
                    }}
                    onClick={() => handleTap(idx)}
                    className={cn(
                      styles.tile,
                      "relative box-border flex max-w-[184px] flex-[1_1_0] select-none flex-col items-center justify-center gap-[clamp(4px,0.8vh,8px)] rounded-2xl px-[clamp(8px,1.4vh,14px)] pb-[clamp(6px,1vh,10px)] pt-[clamp(8px,1.4vh,14px)]",
                      locked ? "cursor-default" : "cursor-pointer",
                      state === "correct" && styles.tileCorrect,
                      state === "wrong" && styles.tileWrong,
                      state === "reveal" && styles.tileReveal,
                      state === "dimmed" && styles.tileDimmed,
                    )}
                  >
                    <div className="relative flex min-h-0 w-full flex-[1_1_auto] items-center justify-center" aria-hidden="true">
                      <Icon type={tile.object} fill={ITEM_FILL[tile.object]} />
                      {/* The odd one out gets crossed out once found, by the child or by the reveal. */}
                      {(state === "correct" || state === "reveal") && (
                        <div className="pointer-events-none absolute inset-[10%]">
                          <svg viewBox="0 0 100 100" className="size-full">
                            <line x1="14" y1="14" x2="86" y2="86" stroke="#4CAF7D" strokeWidth="10" strokeLinecap="round" />
                            <line x1="86" y1="14" x2="14" y2="86" stroke="#4CAF7D" strokeWidth="10" strokeLinecap="round" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-none text-center text-[clamp(11px,1.6vh,15px)] font-extrabold capitalize leading-[1.1] tracking-[0.2px]" style={{ color: shade(ITEM_FILL[tile.object], -35) }}>
                      {tile.label}
                    </div>
                    {state === "reveal" && (
                      <span
                        className={`${styles.stamp} absolute -right-3 -top-3 box-border flex size-[clamp(24px,3.6vh,34px)] items-center justify-center rounded-full text-[clamp(13px,2vh,18px)] font-black`}
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-[clamp(6px,1.2vh,14px)] flex min-h-[clamp(26px,4.5vh,36px)] flex-none items-center justify-center">
              <div
                className={cn(
                  "scale-90 rounded-full px-[22px] py-1.5 text-[clamp(13px,2.1vh,20px)] font-extrabold opacity-0 transition-[opacity,transform] duration-[180ms] ease-in-out",
                  locked && "scale-100 opacity-100",
                  wasCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
                )}
                aria-live="polite"
              >
                {!locked ? "" : wasCorrect ? "Correct! Great thinking! 🎉" : `The ${round.odd.label} does not belong!`}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
