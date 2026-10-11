"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import {
  BIN_ORDER,
  INSTRUCTION,
  OBJECTS,
  PROMPT,
  SHAPE_NAMES,
  TRY_AGAIN,
  correctSpeech,
  isObjectId,
  resultHeadline,
  resultSpeech,
  type ShapeName,
} from "./SortByShape.data";
import styles from "./SortByShape.module.css";

const BIN_SIZE = 84;
const OBJECT_SIZE = 64;

interface Item {
  id: string;
  objectId: keyof typeof OBJECTS;
  shape: ShapeName;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

function buildItem(row: QuestionRow): Item {
  const { object } = row.questionData as { object: unknown };
  if (!isObjectId(object)) throw new Error(`Question ${row.questionKey} needs a known "object"`);
  if (row.correctAnswer.answer !== OBJECTS[object].shape) throw new Error(`Question ${row.questionKey}'s answer must match its object's shape`);
  return { id: row.questionKey, objectId: object, shape: OBJECTS[object].shape };
}

export default function SortByShape({ activityId, activityName, onFinish }: GameComponentProps) {
  const { speak, speakAll, stop } = useSpeech();

  const [items, setItems] = useState<Item[] | null>(null);
  const [loadError, setLoadError] = useState(false);

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
        setItems(rows.map(buildItem));
      } catch (err) {
        console.error("Failed to load Sort by Shape questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const total = items?.length ?? 0;
  const title = activityName || "Sort by Shape";

  const [phase, setPhase] = useState<Phase>("playing");
  const [score, setScore] = useState(0);
  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [offsets, setOffsets] = useState<Record<string, { x: number; y: number }>>({});
  const [settled, setSettled] = useState<Record<string, boolean>>({});
  const [activeBin, setActiveBin] = useState<ShapeName | null>(null);
  const [shakeBin, setShakeBin] = useState<ShapeName | null>(null);
  const [busy, setBusy] = useState(false);

  const attemptsRef = useRef<Record<string, number>>({});
  const answersRef = useRef<SubmittedAnswer[]>([]);
  const binRefs = useRef<Partial<Record<ShapeName, HTMLDivElement | null>>>({});
  const objectRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const dragRef = useRef<{ id: string; x: number; y: number; offset: { x: number; y: number } } | null>(null);

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!items || introSpokenRef.current) return;
    introSpokenRef.current = true;
    speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["sort by shape"], PROMPT]);
  }, [items, speakAll]);

  const binUnder = useCallback((id: string): ShapeName | null => {
    const rect = objectRefs.current[id]?.getBoundingClientRect();
    if (!rect) return null;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    for (const [shape, el] of Object.entries(binRefs.current) as [ShapeName, HTMLDivElement | null][]) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) return shape;
    }
    return null;
  }, []);

  const handlePointerDown = useCallback(
    (id: string) => (e: React.PointerEvent<HTMLDivElement>) => {
      if (busy || placed[id]) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setSettled((s) => ({ ...s, [id]: false }));
      dragRef.current = { id, x: e.clientX, y: e.clientY, offset: offsets[id] ?? { x: 0, y: 0 } };
    },
    [busy, placed, offsets],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d) return;
      setOffsets((o) => ({ ...o, [d.id]: { x: d.offset.x + (e.clientX - d.x), y: d.offset.y + (e.clientY - d.y) } }));
      setActiveBin(binUnder(d.id));
    },
    [binUnder],
  );

  const finishedRef = useRef(false);
  const finishOnce = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.(answersRef.current);
  }, [onFinish]);

  const handlePointerUp = useCallback(() => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d || !items) return;
    setActiveBin(null);
    const item = items.find((it) => it.id === d.id)!;
    const target = binUnder(d.id);

    attemptsRef.current[d.id] = (attemptsRef.current[d.id] ?? 0) + 1;
    const firstTry = attemptsRef.current[d.id] === 1;
    if (firstTry && target) answersRef.current = [...answersRef.current, { questionId: d.id, response: target }];

    setSettled((s) => ({ ...s, [d.id]: true }));

    if (target === item.shape) {
      const objectRect = objectRefs.current[d.id]?.getBoundingClientRect();
      const binRect = binRefs.current[item.shape]?.getBoundingClientRect();
      if (objectRect && binRect) {
        const dx = binRect.left + binRect.width / 2 - (objectRect.left + objectRect.width / 2);
        const dy = binRect.top + binRect.height / 2 - (objectRect.top + objectRect.height / 2);
        setOffsets((o) => ({ ...o, [d.id]: { x: o[d.id].x + dx, y: o[d.id].y + dy } }));
      }
      if (firstTry) setScore((s) => s + 1);
      setBusy(true);
      speak(correctSpeech(item.objectId), () => {
        setPlaced((p) => {
          const next = { ...p, [d.id]: true };
          if (Object.keys(next).length === total) {
            setPhase("complete");
          }
          return next;
        });
        setBusy(false);
      });
      return;
    }

    // Miss: bounce back to the tray.
    setOffsets((o) => ({ ...o, [d.id]: { x: 0, y: 0 } }));
    if (target) {
      setShakeBin(target);
      window.setTimeout(() => setShakeBin((s) => (s === target ? null : s)), 450);
    }
    setBusy(true);
    speak(TRY_AGAIN, () => setBusy(false));
  }, [items, binUnder, speak, total]);

  const resultLine = resultSpeech(score, total);
  useEffect(() => {
    if (phase === "complete") speak(resultLine, finishOnce);
  }, [phase, resultLine, speak, finishOnce]);

  if (loadError) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 text-center font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!items) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Getting the board ready…</p>
      </div>
    );
  }

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      {learnerName && (
        <div className={`${styles.badge} fixed left-3 top-3 z-10 flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-xl font-extrabold short:py-1 short:text-base`}>
          <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={`${styles.avatar} size-11 text-xl short:size-8 short:text-base`} />
          <span className="max-w-48 truncate capitalize leading-none">{learnerName}</span>
        </div>
      )}
      {phase !== "complete" && (
        <div className={`${styles.badge} fixed right-3 top-3 z-10 flex items-center gap-1 rounded-full px-3 py-1.5`} aria-label={`Score: ${score} of ${total}`}>
          {items.map((it) => (
            <span key={it.id} aria-hidden className="inline-block text-[clamp(16px,3vh,24px)] leading-none">
              {placed[it.id] ? "📦" : "⬚"}
            </span>
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
            You sorted {score} of {total} objects!
          </p>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.6vh,24px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button type="button" onClick={() => speak(PROMPT)} aria-label="Hear the instruction again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-between gap-[clamp(14px,3vh,32px)] py-[clamp(8px,1.6vh,18px)]">
            <div className="flex flex-wrap items-center justify-center gap-[clamp(10px,2.4vw,24px)]">
              {BIN_ORDER.map((shape) => (
                <div key={shape} className="flex flex-col items-center gap-1.5">
                  <div
                    ref={(el) => {
                      binRefs.current[shape] = el;
                    }}
                    aria-label={`${SHAPE_NAMES[shape]} group`}
                    style={{ width: BIN_SIZE, height: BIN_SIZE }}
                    className={cn(styles.bin, "rounded-2xl", activeBin === shape && styles.binActive, shakeBin === shape && styles.binShake)}
                  />
                  <span className={`${styles.binLabel} rounded-full px-3 py-0.5 text-[clamp(11px,2vh,15px)] font-extrabold capitalize`}>{SHAPE_NAMES[shape]}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-[clamp(14px,3vw,30px)]">
              {items.map((it) => {
                const obj = OBJECTS[it.objectId];
                const offset = offsets[it.id] ?? { x: 0, y: 0 };
                return (
                  <div
                    key={it.id}
                    ref={(el) => {
                      objectRefs.current[it.id] = el;
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${obj.name}, drag it to its matching shape group`}
                    onPointerDown={handlePointerDown(it.id)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, fontSize: OBJECT_SIZE * 0.72, width: OBJECT_SIZE, height: OBJECT_SIZE }}
                    className={cn(
                      styles.object,
                      "flex items-center justify-center leading-none",
                      settled[it.id] && styles.objectSettled,
                      placed[it.id] && styles.objectPlaced,
                    )}
                  >
                    {obj.emoji}
                  </div>
                );
              })}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
