"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Home } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName } from "@/hooks/useSpeech";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";

/* ------------------------------------------------------------------ */
/*  MY HEALTHY PLATE — Kindergarten Meal-Building Activity              */
/*  Build a plate with 5 healthy foods. Final score is out of 5.        */
/* ------------------------------------------------------------------ */

const NAVY = "#1E3A5F";
const YELLOW = "#F5B942";
const RED = "#E05B52";
const LINE = "#4A3628";

/* ------------------------------- Food art ---------------------------- */

function FoodDefs() {
  return (
    <defs>
      <linearGradient id="appleGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FF8A73" />
        <stop offset="100%" stopColor="#E0483C" />
      </linearGradient>
      <linearGradient id="leafGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7FCB7F" />
        <stop offset="100%" stopColor="#3E9B57" />
      </linearGradient>
      <linearGradient id="carrotGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FCA24C" />
        <stop offset="100%" stopColor="#E97A1F" />
      </linearGradient>
      <linearGradient id="fishGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#7FD4EE" />
        <stop offset="100%" stopColor="#3B9FCF" />
      </linearGradient>
      <linearGradient id="eggWhiteGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#F0EBDD" />
      </linearGradient>
      <linearGradient id="yolkGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFD86B" />
        <stop offset="100%" stopColor="#F0A93A" />
      </linearGradient>
      <linearGradient id="candyGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FF8FB3" />
        <stop offset="100%" stopColor="#E8477E" />
      </linearGradient>
      <linearGradient id="sodaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#F0524A" />
        <stop offset="100%" stopColor="#B82E28" />
      </linearGradient>
      <linearGradient id="chipsGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FBCB4B" />
        <stop offset="100%" stopColor="#EE9A2C" />
      </linearGradient>
    </defs>
  );
}

function Apple() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <FoodDefs />
      <path d="M100 70 C60 70 42 105 42 138 C42 172 68 190 96 190 C100 190 100 186 104 186 C132 190 158 172 158 138 C158 105 140 70 100 70 Z" fill="url(#appleGrad)" stroke={LINE} strokeWidth="5" />
      <path d="M100 70 C96 55 100 42 112 34" fill="none" stroke="#7A4B22" strokeWidth="6" strokeLinecap="round" />
      <path d="M112 46 C126 34 142 38 148 50 C138 56 122 56 112 46 Z" fill="url(#leafGrad)" stroke={LINE} strokeWidth="4" />
      <ellipse cx="72" cy="108" rx="16" ry="24" fill="#FFFFFF" opacity="0.35" />
    </svg>
  );
}

function Carrot() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <FoodDefs />
      <path d="M100 172 C90 172 84 160 88 140 L96 92 C98 82 102 82 104 92 L112 140 C116 160 110 172 100 172 Z" fill="url(#carrotGrad)" stroke={LINE} strokeWidth="5" strokeLinejoin="round" />
      <line x1="94" y1="112" x2="106" y2="116" stroke="#C9640F" strokeWidth="3" opacity="0.6" />
      <line x1="93" y1="132" x2="107" y2="136" stroke="#C9640F" strokeWidth="3" opacity="0.6" />
      <path d="M92 90 C86 66 92 46 100 34" stroke="url(#leafGrad)" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M100 90 C100 62 100 42 100 26" stroke="url(#leafGrad)" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M108 90 C114 66 108 46 100 34" stroke="url(#leafGrad)" strokeWidth="10" fill="none" strokeLinecap="round" />
      <ellipse cx="94" cy="120" rx="6" ry="12" fill="#FFFFFF" opacity="0.3" />
    </svg>
  );
}

function Broccoli() {
  const circles: [number, number, number][] = [
    [70, 110, 26],
    [100, 92, 32],
    [132, 110, 26],
    [85, 80, 22],
    [118, 80, 22],
    [100, 64, 20],
  ];
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <FoodDefs />
      <rect x="88" y="120" width="24" height="55" rx="10" fill="#E7D89A" stroke={LINE} strokeWidth="4" />
      {circles.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="url(#leafGrad)" stroke={LINE} strokeWidth="4" />
      ))}
      <ellipse cx="90" cy="78" rx="8" ry="10" fill="#B7ECB9" opacity="0.6" />
    </svg>
  );
}

