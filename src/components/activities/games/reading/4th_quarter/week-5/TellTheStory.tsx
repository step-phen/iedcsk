"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { Mic, Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, REVEAL_MIN_MS } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import {
  ASSETS,
  EVENTS,
  INSTRUCTION,
  REVEAL_TEXT,
  STORY_HELP,
  correctSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  stepQuestion,
} from "./TellTheStory.data";
import styles from "./TellTheStory.module.css";

interface Round {
  key: string;
  story: string[];
  step: number;
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

function isEvent(id: unknown): id is string {
  return typeof id === "string" && Object.hasOwn(EVENTS, id);
}

function buildRound(row: QuestionRow): Round {
  const { story, step, choices } = row.questionData as { story: unknown; step: unknown; choices: unknown };
  if (!Array.isArray(story) || story.length < 2 || !story.every((s) => typeof s === "string" && s !== "")) {
    throw new Error(`Question ${row.questionKey} needs the "story" sentences`);
  }
  if (typeof step !== "number" || !Number.isInteger(step) || step < 1 || step > story.length) {
    throw new Error(`Question ${row.questionKey} needs a "step" inside the story`);
  }
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every(isEvent)) {
    throw new Error(`Question ${row.questionKey} needs three known "choices"`);
  }
  const answer = row.correctAnswer.answer;
  if (!choices.includes(answer)) {
    throw new Error(`Question ${row.questionKey} must have its answer among the choices`);
  }
  return { key: row.questionKey, story, step, answer, choices };
}

export default function TellTheStory({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Tell the Story questions:", err);
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
  const [told, setTold] = useState<string[]>([]);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Tell the Story";
  const score = results.filter(Boolean).length;
  const question = round ? stepQuestion(round.step, round.story.length) : "";

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  const askQuestion = useCallback(() => {
    if (!question) return;
    setStage("listening");
    speak(question, undefined, { onStart: () => setStage("choosing") });
  }, [question, speak]);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["tell the story"], STORY_HELP], askQuestion);
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
      const sentence = round.story[round.step - 1];
      const earned = id === round.answer;
      setResults((r) => [...r, earned]);
      setTold((t) => {
        const next = [...t];
        next[round.step - 1] = round.answer;
        return next;
      });
      if (earned) {
        speak(correctSpeech(sentence, roundIndex), advance);
        return;
      }
      setReveal(round.answer);
      speak(revealSpeech(sentence), advance, { minMs: REVEAL_MIN_MS });
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

  const backdrop = <div aria-hidden className={`${styles.studio} pointer-events-none absolute inset-0`} />;

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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Tuning the radio…</p>
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
            You told {score} of {total} parts of the story!
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
              onClick={askQuestion}
              disabled={stage !== "choosing"}
              aria-label="Hear the question again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(8px,2vh,22px)]">
            <div className={`${styles.script} flex w-[min(94vw,760px)] items-start gap-[clamp(8px,2vw,16px)] rounded-xl px-[clamp(12px,2.6vw,24px)] py-[clamp(6px,1.4vh,14px)]`}>
              <p className="m-0 flex-1 text-[clamp(16px,3.2vh,28px)] font-bold leading-snug">{round.story.join(" ")}</p>
              {/* Live only while choosing: an earlier tap would cut off the narration that unlocks the tapes. */}
              <button type="button" onClick={() => speak(round.story.join(" "))} disabled={stage !== "choosing"} aria-label="Hear the story" className={`${styles.iconButton} flex size-11 shrink-0 items-center justify-center rounded-full`}>
                <Volume2 size={20} strokeWidth={2.6} />
              </button>
            </div>

            <div className={`${styles.reel} flex items-center gap-[clamp(4px,1.2vw,10px)] rounded-full px-[clamp(8px,2vw,16px)] py-[clamp(4px,1vh,8px)]`} aria-label="Story told so far">
              {round.story.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    styles.slot,
                    "flex size-[clamp(36px,7vh,62px)] items-center justify-center rounded-lg text-[clamp(20px,4.4vh,38px)] leading-none",
                    i === round.step - 1 && stage !== "feedback" && styles.slotNow,
                  )}
                >
                  {told[i] ? <span className={styles.slotIn}>{EVENTS[told[i]].emoji}</span> : <span className={styles.slotNum}>{i + 1}</span>}
                </span>
              ))}
            </div>

            <div key={round.key} className="flex items-center gap-2">
              <span aria-hidden className={`${styles.onAir} rounded-md px-2 py-0.5 text-[clamp(12px,2vh,16px)] font-extrabold uppercase tracking-widest`}>On air</span>
              <Mic aria-hidden size={26} strokeWidth={2.4} className={styles.mic} />
              <p className={`${styles.question} m-0 text-[clamp(22px,4.6vh,40px)] font-extrabold leading-tight`}>{question}</p>
            </div>

            <div className="flex w-[min(96vw,700px)] items-stretch justify-around gap-[clamp(6px,2vw,18px)]">
              {round.choices.map((id) => {
                const isPicked = picked === id;
                const won = isPicked && id === round.answer;
                return (
                  <div key={`${round.key}-${id}`} className="relative w-[clamp(90px,min(28vw,22vh),180px)]">
                    <button
                      type="button"
                      onClick={() => choose(id)}
                      disabled={stage !== "choosing"}
                      aria-label={EVENTS[id].name}
                      className={cn(
                        styles.tape,
                        "relative flex aspect-[5/4] w-full flex-col items-center justify-center rounded-xl",
                        won && styles.tapeWon,
                        isPicked && !won && styles.tapeWrong,
                        reveal === id && styles.tapeReveal,
                      )}
                    >
                      <span aria-hidden className={`${styles.label} flex h-[62%] w-[84%] items-center justify-center rounded-md text-[clamp(30px,6.6vh,60px)] leading-none`}>
                        {EVENTS[id].emoji}
                      </span>
                      <span aria-hidden className="mt-[5%] flex gap-[22%]">
                        <span className={`${styles.spool} size-[clamp(10px,2vh,16px)] rounded-full`} />
                        <span className={`${styles.spool} size-[clamp(10px,2vh,16px)] rounded-full`} />
                      </span>
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
