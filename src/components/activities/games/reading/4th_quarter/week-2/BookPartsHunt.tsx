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
  BOOKS,
  PARTS,
  REVEAL_TEXT,
  askLine,
  instruction,
  correctSpeech,
  resultHeadline,
  resultSpeech,
  revealSpeech,
} from "./BookPartsHunt.data";
import styles from "./BookPartsHunt.module.css";

interface Round {
  key: string;
  book: string;
  part: string;
}

interface QuestionRow {
  questionKey: string;
  questionData: unknown;
  correctAnswer: { answer: string };
}

type Phase = "playing" | "complete";
type Stage = "asking" | "choosing" | "feedback";

function buildRound(row: QuestionRow): Round {
  const { book, part } = row.questionData as { book: unknown; part: unknown };
  if (typeof book !== "string" || !Object.hasOwn(BOOKS, book)) {
    throw new Error(`Question ${row.questionKey} needs a known "book"`);
  }
  if (typeof part !== "string" || !Object.hasOwn(PARTS, part) || row.correctAnswer.answer !== part) {
    throw new Error(`Question ${row.questionKey} needs a known "part" that is also its answer`);
  }
  return { key: row.questionKey, book, part };
}

export default function BookPartsHunt({ activityId, activityName, onFinish }: GameComponentProps) {
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
        console.error("Failed to load Book Parts Hunt questions:", err);
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
  const title = activityName || "Book Parts Hunt";
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
      speak(askLine(r.part), () => setStage("choosing"));
    },
    [speak],
  );

  const introSpokenRef = useRef(false);
  useEffect(() => {
    if (!round) return;
    if (!introSpokenRef.current) {
      introSpokenRef.current = true;
      speakAll([learnerGreeting(getLearnerFirstName()), GAME_INTRO_LINES["book parts hunt"]], () => ask(round));
      return;
    }
    ask(round);
    // speakAll is stable from useSpeech; re-running on round identity is enough.
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
    (zone: string) => {
      if (stage !== "choosing" || !round) return;
      // The title is printed on the front cover, so tapping it while the cover is asked for still counts as the cover.
      const part = round.part === "front-cover" && zone === "title" ? "front-cover" : zone;
      setStage("feedback");
      setPicked(part);
      answersRef.current = [...answersRef.current, { questionId: round.key, response: part }];
      const earned = part === round.part;
      setResults((r) => [...r, earned]);
      if (earned) {
        speak(correctSpeech(part, roundIndex), advance);
        return;
      }
      setReveal(round.part);
      speak(revealSpeech(round.part), advance, { minMs: REVEAL_MIN_MS });
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
      <div aria-hidden className={`${styles.shelves} pointer-events-none absolute inset-x-0 top-0 h-[62%]`} />
      <div aria-hidden className={`${styles.table} pointer-events-none absolute inset-x-0 bottom-0 h-[24%]`} />
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
        <p className={`${styles.pill} relative m-0 rounded-2xl px-5 py-3 text-xl font-bold sm:text-2xl`}>Finding a book…</p>
      </div>
    );
  }

  const book = BOOKS[round.book];
  const zoneClass = (zone: string) =>
    cn(
      picked === zone && zone === round.part && styles.zoneWon,
      picked === zone && zone !== round.part && styles.zoneWrong,
      reveal === zone && styles.zoneReveal,
    );
  const wrongMark = (zone: string) =>
    picked === zone &&
    zone !== round.part && (
      <span aria-hidden className={`${styles.wrongMark} absolute -right-2 -top-2 z-[3] flex size-9 items-center justify-center rounded-full text-xl font-extrabold leading-none`}>
        ✕
      </span>
    );

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
            You found {score} of {total} book parts!
          </p>
          <div className="flex items-center gap-[clamp(4px,1.4vw,14px)]" aria-label={`${score} of ${total} stars`}>
            {results.map((earned, i) => (
              <Image key={i} src={earned ? ASSETS.starFilled : ASSETS.starEmpty} alt="" width={128} height={128} className="size-[clamp(38px,8vh,72px)] object-contain drop-shadow-[0_4px_3px_rgba(74,44,20,0.3)]" />
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] mt-[clamp(4px,1vh,10px)] flex max-w-full shrink-0 items-center gap-2">
            <p className={`${styles.pill} m-0 rounded-full px-5 py-1.5 text-center text-[clamp(16px,2.8vh,26px)] font-extrabold leading-tight`}>
              {instruction(round.part)}
            </p>
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

          <main className="relative z-[1] flex min-h-0 w-full flex-1 flex-col items-center justify-center pt-8">
            {reveal && (
              <span className={`${styles.revealTag} absolute top-0 z-[3] whitespace-nowrap rounded-full px-3 py-0.5 text-[clamp(13px,2.2vh,18px)] font-extrabold`}>{REVEAL_TEXT}</span>
            )}
            <div
              key={round.key}
              className={`${styles.book} relative aspect-[5/6] w-[clamp(200px,min(72vw,50vh),400px)]`}
              style={{ "--cover": book.cover } as CSSProperties}
            >
              <button
                type="button"
                onClick={() => choose("pages")}
                disabled={stage !== "choosing"}
                aria-label="Pages"
                className={cn(styles.pages, "absolute bottom-0 right-0 top-[5%] w-[34%] rounded-r-lg", zoneClass("pages"))}
              >
                {wrongMark("pages")}
              </button>
              <button
                type="button"
                onClick={() => choose("front-cover")}
                disabled={stage !== "choosing"}
                aria-label="Front cover"
                className={cn(styles.cover, "absolute bottom-[5%] left-0 top-0 w-[84%] rounded-l-md rounded-r-xl", zoneClass("front-cover"))}
              >
                <span aria-hidden className={`${styles.spine} absolute inset-y-0 left-0 w-[9%] rounded-l-md`} />
                <span aria-hidden className="pointer-events-none absolute bottom-[12%] left-[55%] -translate-x-1/2 select-none text-[clamp(56px,13vh,120px)] leading-none">
                  {book.emoji}
                </span>
                {wrongMark("front-cover")}
              </button>
              <button
                type="button"
                onClick={() => choose("title")}
                disabled={stage !== "choosing"}
                aria-label={`Title: ${book.title}`}
                className={cn(
                  styles.label,
                  "absolute left-[15%] top-[9%] z-[4] w-[62%] rounded-lg px-2 py-[4%] text-center text-[clamp(18px,4vh,36px)] font-extrabold leading-tight",
                  zoneClass("title"),
                )}
              >
                {book.title}
                {wrongMark("title")}
              </button>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
