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
import { CAPITAL_LINES, SMALL_LINES, nameLetters, type Letter } from "../week-4/alphabet";
import { useTraceRounds, type Glyph } from "../week-4/useTraceRounds";
import {
  ASSETS,
  NUMERAL_TOP,
  NUMERAL_MID,
  NUMERAL_BASE,
  WATCH_AGAIN,
  REVEAL,
  isItem,
  buildRound,
  itemFace,
  instruction,
  revealSpeech,
  resultHeadline,
  resultSpeech,
  type Item,
} from "./WritingReadinessReviewQ4.data";
import styles from "./WritingReadinessReviewQ4.module.css";

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

function readItem(row: QuestionRow): Item {
  if (!isItem(row.questionData) || row.correctAnswer.answer !== "correct") throw new Error(`Question ${row.questionKey} needs a letter, number or name item and the answer "correct"`);
  return row.questionData;
}

/** Ruled lines sketched on the easel canvas, matching what is being written. */
function CanvasLines({ glyph }: { glyph: Glyph }) {
  const ends = (y: number) => [24, y, glyph.viewW - 24, y];
  const [top, mid, base, tail] =
    glyph.lines === "capital"
      ? [CAPITAL_LINES.top, CAPITAL_LINES.mid, CAPITAL_LINES.base]
      : glyph.lines === "small"
        ? [SMALL_LINES.top, SMALL_LINES.mid, SMALL_LINES.base, SMALL_LINES.tail]
        : [NUMERAL_TOP, NUMERAL_MID, NUMERAL_BASE];
  return (
    <>
      <Line points={ends(top)} stroke="#d6cfc4" strokeWidth={3} />
      <Line points={ends(mid)} stroke="#d6cfc4" strokeWidth={3} dash={[14, 12]} />
      <Line points={ends(base)} stroke="#9c6644" strokeWidth={4} />
      {tail !== undefined && <Line points={ends(tail)} stroke="#d6cfc4" strokeWidth={3} dash={[4, 10]} lineCap="round" />}
    </>
  );
}

