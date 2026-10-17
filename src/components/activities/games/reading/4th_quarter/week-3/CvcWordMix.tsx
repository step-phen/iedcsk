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
  LISTEN,
  PICTURES,
  QUESTION,
  REVEAL_TEXT,
  correctSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./CvcWordMix.data";
import styles from "./CvcWordMix.module.css";

interface Round {
  key: string;
  word: string;
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Stage = "reading" | "choosing" | "feedback";

function isPicture(word: unknown): word is string {
  return typeof word === "string" && Object.hasOwn(PICTURES, word);
}

function buildRound(row: QuestionRow): Round {
  const { word, choices } = row.questionData as { word: unknown; choices: unknown };
  if (!isPicture(word)) {
    throw new Error(`Question ${row.questionKey} needs a known "word"`);
  }
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every(isPicture)) {
    throw new Error(`Question ${row.questionKey} needs three known "choices"`);
  }
  if (row.correctAnswer.answer !== word || !choices.includes(word)) {
    throw new Error(`Question ${row.questionKey} must have its word as the answer and among the choices`);
  }
  return { key: row.questionKey, word, choices };
}

export default function CvcWordMix({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load CVC Word Mix questions:", err);
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
  const [stage, setStage] = useState<Stage>("reading");
  const [powered, setPowered] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "CVC Word Mix";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  // The robot's screen powers on as the prompt is heard, so the word is visible before any picture can be tapped.
  const showWord = useCallback(() => {
    setStage("reading");
    speak(LISTEN, () => {
      speak(QUESTION, undefined, { onStart: () => setStage("choosing") });
    }, { onStart: () => setPowered(true) });
  }, [speak]);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["cvc word mix"]], showWord);
      return;
    }
    showWord();
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    setReveal(null);
    setPowered(false);
    setStage("reading");
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  const choose = useCallback(
    (choice: string) => {
      if (stage !== "choosing" || !round) return;
      setStage("feedback");
      setPicked(choice);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: choice }];
      const earned = choice === round.word;
      setResults((r) => [...r, earned]);
      if (earned) {
        speak(correctSpeech(round.word, roundIndex), advance);
        return;
      }
      setReveal(round.word);
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

  const backdrop = <div aria-hidden className={`${styles.grid} pointer-events-none absolute inset-0`} />;

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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Charging the robot…</p>
      </div>
    );
  }

  const won = picked !== null && picked === round.word;

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
            You read {score} of {total} words!
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
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speak(QUESTION)}
              disabled={stage !== "choosing"}
              aria-label="Hear the question again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(10px,3vh,32px)]">
            <div className={cn(styles.robot, "relative flex flex-col items-center", won && styles.robotHappy)}>
              <span aria-hidden className={`${styles.antenna} h-[clamp(14px,3vh,26px)] w-[4px]`} />
              <span aria-hidden className={`${styles.bulb} -mt-[2px] size-[clamp(10px,2vh,16px)] rounded-full`} />
              <span className={`${styles.head} flex h-[clamp(36px,7vh,62px)] w-[clamp(120px,22vh,200px)] items-center justify-center gap-[clamp(14px,3vh,28px)] rounded-2xl`}>
                <span aria-hidden className={`${styles.eye} size-[clamp(12px,2.4vh,20px)] rounded-full`} />
                <span aria-hidden className={`${styles.eye} size-[clamp(12px,2.4vh,20px)] rounded-full`} />
              </span>
              <span className={`${styles.body} mt-[clamp(4px,0.8vh,8px)] flex items-center justify-center rounded-2xl px-[clamp(14px,3vw,28px)] py-[clamp(8px,1.6vh,14px)]`}>
                <span key={round.key} className={cn(styles.screenWord, "flex min-w-[clamp(140px,30vh,260px)] items-center justify-center rounded-xl px-4 py-[clamp(4px,1vh,10px)] text-[clamp(36px,8vh,72px)] font-extrabold leading-none tracking-wider", powered && styles.screenOn)}>
                  {round.word}
                </span>
              </span>
            </div>

            <div className="flex w-[min(96vw,720px)] items-stretch justify-around gap-[clamp(8px,2vw,20px)]">
              {round.choices.map((choice) => {
                const isPicked = picked === choice;
                const hit = isPicked && choice === round.word;
                return (
                  <div key={`${round.key}-${choice}`} className="relative w-[clamp(92px,min(28vw,24vh),190px)]">
                    <button
                      type="button"
                      onClick={() => choose(choice)}
                      disabled={stage !== "choosing"}
                      aria-label={choice}
                      className={cn(
                        styles.monitor,
                        "relative flex aspect-square w-full items-center justify-center rounded-2xl p-[9%]",
                        hit && styles.monitorWon,
                        isPicked && !hit && styles.monitorWrong,
                        reveal === choice && styles.monitorReveal,
                      )}
                    >
                      <span aria-hidden className={`${styles.glass} flex size-full items-center justify-center rounded-lg text-[clamp(40px,9vh,84px)] leading-none`}>
                        {PICTURES[choice]}
                      </span>
                      <span aria-hidden className={`${styles.led} absolute bottom-[3%] right-[8%] size-2 rounded-full`} />
                    </button>
                    {isPicked && !hit && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-1 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                    {reveal === choice && (
                      <span className={`${styles.revealTag} absolute -top-9 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[clamp(13px,2.2vh,18px)] font-extrabold`}>{REVEAL_TEXT}</span>
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
