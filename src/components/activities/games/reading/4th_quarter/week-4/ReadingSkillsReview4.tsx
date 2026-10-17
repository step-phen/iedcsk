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
  BOOK_PARTS,
  INSTRUCTION,
  PICTURES,
  REVEAL_TEXT,
  answerLine,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type Kind,
} from "./ReadingSkillsReview4.data";
import styles from "./ReadingSkillsReview4.module.css";

interface Round {
  key: string;
  kind: Kind;
  text: string;
  question: string | null;
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

const KINDS: Kind[] = ["word", "phrase", "rhyme", "book", "story"];

function buildRound(row: QuestionRow): Round {
  const { type, text, question, choices } = row.questionData as { type: unknown; text: unknown; question: unknown; choices: unknown };
  if (!KINDS.includes(type as Kind) || typeof text !== "string" || text.trim() === "") {
    throw new Error(`Question ${row.questionKey} needs a known "type" and a "text"`);
  }
  const kind = type as Kind;
  if (kind === "book" && !Object.hasOwn(BOOK_PARTS, text)) {
    throw new Error(`Question ${row.questionKey} needs a known book part in "text"`);
  }
  const known = kind === "book" ? BOOK_PARTS : PICTURES;
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every((c) => typeof c === "string" && Object.hasOwn(known, c))) {
    throw new Error(`Question ${row.questionKey} needs three known "choices"`);
  }
  if (kind === "story" && (typeof question !== "string" || question.trim() === "")) {
    throw new Error(`Question ${row.questionKey} needs a story "question"`);
  }
  const answer = row.correctAnswer.answer;
  if (!choices.includes(answer)) {
    throw new Error(`Question ${row.questionKey} must have its answer among the choices`);
  }
  return { key: row.questionKey, kind, text, question: kind === "story" ? (question as string) : null, answer, choices };
}

// A closed book for the cover and title, an open one for the pages; the part asked about glows.
function Book({ part }: { part: string }) {
  if (part === "pages") {
    return (
      <span aria-hidden className={`${styles.openBook} relative flex h-[62%] w-[86%] rounded-md`}>
        <span className={`${styles.page} ${styles.glow} m-[5%] flex-1 rounded-sm`} />
        <span className={`${styles.page} ${styles.glow} m-[5%] flex-1 rounded-sm`} />
      </span>
    );
  }
  return (
    <span aria-hidden className={cn(styles.closedBook, "relative flex h-[82%] w-[64%] flex-col items-center rounded-r-md rounded-l-sm pt-[14%]", part === "cover" && styles.glow)}>
      <span className={cn(styles.titleStrip, "h-[18%] w-[74%] rounded-sm", part === "title" && styles.glow)} />
      <span className="mt-[16%] text-[clamp(22px,5vh,44px)] leading-none">🐻</span>
    </span>
  );
}

