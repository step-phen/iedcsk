"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { gameRegistry } from "@/components/activities/gameRegistry";
import VideoDemonstrationPlayer from "@/components/activities/VideoDemonstrationPlayer";
import { ACTIVITY_TYPE_DEMONSTRATION } from "@/constants/enums";
import type { SubmittedAnswer } from "@/types/activity";

interface SessionInfo {
  active: boolean;
  activityId: number | null;
  activityName: string | null;
  activityCode: string | null;
  activityType: string | null;
  activityFormat: string | null;
  activityVideoUrl: string | null;
  activityInstructions: string | null;
  participantStatus: string | null;
}

export default function ActivityPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fef9ed] flex flex-col items-center justify-center p-8">
        <div className="bg-white rounded-3xl shadow-2xl border-4 border-[#f2c94c] p-8 max-w-sm w-full text-center flex flex-col items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <Skeleton className="w-48 h-5" />
        </div>
      </div>
    }>
      <ActivityContent />
    </Suspense>
  );
}

function ActivityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlActivityName = searchParams.get("name");
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [checking, setChecking] = useState(true);
  // Once the learner clicks Finish, the 3s session poll below must stop
  // navigating on its own — otherwise a poll tick that lands right after
  // the finish POST marks this participant "Finished" can race handleFinish's
  // own score-carrying redirect and win, sending the learner to class-ended
  // with no score/badge shown at all.
  const isFinishingRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks the activity currently rendered so a mid-play teacher switch to a
  // different activity is caught here too, not just the "Finished" case:
  // without this, a learner stuck in "Started the Activity" for the old
  // activity (session_participants has no per-activity status, and
  // startClass only resets 'Finished' rows) would otherwise have their
  // screen silently swapped to the new activity's game/video, bypassing the
  // join route's attendance and already-completed checks entirely.
  const renderedActivityIdRef = useRef<number | null>(null);

  // Computed early (before the loading/no-activity guards below) and with
  // optional chaining so handleFinish/handlePracticalContinue — memoized on
  // it — can be declared unconditionally at the top, same as any hook.
  // The live name from the class comes first, so a renamed activity still finds its game when the link holds the old name.
  const activityName = sessionInfo?.activityName || urlActivityName || null;
  // Primitives, so the callbacks below keep their identity when the poll replaces sessionInfo with an equal object.
  const sessionActivityId = sessionInfo?.activityId ?? null;
  const sessionActivityName = sessionInfo?.activityName ?? null;

  useEffect(() => {
    const savedLearner = sessionStorage.getItem("selectedLearner");

    if (!savedLearner) {
      router.push("/learner");
      return;
    }

    try {
      const learner = JSON.parse(savedLearner);
      const currentLearnerId = Number(learner.id);

      async function checkSession(currentId: number | null) {
        try {
          const sessionUrl = currentId
            ? `/api/classroom-session?learnerId=${currentId}`
            : "/api/classroom-session";
          const res = await apiFetch(sessionUrl);
          const data = await res.json();

          // The finish flow owns navigation from here — an in-flight or
          // about-to-fire poll must not redirect out from under it.
          if (isFinishingRef.current) return;

          if (!data.active) {
            setSessionInfo({
              active: false,
              activityId: null,
              activityName: null,
              activityCode: null,
              activityType: null,
              activityFormat: null,
              activityVideoUrl: null,
              activityInstructions: null,
              participantStatus: null,
            });
            router.push("/learner/class-ended");
            return;
          }

          if (data.participantStatus === "Finished") {
            setSessionInfo({
              active: true,
              activityId: data.activityId || null,
              activityName: data.activityName || null,
              activityCode: data.activityCode || null,
              activityType: data.activityType || null,
              activityFormat: data.activityFormat || null,
              activityVideoUrl: data.activityVideoUrl || null,
              activityInstructions: data.activityInstructions || null,
              participantStatus: data.participantStatus || null,
            });
            router.push("/learner/class-ended");
            return;
          }

          const renderedId = renderedActivityIdRef.current;
          if (
            renderedId !== null &&
            data.activityId !== null &&
            data.activityId !== renderedId
          ) {
            // The teacher moved the class on to a different activity while
            // this learner was still mid-play on the old one — send them
            // through the join route (attendance + already-completed checks)
            // instead of swapping the game out from under them.
            router.push(`/learner/profile/${currentId}`);
            return;
          }

          renderedActivityIdRef.current = data.activityId || null;
          setSessionInfo({
            active: true,
            activityId: data.activityId || null,
            activityName: data.activityName || null,
            activityCode: data.activityCode || null,
            activityType: data.activityType || null,
            activityFormat: data.activityFormat || null,
            activityVideoUrl: data.activityVideoUrl || null,
            activityInstructions: data.activityInstructions || null,
            participantStatus: data.participantStatus || null,
          });
        } catch (err) {
          console.error("Error checking session during gameplay:", err);
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
  }, [router]);

  // Set browser tab title to activity name
  useEffect(() => {
    if (sessionInfo?.activityName) {
      document.title = `${sessionInfo.activityName} | IEDCSK`;
    }
  }, [sessionInfo?.activityName]);

  // Memoized so its identity stays stable across the 3s session poll's
  // re-renders — a game's own onFinish-derived effects (e.g. speaking the
  // result screen's line once) depend on this reference, and a fresh
  // function every poll tick made those effects re-fire every 3s, replaying
  // that speech in a loop for as long as the learner sat on the result screen.
  const handleFinish = useCallback(async (answers: SubmittedAnswer[]) => {
    // Stop the poll from racing this flow's own redirect (see the ref's
    // comment above) — must happen before the finish POST below, which is
    // what flips this participant to "Finished" for the poll to see.
    isFinishingRef.current = true;
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    // The learner is identified by the signed cookie set at /join, and the
    // score is graded server-side from these answers — neither is sent here.
    let score = 0;
    let total = 0;

    try {
      const finishResponse = await apiFetch("/api/classroom-session/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: sessionActivityId,
          answers,
        }),
      });

      if (finishResponse.ok) {
        const data = await finishResponse.json();
        score = data.score ?? 0;
        total = data.total ?? 0;
      } else if (finishResponse.status !== 409) {
        console.error("Failed to save score:", await finishResponse.text());
      }
    } catch (err) {
      console.error("Failed to save score:", err);
    }

    const params = new URLSearchParams({
      score: String(score),
      total: String(total),
      activity: sessionActivityName || activityName || "",
    });
    router.push(`/learner/class-ended?${params.toString()}`);
  }, [activityName, router, sessionActivityId, sessionActivityName]);

  // Practical activities have nothing to grade automatically — this only
  // advances the learner past the on-screen part (POST
  // /api/classroom-session/demonstration), never the graded /finish route.
  // Score/total are omitted from the class-ended link on purpose — grading
  // is the teacher's later rating, not decided by watching. activityId is
  // passed instead so class-ended can poll for that rating once it exists.
  // Also memoized — same stable-identity reasoning as handleFinish above.
  const handlePracticalContinue = useCallback(async () => {
    isFinishingRef.current = true;
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    try {
      const res = await apiFetch("/api/classroom-session/demonstration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId: sessionActivityId }),
      });
      if (!res.ok && res.status !== 409) {
        console.error("Failed to record practical activity progress:", await res.text());
      }
    } catch (err) {
      console.error("Failed to record practical activity progress:", err);
    }

    const params = new URLSearchParams({
      activity: sessionActivityName || activityName || "",
      activityId: String(sessionActivityId ?? ""),
    });
    router.push(`/learner/class-ended?${params.toString()}`);
  }, [activityName, router, sessionActivityId, sessionActivityName]);

  if (checking || sessionInfo === null) {
    return (
      <div className="min-h-screen bg-[#fef9ed] flex flex-col items-center justify-center p-8">
        <div className="bg-white rounded-3xl shadow-2xl border-4 border-[#f2c94c] p-8 max-w-sm w-full text-center flex flex-col items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <Skeleton className="w-48 h-5" />
        </div>
      </div>
    );
  }

  // No activity set by teacher
  if (!activityName) {
    return (
      <div className="min-h-screen bg-[#fef9ed] flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-3xl shadow-2xl border-4 border-[#f2c94c] p-8 max-w-sm w-full text-center flex flex-col items-center gap-4">
          <AlertTriangle className="w-12 h-12 text-amber-500" />
          <h2 className="text-lg font-bold text-gray-800">No Activity Available</h2>
          <p className="text-sm text-gray-500">
            Your teacher hasn&apos;t set an activity yet. Please wait for the teacher to start a class session with an activity.
          </p>
        </div>
      </div>
    );
  }

  // Practical activities never go through gameRegistry — they have no game
  // component. A "demonstration"-type one shows a clip to watch; a teacher
  // rates the learner's performance afterward regardless of what's shown
  // here, so a practical activity with no video must not block the learner
  // indefinitely the way "Video Not Ready" used to.
  if (sessionInfo.activityFormat === "practical") {
    if (sessionInfo.activityType === ACTIVITY_TYPE_DEMONSTRATION && sessionInfo.activityVideoUrl) {
      return (
        <VideoDemonstrationPlayer
          activityName={sessionInfo.activityName}
          videoUrl={sessionInfo.activityVideoUrl}
          instructions={sessionInfo.activityInstructions}
          onWatched={handlePracticalContinue}
        />
      );
    }

    return (
      <div className="min-h-screen bg-[#fef9ed] flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-3xl shadow-2xl border-4 border-[#f2c94c] p-8 max-w-sm w-full text-center flex flex-col items-center gap-4">
          <h2 className="text-lg font-bold text-gray-800">{activityName}</h2>
          <p className="text-sm text-gray-500">Ask your teacher to guide you through this activity!</p>
          <button
            onClick={handlePracticalContinue}
            className="w-full bg-[#f2c94c] hover:bg-[#e0b93a] text-gray-800 font-bold py-3 rounded-xl transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // Games are registered by activity code, so renaming an activity never unlinks its game.
  const GameComponent = sessionInfo.activityCode ? gameRegistry[sessionInfo.activityCode] : undefined;

  if (!GameComponent) {
    return (
      <div className="min-h-screen bg-[#fef9ed] flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-3xl shadow-2xl border-4 border-[#f2c94c] p-8 max-w-sm w-full text-center flex flex-col items-center gap-4">
          <AlertTriangle className="w-12 h-12 text-amber-500" />
          <h2 className="text-lg font-bold text-gray-800">Unknown Activity</h2>
          <p className="text-sm text-gray-500">
            The activity &quot;{activityName}&quot; is not supported yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen h-dvh bg-[#fef9ed] flex items-center justify-center overflow-hidden">
      <div className="w-full h-full max-w-7xl">
        <GameComponent
          activityId={sessionInfo.activityId}
          activityName={sessionInfo.activityName}
          onFinish={handleFinish}
        />
      </div>
    </div>
  );
}