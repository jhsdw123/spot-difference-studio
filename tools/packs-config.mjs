// Single source of truth for all sellable packs.
// Imported by make-packs.mjs (PDF gen) and build-play.mjs (gated online player).
// `code` is baked into each PDF and unlocks that pack in the /play/ player.
// `playMode`: 'timer' (kids/adult — scored) or 'gentle' (senior/therapy — no timer).
export const SITE = 'https://spothuntstudio.com/spot-difference-studio/';
export const PLAY_URL = 'https://spothuntstudio.com/play/';
export const BRAND = 'Spot the Difference Studio';

export const PACKS = [
  {
    slug: 'ot-visual-perception-vol1', niche: 'ot',
    title: 'Visual Perception Puzzles', subtitle: 'Spot the Difference — OT Activity Pack · Vol. 1',
    nums: [293, 295, 298, 300, 305, 309, 313, 301, 320, 323], price: '$4.97',
    code: 'OTVP1-K9X4', playMode: 'timer',
  },
  {
    slug: 'slp-barrier-games-vol1', niche: 'slp',
    title: 'Barrier Game Picture Pairs', subtitle: 'Speech Therapy Describing Activities · Vol. 1',
    nums: [302, 304, 306, 310, 308, 312, 317, 319, 311, 327], price: '$7.00',
    code: 'SLPBG1-M3Q7', playMode: 'timer',
  },
  {
    slug: 'senior-large-print-vol1', niche: 'senior', largePrint: true,
    title: 'Large Print Spot the Difference', subtitle: 'For Seniors · Easy on the Eyes · No-Prep · Vol. 1',
    nums: [5, 6, 7, 70, 36, 37, 40, 49, 93, 95, 96, 97, 98, 102, 103, 104, 105, 107, 108, 112], price: '$8.99',
    code: 'SRLP1-T6W2', playMode: 'gentle',
  },
  {
    slug: 'winter-kids-vol1', niche: 'kids',
    title: 'Winter Spot the Difference', subtitle: 'Cozy Snow-Day Puzzles for Kids · Vol. 1',
    nums: [269, 271, 273, 274, 275, 296, 38], price: '$3.99',
    code: 'WKID1-P8H5', playMode: 'timer',
  },
  {
    slug: 'adult-photo-hard-vol1', niche: 'adult',
    title: 'Hard Spot the Difference', subtitle: 'Photo-Style Brain Games for Adults · Vol. 1',
    nums: [5, 6, 7, 50, 36, 40, 49, 93, 95, 112], price: '$5.99',
    code: 'APHD1-R4N9', playMode: 'timer',
  },
];

export const normCode = (c) => String(c).toUpperCase().replace(/[^A-Z0-9]/g, '');
