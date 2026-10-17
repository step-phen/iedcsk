"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { BookOpen, Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, REVEAL_MIN_MS } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import {
  ASSETS,
  INSTRUCTION,
  KINDS,
  LOADING,
  PICS,
  REVEAL,
  TASK_LABEL,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  storySpeech,
  type Kind,
} from "./LanguageFinalAssessment4.data";
import styles from "./LanguageFinalAssessment4.module.css";

interface Round {
  key: string;
  kind: Kind;
  prompt: string;
  story: string[] | null;
  choices: string[];
  answer: string;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

// How long the wrong snowball shakes on its own before the right one lights up.
const WRONG_MS = 600;

const isLine = (s: unknown): s is string => typeof s === "string" && s.trim() !== "";

function buildRound(row: QuestionRow): Round {
  const { type, prompt, story, choices } = (row.questionData ?? {}) as { type?: unknown; prompt?: unknown; story?: unknown; choices?: unknown };
  if (!KINDS.includes(type as Kind) || !isLine(prompt)) {
    throw new Error(`Question ${row.questionKey} needs a known "type" and a "prompt"`);
  }
  const kind = type as Kind;
  if (kind === "story" && (!Array.isArray(story) || story.length === 0 || !story.every(isLine))) {
    throw new Error(`Question ${row.questionKey} needs the "story" it asks about`);
  }
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every((c) => typeof c === "string" && Object.hasOwn(PICS, c)) || new Set(choices).size !== 3) {
    throw new Error(`Question ${row.questionKey} needs three different known "choices"`);
  }
  const answer = row.correctAnswer.answer;
  if (!choices.includes(answer)) {
    throw new Error(`Question ${row.questionKey} must have its answer among the choices`);
  }
  return { key: row.questionKey, kind, prompt, story: kind === "story" ? (story as string[]) : null, choices, answer };
}

