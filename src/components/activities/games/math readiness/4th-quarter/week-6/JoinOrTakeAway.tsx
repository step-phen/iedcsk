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
  ACTION_LABEL,
  ASSETS,
  INSTRUCTION,
  OBJECTS,
  QUESTION,
  REVEAL_TEXT,
  correctSpeech,
  equation,
  isObject,
  modelSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type Action,
} from "./JoinOrTakeAway.data";
import styles from "./JoinOrTakeAway.module.css";

interface Round {
  key: string;
  object: keyof typeof OBJECTS;
  start: number;
  change: number;
  action: Action;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";

const ACTIONS: Action[] = ["join", "takeAway"];

function buildRound(row: QuestionRow): Round {
  const d = row.questionData as Record<string, unknown>;
  const { start, change, action } = d;
  if (!isObject(d.object)) throw new Error(`Question ${row.questionKey} needs a known "object"`);
  if (action !== "join" && action !== "takeAway") throw new Error(`Question ${row.questionKey} needs an "action" of join or takeAway`);
  if (!Number.isInteger(start) || !Number.isInteger(change) || (start as number) < 1 || (change as number) < 1) throw new Error(`Question ${row.questionKey} needs whole "start" and "change"`);
  const s = start as number;
  const c = change as number;
  if (action === "join" ? s + c > 10 : c > s) throw new Error(`Question ${row.questionKey}'s story must stay within 0 to 10`);
  if (row.correctAnswer.answer !== action) throw new Error(`Question ${row.questionKey}'s answer must match its "action"`);
  return { key: row.questionKey, object: d.object, start: s, change: c, action };
}

function storyLines(r: Round): [string, string] {
  const o = OBJECTS[r.object];
  return [o.first(r.start), r.action === "join" ? o.join(r.change) : o.away(r.change)];
}

export default function JoinOrTakeAway({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Join or Take Away questions:", err);
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
  const [picked, setPicked] = useState<Action | null>(null);
  const [modeled, setModeled] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Join or Take Away?";
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
    const lines = [...storyLines(round), QUESTION];
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["join or take away?"], ...lines]);
      return;
    }
    speakAll(lines);
    // speakAll is stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    setModeled(false);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  // After the choice, the counters act the story out and the result is said, so the child hears the answer to the story too.
  const tap = useCallback(
    (choice: Action) => {
      if (!round || picked !== null) return;
      const correct = choice === round.action;
      setPicked(choice);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: choice }];
      setResults((r) => [...r, correct]);
      speak(
        correct ? correctSpeech(round.action) : revealSpeech(round.action),
        () => {
          setModeled(true);
          speak(modelSpeech(round.action, round.start, round.change), advance);
        },
        correct ? undefined : { minMs: REVEAL_MIN_MS },
      );
    },
    [round, picked, speak, advance],
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Wiping the chalkboard…</p>
      </div>
    );
  }

  const pickedRight = picked === round.action;
  const [line1, line2] = storyLines(round);
  const counters = round.action === "join" ? round.start + round.change : round.start;

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
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
            <div className={`${styles.resultStamp} rounded-lg px-[clamp(16px,3vw,32px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You chose correctly {score} of {total} times!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(0,0,0,0.4)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={cn(styles.instruction, picked !== null && !pickedRight && styles.instructionReveal, "m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight")}>
              {picked !== null && !pickedRight ? REVEAL_TEXT : INSTRUCTION}
            </p>
            <button
              type="button"
              onClick={() => speakAll([line1, line2, QUESTION])}
              disabled={picked !== null}
              aria-label="Hear the story again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main key={round.key} className={`${styles.stage} relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(10px,2.4vh,20px)] py-2`}>
            <div className={`${styles.board} flex w-[min(94vw,720px)] flex-col items-center gap-[clamp(6px,1.4vh,12px)] rounded-xl px-4 py-[clamp(10px,2vh,18px)]`}>
              <p className={`${styles.chalk} m-0 text-center text-[clamp(17px,3vh,26px)] font-bold leading-snug`}>
                {line1} {line2}
              </p>
              {!modeled ? (
                <div className="flex flex-wrap items-center justify-center gap-1" aria-hidden>
                  {Array.from({ length: round.start }, (_, i) => (
                    <span key={i} className="text-[clamp(28px,6vh,50px)] leading-none">
                      {OBJECTS[round.object].emoji}
                    </span>
                  ))}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-center gap-[clamp(4px,1vw,8px)]" aria-label={equation(round.action, round.start, round.change)}>
                    {Array.from({ length: counters }, (_, i) => {
                      const added = round.action === "join" && i >= round.start;
                      const crossed = round.action === "takeAway" && i >= round.start - round.change;
                      return (
                        <span
                          key={i}
                          aria-hidden
                          className={cn(styles.counter, added && styles.counterAdded, crossed && styles.counterCrossed, "relative size-[clamp(28px,6vh,48px)] rounded-full")}
                          style={added || crossed ? { animationDelay: `${(i % 5) * 0.1}s` } : undefined}
                        />
                      );
                    })}
                  </div>
                  <p className={`${styles.chalk} ${styles.equation} m-0 text-[clamp(26px,5.6vh,46px)] font-extrabold tabular-nums leading-none`}>
                    {equation(round.action, round.start, round.change)}
                  </p>
                </>
              )}
            </div>

            <div className="flex items-center gap-[clamp(14px,4vw,40px)]">
              {ACTIONS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => tap(id)}
                  disabled={picked !== null}
                  aria-label={ACTION_LABEL[id].text}
                  className={cn(
                    styles.choice,
                    id === "join" ? styles.joinChoice : styles.awayChoice,
                    "relative flex min-h-[clamp(70px,14vh,110px)] w-[clamp(130px,34vw,230px)] flex-col items-center justify-center gap-1 rounded-2xl px-3 text-[clamp(18px,3.4vh,30px)] font-extrabold leading-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#facc15] disabled:cursor-default",
                    picked === id && id !== round.action && styles.choiceWrong,
                    picked !== null && id === round.action && (pickedRight ? styles.choiceCorrect : styles.choiceReveal),
                  )}
                >
                  <span aria-hidden className="text-[clamp(26px,5.4vh,44px)] leading-none">
                    {ACTION_LABEL[id].icon}
                  </span>
                  {ACTION_LABEL[id].text}
                  {picked === id && id !== round.action && (
                    <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-2 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                      ✕
                    </span>
                  )}
                </button>
              ))}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
