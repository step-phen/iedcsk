/**
 * The two halves every game's spoken intro is built from.
 *
 * Split on purpose. /api/tts caches by exact text (see lib/tts.ts), so an
 * intro built as one string carrying the learner's name — "Hi Maria! Let's
 * find big and small things together!" — was a fresh ElevenLabs generation
 * for every learner x game pair, and a class with a new learner in it burnt
 * credits on ten clips nobody else could ever reuse. Keeping the name in its
 * own short line makes the game half shared by every learner and the
 * greeting half shared by every game: clips grow as learners + games rather
 * than learners x games.
 *
 * Deliberately import-free so scripts/prewarm-tts.mjs can load this same
 * file through Node's type stripping and warm exactly the lines the games
 * will ask for — a second copy of these strings in the script would drift
 * the moment one of them is reworded, and a drifted line is a cache miss.
 */

/** One clip per learner, reused by every game. */
export function learnerGreeting(name: string | null): string {
  return name ? `Hi ${name}!` : "Hi there!";
}

/** One clip per game, reused by every learner. Keyed by the lowercase activity name. */
export const GAME_INTRO_LINES = {
  "pack my writing bag":
    "Let's pack your writing bag. Drag or tap the things you need for writing into the school bag!",
  "similar and different":
    "Let's look closely and find out what's the same and what's different!",
  "long and short":
    "Today we're going to compare long and short things. Let's start!",
  shape:
    "Let's play Digital Shape Match! Drag each colored shape up to the outline it fits.",
  "match the shapes":
    "Let's play Digital Shape Match! Drag each colored shape up to the outline it fits.",
  "big and small": "Let's find big and small things together!",
  differences: "Let's find the picture that is different!",
  similarities: "Let's find the pictures that are the same!",
  "number recognition":
    "Let's count some things and tap the right number. Let's start!",
  "number coloring":
    "Let's colour the numbers. Pick the right crayon, then colour inside the number.",
  "shape coloring":
    "Let's colour the shapes. Pick the right crayon, then colour inside the shape.",
  "shape matching":
    "Let's match shapes! Tap the shape below that matches the one on the card — color and size don't matter.",
  "shape puzzle":
    "Let's solve a shape puzzle! Drag the piece into the outline where it fits.",
  "continue the pattern":
    "Let's continue the pattern! Look at the shapes, then tap what comes next.",
  "sort by color":
    "Let's sort by color! Drag each object into the basket with the same color.",
  "math skills review 2":
    "Let's review! Look at each task, then tap the picture that answers it.",
  "color hunt": "Let's play Color Hunt! Find the objects that match the color!",
  "color the picture":
    "Let's color the picture! Pick a color, then drag on the picture to paint it!",
  "clean or dirty":
    "Let's sort clean and dirty! Tap CLEAN or DIRTY for each picture.",
  "healthy or unhealthy":
    "Let's sort healthy and unhealthy food! Tap HEALTHY or UNHEALTHY for each food.",
  "my healthy plate":
    "Let's build a healthy plate! Tap the healthy foods to add them to your plate.",
  "active or rest":
    "Let's sort active and rest! Look at each picture, then tap ACTIVE if it moves your body, or REST if it rests your body.",
  "safe or unsafe":
    "Let's sort safe and unsafe! Look at each picture, then tap SAFE if it keeps you safe, or UNSAFE if it could hurt you.",
  "self-portrait":
    "Let's build a self-portrait! Drag each part onto your face to finish your picture.",
  "objects that do not belong":
    "Let's find the one that does not belong! Tap the picture that is different from the rest.",
  "objects that go together":
    "Let's find things that go together! Look at the picture, then tap the one that goes with it.",
  "missing parts of objects":
    "Let's find the missing part! Look at the picture, then tap the part that completes it.",
  "missing parts of shapes":
    "Let's find the missing piece! Look at the shape, then tap the piece that completes it.",
  "follow the lines": "Let's trace some lines! Use your finger to trace from the green dot to the orange dot.",
  "trace the shapes": "Let's trace some shapes! Start at the green dot and trace all the way around each shape.",
  "draw the lines": "Let's draw the lines! Use your finger to trace from the start dot to the end.",
  "long and short lines":
    "Let's trace long and short lines! Start at the green dot and trace all the way to the orange star.",
  "vowel aa":
    "Let's find pictures that start with the letter A! Tap the one that starts with Aa.",
  "right slant trails":
    "Let's trace right slants! A right slant leans to the right. Start at the green dot and trace down to the orange star.",
  "left slant trails":
    "Let's trace left slants! Use your finger to trace each slanting line.",
  "left curve paths":
    "Let's trace left curves! Use your finger to trace each curving line.",
  "right curve paths":
    "Let's trace right curves! Use your finger to trace each curving line.",
  "rainbow curves":
    "Let's paint a rainbow! Trace each arch from the green dot, up and over, down to the star.",
  "smile curves":
    "Our friends need smiles! Trace each smile from the green dot, down and around, up to the star.",
  "writing skills review 1":
    "Let's fill your writing notebook! Listen to each page, then tap the right picture or trace the line.",
  "circle trails":
    "Round things are hiding in the circles! Trace each circle from the green dot, all the way around, and back to the dot.",
  "wave paths":
    "Let's help the little boat sail! Trace each wave, over and under, from the green dot to the star.",
  "zigzag adventure":
    "Let's go on a treasure hunt! Trace each zigzag trail, turn by turn, to help the explorer find the treasure.",
  "round and round":
    "Let's grow a caterpillar! Watch the pencil draw a circle, trace it, then draw your own circle in the empty box.",
  "straight-sided shapes":
    "Let's build a town! Watch the pencil draw a square or a rectangle, trace it, then draw your own in the empty box.",
  "triangle builders":
    "Let's build a campsite! Watch the pencil draw a triangle, trace it, then draw your own in the empty box.",
  "writing path challenge":
    "Let's race! Each race track mixes straight lines, slants, and curves. Trace the whole track so the race car can reach the flag.",
  "writing readiness review":
    "Let's review everything on the chalkboard! Tap the right picture, trace the lines, and copy the shapes. Every right answer earns a chalk star.",
  "writing readiness final assessment":
    "It's time for your writing final! Tap, trace, and copy all by yourself. Every right answer stamps your writing passport.",
  "count the objects":
    "Let's count! Tap each picture to count it into the jar, one by one. Then tap the number that shows how many.",
  "match number to objects":
    "Let's be mail carriers! Look at the number on each letter, then deliver it to the house with that many things in its window.",
  "count and match":
    "Let's help the frog hop home! Count the pictures in the pond, then tap the lily pad with that number.",
  "more or less":
    "Let's play on the seesaw! Look at the pictures on both seats, then tap the side with more or fewer, just like I say.",
  "circle the group":
    "Let's circle groups like on a worksheet! Look at both groups, then tap the one with more. A crayon will draw a circle around it.",
  "find the smaller group":
    "Let's be number detectives! Look at both clue cards, then tap the group with fewer. Count how many, not how big!",
  "counting detective":
    "Let's be counting detectives! Shine the flashlight and count every clue. Tap each one as you count it, so you never count it twice. Then tap the number tent.",
  "math readiness review":
    "Let's grow a number flower! Find numbers, count pictures, match groups, and find more or fewer. Every right answer opens a bright petal.",
  "math readiness final assessment":
    "It's time for your math final! Listen carefully and answer all by yourself. Every right answer puts a gold block on your number tower.",
  "math skills review 1":
    "All aboard the number train! Find numbers, count pictures, match groups, and find more or fewer. Every right answer puts a star on the train.",
  "vowel ee":
    "Let's find pictures that start with the letter E! Tap the one that starts with Ee.",
  "odd one out":
    "Let's find the odd one out! Look at the four pictures, then tap the one that is different.",
  "vowel ii":
    "Let's find pictures that start with the letter I! Tap the one that starts with Ii.",
  "opposite directions":
    "Let's find opposite directions! Look at the arrow, then tap the one that goes the other way.",
  "vowel oo":
    "Let's find pictures that start with the letter O! Tap the one that starts with Oo.",
  "vowel uu":
    "Let's find pictures that start with the letter U! Tap the one that starts with Uu.",
  "vowel partners":
    "Let's match big letters with their small partners! Look at the big letter, then tap its small letter.",
  "size sort":
    "Let's sort by size! Drag each object into the Big group or the Small group.",
  "beginning vowel match":
    "Let's help the busy bee! Listen to the picture name, then tap the flower with its beginning vowel.",
  "vowel picture sort":
    "All aboard! Listen to the picture name, then tap the bus stop with its beginning vowel.",
  "reading review":
    "Let's walk the review trail! Listen to each question, then tap the right answer to hop to the next stone.",
  "reading final exam":
    "It's exam time, star reader! Listen to each question, then tap the right answer to light up a star in the sky.",
  "listen and find the letter":
    "Let's hunt for treasure! Listen to the letter, then tap the chest with that letter.",
  "alphabet partners":
    "Let's go fishing for letter partners! Look at the big letter, then catch the fish with its small letter.",
  "length sort":
    "Let's sort by length! Drag each object into the Long group or the Short group.",
  "shape hunt":
    "Let's be shape detectives! Look at the shape, then tap the object that matches it.",
  "vowels review":
    "Let's sort our vowel pictures! Listen to each picture, then put it in the basket with its beginning vowel.",
  "naming vowel aa":
    "Let's name the letter Aa! Look at the letter, then tap the one that is the same.",
  "show and say ee":
    "Let's hatch some eggs! Listen for big E or small e, tap that egg, then say the letter name with me.",
  "show and say ii":
    "Let's light up the igloo village! Find the igloo with big I and the igloo with small i, then say the letter name with me.",
  "language skills review 1":
    "Let's pop some bubbles! Listen to each question, then pop the bubble with the right answer.",
  "say and point: aa and ee":
    "Ant and Elephant are hungry! Ant eats A cookies and Elephant eats E cookies. Tap who gets each cookie, then say the letter name with me.",
  "say and point: ii and oo":
    "Let's let the balloons fly! Listen for big or small I and O, tap that balloon, then say the letter name with me.",
  "sort the pictures":
    "Welcome to the sorting factory! Look at the color of each picture, then tap the red box or the blue box.",
  "show and say oo":
    "Hoo hoo! The owls are holding letters. Listen for big O or small o, tap that owl, then say the letter name with me.",
  "picture detective":
    "Let's be picture detectives! Look closely at each picture, find what is missing, then tap the right clue.",
  "listen and move":
    "Let's play with the puppy! Watch where the puppy runs, then tap the arrow to send it the opposite way.",
  "find the different one":
    "Welcome to the toy shop! On every shelf, one toy is not like the others. Tap the one that is different.",
  "language review":
    "Let's fuel the rocket! Listen to each question, then tap the right button. Every right answer fills the rocket with fuel.",
  "language final assessment":
    "It's time for your language final! Listen carefully and tap the right card. Every answer uncovers a piece of the prize puzzle.",
  "naming vowel ee":
    "Let's name the letter Ee! Look at the letter, then tap the one that is the same.",
  "naming vowel ii":
    "Let's name the letter Ii! Look at the letter, then tap the one that is the same.",
  "naming vowel oo":
    "Let's name the letter Oo! Look at the letter, then tap the one that is the same.",
} as const;
