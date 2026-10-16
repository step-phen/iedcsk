"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, REVEAL_MIN_MS } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import {
  ASSETS,
  INSTRUCTION,
  LOADING,
  PIECE_COLORS,
  REVEAL,
  WORDS,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./EndingSoundPartners.data";
import styles from "./EndingSoundPartners.module.css";

interface Round {
  key: string;
  word: string;
  choices: string[];
  answer: string;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

// How long the wrong piece rattles on its own before the right one lights up.
const WRONG_MS = 600;
// A press that moves less than this is a tap on the piece, not a drag.
const TAP_SLOP_PX = 8;

const isWord = (c: unknown): c is string => typeof c === "string" && c in WORDS;

function buildRound(row: QuestionRow): Round {
  const { word, choices } = (row.questionData ?? {}) as { word?: unknown; choices?: unknown };
  const answer = row.correctAnswer.answer;
  if (!isWord(word)) throw new Error(`Question ${row.questionKey} needs a known "word"`);
  if (!Array.isArray(choices) || choices.length < 2 || !choices.every(isWord) || new Set(choices).size !== choices.length || !choices.includes(answer) || choices.includes(word)) {
    throw new Error(`Question ${row.questionKey} needs different known "choices" that include its answer and not the word itself`);
  }
  // Exactly one piece may end like the word, so a right-sounding match is never graded wrong.
  if (choices.filter((c) => WORDS[c].last === WORDS[word].last).join() !== answer) throw new Error(`Question ${row.questionKey} needs only its answer to end like ${word}`);
  return { key: row.questionKey, word, choices, answer };
}

// The fixed piece has a round socket on its right edge; partner pieces have the matching tab on their left.
function SocketPiece() {
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 size-full overflow-visible" aria-hidden>
      <path d="M4 4 H96 V34 A16 16 0 0 0 96 66 V96 H4 Z" fill="#4dabf7" stroke="#1d3557" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

function TabPiece({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <svg viewBox="0 0 116 100" className="absolute inset-0 size-full overflow-visible" aria-hidden>
      <path
        d="M20 4 H112 V96 H20 V66 A16 16 0 0 1 20 34 Z"
        fill={color}
        stroke="#1d3557"
        strokeWidth="4"
        strokeLinejoin="round"
        strokeDasharray={dashed ? "8 7" : undefined}
      />
    </svg>
  );
}

export default function EndingSoundPartners({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Ending Sound Partners questions:", err);
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
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);
  // A ref, not only state, so two drops landing in the same tick can't both answer.
  const lockedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const [drag, setDrag] = useState<{ i: number; x: number; y: number } | null>(null);
  const [overSlot, setOverSlot] = useState(false);
  const dragStartRef = useRef<{ i: number; x: number; y: number } | null>(null);
  // Set once a press travels past the tap slop, so the click that follows a drag is ignored.
  const movedRef = useRef(false);
  const slotRef = useRef<HTMLDivElement | null>(null);

  const round = rounds?.[roundIndex];
  const title = activityName || "Ending Sound Partners";
  const score = results.filter(Boolean).length;
  // Which choice sits in the socket: the one dropped there, or the right one once it is shown.
  const fittedIndex = round ? (picked ?? (reveal ? round.choices.indexOf(round.answer) : null)) : null;

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
    const prompt = promptSpeech(round.word, round.choices);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["ending sound partners"], prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    // A drop disables the pieces before their click can reset this, so clear it here for the next round.
    movedRef.current = false;
    setPicked(null);
    setWrong(null);
    setReveal(false);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
    lockedRef.current = false;
    setLocked(false);
  }, [roundIndex, total]);

  const pick = (i: number) => {
    if (!round || lockedRef.current) return;
    lockedRef.current = true;
    setLocked(true);
    const choice = round.choices[i];
    const earned = choice === round.answer;
    answersRef.current = [...answersRef.current, { questionId: round.key, response: choice }];
    setResults((r) => [...r, earned]);
    if (earned) {
      setPicked(i);
      speak(correctSpeech(round.word, round.answer), advance);
      return;
    }
    setWrong(i);
    const { word, answer } = round;
    timerRef.current = window.setTimeout(() => {
      setReveal(true);
      speak(revealSpeech(word, answer), advance, { minMs: REVEAL_MIN_MS });
    }, WRONG_MS);
  };

