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
  WORDS,
  correctSpeech,
  promptSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./BuildTheCvcWord.data";
import styles from "./BuildTheCvcWord.module.css";

interface Round {
  key: string;
  word: string;
  /** Letters in the mixed-up order the blocks start in. */
  letters: string[];
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Stage = "listening" | "building" | "feedback";

const BLOCK_COLORS = [styles.blockRed, styles.blockBlue, styles.blockGreen];

function buildRound(row: QuestionRow): Round {
  const { word, letters } = row.questionData as { word: unknown; letters: unknown };
  if (typeof word !== "string" || !Object.hasOwn(WORDS, word) || word.length !== 3) {
    throw new Error(`Question ${row.questionKey} needs a known three-letter "word"`);
  }
  if (!Array.isArray(letters) || letters.length !== 3 || [...letters].sort().join("") !== [...word].sort().join("")) {
    throw new Error(`Question ${row.questionKey} needs "letters" that spell the word when rearranged`);
  }
  if (row.correctAnswer.answer !== word) {
    throw new Error(`Question ${row.questionKey} must answer with its word`);
  }
  return { key: row.questionKey, word, letters: letters as string[] };
}

export default function BuildTheCvcWord({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Build the CVC Word questions:", err);
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
  // Block indexes in the order they were placed into the slots.
  const [placed, setPlaced] = useState<number[]>([]);
  const [wrongBlock, setWrongBlock] = useState<number | null>(null);
  const [reveal, setReveal] = useState(false);
  const [won, setWon] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Build the CVC Word";
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
      speak(promptSpeech(r.word), () => setStage("building"));
    },
    [speak],
  );

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["build the cvc word"]], () => ask(round));
      return;
    }
    speak(LISTEN, () => ask(round));
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPlaced([]);
    setWrongBlock(null);
    setReveal(false);
    setWon(false);
    setStage("listening");
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  // A block that does not fit the next slot ends the round, so the submitted spelling stops at that wrong letter.
  const tapBlock = useCallback(
    (i: number) => {
      if (stage !== "building" || !round || placed.includes(i)) return;
      const letter = round.letters[i];
      const built = placed.map((p) => round.letters[p]).join("") + letter;
      const fits = letter === round.word[placed.length];
      if (fits && built.length < round.word.length) {
        setPlaced([...placed, i]);
        return;
      }
      setStage("feedback");
      answersRef.current = [...answersRef.current, { questionId: round.key, response: built }];
      setResults((r) => [...r, fits]);
      if (fits) {
        setPlaced([...placed, i]);
        setWon(true);
        speak(correctSpeech(round.word, roundIndex), advance);
        return;
      }
      setWrongBlock(i);
      setReveal(true);
      speak(revealSpeech(round.word), advance, { minMs: REVEAL_MIN_MS });
    },
    [stage, round, placed, roundIndex, speak, advance],
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
      <div className={`${styles.wallpaper} absolute inset-0`} />
      <div className={`${styles.floor} absolute inset-x-0 bottom-0 h-[22%]`} />
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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Opening the toy box…</p>
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
            <div className={`${styles.banner} rounded-2xl px-[clamp(26px,5vw,52px)] py-[clamp(8px,1.6vh,14px)] text-[clamp(20px,3.8vh,34px)] font-extrabold`}>{resultHeadline(score, total)}</div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You built {score} of {total} words!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(40,30,80,0.3)]" />
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
              disabled={stage !== "building"}
              aria-label="Hear the word again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,30px)]">
            <div key={round.key} className={`${styles.frame} ${styles.popIn} flex aspect-square w-[clamp(104px,22vh,200px)] items-center justify-center rounded-3xl`}>
              <span aria-label={WORDS[round.word].name} className="select-none text-[clamp(56px,13vh,120px)] leading-none">{WORDS[round.word].emoji}</span>
            </div>

            <div className={cn(styles.shelf, "flex items-end gap-[clamp(6px,1.4vw,12px)] rounded-2xl px-[clamp(8px,2vw,16px)] pb-[clamp(8px,1.6vh,14px)] pt-[clamp(6px,1.2vh,10px)]", reveal && styles.shelfReveal)}>
              {[...round.word].map((target, slot) => {
                const blockIndex = placed[slot];
                const letter = reveal ? target : blockIndex !== undefined ? round.letters[blockIndex] : null;
                return (
                  <span
                    key={slot}
                    className={cn(
                      styles.slot,
                      "flex size-[clamp(68px,13vh,116px)] items-center justify-center rounded-xl text-[clamp(40px,8.4vh,76px)] font-extrabold leading-none",
                      letter && (reveal ? styles.slotReveal : BLOCK_COLORS[blockIndex]),
                      letter && styles.slotFilled,
                      won && styles.slotWon,
                    )}
                  >
                    {letter}
                  </span>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-[clamp(14px,4vw,40px)]">
              {round.letters.map((letter, i) => {
                const used = placed.includes(i);
                const wrong = wrongBlock === i;
                return (
                  <div key={`${round.key}-${i}`} className="relative">
                    <button
                      type="button"
                      onClick={() => tapBlock(i)}
                      disabled={stage !== "building" || used}
                      aria-label={`Letter ${letter}`}
                      className={cn(
                        styles.block,
                        BLOCK_COLORS[i],
                        "flex size-[clamp(72px,14vh,124px)] items-center justify-center rounded-xl text-[clamp(42px,9vh,80px)] font-extrabold leading-none",
                        used && styles.blockUsed,
                        wrong && styles.blockWrong,
                      )}
                    >
                      {letter}
                    </button>
                    {wrong && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-2 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {reveal && (
              <span className={`${styles.revealTag} rounded-full px-4 py-1 text-[clamp(14px,2.4vh,20px)] font-extrabold`}>{REVEAL_TEXT}</span>
            )}
          </main>
        </>
      )}
    </div>
  );
}