export default function ReadingSkillsReview4({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Reading Skills Review 4 questions:", err);
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
  const title = activityName || "Reading Skills Review 4";
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
    speak(promptSpeech(round.kind, round.text, round.question), undefined, { onStart: () => setStage("choosing") });
  }, [round, speak]);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["reading skills review 4"]], askQuestion);
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

  const choose = useCallback(
    (id: string) => {
      if (stage !== "choosing" || !round) return;
      setStage("feedback");
      setPicked(id);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: id }];
      const line = answerLine(round.kind, round.text, round.answer);
      const earned = id === round.answer;
      setResults((r) => [...r, earned]);
      if (earned) {
        speak(correctSpeech(line, roundIndex), advance);
        return;
      }
      setReveal(round.answer);
      speak(revealSpeech(line), advance, { minMs: REVEAL_MIN_MS });
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
      <div aria-hidden className={`${styles.curtains} pointer-events-none absolute inset-0`} />
      <div aria-hidden className={`${styles.spotlight} pointer-events-none absolute inset-0`} />
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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Turning on the stage lights…</p>
      </div>
    );
  }

  const showLabels = round.kind === "rhyme";

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
        <div className={`${styles.badge} fixed right-3 top-3 z-10 flex max-w-[60vw] flex-wrap items-center justify-end gap-0.5 rounded-full px-3 py-1.5`} aria-label={`Score: ${score} of ${total}`}>
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
        <div className={`${styles.result} relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center`}>
          <div className="flex items-center gap-3">
            <div className={`${styles.headline} rounded-xl px-[clamp(26px,5vw,52px)] py-[clamp(8px,1.6vh,14px)] text-[clamp(20px,3.8vh,34px)] font-extrabold`}>{resultHeadline(score, total)}</div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You got {score} of {total} right!
          </p>
          <div className="flex max-w-[94vw] flex-wrap items-center justify-center gap-[clamp(4px,1.2vw,12px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(30px,6.5vh,60px)] object-contain drop-shadow-[0_4px_3px_rgba(0,0,0,0.4)]" />
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

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(10px,3vh,30px)]">
            <div key={round.key} className={`${styles.board} flex min-h-[clamp(70px,15vh,140px)] w-[min(92vw,640px)] flex-col items-center justify-center gap-1 rounded-2xl px-[clamp(14px,3vw,28px)] py-[clamp(8px,1.6vh,16px)] text-center`}>
              {round.kind === "rhyme" && <span aria-hidden className="text-[clamp(32px,7vh,60px)] leading-none">{PICTURES[round.text]?.emoji}</span>}
              {round.kind === "book" ? (
                <span className="text-[clamp(26px,5.4vh,48px)] font-extrabold leading-tight">Find {BOOK_PARTS[round.text]}!</span>
              ) : (
                <span className={cn("font-extrabold leading-tight", round.kind === "story" ? "text-[clamp(20px,4vh,36px)]" : "text-[clamp(34px,7.4vh,66px)]")}>{round.text}</span>
              )}
              {round.question && <span className={`${styles.ask} rounded-full px-4 text-[clamp(18px,3.4vh,30px)] font-extrabold`}>{round.question}</span>}
            </div>

            <div className="flex w-[min(96vw,720px)] items-end justify-around gap-[clamp(6px,2vw,20px)]">
              {round.choices.map((id) => {
                const isPicked = picked === id;
                const won = isPicked && id === round.answer;
                const label = round.kind === "book" ? BOOK_PARTS[id] : PICTURES[id].name;
                return (
                  <div key={`${round.key}-${id}`} className="relative flex w-[clamp(92px,min(28vw,24vh),190px)] flex-col items-center">
                    <button
                      type="button"
                      onClick={() => choose(id)}
                      disabled={stage !== "choosing"}
                      aria-label={label}
                      className={cn(
                        styles.podium,
                        "relative flex w-full flex-col items-center rounded-t-2xl",
                        won && styles.podiumWon,
                        isPicked && !won && styles.podiumWrong,
                        reveal === id && styles.podiumReveal,
                      )}
                    >
                      <span aria-hidden className={`${styles.buzzer} -mb-1 h-[clamp(10px,2vh,16px)] w-[44%] rounded-t-full`} />
                      <span className={`${styles.monitor} flex aspect-square w-full flex-col items-center justify-center rounded-2xl`}>
                        {round.kind === "book" ? (
                          <Book part={id} />
                        ) : (
                          <span aria-hidden className="whitespace-nowrap text-[clamp(32px,7vh,64px)] leading-none">{PICTURES[id].emoji}</span>
                        )}
                        {showLabels && <span className="text-[clamp(16px,3vh,26px)] font-extrabold leading-tight">{label}</span>}
                      </span>
                      <span aria-hidden className={`${styles.stand} h-[clamp(14px,3vh,26px)] w-[80%]`} />
                    </button>
                    {isPicked && !won && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-1 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                    {reveal === id && (
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
