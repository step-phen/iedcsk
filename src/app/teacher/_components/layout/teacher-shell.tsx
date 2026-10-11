"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu } from "lucide-react";
import Sidebar from "@/app/teacher/_components/layout/sidebar";
import { ShellContext } from "@/app/teacher/_components/layout/shell-context";
import { useNotifications } from "@/app/teacher/_components/layout/use-notifications";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

/**
 * Interactive chrome for the teacher area — extracted verbatim from
 * app/teacher/layout.tsx so that the layout itself can be a Server Component
 * and enforce auth. Only the drawer and the collapse toggle need client
 * state; `children` are passed through and stay server-rendered.
 */
export default function TeacherShell({
  children,
  teacherId,
  username,
  teacherName,
  defaultCollapsed = false,
  hasCollapsedPreference = false,
  today,
}: {
  children: React.ReactNode;
  teacherId: number;
  username: string;
  teacherName: string | null;
  defaultCollapsed?: boolean;
  hasCollapsedPreference?: boolean;
  today: string;
}) {
  // /teacher/classroom opens as its own popup-like window (see the Learners
  // page's "Classroom" button, which window.open()s it) — it has no need for
  // the roster/reports nav, so it renders without the rail.
  const pathname = usePathname();
  const hideSidebar = pathname?.startsWith("/teacher/classroom") ?? false;

  const [isOpen, setIsOpen] = useState(false);
  // Seeded from a cookie the server already read, so the rail never renders
  // at the wrong width and then snaps.
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  // Tracks whether the teacher has ever touched the toggle (server-seeded
  // from cookie presence, flipped the moment they click it). Until then the
  // rail is free to follow viewport width instead of sitting at a fixed
  // desktop default on every screen size.
  const userOverridden = useRef(hasCollapsedPreference);

  useEffect(() => {
    if (userOverridden.current) return;
    // Only narrow tablets get the icon-only rail by default; landscape
    // tablets (≥900px) keep the labels so teachers read rather than guess
    // icons. Mobile is unaffected — the rail is hidden below md in favor
    // of the drawer.
    const mq = window.matchMedia("(max-width: 900px)");
    const apply = () => {
      if (!userOverridden.current) setCollapsed(mq.matches);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  function toggleCollapsed() {
    userOverridden.current = true;
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `sidebar_collapsed=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  const notifications = useNotifications(teacherId);

  const shellState = useMemo(
    () => ({ collapsed, toggle: toggleCollapsed, today, hideSidebar, notifications }),
    // toggleCollapsed only reads `collapsed`, so the identity can follow it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collapsed, today, hideSidebar, notifications],
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#eae4c9] md:flex-row">
      {!hideSidebar && (
        <>
          {/* Mobile top header */}
          <header className="flex shrink-0 items-center justify-end bg-sidebar p-4 text-sidebar-foreground shadow-md md:hidden">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="rounded-md p-1 outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              aria-label="Open navigation menu"
            >
              <Menu size={24} />
            </button>
          </header>

          {/* Mobile drawer — the primitive supplies backdrop, focus trap, Esc,
              scroll lock and swipe-to-close. */}
          <Drawer open={isOpen} onOpenChange={setIsOpen} swipeDirection="left">
            <DrawerContent className="w-[17rem] bg-sidebar text-sidebar-foreground [--drawer-bleed-background:var(--color-sidebar)] sm:w-[17rem] md:hidden">
              <DrawerTitle className="sr-only">Teacher navigation</DrawerTitle>
              <div className="flex h-full flex-col gap-2 p-3">
                {/* Same sizing as the rail's expanded state, minus the collapse
                    animation — the drawer has no collapsed state. */}
                <div className="flex h-16 shrink-0 items-center rounded-lg bg-sidebar-deep px-1.5">
                  <Image
                    src="/images/logo/logo.webp"
                    alt="IEDCSK"
                    width={474}
                    height={406}
                    loading="lazy"
                    className="h-10 w-auto shrink-0 object-contain"
                  />
                  <span className="min-w-0 flex-1 pl-2.5 text-center text-[12px] font-semibold leading-tight text-sidebar-foreground">
                    E-learning &amp; Developmental Checklist System for Kindergarten Learners
                  </span>
                </div>
                <div className="my-2 h-px bg-sidebar-border" />
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <Sidebar
                    username={username}
                    teacherName={teacherName}
                    onNavigate={() => setIsOpen(false)}
                  />
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        </>
      )}

      {/* Desktop rail */}
      {!hideSidebar && (
      <aside
        className={cn(
          // Padding is in the transition alongside width: the collapsed state
          // swaps p-3 for px-2, and left out it would jump at frame 0 while the
          // width still had 300ms to run.
          "hidden h-full shrink-0 flex-col gap-1.5 bg-sidebar p-2.5 text-sidebar-foreground shadow-lg transition-[width,padding] duration-300 ease-in-out motion-reduce:transition-none md:flex",
          collapsed ? "w-[4.5rem] px-2" : "w-72",
        )}
      >
        {/* Collapsed the rail is only 4.5rem wide, so the title track animates
            to w-0 and the mark re-centers. The gap lives inside that track as
            pl-2.5 rather than as gap-* on the box, so it collapses too and the
            logo lands dead centre. Everything runs at the rail's own
            duration-300 — the block moves with the width, not after it.

            The height is fixed rather than content-sized: left to its content
            the box would shrink by ~20px as the title track closes, dragging
            the divider and the whole nav list up with it. */}
        <div className="flex h-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sidebar-deep px-1.5">
          <Image
            src="/images/logo/logo.webp"
            alt="IEDCSK"
            width={474}
            height={406}
            priority
            className={cn(
              "w-auto shrink-0 object-contain transition-[height] duration-300 ease-in-out motion-reduce:transition-none",
              collapsed ? "h-7" : "h-9",
            )}
          />
          <div
            aria-hidden={collapsed}
            className={cn(
              "overflow-hidden transition-[width] duration-300 ease-in-out motion-reduce:transition-none",
              collapsed ? "w-0" : "w-[11.5rem]",
            )}
          >
            {/* The span holds its full width while the track around it closes,
                so the text gets clipped rather than reflowed — no re-wrapping
                or squeezing mid-animation. Fading out runs immediately, so the
                text is gone before the clip becomes visible; fading back in is
                delayed until the track has finished opening. */}
            <span
              className={cn(
                "block w-[11.5rem] pl-2.5 text-center text-[11px] font-semibold leading-tight text-sidebar-foreground",
                "transition-opacity duration-150 ease-in-out motion-reduce:transition-none",
                collapsed ? "opacity-0" : "opacity-100 delay-150",
              )}
            >
              E-learning &amp; Developmental Checklist System for Kindergarten Learners
            </span>
          </div>
        </div>

        <div className="my-1 h-px bg-sidebar-border" />

        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          <Sidebar
            collapsed={collapsed}
            username={username}
            teacherName={teacherName}
          />
        </div>
      </aside>
      )}

      {/* Page content. The collapse toggle isn't here — it lives in the
          PageHeader each page renders, reached through this provider, so the
          toggle and that page's breadcrumb share one bar. */}
      <main
        className={cn(
          // relative: contains absolute children (e.g. sr-only text) so they scroll with main instead of stretching the document.
          "relative flex min-h-0 min-w-0 flex-1 flex-col",
          hideSidebar ? "overflow-hidden" : "overflow-y-auto",
        )}
      >
        <div
          className={cn(
            "flex flex-1 flex-col",
            hideSidebar
              ? "m-0 min-h-0 w-full max-w-none p-0"
              : "p-4 sm:p-6 md:pl-6",
          )}
        >
          <ShellContext.Provider value={shellState}>
            {children}
          </ShellContext.Provider>
        </div>
      </main>
    </div>
  );
}
