"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Volume2 } from "lucide-react";
import { Line } from "react-konva";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, REVEAL_MIN_MS } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import LetterTracePad from "../../2nd-quarter/week-1/LetterTracePad";
import {
  ASSETS,
  VIEW,
  TOP_Y,
  MID_Y,
  BASE_Y,
  TAIL_Y,
  STROKES,
  WORDS,
  INSTRUCTION,
  WATCH_AGAIN,
  REVEAL,
  isWord,
  promptSpeech,
  correctSpeech,
  revealSpeech,
  resultHeadline,
  resultSpeech,
  type Word,
} from "./LowercaseDTrails.data";
import styles from "./LowercaseDTrails.module.css";

interface Round {
  key: string;
  word: Word;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

// intro: greeting plays; watch: the pencil models d; trace: the child's turn; wrong → demo → reveal after a miss; right after a good d.
type Mode = "intro" | "watch" | "trace" | "right" | "wrong" | "demo" | "reveal";

// How long the red miss shakes on its own before the pencil shows the right way.
const WRONG_MS = 700;

function buildRound(row: QuestionRow): Round {
  const { word } = (row.questionData ?? {}) as { word?: unknown };
  if (!isWord(word) || row.correctAnswer.answer !== "correct") throw new Error(`Question ${row.questionKey} needs a known d "word" and the answer "correct"`);
  return { key: row.questionKey, word };
}

/** Writing lines on the parade poster: top, dashed middle, base, and the dotted tail line below. */
function FourLines() {
  return (
    <>
      <Line points={[30, TOP_Y, VIEW - 30, TOP_Y]} stroke="#d6d0e6" strokeWidth={3} />
      <Line points={[30, MID_Y, VIEW - 30, MID_Y]} stroke="#a99cc8" strokeWidth={3} dash={[14, 12]} />
      <Line points={[30, BASE_Y, VIEW - 30, BASE_Y]} stroke="#7a5fb0" strokeWidth={4} />
      <Line points={[30, TAIL_Y, VIEW - 30, TAIL_Y]} stroke="#a99cc8" strokeWidth={3} dash={[4, 10]} lineCap="round" />
    </>
  );
}

export default function LowercaseDTrails({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Letter d Trails questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const total = rounds?.length ?? 0;
  const [roundIndex, setRoundIndex] = useState(0);
  const [complete, setComplete] = useState(false);
  const [mode, setMode] = useState<Mode>("intro");
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const round = rounds?.[roundIndex];
  const title = activityName || "Letter d Trails";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  // The board opens only once the model d is drawn and the prompt is heard, whichever finishes last.
  const waitingRef = useRef(0);
  const settle = useCallback(() => {
    waitingRef.current -= 1;
    if (waitingRef.current === 0) setMode("trace");
  }, []);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    const watch = () => {
      waitingRef.current = 2;
      speak(promptSpeech(roundIndex === 0), settle, { onStart: () => setMode("watch") });
    };
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["small letter d trails"]], watch);
      return;
    }
    watch();
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    if (roundIndex + 1 >= total) setComplete(true);
    else {
      setMode("intro");
      setRoundIndex(roundIndex + 1);
    }
  }, [roundIndex, total]);

  // One try per letter: the first finished (or missed) d is the graded answer.
  const onAttempt = (pass: boolean) => {
    if (!round || mode !== "trace") return;
    answersRef.current = [...answersRef.current, { questionId: round.key, response: pass ? "correct" : "missed" }];
    setResults((r) => [...r, pass]);
    if (pass) {
      setMode("right");
      speak(correctSpeech(round.word), advance);
      return;
    }
    setMode("wrong");
    timerRef.current = window.setTimeout(() => {
      setMode("demo");
      speak(WATCH_AGAIN);
    }, WRONG_MS);
  };

  const onModelEnd = () => {
    if (!round) return;
    setMode("reveal");
    speak(revealSpeech(round.word), advance, { interrupt: false, minMs: REVEAL_MIN_MS });
  };

  const finishedRef = useRef(false);
  const finishOnce = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.(answersRef.current);
  }, [onFinish]);

  const resultLine = resultSpeech(score, total);
  useEffect(() => {
    if (complete) speak(resultLine, finishOnce);
  }, [complete, resultLine, speak, finishOnce]);

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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Tuning up the band…</p>
      </div>
    );
  }

  const boomed = mode === "right" || mode === "reveal";
  const picture = WORDS[round.word];

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      <div aria-hidden className={`${styles.bunting} pointer-events-none absolute inset-x-0 top-0 h-[6%]`} />
      <div aria-hidden className={`${styles.street} pointer-events-none absolute inset-x-0 bottom-0 h-[12%]`} />

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
            <div className={`${styles.resultBanner} rounded-2xl px-[clamp(14px,3vw,30px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You traced {score} of {total} letters correctly!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(90,20,20,0.35)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(false))}
              disabled={mode !== "trace"}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(8px,2vmin,28px)] py-2 landscape:flex-row">
            {/* The parade poster to trace on, sized from the room left so it never spills. */}
            <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center self-stretch [container-type:size]">
              <div
                className={cn(
                  styles.poster,
                  "relative size-[min(100cqw,100cqh)] rounded-[10px]",
                  mode === "wrong" && styles.posterWrong,
                  (mode === "demo" || mode === "reveal") && styles.posterModel,
                  mode === "reveal" && styles.posterZoom,
                  mode === "right" && styles.posterRight,
                )}
              >
                <LetterTracePad
                  key={round.key}
                  viewW={VIEW}
                  viewH={VIEW}
                  strokes={STROKES}
                  under={<FourLines />}
                  guideColor="#1864ab"
                  inkColor="#c92a2a"
                  disabled={mode !== "trace"}
                  demo={mode === "watch" || mode === "demo" || mode === "reveal"}
                  demoColor={mode === "watch" ? "#f2a33a" : "#22b35e"}
                  onDemoEnd={mode === "watch" ? settle : onModelEnd}
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

            {/* The marching drum: each traced d makes it boom, and the d picture bounces up off the drumhead. */}
            <div className="flex shrink-0 flex-col items-center gap-2">
              <div className="relative flex h-[clamp(120px,30vmin,250px)] w-[clamp(110px,28vmin,230px)] flex-col items-center justify-end">
                <span key={round.key} aria-hidden className={cn(styles.picture, boomed && styles.pictureShown, "absolute inset-x-0 top-0 text-center text-[clamp(30px,8vmin,68px)] leading-none")}>
                  {picture.emoji}
                </span>
                <span aria-hidden className={cn(styles.drum, boomed && styles.drumBoom, "relative block h-[55%] w-full rounded-[50%/22%]")}>
                  <span className={`${styles.drumHead} absolute inset-x-0 top-0 block h-[40%] rounded-[50%]`} />
                </span>
                <span aria-hidden className={cn(styles.sticks, boomed && styles.sticksHit, "absolute right-0 top-[24%] text-[clamp(22px,6vmin,48px)] leading-none")}>
                  🥢
                </span>
              </div>
              <p className={cn(styles.word, "m-0 rounded-2xl px-4 py-1 text-[clamp(22px,4.6vmin,40px)] font-extrabold leading-tight", !boomed && "invisible")}>
                <span className={styles.wordD}>d</span>
                {picture.label.toLowerCase().slice(1)}
              </p>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
