"use client";

import { useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import Image from "next/image";
import { Volume2 } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName, getLearnerPhotoUrl, REVEAL_MIN_MS } from "@/hooks/useSpeech";
import { LearnerAvatar } from "@/components/learner/learner-avatar";
import { learnerGreeting } from "@/lib/speech-lines";
import { cn } from "@/lib/utils";
import {
  ASSETS,
  REVEAL_TEXT,
  SOUNDS,
  TASK_TYPES,
  WORDS,
  answerLine,
  questionSpeech,
  questionText,
  resultHeadline,
  type Task,
  type TaskType,
} from "./readingReview2.data";

interface Round {
  key: string;
  task: Task;
  /** Answer cards, left to right; single characters are letters, anything else is a picture id. */
  choices: string[];
  answer: string;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Stage = "asking" | "choosing" | "feedback";

const isTaught = (s: unknown): s is string => typeof s === "string" && s.length === 1 && Object.hasOwn(SOUNDS, s.toUpperCase());
const isWord = (s: unknown): s is string => typeof s === "string" && Object.hasOwn(WORDS, s);
const soundOf = (letter: string) => SOUNDS[letter.toUpperCase()];

function buildRound(row: QuestionRow): Round {
  const { type, target, choices } = row.questionData as { type: unknown; target: unknown; choices: unknown };
  const answer = row.correctAnswer.answer;
  const fail = (why: string): never => {
    throw new Error(`Question ${row.questionKey} ${why}`);
  };
  if (!TASK_TYPES.includes(type as TaskType)) fail(`has an unknown "type"`);
  if (!Array.isArray(choices) || choices.length !== 3 || new Set(choices).size !== 3) fail(`needs three different "choices"`);
  const list = choices as unknown[];
  const t = type as TaskType;

  if (t === "sort") {
    if (!isWord(target)) fail(`needs a known picture as "target"`);
  } else if (!isTaught(target) || target !== target.toUpperCase()) {
    fail(`needs a taught uppercase letter as "target"`);
  }
  const tg = target as string;

  if (t === "picture") {
    if (!list.every(isWord)) fail(`needs three known pictures as "choices"`);
    // Compared by sound, so a C task never also shows a K picture.
    const hits = (list as string[]).filter((w) => soundOf(WORDS[w].letter) === soundOf(tg));
    if (hits.length !== 1 || hits[0] !== answer) fail("needs exactly one picture with the sound, and it must be the answer");
  } else if (t === "partner") {
    if (!list.every((c) => isTaught(c) && c === c.toLowerCase())) fail(`needs three taught lowercase "choices"`);
    if (answer !== tg.toLowerCase() || !list.includes(answer)) fail("needs the small partner among the choices as the answer");
  } else {
    if (!list.every((c) => isTaught(c) && c === c.toUpperCase())) fail(`needs three taught uppercase "choices"`);
    const expected = t === "sort" ? WORDS[tg].letter : tg;
    if (answer !== expected || !list.includes(answer)) fail(`needs ${expected} among the choices as the answer`);
    if (t !== "letter" && (list as string[]).filter((c) => soundOf(c) === soundOf(answer)).length !== 1) fail("shows two letters with the same sound");
  }
  return { key: row.questionKey, task: { type: t, target: tg }, choices: list as string[], answer };
}

export interface ReadingReviewGame2Props extends GameComponentProps {
  styles: Record<string, string>;
  fallbackTitle: string;
  intro: string;
  loadingText: string;
  cheers: string[];
  done: string;
  doneMissed: string;
  backdrop: ReactNode;
  /** The game's own progress art, one piece per task. */
  progress: (results: boolean[], total: number) => ReactNode;
}

export default function ReadingReviewGame2({
  activityId,
  activityName,
  onFinish,
  styles,
  fallbackTitle,
  intro,
  loadingText,
  cheers,
  done,
  doneMissed,
  backdrop,
  progress,
}: ReadingReviewGame2Props) {
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
        console.error(`Failed to load ${fallbackTitle} questions:`, err);
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activityId, fallbackTitle]);

  const total = rounds?.length ?? 0;
  const [roundIndex, setRoundIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [stage, setStage] = useState<Stage>("asking");
  const [talking, setTalking] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [reveal, setReveal] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const answersRef = useRef<SubmittedAnswer[]>([]);

  const round = rounds?.[roundIndex];
  const title = activityName || fallbackTitle;
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
      setStage("asking");
      speak(
        questionSpeech(r.task, r.choices),
        () => {
          setTalking(false);
          setStage("choosing");
        },
        { onStart: () => setTalking(true) },
      );
    },
    [speak],
  );

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), intro], () => ask(round));
      return;
    }
    ask(round);
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
    (choice: string) => {
      if (stage !== "choosing" || !round) return;
      setStage("feedback");
      setPicked(choice);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: choice }];
      const earned = choice === round.answer;
      setResults((r) => [...r, earned]);
      const why = answerLine(round.task, round.answer);
      if (earned) {
        speak(`${cheers[roundIndex % cheers.length]} ${why}`, advance);
        return;
      }
      setReveal(round.answer);
      speak(`${REVEAL_TEXT} ${why}`, advance, { minMs: REVEAL_MIN_MS });
    },
    [stage, round, roundIndex, cheers, speak, advance],
  );

  const finishedRef = useRef(false);
  const finishOnce = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish?.(answersRef.current);
  }, [onFinish]);

  const resultLine = `${score === total ? done : doneMissed} You got ${score} out of ${total}.`;
  useEffect(() => {
    if (phase === "complete") speak(resultLine, finishOnce);
  }, [phase, resultLine, speak, finishOnce]);

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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>{loadingText}</p>
      </div>
    );
  }

  const { type, target } = round.task;

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
        <div className={`${styles.badge} fixed right-3 top-3 z-10 flex items-center gap-1.5 rounded-full py-1.5 pl-2 pr-4 text-xl font-extrabold short:py-1 short:text-base`} aria-label={`Score: ${score} of ${total}`}>
          <Image src={ASSETS.starFilled} alt="" width={128} height={128} loading="eager" className="size-[clamp(22px,3.8vh,32px)] object-contain" />
          <span className="tabular-nums leading-none">{score}</span>
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
            You got {score} of {total} correct!
          </p>
          <div aria-hidden>{progress(results, total)}</div>
          <div className="flex max-w-[min(94vw,640px)] flex-wrap items-center justify-center gap-[clamp(2px,0.8vw,8px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(26px,5vh,46px)] object-contain" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>{questionText(round.task)}</p>
            <button
              type="button"
              onClick={() => ask(round)}
              disabled={stage !== "choosing"}
              aria-label="Hear the question again"
              className={`${styles.iconButton} flex size-10 shrink-0 items-center justify-center rounded-full`}
            >
              <Volume2 size={18} strokeWidth={2.6} />
            </button>
          </div>

          <div aria-hidden className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex shrink-0 justify-center">
            {progress(results, total)}
          </div>

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-evenly">
            {/* What the task is about: the big letter, the picture, or a speaker for tasks that are only heard. */}
            <div key={round.key} className={`${styles.target} flex size-[clamp(84px,18vh,160px)] items-center justify-center rounded-3xl`}>
              {type === "partner" ? (
                <span className="text-[clamp(52px,12vh,108px)] font-extrabold leading-none" aria-label={`Big ${target}`}>{target}</span>
              ) : type === "sort" ? (
                <span className="text-[clamp(52px,12vh,108px)] leading-none" role="img" aria-label={WORDS[target].name}>{WORDS[target].emoji}</span>
              ) : (
                <button type="button" onClick={() => ask(round)} disabled={stage !== "choosing"} aria-label="Hear it again" className={cn(styles.speaker, "flex size-[70%] items-center justify-center rounded-full", talking && styles.speakerOn)}>
                  <Volume2 className="size-[55%]" strokeWidth={2.4} />
                </button>
              )}
            </div>

            <div className="flex w-[min(96vw,680px)] items-center justify-around">
              {round.choices.map((choice) => {
                const isPicked = picked === choice;
                const won = isPicked && choice === round.answer;
                const isLetter = choice.length === 1;
                return (
                  <div key={`${round.key}-${choice}`} className="relative">
                    <button
                      type="button"
                      onClick={() => choose(choice)}
                      disabled={stage !== "choosing"}
                      aria-label={isLetter ? `Letter ${choice.toUpperCase()}` : WORDS[choice].name}
                      className={cn(
                        styles.card,
                        "relative flex aspect-square w-[clamp(84px,min(27vw,19vh),160px)] items-center justify-center rounded-3xl",
                        won && styles.cardWon,
                        isPicked && !won && styles.cardWrong,
                        reveal === choice && styles.cardReveal,
                      )}
                    >
                      {isLetter ? (
                        <span className="text-[clamp(44px,10vh,92px)] font-extrabold leading-none">{choice}</span>
                      ) : (
                        <span aria-hidden className="select-none text-[clamp(44px,10vh,92px)] leading-none">{WORDS[choice].emoji}</span>
                      )}
                    </button>
                    {isPicked && !won && (
                      <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-2 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
                        ✕
                      </span>
                    )}
                    {reveal === choice && (
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
