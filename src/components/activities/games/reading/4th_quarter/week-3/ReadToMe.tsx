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
  BLANK,
  DEMO_END,
  DEMO_START,
  DEMO_TEXT,
  INSTRUCTION,
  LISTEN,
  PICTURES,
  QUESTION,
  REVEAL_TEXT,
  correctSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./ReadToMe.data";
import styles from "./ReadToMe.module.css";

interface Round {
  key: string;
  before: string;
  after: string;
  picture: string;
  answer: string;
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Stage = "demo" | "reading" | "choosing" | "feedback";

const DEMO_WORDS = DEMO_TEXT.split(" ");

function buildRound(row: QuestionRow): Round {
  const { text, picture, choices } = row.questionData as { text: unknown; picture: unknown; choices: unknown };
  const parts = typeof text === "string" ? text.split(BLANK) : [];
  if (parts.length !== 2) {
    throw new Error(`Question ${row.questionKey} needs a "text" with exactly one ${BLANK} blank`);
  }
  if (typeof picture !== "string" || !Object.hasOwn(PICTURES, picture)) {
    throw new Error(`Question ${row.questionKey} needs a known "picture"`);
  }
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every((c) => typeof c === "string" && c !== "")) {
    throw new Error(`Question ${row.questionKey} needs three word "choices"`);
  }
  const answer = row.correctAnswer.answer;
  if (!choices.includes(answer)) {
    throw new Error(`Question ${row.questionKey} must have its answer among the choices`);
  }
  return { key: row.questionKey, before: parts[0], after: parts[1], picture, answer, choices };
}

export default function ReadToMe({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Read to Me questions:", err);
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
  const [stage, setStage] = useState<Stage>("demo");
  const [litWord, setLitWord] = useState(-1);
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Read to Me";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  const askLine = useCallback(() => {
    setStage("reading");
    speak(LISTEN, () => {
      speak(QUESTION, undefined, { onStart: () => setStage("choosing") });
    });
  }, [speak]);

  // Owl reads one word per clip and lights it as it is heard, the way a teacher points while reading aloud.
  const readDemo = useCallback(() => {
    const readWord = (i: number) => {
      if (i >= DEMO_WORDS.length) {
        setLitWord(-1);
        speak(DEMO_END, askLine);
        return;
      }
      speak(DEMO_WORDS[i], () => readWord(i + 1), { pauseMs: 250, onStart: () => setLitWord(i) });
    };
    readWord(0);
  }, [speak, askLine]);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["read to me"], DEMO_START], readDemo);
      return;
    }
    askLine();
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
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
    (word: string) => {
      if (stage !== "choosing" || !round) return;
      setStage("feedback");
      setPicked(word);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: word }];
      const sentence = `${round.before}${round.answer}${round.after}`;
      const earned = word === round.answer;
      setResults((r) => [...r, earned]);
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

  const backdrop = (
    <>
      <div aria-hidden className={`${styles.sky} pointer-events-none absolute inset-0`} />
      <div aria-hidden className={`${styles.moon} pointer-events-none absolute right-[8%] top-[14%] size-[clamp(44px,9vh,90px)] rounded-full`} />
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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Waking up Owl…</p>
      </div>
    );
  }

  const filled = reveal ?? (picked === round.answer ? picked : null);

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
              className={cn("size-[clamp(20px,3.6vh,30px)] object-contain transition-transform", stage !== "demo" && i === roundIndex && "scale-125")}
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
            You read {score} of {total} lines!
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

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(8px,2.4vh,26px)]">
            <div className="flex items-end gap-[clamp(6px,2vw,18px)]">
              <span aria-hidden className={cn(styles.owl, "text-[clamp(52px,11vh,104px)] leading-none", stage === "demo" && styles.owlReading)}>
                🦉
              </span>
              <div key={stage === "demo" ? "demo" : round.key} className={`${styles.book} relative flex w-[min(78vw,600px)] flex-col items-center gap-[clamp(4px,1vh,10px)] rounded-xl px-[clamp(14px,3vw,32px)] py-[clamp(10px,2.2vh,22px)]`}>
                <span aria-hidden className={`${styles.spine} absolute inset-y-2 left-1/2 w-[3px] -translate-x-1/2`} />
                {stage === "demo" ? (
                  <p className={`${styles.line} relative m-0 flex flex-wrap justify-center gap-x-[0.3em] text-center text-[clamp(28px,6.4vh,56px)] font-extrabold leading-tight`}>
                    {DEMO_WORDS.map((w, i) => (
                      <span key={i} className={cn(styles.demoWord, "rounded-md px-1", litWord === i && styles.demoWordLit)}>
                        {w}
                      </span>
                    ))}
                  </p>
                ) : (
                  <>
                    <span aria-hidden className="relative text-[clamp(30px,6.4vh,58px)] leading-none">{PICTURES[round.picture]}</span>
                    <p className={`${styles.line} relative m-0 text-center text-[clamp(28px,6.4vh,56px)] font-extrabold leading-tight`}>
                      {round.before}
                      <span className={cn(styles.blank, "inline-block min-w-[2.6em] rounded-md px-1 text-center", filled && styles.blankFilled, reveal && styles.blankReveal)}>{filled ?? " "}</span>
                      {round.after}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className={`${styles.branch} relative flex w-[min(96vw,700px)] items-start justify-around rounded-full pb-1 pt-[clamp(10px,2vh,18px)]`}>
              {round.choices.map((word, i) => {
                const isPicked = picked === word;
                const won = isPicked && word === round.answer;
                return (
                  <div key={`${round.key}-${word}`} className={cn("relative flex flex-col items-center", stage === "demo" && "invisible")}>
                    <span aria-hidden className={`${styles.rope} h-[clamp(18px,4vh,36px)] w-[52%]`} />
                    <button
                      type="button"
                      onClick={() => choose(word)}
                      disabled={stage !== "choosing"}
                      aria-label={word}
                      className={cn(
                        styles.sign,
                        "relative flex min-w-[clamp(92px,24vw,170px)] items-center justify-center rounded-xl px-4 py-[clamp(6px,1.6vh,16px)] text-[clamp(30px,6.6vh,58px)] font-extrabold leading-none",
                        i === 0 && "-rotate-3",
                        i === 2 && "rotate-3",
                        won && styles.signWon,
                        isPicked && !won && styles.signWrong,
                        reveal === word && styles.signReveal,
                      )}
                    >
                      {word}
                    </button>
                    {isPicked && !won && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-2 top-3 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                    {reveal === word && (
                      <span className={`${styles.revealTag} absolute -bottom-9 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[clamp(13px,2.2vh,18px)] font-extrabold`}>{REVEAL_TEXT}</span>
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
