import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import LoginForm from "./_components/LoginForm";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Login | SPC Teacher Access",
  description: "Southern De Oro Philippines College - Teacher Access Login",
};

export default async function LoginPage() {
  // A live Laravel session skips the form; an unreachable API falls through so the form can report it.
  const res = await serverApi("/api/me").catch(() => null);
  if (res?.ok) redirect("/teacher");

  return (
    <div className="relative flex min-h-screen flex-col font-poppins">
      {/* Header */}
      <header className="relative z-10 bg-sidebar shadow-[0_10px_15px_-3px_rgba(0,0,0,0.3),0_4px_6px_-2px_rgba(0,0,0,0.2)]">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-2 px-4 py-3 text-center sm:flex-row sm:items-center sm:gap-4 sm:px-7 sm:py-3.5 sm:text-left">
          <Image
            src="/images/logo/spc-logo.webp"
            alt="SPC Logo"
            width={56}
            height={56}
            className="h-12 w-12 shrink-0 object-contain sm:h-15 sm:w-15"
            priority
          />
          <div className="hidden h-11 w-[2px] shrink-0 bg-white/25 sm:block"></div>
          <div>
            <h1 className="text-[clamp(1rem,4vw,1.4rem)] font-bold leading-[1.25] tracking-[0.03em] text-white">
              An Interactive E-Learning and Developmental Checklist System for Kindergarten Learners
            </h1>
            <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-[#ffdcdc]/85 sm:text-[15.5px]">
              SOUTHERN DE ORO PHILIPPINES COLLEGE
            </p>
          </div>
        </div>
      </header>

      {/* Background Image + Login Card */}
      <main className="relative flex flex-1 items-center justify-center">
        {/* Background */}
        <Image
          src="/images/background-images/bg-image.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        {/* Lightened overlay */}
        <div className="absolute inset-0 bg-black/15" />

        {/* Login Card */}
        <div className="relative z-10 w-full max-w-lg px-4">
          <LoginForm />
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-[#1a1a1a] py-3 text-center text-xs text-gray-400">
        © 2026 Southern de oro Philippines College. All rights reserved.
        Capstone Project.
      </footer>
    </div>
  );
}
