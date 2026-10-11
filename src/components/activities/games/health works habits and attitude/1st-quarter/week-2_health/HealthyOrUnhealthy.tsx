"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Home } from "lucide-react";

import type { GameComponentProps, SubmittedAnswer } from "@/types/activity";
import { useSpeech, getLearnerFirstName } from "@/hooks/useSpeech";
import { learnerGreeting, GAME_INTRO_LINES } from "@/lib/speech-lines";

/* ------------------------------------------------------------------ */
/*  HEALTHY OR UNHEALTHY? — Kindergarten Food Sorting Game             */
/*  Tap the food's correct bin. Auto-advances. Score + badge at end.   */
/* ------------------------------------------------------------------ */

const NAVY = "#1E3A5F";
const ORANGE = "#E8734A";
const YELLOW = "#F5B942";
const GREEN = "#4FAE73";
const RED = "#E05B52";
const LINE = "#4A3628";

/* ---------------------------- Food art defs ------------------------ */

function FoodDefs() {
  return (
    <defs>
      <linearGradient id="appleGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FF8A73" />
        <stop offset="100%" stopColor="#E0483C" />
      </linearGradient>
      <linearGradient id="bananaGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FCE26B" />
        <stop offset="100%" stopColor="#F0B93D" />
      </linearGradient>
      <linearGradient id="broccoliGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#7FCB7F" />
        <stop offset="100%" stopColor="#3E9B57" />
      </linearGradient>
      <linearGradient id="fishGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#7FD4EE" />
        <stop offset="100%" stopColor="#3B9FCF" />
      </linearGradient>
      <linearGradient id="milkGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#D9EEF9" />
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
      <linearGradient id="lolliGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#FF9AD0" />
        <stop offset="100%" stopColor="#C13B8F" />
      </linearGradient>
      <linearGradient id="donutGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#FBAFCB" />
        <stop offset="100%" stopColor="#EE7DA6" />
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
      <path d="M112 46 C126 34 142 38 148 50 C138 56 122 56 112 46 Z" fill="url(#broccoliGrad)" stroke={LINE} strokeWidth="4" />
      <ellipse cx="72" cy="108" rx="16" ry="24" fill="#FFFFFF" opacity="0.35" />
    </svg>
  );
}

function Banana() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <FoodDefs />
      <path d="M52 150 C40 110 56 60 100 42 C112 38 118 48 108 54 C78 70 66 112 78 146 C86 168 62 172 52 150 Z" fill="url(#bananaGrad)" stroke={LINE} strokeWidth="5" strokeLinejoin="round" />
      <ellipse cx="102" cy="46" rx="10" ry="7" fill="#8A5A2B" stroke={LINE} strokeWidth="3" />
      <ellipse cx="56" cy="152" rx="9" ry="7" fill="#8A5A2B" stroke={LINE} strokeWidth="3" />
      <path d="M64 128 C70 108 82 88 96 76" stroke="#FFF3C4" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function Broccoli() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <FoodDefs />
      <rect x="88" y="120" width="24" height="55" rx="10" fill="#E7D89A" stroke={LINE} strokeWidth="4" />
      {[[70, 110, 26], [100, 92, 32], [132, 110, 26], [85, 80, 22], [118, 80, 22], [100, 64, 20]].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="url(#broccoliGrad)" stroke={LINE} strokeWidth="4" />
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
      <path d="M110 100 Q100 108 110 116" stroke="#2C7C9E" strokeWidth="3" fill="none" opacity="0.6" />
      <ellipse cx="130" cy="80" rx="14" ry="8" fill="#FFFFFF" opacity="0.3" />
    </svg>
  );
}

function Milk() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <FoodDefs />
      <path d="M76 46 L124 46 L124 66 L140 88 L140 172 C140 178 134 182 128 182 L72 182 C66 182 60 178 60 172 L60 88 L76 66 Z" fill="url(#milkGrad)" stroke={LINE} strokeWidth="5" strokeLinejoin="round" />
      <path d="M76 46 L100 62 L124 46" fill="none" stroke={LINE} strokeWidth="5" strokeLinejoin="round" />
      <rect x="60" y="120" width="80" height="34" fill="#BFE3F5" opacity="0.7" />
      <text x="100" y="142" textAnchor="middle" fontSize="16" fontWeight="900" fill="#2E6E93" fontFamily="inherit">MILK</text>
      <ellipse cx="76" cy="100" rx="7" ry="18" fill="#FFFFFF" opacity="0.7" />
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
      <path d="M100 74 L110 110" stroke="#FFFFFF" strokeWidth="5" opacity="0.4" strokeLinecap="round" />
    </svg>
  );
}