export default function WritingReadinessReviewQ4({ activityId, activityName, onFinish }: GameComponentProps) {
  const speech = useSpeech();
  const { speak, stop } = speech;

  const [items, setItems] = useState<{ key: string; item: Item }[] | null>(null);
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
        setItems(rows.map((row) => ({ key: row.questionKey, item: readItem(row) })));
      } catch (err) {
        console.error("Failed to load Writing Readiness Review questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [name, setName] = useState<Letter[] | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
    setName(nameLetters(getLearnerFirstName()));
  }, []);
  useEffect(() => stop, [stop]);

  const rounds = useMemo(() => (items && name ? items.map(({ key, item }) => buildRound(key, item, name)) : null), [items, name]);
  const { round, glyph, roundIndex, step, mode, complete, results, marks, score, total, resultLine, finishOnce, onAttempt, onDemoEnd, demo } = useTraceRounds({
    rounds,
    speech,
    openingLines: () => [learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["writing readiness review q4"]],
    watchAgain: WATCH_AGAIN,
    revealSpeech,
    resultSpeech,
    onFinish,
  });
  const title = activityName || "Writing Readiness Review";

  if (loadError) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 text-center font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!items || !rounds || !round || !glyph || !name) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Hanging the frames…</p>
      </div>
    );
  }

  const item = items[roundIndex].item;
  // A frame fills once its round is over (or, for this round, the moment it finishes).
  const hung = (i: number) => i < roundIndex || (i === roundIndex && mode === "end");

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      {learnerName && (
        <div className={`${styles.badge} fixed left-3 top-3 z-10 flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-xl font-extrabold short:py-1 short:text-base`}>
          <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={`${styles.avatar} size-11 text-xl short:size-8 short:text-base`} />
          <span className="max-w-48 truncate capitalize leading-none">{learnerName}</span>
        </div>
      )}
      {!complete && (
        <div className={`${styles.badge} fixed right-3 top-3 z-10 flex items-center gap-0.5 rounded-full px-3 py-1.5`} aria-label={`Score: ${score} of ${total}`}>
          {rounds.map((r, i) => (
            <Image
              key={r.key}
              src={results[i] ? ASSETS.starFilled : ASSETS.starEmpty}
              alt=""
              width={128}
              height={128}
              loading="eager"
              className={cn("size-[clamp(16px,3vh,26px)] object-contain transition-transform", i === roundIndex && "scale-125")}
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
            You hung {score} of {total} pictures!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-[clamp(4px,1.2vw,12px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(30px,6.5vh,60px)] object-contain drop-shadow-[0_4px_3px_rgba(30,50,80,0.3)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{instruction(item)}</p>
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

          <main className="relative z-[1] flex min-h-0 w-full max-w-[min(100%,980px)] flex-1 flex-col items-center gap-[clamp(6px,1.4vh,14px)] pt-2">
            {/* For name rounds, the gallery placard is the model: each letter is painted in once it is written. */}
            {item.kind === "name" && (
              <div
                className={`${styles.label} flex max-w-full shrink-0 items-center justify-center gap-[0.08em] rounded-lg px-[0.5em] py-[0.1em] font-extrabold leading-none`}
                style={{ fontSize: `min(7vh, ${Math.min(11, 64 / name.length)}vw)` }}
                aria-label={`Your name: ${name.map((l) => l.char).join("")}`}
              >
                {name.map((l, i) => (
                  <span key={i} className={cn(styles.labelLetter, marks[i] === true && styles.labelDone, marks[i] === false && styles.labelMissed, i === step && marks[i] === undefined && styles.labelNext)}>
                    {l.char}
                  </span>
                ))}
              </div>
            )}

            {/* The canvas fills whatever room is left, sized from its box so it never spills. */}
            <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center self-stretch [container-type:size]">
              <div
                className={cn(
                  styles.canvas,
                  "relative aspect-[6/5] w-[min(100cqw,calc(100cqh*1.2))] rounded-[14px]",
                  mode === "wrong" && styles.canvasWrong,
                  (mode === "demo" || mode === "reveal") && styles.canvasModel,
                  mode === "reveal" && styles.canvasZoom,
                  mode === "right" && styles.canvasRight,
                )}
              >
                <LetterTracePad
                  key={`${round.key}-${step}`}
                  viewW={glyph.viewW}
                  viewH={glyph.viewH}
                  strokes={glyph.strokes}
                  under={<CanvasLines glyph={glyph} />}
                  guideColor="#5c4a3a"
                  inkColor="#d1495b"
                  faint={round.copy}
                  disabled={mode !== "trace"}
                  demo={demo}
                  demoColor={mode === "watch" ? "#f08a24" : "#22b35e"}
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

            {/* The gallery wall: each frame shows what was written once its round is done. */}
            <ul className="m-0 flex shrink-0 list-none flex-wrap items-center justify-center gap-[clamp(4px,1.2vw,12px)] p-0" aria-label="Picture frames">
              {items.map(({ key, item: it }, i) => (
                <li
                  key={key}
                  className={cn(
                    styles.frame,
                    "relative flex h-[clamp(34px,7vmin,58px)] w-[clamp(28px,5.8vmin,48px)] items-center justify-center text-[clamp(14px,3.4vmin,28px)] font-extrabold leading-none",
                    hung(i) && (results[i] ? styles.frameDone : styles.frameMissed),
                    i === roundIndex && !hung(i) && styles.frameNext,
                  )}
                  aria-label={hung(i) ? `Frame ${itemFace(it, name)}` : "Empty frame"}
                >
                  {hung(i) ? itemFace(it, name) : ""}
                </li>
              ))}
            </ul>
          </main>
        </>
      )}
    </div>
  );
}
