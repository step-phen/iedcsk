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
  LETTER,
  LISTEN,
  QUESTION,
  REVEAL_TEXT,
  WORDS,
  correctSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./ConsonantCc.data";
import styles from "./ConsonantCc.module.css";

interface Round {
  key: string;
  /** Left window to right window. */
  choices: string[];
  answer: string;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Stage = "naming" | "choosing" | "feedback";

function buildRound(row: QuestionRow): Round {
  const { choices } = row.questionData as { choices: unknown };
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every((w) => typeof w === "string" && Object.hasOwn(WORDS, w))) {
    throw new Error(`Question ${row.questionKey} needs three known "choices"`);
  }
  const cWords = (choices as string[]).filter((w) => WORDS[w].isC);
  if (cWords.length !== 1 || cWords[0] !== row.correctAnswer.answer) {
    throw new Error(`Question ${row.questionKey} needs exactly one C picture, and it must be the answer`);
  }
  return { key: row.questionKey, choices: choices as string[], answer: row.correctAnswer.answer };
}

// Twinkling dusk stars: [left %, top %, delay s].
const SKY_STARS: [number, number, number][] = [
  [8, 12, 0],
  [22, 30, 1.2],
  [41, 8, 0.6],
  [58, 22, 1.8],
  [76, 10, 0.3],
  [90, 28, 1.5],
];

export default function ConsonantCc({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Consonant Cc questions:", err);
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
  const [stage, setStage] = useState<Stage>("naming");
  const [opened, setOpened] = useState(0);
  const [naming, setNaming] = useState(-1);
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Consonant Cc";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  // Each window's shutters swing open and its candle glows while the picture name is spoken, then the question opens tapping.
  const nameWindows = useCallback(
    (r: Round) => {
      setStage("naming");
      const step = (i: number) => {
        if (i >= r.choices.length) {
          setNaming(-1);
          setStage("choosing");
          speak(QUESTION);
          return;
        }
        speak(WORDS[r.choices[i]].name, () => step(i + 1), {
          onStart: () => {
            setOpened((n) => Math.max(n, i + 1));
            setNaming(i);
          },
        });
      };
      step(0);
    },
    [speak],
  );

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["consonant cc"]], () => nameWindows(round));
      return;
    }
    speak(LISTEN, () => nameWindows(round));
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    setReveal(null);
    setOpened(0);
    setNaming(-1);
    setStage("naming");
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  const choose = useCallback(
    (word: string) => {
      if (stage !== "choosing" || !round) return;
      setStage("feedback");
      setPicked(word);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: word }];
      const earned = word === round.answer;
      setResults((r) => [...r, earned]);
      if (earned) {
        speak(correctSpeech(word, roundIndex), advance);
        return;
      }
      setReveal(round.answer);
      speak(revealSpeech(round.answer), advance, { minMs: REVEAL_MIN_MS });
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

  const sky = (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {SKY_STARS.map(([left, top, delay]) => (
        <span key={left} className={`${styles.skyStar} absolute size-2 rounded-full`} style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s` }} />
      ))}
      <div className={`${styles.moon} absolute right-[8%] top-[14%] size-[clamp(40px,8vh,70px)] rounded-full`} />
      <div className={`${styles.hill} absolute inset-x-0 bottom-0 h-[12vh]`} />
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
        {sky}
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Lighting the castle candles…</p>
      </div>
    );
  }

  return (
    <div className={`${styles.screen} fixed inset-0 box-border flex h-dvh w-full flex-col items-center overflow-hidden px-3 pb-3 pt-20 font-baloo2 short:pt-2 lg:pt-4`}>
      {sky}

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
            <div className={`${styles.resultBanner} px-[clamp(26px,5vw,52px)] py-[clamp(8px,1.6vh,14px)] text-[clamp(20px,3.8vh,34px)] font-extrabold`}>{resultHeadline(score, total)}</div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You found {score} of {total} C pictures!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(30,16,60,0.4)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => nameWindows(round)}
              disabled={stage !== "choosing"}
              aria-label="Hear the pictures again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-end pb-[3vh]">
            <div className="relative flex flex-col items-center">
              <div className="flex items-end gap-1">
                <div className={`${styles.pole} h-[clamp(56px,11vh,96px)] w-1.5`} />
                <div className={`${styles.pennant} mb-[clamp(18px,4vh,40px)] flex items-baseline gap-1 py-1 pl-3 pr-8 leading-none`} aria-label={`The letter ${LETTER.shown}`}>
                  <span className="text-[clamp(32px,6.4vh,58px)] font-extrabold">{LETTER.shown[0]}</span>
                  <span className="text-[clamp(26px,5.2vh,48px)] font-extrabold">{LETTER.shown[1]}</span>
                </div>
              </div>
              <div className={`${styles.battlement} h-[clamp(14px,2.6vh,24px)] w-full`} />
              <div className={`${styles.wall} flex items-end gap-[clamp(10px,3vw,36px)] rounded-b-md px-[clamp(12px,3vw,36px)] pb-[clamp(12px,2.4vh,24px)] pt-[clamp(14px,3vh,30px)]`}>
                {round.choices.map((word, i) => {
                  const isPicked = picked === word;
                  const won = isPicked && word === round.answer;
                  const isOpen = i < opened;
                  return (
                    <div key={`${round.key}-${word}`} className="relative">
                      <button
                        type="button"
                        onClick={() => choose(word)}
                        disabled={stage !== "choosing"}
                        aria-label={isOpen ? WORDS[word].name : "Closed window"}
                        className={cn(
                          styles.window,
                          "relative flex aspect-[4/5] w-[clamp(84px,min(25vw,24vh),180px)] items-center justify-center p-[12%]",
                          naming === i && styles.windowNaming,
                          won && styles.windowWon,
                          isPicked && !won && styles.windowWrong,
                          reveal === word && styles.windowReveal,
                        )}
                      >
                        {isOpen && <Image src={WORDS[word].image} alt="" width={256} height={256} loading="eager" draggable={false} className={`${styles.picture} pointer-events-none size-full select-none object-contain`} />}
                        <span aria-hidden className={cn(styles.shutter, styles.shutterLeft, isOpen && styles.shutterOpenLeft)} />
                        <span aria-hidden className={cn(styles.shutter, styles.shutterRight, isOpen && styles.shutterOpenRight)} />
                        {isPicked && !won && (
                          <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-2 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                            ✕
                          </span>
                        )}
                      </button>
                      {reveal === word && (
                        <span className={`${styles.revealTag} absolute -top-9 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[clamp(13px,2.2vh,18px)] font-extrabold`}>{REVEAL_TEXT}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
