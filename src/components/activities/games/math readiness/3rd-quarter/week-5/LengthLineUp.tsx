"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, REVEAL_MIN_MS } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import { LengthItem, LENGTH_KINDS, UNIT, isLengthKind } from "../week-2/LengthItem";
import {
  ASSETS,
  CORRECT,
  DONE,
  DONE_MISSED,
  INSTRUCTION,
  RANKS,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type Rank,
} from "./LengthLineUp.data";
import styles from "./LengthLineUp.module.css";

interface Round {
  key: string;
  kind: keyof typeof LENGTH_KINDS;
  /** Shortest first, matching RANKS. */
  lengths: [number, number, number];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

const ZERO = { x: 0, y: 0 };

function buildRound(row: QuestionRow): Round {
  const { item, lengths } = row.questionData as { item: unknown; lengths: unknown };
  if (!isLengthKind(item)) throw new Error(`Question ${row.questionKey} needs a known "item"`);
  if (!Array.isArray(lengths) || lengths.length !== 3 || !lengths.every((n) => Number.isInteger(n) && n >= 2) || !(lengths[0] < lengths[1] && lengths[1] < lengths[2])) {
    throw new Error(`Question ${row.questionKey} needs three growing "lengths" of at least 2`);
  }
  if (row.correctAnswer.answer !== RANKS.join(",")) throw new Error(`Question ${row.questionKey}'s answer must be "${RANKS.join(",")}"`);
  return { key: row.questionKey, kind: item, lengths: lengths as [number, number, number] };
}

const shuffle = <T,>(list: readonly T[]): T[] => {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

export default function LengthLineUp({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Length Line-Up questions:", err);
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
  const [locked, setLocked] = useState(false);
  const [placed, setPlaced] = useState<Rank[]>([]);
  const [offsets, setOffsets] = useState<Partial<Record<Rank, { x: number; y: number }>>>({});
  const [settled, setSettled] = useState<Rank | null>(null);
  const [activeLane, setActiveLane] = useState<Rank | null>(null);
  const [wrongLane, setWrongLane] = useState<Rank | null>(null);
  const [revealLane, setRevealLane] = useState<Rank | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);
  // The lane each object was first dropped in, which is what gets graded.
  const firstDropRef = useRef<Partial<Record<Rank, Rank>>>({});
  const laneRefs = useRef<Partial<Record<Rank, HTMLDivElement | null>>>({});
  const dragRef = useRef<{ rank: Rank; x: number; y: number } | null>(null);

  const round = rounds?.[roundIndex];
  const title = activityName || "Length Line-Up";
  const score = results.filter(Boolean).length;
  const roundDone = placed.length === RANKS.length;

  const trayOrder = useMemo(() => (round ? shuffle(RANKS) : []), [round]);

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
    const prompt = promptSpeech(round.kind);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["length line-up"], prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPlaced([]);
    setOffsets({});
    setWrongLane(null);
    setRevealLane(null);
    firstDropRef.current = {};
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
    setLocked(false);
  }, [roundIndex, total]);

  // Once all three are in their lanes the round is graded from the first drops, then moves on by itself.
  const afterPlace = useCallback(
    (nextPlaced: Rank[]) => {
      setWrongLane(null);
      setRevealLane(null);
      if (!round || nextPlaced.length < RANKS.length) {
        setLocked(false);
        return;
      }
      const response = RANKS.map((r) => firstDropRef.current[r]).join(",");
      const earned = response === RANKS.join(",");
      answersRef.current = [...answersRef.current, { questionId: round.key, response }];
      setResults((r) => [...r, earned]);
      speak(earned ? DONE : DONE_MISSED, advance);
    },
    [round, speak, advance],
  );

  const laneUnder = useCallback((x: number, y: number): Rank | null => {
    for (const rank of RANKS) {
      const r = laneRefs.current[rank]?.getBoundingClientRect();
      if (r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return rank;
    }
    return null;
  }, []);

  const handlePointerDown = useCallback(
    (rank: Rank) => (e: React.PointerEvent<HTMLDivElement>) => {
      if (locked || placed.includes(rank)) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setSettled(null);
      dragRef.current = { rank, x: e.clientX, y: e.clientY };
    },
    [locked, placed],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d) return;
      setOffsets((o) => ({ ...o, [d.rank]: { x: e.clientX - d.x, y: e.clientY - d.y } }));
      setActiveLane(laneUnder(e.clientX, e.clientY));
    },
    [laneUnder],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      dragRef.current = null;
      if (!d || !round) return;
      setActiveLane(null);
      setSettled(d.rank);
      setOffsets((o) => ({ ...o, [d.rank]: ZERO }));
      const target = laneUnder(e.clientX, e.clientY);
      // Dropped on empty space or a filled lane: just slide back, no penalty.
      if (!target || placed.includes(target)) return;

