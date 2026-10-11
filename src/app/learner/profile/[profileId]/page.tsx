"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import Image from "next/image";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { AnimatedDog } from "@/components/learner/animated-dog";
import { LearnerAvatar } from "@/components/learner/learner-avatar";

interface Learner {
  id: number;
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  photoUrl: string | null;
}

export default function LearnerProfilePage({ params }: { params: Promise<{ profileId: string }> }) {
  const { profileId } = use(params);
  const router = useRouter();
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [learner, setLearner] = useState<Learner | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activityName, setActivityName] = useState<string | null>(null);
  const [activityCompleted, setActivityCompleted] = useState<boolean>(false);

  useEffect(() => {
    async function refreshStatus() {
      const [sessionResult, completionResult] = await Promise.all([
        apiFetch(`/api/classroom-session?learnerId=${profileId}`).then((res) => res.json()),
        apiFetch(`/api/classroom-session/completion?learnerId=${profileId}`).then((res) => res.json()),
      ]);

      setIsActive(sessionResult.active);
      setActivityName(sessionResult.activityName || null);
      setActivityCompleted(Boolean(completionResult.completed));
    }

    async function fetchLearner() {
      try {
        // The device's own learner, remembered by the server when the name was picked.
        const res = await apiFetch("/api/classroom-session/me");
        if (!res.ok) {
          router.push("/learner");
          return;
        }
        const data = await res.json();
        if (data.id !== Number(profileId)) {
          router.push("/learner");
          return;
        }
        setLearner(data);
        // Refreshes the copy the games read, so a photo uploaded after the name was picked still shows.
        sessionStorage.setItem("selectedLearner", JSON.stringify(data));
      } catch {
        router.push("/learner");
        return;
      }

      try {
        await refreshStatus();
      } catch {
        setIsActive(false);
      } finally {
        setLoading(false);
      }
    }

    fetchLearner();
    const interval = setInterval(() => {
      refreshStatus().catch((err) => {
        // Deliberately keeps the graceful fallback: a transient poll failure
        // must not blank a child's screen mid-activity.
        console.error("[learner/profile] status poll failed:", err);
        setIsActive(false);
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [profileId, router]);

  const handleStart = async () => {
    if (!learner) return;
    try {
      const joinResponse = await apiFetch("/api/classroom-session/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnerId: learner.id }),
      });

      if (joinResponse.status === 409) {
        router.push("/learner/class-ended");
        return;
      }

      // 400 (class not started / already ended) or 403 (not on the teacher's
      // roster) must not fall through to the activity — the server is the
      // authority on whether this child may play.
      if (!joinResponse.ok) {
        setIsActive(false);
        return;
      }
    } catch (err) {
      console.error("Error joining session:", err);
      return;
    }
    const query = activityName ? `?name=${encodeURIComponent(activityName)}` : "";
    // Via the lesson video first — that page forwards to the activity, or skips
    // straight to it when the lesson has no lesson_videos row.
    router.push(`/learner/lesson${query}`);
  };

  if (loading || isActive === null || !learner) {
    return (
      <main className="min-h-dvh learner-bg flex flex-col items-center justify-center p-8">
        <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-8 max-w-sm w-full text-center flex flex-col items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full bg-[#f2c94c]/30" />
          <Skeleton className="w-48 h-5 rounded-full bg-[#f2c94c]/30" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh learner-bg flex items-center justify-center p-4 sm:p-8 short:p-3 relative overflow-x-hidden overflow-y-auto">
      <AnimatedDog />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <Link href="/learner" className="absolute top-4 left-4 short:top-2 short:left-2 z-10 rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-[#f2c94c] focus-visible:ring-offset-2">
                <Image src="/images/buttons/home-button.png" alt="Home" width={1536} height={1024} priority className="w-24 h-16 sm:w-32 sm:h-[85px] md:w-36 md:h-24 short:w-16 short:h-11 hover:scale-105 active:scale-95 transition-transform" />
              </Link>
            }
          />
          <TooltipContent>Home</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Short screens lay the card out side by side (details left, button right) so it fits the height. */}
      <div className="w-full max-w-lg short:max-w-xl short:flex short:items-center my-auto bg-white rounded-3xl shadow-2xl border-4 border-[#f2c94c] overflow-hidden">
        <div className="bg-gradient-to-b from-[#ffe08a] to-[#f2c94c] p-4 sm:p-8 short:p-3 short:flex-1 short:self-stretch short:justify-center flex flex-col items-center relative">
          <LearnerAvatar
            photoUrl={learner.photoUrl}
            firstName={learner.firstName}
            className="w-20 h-20 sm:w-36 sm:h-36 border-8 border-white bg-white text-[#a35b00] text-4xl sm:text-7xl shadow-lg mt-2 sm:mt-4 short:w-16 short:h-16 short:border-4 short:text-3xl short:mt-0"
          />

          <h1 className="mt-3 sm:mt-6 short:mt-1.5 text-xl sm:text-3xl short:text-lg font-bold text-center text-[#a35b00]">
            {learner.firstName} {learner.lastName}
          </h1>
          <p className="mt-2 short:mt-0.5 text-sm short:text-xs text-[#a35b00]/80 text-center">
            {isActive
              ? activityName
                ? `Ready to start: ${activityName}!`
                : "Ready to start the activity!"
              : "Waiting for teacher to start..."}
          </p>
        </div>

        <button
          onClick={handleStart}
          disabled={!isActive || activityCompleted}
          className={`w-full max-w-xs mx-auto my-4 py-3 sm:my-8 sm:py-4 short:w-auto short:shrink-0 short:mx-5 short:my-0 short:px-6 short:py-2.5 short:text-base rounded-full text-xl font-black flex items-center justify-center gap-2 border-none outline-none transition-all duration-200 focus-visible:ring-4 focus-visible:ring-[#f2c94c] focus-visible:ring-offset-2 ${isActive
              ? activityCompleted
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-[#ffe08a] hover:bg-[#f2c94c] hover:scale-105 active:scale-95 text-[#a35b00] shadow-[0_4px_0_#f2c94c] cursor-pointer"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
        >
          <Play size={22} className={isActive ? "fill-[#a35b00]" : "fill-gray-400"} />
          {activityCompleted ? "COMPLETED" : isActive ? "START" : "Waiting for Session..."}
        </button>
      </div>
    </main>
  );
}
