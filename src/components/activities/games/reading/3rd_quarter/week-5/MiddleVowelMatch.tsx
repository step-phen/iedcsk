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
  LISTEN,
  REVEAL_TEXT,
  VOWELS,
  WORDS,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  type VowelId,
} from "./MiddleVowelMatch.data";
import styles from "./MiddleVowelMatch.module.css";

interface Round {
  key: string;
  word: string;
  answer: VowelId;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Stage = "listening" | "choosing" | "feedback";

const FILLING_STYLES: Record<VowelId, string> = { a: styles.cheese, e: styles.tomato, i: styles.lettuce };

function buildRound(row: QuestionRow): Round {
  const { word } = row.questionData as { word: unknown };
  if (typeof word !== "string" || !Object.hasOwn(WORDS, word) || word.length !== 3) {
    throw new Error(`Question ${row.questionKey} needs a known three-letter "word"`);
  }
  const answer = row.correctAnswer.answer;
  if (answer !== word[1] || !VOWELS.some((v) => v.id === answer)) {
    throw new Error(`Question ${row.questionKey} must answer with the word's middle vowel`);
  }
  return { key: row.questionKey, word, answer: answer as VowelId };
}

export default function MiddleVowelMatch({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Middle Vowel Match questions:", err);
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
  const [picked, setPicked] = useState<VowelId | null>(null);
  const [reveal, setReveal] = useState<VowelId | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Middle Vowel Match";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  const ask = useCallback(
    (r: Round) => {
      setStage("listening");
      speak(promptSpeech(r.word), () => setStage("choosing"));
    },
    [speak],
  );

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["middle vowel match"]], () => ask(round));
      return;
    }
    speak(LISTEN, () => ask(round));
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
    (vowel: VowelId) => {
      if (stage !== "choosing" || !round) return;
      setStage("feedback");
      setPicked(vowel);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: vowel }];
      const earned = vowel === round.answer;
      setResults((r) => [...r, earned]);
      if (earned) {
        speak(correctSpeech(round.word, roundIndex), advance);
        return;
      }
      setReveal(round.answer);
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

  const backdrop = <div aria-hidden className={`${styles.checks} pointer-events-none absolute inset-x-0 bottom-0 h-[38%]`} />;

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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Making the sandwiches…</p>
      </div>
    );
  }

  // The middle of the sandwich shows the vowel once it is chosen right, or once the right one is revealed.
  const middle = (picked === round.answer ? picked : reveal) ?? null;

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
            <div className={`${styles.menu} rounded-2xl px-[clamp(26px,5vw,52px)] py-[clamp(8px,1.6vh,14px)] text-[clamp(20px,3.8vh,34px)] font-extrabold`}>{resultHeadline(score, total)}</div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You found {score} of {total} middle sounds!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(90,50,20,0.3)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => ask(round)}
              disabled={stage !== "choosing"}
              aria-label="Hear the word again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,32px)]">
            <div key={round.key} className={`${styles.plate} ${styles.slideIn} flex aspect-square w-[clamp(110px,24vh,210px)] items-center justify-center rounded-full`}>
              <span aria-label={WORDS[round.word].name} className="select-none text-[clamp(56px,13vh,120px)] leading-none">{WORDS[round.word].emoji}</span>
            </div>

            <div className="flex items-stretch" aria-label={`${round.word[0]}, blank, ${round.word[2]}`}>
              <span className={`${styles.bread} ${styles.breadLeft} flex w-[clamp(70px,13vh,120px)] items-center justify-center text-[clamp(44px,9vh,84px)] font-extrabold leading-none`}>{round.word[0]}</span>
              <span
                className={cn(
                  styles.slot,
                  "flex w-[clamp(70px,13vh,120px)] items-center justify-center text-[clamp(44px,9vh,84px)] font-extrabold leading-none",
                  middle && FILLING_STYLES[middle],
                  middle && styles.slotFilled,
                  reveal && styles.slotReveal,
                )}
              >
                {middle ?? "?"}
              </span>
              <span className={`${styles.bread} ${styles.breadRight} flex w-[clamp(70px,13vh,120px)] items-center justify-center text-[clamp(44px,9vh,84px)] font-extrabold leading-none`}>{round.word[2]}</span>
            </div>

            <div className="flex items-center justify-center gap-[clamp(14px,4vw,40px)]">
              {VOWELS.map((v) => {
                const isPicked = picked === v.id;
                const won = isPicked && v.id === round.answer;
                return (
                  <div key={v.id} className="relative">
                    <button
                      type="button"
                      onClick={() => choose(v.id)}
                      disabled={stage !== "choosing"}
                      aria-label={`${v.id}, ${v.filling}`}
                      className={cn(
                        styles.filling,
                        FILLING_STYLES[v.id],
                        "flex size-[clamp(76px,15vh,132px)] items-center justify-center rounded-[30%] text-[clamp(44px,9vh,80px)] font-extrabold leading-none",
                        won && styles.fillingWon,
                        isPicked && !won && styles.fillingWrong,
                        reveal === v.id && styles.fillingReveal,
                      )}
                    >
                      {v.id}
                    </button>
                    {isPicked && !won && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-2 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                    {reveal === v.id && (
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
