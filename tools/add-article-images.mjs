// Insert themed library-scene figures into guide articles (idempotent).
// Hero image after the intro paragraph, second image before the CTA.
// Each figure links to answers.html?p=N so illustrations double as product demos.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const GUIDES = join(ROOT, 'guides');
const NUMS = JSON.parse(readFileSync(join(ROOT, 'library/pin-numbers.json'), 'utf8'));
const byNum = Object.fromEntries(Object.entries(NUMS).map(([id, n]) => [n, id]));

const PLAN = {
  'christmas-spot-the-difference-printables.html': [
    { n: 133, cap: 'A family trimming the tree — differences hide among the ornaments.', alt: 'Christmas spot the difference scene of a family decorating a Christmas tree, printable picture puzzle' },
    { n: 38, cap: 'A snowy old-town street on Christmas Eve, straight from the generator.', alt: 'Snowy Christmas village street spot the difference printable scene' },
  ],
  'halloween-spot-the-difference-printables.html': [
    { n: 134, cap: 'Pumpkin-carving night — spot what changed on the porch.', alt: 'Halloween spot the difference scene of a dad and child carving jack-o-lanterns, free printable' },
    { n: 257, cap: 'Friendly ghosts in the haunted hallway — spooky-cute, never scary.', alt: 'Cute haunted house Halloween spot the difference picture puzzle for kids' },
  ],
  'road-trip-printable-games-for-kids.html': [
    { n: 71, cap: 'The coastal-highway scene — a favorite for back-seat rounds.', alt: 'Road trip spot the difference scene with a red convertible on a coastal road, printable travel game' },
    { n: 326, cap: 'Campfire night: the reward round when you finally arrive.', alt: 'Camping at night spot the difference printable scene for kids road trips' },
  ],
  'spot-the-difference-benefits-for-kids.html': [
    { n: 323, cap: 'A playground scene at kid-friendly difficulty — big objects, bold changes.', alt: 'Cartoon playground spot the difference puzzle for kids development, free printable' },
    { n: 26, cap: 'Kite day at the beach — busy enough to stretch growing attention spans.', alt: 'Children flying kites on a beach spot the difference scene, visual attention practice' },
  ],
  'spot-the-difference-for-preschoolers.html': [
    { n: 293, cap: 'The teddy-bear picnic — big friendly shapes preschoolers can name.', alt: 'Teddy bear picnic cartoon spot the difference for preschoolers ages 3-5, free printable' },
    { n: 305, cap: 'The pet shop scene — every difference becomes a sentence to say out loud.', alt: 'Pet shop cartoon spot the difference scene for preschool language practice' },
  ],
  'quiet-time-activities-for-kids.html': [
    { n: 312, cap: 'The blanket-fort scene — fittingly, a quiet-time picture about quiet time.', alt: 'Kids blanket fort cartoon spot the difference scene, quiet time printable activity' },
    { n: 320, cap: 'A tidy-ish bedroom with plenty hiding in plain sight.', alt: 'Kids bedroom spot the difference printable scene for independent quiet time' },
  ],
  'summer-boredom-busters-printable.html': [
    { n: 17, cap: 'The beach-day scene — pool-week themed paper for the 2pm slump.', alt: 'Summer beach spot the difference printable scene with umbrella and sandcastle, boredom buster for kids' },
    { n: 195, cap: 'Surf-shop chaos in toy-brick style — a summer favorite with older kids.', alt: 'Toy brick beach surf shop spot the difference scene, summer printable game' },
  ],
  'airplane-activities-for-kids-printable.html': [
    { n: 27, cap: 'The balloon-over-the-valley scene — window-seat energy on paper.', alt: 'Hot air balloon over fields spot the difference scene, airplane activity printable for kids' },
    { n: 80, cap: 'The station platform scene — transit-themed for travel days.', alt: 'Train station platform spot the difference printable scene for travel games' },
  ],
  'free-printable-activities-for-seniors.html': [
    { n: 22, cap: 'The knitting-nook scene — calm, detailed, and dignified.', alt: 'Cozy knitting room spot the difference scene, printable activity for seniors' },
    { n: 130, cap: 'The bonsai workshop — quiet concentration in picture form.', alt: 'Elderly man tending bonsai spot the difference scene, senior activity printable' },
  ],
  'spot-the-difference-for-dementia-patients.html': [
    { n: 319, cap: 'Fireside with the cat — familiar, warm scenes work best in memory care.', alt: 'Grandfather by the fireplace with cat, dementia-friendly spot the difference printable scene' },
    { n: 127, cap: 'Looking through the photo album — a natural reminiscence prompt.', alt: 'Grandparent and child reading a photo album spot the difference scene for memory care' },
  ],
  'visual-scanning-activities-stroke-recovery.html': [
    { n: 10, cap: 'A calm sunroom scene — low clutter, kind to a rebuilding visual system.', alt: 'Calm sunroom spot the difference scene used for visual scanning practice after stroke' },
    { n: 82, cap: 'The clockmaker’s bench — richer detail for later-stage scanning work.', alt: 'Clockmaker workshop spot the difference scene for graded visual scanning therapy' },
  ],
  'occupational-therapy-visual-perception-activities.html': [
    { n: 313, cap: 'The art-room scene — figure-ground practice disguised as a picture.', alt: 'Art classroom spot the difference scene for occupational therapy visual perception activities' },
    { n: 58, cap: 'The study-desk scene — midweight density for grading difficulty up.', alt: 'Study desk spot the difference scene, gradable visual perception activity for OT' },
  ],
  'esl-spot-the-difference-activities.html': [
    { n: 209, cap: 'The dinosaur classroom — instant vocabulary and instant laughter.', alt: 'Dinosaur classroom cartoon spot the difference scene for ESL speaking activities' },
    { n: 79, cap: 'The Paris café scene — made for describing people, food, and places.', alt: 'Paris cafe spot the difference scene for ESL information gap conversation practice' },
  ],
  'early-finisher-activities-printable.html': [
    { n: 242, cap: 'The magic-academy classroom — the folder page nobody skips.', alt: 'Magic academy classroom spot the difference scene, early finisher printable activity' },
    { n: 61, cap: 'The old library scene — silent by subject matter and by design.', alt: 'Cozy library spot the difference scene for quiet early finisher classroom work' },
  ],
  'visual-discrimination-worksheets-kindergarten.html': [
    { n: 223, cap: 'The toy-shop scene — rows of similar-but-different objects, which is the whole skill.', alt: 'Toy shop spot the difference scene, visual discrimination worksheet for kindergarten' },
    { n: 235, cap: 'A blocky farm world — high-contrast shapes for beginning scanners.', alt: 'Pixel farm spot the difference scene for kindergarten visual discrimination practice' },
  ],
  'barrier-games-speech-therapy-printable.html': [
    { n: 302, cap: 'The café scene — people, food, and positions to describe across the barrier.', alt: 'Cafe conversation spot the difference scene used as a speech therapy barrier game' },
    { n: 129, cap: 'Family chess night — comparatives and turn-taking built into the picture.', alt: 'Family playing chess spot the difference scene for language therapy describing practice' },
  ],
  'printable-activities-adults-with-disabilities.html': [
    { n: 86, cap: 'The painter at work — artwork an adult is glad to be handed.', alt: 'Artist painting outdoors spot the difference scene, age-respectful activity for adults with disabilities' },
    { n: 309, cap: 'The plant-shop scene — dignified detail at any difficulty setting.', alt: 'Plant shop spot the difference scene, adult day program printable activity' },
  ],
  'brain-games-for-adults-printable.html': [
    { n: 5, cap: 'Florence at dusk, photo-style — the hard mode adults ask for.', alt: 'Photorealistic Florence cityscape spot the difference, hard printable brain game for adults' },
    { n: 60, cap: 'The writer’s study — subtle changes in a detailed interior.', alt: 'Vintage writer desk spot the difference scene, difficult adult picture puzzle' },
  ],
  'make-spot-the-difference-book-amazon-kdp.html': [
    { n: 136, cap: 'A busy fantasy-market spread — the kind of dense scene puzzle books are built on.', alt: 'Fantasy market spot the difference scene, interior page example for a KDP puzzle book' },
    { n: 24, cap: 'The fruit-market scene — clean composition that survives grayscale print.', alt: 'Street fruit market spot the difference scene for print puzzle book interiors' },
  ],
};

