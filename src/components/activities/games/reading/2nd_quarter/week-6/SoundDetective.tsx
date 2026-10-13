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
  CARDS,
  INSTRUCTION,
  LETTERS,
  NEXT,
  REVEAL_TEXT,
  WORDS,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./SoundDetective.data";
import styles from "./SoundDetective.module.css";

interface Round {
  key: string;
  word: string;
  /** Clue card letters, left to right. */
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

function buildRound(row: QuestionRow): Round {
  const { word, choices } = row.questionData as { word: unknown; choices: unknown };
  if (typeof word !== "string" || !Object.hasOwn(WORDS, word)) throw new Error(`Question ${row.questionKey} needs a known "word"`);
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every((c) => typeof c === "string" && LETTERS.includes(c)) || new Set(choices).size !== 3) {
    throw new Error(`Question ${row.questionKey} needs three different taught "choices"`);
  }
  const answer = row.correctAnswer.answer;
  if (answer !== WORDS[word].letter || !choices.includes(answer)) {
    throw new Error(`Question ${row.questionKey} needs its picture's first letter as the answer, among the choices`);
  }
  return { key: row.questionKey, word, choices: choices as string[], answer };
}

export default function SoundDetective({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Sound Detective questions:", err);
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
  const [focused, setFocused] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Sound Detective";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  // The picture comes into focus under the glass as its name is spoken.
  const ask = useCallback(
    (r: Round) => {
      setStage("listening");
      speak(promptSpeech(r.word), () => setStage("choosing"), { onStart: () => setFocused(true) });
    },
    [speak],
  );

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["sound detective"]], () => ask(round));
      return;
    }
    speak(NEXT, () => ask(round));
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    setReveal(null);
    setFocused(false);
    setStage("listening");
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  const choose = useCallback(
    (letter: string) => {
      if (stage !== "choosing" || !round) return;
      setStage("feedback");
      setPicked(letter);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: letter }];
      const earned = letter === round.answer;
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

  const backdrop = (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className={`${styles.frame} absolute inset-[clamp(6px,1.4vw,14px)] rounded-2xl`} />
      <svg className="absolute inset-0 size-full opacity-60" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path d="M6 30 Q30 42 50 28 T94 36" stroke="#c2272d" strokeWidth="0.5" fill="none" />
        <path d="M8 74 Q34 60 58 76 T92 70" stroke="#c2272d" strokeWidth="0.5" fill="none" />
      </svg>
      <span className={`${styles.footprint} absolute bottom-[6%] left-[6%] size-8`} />
      <span className={`${styles.footprint} absolute bottom-[12%] left-[11%] size-8 rotate-12`} />
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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Pinning up the clues…</p>
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
            <div className={`${styles.sign} rounded-2xl px-[clamp(26px,5vw,52px)] py-[clamp(8px,1.6vh,14px)] text-[clamp(20px,3.8vh,34px)] font-extrabold`}>{resultHeadline(score, total)}</div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You solved {score} of {total} clues!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(40,24,10,0.4)]" />
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
              aria-label="Hear the picture name again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-evenly">
            {/* Magnifying glass: the lens holds the picture, the handle points down-right. */}
            <div key={round.key} className={`${styles.glassIn} relative`}>
              <div className={cn(styles.lens, "relative flex size-[clamp(104px,23vh,200px)] items-center justify-center rounded-full", focused && styles.lensFocused)} aria-label={WORDS[round.word].name}>
                <span aria-hidden className={cn(styles.picture, "select-none text-[clamp(52px,12vh,110px)] leading-none", focused && styles.pictureFocused)}>
                  {WORDS[round.word].emoji}
                </span>
                <span aria-hidden className={`${styles.glint} absolute left-[18%] top-[14%] h-[22%] w-[12%] rounded-full`} />
              </div>
              <span aria-hidden className={`${styles.handle} absolute -bottom-[26%] -right-[20%] h-[clamp(52px,11vh,96px)] w-[clamp(16px,3.2vh,28px)] rounded-full`} />
            </div>

            <div className="flex w-[min(96vw,680px)] items-start justify-around">
              {round.choices.map((letter, i) => {
                const isPicked = picked === letter;
                const won = isPicked && letter === round.answer;
                const card = CARDS[i % CARDS.length];
                return (
                  <div key={`${round.key}-${letter}`} className="relative" style={{ rotate: `${card.tilt}deg` }}>
                    <button
                      type="button"
                      onClick={() => choose(letter)}
                      disabled={stage !== "choosing"}
                      aria-label={`Clue card ${letter}`}
                      className={cn(
                        styles.card,
                        "relative flex aspect-[4/5] w-[clamp(80px,min(25vw,17vh),150px)] items-center justify-center rounded-lg",
                        won && styles.cardWon,
                        isPicked && !won && styles.cardWrong,
                        reveal === letter && styles.cardReveal,
                      )}
                      style={{ "--paper": card.paper } as React.CSSProperties}
                    >
                      <span aria-hidden className={`${styles.pin} absolute -top-2 left-1/2 size-5 -translate-x-1/2 rounded-full`} />
                      <span className="flex items-baseline font-extrabold leading-none">
                        <span className="text-[clamp(34px,7vh,64px)]">{letter}</span>
                        <span className="text-[clamp(26px,5.4vh,50px)]">{letter.toLowerCase()}</span>
                      </span>
                      {won && <span aria-hidden className={`${styles.stamp} absolute bottom-1 right-1 rounded px-1.5 text-[clamp(10px,1.8vh,15px)] font-extrabold`}>SOLVED</span>}
                    </button>
                    {isPicked && !won && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-2 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                    {reveal === letter && (
                      <span className={`${styles.revealTag} absolute -bottom-8 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[clamp(13px,2.2vh,18px)] font-extrabold`}>{REVEAL_TEXT}</span>
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
