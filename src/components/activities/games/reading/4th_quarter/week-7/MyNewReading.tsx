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
  correctSpeech,
  questionSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./MyNewReading.data";
import styles from "./MyNewReading.module.css";

interface Round {
  key: string;
  text: string[];
  line: number;
  question: string;
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

function buildRound(row: QuestionRow): Round {
  const { text, line, question, choices } = row.questionData as { text: unknown; line: unknown; question: unknown; choices: unknown };
  if (!Array.isArray(text) || text.length === 0 || !text.every((s) => typeof s === "string" && s.trim() !== "")) {
    throw new Error(`Question ${row.questionKey} needs the story "text" as a list of sentences`);
  }
  if (typeof line !== "number" || !Number.isInteger(line) || line < 0 || line >= text.length) {
    throw new Error(`Question ${row.questionKey} needs a "line" that points at one of its sentences`);
  }
  if (typeof question !== "string" || question.trim() === "") {
    throw new Error(`Question ${row.questionKey} needs a "question"`);
  }
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every((id) => typeof id === "string" && Object.hasOwn(PICS, id))) {
    throw new Error(`Question ${row.questionKey} needs three known picture choices`);
  }
  if (!choices.includes(row.correctAnswer.answer)) {
    throw new Error(`Question ${row.questionKey} answer must be one of its choices`);
  }
  return { key: row.questionKey, text, line, question, choices, answer: row.correctAnswer.answer };
}

export default function MyNewReading({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load My New Reading questions:", err);
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
  const title = activityName || "My New Reading";
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
    speak(questionSpeech(round.question), undefined, { onStart: () => setStage("choosing") });
  }, [round, speak]);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["my new reading"]], askQuestion);
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
      const sentence = round.text[round.line];
      if (earned) speak(correctSpeech(sentence, roundIndex), advance);
      else speak(revealSpeech(sentence), advance, { minMs: REVEAL_MIN_MS });
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

  const backdrop = <div aria-hidden className={`${styles.meadow} pointer-events-none absolute inset-0`} />;

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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Packing the picnic…</p>
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
            You answered {score} of {total} questions!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(60,30,10,0.35)]" />
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

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(6px,1.8vh,18px)]">
            <div className={`${styles.note} w-[min(94vw,640px)] rounded-lg px-[clamp(14px,3vw,28px)] py-[clamp(8px,1.6vh,16px)]`}>
              <p className="m-0 text-[clamp(17px,3.3vh,30px)] font-bold leading-snug">
                {round.text.map((sentence, i) => (
                  <span key={i} className={cn(answered && i === round.line && styles.marked)}>
                    {sentence}{" "}
                  </span>
                ))}
              </p>
            </div>

            <p key={round.key} className={`${styles.question} m-0 rounded-2xl px-5 py-1.5 text-center text-[clamp(18px,3.4vh,30px)] font-extrabold leading-tight`}>
              {round.question}
            </p>

            <div className={`${styles.blanket} flex items-center justify-center gap-[clamp(10px,3vw,30px)] rounded-2xl px-[clamp(12px,3vw,30px)] py-[clamp(10px,2.2vh,22px)]`}>
              {round.choices.map((id) => {
                const isPicked = picked === id;
                const won = answered && isPicked && !missed;
                const wrong = missed && isPicked;
                const reveal = missed && id === round.answer;
                return (
                  <div key={`${round.key}-${id}`} className="relative">
                    <button
                      type="button"
                      onClick={() => pick(id)}
                      disabled={stage !== "choosing"}
                      aria-label={PICS[id].name}
                      className={cn(
                        styles.plate,
                        "flex aspect-square w-[clamp(84px,min(25vw,22vh),170px)] flex-col items-center justify-center rounded-full",
                        won && styles.plateWon,
                        wrong && styles.plateWrong,
                        reveal && styles.plateReveal,
                      )}
                    >
                      <span aria-hidden className="text-[clamp(32px,7.5vh,68px)] leading-none">{PICS[id].emoji}</span>
                      <span className="text-[clamp(14px,2.6vh,22px)] font-extrabold leading-tight">{PICS[id].name}</span>
                    </button>
                    {wrong && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-1 z-[3] flex size-8 items-center justify-center rounded-full text-lg font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                    {reveal && (
                      <span className={`${styles.revealTag} absolute -top-8 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[clamp(12px,2vh,16px)] font-extrabold`}>{REVEAL_TEXT}</span>
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
