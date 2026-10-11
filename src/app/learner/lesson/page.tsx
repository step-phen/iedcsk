"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";

/**
 * The lesson's intro video, shown between the learner tapping START on their
 * profile and the activity itself.
 *
 * The video belongs to the LESSON (public.lesson_videos, one row per lesson
 * at most), not to any game — the same game component is reused across
 * lessons/weeks, so a video hardcoded in a game would pin it to one week
 * forever. Games contain no video code.
 *
 * Session rules here deliberately mirror app/learner/activity/page.tsx (same
 * sessionStorage guard, same 3s poll, same class-ended redirects) so a class
 * ending or a learner being removed behaves identically on both screens.
 */

interface SessionInfo {
  activityId: number | null;
  activityName: string | null;
  lessonName: string | null;
  lessonVideoUrl: string | null;
  participantStatus: string | null;
}

export default function LessonPage() {
  return (
    <Suspense fallback={<LoadingCard />}>
      <LessonContent />
    </Suspense>
  );
}

function LoadingCard() {
  return (
    <div className="min-h-screen bg-[#fef9ed] flex flex-col items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-2xl border-4 border-[#f2c94c] p-8 max-w-sm w-full text-center flex flex-col items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <Skeleton className="w-48 h-5" />
      </div>
    </div>
  );
}

function LessonContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlActivityName = searchParams.get("name");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [checking, setChecking] = useState(true);
  // A video whose file is missing (or codec unsupported) must not trap the
  // learner staring at a dead player — swap it for the forward button.
  // Keyed by URL, not a boolean: if the teacher switches to a different
  // lesson mid-session, a previous failure must not suppress the new video.
  const [erroredVideoUrl, setErroredVideoUrl] = useState<string | null>(null);

  // Once any navigation is committed, the 3s poll must stop acting: otherwise
  // a tick landing mid-transition fires a second redirect over the first.
  const isNavigatingRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goToActivity = useCallback(
    (name: string | null, replace = false) => {
      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      const query = name ? `?name=${encodeURIComponent(name)}` : "";
      const href = `/learner/activity${query}`;
      // replace() for the auto-skip path only: the lesson page never rendered,
      // so leaving it in history would just bounce the learner right back
      // through this same redirect when they press back.
      if (replace) router.replace(href);
      else router.push(href);
    },
    [router],
  );

  useEffect(() => {
    const savedLearner = sessionStorage.getItem("selectedLearner");

    if (!savedLearner) {
      router.push("/learner");
      return;
    }

    try {
      const learner = JSON.parse(savedLearner);
      const currentLearnerId = Number(learner.id);

      async function checkSession(currentId: number) {
        try {
          const res = await apiFetch(`/api/classroom-session?learnerId=${currentId}`);
          const data = await res.json();

          if (isNavigatingRef.current) return;

          if (!data.active || data.participantStatus === "Finished") {
            isNavigatingRef.current = true;
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            router.push("/learner/class-ended");
            return;
          }

          const videoUrl: string | null = data.lessonVideoUrl || null;

          // No video for this lesson (the default until one is produced) —
          // go straight to the activity rather than showing an empty screen.
          // Fires while the skeleton is still up, so there's no visible flash.
          if (!videoUrl) {
            goToActivity(urlActivityName || data.activityName || null, true);
            return;
          }

          setSessionInfo({
            activityId: data.activityId ?? null,
            activityName: data.activityName ?? null,
            lessonName: data.lessonName ?? null,
            lessonVideoUrl: videoUrl,
            participantStatus: data.participantStatus ?? null,
          });
        } catch (err) {
          // A transient poll failure must not blank a child's screen — keep
          // whatever is already on it and try again on the next tick.
          console.error("Error checking session on the lesson page:", err);
        } finally {
          setChecking(false);
        }
      }

      checkSession(currentLearnerId);
      pollIntervalRef.current = setInterval(() => {
        checkSession(currentLearnerId);
      }, 3000);
      return () => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      };
    } catch {
      router.push("/learner");
      return;
    }
  }, [router, urlActivityName, goToActivity]);

  useEffect(() => {
    if (sessionInfo?.lessonName) {
      document.title = `${sessionInfo.lessonName} | IEDCSK`;
    }
  }, [sessionInfo?.lessonName]);

  if (checking || sessionInfo === null) {
    return <LoadingCard />;
  }

  const activityName = urlActivityName || sessionInfo.activityName;
  const videoUrl = sessionInfo.lessonVideoUrl;
  const showVideo = Boolean(videoUrl) && erroredVideoUrl !== videoUrl;

  return (
    <div className="min-h-dvh learner-bg flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-4xl flex flex-col items-center gap-5">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[#eb6a45]">
            Today&apos;s Lesson
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-[#16215c]">
            {sessionInfo.lessonName || "Let's Watch!"}
          </h1>
        </div>

        {showVideo ? (
          <video
            // Remount on URL change so a swapped lesson actually reloads —
            // changing src alone doesn't reliably reload a <video>.
            key={videoUrl ?? ""}
            className="w-full rounded-2xl border-4 border-[#16215c] shadow-lg"
            src={videoUrl ?? undefined}
            autoPlay
            playsInline
            controls
            controlsList="nodownload noremoteplayback noplaybackrate"
            disablePictureInPicture
            onEnded={() => goToActivity(activityName)}
            onError={() => setErroredVideoUrl(videoUrl)}
          />
        ) : (
          <p className="py-8 text-center text-base font-bold text-gray-500">
            The video for this lesson isn&apos;t ready yet — you can start the
            activity now.
          </p>
        )}

        {/* Always available, not just after the video ends: the guaranteed way
            forward if playback stalls, autoplay is blocked, or the teacher
            wants to move the class along. */}
        <button
          onClick={() => goToActivity(activityName)}
          className="w-full max-w-[12rem] py-2 rounded-full text-sm font-black shadow-xl flex items-center justify-center gap-1.5 bg-yellow-400 hover:bg-yellow-500 hover:scale-105 active:scale-95 text-blue-900 cursor-pointer transition-all duration-200"
        >
          <Play size={16} className="fill-blue-900" />
          START ACTIVITY
        </button>
      </div>
    </div>
  );
}
