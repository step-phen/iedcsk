"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import {
  OBJECTS,
  SPOTS,
  TRY_AGAIN,
  isObjectId,
  isShapeName,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  shortInstruction,
  type ShapeName,
} from "./ShapeHunt.data";
import styles from "./ShapeHunt.module.css";

/** One round as consumed by this component: a target shape hiding among four decoys, scattered over the scene. */
interface Round {
  key: string;
  shape: ShapeName;
  objectIds: string[];
  correctId: string;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

const shuffle = <T,>(list: readonly T[]): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

function buildRound(row: QuestionRow): Round {
  const { shape, objects } = row.questionData as { shape: unknown; objects: unknown };
  const answer = row.correctAnswer.answer;
  if (!isShapeName(shape)) throw new Error(`Question ${row.questionKey} needs a known "shape"`);
  if (!Array.isArray(objects) || objects.length !== SPOTS.length || !objects.every(isObjectId) || !objects.includes(answer)) {
    throw new Error(`Question ${row.questionKey} needs ${SPOTS.length} known "objects" that include the answer`);
  }
  return { key: row.questionKey, shape, objectIds: objects as string[], correctId: answer };
}

export default function ShapeHunt({ activityId, activityName, onFinish }: GameComponentProps) {
  const { speak, speakAll, stop } = useSpeech();

  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Rounds live in the DB (activity_questions) and play in authored order.
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
        console.error("Failed to load Shape Hunt questions:", err);
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
  const [wrongId, setWrongId] = useState<string | null>(null);
  const [foundId, setFoundId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  // The first tap per round is what scores; every tap after is just another try.
  const attemptsRef = useRef(0);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Shape Hunt";

  // Objects keep the DB's order but land on freshly-shuffled spots each round, so the scene never repeats its layout.
  const layout = useMemo(() => {
    if (!round) return [];
    return shuffle(SPOTS).map((spot, i) => ({ spot, objectId: round.objectIds[i] }));
  }, [round]);

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  // Plays once before the first round, then each round asks for its own shape.
  const introDone = useRef(false);
  useEffect(() => {
    if (!round) return;
    const prompt = promptSpeech(round.shape);
    if (!introDone.current) {
      introDone.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["shape hunt"], prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  // A soft spotlight that trails the pointer over the scene — purely decorative, never gates a tap.
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const [glow, setGlow] = useState<{ x: number; y: number } | null>(null);
  const moveGlow = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = fieldRef.current?.getBoundingClientRect();
    if (!rect) return;
    setGlow({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 });
  }, []);

  const advance = useCallback(() => {
    setWrongId(null);
    setFoundId(null);
    setRevealed(false);
    attemptsRef.current = 0;
    if (roundIndex + 1 >= total) {
      setPhase("complete");
    } else {
      setRoundIndex((i) => i + 1);
    }
    setLocked(false);
  }, [roundIndex, total]);

  const tapObject = useCallback(
    (objectId: string) => {
      if (!round || locked || foundId) return;
      attemptsRef.current += 1;
      const firstTry = attemptsRef.current === 1;

      if (objectId === round.correctId) {
        if (firstTry) {
          answersRef.current = [...answersRef.current, { questionId: round.key, response: objectId }];
          setScore((s) => s + 1);
        }
        setLocked(true);
        setFoundId(objectId);
        speak(correctSpeech(objectId, round.shape), advance);
        return;
      }

      if (firstTry) answersRef.current = [...answersRef.current, { questionId: round.key, response: objectId }];

      setLocked(true);
      setWrongId(objectId);
      window.setTimeout(() => setWrongId((id) => (id === objectId ? null : id)), 450);

      if (attemptsRef.current < 2) {
        speak(TRY_AGAIN, () => setLocked(false));
        return;
      }

      // Second miss: point out the right one and move on without a point.
      setRevealed(true);
      speak(revealSpeech(round.correctId, round.shape), () => {
        setFoundId(round.correctId);
        advance();
      });
    },
    [round, locked, foundId, speak, advance],
  );

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

  if (loadError) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 text-center font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!rounds || !round) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Getting the scene ready…</p>
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
          {rounds.map((r, i) => (
            <span
              key={r.key}
              aria-hidden
              className={cn("inline-block text-[clamp(16px,3vh,24px)] leading-none transition-transform", i === roundIndex && "scale-125")}
            >
              {i < roundIndex || (i === roundIndex && foundId === round.correctId) ? "🔍" : "⬚"}
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
            You found {score} of {total} shapes in the scene!
          </p>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>
              {shortInstruction(round.shape)}
            </p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.shape))}
              disabled={!!foundId}
              aria-label="Hear which shape to find"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] mt-[clamp(6px,1.4vh,14px)] flex min-h-0 w-full max-w-2xl flex-1 items-center justify-center">
            <div
              ref={fieldRef}
              onPointerMove={moveGlow}
              onPointerLeave={() => setGlow(null)}
              className={`${styles.field} relative aspect-[4/3] w-full max-h-full touch-none select-none rounded-3xl`}
            >
              {glow && <div className={styles.magnifier} style={{ left: `${glow.x}%`, top: `${glow.y}%` }} />}
              {layout.map(({ spot, objectId }) => {
                const obj = OBJECTS[objectId];
                const isWrong = wrongId === objectId;
                const isFound = foundId === objectId;
                const isReveal = revealed && objectId === round.correctId && !isFound;
                return (
                  <button
                    key={objectId}
                    type="button"
                    onClick={() => tapObject(objectId)}
                    disabled={locked && !isWrong}
                    aria-label={obj.name}
                    style={{ left: `${spot.x}%`, top: `${spot.y}%`, "--rot": `${spot.rotate}deg` } as React.CSSProperties}
                    className={cn(
                      styles.sticker,
                      "absolute flex h-[clamp(52px,13vh,88px)] w-[clamp(52px,13vh,88px)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl text-[clamp(30px,7vh,52px)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] disabled:cursor-default",
                      isWrong && styles.stickerWrong,
                      isReveal && styles.stickerReveal,
                      isFound && styles.stickerFound,
                    )}
                  >
                  <span aria-hidden style={{ transform: `rotate(${spot.rotate}deg)` }}>
                    {obj.emoji}
                  </span>
                  </button>
                );
              })}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
