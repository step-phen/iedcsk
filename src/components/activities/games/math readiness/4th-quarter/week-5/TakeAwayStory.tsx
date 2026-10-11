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
  CHARACTERS,
  LISTEN_TEXT,
  NUMBER_WORDS,
  PICK_TEXT,
  REVEAL_TEXT,
  correctSpeech,
  isCharacter,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  tapText,
} from "./TakeAwayStory.data";
import styles from "./TakeAwayStory.module.css";

interface Round {
  key: string;
  character: keyof typeof CHARACTERS;
  start: number;
  gone: number;
  choices: number[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
// 0: the story opens, 1: the child taps the ones that go away, 2: the question is asked and the numbers are open.
type Step = 0 | 1 | 2;

function buildRound(row: QuestionRow): Round {
  const d = row.questionData as Record<string, unknown>;
  const { start, gone } = d;
  if (!isCharacter(d.character)) throw new Error(`Question ${row.questionKey} needs a known "character"`);
  if (!Number.isInteger(start) || !Number.isInteger(gone) || (start as number) < 1 || (start as number) > 10 || (gone as number) < 1 || (gone as number) > (start as number)) {
    throw new Error(`Question ${row.questionKey} needs a "start" from 1 to 10 and a "gone" from 1 to start`);
  }
  const left = (start as number) - (gone as number);
  const choices = Array.isArray(d.choices) ? d.choices : [];
  if (choices.length < 2 || !choices.every((c) => Number.isInteger(c)) || !choices.includes(left)) {
    throw new Error(`Question ${row.questionKey} needs numeral "choices" that include what is left`);
  }
  if (row.correctAnswer.answer !== String(left)) throw new Error(`Question ${row.questionKey}'s answer must be start minus gone`);
  return { key: row.questionKey, character: d.character, start: start as number, gone: gone as number, choices: choices as number[] };
}

export default function TakeAwayStory({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Take-Away Story questions:", err);
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
  const [step, setStep] = useState<Step>(0);
  const [removed, setRemoved] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Take-Away Story";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  // The ones on stage only become tappable once the story says some go away.
  const tellStory = useCallback(
    (r: Round) => {
      const c = CHARACTERS[r.character];
      setStep(0);
      setRemoved([]);
      speak(c.start(r.start), () => {
        setStep(1);
        speakAll([c.gone(r.gone), c.tap(r.gone)]);
      });
    },
    [speak, speakAll],
  );

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["take-away story"]], () => tellStory(round));
      return;
    }
    tellStory(round);
    // speakAll/tellStory are stable; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    setRemoved([]);
    setStep(0);
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  // Taking away is practice, not graded: each tapped one leaves the stage as its count is said.
  const takeAway = useCallback(
    (spot: number) => {
      if (!round || step !== 1 || removed.includes(spot) || removed.length >= round.gone) return;
      const next = [...removed, spot];
      setRemoved(next);
      if (next.length < round.gone) {
        speak(NUMBER_WORDS[next.length]);
        return;
      }
      setStep(2);
      speakAll([NUMBER_WORDS[next.length], CHARACTERS[round.character].question]);
    },
    [round, step, removed, speak, speakAll],
  );

  const tap = useCallback(
    (choice: number) => {
      if (!round || step !== 2 || picked !== null) return;
      const left = round.start - round.gone;
      const correct = choice === left;
      const pluralName = CHARACTERS[round.character].plural;
      setPicked(choice);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: String(choice) }];
      setResults((r) => [...r, correct]);
      speak(correct ? correctSpeech(left, pluralName) : revealSpeech(left, pluralName), advance, correct ? undefined : { minMs: REVEAL_MIN_MS });
    },
    [round, step, picked, speak, advance],
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
        <p className={`${styles.instruction} m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>The puppet show is about to begin…</p>
      </div>
    );
  }

  const c = CHARACTERS[round.character];
  const left = round.start - round.gone;
  const pickedRight = picked === left;
  const pillText = picked !== null && !pickedRight ? REVEAL_TEXT : step === 2 ? PICK_TEXT : step === 1 ? tapText(round.gone - removed.length) : LISTEN_TEXT;

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
            <div className={`${styles.resultStamp} rounded-md px-[clamp(16px,3vw,32px)] py-2 text-[clamp(18px,3.4vh,32px)] font-extrabold uppercase tracking-widest`}>
              {resultHeadline(score, total)}
            </div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.instruction} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You solved {score} of {total} puppet stories!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(69,10,10,0.35)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={cn(styles.instruction, picked !== null && !pickedRight && styles.instructionReveal, "m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight")}>{pillText}</p>
            <button
              type="button"
              onClick={() => (step === 2 ? speak(c.question) : tellStory(round))}
              disabled={picked !== null}
              aria-label="Hear the story again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main key={round.key} className={`${styles.stageIn} relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(10px,2.4vh,20px)] py-2`}>
            <div className={`${styles.theater} relative w-[min(94vw,720px)] overflow-hidden rounded-t-[2rem] px-[clamp(34px,8vw,70px)] pb-[clamp(18px,4vh,30px)] pt-[clamp(26px,5vh,40px)]`}>
              <span aria-hidden className={`${styles.valance} absolute inset-x-0 top-0 h-[clamp(16px,3.2vh,26px)]`} />
              <span aria-hidden className={`${styles.curtain} absolute bottom-0 left-0 top-0 w-[clamp(26px,7vw,58px)]`} />
              <span aria-hidden className={`${styles.curtain} absolute bottom-0 right-0 top-0 w-[clamp(26px,7vw,58px)] -scale-x-100`} />
              <div className={`${styles.spotlight} flex min-h-[clamp(100px,22vh,190px)] flex-wrap content-center items-center justify-center gap-[clamp(4px,1vw,10px)] rounded-xl p-2`}>
                {Array.from({ length: round.start }, (_, i) =>
                  removed.includes(i) ? (
                    <span key={i} aria-hidden className={cn("text-[clamp(30px,6.4vh,54px)] leading-none", styles[c.exit])}>
                      {c.emoji}
                    </span>
                  ) : (
                    <button
                      key={i}
                      type="button"
                      onClick={() => takeAway(i)}
                      disabled={step !== 1}
                      aria-label={`Take away one of the ${c.plural}`}
                      className={cn(styles.puppet, step === 1 && styles.puppetReady, "rounded-full text-[clamp(30px,6.4vh,54px)] leading-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#facc15] disabled:cursor-default")}
                    >
                      {c.emoji}
                    </button>
                  ),
                )}
              </div>
              <span aria-hidden className={`${styles.floor} absolute inset-x-0 bottom-0 h-[clamp(14px,3vh,24px)]`} />
            </div>

            {step === 2 && (
              <div className={`${styles.cards} flex items-center gap-[clamp(10px,2.4vw,20px)]`}>
                {round.choices.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => tap(n)}
                    disabled={picked !== null}
                    aria-label={`${n} left`}
                    className={cn(
                      styles.card,
                      "relative flex size-[clamp(62px,12.6vh,96px)] items-center justify-center rounded-2xl text-[clamp(28px,6vh,44px)] font-extrabold leading-none tabular-nums focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#facc15] disabled:cursor-default",
                      picked === n && n !== left && styles.cardWrong,
                      picked !== null && n === left && (pickedRight ? styles.cardCorrect : styles.cardReveal),
                    )}
                  >
                    {n}
                    {picked === n && n !== left && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-2 flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
}
