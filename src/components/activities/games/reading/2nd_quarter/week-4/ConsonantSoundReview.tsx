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
  LETTERS,
  REVEAL_TEXT,
  WORDS,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./ConsonantSoundReview.data";
import styles from "./ConsonantSoundReview.module.css";

interface Round {
  key: string;
  word: string;
  /** Letters on the train cars, left to right. */
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

const CAR_COLORS = [styles.carRed, styles.carBlue, styles.carYellow];

function buildRound(row: QuestionRow): Round {
  const { word, choices } = row.questionData as { word: unknown; choices: unknown };
  if (typeof word !== "string" || !Object.hasOwn(WORDS, word)) throw new Error(`Question ${row.questionKey} needs a known "word"`);
  if (!Array.isArray(choices) || choices.length !== 3 || new Set(choices).size !== 3 || !choices.every((c) => typeof c === "string" && LETTERS.includes(c))) {
    throw new Error(`Question ${row.questionKey} needs three different taught letters in "choices"`);
  }
  const answer = row.correctAnswer.answer;
  if (answer !== WORDS[word].letter || !choices.includes(answer)) {
    throw new Error(`Question ${row.questionKey}'s answer must be ${WORDS[word].letter} and be one of the choices`);
  }
  return { key: row.questionKey, word, choices: choices as string[], answer };
}

export default function ConsonantSoundReview({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Consonant Sound Review questions:", err);
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
  const [shown, setShown] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Consonant Sound Review 1";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  // The picture appears on the station board as its name is spoken, then the train cars open for tapping.
  const ask = useCallback(
    (r: Round) => {
      setStage("listening");
      speak(promptSpeech(r.word), () => setStage("choosing"), { onStart: () => setShown(true) });
    },
    [speak],
  );

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["consonant sound review 1"]], () => ask(round));
      return;
    }
    ask(round);
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    setReveal(null);
    setShown(false);
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
      <div className={`${styles.hills} absolute inset-x-0 bottom-[10vh] h-[18vh]`} />
      <div className={`${styles.track} absolute inset-x-0 bottom-0 h-[10vh]`} />
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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>The train is coming…</p>
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
        <div className={`${styles.badge} fixed right-3 top-3 z-10 flex items-center gap-0.5 rounded-full px-2.5 py-1.5`} aria-label={`Score: ${score} of ${total}`}>
          {rounds.map((r, i) => (
            <Image
              key={r.key}
              src={results[i] ? ASSETS.starFilled : ASSETS.starEmpty}
              alt=""
              width={128}
              height={128}
              loading="eager"
              className={cn("size-[clamp(16px,2.8vh,24px)] object-contain transition-transform", i === roundIndex && "scale-125")}
            />
          ))}
        </div>
      )}

      <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(26px,5.5vh,46px)] font-extrabold leading-tight`}>{title}</h1>

      {phase === "complete" ? (
        <div className={`${styles.result} relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center`}>
          <div className="flex items-center gap-3">
            <div className={`${styles.board} rounded-xl px-[clamp(26px,5vw,52px)] py-[clamp(8px,1.6vh,14px)] text-[clamp(20px,3.8vh,34px)] font-extrabold`}>{resultHeadline(score, total)}</div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You matched {score} of {total} pictures!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-[clamp(4px,1vw,10px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(30px,6vh,56px)] object-contain drop-shadow-[0_4px_3px_rgba(30,40,70,0.3)]" />
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
              aria-label="Hear the picture again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(10px,3vh,32px)] pb-[6vh]">
            <div className={`${styles.board} flex size-[clamp(110px,24vh,210px)] items-center justify-center rounded-2xl`}>
              {shown && (
                <span key={round.key} aria-label={WORDS[round.word].name} className={`${styles.picture} select-none text-[clamp(64px,15vh,130px)] leading-none`}>
                  {WORDS[round.word].emoji}
                </span>
              )}
            </div>

            <div key={round.key} className={`${styles.train} flex items-end gap-[clamp(4px,1vw,10px)]`}>
              <span aria-hidden className={`${styles.engine} relative h-[clamp(70px,14vh,120px)] w-[clamp(54px,11vh,96px)]`} />
              {round.choices.map((letter, i) => {
                const isPicked = picked === letter;
                const won = isPicked && letter === round.answer;
                return (
                  <div key={letter} className="relative">
                    <button
                      type="button"
                      onClick={() => choose(letter)}
                      disabled={stage !== "choosing"}
                      aria-label={`Letter ${letter}`}
                      className={cn(
                        styles.car,
                        CAR_COLORS[i],
                        "relative flex h-[clamp(70px,14vh,120px)] w-[clamp(80px,min(24vw,17vh),150px)] items-center justify-center gap-0.5 rounded-xl pb-[8%] leading-none",
                        won && styles.carWon,
                        isPicked && !won && styles.carWrong,
                        reveal === letter && styles.carReveal,
                      )}
                    >
                      <span className="text-[clamp(32px,7vh,60px)] font-extrabold">{letter}</span>
                      <span className="text-[clamp(26px,5.6vh,48px)] font-extrabold">{letter.toLowerCase()}</span>
                      {isPicked && !won && (
                        <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-2 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                          ✕
                        </span>
                      )}
                    </button>
                    {reveal === letter && (
                      <span className={`${styles.revealTag} absolute -top-10 left-1/2 z-[3] -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-0.5 text-[clamp(13px,2.2vh,18px)] font-extrabold`}>{REVEAL_TEXT}</span>
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
