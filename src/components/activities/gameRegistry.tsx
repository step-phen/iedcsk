"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { GameComponentProps } from "@/types/activity";

// Matches the activity page's own checking-state card so the swap to a game chunk isn't a layout jump.
function GameLoading() {
  return (
    <div className="min-h-screen bg-[#fef9ed] flex flex-col items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-2xl border-4 border-[#f2c94c] p-8 max-w-sm w-full text-center flex flex-col items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <Skeleton className="w-48 h-5" />
      </div>
    </div>
  );
}

// Each game loads as its own chunk — a learner downloads only the activity the teacher started.
const game = (
  load: () => Promise<{ default: React.ComponentType<GameComponentProps> }>,
): React.ComponentType<GameComponentProps> =>
  dynamic(load, { ssr: false, loading: GameLoading });

// Keyed by activities.activity_code, so renaming an activity never unlinks its game; a game joins here once its seeder gives it a code.
export const gameRegistry: Record<
  string,
  React.ComponentType<GameComponentProps>
> = {
  // reading readiness
  "RD-Q1W1-01": game(
    () =>
      import("@/components/activities/games/reading/1st_quarter/week-1/SameOrDifferent"),
  ),
  "RD-Q1W1-02": game(
    () =>
      import("@/components/activities/games/reading/1st_quarter/week-1/LongOrShort"),
  ),
  "RD-Q1W1-03": game(
    () =>
      import("@/components/activities/games/reading/1st_quarter/week-1/Shape"),
  ),
  "RD-Q1W2-01": game(
    () =>
      import("@/components/activities/games/reading/1st_quarter/week-2/BigAndSmall"),
  ),
  "RD-Q1W2-03": game(
    () =>
      import("@/components/activities/games/reading/1st_quarter/week-2/VowelAa"),
  ),
  "RD-Q1W3-01": game(
    () =>
      import("@/components/activities/games/reading/1st_quarter/week-3/VowelEe"),
  ),
  "RD-Q1W3-02": game(
    () =>
      import("@/components/activities/games/reading/1st_quarter/week-3/VowelIi"),
  ),
  "RD-Q1W3-03": game(
    () =>
      import("@/components/activities/games/reading/1st_quarter/week-3/VowelOo"),
  ),
  "RD-Q1W4-01": game(
    () =>
      import("@/components/activities/games/reading/1st_quarter/week-4/VowelUu"),
  ),
  "RD-Q1W4-02": game(
    () =>
      import("@/components/activities/games/reading/1st_quarter/week-4/VowelPartners"),
  ),
  "RD-Q1W4-03": game(
    () =>
      import("@/components/activities/games/reading/1st_quarter/week-4/VowelsReview"),
  ),
  "RD-Q1W5-01": game(
    () =>
      import("@/components/activities/games/reading/1st_quarter/week-5/ShapeHunt"),
  ),
  "RD-Q1W5-02": game(
    () =>
      import("@/components/activities/games/reading/1st_quarter/week-5/SizeSort"),
  ),
  "RD-Q1W5-03": game(
    () =>
      import("@/components/activities/games/reading/1st_quarter/week-5/LengthSort"),
  ),
  "RD-Q1W6-01": game(
    () =>
      import("@/components/activities/games/reading/1st_quarter/week-6/AlphabetPartners"),
  ),
  "RD-Q1W6-02": game(
    () =>
      import("@/components/activities/games/reading/1st_quarter/week-6/ListenFindLetter"),
  ),
  "RD-Q1W6-03": game(
    () =>
      import("@/components/activities/games/reading/1st_quarter/week-6/BeginningVowelMatch"),
  ),
  "RD-Q1W7-01": game(
    () =>
      import("@/components/activities/games/reading/1st_quarter/week-7/VowelPictureSort"),
  ),
  "RD-Q1W7-02": game(
    () =>
      import("@/components/activities/games/reading/1st_quarter/week-7/ReadingReview"),
  ),
  "RD-Q1W7-03": game(
    () =>
      import("@/components/activities/games/reading/1st_quarter/week-7/ReadingFinalExam"),
  ),

  // language
  "LG-Q1W1-01": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-1/Similarities"),
  ),
  "LG-Q1W1-02": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-1/Differences"),
  ),
  "LG-Q1W1-03": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-1/ObjectsThatDoNotBelong"),
  ),
  "LG-Q1W2-01": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-2/ObjectsThatGoTogether"),
  ),
  "LG-Q1W2-02": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-2/MissingPartsOfObjects"),
  ),
  "LG-Q1W2-03": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-2/MissingPartsOfShapes"),
  ),
  "LG-Q1W3-01": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-3/OddOneOut"),
  ),
  "LG-Q1W3-02": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-3/OppositeDirections"),
  ),
  "LG-Q1W3-03": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-3/NamingVowelAa"),
  ),
  "LG-Q1W4-01": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-4/ShowAndSayEe"),
  ),
  "LG-Q1W4-02": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-4/ShowAndSayIi"),
  ),
  "LG-Q1W4-03": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-4/LanguageSkillsReview1"),
  ),
  "LG-Q1W5-01": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-5/ShowAndSayOo"),
  ),
  "LG-Q1W5-02": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-5/PictureDetective"),
  ),
  "LG-Q1W5-03": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-5/ListenAndMove"),
  ),
  "LG-Q1W6-01": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-6/SayAndPointAaEe"),
  ),
  "LG-Q1W6-02": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-6/SayAndPointIiOo"),
  ),
  "LG-Q1W6-03": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-6/SortThePictures"),
  ),
  "LG-Q1W7-01": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-7/FindTheDifferentOne"),
  ),
  "LG-Q1W7-02": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-7/LanguageReview"),
  ),
  "LG-Q1W7-03": game(
    () =>
      import("@/components/activities/games/language/1st_quarter/week-7/LanguageFinalAssessment"),
  ),

  // writing readiness
  "WR-Q1W1-01": game(
    () =>
      import("@/components/activities/games/writing readiness/1st-quarter/week-1/ThingsINeedForMyWritingActivities"),
  ),
  "WR-Q1W1-03": game(
    () =>
      import("@/components/activities/games/writing readiness/1st-quarter/week-1/Lines"),
  ),
  "WR-Q1W2-01": game(
    () =>
      import("@/components/activities/games/writing readiness/1st-quarter/week-2/ShapesTracing"),
  ),
  "WR-Q1W2-02": game(
    () =>
      import("@/components/activities/games/writing readiness/1st-quarter/week-2/LongAndShortStraightLines"),
  ),
  "WR-Q1W2-03": game(
    () =>
      import("@/components/activities/games/writing readiness/1st-quarter/week-2/RightSlants"),
  ),
  "WR-Q1W3-01": game(
    () =>
      import("@/components/activities/games/writing readiness/1st-quarter/week-3/LeftSlants"),
  ),
  "WR-Q1W3-02": game(
    () =>
      import("@/components/activities/games/writing readiness/1st-quarter/week-3/LeftCurves"),
  ),
  "WR-Q1W3-03": game(
    () =>
      import("@/components/activities/games/writing readiness/1st-quarter/week-3/RightCurves"),
  ),
  "WR-Q1W4-01": game(
    () =>
      import("@/components/activities/games/writing readiness/1st-quarter/week-4/RainbowCurves"),
  ),
  "WR-Q1W4-02": game(
    () =>
      import("@/components/activities/games/writing readiness/1st-quarter/week-4/SmileCurves"),
  ),
  "WR-Q1W4-03": game(
    () =>
      import("@/components/activities/games/writing readiness/1st-quarter/week-4/WritingSkillsReview1"),
  ),
  "WR-Q1W5-01": game(
    () =>
      import("@/components/activities/games/writing readiness/1st-quarter/week-5/CircleTrails"),
  ),
  "WR-Q1W5-02": game(
    () =>
      import("@/components/activities/games/writing readiness/1st-quarter/week-5/WavePaths"),
  ),
  "WR-Q1W5-03": game(
    () =>
      import("@/components/activities/games/writing readiness/1st-quarter/week-5/ZigzagAdventure"),
  ),
  "WR-Q1W6-01": game(
    () =>
      import("@/components/activities/games/writing readiness/1st-quarter/week-6/RoundAndRound"),
  ),
  "WR-Q1W6-02": game(
    () =>
      import("@/components/activities/games/writing readiness/1st-quarter/week-6/StraightSidedShapes"),
  ),
  "WR-Q1W6-03": game(
    () =>
      import("@/components/activities/games/writing readiness/1st-quarter/week-6/TriangleBuilders"),
  ),
  "WR-Q1W7-01": game(
    () =>
      import("@/components/activities/games/writing readiness/1st-quarter/week-7/WritingPathChallenge"),
  ),
  "WR-Q1W7-02": game(
    () =>
      import("@/components/activities/games/writing readiness/1st-quarter/week-7/WritingReadinessReview"),
  ),
  "WR-Q1W7-03": game(
    () =>
      import("@/components/activities/games/writing readiness/1st-quarter/week-7/WritingReadinessFinalAssessment"),
  ),

  // math readiness
  "MT-Q1W1-01": game(
    () =>
      import("@/components/activities/games/math readiness/1st-quarter/week-1/NumberRecognition"),
  ),
  "MT-Q1W1-02": game(
    () =>
      import("@/components/activities/games/math readiness/1st-quarter/week-1/NumberColoring"),
  ),
  "MR-Q1W2-01": game(
    () =>
      import("@/components/activities/games/math readiness/1st-quarter/week-2/CountTheObjects"),
  ),
  "MR-Q1W3-01": game(
    () =>
      import("@/components/activities/games/math readiness/1st-quarter/week-3/MatchNumberToObjects"),
  ),
  "MR-Q1W3-02": game(
    () =>
      import("@/components/activities/games/math readiness/1st-quarter/week-3/CountAndMatch"),
  ),
  "MR-Q1W4-01": game(
    () =>
      import("@/components/activities/games/math readiness/1st-quarter/week-4/MoreOrLess"),
  ),
  "MR-Q1W4-02": game(
    () =>
      import("@/components/activities/games/math readiness/1st-quarter/week-4/MathSkillsReview1"),
  ),
  "MR-Q1W5-01": game(
    () =>
      import("@/components/activities/games/math readiness/1st-quarter/week-5/CircleTheGroup"),
  ),
  "MR-Q1W5-02": game(
    () =>
      import("@/components/activities/games/math readiness/1st-quarter/week-5/FindTheSmallerGroup"),
  ),
  "MR-Q1W6-01": game(
    () =>
      import("@/components/activities/games/math readiness/1st-quarter/week-6/CountingDetective"),
  ),
  "MR-Q1W7-01": game(
    () =>
      import("@/components/activities/games/math readiness/1st-quarter/week-7/MathReadinessReview"),
  ),
  "MR-Q1W7-02": game(
    () =>
      import("@/components/activities/games/math readiness/1st-quarter/week-7/MathReadinessFinalAssessment"),
  ),
  "MR-Q2W1-01": game(
    () =>
      import("@/components/activities/games/math readiness/2nd-quarter/week-1/ShapeHunt"),
  ),
  "MR-Q2W1-02": game(
    () =>
      import("@/components/activities/games/math readiness/2nd-quarter/week-1/ShapeColoring"),
  ),
  "MR-Q2W2-01": game(
    () =>
      import("@/components/activities/games/math readiness/2nd-quarter/week-2/ShapeMatching"),
  ),
  "MR-Q2W2-02": game(
    () =>
      import("@/components/activities/games/math readiness/2nd-quarter/week-2/ShapePuzzle"),
  ),
  "MR-Q2W3-01": game(
    () =>
      import("@/components/activities/games/math readiness/2nd-quarter/week-3/ContinueThePattern"),
  ),
  "MR-Q2W4-01": game(
    () =>
      import("@/components/activities/games/math readiness/2nd-quarter/week-4/SortByColor"),
  ),
  "MR-Q2W4-02": game(
    () =>
      import("@/components/activities/games/math readiness/2nd-quarter/week-4/MathSkillsReview2"),
  ),

  // MAPEH
  "MP-Q1W1-02": game(
    () =>
      import("@/components/activities/games/arts and crafts/1st-quarter/week-1/ColorHunt"),
  ),
  "MP-Q1W1-03": game(
    () =>
      import("@/components/activities/games/health works habits and attitude/1st-quarter/week-1_health/CleanOrDirty"),
  ),
  "MP-Q1W1-05": game(
    () =>
      import("@/components/activities/games/arts and crafts/1st-quarter/week-1/ColorThePicture"),
  ),
  "MP-Q1W2-01": game(
    () =>
      import("@/components/activities/games/arts and crafts/1st-quarter/week-2/DrawTheLines"),
  ),
};
