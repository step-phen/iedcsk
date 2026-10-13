"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, MotionConfig, type PanInfo } from "framer-motion";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, REVEAL_MIN_MS } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import {
  ASSETS,
  INSTRUCTION,
  LETTERS,
  NEXT,
  PIECES,
  REVEAL_TEXT,
  WORDS,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./FirstLetterMatch.data";
import styles from "./FirstLetterMatch.module.css";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

interface Round {
  key: string;
  word: string;
  /** Letter pieces, left to right. */
  letters: string[];
  answer: string;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Stage = "naming" | "choosing" | "feedback";

function buildRound(row: QuestionRow): Round {
  const { word, letters } = row.questionData as { word: unknown; letters: unknown };
  if (typeof word !== "string" || !Object.hasOwn(WORDS, word)) throw new Error(`Question ${row.questionKey} needs a known "word"`);
  if (!Array.isArray(letters) || letters.length !== 3 || !letters.every((l) => typeof l === "string" && LETTERS.includes(l)) || new Set(letters).size !== 3) {
    throw new Error(`Question ${row.questionKey} needs three different taught "letters"`);
  }
  const answer = row.correctAnswer.answer;
  if (answer !== WORDS[word].letter || !letters.includes(answer)) {
    throw new Error(`Question ${row.questionKey} needs its picture's first letter as the answer, among the letters`);
  }
  return { key: row.questionKey, word, letters: letters as string[], answer };
}

// The letter piece under the pointer, found through its data-letter attribute.
function letterAt(point: { x: number; y: number }): string | null {
  for (const el of document.elementsFromPoint(point.x - window.scrollX, point.y - window.scrollY)) {
    const piece = el.closest<HTMLElement>("[data-letter]");
    if (piece) return piece.dataset.letter ?? null;
  }
  return null;
}

export default function FirstLetterMatch({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load First Letter Match questions:", err);
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
  const [stage, setStage] = useState<Stage>("naming");
  const [hover, setHover] = useState<string | null>(null);
  const [wrong, setWrong] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  // The letter the picture piece has snapped onto, always the right one.
  const [placed, setPlaced] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "First Letter Match";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  const ask = useCallback(
    (r: Round) => {
      setStage("naming");
      speak(promptSpeech(r.word), () => setStage("choosing"));
    },
    [speak],
  );

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["first letter match"]], () => ask(round));
      return;
    }
    speak(NEXT, () => ask(round));
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setWrong(null);
    setReveal(null);
    setPlaced(null);
    setStage("naming");
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  // A ref, not only state, so a drop and a tap landing in the same tick can't both answer.
  const answeredRef = useRef<string | null>(null);
  const answer = useCallback(
    (letter: string) => {
      if (stage !== "choosing" || !round || answeredRef.current === round.key) return;
      answeredRef.current = round.key;
      setStage("feedback");
      setHover(null);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: letter }];
      const earned = letter === round.answer;
      setResults((r) => [...r, earned]);
      setPlaced(round.answer);
      if (earned) {
        speak(correctSpeech(round.word, roundIndex), advance);
        return;
      }
      setWrong(letter);
      setReveal(round.answer);
      speak(revealSpeech(round.word), advance, { minMs: REVEAL_MIN_MS });
    },
    [stage, round, roundIndex, speak, advance],
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

  const rootRef = useRef<HTMLDivElement>(null);

  const backdrop = (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={`${styles.tableTop} absolute inset-x-[3%] bottom-[3%] top-[30%] rounded-[28px]`} />
      <span className={`${styles.loosePiece} absolute left-[4%] top-[18%] size-12 rotate-12`} />
      <span className={`${styles.loosePiece} ${styles.loosePieceAlt} absolute right-[5%] top-[22%] size-10 -rotate-12`} />
    </div>
  );

  if (loadError) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 text-center font-baloo2`}>
        <p className={`${styles.pill} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!rounds || !round) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 font-baloo2`}>
        {backdrop}
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Opening the puzzle box…</p>
      </div>
    );
  }

  const picturePiece = (
    <span className="pointer-events-none flex flex-col items-center gap-0.5">
      <span aria-hidden className="text-[clamp(40px,9vh,84px)] leading-none">{WORDS[round.word].emoji}</span>
      <span className="text-[clamp(13px,2.4vh,20px)] font-extrabold leading-none">{WORDS[round.word].name}</span>
    </span>
  );

  return (
    <MotionConfig reducedMotion="user">
      <div ref={rootRef} className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
        {backdrop}

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

        <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(26px,5.5vh,46px)] font-extrabold leading-tight`}>{title}</h1>

        {phase === "complete" ? (
          <div className={`${styles.result} relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center`}>
            <div className="flex items-center gap-3">
              <div className={`${styles.sign} rounded-2xl px-[clamp(26px,5vw,52px)] py-[clamp(8px,1.6vh,14px)] text-[clamp(20px,3.8vh,34px)] font-extrabold`}>{resultHeadline(score, total)}</div>
              <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
                <Volume2 size={18} strokeWidth={2.6} />
              </button>
            </div>
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
              You matched {score} of {total} pictures!
            </p>
            <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
              {results.map((earned, i) => (
                <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(46,42,74,0.3)]" />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
              <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
              <button
                type="button"
                onClick={() => ask(round)}
                disabled={stage !== "choosing"}
                aria-label="Hear the picture name again"
                className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
              >
                <Volume2 size={18} strokeWidth={2.6} />
              </button>
            </div>

            <main className="relative z-[2] flex min-h-0 w-full flex-1 flex-col items-center justify-evenly">
              <div className="flex h-[clamp(100px,22vh,190px)] items-center justify-center">
                {!placed && (
                  <motion.button
                    key={round.key}
                    type="button"
                    layoutId={`piece-${round.key}`}
                    aria-label={`${WORDS[round.word].name}. Drag it to a letter, or tap a letter.`}
                    drag={stage === "choosing"}
                    dragConstraints={rootRef}
                    dragElastic={0}
                    dragMomentum={false}
                    dragSnapToOrigin
                    whileDrag={{ scale: 1.08, zIndex: 50 }}
                    onDrag={(_: unknown, info: PanInfo) => setHover(letterAt(info.point))}
                    onDragEnd={(_: unknown, info: PanInfo) => {
                      setHover(null);
                      const l = letterAt(info.point);
                      if (l) answer(l);
                    }}
                    initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ duration: 0.45, ease: EASE_OUT }}
                    className={cn(styles.picture, "relative z-[5] flex aspect-square w-[clamp(92px,min(28vw,19vh),170px)] touch-none items-center justify-center rounded-2xl", stage === "naming" && styles.pictureNaming)}
                  >
                    {picturePiece}
                  </motion.button>
                )}
              </div>

              <div className="flex w-[min(96vw,680px)] items-end justify-around">
                {round.letters.map((letter, i) => (
                  <div key={`${round.key}-${letter}`} className="relative flex w-[clamp(88px,min(29vw,20vh),170px)] flex-col items-center">
                    {/* The landing spot right above the letter piece, where the picture snaps to make one puzzle. */}
                    <div className="flex aspect-square w-full items-end justify-center">
                      {placed === letter && (
                        <motion.div layoutId={`piece-${round.key}`} transition={{ duration: 0.5, ease: EASE_OUT }} className={cn(styles.picture, styles.pictureSnapped, "flex aspect-square w-full items-center justify-center rounded-2xl rounded-b-none")}>
                          {picturePiece}
                        </motion.div>
                      )}
                    </div>
                    <button
                      type="button"
                      data-letter={letter}
                      onClick={() => answer(letter)}
                      disabled={stage !== "choosing"}
                      aria-label={`Letter ${letter}`}
                      className={cn(
                        styles.letterPiece,
                        "relative flex aspect-[5/4] w-full items-center justify-center rounded-2xl",
                        placed === letter && "rounded-t-none",
                        hover === letter && styles.letterHover,
                        placed === letter && !reveal && styles.letterWon,
                        wrong === letter && styles.letterWrong,
                        reveal === letter && styles.letterReveal,
                      )}
                      style={{ "--piece": PIECES[i % PIECES.length] } as React.CSSProperties}
                    >
                      {placed !== letter && <span aria-hidden className={`${styles.notch} absolute -top-[1px] left-1/2 h-[22%] w-[30%] -translate-x-1/2 rounded-b-full`} />}
                      <span className="flex items-baseline font-extrabold leading-none">
                        <span className="text-[clamp(32px,6.6vh,60px)]">{letter}</span>
                        <span className="text-[clamp(24px,5vh,46px)]">{letter.toLowerCase()}</span>
                      </span>
                    </button>
                    {wrong === letter && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 bottom-[60%] z-[6] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                    {reveal === letter && (
                      <span className={`${styles.revealTag} absolute -bottom-8 left-1/2 z-[6] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[clamp(12px,2vh,17px)] font-extrabold`}>{REVEAL_TEXT}</span>
                    )}
                  </div>
                ))}
              </div>
            </main>
          </>
        )}
      </div>
    </MotionConfig>
  );
}
