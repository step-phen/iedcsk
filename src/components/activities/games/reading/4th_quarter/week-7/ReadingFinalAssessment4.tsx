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
  PICS,
  REVEAL_TEXT,
  answerLine,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type TaskType,
} from "./ReadingFinalAssessment4.data";
import styles from "./ReadingFinalAssessment4.module.css";

interface Round {
  key: string;
  type: TaskType;
  text: string[];
  question: string | null;
  choices: string[];
  answer: string;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Stage = "listening" | "choosing" | "feedback";

const isText = (s: unknown) => typeof s === "string" && s.trim() !== "";

function buildRound(row: QuestionRow): Round {
  const { type, text, question, choices } = row.questionData as { type: unknown; text: unknown; question?: unknown; choices: unknown };
  if (type !== "word" && type !== "passage") {
    throw new Error(`Question ${row.questionKey} needs a "type" of word or passage`);
  }
  // A word task holds one word; a passage task holds its sentences and a question.
  const lines = type === "word" ? [text] : text;
  if (!Array.isArray(lines) || lines.length === 0 || !lines.every(isText)) {
    throw new Error(`Question ${row.questionKey} needs a "text"`);
  }
  if (type === "passage" && !isText(question)) {
    throw new Error(`Question ${row.questionKey} is a passage task and needs a "question"`);
  }
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every((id) => typeof id === "string" && Object.hasOwn(PICS, id))) {
    throw new Error(`Question ${row.questionKey} needs three known picture choices`);
  }
  if (!choices.includes(row.correctAnswer.answer)) {
    throw new Error(`Question ${row.questionKey} answer must be one of its choices`);
  }
  return { key: row.questionKey, type, text: lines as string[], question: type === "passage" ? (question as string) : null, choices, answer: row.correctAnswer.answer };
}

// Ribbon colors for the three medals.
const RIBBONS = [styles.ribbonRed, styles.ribbonBlue, styles.ribbonGreen];

