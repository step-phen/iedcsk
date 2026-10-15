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
  "pattern making":
    "Let's build a pattern! Look at the shapes, then tap to build what comes next, one at a time.",
  "sort by color":
    "Let's sort by color! Drag each object into the basket with the same color.",
  "math skills review 2":
    "Let's review! Look at each task, then tap the picture that answers it.",
  "sort by shape":
    "Let's sort by shape! Drag every object into the group with its matching shape.",
  "change the sorting rule":
    "Let's sort things, then change the rule! Watch the banner — it tells you if we're sorting by color or by shape.",
  "pattern detective":
    "Let's be pattern detectives! Find the piece that is missing from the pattern.",
  "shape and pattern challenge":
    "Let's take the challenge! Tap the shape you hear, or finish the pattern.",
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
  "meet the capital letters":
    "Look up in the sky! A little plane writes capital letters with its smoke. Watch each line and curve, then tap the letter it made.",
  "letter t trails":
    "Let's meet capital T! Watch the pencil, then trace each T to uncover a hidden picture.",
  "letter l trails":
    "Let's visit the lily pond! Watch the pencil, then trace each capital L so a friend can hop onto a lily pad.",
  "letter d trails":
    "Let's dig in the sand! Watch the pencil, then trace each capital D to dig up a hidden picture.",
  "letter o trails":
    "Let's dive under the sea! Watch the pencil, then trace each capital O around the porthole to see who swims in.",
  "letter p trails":
    "Let's paint in the art studio! Watch the pencil, then trace each capital P on the canvas to earn a sticker.",
  "small letter g trails":
    "Let's visit the candy shop! Watch the pencil, then trace each small g to get a gumball from the machine.",
  "small letter p trails":
    "Let's go to the movies! Watch the pencil, then trace each small p on the big screen to print a ticket.",
  "small letter j trails":
    "Let's swing into the jungle! Watch the pencil, then trace each small j, and don't forget the dot!",
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
  // Quarter 2's Math Readiness Review/Final Assessment share their activity name with the Q1 ones above, but cover shapes and patterns
  // instead of numbers — reusing the Q1 line would describe the wrong game, so these get their own suffixed keys instead.
  "math readiness review 2":
    "Let's grow a garden! Match shapes, finish patterns, and sort by color. Every right answer blooms a flower.",
  "math readiness final assessment 2":
    "It's time for your math final! Listen carefully and answer all by yourself. Every right answer earns a trophy on your shelf.",
  "big or small":
    "Snack time! The elephant eats big snacks and the mouse eats small snacks. Listen, then tap the big or the small snack.",
  "size sorting":
    "Let's climb the stairs! Put the smallest one on the lowest step and the biggest one on the highest step.",
  "compare lengths":
    "Let's compare lengths! Both things start at the same red line. Look where they end, then tap the long or the short one.",
  "long or short":
    "Here is our measuring stick! Compare each thing with the stick, then drag it into the Longer box or the Shorter box.",
  "near or far":
    "Let's go to the park! Find the place with the pin, then tap the thing that is near it or far from it.",
  "where is it":
    "Let's play where is it! Look at the container, then tap something that is inside it or outside it.",
  "math skills review 3":
    "Let's play picture cards! Each card asks about big and small, long and short, near and far, or inside and outside. Tap the right picture.",
  "put it in or out":
    "Let's tidy up! Listen carefully, then drag each thing inside the container or outside it.",
  "length line-up":
    "Let's line up! Put the shortest one in lane one and the longest one in lane three.",
  "compare and choose":
    "Let's dive under the sea! Listen carefully. Is it asking how big, or how long? Then tap the right sea thing.",
  "place it here":
    "Welcome to the farm! Listen to where each animal goes, then drag it near, far, inside, or outside.",
  "math readiness review 3":
    "Welcome to the circus! Each act asks about big and small, long and short, order, near and far, or inside and outside. Tap the right picture.",
  "math readiness final assessment 3":
    "Time for your space mission! Listen carefully and answer each task all by yourself.",
  "count and add":
    "Let's visit the garden! Count both baskets together, then tap the number that shows the total.",
  "addition game":
    "Let's play the addition game! Put the red and yellow counters together on the ten frame, then tap how many in all.",
  "take away":
    "Let's visit the bakery! Take away the treats you're asked for, then tap how many are left.",
  "subtraction game":
    "Let's play the subtraction game! Take counters off the board and drop them in the cup, then tap how many are left.",
  "what comes next?":
    "All aboard the number train! Count the cars, then tap the number that comes next.",
  "math game":
    "Welcome to the toy shop! Count the toys or find the shape, then tap your answer.",
  "math skills review 4":
    "Let's visit the math stations! At each station, count, add, take away, find shapes, finish patterns, or compare groups.",
  "add the story":
    "Let's read a story together! Listen carefully, watch more friends join, then tap how many in all.",
  "missing number hunt":
    "Let's go on a jungle hunt! Help the monkey cross the river by finding the missing number stone.",
  "join or take away?":
    "Let's listen to stories! Decide if more are joining or some are taken away, then watch the counters show the answer.",
  "math readiness review 4":
    "Welcome to the fiesta! Add, take away, count, find shapes, and put numbers in order. Tap the right answer.",
  "math readiness final assessment 4":
    "Happy Moving Up Day! Listen carefully and answer each math task all by yourself.",
  "take-away story":
    "Welcome to the puppet show! Listen to the story, tap the ones that go away, then tap how many are left.",
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
  "listen and find: uu":
    "It's raining! Listen to the letter name, then tap the umbrella with big U or small u.",
  "listen and find: bb, cc":
    "Welcome to the butterfly garden! Listen to the letter name, then tap the butterfly with that letter.",
  "listen and find: dd, ff":
    "It's night time! Listen to the letter name, then catch the firefly with that letter.",
  "listen and find: gg, hh":
    "Welcome to the candy shop! Listen to the letter name, then tap the gumball with that letter.",
  "listen and find: jj, kk":
    "It's a windy day! Listen to the letter name, then tap the kite with that letter.",
  "listen and find: ll, mm":
    "Welcome to the bakery! Listen to the letter name, then tap the cupcake with that letter.",
  "listen and find: nn, pp":
    "Welcome to the art room! Listen to the letter name, then tap the paint pot with that letter.",
  "listen and find: qq, rr":
    "Welcome to the robot workshop! Listen to the letter name, then tap the robot with that letter.",
  "listen and find: ss, tt":
    "All aboard! Listen to the letter name, then tap the train car with that letter.",
  "listen and match syllables: a":
    "Welcome to the apple tree! Listen to the sound, then pick the apple that says it.",
  "listen and match syllables: o":
    "Welcome to the harbor! Listen to the sound, then tap the boat that says it.",
  "listen and match syllables: e":
    "Welcome to the post office! Listen to the sound, then mail the envelope that says it.",
  "middle sound finder":
    "The caterpillar lost its middle! Listen to the word, then tap the leaf with the middle sound.",
  "describe the object":
    "Welcome to show and tell! Look at the object, listen to each sentence, then tap the one that tells about it.",
  "family and pet match":
    "Welcome to our living room! Listen to who is described, then tap that picture on the wall.",
  "consonant bb":
    "Let's go to Bubble Bay! Listen to the picture names, then pop the bubble that begins with B.",
  "consonant cc":
    "Let's visit the castle! Listen to the picture names, then tap the window that begins with C.",
  "consonant dd":
    "Let's dig like dinosaurs! Listen to the picture names, then tap the picture that begins with D.",
  "consonant ff":
    "Let's ride at the fair! Listen to the picture names, then tap the ride that begins with F.",
  "consonant gg":
    "Let's play with the gumball machine! Listen to the picture names, then tap the gumball that begins with G.",
  "consonant hh":
    "Let's visit the bee hive! Listen to the picture names, then tap the honeycomb that begins with H.",
  "consonant jj":
    "Let's open the toy boxes! Listen to the picture names, then tap the toy box that begins with J.",
  "consonant kk":
    "Let's cook in the kitchen! Listen to the picture names, then tap the pot that begins with K.",
  "consonant ll":
    "Let's light the lanterns! Listen to the picture names, then tap the lantern that begins with L.",
  "consonant mm":
    "Let's open the mailboxes! Listen to the picture names, then tap the mailbox that begins with M.",
  "consonant nn":
    "Let's look in the bird nests! Listen to the picture names, then tap the nest that begins with N.",
  "consonant qq":
    "Let's sew a quilt! Listen to the picture names, then tap the quilt patch that begins with Q.",
  "consonant rr":
    "Let's watch the rain clouds! Listen to the picture names, then tap the cloud that begins with R.",
  "consonant ss":
    "Let's walk on the seashore! Listen to the picture names, then tap the seashell that begins with S.",
  "consonant tt":
    "Let's go camping! Listen to the picture names, then tap the tent that begins with T.",
  "consonant vv":
    "Here comes the van parade! Listen to the picture names, then tap the van that begins with V.",
  "consonant ww":
    "Let's visit the wishing wells! Listen to the picture names, then tap the well that begins with W.",
  "consonant xx":
    "Let's open the toy boxes! Listen to the picture names, then tap the toy whose name ends with X.",
  "consonant yy":
    "Welcome to the yo-yo show! Listen to the picture names, then tap the yo-yo that begins with Y.",
  "consonant zz":
    "Let's unzip the zebra bags! Listen to the picture names, then tap the bag that begins with Z.",
  "consonant sound review 1":
    "All aboard the letter train! Listen to each picture name, then tap the letter it begins with.",
  "consonant pp":
    "Let's catch the parachutes! Listen to the picture names, then tap the parachute that begins with P.",
  "consonant partners":
    "It's laundry day! Look at the big letter sock, then tap the sock with its small letter partner.",
  "listen and find the sound":
    "Welcome to the drum stage! Listen to the sound, then tap the drum with the letter that makes it.",
  "consonant picture sort":
    "Let's load the trucks! Listen to each picture name, then drag it to the truck with its first letter.",
  "sound detective":
    "Let's be sound detectives! Listen closely to each picture name, then tap the clue card with its first letter.",
  "first letter match":
    "Let's build puzzles! Listen to each picture name, then drag it to the letter it begins with.",
  "mixed sound hunt":
    "Let's go on a sound hunt in the leaves! Listen to the sound, then tap the picture that begins with it.",
  "reading review 2":
    "Let's help the caterpillar grow! Listen to each question, then tap the right card. Every answer adds a new part to the caterpillar.",
  "reading final exam 2":
    "It's time for your reading final! Listen carefully and tap the right cookie. Every right answer lights a candle on the cake.",
  "cvc picture hunt":
    "Let's go on a jungle hunt! Read the word on the sign, then find its picture hiding in the bushes.",
  "reading review 3":
    "Let's dive down to the coral reef! Listen to each task, then tap your answer to find a pearl.",
  "reading final exam 3":
    "Let's light up the lanterns! Listen carefully to each task, then tap your answer.",
  "blend and match: short a":
    "Let's play with fridge magnets! Listen to each sound, blend them into a word, then drag the word to its picture.",
  "blend and match: short e":
    "Let's visit the hen house! Listen to each sound as the eggs hatch, blend them into a word, then tap the picture that matches.",
  "consonant and word review":
    "Welcome to the balloon festival! Listen to each picture or word, then tap the balloon with the right answer.",
  "blend and match: short i":
    "Let's make sound beads! Listen to each sound, blend them into a word, then tap the picture that matches.",
  "middle vowel match":
    "Welcome to the sandwich shop! Listen to the word, then tap the sound that goes in the middle.",
  "build the cvc word":
    "Let's build words with toy blocks! Look at the picture, then tap the letters in order.",
  "read and choose":
    "Ahoy, little pirate! Read the word on the treasure map, then tap the treasure that matches it.",
  "word sound detective":
    "Let's be word detectives! Listen to the word, then find its first or last sound.",
  "blend and match: short o":
    "All aboard the sound train! Listen to each sound, blend them into a word, then tap the ticket that matches.",
  "blend and match: short u":
    "Let's fly to the stars! Listen to each sound, blend them into a word, then tap the planet that matches.",
  "read and match":
    "You've got mail! Read the words on each letter, then tap the postcard that shows it.",
  "story picture match":
    "Let's read a comic story about Dan! Read each part, then tap the picture that shows what happens.",
  "rhyme partners":
    "It's laundry day! Listen to the words, then find the sock that rhymes to make a pair.",
  "book parts hunt":
    "Welcome to the class library! Listen, then tap the front cover, the title, or the pages of each book.",
} as const;
