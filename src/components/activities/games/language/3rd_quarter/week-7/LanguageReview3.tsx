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
  BALLOON_COLORS,
  LETTER_SOUNDS,
  LOADING,
  REVEAL,
  SOUNDS,
  TASKS,
  WORDS,
  correctSpeech,
  instruction,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type Task,
} from "./LanguageReview3.data";
import styles from "./LanguageReview3.module.css";

interface Round {
  key: string;
  task: Task;
  target: string;
  choices: string[];
  answer: string;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

// How long the wrong balloon wobbles on its own before the right one lights up.
const WRONG_MS = 600;

const isSyllable = (c: unknown): c is string => typeof c === "string" && c in SOUNDS;
const isSequence = (c: unknown): c is string => typeof c === "string" && c.split("-").length === 2 && c.split("-").every(isSyllable);
const isWord = (c: unknown): c is string => typeof c === "string" && c in WORDS;
const isLetter = (c: unknown): c is string => typeof c === "string" && c in LETTER_SOUNDS;

function buildRound(row: QuestionRow): Round {
  const { task, target, choices } = (row.questionData ?? {}) as { task?: unknown; target?: unknown; choices?: unknown };
  const answer = row.correctAnswer.answer;
  const bad = (why: string) => new Error(`Question ${row.questionKey}: ${why}`);
  if (!TASKS.includes(task as Task)) throw bad(`unknown "task"`);
  if (!Array.isArray(choices) || choices.length < 2 || new Set(choices).size !== choices.length || !choices.includes(answer)) throw bad(`needs different "choices" that include its answer`);
  const t = task as Task;
  if (t === "syllable" || t === "sequence") {
    const ok = t === "syllable" ? isSyllable : isSequence;
    if (!ok(target) || !choices.every(ok) || answer !== target) throw bad(`needs a taught ${t} "target" that is its answer, with ${t} choices`);
  } else if (t === "first-sound" || t === "last-sound") {
    const side = t === "first-sound" ? "first" : "last";
    if (!isWord(target) || !choices.every(isWord) || choices.includes(target)) throw bad(`needs a known word "target" and other known picture choices`);
    // Exactly one picture may share the sound, so the answer is never ambiguous.
    const sharing = choices.filter((c) => WORDS[c][side] === WORDS[target][side]);
    if (sharing.length !== 1 || sharing[0] !== answer) throw bad(`only its answer may share the ${side} sound of ${target}`);
  } else {
    if (!isWord(target) || !choices.every(isLetter)) throw bad(`needs a known word "target" and known letter choices`);
    if (answer !== (t === "first-letter" ? target[0] : target.at(-1))) throw bad(`answer must be the ${t === "first-letter" ? "first" : "last"} letter of ${target}`);
  }
  return { key: row.questionKey, task: t, target: target as string, choices, answer };
}

function Balloon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 170" className="absolute inset-0 size-full overflow-visible" aria-hidden>
      <path d="M44 118 L50 142 M76 118 L70 142" stroke="#5c3d1e" strokeWidth="3" />
      <path d="M60 4 C 112 4, 120 60, 92 98 C 80 114, 70 118, 60 120 C 50 118, 40 114, 28 98 C 0 60, 8 4, 60 4 Z" fill={color} stroke="#343a40" strokeWidth="4" />
      <path d="M60 4 C 40 30, 40 90, 60 120 C 80 90, 80 30, 60 4 Z" fill="white" fillOpacity="0.28" />
      <rect x="44" y="140" width="32" height="24" rx="4" fill="#c98e55" stroke="#5c3d1e" strokeWidth="3" />
      <path d="M44 150 H76" stroke="#5c3d1e" strokeWidth="2" />
    </svg>
  );
}

// What a choice shows: written syllables, a picture, or a letter.
function ChoiceFace({ task, value }: { task: Task; value: string }) {
  if (task === "first-sound" || task === "last-sound") return <span className={styles.facePicture}>{WORDS[value].emoji}</span>;
  if (task === "sequence") return <span className={styles.faceText}>{value.replace("-", " · ")}</span>;
  return <span className={styles.faceText}>{value}</span>;
}

const choiceName = (task: Task, value: string) =>
  task === "first-sound" || task === "last-sound" ? WORDS[value].name : task === "sequence" ? value.replace("-", " then ") : value;