export default function LanguageFinalAssessment4({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Language Final Assessment questions:", err);
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
  const title = activityName || "Language Final Assessment";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  const readRound = useCallback((r: Round) => speak(promptSpeech(r.kind, r.prompt, r.choices)), [speak]);

  // The story is told before the first story question; later ones only ask, and the book button tells it again.
  const toldRef = useRef<string | null>(null);
  const openRound = useCallback(
    (r: Round, lead: string[]) => {
      const story = r.story && toldRef.current !== r.story.join(" ") ? r.story : null;
      if (story) toldRef.current = story.join(" ");
      const lines = [...lead, ...(story ? storySpeech(story) : [])];
      if (lines.length === 0) readRound(r);
      else speakAll(lines, () => readRound(r));
    },
    [speakAll, readRound],
  );

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      openRound(round, [learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["language final assessment 4"]]);
      return;
    }
    openRound(round, []);
    // openRound is stable; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const hearStory = () => {
    if (!round?.story || lockedRef.current) return;
    speakAll(storySpeech(round.story), () => readRound(round));
  };

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
      speak(correctSpeech(round.answer, roundIndex), advance);
      return;
    }
    stop();
    setWrong(i);
    const { answer } = round;
    timerRef.current = window.setTimeout(() => {
      setReveal(true);
      speak(revealSpeech(answer), advance, { minMs: REVEAL_MIN_MS });
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
        <p className={`${styles.pill} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Couldn&apos;t load this activity. Please try again.</p>
      </div>
    );
  }

  if (!rounds || !round) {
    return (
      <div className={`${styles.screen} fixed inset-0 flex h-dvh w-full items-center justify-center px-6 font-baloo2`}>
        <p className={`${styles.pill} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>{LOADING}</p>
      </div>
    );
  }

  const label = TASK_LABEL[round.kind];

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      <div aria-hidden className={`${styles.mountains} pointer-events-none absolute inset-0`} />
      <div aria-hidden className={`${styles.snow} pointer-events-none absolute inset-0`} />

      {learnerName && (
        <div className={`${styles.badge} fixed left-3 top-3 z-10 flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-xl font-extrabold short:py-1 short:text-base`}>
          <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={`${styles.avatar} size-11 text-xl short:size-8 short:text-base`} />
          <span className="max-w-48 truncate capitalize leading-none">{learnerName}</span>
        </div>
      )}
      {/* Fifteen stars would crowd a phone, so the badge shows one star and the running score. */}
      {phase !== "complete" && (
        <div className={`${styles.badge} fixed right-3 top-3 z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xl font-extrabold`} aria-label={`Score: ${score} of ${total}`}>
          <Image src={ASSETS.starFilled} alt="" width={128} height={128} loading="eager" className="size-[clamp(22px,3.8vh,32px)] object-contain" />
          <span className="leading-none">{score}</span>
        </div>
      )}

      <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(24px,5vh,44px)] font-extrabold leading-tight`}>{title}</h1>

      {phase === "complete" ? (
        <div className="relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(10px,2.6vh,24px)] text-center">
          <span aria-hidden className={`${styles.summit} relative text-[clamp(48px,11vh,100px)] leading-none`}>
            🏔️<span className="absolute -top-[0.3em] left-1/2 text-[0.5em]">🚩</span>
          </span>
          <div className="flex items-center gap-3">
            <div className={`${styles.headline} rounded-2xl px-[clamp(14px,3vw,30px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You got {score} of {total} right!
          </p>
          <div className="flex max-w-xl flex-wrap items-center justify-center gap-[clamp(3px,1vw,8px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(26px,5.4vh,46px)] object-contain drop-shadow-[0_3px_3px_rgba(30,58,138,0.35)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(15px,2.6vh,24px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
          </div>

          <main key={round.key} className="relative z-[1] flex min-h-0 w-full max-w-4xl flex-1 flex-col items-center justify-evenly gap-[clamp(8px,2vh,18px)] py-2">
            {/* The task is carved into a block of ice. */}
            <div className={`${styles.ice} flex max-w-full shrink-0 items-center gap-3 rounded-2xl px-4 py-[clamp(6px,1.4vh,12px)]`}>
              <span className={`${styles.taskLabel} shrink-0 rounded-full px-2.5 py-0.5 text-[clamp(13px,2.2vh,18px)] font-extrabold`}>
                <span aria-hidden>{label.icon} </span>
                {label.text}
              </span>
              <p className="m-0 min-w-0 text-[clamp(17px,3vh,28px)] font-extrabold leading-tight">{round.prompt}</p>
              {round.story && (
                <button
                  type="button"
                  onClick={hearStory}
                  disabled={locked}
                  aria-label="Hear the story again"
                  className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
                >
                  <BookOpen size={18} strokeWidth={2.6} />
                </button>
              )}
              <button
                type="button"
                onClick={() => readRound(round)}
                disabled={locked}
                aria-label="Hear the task again"
                className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
              >
                <Volume2 size={18} strokeWidth={2.6} />
              </button>
            </div>

            <div className="relative grid w-full max-w-[min(40rem,calc((100dvh-16rem)*3))] grid-cols-3 gap-[clamp(10px,3vw,30px)] short:max-w-[min(40rem,calc((100dvh-9rem)*3))]">
              {reveal && <p className={`${styles.revealNote} absolute -top-11 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              {round.choices.map((choice, i) => {
                const isAnswer = choice === round.answer;
                const pic = PICS[choice];
                return (
                  <button
                    key={`${round.key}-${choice}`}
                    type="button"
                    onClick={() => pick(i)}
                    disabled={locked}
                    aria-label={pic.said}
                    className={cn(
                      styles.snowball,
                      "relative flex aspect-square w-full items-center justify-center rounded-full",
                      wrong === i && styles.snowballWrong,
                      picked === i && styles.snowballRight,
                      reveal && isAnswer && styles.snowballReveal,
                      reveal && !isAnswer && wrong !== i && "opacity-50",
                    )}
                  >
                    <span aria-hidden className={`${styles.pic} flex items-center justify-center leading-none`} style={{ fontSize: pic.count ? "30cqw" : "46cqw" }}>
                      {Array.from({ length: pic.count ?? 1 }, (_, n) => (
                        <span key={n} className={pic.small ? "text-[0.5em]" : undefined}>
                          {pic.emoji}
                        </span>
                      ))}
                    </span>
                    {picked === i && (
                      <span aria-hidden className={`${styles.flag} absolute -top-[18%] left-1/2 text-[clamp(22px,5vh,40px)] leading-none`}>
                        🚩
                      </span>
                    )}
                    {wrong === i && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -left-1 -top-1 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
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
