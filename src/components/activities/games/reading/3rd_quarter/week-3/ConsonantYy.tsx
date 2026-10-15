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
} from "./ConsonantYy.data";
import styles from "./ConsonantYy.module.css";

interface Round {
  key: string;
  /** Left yo-yo to right yo-yo, in the order they drop down. */
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

const YOYO_TINTS = [styles.tintRed, styles.tintBlue, styles.tintGreen];

function buildRound(row: QuestionRow): Round {
  const { choices } = row.questionData as { choices: unknown };
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every((w) => typeof w === "string" && Object.hasOwn(WORDS, w))) {
    throw new Error(`Question ${row.questionKey} needs three known "choices"`);
  }
  const yWords = (choices as string[]).filter((w) => WORDS[w].isY);
  if (yWords.length !== 1 || yWords[0] !== row.correctAnswer.answer) {
    throw new Error(`Question ${row.questionKey} needs exactly one Y picture, and it must be the answer`);
  }
  return { key: row.questionKey, choices: choices as string[], answer: row.correctAnswer.answer };
}

export default function ConsonantYy({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Consonant Yy questions:", err);
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
  const [shown, setShown] = useState(0);
  const [naming, setNaming] = useState(-1);
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Consonant Yy";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  // Each yo-yo spins down its string while the name is spoken, then the question opens tapping.
  const dropYoyos = useCallback(
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
            setShown((n) => Math.max(n, i + 1));
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
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["consonant yy"]], () => dropYoyos(round));
      return;
    }
    speak(LISTEN, () => dropYoyos(round));
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    setReveal(null);
    setShown(0);
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


  const backdrop = (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={`${styles.spotlight} absolute left-1/2 top-0 h-full w-[min(120vw,900px)] -translate-x-1/2`} />
      <div className={`${styles.curtain} absolute inset-y-0 left-0 w-[9vw]`} />
      <div className={`${styles.curtain} absolute inset-y-0 right-0 w-[9vw] -scale-x-100`} />
      <div className={`${styles.stage} absolute inset-x-0 bottom-0 h-[13vh]`} />
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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Winding up the yo-yos…</p>
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
            <div className={`${styles.marquee} rounded-2xl px-[clamp(26px,5vw,52px)] py-[clamp(8px,1.6vh,14px)] text-[clamp(20px,3.8vh,34px)] font-extrabold`}>{resultHeadline(score, total)}</div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You found {score} of {total} Y pictures!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(20,10,40,0.45)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => dropYoyos(round)}
              disabled={stage !== "choosing"}
              aria-label="Hear the pictures again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(10px,2.4vh,24px)] pb-[2vh]">
            <div className={`${styles.marquee} flex items-baseline gap-1 rounded-2xl px-[clamp(22px,3.4vw,34px)] py-1.5 leading-none`} aria-label={`The letter ${LETTER.shown}`}>
              <span className="text-[clamp(36px,7vh,68px)] font-extrabold">{LETTER.shown[0]}</span>
              <span className="text-[clamp(28px,5.8vh,54px)] font-extrabold">{LETTER.shown[1]}</span>
            </div>

            {/* --w is one yo-yo's width; the string, drop distance and column height are all measured from it. */}
            <div className="flex flex-col items-center [--w:clamp(80px,min(25vw,16vh),150px)]">
              <div aria-hidden className={`${styles.bar} h-[clamp(10px,1.8vh,16px)] w-[calc(var(--w)*3+clamp(10px,4vw,48px)*2+40px)] max-w-[96vw] rounded-full`} />
              <div className="flex items-start justify-center gap-[clamp(10px,4vw,48px)]">
                {round.choices.map((word, i) => {
                  const isPicked = picked === word;
                  const won = isPicked && word === round.answer;
                  const isShown = i < shown;
                  return (
                    <div key={`${round.key}-${word}`} className="relative">
                      <button
                        type="button"
                        onClick={() => choose(word)}
                        disabled={stage !== "choosing"}
                        aria-label={isShown ? WORDS[word].name : "Yo-yo"}
                        className={cn(
                          styles.yoyoButton,
                          "relative block h-[calc(var(--w)*2.3)] w-[var(--w)]",
                          naming === i && styles.yoyoNaming,
                          won && styles.yoyoWon,
                          isPicked && !won && styles.yoyoWrong,
                          reveal === word && styles.yoyoReveal,
                        )}
                      >
                        <span aria-hidden className={cn(styles.string, "absolute left-1/2 top-0 block w-[3px] -translate-x-1/2", isShown ? "h-[calc(var(--w)*1.8)]" : "h-[calc(var(--w)*0.3)]")} />
                        <span className={cn(styles.yoyo, "absolute left-0 block size-[var(--w)] rounded-full", isShown ? "top-[calc(var(--w)*1.3)]" : "top-0")}>
                          <span aria-hidden className={cn(styles.ring, YOYO_TINTS[i], "absolute inset-0 block rounded-full", naming === i && styles.spinning)} />
                          <span className={cn(styles.hub, "absolute inset-[16%] flex items-center justify-center rounded-full")}>
                            {isShown && <span aria-hidden className="pointer-events-none select-none text-[clamp(28px,5.6vh,58px)] leading-none">{WORDS[word].emoji}</span>}
                          </span>
                        </span>
                      </button>
                      {isPicked && !won && (
                        <span aria-hidden className={`${styles.wrongMark} absolute -right-2 bottom-[calc(var(--w)*0.8)] z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                          ✕
                        </span>
                      )}
                      {reveal === word && (
                        <span className={`${styles.revealTag} absolute left-1/2 top-[calc(var(--w)*0.8)] z-[3] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[clamp(13px,2.2vh,18px)] font-extrabold`}>{REVEAL_TEXT}</span>
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
