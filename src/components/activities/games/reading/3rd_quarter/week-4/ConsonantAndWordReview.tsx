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
  LISTEN,
  PICTURES,
  REVEAL_TEXT,
  SOUNDS,
  WORDS,
  WORD_QUESTION,
  correctSoundSpeech,
  correctWordSpeech,
  promptLabel,
  resultHeadline,
  resultSpeech,
  revealSoundSpeech,
  revealWordSpeech,
  soundQuestion,
} from "./ConsonantAndWordReview.data";
import styles from "./ConsonantAndWordReview.module.css";

/** A sound round shows a picture and asks for its first (or last) letter; a word round blends a word and asks for its picture. */
type Round =
  | { key: string; kind: "sound"; picture: string; position: "first" | "last"; choices: string[]; answer: string }
  | { key: string; kind: "word"; word: string; choices: string[]; answer: string };

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Stage = "prompting" | "choosing" | "feedback";

const BALLOON_TINTS = [styles.tintRed, styles.tintBlue, styles.tintYellow];

function buildRound(row: QuestionRow): Round {
  const data = row.questionData as { kind?: unknown; picture?: unknown; position?: unknown; word?: unknown; choices?: unknown };
  const answer = row.correctAnswer.answer;
  const { choices } = data;
  if (!Array.isArray(choices) || choices.length !== 3 || !choices.every((c) => typeof c === "string") || !choices.includes(answer)) {
    throw new Error(`Question ${row.questionKey} needs three "choices" that include the answer`);
  }
  if (data.kind === "sound") {
    const { picture, position } = data;
    if (typeof picture !== "string" || !Object.hasOwn(PICTURES, picture) || (position !== "first" && position !== "last")) {
      throw new Error(`Question ${row.questionKey} needs a known "picture" and a "position" of first or last`);
    }
    if (!choices.every((c) => Object.hasOwn(LETTERS, c))) throw new Error(`Question ${row.questionKey} has an unknown letter choice`);
    return { key: row.questionKey, kind: "sound", picture, position, choices, answer };
  }
  if (data.kind === "word") {
    const { word } = data;
    if (typeof word !== "string" || word.length !== 3 || ![...word].every((l) => Object.hasOwn(SOUNDS, l)) || word !== answer) {
      throw new Error(`Question ${row.questionKey} needs a three-letter "word" with known sounds that is also the answer`);
    }
    if (!choices.every((c) => Object.hasOwn(WORDS, c))) throw new Error(`Question ${row.questionKey} has an unknown picture choice`);
    return { key: row.questionKey, kind: "word", word, choices, answer };
  }
  throw new Error(`Question ${row.questionKey} needs a "kind" of sound or word`);
}

