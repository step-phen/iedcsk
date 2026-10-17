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
  CAPITAL_LINES,
  SMALL_LINES,
  LETTERS,
  INSTRUCTION,
  WATCH_AGAIN,
  REVEAL,
  isLetter,
  promptSpeech,
  correctSpeech,
  revealSpeech,
  resultHeadline,
  resultSpeech,
} from "./WritingSkillsReview3.data";
import styles from "./WritingSkillsReview3.module.css";

interface Round {
  key: string;
  letter: string;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

// intro: greeting plays; watch: the pencil models the letter; trace: the child's turn; wrong → demo → reveal after a miss; right after a good letter.
type Mode = "intro" | "watch" | "trace" | "right" | "wrong" | "demo" | "reveal";

// How long the red miss shakes on its own before the pencil shows the right way.
const WRONG_MS = 700;

function buildRound(row: QuestionRow): Round {
  const { letter } = (row.questionData ?? {}) as { letter?: unknown };
  if (!isLetter(letter) || row.correctAnswer.answer !== "correct") throw new Error(`Question ${row.questionKey} needs a taught "letter" and the answer "correct"`);
  return { key: row.questionKey, letter };
}

/** The storybook page's writing lines: three for a capital, or the four-line paper with its dotted tail line for a small letter. */
function PageLines({ small }: { small?: boolean }) {
  const { top, mid, base } = small ? SMALL_LINES : CAPITAL_LINES;
  return (
    <>
      <Line points={[30, top, VIEW - 30, top]} stroke="#6b4f3a" strokeWidth={4} opacity={0.7} />
      <Line points={[30, mid, VIEW - 30, mid]} stroke="#b08968" strokeWidth={3} dash={[14, 12]} />
      <Line points={[30, base, VIEW - 30, base]} stroke="#6b4f3a" strokeWidth={4} />
      {small && <Line points={[30, SMALL_LINES.tail, VIEW - 30, SMALL_LINES.tail]} stroke="#b08968" strokeWidth={3} dash={[4, 10]} lineCap="round" />}
    </>
  );
}

export default function WritingSkillsReview3({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Writing Skills Review 3 questions:", err);
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
  const title = activityName || "Writing Skills Review 3";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  // The page opens only once the model letter is drawn and the prompt is heard, whichever finishes last.
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
      speak(promptSpeech(round.letter), settle, { onStart: () => setMode("watch") });
    };
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["writing skills review 3"]], watch);
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

  // One try per letter: the first finished (or missed) letter is the graded answer.
  const onAttempt = (pass: boolean) => {
    if (!round || mode !== "trace") return;
    answersRef.current = [...answersRef.current, { questionId: round.key, response: pass ? "correct" : "missed" }];
    setResults((r) => [...r, pass]);
    if (pass) {
      setMode("right");
      speak(correctSpeech(round.letter), advance);
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
    speak(revealSpeech(round.letter), advance, { interrupt: false, minMs: REVEAL_MIN_MS });
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Opening the library…</p>
      </div>
    );
  }

  const shelved = mode === "right" || mode === "reveal";

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      <div aria-hidden className={`${styles.shelves} pointer-events-none absolute inset-x-0 bottom-0 h-[18%]`} />

      {learnerName && (
        <div className={`${styles.badge} fixed left-3 top-3 z-10 flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-xl font-extrabold short:py-1 short:text-base`}>
          <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={`${styles.avatar} size-11 text-xl short:size-8 short:text-base`} />
          <span className="max-w-48 truncate capitalize leading-none">{learnerName}</span>
        </div>
      )}
      {!complete && (
        <div className={`${styles.badge} fixed right-3 top-3 z-10 flex max-w-[60vw] flex-wrap items-center justify-end gap-0.5 rounded-[22px] px-3 py-1.5`} aria-label={`Score: ${score} of ${total}`}>
          {rounds.map((r, i) => (
            <Image
              key={r.key}
              src={results[i] ? ASSETS.starFilled : ASSETS.starEmpty}
              alt=""
              width={128}
              height={128}
              loading="eager"
              className={cn("size-[clamp(18px,3.2vh,26px)] object-contain transition-transform", i === roundIndex && "scale-125")}
            />
          ))}
        </div>
      )}

      <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(26px,5.5vh,46px)] font-extrabold leading-tight`}>{title}</h1>

      {complete ? (
        <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center">
          <div className="flex items-center gap-3">
            <div className={`${styles.resultPlaque} rounded-2xl px-[clamp(14px,3vw,30px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You traced {score} of {total} letters correctly!
          </p>
          {/* The shelf of finished books, the missed ones left plain. */}
          <div className={`${styles.shelf} flex max-w-[92vw] flex-wrap items-end justify-center gap-[clamp(3px,0.8vw,8px)] rounded-md px-3 pt-2`} aria-label={`${score} of ${total} letters`}>
            {rounds.map((r, i) => (
              <span key={r.key} className={cn(styles.tile, !results[i] && styles.tileMissed, "flex h-[clamp(56px,11vh,96px)] w-[clamp(34px,6.5vh,56px)] items-center justify-center rounded-t-md text-[clamp(22px,4.6vh,38px)] font-extrabold leading-none")}>
                {r.letter}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.letter))}
              disabled={mode !== "trace"}
              aria-label="Hear the instruction again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(8px,2vmin,28px)] py-2 landscape:flex-row">
            {/* The storybook page fills whatever room is left, sized from its box so it never spills. */}
            <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center self-stretch [container-type:size]">
              <div
                className={cn(
                  styles.page,
                  "relative size-[min(100cqw,100cqh)] rounded-[16px]",
                  mode === "wrong" && styles.pageWrong,
                  (mode === "demo" || mode === "reveal") && styles.pageModel,
                  mode === "reveal" && styles.pageZoom,
                  mode === "right" && styles.pageRight,
                )}
              >
                <LetterTracePad
                  key={round.key}
                  viewW={VIEW}
                  viewH={VIEW}
                  strokes={LETTERS[round.letter].strokes}
                  under={<PageLines small={LETTERS[round.letter].small} />}
                  guideColor="#7048e8"
                  inkColor="#0b7285"
                  inkWidth={17}
                  disabled={mode !== "trace"}
                  demo={mode === "watch" || mode === "demo" || mode === "reveal"}
                  demoColor={mode === "watch" ? "#ff7a1a" : "#22b35e"}
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

            {/* The bookshelf: each traced letter becomes a new book that slides onto the shelf. */}
            <div className={`${styles.shelf} flex shrink-0 items-end justify-center gap-2 rounded-md px-[clamp(10px,3vmin,24px)] pt-[clamp(10px,3vmin,24px)]`}>
              <span aria-hidden className={`${styles.bookend} block h-[clamp(70px,18vmin,150px)] w-[clamp(18px,4vmin,34px)] rounded-t-md`} />
              <span
                key={round.key}
                aria-hidden
                className={cn(styles.tile, styles.tileBig, shelved ? styles.tileShown : styles.tileBlank, "flex h-[clamp(100px,26vmin,220px)] w-[clamp(64px,16vmin,136px)] items-center justify-center rounded-t-lg text-[clamp(44px,12vmin,104px)] font-extrabold leading-none")}
              >
                {round.letter}
              </span>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
