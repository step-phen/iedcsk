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
  TASK_LABEL,
  TASK_TYPES,
  VOWELS,
  answerLine,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type TaskType,
} from "./ReadingReview4.data";
import styles from "./ReadingReview4.module.css";

interface Round {
  key: string;
  type: TaskType;
  text: string;
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

const isPic = (id: string) => Object.hasOwn(PICS, id);
const isScene = (id: string) => id.split("-").length === 2 && id.split("-").every(isPic);

function validChoice(type: TaskType, id: unknown): boolean {
  if (typeof id !== "string") return false;
  if (type === "vowel") return VOWELS.includes(id);
  if (type === "sentence") return isScene(id);
  return isPic(id);
}

function buildRound(row: QuestionRow): Round {
  const { type, text, question, choices } = row.questionData as { type: unknown; text: unknown; question?: unknown; choices: unknown };
  if (typeof type !== "string" || !TASK_TYPES.includes(type as TaskType)) {
    throw new Error(`Question ${row.questionKey} has an unknown "type"`);
  }
  const kind = type as TaskType;
  if (typeof text !== "string" || text.trim() === "") {
    throw new Error(`Question ${row.questionKey} needs a "text"`);
  }
  if (kind === "story" && (typeof question !== "string" || question.trim() === "")) {
    throw new Error(`Question ${row.questionKey} is a story task and needs a "question"`);
  }
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every((id) => validChoice(kind, id))) {
    throw new Error(`Question ${row.questionKey} needs three valid "${kind}" choices`);
  }
  if (!choices.includes(row.correctAnswer.answer)) {
    throw new Error(`Question ${row.questionKey} answer must be one of its choices`);
  }
  return { key: row.questionKey, type: kind, text, question: kind === "story" ? (question as string) : null, choices, answer: row.correctAnswer.answer };
}

// Scoop flavors cycle across the three cones.
const FLAVORS = [styles.strawberry, styles.mint, styles.vanilla];

export default function ReadingReview4({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Reading Review questions:", err);
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
  const title = activityName || "Reading Review";
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
    speak(promptSpeech(round.type, round.text, round.question), undefined, { onStart: () => setStage("choosing") });
  }, [round, speak]);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["reading review 4"]], askQuestion);
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
      const line = answerLine(round.type, round.text, round.answer);
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

  const backdrop = <div aria-hidden className={`${styles.parlor} pointer-events-none absolute inset-0`} />;

  // A tall cone that gains one scoop per right answer.
  const tower = (
    <div aria-hidden className="flex w-[clamp(26px,4.5vh,40px)] shrink-0 flex-col items-center">
      <div className="flex flex-col-reverse items-center">
        {results.map((earned, i) =>
          earned ? <span key={i} className={cn(styles.towerScoop, FLAVORS[i % 3], "-mb-[45%] aspect-square w-full rounded-full")} /> : null,
        )}
      </div>
      <span className={`${styles.towerCone} aspect-[3/4] w-[80%]`} />
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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Opening the ice cream shop…</p>
      </div>
    );
  }

  const answered = stage === "feedback";
  const missed = answered && picked !== round.answer;
  const textPic = (round.type === "vowel" || round.type === "rhyme") && isPic(round.text) ? PICS[round.text] : null;

  const scoopContent = (id: string) => {
    if (round.type === "vowel") return <span className="text-[clamp(34px,7vh,64px)] font-extrabold leading-none">{id}</span>;
    const pics = round.type === "sentence" ? id.split("-") : [id];
    return (
      <>
        <span aria-hidden className="flex text-[clamp(26px,5.6vh,52px)] leading-none">
          {pics.map((p) => (
            <span key={p}>{PICS[p].emoji}</span>
          ))}
        </span>
        {round.type === "rhyme" && <span className="text-[clamp(14px,2.6vh,22px)] font-extrabold leading-tight">{PICS[id].name}</span>}
      </>
    );
  };

  const choiceLabel = (id: string) => (round.type === "sentence" ? id.split("-").map((p) => PICS[p].name).join(" and ") : round.type === "vowel" ? id : PICS[id].name);

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
              className={cn("size-[clamp(16px,3vh,26px)] object-contain transition-transform", i === roundIndex && "scale-125")}
            />
          ))}
        </div>
      )}

      <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(26px,5.5vh,46px)] font-extrabold leading-tight`}>{title}</h1>

      {phase === "complete" ? (
        <div className={`${styles.result} relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(10px,2.4vh,22px)] text-center`}>
          {tower}
          <div className="flex items-center gap-3">
            <div className={`${styles.headline} rounded-xl px-[clamp(26px,5vw,52px)] py-[clamp(8px,1.6vh,14px)] text-[clamp(20px,3.8vh,34px)] font-extrabold`}>{resultHeadline(score, total)}</div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You got {score} of {total} scoops!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-[clamp(4px,1vw,10px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(28px,6vh,56px)] object-contain drop-shadow-[0_4px_3px_rgba(60,30,10,0.35)]" />
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
              aria-label="Hear the task again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(8px,2vh,20px)]">
            <div className="flex items-end gap-[clamp(8px,2vw,18px)]">
              <div key={round.key} className={`${styles.board} flex w-[min(80vw,600px)] flex-col items-center gap-1 rounded-xl px-[clamp(12px,3vw,26px)] py-[clamp(8px,1.6vh,16px)] text-center`}>
                <span className={`${styles.boardLabel} rounded-full px-3 text-[clamp(13px,2.2vh,18px)] font-extrabold uppercase tracking-wide`}>{TASK_LABEL[round.type]}</span>
                <div className="flex items-center gap-3">
                  {textPic && <span aria-hidden className="text-[clamp(30px,6vh,54px)] leading-none">{textPic.emoji}</span>}
                  <p className={cn("m-0 font-extrabold leading-snug", round.type === "word" || round.type === "vowel" || round.type === "rhyme" ? "text-[clamp(34px,7.5vh,68px)]" : "text-[clamp(18px,3.4vh,30px)]")}>
                    {round.text}
                  </p>
                </div>
                {round.question && <p className={`${styles.boardQuestion} m-0 text-[clamp(17px,3.2vh,28px)] font-extrabold leading-tight`}>{round.question}</p>}
              </div>
              {tower}
            </div>

            <div className="flex items-start justify-center gap-[clamp(12px,4vw,40px)]">
              {round.choices.map((id, i) => {
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
                      aria-label={choiceLabel(id)}
                      className={cn(styles.cone, "relative flex w-[clamp(86px,min(24vw,20vh),160px)] flex-col items-center", won && styles.coneWon, wrong && styles.coneWrong, reveal && styles.coneReveal)}
                    >
                      {won && <span aria-hidden className={`${styles.cherry} absolute -top-[0.45em] left-[calc(50%-0.5em)] text-[clamp(20px,4vh,34px)] leading-none`}>🍒</span>}
                      <span className={cn(styles.scoop, FLAVORS[i], "relative z-[1] flex aspect-square w-full flex-col items-center justify-center rounded-full")}>{scoopContent(id)}</span>
                      <span aria-hidden className={`${styles.wafer} -mt-[12%] aspect-[3/4] w-[62%]`} />
                    </button>
                    {wrong && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 top-0 z-[3] flex size-8 items-center justify-center rounded-full text-lg font-extrabold leading-none`}>
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
