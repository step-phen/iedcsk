"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ListChecks,
  BadgeCheck,
  GraduationCap,
  Table2,
  ClipboardList,
  FileText,
  UserCog,
  Settings,
  LogOut,
  ChevronsUpDown,
  School,
  type LucideIcon,
} from "lucide-react";
import { Menu } from "@base-ui/react/menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import SettingsModal from "@/app/teacher/_components/layout/settings-modal";
import AccountDetailsForm from "@/app/teacher/_components/layout/account-details-form";
import { ModalShell } from "@/components/ui/modal-shell";

type NavItem = {
  href: string;
  label: string;
  /** Plain-words tooltip so a new teacher knows what the page is for. */
  hint: string;
  icon: LucideIcon;
};

// Grouped by the teacher's day rather than by system area; headings are uppercased by CSS.
const sections: { label: string; items: NavItem[] }[] = [
  {
    label: "Start here",
    items: [
      { href: "/teacher", label: "Home", hint: "Today's schedule & summary", icon: LayoutDashboard },
    ],
  },
  {
    label: "My class",
    items: [
      { href: "/teacher/learners", label: "Learners", hint: "Profiles, attendance, add new", icon: Users },
      { href: "/teacher/module", label: "Lessons", hint: "Modules, videos & activities", icon: BookOpen },
    ],
  },
  {
    label: "Record progress",
    items: [
      {
        href: "/teacher/reports/classroom-record",
        label: "Classroom Record",
        hint: "Scores per learner & subject",
        icon: Table2,
      },
      {
        href: "/teacher/developmental-checklist",
        label: "Developmental Checklist",
        hint: "Mark each learner's skills",
        icon: ListChecks,
      },
    ],
  },
  {
    label: "Print & reports",
    items: [
      {
        href: "/teacher/reports/learner-list",
        label: "Class List",
        hint: "Print the list of learners",
        icon: ClipboardList,
      },
      {
        href: "/teacher/reports/progress-report",
        label: "Progress Report",
        hint: "Per-learner quarterly report",
        icon: FileText,
      },
      {
        href: "/teacher/reports/qualified-learners",
        label: "Ready for Grade 1",
        hint: "Learners who can move up",
        icon: BadgeCheck,
      },
      {
        href: "/teacher/reports/promoted-learners",
        label: "Promotion History",
        hint: "Learners already promoted",
        icon: GraduationCap,
      },
    ],
  },
];

// The day's main job, so it gets the rail's only gold block; label clips on collapse like the nav rows.
function ClassroomButton({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const link = (
    <Link
      href="/teacher/classroom"
      onClick={onNavigate}
      aria-label={collapsed ? "Open Classroom" : undefined}
      className={cn(
        "flex h-10 items-center justify-center rounded-lg bg-sidebar-primary px-2.5 text-sidebar-primary-foreground shadow-[0_2px_6px_rgb(0_0_0/0.25)] outline-none",
        "transition-[background-color,box-shadow] duration-200 hover:bg-[#f5cd68] hover:shadow-[0_4px_12px_rgb(0_0_0/0.3)]",
        "focus-visible:ring-2 focus-visible:ring-sidebar-foreground motion-reduce:transition-none",
      )}
    >
      <School size={20} strokeWidth={2.2} aria-hidden="true" className="shrink-0" />
      <div
        aria-hidden={collapsed}
        className={cn(
          "overflow-hidden transition-[width] duration-300 ease-in-out motion-reduce:transition-none",
          collapsed ? "w-0" : "w-[13rem]",
        )}
      >
        <span
          className={cn(
            "block w-[13rem] truncate pl-3 text-[14px] font-bold",
            "transition-opacity duration-150 ease-in-out motion-reduce:transition-none",
            collapsed ? "opacity-0" : "opacity-100 delay-150",
          )}
        >
          Open Classroom
        </span>
      </div>
    </Link>
  );

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right" className="flex flex-col items-start gap-0.5 text-sm">
        <span className="font-semibold">Open Classroom</span>
        <span className="text-xs opacity-80">Start or continue today&apos;s class</span>
      </TooltipContent>
    </Tooltip>
  );
}