export default function ReadingFinalAssessment4({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Reading Final Assessment questions:", err);
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
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Reading Final Assessment";
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
    speak(promptSpeech(round.type, round.question), undefined, { onStart: () => setStage("choosing") });
  }, [round, speak]);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["reading final assessment 4"]], askQuestion);
      return;
    }
    askQuestion();
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    setStage("listening");
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  const pick = useCallback(
    (id: string) => {
      if (!round || stage !== "choosing") return;
      setPicked(id);
      setStage("feedback");
      answersRef.current = [...answersRef.current, { questionId: round.key, response: id }];
      const earned = id === round.answer;
      setResults((r) => [...r, earned]);
      const line = answerLine(round.type, round.text[0], round.answer);
      if (earned) speak(correctSpeech(line, roundIndex), advance);
      else speak(revealSpeech(line), advance, { minMs: REVEAL_MIN_MS });
    },
    [round, roundIndex, stage, speak, advance],
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
    <div aria-hidden className={`${styles.stage} pointer-events-none absolute inset-0`}>
      <span className={`${styles.curtain} absolute inset-y-0 left-0 w-[9vw]`} />
      <span className={`${styles.curtain} absolute inset-y-0 right-0 w-[9vw] -scale-x-100`} />
      <span className={`${styles.valance} absolute inset-x-0 top-0 h-[5vh]`} />
    </div>
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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Setting up the stage…</p>
      </div>
    );
  }

  const answered = stage === "feedback";
  const missed = answered && picked !== round.answer;

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      {backdrop}

      {learnerName && (
        <div className={`${styles.badge} fixed left-3 top-3 z-10 flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-xl font-extrabold short:py-1 short:text-base`}>
          <LearnerAvatar photoUrl={photoUrl} firstName={learnerName} className={`${styles.avatar} size-11 text-xl short:size-8 short:text-base`} />
          <span className="max-w-48 truncate capitalize leading-none">{learnerName}</span>
        </div>
      )}
      {/* Fifteen stars would crowd a phone, so the badge shows one star and the running score. */}
      {phase !== "complete" && (
        <div className={`${styles.badge} fixed right-3 top-3 z-10 flex items-center gap-1.5 rounded-full py-1.5 pl-2 pr-4 text-xl font-extrabold short:py-1 short:text-base`} aria-label={`Score: ${score}`}>
          <Image src={score > 0 ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} loading="eager" className="size-[clamp(22px,3.8vh,32px)] object-contain" />
          <span className="leading-none">{score}</span>
        </div>
      )}

      <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(24px,5vh,44px)] font-extrabold leading-tight`}>{title}</h1>

      {phase === "complete" ? (
        <div className={`${styles.result} relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(10px,2.4vh,22px)] text-center`}>
          <span aria-hidden className={`${styles.trophy} text-[clamp(48px,11vh,96px)] leading-none`}>🏅</span>
          <div className="flex items-center gap-3">
            <div className={`${styles.headline} rounded-xl px-[clamp(26px,5vw,52px)] py-[clamp(8px,1.6vh,14px)] text-[clamp(20px,3.8vh,34px)] font-extrabold`}>{resultHeadline(score, total)}</div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You got {score} of {total} medals!
          </p>
          <div className="flex max-w-[min(92vw,640px)] flex-wrap items-center justify-center gap-[clamp(3px,0.8vw,8px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(24px,5vh,44px)] object-contain drop-shadow-[0_3px_2px_rgba(30,10,40,0.4)]" />
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

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(8px,2vh,20px)]">
            <div key={round.key} className={`${styles.scroll} flex w-[min(78vw,620px)] flex-col items-center gap-1 rounded-md px-[clamp(14px,3vw,30px)] py-[clamp(8px,1.8vh,18px)] text-center`}>
              {round.type === "word" ? (
                <p className="m-0 text-[clamp(44px,10vh,92px)] font-extrabold leading-none tracking-wide">{round.text[0]}</p>
              ) : (
                <>
                  <p className="m-0 text-[clamp(16px,3.1vh,28px)] font-bold leading-snug">{round.text.join(" ")}</p>
                  <p className={`${styles.question} m-0 mt-1 text-[clamp(17px,3.2vh,28px)] font-extrabold leading-tight`}>{round.question}</p>
                </>
              )}
            </div>

            <div className="flex items-start justify-center gap-[clamp(14px,4.5vw,46px)]">
              {round.choices.map((id, i) => {
                const isPicked = picked === id;
                const won = answered && isPicked && !missed;
                const wrong = missed && isPicked;
                const reveal = missed && id === round.answer;
                return (
                  <div key={`${round.key}-${id}`} className="relative flex flex-col items-center">
                    <span aria-hidden className={`${styles.ribbon} ${RIBBONS[i]} h-[clamp(18px,4vh,40px)] w-[clamp(26px,5vh,44px)]`} />
                    <button
                      type="button"
                      onClick={() => pick(id)}
                      disabled={stage !== "choosing"}
                      aria-label={PICS[id].said}
                      className={cn(
                        styles.medal,
                        "-mt-1 flex aspect-square w-[clamp(84px,min(24vw,20vh),156px)] items-center justify-center rounded-full",
                        won && styles.medalWon,
                        wrong && styles.medalWrong,
                        reveal && styles.medalReveal,
                      )}
                    >
                      <span aria-hidden className={`${styles.medalFace} flex size-[78%] items-center justify-center rounded-full text-[clamp(32px,7vh,64px)] leading-none`}>{PICS[id].emoji}</span>
                    </button>
                    {wrong && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 top-[clamp(18px,4vh,40px)] z-[3] flex size-8 items-center justify-center rounded-full text-lg font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                    {reveal && (
                      <span className={`${styles.revealTag} absolute -top-7 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[clamp(12px,2vh,16px)] font-extrabold`}>{REVEAL_TEXT}</span>
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
