"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, REVEAL_MIN_MS } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import { CONTAINERS, ContainerShape, PLACE_OBJECTS, SPOTS, isContainer, isPlace, isPlaceObject, type Place } from "./InsideOutside";
import { ASSETS, correctSpeech, instruction, promptSpeech, resultHeadline, resultSpeech, revealSpeech } from "./WhereIsIt.data";
import styles from "./WhereIsIt.module.css";

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

function buildRound(row: QuestionRow): Round {
  const { container, object, ask } = row.questionData as { container: unknown; object: unknown; ask: unknown };
  if (!isContainer(container) || !isPlaceObject(object)) throw new Error(`Question ${row.questionKey} needs a known "container" and "object"`);
  if (!isPlace(ask) || row.correctAnswer.answer !== ask) throw new Error(`Question ${row.questionKey} needs an "ask" of inside or outside that matches its answer`);
  return { key: row.questionKey, container, objectId: object, ask };
}

/** Two copies inside and two outside; odd rounds are mirrored so the answer never sits in the same spot twice in a row. */
function spotsFor(roundIndex: number): { place: Place; x: number; y: number }[] {
  const mirror = roundIndex % 2 === 1;
  return (["inside", "outside"] as Place[]).flatMap((place) => SPOTS[place].map(({ x, y }) => ({ place, x: mirror ? 100 - x : x, y })));
}

export default function WhereIsIt({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Where Is It questions:", err);
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
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Where Is It?";
  const score = results.filter(Boolean).length;
  const spots = useMemo(() => spotsFor(roundIndex), [roundIndex]);

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
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["where is it"], prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  const tapObject = useCallback(
    (index: number) => {
      if (!round || picked !== null) return;
      const place = spots[index].place;
      const correct = place === round.ask;
      setPicked(index);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: place }];
      setResults((r) => [...r, correct]);
      speak(correct ? correctSpeech(round.ask, round.objectId, round.container) : revealSpeech(round.ask, round.container), advance, correct ? undefined : { minMs: REVEAL_MIN_MS });
    },
    [round, picked, spots, speak, advance],
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Hiding the toys…</p>
      </div>
    );
  }

  const object = PLACE_OBJECTS[round.objectId];
  const pickedRight = picked !== null && spots[picked].place === round.ask;

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
            You found {score} of {total} inside and outside things!
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
              disabled={picked !== null}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 items-center justify-center py-[clamp(8px,2vh,20px)]">
            <div className={`${styles.scene} relative h-[clamp(240px,50vh,440px)] w-[min(96vw,900px)] overflow-hidden rounded-3xl`}>
              <ContainerShape kind={round.container} />
              {spots.map((spot, i) => {
                const isPicked = picked === i;
                const isAnswer = spot.place === round.ask;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => tapObject(i)}
                    disabled={picked !== null}
                    aria-label={`${object.name} ${spot.place} the ${CONTAINERS[round.container].name}`}
                    className={cn(
                      styles.object,
                      "absolute flex size-[clamp(64px,13vh,108px)] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] disabled:cursor-default",
                      isPicked && isAnswer && styles.objectHop,
                      picked !== null && isAnswer && !pickedRight && styles.objectReveal,
                    )}
                    style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                  >
                    {picked !== null && isAnswer && (isPicked || !pickedRight) && (
                      <span aria-hidden className={cn(styles.halo, !pickedRight && styles.haloReveal, "absolute inset-0 rounded-full")} />
                    )}
                    {isPicked && !isAnswer && <span aria-hidden className={`${styles.wrongHalo} absolute inset-0 rounded-full`} />}
                    <span aria-hidden className="relative text-[clamp(42px,8.6vh,74px)] leading-none">
                      {object.emoji}
                    </span>
                    {isPicked && !isAnswer && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-1 flex size-10 items-center justify-center rounded-full text-2xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
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