// Declared outside Sidebar so re-renders don't remount the links and break their animations.
function NavSection({
  section,
  collapsed,
  pathname,
  onNavigate,
  entranceDelayMs,
}: {
  section: { label: string; items: NavItem[] };
  collapsed: boolean;
  pathname: string;
  onNavigate?: () => void;
  /** Delay for the first-load slide-in; undefined skips it. */
  entranceDelayMs?: number;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        entranceDelayMs !== undefined &&
          "animate-in fade-in slide-in-from-left-2 duration-300 ease-out fill-mode-both motion-reduce:animate-none",
      )}
      style={
        entranceDelayMs !== undefined
          ? { animationDelay: `${entranceDelayMs}ms` }
          : undefined
      }
    >
      {/* Heading and collapsed divider cross-fade in one fixed-height row so the list never shifts. */}
      <div className="relative mb-0.5 h-3.5">
        <p
          aria-hidden={collapsed}
          className={cn(
            "absolute inset-0 px-3 text-[10px] font-semibold uppercase leading-[14px] tracking-[0.12em] text-sidebar-foreground/70",
            "transition-opacity duration-150 ease-in-out motion-reduce:transition-none",
            collapsed ? "opacity-0" : "opacity-100 delay-150",
          )}
        >
          {section.label}
        </p>
        <div
          aria-hidden="true"
          className={cn(
            "absolute left-1/2 top-1/2 h-px w-6 -translate-x-1/2 -translate-y-1/2 bg-sidebar-border",
            "transition-opacity duration-150 ease-in-out motion-reduce:transition-none",
            collapsed ? "opacity-100 delay-150" : "opacity-0",
          )}
        />
      </div>

      {section.items.map((item) => {
        // Dashboard lives at /teacher itself, the parent of every other page, so it only matches exactly.
        const isActive =
          pathname === item.href || (item.href !== "/teacher" && pathname.startsWith(`${item.href}/`));
        const Icon = item.icon;

        const link = (
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            aria-label={collapsed ? item.label : undefined}
            className={cn(
              "group relative flex h-9 items-center justify-center rounded-lg px-2.5 outline-none",
              "transition-colors duration-200 motion-reduce:transition-none",
              "focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-0",
              isActive
                ? "bg-sidebar-accent text-sidebar-foreground"
                : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            {/* Shared layoutId lets the active indicator slide between items. */}
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 flex w-[3px] items-center justify-center"
            >
              {isActive && (
                <motion.span
                  layoutId="sidebar-active-indicator"
                  className="h-5 w-[3px] rounded-r-full bg-sidebar-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </span>
            <Icon
              size={18}
              strokeWidth={2.2}
              aria-hidden="true"
              className={cn("shrink-0", isActive && "text-sidebar-primary")}
            />
            {/* The label keeps its width and is clipped as the track closes, so it never re-wraps. */}
            <div
              aria-hidden={collapsed}
              className={cn(
                "overflow-hidden transition-[width] duration-300 ease-in-out motion-reduce:transition-none",
                collapsed ? "w-0" : "w-[13rem]",
              )}
            >
              <span
                className={cn(
                  "block w-[13rem] truncate pl-3 text-[13px]",
                  isActive ? "font-semibold" : "font-medium",
                  "transition-opacity duration-150 ease-in-out motion-reduce:transition-none",
                  collapsed ? "opacity-0" : "opacity-100 delay-150",
                )}
              >
                {item.label}
              </span>
            </div>
          </Link>
        );

        // Tooltip carries the hint in both states; always mounted so toggling doesn't remount the Link and snap its animation.
        return (
          <Tooltip key={item.href}>
            <TooltipTrigger render={link} />
            <TooltipContent side="right" className="flex flex-col items-start gap-0.5 text-sm">
              <span className="font-semibold">{item.label}</span>
              <span className="text-xs opacity-80">{item.hint}</span>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

function initials(username: string) {
  return username.slice(0, 2).toUpperCase();
}

export default function Sidebar({
  collapsed = false,
  username,
  teacherName,
  onNavigate,
}: {
  collapsed?: boolean;
  username: string;
  teacherName: string | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Logout leaves the class session running, since a class can only be started once a day.
  async function handleLogout() {
    await apiFetch("/logout", { method: "POST" }).catch(() => {});
    window.location.assign("/login");
  }

  const menuItem =
    "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 outline-none select-none data-[highlighted]:bg-gray-100";

  return (
    <TooltipProvider delay={200}>
      <nav aria-label="Teacher navigation" className="flex h-full flex-col">
      <div className="flex flex-col gap-2.5">
        <ClassroomButton collapsed={collapsed} onNavigate={onNavigate} />
        {sections.map((section, i) => (
          <NavSection
            key={section.label}
            section={section}
            collapsed={collapsed}
            pathname={pathname}
            onNavigate={onNavigate}
            entranceDelayMs={i * 60}
          />
        ))}
      </div>

      {/* The account row opens a menu with Profile, Settings and Log out; collapsed, only the avatar shows. */}
      <div className="mt-auto border-t border-sidebar-border px-1 pt-2">
        <Menu.Root>
          <Menu.Trigger
            aria-label={collapsed ? "Account menu" : undefined}
            className={cn(
              "flex w-full cursor-pointer items-center justify-center rounded-lg px-1 py-1 text-left outline-none",
              "transition-colors hover:bg-sidebar-accent/60 data-[popup-open]:bg-sidebar-accent",
              "focus-visible:ring-2 focus-visible:ring-sidebar-ring motion-reduce:transition-none",
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-[11px] font-semibold text-sidebar-primary-foreground">
              {initials(username)}
            </span>
            <span
              aria-hidden={collapsed}
              className={cn(
                "overflow-hidden transition-[width] duration-300 ease-in-out motion-reduce:transition-none",
                collapsed ? "w-0" : "w-[12.25rem]",
              )}
            >
              <span
                className={cn(
                  "flex w-[12.25rem] items-center gap-2 pl-2.5",
                  "transition-opacity duration-150 ease-in-out motion-reduce:transition-none",
                  collapsed ? "opacity-0" : "opacity-100 delay-150",
                )}
              >
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-[13px] font-semibold text-sidebar-foreground">
                    {teacherName || "Teacher"}
                  </span>
                  <span className="truncate text-[11px] font-medium text-sidebar-foreground/70">
                    Account &amp; log out
                  </span>
                </span>
                <ChevronsUpDown size={15} aria-hidden="true" className="shrink-0 text-sidebar-foreground/70" />
              </span>
            </span>
          </Menu.Trigger>

          <Menu.Portal>
            <Menu.Positioner
              side={collapsed ? "right" : "top"}
              align={collapsed ? "end" : "start"}
              sideOffset={8}
              className="z-50"
            >
              <Menu.Popup
                className={cn(
                  "w-56 origin-[var(--transform-origin)] rounded-xl border border-gray-200 bg-white p-1 text-sm text-gray-700 shadow-lg outline-none",
                  "transition-[opacity,transform] duration-150 motion-reduce:transition-none",
                  "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
                )}
              >
                <div className="px-2.5 py-2">
                  <p className="truncate font-semibold text-gray-900">{teacherName || "Teacher"}</p>
                  <p className="truncate text-xs text-gray-500">{username}</p>
                </div>
                <Menu.Separator className="my-1 h-px bg-gray-100" />
                <Menu.Item onClick={() => setProfileOpen(true)} className={menuItem}>
                  <UserCog size={16} aria-hidden="true" className="text-gray-500" />
                  Profile
                </Menu.Item>
                <Menu.Item onClick={() => setSettingsOpen(true)} className={menuItem}>
                  <Settings size={16} aria-hidden="true" className="text-gray-500" />
                  Settings
                </Menu.Item>
                <Menu.Separator className="my-1 h-px bg-gray-100" />
                <Menu.Item
                  onClick={handleLogout}
                  className={cn(menuItem, "text-red-600 data-[highlighted]:bg-red-50")}
                >
                  <LogOut size={16} aria-hidden="true" />
                  Log out
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
      </nav>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ModalShell
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="Profile"
        subtitle="Your name and the username you use to sign in."
        headerId="profile-modal-title"
        maxWidth="max-w-md"
      >
        <AccountDetailsForm teacherName={teacherName ?? ""} username={username} />
      </ModalShell>
    </TooltipProvider>
  );
}
