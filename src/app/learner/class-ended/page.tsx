"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import FireworksEffect from "@/components/effects/FireworksEffect";
import { LottieAnimation } from "@/components/ui/lottie-animation";
import { apiFetch } from "@/lib/api";
import type { PracticalResultValue } from "@/constants/enums";
import { ratingBand } from "@/lib/score-band";

interface Learner {
  id: number;
  firstName: string;
  lastName: string;
}

interface Badge {
  label: string;
  image: string;
}

const BADGES = {
  gold: "/images/badges/superstar.webp",
  silver: "/images/badges/great-job.webp",
  bronze: "/images/badges/good-effort.webp",
  green: "/images/badges/keep-trying.webp",
} as const;

function getBadge(score: number, total: number): Badge {
  const pct = total > 0 ? score / total : 0;

  if (pct >= 0.9) return { label: "Superstar!", image: BADGES.gold };
  if (pct >= 0.7) return { label: "Great Job!", image: BADGES.silver };
  if (pct > 0.4) return { label: "Good Effort!", image: BADGES.bronze };
  return { label: "Keep Trying!", image: BADGES.green };
}

/** A practical activity's 1–5 rating, by the teacher's report bands: 4–5 gold, 3 silver, 1–2 keep practicing. */
function getPracticalBadge(result: PracticalResultValue): Badge {
  const band = ratingBand(result);
  if (band === "very_good") return { label: "Excellent!", image: BADGES.gold };
  if (band === "good") return { label: "Great Job!", image: BADGES.silver };
  return { label: "Keep Practicing!", image: BADGES.green };
}

// Polls until the teacher rates, however long that takes, so a late rating still shows its badge and cheer.
const PRACTICAL_RESULT_POLL_INTERVAL_MS = 3000;

function ClassEndedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [learnerName, setLearnerName] = useState<string | null>(null);
  const [learnerId, setLearnerId] = useState<number | null>(null);

  const scoreParam = searchParams.get("score");
  const totalParam = searchParams.get("total");
  const activity = searchParams.get("activity");
  const activityIdParam = searchParams.get("activityId");

  const hasScore = scoreParam !== null && totalParam !== null;
  const score = Number(scoreParam);
  const total = Number(totalParam);

  // A practical activity has no score — its grading is the teacher's later
  // rating, so this page polls for it briefly instead of getting it upfront.
  const [practicalResult, setPracticalResult] = useState<PracticalResultValue | null>(null);
  const practicalPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (hasScore || !activityIdParam) return;

    let cancelled = false;

    async function poll() {
      try {
        const res = await apiFetch(`/api/classroom-session/practical-result?activityId=${activityIdParam}`);
        const data = await res.json();
        if (cancelled) return;
        if (data.rated) {
          setPracticalResult(data.result);
          if (practicalPollRef.current) clearInterval(practicalPollRef.current);
          return;
        }
      } catch (err) {
        console.error("Failed to check practical activity result:", err);
      }
    }

    poll();
    practicalPollRef.current = setInterval(poll, PRACTICAL_RESULT_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (practicalPollRef.current) clearInterval(practicalPollRef.current);
    };
  }, [hasScore, activityIdParam]);

  // The name comes from the server's remembered learner, so it shows even after a reload; the stored copy is cleared on class end.
  useEffect(() => {
    sessionStorage.removeItem("selectedLearner");
    let cancelled = false;
    apiFetch("/api/classroom-session/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Learner | null) => {
        if (cancelled || !data) return;
        if (data.firstName) setLearnerName(data.firstName);
        setLearnerId(data.id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const badge = hasScore
    ? getBadge(score, total)
    : practicalResult
      ? getPracticalBadge(practicalResult)
      : null;

  // Cheers once when the badge appears; if the browser blocks it (e.g. after a reload), it plays on the child's first tap instead.
  const hasBadge = Boolean(badge);
  useEffect(() => {
    if (!hasBadge) return;
    const yay = new Audio("/sound/kids-saying-yay-sound-effect_3.mp3");
    let cancelled = false;
    const playOnTap = () => void yay.play().catch(() => {});
    // A play() cut off by the cleanup below also rejects, and must not leave a tap listener behind.
    yay.play().catch(() => {
      if (!cancelled) window.addEventListener("pointerdown", playOnTap, { once: true });
    });
    return () => {
      cancelled = true;
      yay.pause();
      window.removeEventListener("pointerdown", playOnTap);
    };
  }, [hasBadge]);

  // Waiting for the teacher's rating: no score, an activity to poll for, and
  // nothing back yet (either still polling or the window expired).
  const isAwaitingPracticalResult = !hasScore && Boolean(activityIdParam) && !practicalResult;

  // This screen is reached two ways: the class session itself ended (no
  // score, no activityId — the plain "class inactive" redirect), or a
  // learner just finished one activity while the class is still running
  // (handleFinish/handlePracticalContinue always pass score or activityId).
  // Only the first case is actually "class has ended".
  const heading = hasScore
    ? "Activity completed!"
    : activityIdParam
      ? "The Activity demonstration has ended."
      : "Today's class has ended.";

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-200 via-yellow-100 to-pink-200 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Sustained celebration for any badge — digital score or practical rating. */}
      <FireworksEffect active={Boolean(badge)} />

      <div className="w-full max-w-xl bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-6 sm:p-8 border border-white/40 text-center space-y-3 transform hover:scale-[1.01] transition-all duration-300">
        <LottieAnimation src="/animations/Graduation Hat.lottie" className="mx-auto size-28 sm:size-32" />

        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-extrabold text-blue-800 tracking-tight leading-tight">
            {heading}
          </h1>
          {learnerName && (
            <p className="text-gray-600 text-lg sm:text-xl font-medium max-w-md mx-auto leading-relaxed">
              Great work, {learnerName}!
            </p>
          )}
        </div>

        {badge && (
          <div className="flex flex-col items-center gap-2">
            {activity && (
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                {activity}
              </span>
            )}

            <Image src={badge.image} alt="" width={160} height={160} priority className="badge-pop size-36 object-contain sm:size-40" />

            <span className="text-xl font-extrabold text-gray-800">{badge.label}</span>

            {hasScore && (
              <span className="rounded-full bg-[#ffe08a] px-6 py-2 text-base font-extrabold text-[#a35b00] shadow-[0_4px_0_#f2c94c]">
                Score: {score}/{total}
              </span>
            )}
          </div>
        )}

        {isAwaitingPracticalResult && (
          <div className="flex flex-col items-center gap-2 py-2">
            {activity && (
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                {activity}
              </span>
            )}
            <p className="text-gray-600 text-base font-medium max-w-sm mx-auto leading-relaxed">
              Ask your teacher how you did today!
            </p>
            <p className="animate-pulse text-sm font-semibold text-gray-400">Waiting for rating...</p>
          </div>
        )}

        {/* Once it has a badge (a digital score, or a practical one the teacher has rated), Finish returns to the learner's own profile; the picker only if the device forgot them. */}
        {badge && (
          <button
            type="button"
            onClick={() => router.push(learnerId ? `/learner/profile/${learnerId}` : "/learner")}
            className="mx-auto block rounded-full transition-transform duration-150 ease-out hover:scale-105 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4f8fe0] focus-visible:ring-offset-2"
          >
            {/* The artwork has wide transparent margins, so it is shown zoomed inside a box cropped to the button itself. */}
            <span className="relative block aspect-[2.7] h-14 overflow-hidden sm:h-16">
              <Image
                src="/images/buttons/Green_finish_game_button.webp"
                alt="Finish"
                width={1376}
                height={768}
                priority
                className="absolute left-1/2 top-1/2 h-auto w-[135%] max-w-none -translate-x-1/2 -translate-y-1/2"
              />
            </span>
          </button>
        )}
      </div>

      <style>{`
        @keyframes badgePopIn {
          0% {
            transform: scale(0) rotate(-15deg);
            opacity: 0;
          }
          60% {
            transform: scale(1.15) rotate(6deg);
            opacity: 1;
          }
          80% {
            transform: scale(0.95) rotate(-2deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
          }
        }
        .badge-pop {
          animation: badgePopIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both;
        }
      `}</style>
    </main>
  );
}

export default function ClassEndedPage() {
  return (
    <Suspense fallback={null}>
      <ClassEndedContent />
    </Suspense>
  );
}