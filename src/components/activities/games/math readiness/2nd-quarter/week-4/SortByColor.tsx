"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import {
  COLOR_HEX,
  INSTRUCTION,
  OBJECTS,
  TRY_AGAIN,
  correctSpeech,
  isColorName,
  isObjectId,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./SortByColor.data";
import styles from "./SortByColor.module.css";

const BASKET_SIZE = 96;

interface Round {
  key: string;
  objectId: keyof typeof OBJECTS;
  bins: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

function buildRound(row: QuestionRow): Round {
  const { object, bins } = row.questionData as { object: unknown; bins: unknown };
  if (!isObjectId(object)) throw new Error(`Question ${row.questionKey} needs a known "object"`);
  if (!Array.isArray(bins) || !bins.every(isColorName) || !bins.includes(row.correctAnswer.answer)) {
    throw new Error(`Question ${row.questionKey} needs "bins" that include the correct color`);
  }
  return { key: row.questionKey, objectId: object, bins: bins as string[] };
}

export default function SortByColor({ activityId, activityName, onFinish }: GameComponentProps) {
  const { speak, speakAll, stop } = useSpeech();

  const [rounds, setRounds] = useState<Round[] | null>(null);
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
        setRounds(rows.map(buildRound));
      } catch (err) {
        console.error("Failed to load Sort by Color questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const total = rounds?.length ?? 0;
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [locked, setLocked] = useState(false);
  const [solved, setSolved] = useState(false);
  const [shakeBasket, setShakeBasket] = useState<string | null>(null);
  const [activeBasket, setActiveBasket] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [settled, setSettled] = useState(false);
  const attemptsRef = useRef(0);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Sort by Color";
  const answer = round?.bins[0] ?? null;

  const basketRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const objectRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; offset: { x: number; y: number } } | null>(null);

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round || !answer) return;
    const prompt = promptSpeech(round.objectId, answer);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["sort by color"], prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setOffset({ x: 0, y: 0 });
    setSettled(false);
    setSolved(false);
    setRevealed(false);
    setActiveBasket(null);
    attemptsRef.current = 0;
    if (roundIndex + 1 >= total) {
      setPhase("complete");
    } else {
      setRoundIndex((i) => i + 1);
    }
    setLocked(false);
  }, [roundIndex, total]);

  const basketUnderObject = useCallback((): string | null => {
    const objectRect = objectRef.current?.getBoundingClientRect();
    if (!objectRect) return null;
    const cx = objectRect.left + objectRect.width / 2;
    const cy = objectRect.top + objectRect.height / 2;
    for (const [color, el] of Object.entries(basketRefs.current)) {
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) return color;
    }
    return null;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!round || locked || solved) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setSettled(false);
      dragStartRef.current = { x: e.clientX, y: e.clientY, offset };
    },
    [round, locked, solved, offset],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const start = dragStartRef.current;
      if (!start) return;
      setOffset({ x: start.offset.x + (e.clientX - start.x), y: start.offset.y + (e.clientY - start.y) });
      setActiveBasket(basketUnderObject());
    },
    [basketUnderObject],
  );

  const handlePointerUp = useCallback(() => {
    const wasDragging = !!dragStartRef.current;
    dragStartRef.current = null;
    if (!wasDragging || !round || !answer) return;
    setActiveBasket(null);
    const target = basketUnderObject();

    attemptsRef.current += 1;
    const firstTry = attemptsRef.current === 1;
    if (firstTry && target) answersRef.current = [...answersRef.current, { questionId: round.key, response: target }];

    setSettled(true);
    if (target === answer) {
      const objectRect = objectRef.current?.getBoundingClientRect();
      const basketRect = basketRefs.current[answer]?.getBoundingClientRect();
      if (objectRect && basketRect) {
        const dx = basketRect.left + basketRect.width / 2 - (objectRect.left + objectRect.width / 2);
        const dy = basketRect.top + basketRect.height / 2 - (objectRect.top + objectRect.height / 2);
        setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
      }
      if (firstTry) setScore((s) => s + 1);
      setLocked(true);
      setSolved(true);
      speak(correctSpeech(answer), advance);
      return;
    }

    setOffset({ x: 0, y: 0 });
    if (target) {
      setShakeBasket(target);
      window.setTimeout(() => setShakeBasket((s) => (s === target ? null : s)), 450);
    }

    setLocked(true);
    if (attemptsRef.current < 2) {
      speak(TRY_AGAIN, () => setLocked(false));
      return;
    }

    setRevealed(true);
    speak(revealSpeech(answer), () => {
      setSolved(true);
      advance();
    });
  }, [round, answer, basketUnderObject, speak, advance]);

  const finishedRef = useRef(false);
  const finishOnce = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.(answersRef.current);
  }, [onFinish]);

  const resultLine = resultSpeech(score, total);
  useEffect(() => {
    if (phase === "complete") speak(resultLine, finishOnce);
  }, [phase, resultLine, speak, finishOnce]);

  const binOrder = useMemo(() => round?.bins ?? [], [round]);

  if (loadError) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 text-center font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!rounds || !round || !answer) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Getting the baskets ready…</p>
      </div>
    );
  }

  const object = OBJECTS[round.objectId];

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
          {rounds.map((r, i) => (
            <span key={r.key} aria-hidden className={cn("inline-block text-[clamp(16px,3vh,24px)] leading-none transition-transform", i === roundIndex && "scale-125")}>
              {i < roundIndex || (i === roundIndex && solved) ? "🧺" : "⬚"}
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
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.objectId, answer))}
              disabled={solved}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-between gap-[clamp(16px,4vh,48px)] py-[clamp(10px,2vh,24px)]">
            <div className="flex items-center justify-center gap-[clamp(14px,3vw,36px)]">
              {binOrder.map((color) => (
                <div key={color} className="flex flex-col items-center gap-1">
                  <div
                    className={`${styles.basketRim}`}
                    style={{ width: BASKET_SIZE * 0.86, height: BASKET_SIZE * 0.2, background: COLOR_HEX[color] }}
                  />
                  <div
                    ref={(el) => {
                      basketRefs.current[color] = el;
                    }}
                    aria-label={`${color} basket`}
                    style={{ width: BASKET_SIZE, height: BASKET_SIZE * 0.78 }}
                    className={cn(
                      styles.basket,
                      activeBasket === color && styles.basketActive,
                      solved && color === answer && styles.basketFilled,
                      shakeBasket === color && styles.basketShake,
                      revealed && color === answer && !solved && styles.basketReveal,
                    )}
                  />
                </div>
              ))}
            </div>

            <div
              ref={objectRef}
              role="button"
              tabIndex={0}
              aria-label={`${object.name}, drag it to the matching basket`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, fontSize: BASKET_SIZE * 0.7 }}
              className={cn(styles.object, settled && styles.objectSettled, solved && "pointer-events-none", "leading-none")}
            >
              {object.emoji}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
