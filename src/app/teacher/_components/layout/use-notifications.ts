"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { apiFetch } from "@/lib/api";

/** One row of GET /api/notifications: a learner finished an activity in this teacher's class. */
export interface TeacherNotification {
  id: number;
  sectionId: number;
  kind: "finished" | "needs_rating";
  learnerName: string;
  activityName: string | null;
  read: boolean;
  createdAt: string;
}

export interface Notifications {
  items: TeacherNotification[];
  unread: number;
  markRead: () => void;
}

const POLL_MS = 5000;

function readId(storage: Storage, key: string): number | null {
  try {
    const value = storage.getItem(key);
    return value === null ? null : Number(value);
  } catch {
    return null;
  }
}

function writeId(storage: Storage, key: string, id: number) {
  try {
    storage.setItem(key, String(id));
  } catch {
    // Storage blocked; detection falls back to this mount only.
  }
}

let audio: AudioContext | undefined;

// Short soft tone so a teacher looking away still hears a learner finish.
function playChime() {
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.08, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.3);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.3);
  } catch {
    // Audio blocked or unsupported; the toast and badge still show.
  }
}

// Only the window that bumps the shared key chimes, so Dashboard and Classroom open together beep once.
function chimeOnce(key: string, id: number) {
  const claim = () => {
    if ((readId(localStorage, key) ?? 0) >= id) return;
    writeId(localStorage, key, id);
    playChime();
  };
  // ponytail: Web Locks needs a secure context, so plain-http LAN IPs run unlocked and may rarely chime twice; HTTPS on the LAN fixes it.
  if (navigator.locks) void navigator.locks.request("iedcsk-chime", claim);
  else claim();
}

function message(n: TeacherNotification) {
  return n.kind === "needs_rating" ? `${n.learnerName} is waiting for your rating` : `${n.learnerName} finished${n.activityName ? ` ${n.activityName}` : ""}`;
}

// Polls the teacher's finish notifications from the shell, so page navigation never resets detection.
export function useNotifications(teacherId: number): Notifications {
  const [state, setState] = useState<Omit<Notifications, "markRead">>({ items: [], unread: 0 });

  useEffect(() => {
    // Per window (sessionStorage survives reloads) so each open window toasts; first visit only sets the baseline.
    const seenKey = `iedcsk.notifSeen.${teacherId}`;
    let alive = true;
    const poll = () =>
      apiFetch("/api/notifications")
        .then((res) => (res.ok ? res.json() : null))
        .then((data: Omit<Notifications, "markRead"> | null) => {
          if (!alive || !data) return;
          setState(data);
          const newest = data.items[0]?.id ?? 0;
          const seen = readId(sessionStorage, seenKey);
          if (seen !== null) {
            const fresh = data.items.filter((n) => n.id > seen).reverse();
            fresh.forEach((n) => toast.success(message(n)));
            if (fresh.length > 0) chimeOnce(`iedcsk.notifChimed.${teacherId}`, newest);
          }
          if (seen === null || newest > seen) writeId(sessionStorage, seenKey, newest);
        })
        .catch((error) => console.error("[notifications]", error));
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [teacherId]);

  const markRead = useCallback(() => {
    setState((s) => (s.unread > 0 ? { unread: 0, items: s.items.map((n) => ({ ...n, read: true })) } : s));
    apiFetch("/api/notifications/read", { method: "POST" }).catch((error) => console.error("[notifications]", error));
  }, []);

  return useMemo(() => ({ ...state, markRead }), [state, markRead]);
}
