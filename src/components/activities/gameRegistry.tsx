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
  "RD-Q2W1-01": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-1/ConsonantBb"),
  ),
  "RD-Q2W1-02": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-1/ConsonantCc"),
  ),
  "RD-Q2W1-03": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-1/ConsonantDd"),
  ),
  "RD-Q2W2-01": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-2/ConsonantFf"),
  ),
  "RD-Q2W2-02": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-2/ConsonantGg"),
  ),
  "RD-Q2W2-03": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-2/ConsonantHh"),
  ),
  "RD-Q2W3-01": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-3/ConsonantJj"),
  ),
  "RD-Q2W3-02": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-3/ConsonantKk"),
  ),
  "RD-Q2W3-03": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-3/ConsonantLl"),
  ),
  "RD-Q2W4-01": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-4/ConsonantMm"),
  ),
  "RD-Q2W4-02": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-4/ConsonantNn"),
  ),
  "RD-Q2W4-03": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-4/ConsonantSoundReview"),
  ),
  "RD-Q2W5-01": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-5/ConsonantPp"),
  ),
  "RD-Q2W5-02": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-5/ConsonantPartners"),
  ),
  "RD-Q2W5-03": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-5/ListenFindSound"),
  ),
  "RD-Q2W6-01": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-6/ConsonantPictureSort"),
  ),
  "RD-Q2W6-02": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-6/SoundDetective"),
  ),
  "RD-Q2W6-03": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-6/FirstLetterMatch"),
  ),
  "RD-Q2W7-01": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-7/MixedSoundHunt"),
  ),
  "RD-Q2W7-02": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-7/ReadingReview2"),
  ),
  "RD-Q2W7-03": game(
    () =>
      import("@/components/activities/games/reading/2nd_quarter/week-7/ReadingFinalExam2"),
  ),
  "RD-Q3W1-01": game(
    () =>
      import("@/components/activities/games/reading/3rd_quarter/week-1/ConsonantQq"),
  ),
  "RD-Q3W1-02": game(
    () =>
      import("@/components/activities/games/reading/3rd_quarter/week-1/ConsonantRr"),
  ),
  "RD-Q3W1-03": game(
    () =>
      import("@/components/activities/games/reading/3rd_quarter/week-1/ConsonantSs"),
  ),
  "RD-Q3W2-01": game(
    () =>
      import("@/components/activities/games/reading/3rd_quarter/week-2/ConsonantTt"),
  ),
  "RD-Q3W2-02": game(
    () =>
      import("@/components/activities/games/reading/3rd_quarter/week-2/ConsonantVv"),
  ),
  "RD-Q3W2-03": game(
    () =>
      import("@/components/activities/games/reading/3rd_quarter/week-2/ConsonantWw"),
  ),
  "RD-Q3W3-01": game(
    () =>
      import("@/components/activities/games/reading/3rd_quarter/week-3/ConsonantXx"),
  ),
  "RD-Q3W3-02": game(
    () =>
      import("@/components/activities/games/reading/3rd_quarter/week-3/ConsonantYy"),
  ),
  "RD-Q3W3-03": game(
    () =>
      import("@/components/activities/games/reading/3rd_quarter/week-3/ConsonantZz"),
  ),
  "RD-Q3W4-01": game(
    () =>
      import("@/components/activities/games/reading/3rd_quarter/week-4/BlendAndMatchShortA"),
  ),
  "RD-Q3W4-02": game(
    () =>
      import("@/components/activities/games/reading/3rd_quarter/week-4/BlendAndMatchShortE"),
  ),
  "RD-Q3W4-03": game(
    () =>
      import("@/components/activities/games/reading/3rd_quarter/week-4/ConsonantAndWordReview"),
  ),
  "RD-Q3W5-01": game(
    () =>
      import("@/components/activities/games/reading/3rd_quarter/week-5/BlendAndMatchShortI"),
  ),
  "RD-Q3W5-02": game(
    () =>
      import("@/components/activities/games/reading/3rd_quarter/week-5/MiddleVowelMatch"),
  ),
  "RD-Q3W5-03": game(
    () =>
      import("@/components/activities/games/reading/3rd_quarter/week-5/BuildTheCvcWord"),
  ),
  "RD-Q3W6-01": game(
    () =>
      import("@/components/activities/games/reading/3rd_quarter/week-6/ReadAndChoose"),
  ),
  "RD-Q3W6-02": game(
    () =>
      import("@/components/activities/games/reading/3rd_quarter/week-6/WordSoundDetective"),
  ),
  "RD-Q3W7-01": game(
    () =>
      import("@/components/activities/games/reading/3rd_quarter/week-7/CvcPictureHunt"),
  ),
  "RD-Q3W7-02": game(
    () =>
      import("@/components/activities/games/reading/3rd_quarter/week-7/ReadingReview3"),
  ),
  "RD-Q3W7-03": game(
    () =>
      import("@/components/activities/games/reading/3rd_quarter/week-7/ReadingFinalExam3"),
  ),
  "RD-Q4W1-01": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-1/BlendAndMatchShortO"),
  ),
  "RD-Q4W1-02": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-1/BlendAndMatchShortU"),
  ),
  "RD-Q4W1-03": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-1/ReadAndMatch"),
  ),
  "RD-Q4W2-01": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-2/StoryPictureMatch"),
  ),
  "RD-Q4W2-02": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-2/RhymePartners"),
  ),
  "RD-Q4W2-03": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-2/BookPartsHunt"),
  ),
  "RD-Q4W3-01": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-3/ConsonantSoundChallenge"),
  ),
  "RD-Q4W3-02": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-3/CvcWordMix"),
  ),
  "RD-Q4W3-03": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-3/ReadToMe"),
  ),
  "RD-Q4W4-01": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-4/WordHunt"),
  ),
  "RD-Q4W4-02": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-4/ComprehensionCheck"),
  ),
  "RD-Q4W4-03": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-4/ReadingSkillsReview4"),
  ),
  "RD-Q4W5-01": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-5/StoryOrder"),
  ),
  "RD-Q4W5-02": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-5/SentencePictureMatch"),
  ),
  "RD-Q4W5-03": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-5/TellTheStory"),
  ),
  "RD-Q4W6-01": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-6/ShortVowelWordSort"),
  ),
  "RD-Q4W6-02": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-6/ReadAndDo"),
  ),
  "RD-Q4W6-03": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-6/WhoAndWhere"),
  ),
  "RD-Q4W7-01": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-7/MyNewReading"),
  ),
  "RD-Q4W7-02": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-7/ReadingReview4"),
  ),
  "RD-Q4W7-03": game(
    () =>
      import("@/components/activities/games/reading/4th_quarter/week-7/ReadingFinalAssessment4"),
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
  "LG-Q2W1-01": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-1/ListenAndFindUu"),
  ),
  "LG-Q2W1-02": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-1/ListenAndFindBbCc"),
  ),
  "LG-Q2W1-03": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-1/ListenAndFindDdFf"),
  ),
  "LG-Q2W2-01": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-2/ListenAndFindGgHh"),
  ),
  "LG-Q2W2-02": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-2/ListenAndFindJjKk"),
  ),
  "LG-Q2W2-03": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-2/ListenAndFindLlMm"),
  ),
  "LG-Q2W3-01": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-3/ListenAndFindNnPp"),
  ),
  "LG-Q2W3-02": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-3/ListenAndFindQqRr"),
  ),
  "LG-Q2W3-03": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-3/ListenAndFindSsTt"),
  ),
  "LG-Q2W4-01": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-4/ListenAndFindVvWw"),
  ),
  "LG-Q2W4-02": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-4/ListenAndFindXxYy"),
  ),
  "LG-Q2W4-03": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-4/LetterNamesReview"),
  ),
  "LG-Q2W5-01": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-5/ListenAndFindZz"),
  ),
  "LG-Q2W5-02": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-5/LanguageConsonantPartners"),
  ),
  "LG-Q2W5-03": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-5/ListenAndFindTaughtLetters"),
  ),
  "LG-Q2W6-01": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-6/ListenAndFindVowels"),
  ),
  "LG-Q2W6-02": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-6/ListenAndFindConsonant"),
  ),
  "LG-Q2W6-03": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-6/LettersAroundMe"),
  ),
  "LG-Q2W7-01": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-7/LetterDetective"),
  ),
  "LG-Q2W7-02": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-7/LanguageReview2"),
  ),
  "LG-Q2W7-03": game(
    () =>
      import("@/components/activities/games/language/2nd_quarter/week-7/LanguageFinalAssessment2"),
  ),
  "LG-Q3W1-01": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-1/ListenAndMatchSyllablesA"),
  ),
  "LG-Q3W1-02": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-1/ListenAndMatchSyllablesO"),
  ),
  "LG-Q3W1-03": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-1/ListenAndMatchSyllablesE"),
  ),
  "LG-Q3W2-01": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-2/ListenAndMatchSyllablesI"),
  ),
  "LG-Q3W2-02": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-2/ListenAndMatchSyllablesU"),
  ),
  "LG-Q3W2-03": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-2/ListenAndMatchSyllablesVowelFirstA"),
  ),
  "LG-Q3W3-01": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-3/ListenAndMatchSyllablesVowelFirstO"),
  ),
  "LG-Q3W3-02": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-3/ListenAndMatchSyllablesVowelFirstE"),
  ),
  "LG-Q3W3-03": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-3/ListenAndMatchSyllablesVowelFirstI"),
  ),
  "LG-Q3W4-01": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-4/ListenAndMatchSyllablesVowelFirstU"),
  ),
  "LG-Q3W4-02": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-4/FirstSoundFinder"),
  ),
  "LG-Q3W4-03": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-4/SyllablesAndSoundsReview"),
  ),
  "LG-Q3W5-01": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-5/LastSoundFinder"),
  ),
  "LG-Q3W5-02": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-5/ListenAndMatchSyllablesMixed"),
  ),
  "LG-Q3W5-03": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-5/ListenAndMatchSyllablesMixedVowelFirst"),
  ),
  "LG-Q3W6-01": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-6/BeginningSoundGroups"),
  ),
  "LG-Q3W6-02": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-6/EndingSoundPartners"),
  ),
  "LG-Q3W6-03": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-6/FirstAndLastSound"),
  ),
  "LG-Q3W7-01": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-7/SyllableSequenceMatch"),
  ),
  "LG-Q3W7-02": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-7/LanguageReview3"),
  ),
  "LG-Q3W7-03": game(
    () =>
      import("@/components/activities/games/language/3rd_quarter/week-7/LanguageFinalAssessment3"),
  ),
  "LG-Q4W1-01": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-1/MiddleSoundFinder"),
  ),
  "LG-Q4W1-02": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-1/DescribeTheObject"),
  ),
  "LG-Q4W1-03": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-1/FamilyAndPetMatch"),
  ),
  "LG-Q4W2-01": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-2/StoryStepsA"),
  ),
  "LG-Q4W2-02": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-2/StoryStepsB"),
  ),
  "LG-Q4W2-03": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-2/RhymeMatch"),
  ),
  "LG-Q4W3-01": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-3/ListenAndTap"),
  ),
  "LG-Q4W3-02": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-3/QuestionAndAnswer"),
  ),
  "LG-Q4W3-03": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-3/ObjectVocabulary"),
  ),
  "LG-Q4W4-01": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-4/PictureVocabulary"),
  ),
  "LG-Q4W4-02": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-4/SoundAndSyllableMatch"),
  ),
  "LG-Q4W4-03": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-4/LanguageSkillsReview4"),
  ),
  "LG-Q4W5-01": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-5/WhatIsHappening"),
  ),
  "LG-Q4W5-02": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-5/PictureStorySteps"),
  ),
  "LG-Q4W5-03": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-5/NeedsAndFeelings"),
  ),
  "LG-Q4W6-01": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-6/MyQuestion"),
  ),
  "LG-Q4W6-02": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-6/ConversationMatch"),
  ),
  "LG-Q4W6-03": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-6/MyStoryMatch"),
  ),
  "LG-Q4W7-01": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-7/PictureQuestions"),
  ),
  "LG-Q4W7-02": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-7/LanguageReview4"),
  ),
  "LG-Q4W7-03": game(
    () =>
      import("@/components/activities/games/language/4th_quarter/week-7/LanguageFinalAssessment4"),
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
  "WR-Q2W1-01": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-1/MeetTheCapitalLetters"),
  ),
  "WR-Q2W1-02": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-1/LetterTTrails"),
  ),
  "WR-Q2W1-03": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-1/LetterLTrails"),
  ),
  "WR-Q2W2-01": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-2/LetterITrails"),
  ),
  "WR-Q2W2-02": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-2/LetterHTrails"),
  ),
  "WR-Q2W2-03": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-2/LetterFTrails"),
  ),
  "WR-Q2W3-01": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-3/LetterETrails"),
  ),
  "WR-Q2W3-02": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-3/LetterVTrails"),
  ),
  "WR-Q2W3-03": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-3/LetterXTrails"),
  ),
  "WR-Q2W4-01": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-4/LetterWTrails"),
  ),
  "WR-Q2W4-02": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-4/LetterBTrails"),
  ),
  "WR-Q2W4-03": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-4/WritingSkillsReview2"),
  ),
  "WR-Q2W5-01": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-5/LetterCTrails"),
  ),
  "WR-Q2W5-02": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-5/LetterATrails"),
  ),
  "WR-Q2W5-03": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-5/LetterMTrails"),
  ),
  "WR-Q2W6-01": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-6/LetterNTrails"),
  ),
  "WR-Q2W6-02": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-6/LetterKTrails"),
  ),
  "WR-Q2W6-03": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-6/LetterYTrails"),
  ),
  "WR-Q2W7-01": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-7/LetterZTrails"),
  ),
  "WR-Q2W7-02": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-7/WritingReadinessReviewQ2"),
  ),
  "WR-Q2W7-03": game(
    () =>
      import("@/components/activities/games/writing readiness/2nd-quarter/week-7/WritingReadinessFinalAssessmentQ2"),
  ),
  "WR-Q3W1-01": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-1/LetterDTrails"),
  ),
  "WR-Q3W1-02": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-1/LetterOTrails"),
  ),
  "WR-Q3W1-03": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-1/LetterPTrails"),
  ),
  "WR-Q3W2-01": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-2/LetterUTrails"),
  ),
  "WR-Q3W2-02": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-2/LetterGTrails"),
  ),
  "WR-Q3W2-03": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-2/LetterJTrails"),
  ),
  "WR-Q3W3-01": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-3/LetterRTrails"),
  ),
  "WR-Q3W3-02": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-3/LetterSTrails"),
  ),
  "WR-Q3W3-03": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-3/LetterQTrails"),
  ),
  "WR-Q3W4-01": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-4/LowercaseBTrails"),
  ),
  "WR-Q3W4-02": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-4/LowercaseDTrails"),
  ),
  "WR-Q3W4-03": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-4/WritingSkillsReview3"),
  ),
  "WR-Q3W5-01": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-5/LowercaseHTrails"),
  ),
  "WR-Q3W5-02": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-5/LowercaseTTrails"),
  ),
  "WR-Q3W5-03": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-5/LowercaseLTrails"),
  ),
  "WR-Q3W6-01": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-6/LowercaseITrails"),
  ),
  "WR-Q3W6-02": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-6/LowercaseFTrails"),
  ),
  "WR-Q3W6-03": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-6/LowercaseMTrails"),
  ),
  "WR-Q3W7-01": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-7/LowercaseNTrails"),
  ),
  "WR-Q3W7-02": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-7/WritingReadinessReviewQ3"),
  ),
  "WR-Q3W7-03": game(
    () =>
      import("@/components/activities/games/writing readiness/3rd-quarter/week-7/WritingReadinessFinalAssessmentQ3"),
  ),
  "WR-Q4W1-01": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-1/LowercaseGTrails"),
  ),
  "WR-Q4W1-02": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-1/LowercasePTrails"),
  ),
  "WR-Q4W1-03": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-1/LowercaseJTrails"),
  ),
  "WR-Q4W2-01": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-2/LowercaseETrails"),
  ),
  "WR-Q4W2-02": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-2/LowercaseCTrails"),
  ),
  "WR-Q4W2-03": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-2/LowercaseATrails"),
  ),
  "WR-Q4W3-01": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-3/LowercaseQTrails"),
  ),
  "WR-Q4W3-02": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-3/LowercaseOTrails"),
  ),
  "WR-Q4W3-03": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-3/LowercaseSTrails"),
  ),
  "WR-Q4W4-01": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-4/NumberTrails"),
  ),
  "WR-Q4W4-02": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-4/MyName"),
  ),
  "WR-Q4W4-03": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-4/WritingSkillsReview4"),
  ),
  "WR-Q4W5-01": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-5/LowercaseRTrails"),
  ),
  "WR-Q4W5-02": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-5/LowercaseKTrails"),
  ),
  "WR-Q4W5-03": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-5/LowercaseUTrails"),
  ),
  "WR-Q4W6-01": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-6/LowercaseVTrails"),
  ),
  "WR-Q4W6-02": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-6/LowercaseWTrails"),
  ),
  "WR-Q4W6-03": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-6/LowercaseXTrails"),
  ),
  "WR-Q4W7-01": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-7/LowercaseYZTrails"),
  ),
  "WR-Q4W7-02": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-7/WritingReadinessReviewQ4"),
  ),
  "WR-Q4W7-03": game(
    () =>
      import("@/components/activities/games/writing readiness/4th-quarter/week-7/WritingReadinessFinalAssessmentQ4"),
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
  "MR-Q2W3-02": game(
    () =>
      import("@/components/activities/games/math readiness/2nd-quarter/week-3/PatternMaking"),
  ),
  "MR-Q2W4-01": game(
    () =>
      import("@/components/activities/games/math readiness/2nd-quarter/week-4/SortByColor"),
  ),
  "MR-Q2W4-02": game(
    () =>
      import("@/components/activities/games/math readiness/2nd-quarter/week-4/MathSkillsReview2"),
  ),
  "MR-Q2W5-01": game(
    () =>
      import("@/components/activities/games/math readiness/2nd-quarter/week-5/SortByShape"),
  ),
  "MR-Q2W5-02": game(
    () =>
      import("@/components/activities/games/math readiness/2nd-quarter/week-5/PatternDetective"),
  ),
  "MR-Q2W6-01": game(
    () =>
      import("@/components/activities/games/math readiness/2nd-quarter/week-6/ChangeTheSortingRule"),
  ),
  "MR-Q2W6-02": game(
    () =>
      import("@/components/activities/games/math readiness/2nd-quarter/week-6/ShapeAndPatternChallenge"),
  ),
  "MR-Q2W7-01": game(
    () =>
      import("@/components/activities/games/math readiness/2nd-quarter/week-7/MathReadinessReview2"),
  ),
  "MR-Q2W7-02": game(
    () =>
      import("@/components/activities/games/math readiness/2nd-quarter/week-7/MathReadinessFinalAssessment2"),
  ),
  "MR-Q3W1-01": game(
    () =>
      import("@/components/activities/games/math readiness/3rd-quarter/week-1/BigOrSmall"),
  ),
  "MR-Q3W1-02": game(
    () =>
      import("@/components/activities/games/math readiness/3rd-quarter/week-1/SizeSorting"),
  ),
  "MR-Q3W2-01": game(
    () =>
      import("@/components/activities/games/math readiness/3rd-quarter/week-2/CompareLengths"),
  ),
  "MR-Q3W2-02": game(
    () =>
      import("@/components/activities/games/math readiness/3rd-quarter/week-2/LongOrShort"),
  ),
  "MR-Q3W3-01": game(
    () =>
      import("@/components/activities/games/math readiness/3rd-quarter/week-3/NearOrFar"),
  ),
  "MR-Q3W4-01": game(
    () =>
      import("@/components/activities/games/math readiness/3rd-quarter/week-4/WhereIsIt"),
  ),
  "MR-Q3W4-02": game(
    () =>
      import("@/components/activities/games/math readiness/3rd-quarter/week-4/MathSkillsReview3"),
  ),
  "MR-Q3W5-01": game(
    () =>
      import("@/components/activities/games/math readiness/3rd-quarter/week-5/PutItInOut"),
  ),
  "MR-Q3W5-02": game(
    () =>
      import("@/components/activities/games/math readiness/3rd-quarter/week-5/LengthLineUp"),
  ),
  "MR-Q3W6-01": game(
    () =>
      import("@/components/activities/games/math readiness/3rd-quarter/week-6/CompareAndChoose"),
  ),
  "MR-Q3W6-02": game(
    () =>
      import("@/components/activities/games/math readiness/3rd-quarter/week-6/PlaceItHere"),
  ),
  "MR-Q3W7-01": game(
    () =>
      import("@/components/activities/games/math readiness/3rd-quarter/week-7/MathReadinessReview3"),
  ),
  "MR-Q3W7-02": game(
    () =>
      import("@/components/activities/games/math readiness/3rd-quarter/week-7/MathReadinessFinalAssessment3"),
  ),
  "MR-Q4W1-01": game(
    () =>
      import("@/components/activities/games/math readiness/4th-quarter/week-1/CountAndAdd"),
  ),
  "MR-Q4W1-02": game(
    () =>
      import("@/components/activities/games/math readiness/4th-quarter/week-1/AdditionGame"),
  ),
  "MR-Q4W2-01": game(
    () =>
      import("@/components/activities/games/math readiness/4th-quarter/week-2/TakeAway"),
  ),
  "MR-Q4W2-02": game(
    () =>
      import("@/components/activities/games/math readiness/4th-quarter/week-2/SubtractionGame"),
  ),
  "MR-Q4W3-01": game(
    () =>
      import("@/components/activities/games/math readiness/4th-quarter/week-3/WhatComesNext"),
  ),
  "MR-Q4W4-01": game(
    () =>
      import("@/components/activities/games/math readiness/4th-quarter/week-4/MathGame"),
  ),
  "MR-Q4W4-02": game(
    () =>
      import("@/components/activities/games/math readiness/4th-quarter/week-4/MathSkillsReview4"),
  ),
  "MR-Q4W5-01": game(
    () =>
      import("@/components/activities/games/math readiness/4th-quarter/week-5/AddTheStory"),
  ),
  "MR-Q4W5-02": game(
    () =>
      import("@/components/activities/games/math readiness/4th-quarter/week-5/TakeAwayStory"),
  ),
  "MR-Q4W6-01": game(
    () =>
      import("@/components/activities/games/math readiness/4th-quarter/week-6/MissingNumberHunt"),
  ),
  "MR-Q4W6-02": game(
    () =>
      import("@/components/activities/games/math readiness/4th-quarter/week-6/JoinOrTakeAway"),
  ),
  "MR-Q4W7-01": game(
    () =>
      import("@/components/activities/games/math readiness/4th-quarter/week-7/MathReadinessReview4"),
  ),
  "MR-Q4W7-02": game(
    () =>
      import("@/components/activities/games/math readiness/4th-quarter/week-7/MathReadinessFinalAssessment4"),
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
