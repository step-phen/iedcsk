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
  EVENTS,
  INSTRUCTION,
  LOADING,
  REVEAL,
  STORY_TITLE,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  storySpeech,
} from "./MyStoryMatch.data";
import styles from "./MyStoryMatch.module.css";

interface Round {
  key: string;
  event: string;
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

// How long the wrong painting shakes on its own before the right one lights up.
const WRONG_MS = 600;

const isEvent = (c: unknown): c is string => typeof c === "string" && Object.hasOwn(EVENTS, c);

function buildRound(row: QuestionRow): Round {
  const { event, choices } = (row.questionData ?? {}) as { event?: unknown; choices?: unknown };
  if (!isEvent(event) || row.correctAnswer.answer !== event) {
    throw new Error(`Question ${row.questionKey} needs a known "event" that is its answer`);
  }
  if (!Array.isArray(choices) || choices.length < 2 || !choices.every(isEvent) || new Set(choices).size !== choices.length || !choices.includes(event)) {
    throw new Error(`Question ${row.questionKey} needs different known "choices" that include its answer`);
  }
  return { key: row.questionKey, event, choices };
}

export default function MyStoryMatch({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load My Story Match questions:", err);
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
  // True while the plaque's sentence is being read aloud.
  const [reading, setReading] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);
  // A ref, not only state, so two taps landing in the same tick can't both answer.
  const lockedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const round = rounds?.[roundIndex];
  const title = activityName || "My Story Match";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  const readSentence = useCallback(
    (r: Round) => speak(promptSpeech(r.event), () => setReading(false), { onStart: () => setReading(true) }),
    [speak],
  );

  // The whole story is told once before the first sentence; the book button tells it again.
  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["my story match"], ...storySpeech()], () => readSentence(round));
      return;
    }
    readSentence(round);
    // speak/speakAll/readSentence are stable; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const hearStory = () => {
    if (!round || lockedRef.current) return;
    setReading(false);
    speakAll(storySpeech(), () => readSentence(round));
  };

  const advance = useCallback(() => {
    setPicked(null);
    setWrong(null);
    setReveal(false);
    setReading(false);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
    lockedRef.current = false;
    setLocked(false);
  }, [roundIndex, total]);

  const pick = (i: number) => {
    if (!round || lockedRef.current) return;
    lockedRef.current = true;
    setLocked(true);
    setReading(false);
    const choice = round.choices[i];
    const earned = choice === round.event;
    answersRef.current = [...answersRef.current, { questionId: round.key, response: choice }];
    setResults((r) => [...r, earned]);
    if (earned) {
      setPicked(i);
      speak(correctSpeech(round.event, roundIndex), advance);
      return;
    }
    stop();
    setWrong(i);
    const { event } = round;
    timerRef.current = window.setTimeout(() => {
      setReveal(true);
      speak(revealSpeech(event), advance, { minMs: REVEAL_MIN_MS });
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

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      <div aria-hidden className={`${styles.gallery} pointer-events-none absolute inset-0`} />

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
          <span aria-hidden className="text-[clamp(44px,10vh,90px)] leading-none">🖼️</span>
          <div className="flex items-center gap-3">
            <div className={`${styles.headline} rounded-2xl px-[clamp(14px,3vw,30px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You matched {score} of {total} right!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(69,26,3,0.35)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(15px,2.6vh,24px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={hearStory}
              disabled={locked}
              aria-label="Hear the story again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <BookOpen size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main key={round.key} className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-evenly gap-[clamp(8px,2vh,18px)] py-2">
            {/* The sentence to match sits on a brass plaque under the story's name. */}
            <div className={cn(styles.plaque, "flex max-w-full shrink-0 items-center gap-3 rounded-xl px-4 py-[clamp(4px,1vh,10px)]", reading && styles.plaqueLit)}>
              <div className="min-w-0 text-center">
                <p className={`${styles.storyName} m-0 text-[clamp(11px,1.8vh,15px)] font-extrabold uppercase tracking-widest`}>{STORY_TITLE}</p>
                <p className="m-0 text-[clamp(17px,3.2vh,30px)] font-extrabold leading-tight">{EVENTS[round.event].sentence}</p>
              </div>
              <button
                type="button"
                onClick={() => readSentence(round)}
                disabled={locked}
                aria-label="Hear the sentence again"
                className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
              >
                <Volume2 size={18} strokeWidth={2.6} />
              </button>
            </div>

            <div className="relative grid w-full max-w-[min(48rem,calc((100dvh-16rem)*3.1))] grid-cols-3 gap-[clamp(8px,2.4vw,24px)] short:max-w-[min(48rem,calc((100dvh-11rem)*3.1))]">
              {reveal && <p className={`${styles.revealNote} absolute -top-11 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              {round.choices.map((choice, i) => {
                const isAnswer = choice === round.event;
                const ev = EVENTS[choice];
                return (
                  <button
                    key={`${round.key}-${choice}`}
                    type="button"
                    onClick={() => pick(i)}
                    disabled={locked}
                    aria-label={`Painting ${i + 1}`}
                    className={cn(
                      styles.frame,
                      "relative rounded-md p-[clamp(5px,1.2vw,12px)]",
                      wrong === i && styles.frameWrong,
                      picked === i && styles.frameRight,
                      reveal && isAnswer && styles.frameReveal,
                      reveal && !isAnswer && wrong !== i && "opacity-50",
                    )}
                  >
                    <span className={`${styles.canvas} relative block aspect-square w-full overflow-hidden`} style={{ background: ev.backdrop }}>
                      {ev.parts.map((part, j) => (
                        <span
                          key={j}
                          aria-hidden
                          className="absolute -translate-x-1/2 -translate-y-1/2 leading-none"
                          style={{ left: `${part.x}%`, top: `${part.y}%`, fontSize: `${part.size * 100}cqw` }}
                        >
                          {part.emoji}
                        </span>
                      ))}
                    </span>
                    {(picked === i || (reveal && isAnswer)) && (
                      <span aria-hidden className={`${styles.sticker} absolute -right-3 -top-3 flex size-[clamp(30px,6vh,46px)] items-center justify-center rounded-full text-[clamp(16px,3.4vh,26px)] leading-none`}>
                        ⭐
                      </span>
                    )}
                    {wrong === i && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -left-2 -top-3 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
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