function Soda() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <FoodDefs />
      <rect x="66" y="56" width="68" height="110" rx="14" fill="url(#sodaGrad)" stroke={LINE} strokeWidth="5" />
      <rect x="66" y="56" width="68" height="24" rx="12" fill="#D8DCE0" stroke={LINE} strokeWidth="4" />
      <ellipse cx="100" cy="62" rx="16" ry="5" fill="#B7BEC6" />
      <rect x="70" y="96" width="60" height="30" fill="#FFFFFF" opacity="0.85" rx="4" />
      <text x="100" y="117" textAnchor="middle" fontSize="14" fontWeight="900" fill={RED} fontFamily="inherit">SODA</text>
      <circle cx="150" cy="70" r="6" fill="#FFFFFF" opacity="0.8" />
      <circle cx="156" cy="90" r="4" fill="#FFFFFF" opacity="0.7" />
      <circle cx="148" cy="106" r="5" fill="#FFFFFF" opacity="0.6" />
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
      <ellipse cx="118" cy="150" rx="16" ry="9" fill="#FBCB4B" stroke={LINE} strokeWidth="3" opacity="0.9" />
    </svg>
  );
}

function Lollipop() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <FoodDefs />
      <rect x="94" y="118" width="12" height="60" rx="6" fill="#E7D89A" stroke={LINE} strokeWidth="4" />
      <circle cx="100" cy="86" r="52" fill="url(#lolliGrad)" stroke={LINE} strokeWidth="5" />
      <path d="M100 86 m0 -40 a40 40 0 0 1 40 40 a28 28 0 0 1 -28 28 a16 16 0 0 1 -16 -16 a6 6 0 0 1 6 -6" fill="none" stroke="#FFD9EC" strokeWidth="7" strokeLinecap="round" opacity="0.85" />
      <ellipse cx="82" cy="68" rx="10" ry="6" fill="#FFFFFF" opacity="0.5" />
    </svg>
  );
}

function Donut() {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%">
      <FoodDefs />
      <circle cx="100" cy="106" r="62" fill="#E7B87E" stroke={LINE} strokeWidth="5" />
      <circle cx="100" cy="106" r="24" fill="#FDF6E3" stroke={LINE} strokeWidth="5" />
      <path d="M40 96 C50 60 76 44 100 44 C134 44 158 66 160 96 C150 82 128 92 118 82 C106 70 92 92 78 82 C64 72 48 84 40 96 Z" fill="url(#donutGrad)" stroke={LINE} strokeWidth="5" strokeLinejoin="round" />
      {[[70, 66], [92, 54], [116, 58], [136, 72], [60, 84], [128, 88]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="10" height="4" rx="2" fill={i % 2 ? YELLOW : "#FFFFFF"} transform={`rotate(${i * 35} ${x} ${y})`} />
      ))}
    </svg>
  );
}

/* ------------------------------- Art registry --------------------------- */
/*  Code-owned art, keyed to match the DB question_key exactly — the DB      */
/*  (activity_questions) only carries which key is "healthy" vs "unhealthy", */
/*  the authoritative source for grading. See                                */
/*  scripts/sql/healthy-or-unhealthy-rounds.sql.                             */

type FoodKey =
  | "apple"
  | "banana"
  | "broccoli"
  | "fish"
  | "milk"
  | "candy"
  | "soda"
  | "chips"
  | "lollipop"
  | "donut";

interface ArtEntry {
  name: string;
  healthy: boolean;
  Art: () => React.ReactNode;
}