export default function ConsonantAndWordReview({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Consonant and Word Review questions:", err);
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
  const [stage, setStage] = useState<Stage>("prompting");
  const [lit, setLit] = useState(-1);
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || "Consonant and Word Review";
  const score = results.filter(Boolean).length;

  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    setLearnerName(getLearnerFirstName());
    setPhotoUrl(getLearnerPhotoUrl());
  }, []);
  useEffect(() => stop, [stop]);

  // A sound round names its picture then asks; a word round lights each letter as its sound is heard, then asks.
  const playPrompt = useCallback(
    (r: Round) => {
      setStage("prompting");
      if (r.kind === "sound") {
        speak(PICTURES[r.picture].name, () => {
          setStage("choosing");
          speak(soundQuestion(r.picture, r.position));
        });
        return;
      }
      const step = (i: number) => {
        if (i >= r.word.length) {
          setLit(-1);
          setStage("choosing");
          speak(WORD_QUESTION);
          return;
        }
        speak(SOUNDS[r.word[i]], () => step(i + 1), { onStart: () => setLit(i) });
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
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["consonant and word review"]], () => playPrompt(round));
      return;
    }
    speak(LISTEN, () => playPrompt(round));
    // speak/speakAll are stable from useSpeech; re-running on round identity is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, roundIndex]);

  const advance = useCallback(() => {
    setPicked(null);
    setReveal(null);
    setLit(-1);
    setStage("prompting");
    if (roundIndex + 1 >= total) setPhase("complete");
    else setRoundIndex(roundIndex + 1);
  }, [roundIndex, total]);

  const choose = useCallback(
    (choice: string) => {
      if (stage !== "choosing" || !round) return;
      setStage("feedback");
      setPicked(choice);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: choice }];
      const earned = choice === round.answer;
      setResults((r) => [...r, earned]);
      if (earned) {
        speak(round.kind === "sound" ? correctSoundSpeech(round.picture, round.position, round.answer, roundIndex) : correctWordSpeech(round.word, roundIndex), advance);
        return;
      }
      setReveal(round.answer);
      speak(round.kind === "sound" ? revealSoundSpeech(round.picture, round.position, round.answer) : revealWordSpeech(round.word), advance, { minMs: REVEAL_MIN_MS });
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
      <div className={`${styles.farBalloon} ${styles.tintPurple} absolute left-[6vw] top-[30vh] h-[7vh] w-[5.6vh]`} />
      <div className={`${styles.farBalloon} ${styles.tintGreen} absolute right-[8vw] top-[18vh] h-[5vh] w-[4vh]`} />
      <div className={`${styles.farBalloon} ${styles.tintRed} absolute bottom-[22vh] right-[14vw] h-[6vh] w-[4.8vh]`} />
      <div className={`${styles.field} absolute inset-x-0 bottom-0 h-[11vh]`} />
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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Filling the balloons…</p>
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
        <div className={`${styles.badge} fixed right-3 top-3 z-10 flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center justify-end gap-0.5 rounded-full px-3 py-1.5`} aria-label={`Score: ${score} of ${total}`}>
          {rounds.map((r, i) => (
            <Image
              key={r.key}
              src={results[i] ? ASSETS.starFilled : ASSETS.starEmpty}
              alt=""
              width={128}
              height={128}
              loading="eager"
              className={cn("size-[clamp(16px,3vh,26px)] object-contain transition-transform", i === roundIndex && "scale-125")}
            />
          ))}
        </div>
      )}

      <h1 className={`${styles.title} relative z-[1] m-0 shrink-0 text-center text-[clamp(24px,5vh,44px)] font-extrabold leading-tight`}>{title}</h1>

      {phase === "complete" ? (
        <div className={`${styles.result} relative z-[1] flex flex-1 flex-col items-center justify-center gap-[clamp(12px,3vh,26px)] text-center`}>
          <div className="flex items-center gap-3">
            <div className={`${styles.banner} rounded-2xl px-[clamp(26px,5vw,52px)] py-[clamp(8px,1.6vh,14px)] text-[clamp(20px,3.8vh,34px)] font-extrabold`}>{resultHeadline(score, total)}</div>
            <button type="button" onClick={() => speak(resultLine, finishOnce)} aria-label="Hear the result again" className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}>
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>
          <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-[clamp(15px,2.6vh,24px)] font-bold`}>
            You got {score} of {total} balloons!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-[clamp(4px,1.2vw,12px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(30px,6.4vh,58px)] object-contain drop-shadow-[0_4px_3px_rgba(30,50,90,0.3)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{INSTRUCTION}</p>
            <button
              type="button"
              onClick={() => playPrompt(round)}
              disabled={stage !== "choosing"}
              aria-label="Hear it again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-[clamp(10px,3vh,32px)]">
            <div key={round.key} className={`${styles.banner} ${styles.bannerIn} flex min-h-[clamp(70px,14vh,130px)] min-w-[clamp(170px,34vh,320px)] items-center justify-center gap-3 rounded-2xl px-5 py-2`}>
              {round.kind === "sound" ? (
                <>
                  <span aria-label={PICTURES[round.picture].name} className="select-none text-[clamp(48px,10vh,96px)] leading-none">{PICTURES[round.picture].emoji}</span>
                  <span className={`${styles.label} rounded-full px-3 py-0.5 text-[clamp(16px,3vh,28px)] font-extrabold`}>{promptLabel(round.position)}</span>
                </>
              ) : (
                <span className="flex items-center gap-1" aria-label={`The word ${round.word}`}>
                  {[...round.word].map((letter, i) => (
                    <span key={i} className={cn(styles.letter, "text-[clamp(44px,9vh,86px)] font-extrabold leading-none", lit === i && styles.letterLit)}>
                      {letter}
                    </span>
                  ))}
                </span>
              )}
            </div>

            <div className="flex items-end justify-center gap-[clamp(10px,3.5vw,44px)]">
              {round.choices.map((choice, i) => {
                const isPicked = picked === choice;
                const won = isPicked && choice === round.answer;
                const name = round.kind === "sound" ? `The letter ${LETTERS[choice].name}` : WORDS[choice].name;
                return (
                  <div key={`${round.key}-${choice}`} className={`${styles.bob} relative w-[clamp(84px,min(25vw,20vh),170px)]`} style={{ animationDelay: `${i * -0.8}s` }}>
                    <button
                      type="button"
                      onClick={() => choose(choice)}
                      disabled={stage !== "choosing"}
                      aria-label={name}
                      className={cn(
                        styles.balloonButton,
                        "relative flex w-full flex-col items-center",
                        won && styles.balloonWon,
                        isPicked && !won && styles.balloonWrong,
                        reveal === choice && styles.balloonReveal,
                      )}
                    >
                      <span className={cn(styles.balloon, BALLOON_TINTS[i], "relative flex aspect-[5/6] w-full items-center justify-center")}>
                        <span className={`${styles.face} flex aspect-square w-[70%] items-center justify-center rounded-full`}>
                          {round.kind === "sound" ? (
                            <span className="text-[clamp(30px,6.4vh,62px)] font-extrabold leading-none">{LETTERS[choice].shown}</span>
                          ) : (
                            <span aria-hidden className="pointer-events-none select-none text-[clamp(34px,7.6vh,74px)] leading-none">{WORDS[choice].emoji}</span>
                          )}
                        </span>
                      </span>
                      <span aria-hidden className={`${styles.string} block h-[clamp(14px,3vh,28px)] w-[3px]`} />
                      <span aria-hidden className={`${styles.basket} block h-[clamp(14px,3vh,26px)] w-[34%] rounded-b-lg`} />
                    </button>
                    {isPicked && !won && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-1 top-0 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                    {reveal === choice && (
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
