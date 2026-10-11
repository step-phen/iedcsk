"use client";

import { useState, useCallback, useEffect, useRef } from "react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName } from "@/hooks/useSpeech";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";

/* ============================================================
   ACTIVE OR REST? — "does this move your body or rest it?"
   Each round shows one everyday activity; the learner taps the
   big ACTIVE bin or the big REST bin. Two targets only, both
   thumb-sized, so a 4-6 year old can answer without reading.
   ============================================================ */

const GREEN = "#3FAE72";
const RED = "#E15A5A";

/* ============================================================
   ACTIVITY LIBRARY — code-owned art (emoji) + labels. Only which
   key is "active" vs "rest" is curriculum content, and that lives
   in the DB (activity_questions) so grading stays
   server-authoritative like every other activity in this app.
   See scripts/sql/active-or-rest-rounds.sql.
   ============================================================ */
type MoveKey =
  | "running"
  | "biking"
  | "dancing"
  | "swimming"
  | "jumping"
  | "sleeping"
  | "reading"
  | "napping"
  | "sitting";

const MOVE_LIB: Record<MoveKey, { emoji: string; name: string }> = {
  running: { emoji: "🏃", name: "Running" },
  biking: { emoji: "🚴", name: "Biking" },
  dancing: { emoji: "💃", name: "Dancing" },
  swimming: { emoji: "🏊", name: "Swimming" },
  jumping: { emoji: "🤸", name: "Jumping" },
  sleeping: { emoji: "😴", name: "Sleeping" },
  reading: { emoji: "📖", name: "Reading" },
  napping: { emoji: "🛏️", name: "Napping" },
  sitting: { emoji: "🧘", name: "Sitting Quietly" },
};

function isMoveKey(value: string): value is MoveKey {
  return value in MOVE_LIB;
}

type Choice = "active" | "rest";

interface Round {
  id: MoveKey;
  emoji: string;
  name: string;
  answer: Choice;
}

/** Question data as stored in `activity_questions.question_data`. */
interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

/* ============================================================
   BADGE
   ============================================================ */
interface BadgeTier {
  label: string;
  sub: string;
}

function getBadgeTier(score: number, total: number): BadgeTier {
  if (score === total && total > 0)
    return { label: "GOLD BADGE", sub: "Perfect! You know active and rest!" };
  if (score >= Math.ceil(total * 0.6))
    return { label: "SILVER BADGE", sub: "Great job sorting active and rest!" };
  if (score >= 1)
    return { label: "STARTER BADGE", sub: "Nice try! Keep moving and resting!" };
  return { label: "KEEP PRACTICING BADGE", sub: "Every try helps you learn — keep going!" };
}