function Fish() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <FoodDefs />
      <path d="M50 100 C50 76 78 62 116 62 C150 62 168 84 172 100 C168 116 150 138 116 138 C78 138 50 124 50 100 Z" fill="url(#fishGrad)" stroke={LINE} strokeWidth="5" />
      <path d="M50 100 L24 82 L30 100 L24 118 Z" fill="#3B9FCF" stroke={LINE} strokeWidth="4" strokeLinejoin="round" />
      <path d="M96 66 L112 44 L128 68" fill="#F0B93D" stroke={LINE} strokeWidth="4" strokeLinejoin="round" />
      <circle cx="140" cy="92" r="8" fill="#FFFFFF" stroke={LINE} strokeWidth="3" />
      <circle cx="142" cy="92" r="3.5" fill={LINE} />
      <ellipse cx="130" cy="80" rx="14" ry="8" fill="#FFFFFF" opacity="0.3" />
    </svg>
  );
}

function Egg() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <FoodDefs />
      <path d="M40 118 C40 90 70 74 100 88 C130 74 160 90 160 118 C160 148 132 164 100 164 C68 164 40 148 40 118 Z" fill="url(#eggWhiteGrad)" stroke={LINE} strokeWidth="5" />
      <circle cx="100" cy="116" r="30" fill="url(#yolkGrad)" stroke={LINE} strokeWidth="4" />
      <ellipse cx="90" cy="106" rx="8" ry="6" fill="#FFF3C4" opacity="0.8" />
    </svg>
  );
}

function Candy() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <FoodDefs />
      <path d="M64 84 L36 66 L40 92 L36 118 L64 100 Z" fill="url(#candyGrad)" stroke={LINE} strokeWidth="4" strokeLinejoin="round" />
      <path d="M136 84 L164 66 L160 92 L164 118 L136 100 Z" fill="url(#candyGrad)" stroke={LINE} strokeWidth="4" strokeLinejoin="round" />
      <rect x="62" y="70" width="76" height="44" rx="20" fill="url(#candyGrad)" stroke={LINE} strokeWidth="5" />
      <path d="M78 76 L88 108" stroke="#FFFFFF" strokeWidth="5" opacity="0.5" strokeLinecap="round" />
    </svg>
  );
}

function Soda() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <FoodDefs />
      <rect x="66" y="56" width="68" height="110" rx="14" fill="url(#sodaGrad)" stroke={LINE} strokeWidth="5" />
      <rect x="66" y="56" width="68" height="24" rx="12" fill="#D8DCE0" stroke={LINE} strokeWidth="4" />
      <rect x="70" y="96" width="60" height="30" fill="#FFFFFF" opacity="0.85" rx="4" />
      <text x="100" y="117" textAnchor="middle" fontSize="14" fontWeight="900" fill={RED} fontFamily="inherit">SODA</text>
      <ellipse cx="80" cy="130" rx="8" ry="24" fill="#FFFFFF" opacity="0.25" />
    </svg>
  );
}

function Chips() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <FoodDefs />
      <path d="M56 70 L144 70 L136 176 L64 176 Z" fill="url(#chipsGrad)" stroke={LINE} strokeWidth="5" strokeLinejoin="round" />
      <path d="M56 70 L64 54 L74 70 L86 54 L96 70 L106 54 L116 70 L126 54 L136 70 L144 70" fill="url(#chipsGrad)" stroke={LINE} strokeWidth="5" strokeLinejoin="round" />
      <rect x="70" y="96" width="60" height="34" fill="#FFFFFF" opacity="0.85" rx="6" />
      <text x="100" y="119" textAnchor="middle" fontSize="13" fontWeight="900" fill="#B36A16" fontFamily="inherit">CHIPS</text>
    </svg>
  );
}