const ART_BY_KEY: Record<FoodKey, ArtEntry> = {
  apple: { name: "APPLE", healthy: true, Art: () => <Apple /> },
  banana: { name: "BANANA", healthy: true, Art: () => <Banana /> },
  broccoli: { name: "BROCCOLI", healthy: true, Art: () => <Broccoli /> },
  fish: { name: "FISH", healthy: true, Art: () => <Fish /> },
  milk: { name: "MILK", healthy: true, Art: () => <Milk /> },
  candy: { name: "CANDY", healthy: false, Art: () => <Candy /> },
  soda: { name: "SODA", healthy: false, Art: () => <Soda /> },
  chips: { name: "CHIPS", healthy: false, Art: () => <Chips /> },
  lollipop: { name: "LOLLIPOP", healthy: false, Art: () => <Lollipop /> },
  donut: { name: "DONUT", healthy: false, Art: () => <Donut /> },
};

function isFoodKey(value: string): value is FoodKey {
  return value in ART_BY_KEY;
}

interface Round {
  id: FoodKey;
  name: string;
  healthy: boolean;
  Art: () => React.ReactNode;
}

/** Question data as stored in `activity_questions.question_data`. */
interface QuestionRow {
  questionKey: string;
  questionOrder: number;
  questionData: unknown;
  correctAnswer: { answer: string };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ------------------------------ Badge ---------------------------------- */

interface BadgeTier {
  label: string;
  ring: string;
  face: string;
  ribbon: string;
}

function getBadgeTier(score: number, total: number): BadgeTier {
  if (score === total && total > 0) return { label: "GOLD MEDAL", ring: YELLOW, face: "#FFE9A8", ribbon: ORANGE };
  if (score >= Math.ceil(total * 0.8)) return { label: "SILVER MEDAL", ring: "#C9D2DA", face: "#EDF1F4", ribbon: "#6E93E8" };
  if (score >= Math.ceil(total * 0.6)) return { label: "BRONZE MEDAL", ring: "#CD8B4E", face: "#F0CBA0", ribbon: GREEN };
  if (score >= Math.ceil(total * 0.3)) return { label: "STARTER BADGE", ring: "#8ED9A8", face: "#E4F7EA", ribbon: GREEN };
  if (score >= 1) return { label: "BEGINNER BADGE", ring: "#8FB3F5", face: "#E7EFFD", ribbon: "#6E93E8" };
  return { label: "KEEP PRACTICING", ring: "#E0A9A2", face: "#FBEAE8", ribbon: RED };
}

function Badge({ score, total }: { score: number; total: number }) {
  const t = getBadgeTier(score, total);
  const [word1, ...rest] = t.label.split(" ");
  return (
    <svg viewBox="0 0 200 220" width="180" height="198">
      <path d="M70 120 L40 210 L100 180 L160 210 L130 120 Z" fill={t.ribbon} stroke={NAVY} strokeWidth="5" />
      <circle cx="100" cy="90" r="72" fill={t.ring} stroke={NAVY} strokeWidth="6" />
      <circle cx="100" cy="90" r="54" fill={t.face} stroke={NAVY} strokeWidth="4" />
      <text x="100" y="82" textAnchor="middle" fontSize="42" fontWeight="900" fill={NAVY} fontFamily="inherit">★</text>
      <text x="100" y="112" textAnchor="middle" fontSize="11" fontWeight="800" fill={NAVY} fontFamily="inherit">
        {word1}
      </text>
      <text x="100" y="126" textAnchor="middle" fontSize="11" fontWeight="800" fill={NAVY} fontFamily="inherit">
        {rest.join(" ")}
      </text>
    </svg>
  );
}

/* ------------------------------ Sound ----------------------------------- */

function useChime() {
  const ctxRef = useRef<AudioContext | null>(null);
  return useCallback((positive: boolean) => {
    try {
      if (!ctxRef.current) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctxRef.current = new AC();
      }
      const ctx = ctxRef.current;
      const now = ctx.currentTime;
      const notes = positive ? [523.25, 659.25, 783.99] : [330, 262];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.22, now + i * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.09 + 0.22);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.24);
      });
    } catch {
      /* audio unavailable */
    }
  }, []);
}

/* -------------------------------- App ------------------------------------ */

type Choice = "healthy" | "unhealthy";
type Feedback = "correct" | "wrong" | null;

