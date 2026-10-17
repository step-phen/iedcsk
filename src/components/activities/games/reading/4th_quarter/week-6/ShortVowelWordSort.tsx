"use client";

import { useState, useCallback, useRef, useEffect, type CSSProperties } from "react";
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
  LOCKER_COLORS,
  QUESTION,
  REVEAL_TEXT,
  VOWELS,
  correctSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./ShortVowelWordSort.data";
import styles from "./ShortVowelWordSort.module.css";

interface Round {
  key: string;
  word: string;
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

function buildRound(row: QuestionRow): Round {
  const { word, choices } = row.questionData as { word: unknown; choices: unknown };
  if (typeof word !== "string" || !/^[a-z]{3}$/.test(word)) {
    throw new Error(`Question ${row.questionKey} needs a three-letter "word"`);
  }
  if (!Array.isArray(choices) || choices.length < 2 || !choices.every((c) => VOWELS.includes(c))) {
    throw new Error(`Question ${row.questionKey} needs vowel "choices"`);
  }
  const answer = row.correctAnswer.answer;
  if (!choices.includes(answer) || word[1] !== answer) {
    throw new Error(`Question ${row.questionKey} must have the word's middle vowel as its answer`);
  }
  return { key: row.questionKey, word, answer, choices };
}

export default function ShortVowelWordSort({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Short Vowel Word Sort questions:", err);
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
  const title = activityName || "Short Vowel Word Sort";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  const askQuestion = useCallback(() => {
    setStage("listening");
    speak(QUESTION, undefined, { onStart: () => setStage("choosing") });
  }, [speak]);

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["short vowel word sort"]], askQuestion);
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
    (vowel: string) => {
      if (stage !== "choosing" || !round) return;
      setStage("feedback");
      setPicked(vowel);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: vowel }];
      const earned = vowel === round.answer;
      setResults((r) => [...r, earned]);
      if (earned) {
        speak(correctSpeech(round.word, round.answer, roundIndex), advance);
        return;
      }
      setReveal(round.answer);
      speak(revealSpeech(round.word, round.answer), advance, { minMs: REVEAL_MIN_MS });
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
      <div aria-hidden className={`${styles.hallWall} pointer-events-none absolute inset-x-0 top-0 h-[70%]`} />
      <div aria-hidden className={`${styles.hallFloor} pointer-events-none absolute inset-x-0 bottom-0 h-[30%]`} />
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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Opening the lockers…</p>
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
            You sorted {score} of {total} words!
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
              onClick={askQuestion}
              disabled={stage !== "choosing"}
              aria-label="Hear the question again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(10px,3vh,32px)]">
            <div key={round.key} className={`${styles.backpack} relative flex flex-col items-center rounded-[28px_28px_18px_18px] px-[clamp(22px,5vw,48px)] pb-[clamp(10px,2vh,18px)] pt-[clamp(18px,3.6vh,32px)]`}>
              <span aria-hidden className={`${styles.strap} absolute -top-[clamp(10px,2vh,18px)] left-1/2 h-[clamp(18px,3.6vh,30px)] w-[44%] -translate-x-1/2 rounded-t-full`} />
              <span className={`${styles.tag} rounded-xl px-[clamp(14px,3vw,26px)] py-[clamp(2px,0.6vh,6px)] text-[clamp(40px,9vh,84px)] font-extrabold leading-none tracking-wider`}>{round.word}</span>
            </div>

            <div className="flex w-[min(98vw,760px)] items-end justify-center gap-[clamp(4px,1.2vw,12px)]">
              {round.choices.map((vowel) => {
                const isPicked = picked === vowel;
                const won = isPicked && vowel === round.answer;
                return (
                  <div key={`${round.key}-${vowel}`} className="relative w-[clamp(54px,min(18vw,15vh),130px)]">
                    <button
                      type="button"
                      onClick={() => choose(vowel)}
                      disabled={stage !== "choosing"}
                      aria-label={`Short ${vowel}`}
                      style={{ "--door": LOCKER_COLORS[vowel] } as CSSProperties}
                      className={cn(
                        styles.locker,
                        "relative flex aspect-[1/2] w-full items-center justify-center rounded-md",
                        won && styles.lockerWon,
                        isPicked && !won && styles.lockerWrong,
                        reveal === vowel && styles.lockerReveal,
                      )}
                    >
                      {won && <span className={`${styles.inside} absolute inset-[6%] flex items-center justify-center rounded-sm text-[clamp(14px,2.6vh,22px)] font-extrabold`}>{round.word}</span>}
                      <span className={`${styles.door} absolute inset-[4%] flex flex-col items-center justify-start gap-[6%] rounded-sm pt-[14%]`}>
                        <span aria-hidden className={`${styles.vents} h-[14%] w-[60%]`} />
                        <span className="text-[clamp(30px,6.4vh,58px)] font-extrabold leading-none">{vowel}</span>
                        <span aria-hidden className={`${styles.handle} absolute right-[12%] top-1/2 h-[12%] w-[10%] rounded-full`} />
                      </span>
                    </button>
                    {isPicked && !won && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-2 z-[3] flex size-8 items-center justify-center rounded-full text-lg font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                    {reveal === vowel && (
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