function BadgeSvg() {
  return (
    <svg width="120" height="128" viewBox="0 0 140 150">
      <polygon points="45,80 30,148 70,128 110,148 95,80" fill="#E8734A" stroke="#1E2A4A" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="70" cy="62" r="52" fill="#F0B429" stroke="#1E2A4A" strokeWidth="4" />
      <circle cx="70" cy="62" r="40" fill="#FCE4A8" stroke="#1E2A4A" strokeWidth="3" />
      <polygon points="70,32 78,54 102,54 82,68 90,90 70,76 50,90 58,68 38,54 62,54"
        fill="#E8734A" stroke="#1E2A4A" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function ActiveOrRest({
  activityId,
  activityName,
  onFinish,
}: GameComponentProps) {
  const { speakAll, stop } = useSpeech();

  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Question data lives in the DB (activity_questions), fetched once — every
  // other activity in this app works the same way. Only which activity is
  // active vs rest comes from the server; the art/layout is code-owned above.
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

        const mapped: Round[] = rows
          .filter((row) => isMoveKey(row.questionKey))
          .map((row) => {
            const key = row.questionKey as MoveKey;
            return {
              id: key,
              emoji: MOVE_LIB[key].emoji,
              name: MOVE_LIB[key].name,
              answer: row.correctAnswer.answer === "active" ? "active" : "rest",
            };
          });

        setRounds(mapped);
      } catch (err) {
        console.error("Failed to load Active or Rest questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [chosen, setChosen] = useState<Choice | null>(null);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<SubmittedAnswer[]>([]);

  const total = rounds?.length ?? 0;
  const round = rounds ? rounds[roundIdx] : undefined;
  const locked = chosen !== null;

  useEffect(() => stop, [stop]);

  const [learnerName, setLearnerName] = useState<string | null>(null);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLearnerName(getLearnerFirstName());
  }, []);

  const introStateRef = useRef<"pending" | "speaking" | "done">("pending");
  useEffect(() => {
    if (!rounds) return;
    if (introStateRef.current === "pending") {
      introStateRef.current = "speaking";
      speakAll([
        learnerGreeting(getLearnerFirstName()),
        GAME_INTRO_LINES["active or rest"],
      ]);
      introStateRef.current = "done";
    }
  }, [rounds, speakAll]);

  const finishedRef = useRef(false);
  const handleFinish = useCallback(
    (finalAnswers: SubmittedAnswer[]) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      stop();
      onFinish?.(finalAnswers);
    },
    [onFinish, stop],
  );

  const handleChoice = useCallback(
    (choice: Choice) => {
      if (locked || finished || !round || !rounds) return;
      const isCorrect = choice === round.answer;

      setChosen(choice);
      setWasCorrect(isCorrect);
      if (isCorrect) setScore((s) => s + 1);

      const nextAnswers = [...answers, { questionId: round.id, response: choice }];
      setAnswers(nextAnswers);

      setTimeout(() => {
        setChosen(null);
        setWasCorrect(null);
        if (roundIdx + 1 >= rounds.length) {
          setFinished(true);
        } else {
          setRoundIdx((r) => r + 1);
        }
      }, 1300);
    },
    [locked, finished, round, rounds, roundIdx, answers],
  );

  const progressPct = finished ? 100 : total > 0 ? Math.round((roundIdx / total) * 100) : 0;

  if (loadError) {
    return (
      <div className="box-border flex h-screen w-full items-center justify-center overflow-hidden font-[Trebuchet_MS,Segoe_UI,Verdana,sans-serif]">
        <p className="text-lg font-extrabold text-[#1E2A4A]">
          Couldn&apos;t load this activity. Please try again.
        </p>
      </div>
    );
  }

  if (!rounds || !round) {
    return (
      <div className="box-border flex h-screen w-full items-center justify-center overflow-hidden font-[Trebuchet_MS,Segoe_UI,Verdana,sans-serif]">
        <p className="text-lg font-extrabold text-[#1E2A4A]">Loading…</p>
      </div>
    );
  }

  const badgeTier = getBadgeTier(score, total);

  return (
    <div className="relative box-border flex h-screen h-dvh w-full items-center justify-center overflow-hidden p-[clamp(8px,2vh,20px)] font-[Trebuchet_MS,Segoe_UI,Verdana,sans-serif]">
      {learnerName && (
        <div className="absolute left-2 top-2 z-10 flex items-center gap-1.5 rounded-full border-[2.5px] border-[#1E2A4A] bg-white py-1 pl-2 pr-3 text-xs font-extrabold text-[#1E2A4A] sm:left-3.5 sm:top-2.5 sm:gap-3 sm:border-[3px] sm:py-2.5 sm:pl-4 sm:pr-6 sm:text-2xl">
          <span className="text-[15px] leading-none sm:text-[32px]" aria-hidden>
            🙋
          </span>
          <span className="max-w-[6rem] overflow-hidden text-ellipsis whitespace-nowrap sm:max-w-[14rem]">
            {learnerName}
          </span>
        </div>
      )}

      {!finished && (
        <>
          <div className="absolute left-1/2 top-2 z-10 hidden max-w-[45%] -translate-x-1/2 truncate text-center text-[clamp(24px,4vh,40px)] font-extrabold tracking-[0.5px] text-[#1E2A4A] sm:top-2.5 sm:block">
            {activityName || "Active or Rest?"}
          </div>
          <div className="absolute right-2 top-2 z-10 rounded-full border-2 border-[#F0B429] bg-[#FCE4A8] px-2.5 py-1 text-xs font-extrabold text-[#1E2A4A] sm:right-3.5 sm:top-2.5 sm:border-[3px] sm:px-5 sm:py-2 sm:text-2xl">
            Score: {score}
          </div>
        </>
      )}

      {finished ? (
        <div className="flex w-full max-w-[600px] flex-col items-center justify-center gap-[clamp(4px,1vh,10px)] px-4 text-center sm:px-6">
          <h1 className="m-0 max-w-[90%] text-[clamp(18px,3.4vh,30px)] tracking-[0.5px] text-[#1E2A4A]">
            {(activityName || "ACTIVE OR REST?").toUpperCase()} COMPLETE!
          </h1>
          <p className="m-0 text-[clamp(16px,2.8vh,24px)] font-extrabold text-[#E8734A]">
            Score: {score} / {total}
          </p>
          <div className="my-[clamp(2px,0.8vh,8px)]">
            <BadgeSvg />
          </div>
          <div className="text-[clamp(13px,2vh,17px)] font-extrabold tracking-[1px] text-[#1E2A4A]">
            {badgeTier.label}
          </div>
          <div className="text-[clamp(10px,1.5vh,13px)] font-semibold text-[#4b5876]">
            {badgeTier.sub}
          </div>
          <button
            type="button"
            onClick={() => handleFinish(answers)}
            className="mt-[clamp(6px,1.2vh,14px)] rounded-full border-[2.5px] border-[#1E2A4A] bg-[#F0B429] px-[clamp(20px,4vw,36px)] py-[clamp(8px,1.4vh,14px)] text-[clamp(13px,2vh,18px)] font-extrabold text-[#1E2A4A] shadow-[0_5px_0_rgba(30,42,74,0.25)] transition-transform duration-[120ms] ease-in-out active:translate-y-[2px] active:shadow-[0_2px_0_rgba(30,42,74,0.25)]"
          >
            Finish
          </button>
        </div>
      ) : (
        <div className="flex w-full max-w-[900px] flex-col px-4 sm:px-6">
          <div className="mt-6 flex-none truncate text-center text-base font-extrabold tracking-[0.5px] text-[#1E2A4A] sm:hidden">
            {activityName || "Active or Rest?"}
          </div>

          <div className="my-[clamp(2px,0.6vh,8px)] flex-none text-center text-[clamp(16px,3.2vh,30px)] font-extrabold tracking-[0.5px] text-[#1E2A4A]">
            Does this move your body or rest it?
          </div>

          <div className="mx-auto mb-[clamp(6px,1vh,12px)] h-[clamp(10px,1.6vh,16px)] w-[min(80%,620px)] flex-none overflow-hidden rounded-full border-2 border-[#d8d2c2] bg-[#F1EAD9]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#F0B429,#E8734A)] transition-[width] duration-[400ms] ease-in-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* the activity being asked about */}
          <div className="mb-[clamp(8px,1.6vh,18px)] flex flex-none justify-center">
            <div className="relative flex aspect-square w-[clamp(120px,26vh,220px)] flex-col items-center justify-center gap-[clamp(2px,0.6vh,8px)] rounded-3xl border-[3px] border-[#1E2A4A] bg-white shadow-[0_6px_0_rgba(30,42,74,0.15)]">
              <span className="text-[clamp(56px,13vh,110px)] leading-none">{round.emoji}</span>
              <span className="text-[clamp(13px,2vh,20px)] font-extrabold tracking-[0.3px] text-[#1E2A4A]">
                {round.name}
              </span>
            </div>
          </div>

          {/* the two bins */}
          <div className="flex flex-none justify-center gap-[clamp(10px,3vw,28px)]">
            {(
              [
                { key: "active" as Choice, emoji: "🏃", label: "ACTIVE", base: "#8ED9A8", picked: "#3FAE72" },
                { key: "rest" as Choice, emoji: "😴", label: "REST", base: "#A9C7F5", picked: "#5B8FE0" },
              ]
            ).map((bin) => {
              const isPicked = chosen === bin.key;
              return (
                <button
                  key={bin.key}
                  type="button"
                  onClick={() => handleChoice(bin.key)}
                  disabled={locked}
                  style={{ backgroundColor: isPicked ? bin.picked : bin.base }}
                  className={`flex h-[clamp(74px,15vh,128px)] w-[clamp(130px,32vw,260px)] flex-col items-center justify-center gap-[clamp(2px,0.6vh,6px)] rounded-3xl border-[3px] border-[#1E2A4A] text-[clamp(15px,2.6vh,28px)] font-black tracking-[1px] text-[#1E2A4A] shadow-[0_6px_0_rgba(30,42,74,0.25)] transition-[transform,opacity] duration-[120ms] ease-in-out [-webkit-tap-highlight-color:transparent] active:translate-y-[3px] active:shadow-[0_3px_0_rgba(30,42,74,0.25)] ${
                    locked ? "cursor-default" : "cursor-pointer"
                  } ${locked && !isPicked ? "opacity-50" : "opacity-100"}`}
                >
                  <span className="text-[clamp(24px,4.5vh,44px)] leading-none" aria-hidden>
                    {bin.emoji}
                  </span>
                  {bin.label}
                </button>
              );
            })}
          </div>

          <div className="mt-[clamp(6px,1.2vh,14px)] flex min-h-[clamp(26px,4.5vh,36px)] flex-none items-center justify-center">
            <div
              className={`rounded-full border-2 px-[22px] py-1.5 text-[clamp(13px,2.1vh,20px)] font-extrabold transition-[opacity,transform] duration-[180ms] ease-in-out ${
                locked ? "scale-100 opacity-100" : "scale-90 opacity-0"
              } ${
                wasCorrect
                  ? "border-[#3FAE72] bg-[#DFF5E8] text-[#3FAE72]"
                  : "border-[#E15A5A] bg-[#FDE7E4] text-[#E15A5A]"
              }`}
              style={{ borderColor: wasCorrect ? GREEN : RED }}
            >
              {wasCorrect ? "Correct! Great thinking! 🎉" : "Not quite — try the next one!"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
