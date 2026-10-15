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
  FIRST_QUESTION,
  INSTRUCTION,
  NEXT_QUESTION,
  REVEAL_TEXT,
  WORDS,
  correctSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./CvcPictureHunt.data";
import styles from "./CvcPictureHunt.module.css";

interface Round {
  key: string;
  word: string;
  /** Bushes in reading order: top-left, top-right, bottom-left, bottom-right. */
  choices: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Stage = "asking" | "choosing" | "feedback";

const BUSH_TINTS = [styles.bushFern, styles.bushMoss, styles.bushLime, styles.bushPine];

function buildRound(row: QuestionRow): Round {
  const { word, choices } = row.questionData as { word: unknown; choices: unknown };
  if (typeof word !== "string" || !Object.hasOwn(WORDS, word) || row.correctAnswer.answer !== word) {
    throw new Error(`Question ${row.questionKey} needs a known "word" that is also the answer`);
  }
  if (!Array.isArray(choices) || choices.length !== 4 || new Set(choices).size !== 4 || !choices.every((w) => typeof w === "string" && Object.hasOwn(WORDS, w))) {
    throw new Error(`Question ${row.questionKey} needs four different known "choices"`);
  }
  if (!choices.includes(word)) throw new Error(`Question ${row.questionKey} must hide the word's own picture`);
  return { key: row.questionKey, word, choices: choices as string[] };
}

export default function CvcPictureHunt({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load CVC Picture Hunt questions:", err);
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
  const [stage, setStage] = useState<Stage>("asking");
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "CVC Picture Hunt";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  const ask = useCallback(
    (line: string) => {
      setStage("asking");
      speak(line, () => setStage("choosing"));
    },
    [speak],
  );

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["cvc picture hunt"]], () => ask(FIRST_QUESTION));
      return;
    }
    ask(NEXT_QUESTION);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    setReveal(null);
    setStage("asking");
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  const choose = useCallback(
    (word: string) => {
      if (stage !== "choosing" || !round) return;
      setStage("feedback");
      setPicked(word);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: word }];
      const earned = word === round.word;
      setResults((r) => [...r, earned]);
      if (earned) {
        speak(correctSpeech(word, roundIndex), advance);
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

  const backdrop = (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={`${styles.canopy} absolute inset-x-0 top-0 h-[16vh]`} />
      <div className={`${styles.vine} absolute left-[6vw] top-0 h-[38vh] w-[10px]`} />
      <div className={`${styles.vine} absolute right-[10vw] top-0 h-[28vh] w-[10px]`} />
      <div className={`${styles.ground} absolute inset-x-0 bottom-0 h-[18vh]`} />
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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Heading into the jungle…</p>
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
            <div className={`${styles.plank} rounded-xl px-[clamp(26px,5vw,52px)] py-[clamp(8px,1.6vh,14px)] text-[clamp(20px,3.8vh,34px)] font-extrabold`}>{resultHeadline(score, total)}</div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You found {score} of {total} pictures!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(20,50,20,0.35)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => ask(NEXT_QUESTION)}
              disabled={stage !== "choosing"}
              aria-label="Hear the question again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(8px,2vh,22px)] pb-[2vh]">
            {/* Wooden signpost with the printed word; it is read, never spoken, before the tap. */}
            <div key={round.key} className={`${styles.signIn} flex flex-col items-center`}>
              <div className={`${styles.plank} flex gap-[clamp(4px,1vw,10px)] rounded-xl px-[clamp(16px,3vw,30px)] py-[clamp(4px,0.8vh,8px)]`} aria-label={`The word ${round.word}`}>
                {round.word.split("").map((letter, i) => (
                  <span key={i} className={`${styles.letter} text-[clamp(40px,8.4vh,80px)] font-extrabold leading-none`}>
                    {letter}
                  </span>
                ))}
              </div>
              <span aria-hidden className={`${styles.post} block h-[clamp(10px,2.4vh,24px)] w-[clamp(10px,1.6vh,16px)]`} />
            </div>

            <div className="grid grid-cols-2 gap-x-[clamp(14px,5vw,56px)] gap-y-[clamp(6px,1.6vh,16px)]">
              {round.choices.map((word, i) => {
                const isPicked = picked === word;
                const won = isPicked && word === round.word;
                return (
                  <div key={`${round.key}-${word}`} className="relative w-[clamp(110px,min(36vw,20vh),190px)]">
                    <button
                      type="button"
                      onClick={() => choose(word)}
                      disabled={stage !== "choosing"}
                      aria-label={WORDS[word].name}
                      style={{ animationDelay: `${i * 140}ms` }}
                      className={cn(
                        styles.bushButton,
                        "relative block aspect-[5/4] w-full",
                        won && styles.bushWon,
                        isPicked && !won && styles.bushWrong,
                        reveal === word && styles.bushReveal,
                      )}
                    >
                      <span className={cn(styles.picture, "absolute left-[24%] top-0 flex aspect-square w-[52%] items-center justify-center")}>
                        <span aria-hidden className="pointer-events-none select-none text-[clamp(28px,6vh,60px)] leading-none">{WORDS[word].emoji}</span>
                      </span>
                      <span aria-hidden className={cn(styles.bush, BUSH_TINTS[i], "absolute inset-x-0 bottom-0 block h-[48%]")} />
                    </button>
                    {isPicked && !won && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 top-0 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                    {reveal === word && (
                      <span className={`${styles.revealTag} absolute -bottom-3 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[clamp(12px,2vh,17px)] font-extrabold`}>{REVEAL_TEXT}</span>
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