  const inSlot = (x: number, y: number) => {
    const r = slotRef.current?.getBoundingClientRect();
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };

  const onPointerDown = (i: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (lockedRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { i, x: e.clientX, y: e.clientY };
    movedRef.current = false;
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    const x = e.clientX - start.x;
    const y = e.clientY - start.y;
    if (!movedRef.current && Math.hypot(x, y) < TAP_SLOP_PX) return;
    movedRef.current = true;
    setDrag({ i: start.i, x, y });
    setOverSlot(inSlot(e.clientX, e.clientY));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    dragStartRef.current = null;
    setDrag(null);
    setOverSlot(false);
    if (movedRef.current && inSlot(e.clientX, e.clientY)) pick(start.i);
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>{LOADING}</p>
      </div>
    );
  }

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
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
            You matched {score} of {total} puzzle partners!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(29,53,87,0.35)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(15px,2.6vh,24px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.word, round.choices))}
              disabled={locked}
              aria-label="Hear the words again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          {/* The fixed piece shows the heard word; the partner that ends the same way snaps into its socket. */}
          <main key={round.key} className="relative z-[1] flex min-h-0 w-full max-w-4xl flex-1 flex-col items-center justify-evenly py-2">
            <div className={`${styles.board} relative flex shrink-0 items-center rounded-3xl`}>
              <div className={`${styles.socketPiece} relative flex items-center justify-center`} aria-label={`The puzzle shows ${WORDS[round.word].name}`}>
                <SocketPiece />
                <span className={`${styles.picture} pointer-events-none relative -ml-[8%] leading-none`}>{WORDS[round.word].emoji}</span>
              </div>
              <div
                ref={slotRef}
                className={cn(styles.slot, "relative flex items-center justify-center", overSlot && styles.slotHover, fittedIndex !== null && styles.slotFitted, reveal && styles.slotReveal)}
                aria-label={fittedIndex !== null ? `Its partner is ${WORDS[round.choices[fittedIndex]].name}` : "An empty space for its partner"}
              >
                <TabPiece color={fittedIndex !== null ? PIECE_COLORS[fittedIndex % PIECE_COLORS.length] : "rgba(255,255,255,0.5)"} dashed={fittedIndex === null} />
                <span className={`${styles.picture} pointer-events-none relative ml-[12%] leading-none`}>{fittedIndex !== null ? WORDS[round.choices[fittedIndex]].emoji : ""}</span>
              </div>
            </div>

            <div className="relative flex w-full shrink-0 items-center justify-center gap-[clamp(8px,3vw,32px)]">
              {reveal && <p className={`${styles.revealNote} absolute -top-12 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              {round.choices.map((choice, i) => {
                const isAnswer = choice === round.answer;
                const dragging = drag?.i === i;
                return (
                  <button
                    key={`${round.key}-${i}`}
                    type="button"
                    onClick={() => {
                      if (!movedRef.current) pick(i);
                      movedRef.current = false;
                    }}
                    onPointerDown={onPointerDown(i)}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    disabled={locked}
                    aria-label={WORDS[choice].name}
                    style={dragging ? { translate: `${drag.x}px ${drag.y}px` } : undefined}
                    className={cn(
                      styles.piece,
                      "relative flex shrink-0 items-center justify-center disabled:cursor-default",
                      dragging && styles.pieceDragging,
                      fittedIndex === i && "invisible",
                      wrong === i && styles.pieceWrong,
                      reveal && !isAnswer && wrong !== i && "opacity-50",
                    )}
                  >
                    <TabPiece color={PIECE_COLORS[i % PIECE_COLORS.length]} />
                    <span className={`${styles.picture} pointer-events-none relative ml-[12%] leading-none`}>{WORDS[choice].emoji}</span>
                    {wrong === i && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-1 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
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
