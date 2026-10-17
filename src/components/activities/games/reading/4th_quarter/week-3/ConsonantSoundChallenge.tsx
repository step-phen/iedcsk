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
  PICTURES,
  REVEAL_TEXT,
  correctSpeech,
  questionSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type Position,
} from "./ConsonantSoundChallenge.data";
import styles from "./ConsonantSoundChallenge.module.css";

interface Round {
  key: string;
  word: string;
  position: Position;
  answer: string;
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Stage = "listening" | "choosing" | "feedback";

function buildRound(row: QuestionRow): Round {
  const { word, position, choices } = row.questionData as { word: unknown; position: unknown; choices: unknown };
  if (typeof word !== "string" || !Object.hasOwn(PICTURES, word)) {
    throw new Error(`Question ${row.questionKey} needs a known "word"`);
  }
  if (position !== "beginning" && position !== "ending") {
    throw new Error(`Question ${row.questionKey} needs "position" of beginning or ending`);
  }
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every((c) => typeof c === "string" && /^[a-z]$/.test(c))) {
    throw new Error(`Question ${row.questionKey} needs three single-letter "choices"`);
  }
  const answer = row.correctAnswer.answer;
  if (!choices.includes(answer)) {
    throw new Error(`Question ${row.questionKey} must have its answer among the choices`);
  }
  return { key: row.questionKey, word, position, answer, choices };
}

export default function ConsonantSoundChallenge({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Consonant Sound Challenge questions:", err);
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
  const [stage, setStage] = useState<Stage>("listening");
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Consonant Sound Challenge";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  const askQuestion = useCallback(() => {
    if (!round) return;
    setStage("listening");
    speak(questionSpeech(round.word, round.position), undefined, { onStart: () => setStage("choosing") });
  }, [round, speak]);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["consonant sound challenge"]], askQuestion);
      return;
    }
    askQuestion();
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    setReveal(null);
    setStage("listening");
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  const shoot = useCallback(
    (letter: string) => {
      if (stage !== "choosing" || !round) return;
      setStage("feedback");
      setPicked(letter);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: letter }];
      const earned = letter === round.answer;
      setResults((r) => [...r, earned]);
      if (earned) {
        speak(correctSpeech(round.word, round.position, round.answer, roundIndex), advance);
        return;
      }
      setReveal(round.answer);
      speak(revealSpeech(round.word, round.position, round.answer), advance, { minMs: REVEAL_MIN_MS });
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

  const backdrop = (
    <>
      <div aria-hidden className={`${styles.wall} pointer-events-none absolute inset-x-0 top-0 h-[62%]`} />
      <div aria-hidden className={`${styles.floor} pointer-events-none absolute inset-x-0 bottom-0 h-[38%]`} />
    </>
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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Pumping up the balls…</p>
      </div>
    );
  }

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
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
            <div className={`${styles.headline} rounded-xl px-[clamp(26px,5vw,52px)] py-[clamp(8px,1.6vh,14px)] text-[clamp(20px,3.8vh,34px)] font-extrabold`}>{resultHeadline(score, total)}</div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You scored {score} of {total} baskets!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(20,30,60,0.3)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={askQuestion}
              disabled={stage !== "choosing"}
              aria-label="Hear the question again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(10px,3vh,32px)]">
            <div key={round.key} className={`${styles.scoreboard} flex items-center gap-[clamp(10px,3vw,28px)] rounded-2xl px-[clamp(14px,3vw,30px)] py-[clamp(6px,1.4vh,14px)]`}>
              <span aria-hidden className={`${styles.picture} flex size-[clamp(64px,13vh,120px)] items-center justify-center rounded-xl text-[clamp(40px,9vh,84px)] leading-none`}>
                {PICTURES[round.word]}
              </span>
              <div className="flex flex-col items-start gap-1">
                <span className={`${styles.word} text-[clamp(28px,6vh,54px)] font-extrabold leading-none`}>{round.word}</span>
                <span className={cn(styles.tag, "rounded-full px-3 py-0.5 text-[clamp(13px,2.3vh,20px)] font-extrabold uppercase tracking-wide")}>
                  {round.position} sound
                </span>
              </div>
            </div>

            <div className="flex w-[min(96vw,760px)] items-end justify-around gap-[clamp(6px,2vw,20px)]">
              {round.choices.map((letter) => {
                const isPicked = picked === letter;
                const won = isPicked && letter === round.answer;
                return (
                  <div key={`${round.key}-${letter}`} className="relative flex w-[clamp(92px,min(28vw,26vh),200px)] flex-col items-center">
                    {reveal === letter && (
                      <span className={`${styles.revealTag} absolute -top-8 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[clamp(13px,2.2vh,18px)] font-extrabold`}>{REVEAL_TEXT}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => shoot(letter)}
                      disabled={stage !== "choosing"}
                      aria-label={`Letter ${letter}`}
                      className={cn(
                        styles.hoop,
                        "relative flex w-full flex-col items-center",
                        won && styles.hoopWon,
                        isPicked && !won && styles.hoopWrong,
                        reveal === letter && styles.hoopReveal,
                      )}
                    >
                      <span className={`${styles.backboard} relative flex aspect-[4/3] w-full items-start justify-center rounded-lg pt-[6%]`}>
                        <span className={`${styles.letter} text-[clamp(38px,8.5vh,78px)] font-extrabold leading-none`}>{letter}</span>
                        <span aria-hidden className={`${styles.target} absolute bottom-[6%] left-1/2 h-[30%] w-[38%] -translate-x-1/2`} />
                      </span>
                      <span aria-hidden className={`${styles.rim} relative z-[2] -mt-[2px] h-[clamp(7px,1.3vh,11px)] w-[62%] rounded-full`} />
                      <span aria-hidden className={`${styles.net} h-[clamp(26px,6vh,52px)] w-[54%]`} />
                      {won && <span aria-hidden className={`${styles.ball} absolute left-1/2 top-[52%] z-[1] size-[clamp(26px,5vh,44px)] rounded-full`} />}
                    </button>
                    {isPicked && !won && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-1 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </main>
        </>
      )}
    </div>
  );
}
