"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, REVEAL_MIN_MS } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import { CONTAINERS, ContainerShape, PLACE_OBJECTS, isContainer, isPlace, isPlaceObject, pointIsInside, type Place } from "../week-4/InsideOutside";
import { ASSETS, REVEAL_SPOT, correctSpeech, instruction, promptSpeech, resultHeadline, resultSpeech, revealSpeech } from "./PutItInOut.data";
import styles from "./PutItInOut.module.css";

interface Round {
  key: string;
  container: keyof typeof CONTAINERS;
  objectId: keyof typeof PLACE_OBJECTS;
  ask: Place;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

const ZERO = { x: 0, y: 0 };
const clamp = (n: number) => Math.min(94, Math.max(6, n));

function buildRound(row: QuestionRow): Round {
  const { container, object, ask } = row.questionData as { container: unknown; object: unknown; ask: unknown };
  if (!isContainer(container) || !isPlaceObject(object)) throw new Error(`Question ${row.questionKey} needs a known "container" and "object"`);
  if (!isPlace(ask) || row.correctAnswer.answer !== ask) throw new Error(`Question ${row.questionKey} needs an "ask" of inside or outside that matches its answer`);
  return { key: row.questionKey, container, objectId: object, ask };
}

export default function PutItInOut({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Put It In/Out questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const total = rounds?.length ?? 0;
  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  // Where the child let go, in % of the scene, and which side of the container that was.
  const [drop, setDrop] = useState<{ x: number; y: number; place: Place } | null>(null);
  const [offset, setOffset] = useState(ZERO);
  const [settled, setSettled] = useState(false);
  const [overScene, setOverScene] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  const round = rounds?.[roundIndex];
  const title = activityName || "Put It In/Out";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    const prompt = promptSpeech(round.ask, round.objectId, round.container);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["put it in or out"], prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setDrop(null);
    setOffset(ZERO);
    setSettled(false);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  const inScene = (x: number, y: number) => {
    const r = sceneRef.current?.getBoundingClientRect();
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!round || drop) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setSettled(false);
    dragRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset({ x: e.clientX - d.x, y: e.clientY - d.y });
    setOverScene(inScene(e.clientX, e.clientY));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    setOverScene(false);
    setSettled(true);
    setOffset(ZERO);
    const scene = sceneRef.current?.getBoundingClientRect();
    // Let go off the scene: slide back to the tray, no answer yet.
    if (!d || !round || !scene || !inScene(e.clientX, e.clientY)) return;

    const place: Place = pointIsInside(round.container, scene, e.clientX, e.clientY) ? "inside" : "outside";
    const correct = place === round.ask;
    setDrop({ x: clamp(((e.clientX - scene.left) / scene.width) * 100), y: clamp(((e.clientY - scene.top) / scene.height) * 100), place });
    answersRef.current = [...answersRef.current, { questionId: round.key, response: place }];
    setResults((r) => [...r, correct]);
    speak(correct ? correctSpeech(round.ask, round.objectId, round.container) : revealSpeech(round.ask, round.objectId, round.container), advance, correct ? undefined : { minMs: REVEAL_MIN_MS });
  };

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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Setting up the play area…</p>
      </div>
    );
  }

  const object = PLACE_OBJECTS[round.objectId];
  const dropRight = drop?.place === round.ask;
  const emojiSize = "text-[clamp(46px,9.4vh,80px)]";

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
            <Image
              key={r.key}
              src={results[i] ? ASSETS.starFilled : ASSETS.starEmpty}
              alt=""
              width={128}
              height={128}
              loading="eager"
              className={cn("size-[clamp(20px,3.6vh,30px)] object-contain transition-transform", i === roundIndex && "scale-125")}
            />
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
            You put {score} of {total} things in the right place!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(34,49,79,0.25)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>
              {instruction(round.ask, round.objectId, round.container)}
            </p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.ask, round.objectId, round.container))}
              disabled={!!drop}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-evenly gap-[clamp(8px,2vh,18px)]">
            <div ref={sceneRef} className={cn(styles.scene, overScene && styles.sceneActive, "relative h-[clamp(220px,44vh,400px)] w-[min(96vw,900px)] overflow-hidden rounded-3xl")}>
              <ContainerShape kind={round.container} />

              {drop && (
                <div className="absolute flex size-[clamp(64px,13vh,108px)] -translate-x-1/2 -translate-y-1/2 items-center justify-center" style={{ left: `${drop.x}%`, top: `${drop.y}%` }}>
                  <span aria-hidden className={cn(dropRight ? styles.halo : styles.wrongHalo, "absolute inset-0 rounded-full")} />
                  <span aria-hidden className={`${styles.placed} relative ${emojiSize} leading-none`}>
                    {object.emoji}
                  </span>
                  {!dropRight && (
                    <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-1 flex size-10 items-center justify-center rounded-full text-2xl font-extrabold leading-none`}>
                      ✕
                    </span>
                  )}
                </div>
              )}

              {drop && !dropRight && (
                <div
                  className={`${styles.spotReveal} absolute flex size-[clamp(64px,13vh,108px)] -translate-x-1/2 -translate-y-1/2 items-center justify-center`}
                  style={{ left: `${REVEAL_SPOT[round.ask].x}%`, top: `${REVEAL_SPOT[round.ask].y}%` }}
                >
                  <span aria-hidden className={`${styles.halo} ${styles.haloReveal} absolute inset-0 rounded-full`} />
                  <span aria-hidden className={`${styles.placed} relative ${emojiSize} leading-none`}>
                    {object.emoji}
                  </span>
                </div>
              )}
            </div>

            <div className={`${styles.tray} flex h-[clamp(84px,15vh,124px)] w-[min(60vw,320px)] items-center justify-center rounded-3xl`}>
              {!drop && (
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`${object.name}, drag it ${round.ask} the ${CONTAINERS[round.container].name}`}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
                  className={cn(styles.object, settled && styles.objectSettled, `relative z-[2] ${emojiSize} leading-none`)}
                >
                  {object.emoji}
                </div>
              )}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
