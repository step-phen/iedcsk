"use client";

import { Search } from "lucide-react";
import { SELECT_CLASS } from "@/app/teacher/_components/dashboard/section-selector";
import { cn } from "@/lib/utils";

interface LearnerSearchProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function LearnerSearch({ searchQuery, setSearchQuery }: LearnerSearchProps) {
  return (
    <div className="relative w-full max-w-xs">
      <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        name="learner-search"
        aria-label="Search learner by name or LRN"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search name or LRN"
        className={cn(SELECT_CLASS, "w-full cursor-text pl-9 placeholder:text-gray-500")}
      />
    </div>
  );
}