let touched = 0;
for (const [file, figs] of Object.entries(PLAN)) {
  const path = join(GUIDES, file);
  let html = readFileSync(path, 'utf8');
  if (html.includes('class="art-fig"')) { console.log('skip (has figures):', file); continue; }
  const fig = ({ n, cap, alt }) => {
    const id = byNum[n];
    if (!id) throw new Error(`no id for puzzle #${n}`);
    return `\n  <figure class="art-fig">
    <a href="../answers.html?p=${n}"><img loading="lazy" src="../library/img/${id}_a.webp" alt="${alt}"></a>
    <figcaption>${cap} <em>This is real <a href="../answers.html?p=${n}">Puzzle #${n}</a> — play it online or print it free.</em></figcaption>
  </figure>\n`;
  };
  // hero: after the intro paragraph (first <p> following the byline)
  const m = html.match(/<p class="byline">[\s\S]*?<\/p>\s*\n\s*<p>[\s\S]*?<\/p>/);
  if (!m) { console.error('no intro anchor:', file); continue; }
  html = html.replace(m[0], m[0] + fig(figs[0]));
  // second: before the CTA
  if (figs[1] && html.includes('<div class="cta">')) {
    html = html.replace('<div class="cta">', fig(figs[1]) + '  <div class="cta">');
  }
  writeFileSync(path, html);
  touched++;
  console.log('figures ->', file);
}
console.log(`${touched} articles updated`);
