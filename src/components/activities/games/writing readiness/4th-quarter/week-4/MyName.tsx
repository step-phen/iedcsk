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
import { VIEW, CAPITAL_LINES, SMALL_LINES, nameLetters, type Letter } from "./alphabet";
import { useTraceRounds, type Glyph } from "./useTraceRounds";
import {
  ASSETS,
  INSTRUCTION,
  WATCH_AGAIN,
  REVEAL,
  isNameMode,
  nameRound,
  revealSpeech,
  resultHeadline,
  resultSpeech,
  type NameMode,
} from "./MyName.data";
import styles from "./MyName.module.css";

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

function readMode(row: QuestionRow): NameMode {
  const { mode } = (row.questionData ?? {}) as { mode?: unknown };
  if (!isNameMode(mode) || row.correctAnswer.answer !== "correct") throw new Error(`Question ${row.questionKey} needs a "mode" of trace or copy and the answer "correct"`);
  return mode;
}

/** Writing lines on the stage card: capitals between top and base, small letters on four lines. */
function StageLines({ glyph }: { glyph: Glyph }) {
  const ends = (y: number) => [30, y, VIEW - 30, y];
  if (glyph.lines === "capital") {
    return (
      <>
        <Line points={ends(CAPITAL_LINES.top)} stroke="#e6c79a" strokeWidth={3} />
        <Line points={ends(CAPITAL_LINES.mid)} stroke="#e6c79a" strokeWidth={3} dash={[14, 12]} />
        <Line points={ends(CAPITAL_LINES.base)} stroke="#c0392b" strokeWidth={4} />
      </>
    );
  }
  return (
    <>
      <Line points={ends(SMALL_LINES.top)} stroke="#e6c79a" strokeWidth={3} />
      <Line points={ends(SMALL_LINES.mid)} stroke="#e6c79a" strokeWidth={3} dash={[14, 12]} />
      <Line points={ends(SMALL_LINES.base)} stroke="#c0392b" strokeWidth={4} />
      <Line points={ends(SMALL_LINES.tail)} stroke="#e6c79a" strokeWidth={3} dash={[4, 10]} lineCap="round" />
    </>
  );
}

export default function MyName({ activityId, activityName, onFinish }: GameComponentProps) {
  const speech = useSpeech();
  const { speak, stop } = speech;

  const [modes, setModes] = useState<{ key: string; mode: NameMode }[] | null>(null);
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
        setModes(rows.map((row) => ({ key: row.questionKey, mode: readMode(row) })));
      } catch (err) {
        console.error("Failed to load My Name questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [letters, setLetters] = useState<Letter[] | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
    setLetters(nameLetters(getLearnerFirstName()));
  }, []);
  useEffect(() => stop, [stop]);

  const rounds = useMemo(() => (modes && letters ? modes.map((m) => nameRound(m.key, m.mode, letters)) : null), [modes, letters]);
  const { round, glyph, roundIndex, step, mode, complete, results, marks, score, total, resultLine, finishOnce, onAttempt, onDemoEnd, demo } = useTraceRounds({
    rounds,
    speech,
    openingLines: () => [learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["my name"]],
    watchAgain: WATCH_AGAIN,
    revealSpeech,
    resultSpeech,
    onFinish,
  });
  const title = activityName || "My Name";

  if (loadError) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 text-center font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!rounds || !round || !glyph || !letters) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 font-baloo2`}>
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Switching on the lights…</p>
      </div>
    );
  }

  const roundMode: NameMode = round.copy ? "copy" : "trace";

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      <div aria-hidden className={`${styles.curtainLeft} pointer-events-none absolute inset-y-0 left-0 w-[7%]`} />
      <div aria-hidden className={`${styles.curtainRight} pointer-events-none absolute inset-y-0 right-0 w-[7%]`} />

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
            You wrote your name correctly {score} of {total} times!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(60,10,20,0.4)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION[roundMode]}</p>
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

          <main className="relative z-[1] flex min-h-0 w-full max-w-[min(100%,980px)] flex-1 flex-col items-center gap-[clamp(6px,1.6vh,16px)] pt-2">
            {/* The marquee sign: the child's name as the model, each letter lighting up once it is written. */}
            <div
              className={`${styles.marquee} flex max-w-full shrink-0 items-center justify-center gap-[0.12em] rounded-2xl px-[0.6em] py-[0.18em] font-extrabold leading-none`}
              style={{ fontSize: `min(8.5vh, ${Math.min(13, 72 / letters.length)}vw)` }}
              aria-label={`Your name: ${letters.map((l) => l.char).join("")}`}
            >
              {letters.map((l, i) => (
                <span
                  key={i}
                  className={cn(
                    styles.signLetter,
                    marks[i] === true && styles.signLit,
                    marks[i] === false && styles.signMissed,
                    i === step && marks[i] === undefined && styles.signNext,
                  )}
                >
                  {l.char}
                </span>
              ))}
            </div>

            {/* The stage card fills whatever room is left, sized from its box so it never spills. */}
            <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center self-stretch [container-type:size]">
              <div
                className={cn(
                  styles.card,
                  "relative size-[min(100cqw,100cqh)] rounded-[24px]",
                  mode === "wrong" && styles.cardWrong,
                  (mode === "demo" || mode === "reveal") && styles.cardModel,
                  mode === "reveal" && styles.cardZoom,
                  mode === "right" && styles.cardRight,
                )}
              >
                <LetterTracePad
                  key={`${round.key}-${step}`}
                  viewW={glyph.viewW}
                  viewH={glyph.viewH}
                  strokes={glyph.strokes}
                  under={<StageLines glyph={glyph} />}
                  guideColor="#7a4a2a"
                  inkColor="#8e1b3a"
                  faint={round.copy}
                  disabled={mode !== "trace"}
                  demo={demo}
                  demoColor={mode === "watch" ? "#f5a623" : "#22b35e"}
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
          </main>
        </>
      )}
    </div>
  );
}
