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
  REVEAL,
  ROCKET_COLORS,
  WORDS,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./RhymeMatch.data";
import styles from "./RhymeMatch.module.css";

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

// How long the wrong rocket sputters on its own before the right one lights up.
const WRONG_MS = 600;
// A press that moves less than this is a tap on the rocket, not a drag.
const TAP_SLOP_PX = 8;

const isWord = (c: unknown): c is string => typeof c === "string" && Object.hasOwn(WORDS, c);

function buildRound(row: QuestionRow): Round {
  const { word, choices } = (row.questionData ?? {}) as { word?: unknown; choices?: unknown };
  const answer = row.correctAnswer.answer;
  if (!isWord(word)) throw new Error(`Question ${row.questionKey} needs a known "word"`);
  if (!Array.isArray(choices) || choices.length < 2 || !choices.every(isWord) || new Set(choices).size !== choices.length || !choices.includes(answer) || choices.includes(word)) {
    throw new Error(`Question ${row.questionKey} needs different known "choices" that include its answer and not the word itself`);
  }
  // Exactly one rocket may rhyme with the word, so a rhyming pick is never graded wrong.
  if (choices.filter((c) => WORDS[c].rime === WORDS[word].rime).join() !== answer) throw new Error(`Question ${row.questionKey} needs only its answer to rhyme with ${word}`);
  return { key: row.questionKey, word, choices, answer };
}

// A little rocket with a round window that shows its picture.
function Rocket({ color, emoji }: { color: string; emoji: string }) {
  return (
    <>
      <svg viewBox="0 0 80 120" className="absolute inset-0 size-full overflow-visible" aria-hidden>
        <path d="M18 78 L4 104 L22 96 Z M62 78 L76 104 L58 96 Z" fill="#4c6ef5" stroke="#1c1f4a" strokeWidth="3" strokeLinejoin="round" />
        <path d="M40 4 C64 22 66 60 60 96 H20 C14 60 16 22 40 4 Z" fill={color} stroke="#1c1f4a" strokeWidth="4" strokeLinejoin="round" />
        <circle cx="40" cy="50" r="19" fill="#e7f5ff" stroke="#1c1f4a" strokeWidth="4" />
      </svg>
      <span className={`${styles.windowPicture} pointer-events-none absolute left-1/2 top-[41.7%] -translate-x-1/2 -translate-y-1/2 leading-none`}>{emoji}</span>
    </>
  );
}

export default function RhymeMatch({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Rhyme Match questions:", err);
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
  const [overDock, setOverDock] = useState(false);
  const dragStartRef = useRef<{ i: number; x: number; y: number } | null>(null);
  // Set once a press travels past the tap slop, so the click that follows a drag is ignored.
  const movedRef = useRef(false);
  const dockRef = useRef<HTMLDivElement | null>(null);

  const round = rounds?.[roundIndex];
  const title = activityName || "Rhyme Match";
  const score = results.filter(Boolean).length;
  // Which rocket sits on the landing pad: the one flown there, or the right one once it is shown.
  const dockedIndex = round ? (picked ?? (reveal ? round.choices.indexOf(round.answer) : null)) : null;

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
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["rhyme match"], prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    // A drop disables the rockets before their click can reset this, so clear it here for the next round.
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
      speak(correctSpeech(round.word, round.answer, roundIndex), advance);
      return;
    }
    stop();
    setWrong(i);
    const { word, answer } = round;
    timerRef.current = window.setTimeout(() => {
      setReveal(true);
      speak(revealSpeech(word, answer), advance, { minMs: REVEAL_MIN_MS });
    }, WRONG_MS);
  };

  const inDock = (x: number, y: number) => {
    const r = dockRef.current?.getBoundingClientRect();
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
    setOverDock(inDock(e.clientX, e.clientY));
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const start = dragStartRef.current;
    if (!start) return;
    dragStartRef.current = null;
    setDrag(null);
    setOverDock(false);
    if (movedRef.current && inDock(e.clientX, e.clientY)) pick(start.i);
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
      <div aria-hidden className={`${styles.space} pointer-events-none absolute inset-0`} />

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
            You matched {score} of {total} rhymes!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_0_10px_rgba(255,255,255,0.45)]" />
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

          {/* The planet shows the heard word; the rocket whose picture rhymes lands on its pad. */}
          <main key={round.key} className="relative z-[1] flex min-h-0 w-full max-w-4xl flex-1 flex-col items-center justify-evenly py-2">
            <div className="relative flex shrink-0 items-center gap-[clamp(10px,3vw,30px)]">
              <div className={`${styles.planet} relative flex items-center justify-center rounded-full`} aria-label={`The planet shows ${WORDS[round.word].name}`} role="img">
                <span aria-hidden className={`${styles.ring} pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[50%]`} />
                <span className={`${styles.planetPicture} pointer-events-none relative leading-none`}>{WORDS[round.word].emoji}</span>
              </div>
              <div
                ref={dockRef}
                className={cn(styles.dock, "relative flex items-end justify-center rounded-2xl", overDock && styles.dockHover, reveal && styles.dockReveal)}
                aria-label={dockedIndex !== null ? `Landed: ${WORDS[round.choices[dockedIndex]].name}` : "An empty landing pad"}
                role="img"
              >
                {dockedIndex !== null && (
                  <div className={cn(styles.rocket, "relative", picked !== null && styles.rocketLanded)}>
                    <Rocket color={ROCKET_COLORS[dockedIndex % ROCKET_COLORS.length]} emoji={WORDS[round.choices[dockedIndex]].emoji} />
                  </div>
                )}
                <span aria-hidden className={`${styles.pad} absolute inset-x-[10%] bottom-0 h-2 rounded-full`} />
              </div>
            </div>

            <div className="relative flex w-full shrink-0 items-end justify-center gap-[clamp(14px,6vw,60px)]">
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
                      styles.rocket,
                      styles.rocketButton,
                      "relative shrink-0 disabled:cursor-default",
                      dragging && styles.rocketDragging,
                      dockedIndex === i && "invisible",
                      wrong === i && styles.rocketWrong,
                      reveal && !isAnswer && wrong !== i && "opacity-50",
                    )}
                  >
                    <Rocket color={ROCKET_COLORS[i % ROCKET_COLORS.length]} emoji={WORDS[choice].emoji} />
                    {wrong === i && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-3 top-0 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
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