/* ------------------------------- Data --------------------------------- */
/*  Code-owned round and art. The healthy foods double as the graded       */
/*  questions — question_key must match one of the keys below exactly, and */
/*  correct_answer.answer must be "placed" (see                            */
/*  scripts/sql/my-healthy-plate-rounds.sql), so lib/grading.ts can grade   */
/*  each healthy food the learner taps onto the plate. Unhealthy foods are  */
/*  distractors only — tapping one just shakes/warns and is never graded.   */

type FoodKey =
  | "apple"
  | "carrot"
  | "broccoli"
  | "fish"
  | "egg"
  | "candy"
  | "soda"
  | "chips";

interface FoodEntry {
  key: FoodKey;
  name: string;
  Art: React.ComponentType;
}

const HEALTHY_FOODS: FoodEntry[] = [
  { key: "apple", name: "Apple", Art: Apple },
  { key: "carrot", name: "Carrot", Art: Carrot },
  { key: "broccoli", name: "Broccoli", Art: Broccoli },
  { key: "fish", name: "Fish", Art: Fish },
  { key: "egg", name: "Egg", Art: Egg },
];
const UNHEALTHY_FOODS: FoodEntry[] = [
  { key: "candy", name: "Candy", Art: Candy },
  { key: "soda", name: "Soda", Art: Soda },
  { key: "chips", name: "Chips", Art: Chips },
];

const TARGET = HEALTHY_FOODS.length; // 5

/* 5 fixed, non-overlapping slot positions inside the plate (percent of plate box) */
const SLOTS = [
  { x: 50, y: 32 },
  { x: 27, y: 48 },
  { x: 73, y: 48 },
  { x: 36, y: 74 },
  { x: 64, y: 74 },
];

/** Question data as stored in `activity_questions.question_data`. */
interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

/* ------------------------------ Badge ---------------------------------- */

interface BadgeTier {
  emoji: string;
  label: string;
  bg: string;
  ring: string;
}

function getBadgeTier(score: number): BadgeTier {
  if (score === TARGET) return { emoji: "🏆", label: "GOLD BADGE", bg: "#FFE9A8", ring: YELLOW };
  if (score >= 4) return { emoji: "🥈", label: "SILVER BADGE", bg: "#EDF1F4", ring: "#C9D2DA" };
  if (score >= 3) return { emoji: "🥉", label: "BRONZE BADGE", bg: "#F0CBA0", ring: "#CD8B4E" };
  if (score >= 2) return { emoji: "⭐", label: "STARTER BADGE", bg: "#E4F7EA", ring: "#8ED9A8" };
  if (score >= 1) return { emoji: "🙂", label: "BEGINNER BADGE", bg: "#E7EFFD", ring: "#8FB3F5" };
  return { emoji: "💪", label: "KEEP PRACTICING BADGE", bg: "#FBEAE8", ring: "#E0A9A2" };
}

function Badge({ score }: { score: number }) {
  const t = getBadgeTier(score);
  return (
    <div
      className="flex h-[140px] w-[140px] items-center justify-center rounded-full shadow-[0_6px_0_rgba(30,58,95,0.15)]"
      style={{ background: t.bg, border: `6px solid ${t.ring}` }}
    >
      <span className="text-[60px]">{t.emoji}</span>
    </div>
  );
}

/* ------------------------------- App --------------------------------- */

