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
  CAR_COLORS,
  INSTRUCTION,
  KIND_SIGNS,
  LOADING,
  PICTURES,
  REVEAL,
  STORIES,
  type Kind,
  correctSpeech,
  promptLines,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./LanguageSkillsReview4.data";
import styles from "./LanguageSkillsReview4.module.css";

interface Round {
  key: string;
  kind: Kind;
  target?: string;
  word?: string;
  story?: string;
  // The cars to tap, in order: one for describe and rhyme, two or three for stories and directions.
  steps: string[];
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

// How long the wrong car shakes on its own before the right ones light up.
const WRONG_MS = 600;

const isPicture = (c: unknown): c is string => typeof c === "string" && Object.hasOwn(PICTURES, c);

function buildRound(row: QuestionRow): Round {
  const data = (row.questionData ?? {}) as { kind?: unknown; target?: unknown; word?: unknown; story?: unknown; steps?: unknown; choices?: unknown };
  const { kind, choices } = data;
  const bad = (why: string) => new Error(`Question ${row.questionKey} ${why}`);
  if (!Array.isArray(choices) || choices.length < 2 || !choices.every(isPicture) || new Set(choices).size !== choices.length) throw bad('needs different known picture "choices"');
  const answer = row.correctAnswer.answer;
  let steps: string[];
  const round = { key: row.questionKey, choices } as Omit<Round, "kind" | "steps">;
  switch (kind) {
    case "describe":
      if (!isPicture(data.target) || !PICTURES[data.target].clue || data.target !== answer) throw bad('needs a described picture "target" that is its answer');
      steps = [data.target];
      round.target = data.target;
      break;
    case "rhyme": {
      const rime = isPicture(data.word) ? PICTURES[data.word].rime : undefined;
      // Exactly one car may rhyme with the word, so a rhyming pick is never graded wrong.
      if (!rime || choices.includes(data.word as string) || choices.filter((c) => PICTURES[c].rime === rime).join() !== answer) throw bad('needs a "word" with exactly its answer rhyming among the choices');
      steps = [answer];
      round.word = data.word as string;
      break;
    }
    case "story":
      if (typeof data.story !== "string" || !Object.hasOwn(STORIES, data.story)) throw bad('needs a known "story"');
      steps = STORIES[data.story].map((s) => s.step);
      if (choices.length !== steps.length || !steps.every((s) => choices.includes(s))) throw bad(`needs "choices" holding each picture of ${data.story} once`);
      round.story = data.story;
      break;
    case "direction":
      if (!Array.isArray(data.steps) || data.steps.length < 1 || data.steps.length > 2 || new Set(data.steps).size !== data.steps.length || !data.steps.every((s) => choices.includes(s))) {
        throw bad('needs one or two different "steps" from its choices');
      }
      steps = data.steps as string[];
      break;
    default:
      throw bad('needs a "kind" of describe, rhyme, story or direction');
  }
  if (answer !== steps.join("-")) throw bad(`needs "${steps.join("-")}" as its answer`);
  return { ...round, kind, steps };
}

export default function LanguageSkillsReview4({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Language Skills Review 4 questions:", err);
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
  // Cars tapped so far this round, in order.
  const [taps, setTaps] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);
  // Refs, not only state, so two taps landing in the same tick can't both count.
  const lockedRef = useRef(false);
  const tapsRef = useRef<string[]>([]);
  const timerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
  }, []);

  const round = rounds?.[roundIndex];
  const title = activityName || "Language Skills Review 4";
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
    const lines = promptLines(round);
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["language skills review 4"], ...lines]);
      return;
    }
    speakAll(lines);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    tapsRef.current = [];
    setTaps([]);
    setSolved(false);
    setWrong(null);
    setReveal(false);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
    lockedRef.current = false;
    setLocked(false);
  }, [roundIndex, total]);

  // Each tap adds one car; the round ends on the first slip or once every step is tapped.
  const choose = (picture: string) => {
    if (!round || lockedRef.current) return;
    const next = [...tapsRef.current, picture];
    tapsRef.current = next;
    setTaps(next);
    const slipped = picture !== round.steps[next.length - 1];
    if (!slipped && next.length < round.steps.length) {
      stop();
      return;
    }
    lockedRef.current = true;
    setLocked(true);
    answersRef.current = [...answersRef.current, { questionId: round.key, response: next.join("-") }];
    setResults((r) => [...r, !slipped]);
    if (!slipped) {
      setSolved(true);
      speak(correctSpeech(round, roundIndex), advance);
      return;
    }
    stop();
    setWrong(picture);
    const shown = round;
    timerRef.current = window.setTimeout(() => {
      setReveal(true);
      speak(revealSpeech(shown), advance, { minMs: REVEAL_MIN_MS });
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

  const sign = KIND_SIGNS[round.kind];
  const ordered = round.steps.length > 1;

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full select-none flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      <div aria-hidden className={`${styles.hills} pointer-events-none absolute inset-x-0 bottom-0 h-[40%]`} />

      {learnerName && (
        <div className={`${styles.badge} fixed left-3 top-3 z-10 flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-xl font-extrabold short:py-1 short:text-base`}>
          <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={`${styles.avatar} size-11 text-xl short:size-8 short:text-base`} />
          <span className="max-w-48 truncate capitalize leading-none">{learnerName}</span>
        </div>
      )}
      {phase !== "complete" && (
        <div className={`${styles.badge} fixed right-3 top-3 z-10 flex max-w-[60vw] flex-wrap items-center justify-end gap-0.5 rounded-2xl px-2.5 py-1.5`} aria-label={`Score: ${score} of ${total}`}>
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
            You got {score} of {total} stations right!
          </p>
          <div className="flex max-w-[92vw] flex-wrap items-center justify-center gap-[clamp(4px,1.2vw,12px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(32px,6.5vh,60px)] object-contain drop-shadow-[0_4px_3px_rgba(0,0,0,0.35)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(15px,2.6vh,24px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speakAll(promptLines(round))}
              disabled={locked}
              aria-label="Hear it again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main key={round.key} className="relative z-[1] flex min-h-0 w-full max-w-5xl flex-1 flex-col items-center justify-evenly gap-[clamp(6px,2vh,18px)] py-2">
            {/* The station sign names the task; in a rhyme round it also shows the word to rhyme with. */}
            <div className="flex shrink-0 flex-col items-center">
              <div className={`${styles.sign} flex items-center gap-2 rounded-xl px-4 py-1.5`}>
                <span aria-hidden className="text-[clamp(22px,4vh,34px)] leading-none">{sign.emoji}</span>
                <span className="text-[clamp(17px,3.2vh,28px)] font-extrabold">{sign.label}</span>
                {round.word && (
                  <span role="img" aria-label={`Rhymes with ${PICTURES[round.word].name}`} className={`${styles.signPicture} ml-1 flex items-center justify-center rounded-lg text-[clamp(26px,5vh,44px)] leading-none`}>
                    {PICTURES[round.word].emoji}
                  </span>
                )}
              </div>
              <span aria-hidden className={`${styles.signPost}`} />
            </div>

            {/* The train: an engine pulling one car per picture along the track. */}
            <div className="relative flex w-full shrink-0 flex-col items-center">
              {reveal && <p className={`${styles.revealNote} absolute -top-12 left-1/2 z-[3] m-0 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[clamp(15px,2.6vh,22px)] font-extrabold`}>{REVEAL}</p>}
              <div className={cn(styles.train, "relative flex items-end justify-center gap-[clamp(4px,1.2vw,12px)]", solved && styles.trainGo)}>
                <span aria-hidden className={`${styles.engine} relative flex items-center justify-center`}>
                  <span className={`${styles.smoke} absolute`} />
                </span>
                {round.choices.map((picture, i) => {
                  const order = taps.indexOf(picture);
                  const stepIndex = round.steps.indexOf(picture);
                  const shown = reveal && stepIndex >= 0;
                  // The step number shown on a car: its place in the answer once revealed, else the order it was tapped.
                  const badge = !ordered ? -1 : shown ? stepIndex : wrong !== picture ? order : -1;
                  return (
                    <button
                      key={`${round.key}-${picture}`}
                      type="button"
                      onClick={() => choose(picture)}
                      disabled={locked || order >= 0}
                      aria-label={PICTURES[picture].name}
                      className={cn(
                        styles.car,
                        "relative flex items-center justify-center rounded-t-xl disabled:cursor-default",
                        order >= 0 && wrong !== picture && !solved && styles.carTapped,
                        solved && order >= 0 && styles.carRight,
                        wrong === picture && styles.carWrong,
                        shown && styles.carReveal,
                        reveal && !shown && wrong !== picture && "opacity-50",
                      )}
                      style={{ background: CAR_COLORS[i % CAR_COLORS.length] }}
                    >
                      <span className={`${styles.cargo} pointer-events-none flex items-center justify-center rounded-lg leading-none`}>{PICTURES[picture].emoji}</span>
                      <span aria-hidden className={`${styles.wheel} absolute -bottom-[14%] left-[14%]`} />
                      <span aria-hidden className={`${styles.wheel} absolute -bottom-[14%] right-[14%]`} />
                      {badge >= 0 && (
                        <span aria-hidden className={`${styles.stepBadge} absolute -left-2 -top-3 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                          {badge + 1}
                        </span>
                      )}
                      {wrong === picture && (
                        <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-3 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                          ✕
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <span aria-hidden className={`${styles.track} mt-[clamp(10px,2dvh,18px)] h-[clamp(12px,2.2dvh,20px)] w-full`} />
            </div>
          </main>
        </>
      )}
    </div>
  );
}
