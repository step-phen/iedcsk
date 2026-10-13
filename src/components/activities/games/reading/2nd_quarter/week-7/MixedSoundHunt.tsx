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
  NEXT,
  PILES,
  REVEAL_TEXT,
  SOUNDS,
  WORDS,
  correctSpeech,
  questionSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
  soundSpeech,
} from "./MixedSoundHunt.data";
import styles from "./MixedSoundHunt.module.css";

interface Round {
  key: string;
  /** The letter whose sound is hunted this round. */
  sound: string;
  /** Leaf piles, left to right, in the order they blow away. */
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
  const { sound, choices } = row.questionData as { sound: unknown; choices: unknown };
  if (typeof sound !== "string" || !Object.hasOwn(SOUNDS, sound)) throw new Error(`Question ${row.questionKey} needs a taught "sound" letter`);
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every((w) => typeof w === "string" && Object.hasOwn(WORDS, w))) {
    throw new Error(`Question ${row.questionKey} needs three known "choices"`);
  }
  // Compared by sound, so a C round never hides a K picture too.
  const matches = (choices as string[]).filter((w) => SOUNDS[WORDS[w].letter] === SOUNDS[sound]);
  if (matches.length !== 1 || matches[0] !== row.correctAnswer.answer) {
    throw new Error(`Question ${row.questionKey} needs exactly one picture with the sound, and it must be the answer`);
  }
  return { key: row.questionKey, sound, choices: choices as string[], answer: row.correctAnswer.answer };
}

export default function MixedSoundHunt({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Mixed Sound Hunt questions:", err);
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
  const [uncovered, setUncovered] = useState(0);
  const [naming, setNaming] = useState(-1);
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Mixed Sound Hunt";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  // The sound is played first, then each leaf pile blows away as its picture is named, then the question opens tapping.
  const hunt = useCallback(
    (r: Round) => {
      setStage("naming");
      const step = (i: number) => {
        if (i >= r.choices.length) {
          setNaming(-1);
          setStage("choosing");
          speak(questionSpeech(r.sound));
          return;
        }
        speak(WORDS[r.choices[i]].name, () => step(i + 1), {
          onStart: () => {
            setUncovered((n) => Math.max(n, i + 1));
            setNaming(i);
          },
        });
      };
      speak(soundSpeech(r.sound), () => step(0));
    },
    [speak],
  );

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["mixed sound hunt"]], () => hunt(round));
      return;
    }
    speak(NEXT, () => hunt(round));
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    setReveal(null);
    setUncovered(0);
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
      <div className={`${styles.trunk} absolute -left-6 bottom-[22%] top-0 w-16`} />
      <div className={`${styles.canopy} absolute -left-24 -top-16 h-56 w-72 rounded-full`} />
      <span className={`${styles.falling} absolute left-[30%] top-0 size-5`} />
      <span className={`${styles.falling} ${styles.fallingLate} absolute left-[72%] top-0 size-4`} />
      <div className={`${styles.lawn} absolute inset-x-0 bottom-0 h-[28%]`} />
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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Raking up the leaves…</p>
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
            You found {score} of {total} pictures!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(74,40,16,0.3)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => hunt(round)}
              disabled={stage !== "choosing"}
              aria-label="Hear the sound again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(10px,3vh,30px)]">
            {/* Wooden garden stake showing the letter being hunted. */}
            <div key={round.key} className={`${styles.stakeIn} flex flex-col items-center`}>
              <div className={`${styles.sign} flex items-baseline gap-1 rounded-xl px-[clamp(18px,3vw,30px)] py-1 leading-none`} aria-label={`The ${round.sound} sound`}>
                <span className="text-[clamp(36px,7.4vh,70px)] font-extrabold">{round.sound}</span>
                <span className="text-[clamp(28px,6vh,56px)] font-extrabold">{round.sound.toLowerCase()}</span>
              </div>
              <span aria-hidden className={`${styles.stake} h-[clamp(14px,3vh,28px)] w-3`} />
            </div>

            <div className="flex w-[min(96vw,700px)] items-end justify-around">
              {round.choices.map((word, i) => {
                const isPicked = picked === word;
                const won = isPicked && word === round.answer;
                const isOpen = i < uncovered;
                const pile = PILES[i % PILES.length];
                return (
                  <div key={`${round.key}-${word}`} className="relative w-[clamp(92px,min(28vw,24vh),190px)]">
                    <button
                      type="button"
                      onClick={() => choose(word)}
                      disabled={stage !== "choosing"}
                      aria-label={isOpen ? WORDS[word].name : "Pile of leaves"}
                      className={cn(
                        styles.spot,
                        "relative flex aspect-[5/4] w-full items-end justify-center rounded-[50%_50%_18%_18%]",
                        naming === i && styles.spotNaming,
                        won && styles.spotWon,
                        isPicked && !won && styles.spotWrong,
                        reveal === word && styles.spotReveal,
                      )}
                    >
                      <span aria-hidden className={cn("pointer-events-none mb-[8%] select-none text-[clamp(40px,9vh,88px)] leading-none", isOpen ? styles.peek : "opacity-0")}>
                        {WORDS[word].emoji}
                      </span>
                      <span
                        aria-hidden
                        className={cn(styles.pile, "absolute inset-x-[-4%] bottom-0 h-[86%] rounded-[50%_50%_14%_14%]", isOpen && styles.pileGone)}
                        style={{ "--leafA": pile.a, "--leafB": pile.b } as React.CSSProperties}
                      />
                    </button>
                    {isPicked && !won && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 -top-2 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                    {reveal === word && (
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
