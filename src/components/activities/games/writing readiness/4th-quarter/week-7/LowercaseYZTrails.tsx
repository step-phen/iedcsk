"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Volume2 } from "lucide-react";
import { Line } from "react-konva";

import type { GameComponentProps } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import LetterTracePad from "../../2nd-quarter/week-1/LetterTracePad";
import { useTraceRounds } from "../week-4/useTraceRounds";
import {
  ASSETS,
  VIEW,
  TOP_Y,
  MID_Y,
  BASE_Y,
  TAIL_Y,
  Y_WORDS,
  Z_WORDS,
  INSTRUCTION,
  WATCH_AGAIN,
  REVEAL,
  isPair,
  buildRound,
  revealSpeech,
  resultHeadline,
  resultSpeech,
  type YWord,
  type ZWord,
} from "./LowercaseYZTrails.data";
import styles from "./LowercaseYZTrails.module.css";

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

interface Pair {
  key: string;
  y: YWord;
  z: ZWord;
}

function readPair(row: QuestionRow): Pair {
  if (!isPair(row.questionData) || row.correctAnswer.answer !== "correct") throw new Error(`Question ${row.questionKey} needs a known "y" and "z" word and the answer "correct"`);
  return { key: row.questionKey, y: row.questionData.y, z: row.questionData.z };
}

/** Four writing lines printed on the knitting chart. */
function ChartLines() {
  return (
    <>
      <Line points={[30, TOP_Y, VIEW - 30, TOP_Y]} stroke="#d9c7e6" strokeWidth={3} />
      <Line points={[30, MID_Y, VIEW - 30, MID_Y]} stroke="#d9c7e6" strokeWidth={3} dash={[14, 12]} />
      <Line points={[30, BASE_Y, VIEW - 30, BASE_Y]} stroke="#e07a5f" strokeWidth={4} />
      <Line points={[30, TAIL_Y, VIEW - 30, TAIL_Y]} stroke="#d9c7e6" strokeWidth={3} dash={[4, 10]} lineCap="round" />
    </>
  );
}

export default function LowercaseYZTrails({ activityId, activityName, onFinish }: GameComponentProps) {
  const speech = useSpeech();
  const { speak, stop } = speech;

  const [pairs, setPairs] = useState<Pair[] | null>(null);
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
        setPairs(rows.map(readPair));
      } catch (err) {
        console.error("Failed to load Letter y and z Trails questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  const rounds = useMemo(() => pairs?.map((p, i) => buildRound(p.key, p, i === 0)) ?? null, [pairs]);
  const { round, glyph, roundIndex, step, mode, complete, results, marks, score, total, resultLine, finishOnce, onAttempt, onDemoEnd, demo } = useTraceRounds({
    rounds,
    speech,
    openingLines: () => [learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["small letter y and z trails"]],
    watchAgain: WATCH_AGAIN,
    revealSpeech,
    resultSpeech,
    onFinish,
  });
  const title = activityName || "Letter y and z Trails";

  if (loadError) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 text-center font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!pairs || !rounds || !round || !glyph) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Winding the yarn…</p>
      </div>
    );
  }

  // A stripe is knitted once its round is over (or, for this round, the moment both letters are done).
  const knitted = (i: number) => i < roundIndex || (i === roundIndex && mode === "end");

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      {learnerName && (
        <div className={`${styles.badge} fixed left-3 top-3 z-10 flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-xl font-extrabold short:py-1 short:text-base`}>
          <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={`${styles.avatar} size-11 text-xl short:size-8 short:text-base`} />
          <span className="max-w-48 truncate capitalize leading-none">{learnerName}</span>
        </div>
      )}
      {!complete && (
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

      <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(26px,5.5vh,46px)] font-extrabold leading-tight`}>{title}</h1>

      {complete ? (
        <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center">
          <div className="flex items-center gap-3">
            <div className={`${styles.resultStamp} rounded-2xl px-[clamp(14px,3vw,30px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You knitted {score} of {total} stripes!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(70,30,80,0.3)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speak(round.prompts[step])}
              disabled={mode !== "trace"}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center gap-[clamp(6px,1.6vh,18px)] pt-2">
            {/* The two yarn balls: which letter of the pair is up now, and how each went. */}
            <div className="flex shrink-0 items-center gap-3" aria-label="Letters this round">
              {(["y", "z"] as const).map((ch, i) => (
                <span
                  key={ch}
                  className={cn(styles.ball, "flex size-[clamp(36px,7vmin,56px)] items-center justify-center rounded-full text-[clamp(20px,4.4vmin,34px)] font-extrabold leading-none", i === step && marks[i] === undefined && styles.ballNext, marks[i] === true && styles.ballDone, marks[i] === false && styles.ballMissed)}
                >
                  {ch}
                </span>
              ))}
            </div>

            {/* The knitting chart fills whatever room is left, sized from its box so it never spills. */}
            <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center self-stretch [container-type:size]">
              <div
                className={cn(
                  styles.chart,
                  "relative size-[min(100cqw,100cqh)] rounded-[20px]",
                  mode === "wrong" && styles.chartWrong,
                  (mode === "demo" || mode === "reveal") && styles.chartModel,
                  mode === "reveal" && styles.chartZoom,
                  mode === "right" && styles.chartRight,
                )}
              >
                <LetterTracePad
                  key={`${round.key}-${step}`}
                  viewW={glyph.viewW}
                  viewH={glyph.viewH}
                  strokes={glyph.strokes}
                  under={<ChartLines />}
                  guideColor="#6b5b7b"
                  inkColor="#8e44ad"
                  disabled={mode !== "trace"}
                  demo={demo}
                  demoColor={mode === "watch" ? "#f4a261" : "#22b35e"}
                  onDemoEnd={onDemoEnd}
                  onAttempt={onAttempt}
                  className="size-full"
                />
                {mode === "wrong" && (
                  <span aria-hidden className={`${styles.wrongMark} pointer-events-none absolute right-3 top-3 flex size-12 items-center justify-center rounded-full text-2xl font-extrabold leading-none`}>
                    ✕
                  </span>
                )}
                {mode === "reveal" && (
                  <p className={`${styles.revealNote} absolute -top-3 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(14px,2.4vh,22px)] font-extrabold`}>{REVEAL}</p>
                )}
              </div>
            </div>

            {/* The scarf: one stripe per round, knitted with its y and z pictures once both letters are done. */}
            <ul className={`${styles.scarf} m-0 flex w-full max-w-[720px] shrink-0 list-none items-stretch overflow-hidden rounded-xl p-0`} aria-label="Scarf">
              {pairs.map((p, i) => (
                <li
                  key={p.key}
                  className={cn(styles.stripe, "relative flex h-[clamp(36px,7.4vmin,62px)] flex-1 items-center justify-center gap-1 text-[clamp(16px,3.6vmin,30px)] leading-none", knitted(i) && (results[i] ? styles.stripeDone : styles.stripeMissed), i === roundIndex && !knitted(i) && styles.stripeNext)}
                  aria-label={knitted(i) ? `${Y_WORDS[p.y].label} and ${Z_WORDS[p.z].label}` : "Stripe not knitted yet"}
                >
                  {knitted(i) && (
                    <span aria-hidden className={styles.prize}>
                      {Y_WORDS[p.y].emoji}
                      {Z_WORDS[p.z].emoji}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </main>
        </>
      )}
    </div>
  );
}