      firstDropRef.current[d.rank] ??= target;
      const nextPlaced = [...placed, d.rank];
      setLocked(true);

      if (target === d.rank) {
        setPlaced(nextPlaced);
        speak(CORRECT[d.rank], () => afterPlace(nextPlaced));
        return;
      }

      // Wrong lane: mark it, light up the right one, and slide the object in there for the child.
      setWrongLane(target);
      setRevealLane(d.rank);
      speak(
        revealSpeech(d.rank, round.kind),
        () => {
          setPlaced(nextPlaced);
          afterPlace(nextPlaced);
        },
        { minMs: REVEAL_MIN_MS },
      );
    },
    [round, placed, laneUnder, speak, afterPlace],
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Getting the lanes ready…</p>
      </div>
    );
  }

  const lengthOf = (rank: Rank) => round.lengths[RANKS.indexOf(rank)];
  const perfectDone = roundDone && results[roundIndex];
  const name = LENGTH_KINDS[round.kind].name;

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
            You lined up {score} of {total} sets!
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
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.kind))}
              disabled={locked}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-wrap content-center items-center justify-center gap-[clamp(12px,3vw,32px)] py-2">
            <div className={`${styles.board} relative rounded-3xl py-[clamp(12px,2.6vh,22px)] pl-[clamp(46px,7vw,64px)] pr-[clamp(12px,2.4vw,22px)]`}>
              <span className={`${styles.startTag} absolute -top-4 left-[clamp(30px,5vw,46px)] rounded-full px-3 py-0.5 text-sm font-extrabold uppercase tracking-wide`}>Start</span>
              <div className={`${styles.startLine} flex flex-col gap-[clamp(8px,1.8vh,14px)]`} style={{ width: `calc(${UNIT} * 7.3)` }}>
                {RANKS.map((rank, i) => (
                  <div
                    key={rank}
                    ref={(el) => {
                      laneRefs.current[rank] = el;
                    }}
                    aria-label={`Lane ${i + 1}`}
                    className={cn(
                      styles.lane,
                      "relative flex items-center rounded-r-2xl",
                      activeLane === rank && styles.laneActive,
                      wrongLane === rank && styles.laneWrong,
                      revealLane === rank && styles.laneReveal,
                      perfectDone && styles.laneDone,
                    )}
                    style={{ minHeight: `calc(${UNIT} + 16px)` }}
                  >
                    <span className={`${styles.laneNumber} absolute -left-[clamp(40px,6vw,56px)] flex size-[clamp(28px,5vh,38px)] items-center justify-center rounded-full text-[clamp(15px,2.8vh,22px)] font-extrabold`}>
                      {i + 1}
                    </span>
                    {placed.includes(rank) && (
                      <div className={styles.placed}>
                        <LengthItem kind={round.kind} length={lengthOf(rank)} />
                      </div>
                    )}
                    {wrongLane === rank && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -top-3 right-2 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className={`${styles.tray} flex min-h-[clamp(150px,30vh,240px)] flex-col items-start justify-center gap-[clamp(10px,2.4vh,20px)] rounded-3xl p-[clamp(10px,2vw,20px)]`} style={{ minWidth: `calc(${UNIT} * 7.6)` }}>
              {trayOrder.map((rank) =>
                placed.includes(rank) ? null : (
                  <div
                    key={rank}
                    role="button"
                    tabIndex={0}
                    aria-label={`A ${name}, drag it into a lane`}
                    onPointerDown={handlePointerDown(rank)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{ transform: `translate(${(offsets[rank] ?? ZERO).x}px, ${(offsets[rank] ?? ZERO).y}px)` }}
                    className={cn(styles.object, settled === rank && styles.objectSettled, revealLane === rank && "opacity-40", "relative z-[2]")}
                  >
                    <LengthItem kind={round.kind} length={lengthOf(rank)} />
                  </div>
                ),
              )}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
