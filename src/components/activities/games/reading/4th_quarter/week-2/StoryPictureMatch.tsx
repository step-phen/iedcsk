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
  QUESTION,
  READ_PART,
  REVEAL_TEXT,
  STORY_TITLE,
  correctSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./StoryPictureMatch.data";
import styles from "./StoryPictureMatch.module.css";

interface Round {
  key: string;
  sentence: string;
  answer: string;
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Stage = "reading" | "choosing" | "feedback";

function buildRound(row: QuestionRow): Round {
  const { sentence, choices } = row.questionData as { sentence: unknown; choices: unknown };
  if (typeof sentence !== "string" || sentence.trim() === "") {
    throw new Error(`Question ${row.questionKey} needs a story "sentence"`);
  }
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every((c) => typeof c === "string" && Object.hasOwn(PICTURES, c))) {
    throw new Error(`Question ${row.questionKey} needs three known "choices"`);
  }
  const answer = row.correctAnswer.answer;
  if (!choices.includes(answer)) {
    throw new Error(`Question ${row.questionKey} must have its answer among the choices`);
  }
  return { key: row.questionKey, sentence, answer, choices: choices as string[] };
}

export default function StoryPictureMatch({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Story Picture Match questions:", err);
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
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Story Picture Match";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  // The sentence itself is not read aloud unless the child taps the speaker, so they try reading it first.
  const askRound = useCallback(() => {
    setStage("reading");
    speakAll([READ_PART, QUESTION], () => setStage("choosing"));
  }, [speakAll]);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["story picture match"]], askRound);
      return;
    }
    askRound();
    // speakAll is stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    setReveal(null);
    setStage("reading");
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  const choose = useCallback(
    (picture: string) => {
      if (stage !== "choosing" || !round) return;
      setStage("feedback");
      setPicked(picture);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: picture }];
      const earned = picture === round.answer;
      setResults((r) => [...r, earned]);
      if (earned) {
        speak(correctSpeech(round.sentence, roundIndex), advance);
        return;
      }
      setReveal(round.answer);
      speak(revealSpeech(round.sentence), advance, { minMs: REVEAL_MIN_MS });
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

  const backdrop = <div aria-hidden className={`${styles.halftone} pointer-events-none absolute inset-0`} />;

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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Drawing the comic…</p>
      </div>
    );
  }

  // A panel fills in with its picture once that part of the story is matched or revealed.
  const strip = (
    <ol className="relative z-[1] m-0 flex shrink-0 list-none items-stretch gap-[clamp(4px,1vw,10px)] p-0" aria-label={STORY_TITLE}>
      {rounds.map((r, i) => {
        const done = i < results.length;
        const current = phase !== "complete" && i === roundIndex;
        return (
          <li
            key={r.key}
            aria-label={done ? r.sentence : undefined}
            className={cn(
              styles.panel,
              "flex size-[clamp(46px,min(15vw,9vh),82px)] items-center justify-center rounded-md text-[clamp(24px,5vh,46px)] font-extrabold leading-none",
              current && styles.panelCurrent,
              done && styles.panelDone,
            )}
          >
            {done ? PICTURES[r.answer].emoji : current ? "?" : ""}
          </li>
        );
      })}
    </ol>
  );

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
          {strip}
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You matched {score} of {total} story pictures!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(0,0,0,0.3)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => speak(round.sentence)}
              disabled={stage === "feedback"}
              aria-label="Read this part to me"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(10px,3vh,30px)]">
            {strip}

            <div key={round.key} className={`${styles.caption} relative w-[min(94vw,640px)] rounded-2xl px-[clamp(14px,3vw,28px)] py-[clamp(10px,2.4vh,22px)]`}>
              <p className="m-0 text-center text-[clamp(28px,6.4vh,56px)] font-extrabold leading-tight">{round.sentence}</p>
            </div>

            <div className="flex w-[min(96vw,720px)] items-stretch justify-around gap-[clamp(8px,2vw,20px)]">
              {round.choices.map((picture) => {
                const isPicked = picked === picture;
                const won = isPicked && picture === round.answer;
                return (
                  <div key={`${round.key}-${picture}`} className="relative w-[clamp(92px,min(28vw,26vh),196px)]">
                    <button
                      type="button"
                      onClick={() => choose(picture)}
                      disabled={stage !== "choosing"}
                      aria-label={PICTURES[picture].name}
                      className={cn(
                        styles.frame,
                        "flex aspect-square w-full items-center justify-center rounded-lg",
                        won && styles.frameWon,
                        isPicked && !won && styles.frameWrong,
                        reveal === picture && styles.frameReveal,
                      )}
                    >
                      <span aria-hidden className="pointer-events-none select-none text-[clamp(44px,10vh,96px)] leading-none">{PICTURES[picture].emoji}</span>
                    </button>
                    {won && (
                      <span aria-hidden className={`${styles.burst} absolute -left-3 -top-4 z-[3] px-2 py-0.5 text-[clamp(14px,2.4vh,20px)] font-extrabold`}>
                        POW!
                      </span>
                    )}
                    {isPicked && !won && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-1 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                    {reveal === picture && (
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