export default function HealthyOrUnhealthy({
  activityId,
  activityName,
  onFinish,
}: GameComponentProps) {
  const router = useRouter();
  const { speakAll, stop } = useSpeech();

  const [rounds, setRounds] = useState<Round[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Question data lives in the DB (activity_questions), fetched once — every
  // other activity in this app works the same way. Only which key is
  // healthy vs unhealthy comes from the server; the art itself is
  // code-owned above.
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

        const mapped: Round[] = rows
          .filter((row) => isFoodKey(row.questionKey))
          .map((row) => {
            const key = row.questionKey as FoodKey;
            const entry = ART_BY_KEY[key];
            return {
              id: key,
              name: entry.name,
              healthy: row.correctAnswer.answer === "healthy",
              Art: entry.Art,
            };
          });

        setRounds(shuffle(mapped));
      } catch (err) {
        console.error("Failed to load Healthy or Unhealthy questions:", err);
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activityId]);

  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [chosen, setChosen] = useState<Choice | null>(null);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<SubmittedAnswer[]>([]);
  const playChime = useChime();

  const total = rounds?.length ?? 0;
  const item = rounds ? rounds[index] : undefined;
  const Art = item?.Art;

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
        GAME_INTRO_LINES["healthy or unhealthy"],
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

  const handleChoice = (choice: Choice) => {
    if (feedback || !item) return;
    const isCorrect = (choice === "healthy") === item.healthy;
    setChosen(choice);
    setFeedback(isCorrect ? "correct" : "wrong");
    playChime(isCorrect);
    if (isCorrect) setScore((s) => s + 1);

    const nextAnswers = [...answers, { questionId: item.id, response: choice }];
    setAnswers(nextAnswers);

    setTimeout(() => {
      if (rounds && index < rounds.length - 1) {
        setIndex((i) => i + 1);
        setFeedback(null);
        setChosen(null);
      } else {
        setFinished(true);
        handleFinish(nextAnswers);
      }
    }, 950);
  };

  const goHome = useCallback(() => {
    stop();
    router.push("/learner");
  }, [stop, router]);

  if (loadError) {
    return (
      <div className="box-border flex h-screen w-full items-center justify-center overflow-hidden bg-[#FDF6E3] font-[Baloo_2,Trebuchet_MS,Segoe_UI,sans-serif]">
        <p className="text-lg font-extrabold text-[#1E3A5F]">
          Couldn&apos;t load this activity. Please try again.
        </p>
      </div>
    );
  }

  if (!rounds || !item) {
    return (
      <div className="box-border flex h-screen w-full items-center justify-center overflow-hidden bg-[#FDF6E3] font-[Baloo_2,Trebuchet_MS,Segoe_UI,sans-serif]">
        <p className="text-lg font-extrabold text-[#1E3A5F]">Loading…</p>
      </div>
    );
  }

  const progressPct = (index / total) * 100;
  const tier = getBadgeTier(score, total);

  return (
    <div className="box-border flex h-screen w-full items-center justify-center overflow-hidden bg-[#FDF6E3] bg-[radial-gradient(rgba(30,58,95,0.08)_1.5px,transparent_1.5px)] bg-[length:18px_18px] p-[2vh_2vw] font-[Baloo_2,Trebuchet_MS,Segoe_UI,sans-serif]">
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
            {/* TOP */}
            <div className="flex flex-none flex-col items-center justify-center p-[1.2vh_4vw_0.4vh] text-center">
              <div className="mb-1 flex w-full items-center justify-between">
                <span className="text-[clamp(11px,1.4vw,16px)] font-extrabold tracking-[1px] text-[#E8734A]">
                  FOOD {index + 1} OF {total}
                </span>
                <span className="text-[clamp(11px,1.4vw,16px)] font-extrabold tracking-[1px] text-[#1E3A5F]">
                  SCORE: {score} / {total}
                </span>
              </div>

              <div className="text-[clamp(22px,3.4vw,38px)] font-black leading-[1.05] text-[#1E3A5F]">
                {activityName || "HEALTHY OR UNHEALTHY?"}
              </div>
              <div className="mb-2 text-[clamp(12px,1.4vw,16px)] font-semibold text-[#1E3A5F]/70">
                Tap the correct bin.
              </div>

              <div className="mx-auto h-[10px] w-full max-w-[460px] overflow-hidden rounded-[6px] border-2 border-[#1E3A5F] bg-[#EFE9D8]">
                <div
                  className="h-full bg-[#4FAE73] transition-[width] duration-300 ease-in-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            {/* MIDDLE: food */}
            <div className="relative flex flex-1 items-center justify-center">
              <div className="relative flex h-[clamp(160px,22vw,260px)] w-[clamp(160px,22vw,260px)] flex-col items-center justify-center rounded-[28px] border-4 border-[#1E3A5F] bg-white p-[1.2vh] shadow-[0_8px_0_rgba(30,58,95,0.1)]">
                <div className="h-[78%] w-[78%]">{Art && <Art />}</div>
                <div className="mt-0.5 text-[clamp(13px,1.6vw,18px)] font-extrabold tracking-[1px] text-[#1E3A5F]">
                  {item.name}
                </div>

                {feedback && (
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-[24px] border-[5px] ${
                      feedback === "correct"
                        ? "border-[#4FAE73] bg-[#4FAE73]/[0.18]"
                        : "border-[#E05B52] bg-[#E05B52]/[0.18]"
                    }`}
                  >
                    <span className="text-[clamp(40px,5.5vw,56px)]">
                      {feedback === "correct" ? "😊" : "😟"}
                    </span>
                    <span className="text-[clamp(13px,1.6vw,18px)] font-extrabold text-[#1E3A5F]">
                      {feedback === "correct" ? "Correct!" : "Not quite!"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* BOTTOM: bins */}
            <div className="box-border flex flex-none gap-[3%] p-[0_5%_2.5vh]">
              <button
                type="button"
                onClick={() => handleChoice("healthy")}
                disabled={!!feedback}
                className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-[24px] border-4 border-[#1E3A5F] text-[clamp(18px,2.6vw,28px)] font-black tracking-[1px] text-[#1E3A5F] shadow-[0_6px_0_rgba(30,58,95,0.28)] transition-[transform,background] duration-150 ease-in-out active:translate-y-1 ${
                  feedback ? "cursor-default" : "cursor-pointer"
                } ${chosen === "healthy" ? "bg-[#4FAE73]" : "bg-[#8ED9A8]"} ${
                  feedback && chosen !== "healthy" ? "opacity-60" : "opacity-100"
                }`}
              >
                <span className="text-[clamp(22px,3vw,32px)]">🟢</span>
                HEALTHY
              </button>

              <button
                type="button"
                onClick={() => handleChoice("unhealthy")}
                disabled={!!feedback}
                className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-[24px] border-4 border-[#1E3A5F] text-[clamp(18px,2.6vw,28px)] font-black tracking-[1px] text-[#1E3A5F] shadow-[0_6px_0_rgba(30,58,95,0.28)] transition-[transform,background] duration-150 ease-in-out active:translate-y-1 ${
                  feedback ? "cursor-default" : "cursor-pointer"
                } ${chosen === "unhealthy" ? "bg-[#E05B52]" : "bg-[#F0968D]"} ${
                  feedback && chosen !== "unhealthy" ? "opacity-60" : "opacity-100"
                }`}
              >
                <span className="text-[clamp(22px,3vw,32px)]">🔴</span>
                UNHEALTHY
              </button>
            </div>
          </>
        ) : (
          /* COMPLETION SCREEN */
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-[2vh_4vw] text-center">
            <div className="text-[clamp(12px,1.6vw,18px)] font-extrabold tracking-[1.5px] text-[#E8734A]">
              HEALTHY OR UNHEALTHY?
            </div>
            <div className="text-[clamp(24px,3.6vw,40px)] font-black text-[#1E3A5F]">
              HEALTHY OR UNHEALTHY COMPLETE!
            </div>
            <div className="text-[clamp(16px,2.2vw,24px)] font-extrabold text-[#1E3A5F]">
              Score: {score} / {total}
            </div>
            <Badge score={score} total={total} />
            <div className="text-[clamp(13px,1.6vw,17px)] font-extrabold tracking-[0.5px] text-[#1E3A5F]">
              {tier.label}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