export default function LanguageReview3({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Language Review 3 questions:", err);
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
  // A ref, not only state, so two taps landing in the same tick can't both answer.
  const lockedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const round = rounds?.[roundIndex];
  const title = activityName || "Language Review";
  const score = results.filter(Boolean).length;

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
    const prompt = promptSpeech(round.task, round.target, round.choices);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["language review 3"], prompt]);
      return;
    }
    speak(prompt);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
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
      speak(correctSpeech(round.task, round.target, round.answer), advance);
      return;
    }
    setWrong(i);
    const { task, target, answer } = round;
    timerRef.current = window.setTimeout(() => {
      setReveal(true);
      speak(revealSpeech(task, target, answer), advance, { minMs: REVEAL_MIN_MS });
    }, WRONG_MS);
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

  const heard = round.task === "syllable" || round.task === "sequence";
  const letterTask = round.task === "first-letter" || round.task === "last-letter";

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      <div aria-hidden className={`${styles.sun} pointer-events-none absolute right-[8%] top-[18%] size-[clamp(50px,10vh,90px)] rounded-full`} />
      <div aria-hidden className={`${styles.field} pointer-events-none absolute inset-x-0 bottom-0 h-[16%]`} />

      {learnerName && (
        <div className={`${styles.badge} fixed left-3 top-3 z-10 flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-xl font-extrabold short:py-1 short:text-base`}>
          <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={`${styles.avatar} size-11 text-xl short:size-8 short:text-base`} />
          <span className="max-w-48 truncate capitalize leading-none">{learnerName}</span>
        </div>
      )}
      {phase !== "complete" && (
        <div className={`${styles.badge} fixed right-3 top-3 z-10 flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center justify-end gap-0.5 rounded-3xl px-2.5 py-1.5 sm:max-w-none`} aria-label={`Score: ${score} of ${total}`}>
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
            You launched {score} of {total} balloons!
          </p>
          <div className="flex max-w-[92vw] flex-wrap items-center justify-center gap-[clamp(4px,1.2vw,12px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(30px,6.5vh,60px)] object-contain drop-shadow-[0_4px_3px_rgba(24,100,171,0.35)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(15px,2.6vh,24px)] font-extrabold leading-tight`}>{instruction(round.task)}</p>
            <button
              type="button"
              onClick={() => speak(promptSpeech(round.task, round.target, round.choices))}
              disabled={locked}
              aria-label="Hear the question again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          {/* A cloud carries the question; three balloons wait on the field and the right one lifts off. */}
          <main key={round.key} className="relative z-[1] flex min-h-0 w-full max-w-3xl flex-1 flex-col items-center justify-evenly py-1">
            <div
              className={`${styles.cloud} relative flex shrink-0 items-center justify-center gap-3 rounded-full`}
              aria-label={heard ? "Listen to the sound" : `The picture is a ${WORDS[round.target].name}`}
            >
              <span className={`${styles.cloudFace} leading-none`}>{heard ? "👂" : WORDS[round.target].emoji}</span>
              {letterTask && (
                <span className={`${styles.cloudTag} rounded-full px-3 py-0.5 font-extrabold uppercase`}>{round.task === "first-letter" ? "first" : "last"}</span>
              )}
            </div>

            <div className="relative flex w-full items-end justify-center gap-[clamp(8px,3vw,32px)]">
              {reveal && <p className={`${styles.revealNote} absolute -top-12 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              {round.choices.map((choice, i) => {
                const isAnswer = choice === round.answer;
                return (
                  <button
                    key={`${round.key}-${i}`}
                    type="button"
                    onClick={() => pick(i)}
                    disabled={locked}
                    aria-label={choiceName(round.task, choice)}
                    style={{ "--bob-delay": `${i * -0.8}s` } as React.CSSProperties}
                    className={cn(
                      styles.balloon,
                      "relative flex shrink-0 justify-center disabled:cursor-default",
                      picked === i && styles.balloonUp,
                      wrong === i && styles.balloonWrong,
                      reveal && isAnswer && styles.balloonReveal,
                      reveal && !isAnswer && wrong !== i && "opacity-50",
                    )}
                  >
                    <Balloon color={BALLOON_COLORS[i % BALLOON_COLORS.length]} />
                    <span className={`${styles.face} pointer-events-none absolute flex items-center justify-center rounded-full font-extrabold leading-none`}>
                      <ChoiceFace task={round.task} value={choice} />
                    </span>
                    {wrong === i && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 top-0 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
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