export default function MyHealthyPlate({
  activityId,
  activityName,
  onFinish,
}: GameComponentProps) {
  const router = useRouter();
  const { speakAll, stop } = useSpeech();

  const [configReady, setConfigReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Question data lives in the DB (activity_questions), fetched once — every
  // other activity in this app works the same way. The rounds/art here are
  // fully code-owned (fixed layout); the fetch only confirms the activity is
  // configured with graded rows for the healthy foods (see the SQL script).
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
        setConfigReady(true);
      } catch (err) {
        console.error("Failed to load My Healthy Plate questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const [placed, setPlaced] = useState<FoodKey[]>([]); // healthy food keys placed on the plate
  const [warning, setWarning] = useState<FoodKey | null>(null);
  const [finished, setFinished] = useState(false);
  const [transitioning, setTransitioning] = useState(false); // brief "Great Job!" overlay before completion
  const [answers, setAnswers] = useState<SubmittedAnswer[]>([]);

  const isPlaced = useCallback((key: FoodKey) => placed.includes(key), [placed]);

  useEffect(() => stop, [stop]);

  const [learnerName, setLearnerName] = useState<string | null>(null);
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setLearnerName(getLearnerFirstName());
  }, []);

  const introStateRef = useRef<"pending" | "speaking" | "done">("pending");
  useEffect(() => {
    if (!configReady) return;
    if (introStateRef.current === "pending") {
      introStateRef.current = "speaking";
      speakAll([
        learnerGreeting(getLearnerFirstName()),
        GAME_INTRO_LINES["my healthy plate"],
      ]);
      introStateRef.current = "done";
    }
  }, [configReady, speakAll]);

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

  const handleTapHealthy = useCallback(
    (food: FoodEntry) => {
      if (finished || transitioning || isPlaced(food.key) || placed.length >= TARGET) return;

      const nextPlaced = [...placed, food.key];
      setPlaced(nextPlaced);
      const nextAnswers = [...answers, { questionId: food.key, response: "placed" }];
      setAnswers(nextAnswers);

      if (nextPlaced.length >= TARGET) {
        setTransitioning(true);
        setTimeout(() => {
          setFinished(true);
          handleFinish(nextAnswers);
        }, 1100);
      }
    },
    [placed, answers, finished, transitioning, handleFinish, isPlaced],
  );

  const handleTapUnhealthy = useCallback(
    (food: FoodEntry) => {
      if (finished || transitioning) return;
      setWarning(food.key);
      setTimeout(() => setWarning((w) => (w === food.key ? null : w)), 550);
    },
    [finished, transitioning],
  );

  const handleDone = useCallback(() => {
    if (finished || transitioning) return;
    setFinished(true);
    handleFinish(answers);
  }, [finished, transitioning, answers, handleFinish]);

  const goHome = useCallback(() => {
    stop();
    router.push("/learner");
  }, [stop, router]);

  const finalScore = placed.length;

  if (loadError) {
    return (
      <div className="box-border flex h-screen w-full items-center justify-center overflow-hidden bg-[#FDF6E3] font-[Baloo_2,Trebuchet_MS,Segoe_UI,sans-serif]">
        <p className="text-lg font-extrabold text-[#1E3A5F]">
          Couldn&apos;t load this activity. Please try again.
        </p>
      </div>
    );
  }

  if (!configReady) {
    return (
      <div className="box-border flex h-screen w-full items-center justify-center overflow-hidden bg-[#FDF6E3] font-[Baloo_2,Trebuchet_MS,Segoe_UI,sans-serif]">
        <p className="text-lg font-extrabold text-[#1E3A5F]">Loading…</p>
      </div>
    );
  }

  return (
    <div className="box-border flex h-screen w-full items-center justify-center overflow-hidden bg-[#FDF6E3] bg-[radial-gradient(rgba(30,58,95,0.08)_1.5px,transparent_1.5px)] bg-[length:18px_18px] p-[2vh_2vw] font-[Baloo_2,Trebuchet_MS,Segoe_UI,sans-serif]">
      <style>{`
        @keyframes myHealthyPlateShakeWarn {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        @keyframes myHealthyPlatePopIn {
          0% { transform: translate(-50%,-50%) scale(0.4); opacity: 0; }
          70% { transform: translate(-50%,-50%) scale(1.12); opacity: 1; }
          100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
        }
        @keyframes myHealthyPlateFadeIn {
          0% { opacity: 0; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div className="relative box-border flex h-full w-full max-w-[1180px] flex-col overflow-hidden rounded-[32px] border-[4px] border-[#1E3A5F] bg-[#FFFDF7] shadow-[0_14px_0_rgba(30,58,95,0.12)]">
        <div className="absolute left-0 top-0 h-0 w-0 border-r-[36px] border-t-[36px] border-r-transparent border-t-[#F5B942]" />
        <div className="absolute right-0 top-0 h-0 w-0 border-l-[36px] border-t-[36px] border-l-transparent border-t-[#F5B942]" />

        {learnerName && (
          <div className="absolute left-3.5 top-2.5 z-10 flex items-center gap-1.5 rounded-full border-[2.5px] border-[#1E3A5F] bg-white py-1 pl-2 pr-3 text-xs font-extrabold text-[#1E3A5F]">
            <span className="text-[15px] leading-none" aria-hidden>
              🙋
            </span>
            <span className="max-w-[8rem] overflow-hidden text-ellipsis whitespace-nowrap">
              {learnerName}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={goHome}
          aria-label="Go home"
          className="absolute right-3.5 top-2.5 z-10 flex h-[34px] w-[34px] items-center justify-center rounded-full border-[2.5px] border-[#1E3A5F] bg-white"
        >
          <Home size={16} strokeWidth={2.6} color={NAVY} />
        </button>

        {!finished ? (
          <>
            {/* TOP: instruction */}
            <div className="flex flex-[0_0_18%] flex-col items-center justify-center p-[1.2vh_4vw_0.4vh] text-center">
              <div className="mb-0.5 flex w-full items-center justify-between">
                <span className="text-[clamp(11px,1.4vw,16px)] font-extrabold tracking-[1px] text-[#E8734A]">
                  MY HEALTHY PLATE
                </span>
                <span className="text-[clamp(11px,1.4vw,16px)] font-extrabold tracking-[1px] text-[#1E3A5F]">
                  SCORE: {placed.length} / {TARGET}
                </span>
              </div>
              <div className="text-[clamp(20px,2.8vw,32px)] font-black leading-[1.05] text-[#1E3A5F]">
                Tap healthy foods to add them to your plate!
              </div>
              <div className="mx-auto mt-1.5 h-[10px] w-full max-w-[460px] overflow-hidden rounded-[6px] border-2 border-[#1E3A5F] bg-[#EFE9D8]">
                <div
                  className="h-full bg-[#4FAE73] transition-[width] duration-300 ease-in-out"
                  style={{ width: `${(placed.length / TARGET) * 100}%` }}
                />
              </div>
            </div>

            {/* CENTER: plate */}
            <div className="relative flex flex-[1_1_50%] items-center justify-center">
              <div className="relative h-[clamp(220px,28vw,340px)] w-[clamp(220px,28vw,340px)] rounded-full border-[10px] border-[#BFD6E8] bg-[#F3F7FA] shadow-[inset_0_0_0_4px_#FFFFFF,0_8px_0_rgba(30,58,95,0.1)]">
                {placed.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center p-[10%] text-center text-[clamp(13px,1.6vw,17px)] font-extrabold text-[#BFD6E8]">
                    Your plate is empty
                  </div>
                )}
                {placed.map((key, i) => {
                  const food = HEALTHY_FOODS.find((f) => f.key === key);
                  const slot = SLOTS[i];
                  if (!food || !slot) return null;
                  const Art = food.Art;
                  return (
                    <div
                      key={key}
                      className="absolute h-[34%] w-[34%]"
                      style={{ left: `${slot.x}%`, top: `${slot.y}%`, animation: "myHealthyPlatePopIn 0.35s ease" }}
                    >
                      <Art />
                    </div>
                  );
                })}

                {transitioning && (
                  <div
                    className="absolute -inset-2.5 flex flex-col items-center justify-center rounded-full bg-[rgba(79,174,115,0.92)] p-[8%] text-center text-[#FFFDF7]"
                    style={{ animation: "myHealthyPlateFadeIn 0.25s ease" }}
                  >
                    <span className="text-[clamp(30px,4vw,42px)]">🎉</span>
                    <span className="mt-1 text-[clamp(14px,1.8vw,20px)] font-black">Great Job!</span>
                    <span className="mt-0.5 text-[clamp(11px,1.4vw,15px)] font-black opacity-90">Finishing up...</span>
                  </div>
                )}
              </div>

              {/* DONE button — early finish */}
              {!transitioning && (
                <button
                  type="button"
                  onClick={handleDone}
                  aria-label="Finish the activity now"
                  className="absolute bottom-[4%] right-[6%] flex items-center gap-2 rounded-[18px] border-4 border-[#1E3A5F] bg-[#4FAE73] px-[22px] py-[10px] text-[clamp(15px,2vw,20px)] font-black tracking-[1px] text-[#FFFDF7] shadow-[0_6px_0_rgba(30,58,95,0.3)] transition-transform duration-100 ease-in-out active:translate-y-1"
                >
                  ✓ DONE
                </button>
              )}
            </div>

            {/* BOTTOM: food choices */}
            <div className="box-border flex flex-[0_0_30%] items-center justify-center gap-[1.6%] p-[0_3%_2vh]">
              {[...HEALTHY_FOODS, ...UNHEALTHY_FOODS].map((food) => {
                const healthy = HEALTHY_FOODS.some((f) => f.key === food.key);
                const done = healthy && isPlaced(food.key);
                const isWarning = warning === food.key;
                return (
                  <button
                    key={food.key}
                    type="button"
                    onClick={() => (healthy ? handleTapHealthy(food) : handleTapUnhealthy(food))}
                    disabled={done || transitioning}
                    style={isWarning ? { animation: "myHealthyPlateShakeWarn 0.5s ease" } : undefined}
                    className={`relative flex h-[clamp(74px,9.6vw,114px)] w-[clamp(64px,8.4vw,100px)] flex-none flex-col items-center justify-center rounded-[18px] border-[3px] p-[6%_4%_4%] ${
                      done
                        ? "cursor-default bg-[#EAF4EC] opacity-55 shadow-none"
                        : transitioning
                          ? "cursor-default bg-white opacity-60 shadow-[0_4px_0_rgba(30,58,95,0.2)]"
                          : "cursor-pointer bg-white opacity-100 shadow-[0_4px_0_rgba(30,58,95,0.2)]"
                    } ${isWarning ? "border-[#E05B52]" : done ? "border-[#4FAE73]" : "border-[#1E3A5F]"}`}
                  >
                    <div className="h-[60%] w-[70%]">
                      <food.Art />
                    </div>
                    <span className="mt-0.5 text-[clamp(9px,1.05vw,12px)] font-extrabold text-[#1E3A5F]">
                      {food.name}
                    </span>
                    {done && (
                      <span className="absolute -right-2 -top-2 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-[#1E3A5F] bg-[#4FAE73] text-[13px] font-black text-white">
                        ✓
                      </span>
                    )}
                    {isWarning && <span className="absolute -right-2 -top-2 text-[18px]">⚠️</span>}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          /* COMPLETION SCREEN */
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-[2vh_4vw] text-center">
            <div className="text-[clamp(12px,1.6vw,18px)] font-extrabold tracking-[1.5px] text-[#E8734A]">
              MY HEALTHY PLATE
            </div>
            <div className="text-[clamp(24px,3.6vw,40px)] font-black text-[#1E3A5F]">
              {(activityName || "MY HEALTHY PLATE").toUpperCase()} COMPLETE!
            </div>
            <div className="text-[clamp(16px,2.2vw,24px)] font-extrabold text-[#1E3A5F]">
              Score: {finalScore} / {TARGET}
            </div>
            <Badge score={finalScore} />
            <div className="text-[clamp(13px,1.6vw,17px)] font-extrabold tracking-[0.5px] text-[#1E3A5F]">
              {getBadgeTier(finalScore).label}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
