// Spot the Difference Studio — SVG object library
// Every object is drawn inside a 100x100 box, anchored so its "feet" sit at y=100.
// draw(c) receives the primary color and returns SVG markup (no outer transform).
// zone: 'ground' | 'air' | 'floor' | 'water' (used by the placement engine)
// canMirror: only true when a horizontal flip is clearly visible
// canRotate: only true when a small rotation is clearly visible

const O = '#2d2a26';           // outline color
const S = `stroke="${O}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`;
const SN = `stroke="${O}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;

function shade(hex, f) {
  // lighten (f>0) or darken (f<0) a #rrggbb color
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = f > 0 ? 255 : 0, a = Math.abs(f);
  r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

/* ============================== GARDEN ============================== */

const gardenObjects = [
  {
    id: 'tulip', zone: 'ground', canMirror: false, canRotate: false,
    colors: ['#e74c3c', '#f39c12', '#c0392b', '#e91e8c', '#9b59b6'],
    draw: c => `
      <path d="M50 55 L50 96" fill="none" stroke="#3a7d2c" stroke-width="5" stroke-linecap="round"/>
      <path d="M50 82 Q30 76 26 58 Q44 62 50 78 Z" fill="#4c9a3c" ${SN}/>
      <path d="M50 88 Q70 82 74 64 Q56 68 50 84 Z" fill="#4c9a3c" ${SN}/>
      <path d="M32 30 Q32 16 40 16 Q44 24 50 24 Q56 24 60 16 Q68 16 68 30 Q68 52 50 56 Q32 52 32 30 Z" fill="${c}" ${S}/>
      <path d="M42 22 Q46 30 50 30 Q54 30 58 22" fill="none" ${SN}/>`
  },
  {
    id: 'daisy', zone: 'ground', canMirror: false, canRotate: false,
    colors: ['#ffffff', '#ffd7e8', '#cfe6ff', '#fff3b0'],
    draw: c => `
      <path d="M50 60 L50 96" fill="none" stroke="#3a7d2c" stroke-width="5" stroke-linecap="round"/>
      <path d="M50 84 Q66 80 72 66 Q56 68 50 80 Z" fill="#4c9a3c" ${SN}/>
      ${[0, 45, 90, 135, 180, 225, 270, 315].map(a =>
        `<ellipse cx="50" cy="22" rx="9" ry="16" fill="${c}" ${SN} transform="rotate(${a} 50 38)"/>`).join('')}
      <circle cx="50" cy="38" r="11" fill="#ffc93c" ${S}/>`
  },
  {
    id: 'sunflower', zone: 'ground', canMirror: false, canRotate: false,
    colors: ['#ffc93c', '#ffa62b', '#ffe08a'],
    draw: c => `
      <path d="M50 58 L50 97" fill="none" stroke="#3a7d2c" stroke-width="6" stroke-linecap="round"/>
      <path d="M50 86 Q28 80 24 62 Q46 66 50 82 Z" fill="#4c9a3c" ${SN}/>
      ${[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(a =>
        `<ellipse cx="50" cy="14" rx="8" ry="15" fill="${c}" ${SN} transform="rotate(${a} 50 33)"/>`).join('')}
      <circle cx="50" cy="33" r="13" fill="#7a4a1f" ${S}/>
      <circle cx="46" cy="30" r="2" fill="#5c3715"/><circle cx="54" cy="34" r="2" fill="#5c3715"/><circle cx="49" cy="38" r="2" fill="#5c3715"/>`
  },
  {
    id: 'tree', zone: 'ground', canMirror: false, canRotate: false,
    colors: ['#4c9a3c', '#2e8b57', '#6ab04c', '#e67e22'],
    draw: c => `
      <path d="M44 66 L44 96 L56 96 L56 66 Z" fill="#8d6437" ${S}/>
      <circle cx="50" cy="34" r="26" fill="${c}" ${S}/>
      <circle cx="30" cy="46" r="15" fill="${c}" ${S}/>
      <circle cx="70" cy="46" r="15" fill="${c}" ${S}/>
      <circle cx="40" cy="30" r="4" fill="#e74c3c" ${SN}/>
      <circle cx="60" cy="40" r="4" fill="#e74c3c" ${SN}/>
      <circle cx="52" cy="22" r="4" fill="#e74c3c" ${SN}/>`
  },
  {
    id: 'mushroom', zone: 'ground', canMirror: false, canRotate: false,
    colors: ['#e74c3c', '#e67e22', '#9b59b6', '#c0392b'],
    draw: c => `
      <path d="M38 60 Q38 96 40 96 L60 96 Q62 96 62 60 Z" fill="#f7ecd9" ${S}/>
      <path d="M18 60 Q18 26 50 26 Q82 26 82 60 Z" fill="${c}" ${S}/>
      <circle cx="36" cy="46" r="6" fill="#ffffff" ${SN}/>
      <circle cx="58" cy="38" r="7" fill="#ffffff" ${SN}/>
      <circle cx="68" cy="52" r="5" fill="#ffffff" ${SN}/>`
  },
  {
    id: 'butterfly', zone: 'air', canMirror: false, canRotate: true,
    colors: ['#9b59b6', '#e91e8c', '#3498db', '#f39c12'],
    draw: c => `
      <ellipse cx="50" cy="52" rx="5" ry="20" fill="#4a4a4a" ${SN}/>
      <path d="M46 40 Q20 16 16 34 Q14 50 44 52 Z" fill="${c}" ${S}/>
      <path d="M54 40 Q80 16 84 34 Q86 50 56 52 Z" fill="${c}" ${S}/>
      <path d="M46 56 Q24 60 26 74 Q30 84 46 62 Z" fill="${shade(c, 0.35)}" ${S}/>
      <path d="M54 56 Q76 60 74 74 Q70 84 54 62 Z" fill="${shade(c, 0.35)}" ${S}/>
      <path d="M47 36 Q42 26 38 24 M53 36 Q58 26 62 24" fill="none" ${SN}/>
      <circle cx="34" cy="36" r="4" fill="#ffffff" ${SN}/><circle cx="66" cy="36" r="4" fill="#ffffff" ${SN}/>`
  },
  {
    id: 'bee', zone: 'air', canMirror: true, canRotate: true,
    colors: ['#ffc93c', '#ffa62b'],
    draw: c => `
      <ellipse cx="30" cy="38" rx="14" ry="10" fill="#dff1ff" opacity="0.9" ${SN}/>
      <ellipse cx="48" cy="30" rx="14" ry="10" fill="#dff1ff" opacity="0.9" ${SN}/>
      <ellipse cx="48" cy="58" rx="26" ry="18" fill="${c}" ${S}/>
      <path d="M40 42 L40 74 M54 42 L54 74" fill="none" stroke="${O}" stroke-width="5"/>
      <circle cx="76" cy="54" r="11" fill="${c}" ${S}/>
      <circle cx="80" cy="51" r="2.5" fill="${O}"/>
      <path d="M20 58 L12 58" fill="none" ${S}/>`
  },
  {
    id: 'ladybug', zone: 'ground', canMirror: true, canRotate: false,
    colors: ['#e74c3c', '#e67e22', '#ffc93c'],
    draw: c => `
      <circle cx="50" cy="72" r="24" fill="${c}" ${S}/>
      <path d="M50 48 L50 96" stroke="${O}" stroke-width="3"/>
      <circle cx="38" cy="64" r="4.5" fill="${O}"/><circle cx="62" cy="64" r="4.5" fill="${O}"/>
      <circle cx="36" cy="80" r="4" fill="${O}"/><circle cx="64" cy="80" r="4" fill="${O}"/>
      <circle cx="50" cy="44" r="10" fill="#3b3b3b" ${SN}/>
      <circle cx="46" cy="41" r="2" fill="#fff"/><circle cx="54" cy="41" r="2" fill="#fff"/>
      <path d="M44 36 Q40 30 36 28 M56 36 Q60 30 64 28" fill="none" ${SN}/>`
  },
  {
    id: 'snail', zone: 'ground', canMirror: true, canRotate: false,
    colors: ['#e67e22', '#9b59b6', '#3498db', '#ffa62b'],
    draw: c => `
      <path d="M22 96 Q18 74 34 72 Q40 72 44 78 L70 78 Q78 82 80 96 Z" fill="#cbe6a3" ${S}/>
      <path d="M28 74 Q26 56 30 48 M38 72 Q40 58 46 52" fill="none" ${SN}/>
      <circle cx="30" cy="44" r="4" fill="#cbe6a3" ${SN}/><circle cx="48" cy="48" r="4" fill="#cbe6a3" ${SN}/>
      <circle cx="62" cy="66" r="26" fill="${c}" ${S}/>
      <path d="M62 66 Q76 64 74 54 Q70 46 60 50 Q52 54 56 62 Q58 67 64 65" fill="none" ${SN}/>
      <circle cx="27" cy="58" r="2.5" fill="${O}"/>`
  },
  {
    id: 'wateringcan', zone: 'ground', canMirror: true, canRotate: false,
    colors: ['#3498db', '#5fb3b3', '#e74c3c', '#95a5a6'],
    draw: c => `
      <path d="M30 52 L70 52 L74 96 L26 96 Z" fill="${c}" ${S}/>
      <path d="M30 60 Q10 62 12 44 L20 46 Q18 56 32 56" fill="${c}" ${S}/>
      <circle cx="14" cy="42" r="7" fill="${shade(c, -0.2)}" ${S}/>
      <path d="M40 52 Q40 34 60 34 Q72 34 72 52" fill="none" ${S}/>
      <path d="M34 68 L68 68" stroke="${shade(c, -0.25)}" stroke-width="4"/>`
  },
  {
    id: 'birdhouse', zone: 'ground', canMirror: false, canRotate: false,
    colors: ['#e67e22', '#c0392b', '#5fb3b3', '#8d6437'],
    draw: c => `
      <rect x="46" y="70" width="8" height="28" fill="#8d6437" ${S}/>
      <rect x="28" y="34" width="44" height="42" rx="3" fill="${c}" ${S}/>
      <path d="M22 38 L50 12 L78 38 Z" fill="${shade(c, -0.3)}" ${S}/>
      <circle cx="50" cy="52" r="9" fill="#3b3b3b" ${S}/>
      <path d="M44 68 L56 68" ${S}/>`
  },
  {
    id: 'gardenbird', zone: 'air', canMirror: true, canRotate: false,
    colors: ['#3498db', '#e74c3c', '#f39c12', '#9b59b6'],
    draw: c => `
      <ellipse cx="46" cy="58" rx="26" ry="20" fill="${c}" ${S}/>
      <circle cx="72" cy="42" r="14" fill="${c}" ${S}/>
      <path d="M84 40 L96 44 L84 49 Z" fill="#ffa62b" ${S}/>
      <path d="M40 52 Q22 48 18 60 Q30 66 46 62 Z" fill="${shade(c, 0.3)}" ${S}/>
      <circle cx="75" cy="39" r="3" fill="${O}"/>
      <path d="M38 78 L38 92 M52 78 L52 92" fill="none" ${S}/>
      <path d="M33 92 L43 92 M47 92 L57 92" fill="none" ${S}/>`
  },
];

/* ============================== OCEAN ============================== */

const oceanObjects = [
  {
    id: 'fish', zone: 'water', canMirror: true, canRotate: true,
    colors: ['#f39c12', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6'],
    draw: c => `
      <path d="M20 50 Q6 36 8 30 Q22 32 30 44 Q22 56 8 58 Q6 52 20 50 Z" fill="${shade(c, 0.25)}" ${S}/>
      <ellipse cx="56" cy="50" rx="32" ry="22" fill="${c}" ${S}/>
      <path d="M50 30 Q56 18 66 20 Q64 30 58 34 Z" fill="${shade(c, 0.25)}" ${S}/>
      <path d="M48 44 Q56 50 48 58 M60 42 Q68 50 60 58" fill="none" ${SN}/>
      <circle cx="74" cy="44" r="4" fill="#fff" ${SN}/><circle cx="75" cy="44" r="1.8" fill="${O}"/>
      <path d="M84 50 Q80 54 76 52" fill="none" ${SN}/>`
  },
  {
    id: 'angelfish', zone: 'water', canMirror: true, canRotate: false,
    colors: ['#ffc93c', '#5fb3b3', '#e91e8c', '#3498db'],
    draw: c => `
      <path d="M18 50 Q8 38 10 32 Q20 36 26 46 Q20 58 10 64 Q8 58 18 50 Z" fill="${shade(c, 0.3)}" ${S}/>
      <path d="M52 14 Q60 26 58 34 L44 34 Q44 22 52 14 Z" fill="${shade(c, 0.3)}" ${S}/>
      <path d="M52 86 Q60 74 58 66 L44 66 Q44 78 52 86 Z" fill="${shade(c, 0.3)}" ${S}/>
      <ellipse cx="52" cy="50" rx="30" ry="24" fill="${c}" ${S}/>
      <path d="M46 30 L46 70 M60 32 L60 68" fill="none" stroke="${O}" stroke-width="3"/>
      <circle cx="72" cy="44" r="4" fill="#fff" ${SN}/><circle cx="73" cy="44" r="1.8" fill="${O}"/>`
  },
  {
    id: 'whale', zone: 'water', canMirror: true, canRotate: false,
    colors: ['#3498db', '#5b7fd4', '#5fb3b3', '#7f8fa6'],
    draw: c => `
      <path d="M12 62 Q4 50 8 42 Q18 46 24 54" fill="${c}" ${S}/>
      <path d="M14 46 Q10 34 16 28 Q24 34 26 44" fill="${c}" ${S}/>
      <ellipse cx="56" cy="62" rx="38" ry="26" fill="${c}" ${S}/>
      <path d="M30 74 Q52 84 84 72 Q88 80 82 84 Q54 92 28 80 Z" fill="${shade(c, 0.45)}" ${SN}/>
      <circle cx="80" cy="54" r="4" fill="#fff" ${SN}/><circle cx="81" cy="54" r="1.8" fill="${O}"/>
      <path d="M66 26 Q62 18 66 12 M74 26 Q78 20 74 12 M70 28 L70 14" fill="none" ${SN}/>`
  },
  {
    id: 'octopus', zone: 'water', canMirror: false, canRotate: false,
    colors: ['#9b59b6', '#e91e8c', '#e74c3c', '#5fb3b3'],
    draw: c => `
      ${[22, 36, 50, 64, 78].map((x, i) =>
        `<path d="M${x} 62 Q${x + (i % 2 ? 8 : -8)} 80 ${x + (i % 2 ? 2 : -2)} 94" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/>
         <path d="M${x} 62 Q${x + (i % 2 ? 8 : -8)} 80 ${x + (i % 2 ? 2 : -2)} 94" fill="none" stroke="${O}" stroke-width="1.5" opacity="0.4"/>`).join('')}
      <ellipse cx="50" cy="40" rx="30" ry="28" fill="${c}" ${S}/>
      <circle cx="40" cy="36" r="5" fill="#fff" ${SN}/><circle cx="41.5" cy="36" r="2.2" fill="${O}"/>
      <circle cx="60" cy="36" r="5" fill="#fff" ${SN}/><circle cx="61.5" cy="36" r="2.2" fill="${O}"/>
      <path d="M42 52 Q50 58 58 52" fill="none" ${SN}/>`
  },
  {
    id: 'crab', zone: 'floor', canMirror: false, canRotate: false,
    colors: ['#e74c3c', '#e67e22', '#c0392b'],
    draw: c => `
      <path d="M24 60 Q10 56 8 44 M20 70 Q8 70 4 60 M76 60 Q90 56 92 44 M80 70 Q92 70 96 60" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
      <path d="M24 60 Q10 56 8 44 M20 70 Q8 70 4 60 M76 60 Q90 56 92 44 M80 70 Q92 70 96 60" fill="none" stroke="${O}" stroke-width="1.5" opacity="0.4"/>
      <circle cx="14" cy="36" r="9" fill="${c}" ${S}/><path d="M10 30 L18 40" stroke="${O}" stroke-width="2"/>
      <circle cx="86" cy="36" r="9" fill="${c}" ${S}/><path d="M90 30 L82 40" stroke="${O}" stroke-width="2"/>
      <ellipse cx="50" cy="70" rx="28" ry="20" fill="${c}" ${S}/>
      <path d="M40 48 L40 58 M60 48 L60 58" fill="none" ${S}/>
      <circle cx="40" cy="46" r="5" fill="#fff" ${SN}/><circle cx="40" cy="46" r="2" fill="${O}"/>
      <circle cx="60" cy="46" r="5" fill="#fff" ${SN}/><circle cx="60" cy="46" r="2" fill="${O}"/>
      <path d="M42 74 Q50 80 58 74" fill="none" ${SN}/>`
  },
  {
    id: 'starfish', zone: 'floor', canMirror: false, canRotate: true,
    colors: ['#ffa62b', '#e91e8c', '#e74c3c', '#ffc93c'],
    draw: c => `
      <path d="M50 18 L59 44 L86 45 L64 61 L72 88 L50 72 L28 88 L36 61 L14 45 L41 44 Z" fill="${c}" ${S}/>
      <circle cx="44" cy="52" r="2.5" fill="${O}"/><circle cx="56" cy="52" r="2.5" fill="${O}"/>
      <path d="M44 62 Q50 66 56 62" fill="none" ${SN}/>`
  },
  {
    id: 'seahorse', zone: 'water', canMirror: true, canRotate: false,
    colors: ['#ffc93c', '#2ecc71', '#e91e8c', '#5fb3b3'],
    draw: c => `
      <path d="M56 22 Q76 26 74 44 Q72 60 58 66 Q48 70 48 80 Q48 90 58 92 Q46 98 40 88 Q34 76 46 66 Q58 58 60 46 Q62 34 50 32 Q40 30 40 40 L32 38 Q34 22 56 22 Z" fill="${c}" ${S}/>
      <path d="M60 20 Q64 10 74 12 Q72 20 66 24 Z" fill="${shade(c, 0.3)}" ${S}/>
      <path d="M56 24 L44 18" fill="none" ${S}/>
      <circle cx="56" cy="30" r="3" fill="#fff" ${SN}/><circle cx="57" cy="30" r="1.5" fill="${O}"/>
      <path d="M70 46 Q80 48 78 58 Q70 60 66 54" fill="${shade(c, 0.3)}" ${SN}/>`
  },
  {
    id: 'jellyfish', zone: 'water', canMirror: false, canRotate: false,
    colors: ['#e91e8c', '#9b59b6', '#5fb3b3', '#ff8fa3'],
    draw: c => `
      <path d="M30 66 Q26 82 30 94 M44 68 Q40 84 46 96 M58 68 Q62 84 56 96 M70 66 Q76 80 72 92" fill="none" stroke="${shade(c, 0.3)}" stroke-width="5" stroke-linecap="round"/>
      <path d="M18 56 Q18 20 50 20 Q82 20 82 56 Q66 64 50 62 Q34 64 18 56 Z" fill="${c}" ${S}/>
      <circle cx="40" cy="42" r="3" fill="#fff"/><circle cx="60" cy="42" r="3" fill="#fff"/>
      <path d="M44 50 Q50 54 56 50" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>`
  },
  {
    id: 'turtle', zone: 'water', canMirror: true, canRotate: false,
    colors: ['#2ecc71', '#6ab04c', '#5fb3b3'],
    draw: c => `
      <path d="M24 58 Q12 54 12 66 Q18 72 28 68 M76 58 Q88 54 88 66 Q82 72 72 68 M32 76 Q26 86 34 88 M68 76 Q74 86 66 88" fill="${shade(c, 0.2)}" ${S}/>
      <circle cx="78" cy="44" r="12" fill="${shade(c, 0.2)}" ${S}/>
      <circle cx="82" cy="41" r="2.5" fill="${O}"/>
      <path d="M18 64 Q18 36 50 36 Q82 36 82 64 Q66 82 50 80 Q34 82 18 64 Z" fill="${c}" ${S}/>
      <path d="M36 44 L44 62 L60 62 L66 44 M44 62 L38 76 M60 62 L64 76" fill="none" ${SN}/>`
  },
  {
    id: 'shell', zone: 'floor', canMirror: false, canRotate: true,
    colors: ['#ff8fa3', '#ffc93c', '#e6cba8', '#cfa0e8'],
    draw: c => `
      <path d="M22 88 Q14 56 50 40 Q86 56 78 88 Q50 96 22 88 Z" fill="${c}" ${S}/>
      <path d="M50 42 L50 90 M34 48 L40 88 M66 48 L60 88" fill="none" ${SN}/>`
  },
  {
    id: 'seaweed', zone: 'floor', canMirror: true, canRotate: false,
    colors: ['#2ecc71', '#6ab04c', '#1e9e6e'],
    draw: c => `
      <path d="M40 96 Q28 78 40 62 Q50 48 40 30 Q36 22 42 14" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/>
      <path d="M40 96 Q28 78 40 62 Q50 48 40 30 Q36 22 42 14" fill="none" stroke="${O}" stroke-width="1.5" opacity="0.35"/>
      <path d="M60 96 Q72 80 62 66 Q54 52 64 40" fill="none" stroke="${shade(c, 0.25)}" stroke-width="8" stroke-linecap="round"/>
      <path d="M60 96 Q72 80 62 66 Q54 52 64 40" fill="none" stroke="${O}" stroke-width="1.5" opacity="0.35"/>`
  },
  {
    id: 'coral', zone: 'floor', canMirror: true, canRotate: false,
    colors: ['#ff8fa3', '#e91e8c', '#ffa62b', '#cfa0e8'],
    draw: c => `
      <path d="M50 96 L50 56 M50 70 Q34 66 32 48 M50 70 Q66 66 68 46 M32 48 Q30 40 34 34 M68 46 Q70 36 64 30 M50 56 Q48 40 54 30" fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round"/>
      <path d="M50 96 L50 56 M50 70 Q34 66 32 48 M50 70 Q66 66 68 46 M32 48 Q30 40 34 34 M68 46 Q70 36 64 30 M50 56 Q48 40 54 30" fill="none" stroke="${O}" stroke-width="2" opacity="0.4"/>`
  },
];

/* ============================== SPACE ============================== */

const spaceObjects = [
  {
    id: 'rocket', zone: 'water', canMirror: false, canRotate: true,
    colors: ['#e74c3c', '#3498db', '#95a5a6', '#e91e8c'],
    draw: c => `
      <path d="M42 78 Q30 84 28 94 Q40 92 46 84 M58 78 Q70 84 72 94 Q60 92 54 84" fill="#ffa62b" ${S}/>
      <path d="M50 6 Q68 22 68 52 L68 74 L32 74 L32 52 Q32 22 50 6 Z" fill="${c}" ${S}/>
      <path d="M32 56 Q20 64 18 78 Q28 76 34 70 M68 56 Q80 64 82 78 Q72 76 66 70" fill="${shade(c, -0.25)}" ${S}/>
      <circle cx="50" cy="40" r="10" fill="#bfe6ff" ${S}/>
      <path d="M38 74 L62 74" stroke="${O}" stroke-width="3"/>
      <path d="M46 84 Q50 96 50 96 Q50 96 54 84 Z" fill="#ffc93c" ${SN}/>`
  },
  {
    id: 'planetring', zone: 'water', canMirror: false, canRotate: false,
    colors: ['#ffa62b', '#5fb3b3', '#cfa0e8', '#f39c12'],
    draw: c => `
      <circle cx="50" cy="50" r="26" fill="${c}" ${S}/>
      <path d="M46 34 Q56 34 60 42 M36 48 Q40 56 52 58" fill="none" stroke="${shade(c, -0.2)}" stroke-width="4" stroke-linecap="round"/>
      <path d="M14 58 Q50 78 86 42" fill="none" stroke="${shade(c, 0.35)}" stroke-width="7" stroke-linecap="round"/>
      <path d="M14 58 Q50 78 86 42" fill="none" stroke="${O}" stroke-width="1.5" opacity="0.5"/>`
  },
  {
    id: 'planetstripe', zone: 'water', canMirror: false, canRotate: false,
    colors: ['#5b7fd4', '#2ecc71', '#e67e22', '#5fb3b3'],
    draw: c => `
      <circle cx="50" cy="50" r="28" fill="${c}" ${S}/>
      <path d="M24 40 Q50 32 76 40 M22 52 Q50 60 78 52 M28 66 Q50 74 72 66" fill="none" stroke="${shade(c, 0.35)}" stroke-width="5" stroke-linecap="round"/>`
  },
  {
    id: 'moon', zone: 'water', canMirror: false, canRotate: false,
    colors: ['#f2e9c9', '#dcdcdc', '#ffe08a'],
    draw: c => `
      <circle cx="50" cy="50" r="27" fill="${c}" ${S}/>
      <circle cx="40" cy="42" r="7" fill="${shade(c, -0.15)}" ${SN}/>
      <circle cx="60" cy="58" r="5" fill="${shade(c, -0.15)}" ${SN}/>
      <circle cx="56" cy="36" r="3.5" fill="${shade(c, -0.15)}" ${SN}/>
      <circle cx="38" cy="62" r="4" fill="${shade(c, -0.15)}" ${SN}/>`
  },
  {
    id: 'star5', zone: 'water', canMirror: false, canRotate: true,
    colors: ['#ffc93c', '#ffe08a', '#ffa62b'],
    draw: c => `
      <path d="M50 12 L60 40 L90 40 L66 58 L74 88 L50 70 L26 88 L34 58 L10 40 L40 40 Z" fill="${c}" ${S}/>
      <circle cx="43" cy="50" r="2.5" fill="${O}"/><circle cx="57" cy="50" r="2.5" fill="${O}"/>
      <path d="M44 60 Q50 64 56 60" fill="none" ${SN}/>`
  },
  {
    id: 'comet', zone: 'water', canMirror: true, canRotate: true,
    colors: ['#ffc93c', '#5fb3b3', '#ff8fa3'],
    draw: c => `
      <path d="M40 46 Q10 30 4 14 Q26 22 46 36 M44 60 Q16 52 4 38 Q24 42 48 50" fill="${shade(c, 0.35)}" ${SN}/>
      <circle cx="62" cy="56" r="22" fill="${c}" ${S}/>
      <circle cx="55" cy="50" r="4" fill="${shade(c, -0.18)}"/>
      <circle cx="68" cy="62" r="5" fill="${shade(c, -0.18)}"/>`
  },
  {
    id: 'astronaut', zone: 'water', canMirror: true, canRotate: true,
    colors: ['#ffffff', '#dff1ff', '#ffd7e8'],
    draw: c => `
      <path d="M30 56 Q18 62 16 74 M70 56 Q82 62 84 74" fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round"/>
      <path d="M30 56 Q18 62 16 74 M70 56 Q82 62 84 74" fill="none" stroke="${O}" stroke-width="2" opacity="0.5"/>
      <path d="M40 84 Q36 94 32 96 M60 84 Q64 94 68 96" fill="none" stroke="${c}" stroke-width="10" stroke-linecap="round"/>
      <path d="M40 84 Q36 94 32 96 M60 84 Q64 94 68 96" fill="none" stroke="${O}" stroke-width="2" opacity="0.5"/>
      <rect x="32" y="44" width="36" height="42" rx="12" fill="${c}" ${S}/>
      <circle cx="50" cy="28" r="20" fill="${c}" ${S}/>
      <path d="M36 26 Q36 14 50 14 Q64 14 64 26 Q64 38 50 38 Q36 38 36 26 Z" fill="#4a6fa5" ${S}/>
      <rect x="42" y="52" width="16" height="12" rx="3" fill="${shade(c, -0.2)}" ${SN}/>`
  },
  {
    id: 'alien', zone: 'water', canMirror: false, canRotate: false,
    colors: ['#2ecc71', '#6ab04c', '#cfa0e8', '#5fb3b3'],
    draw: c => `
      <path d="M34 20 Q28 8 22 6 M66 20 Q72 8 78 6" fill="none" ${S}/>
      <circle cx="22" cy="6" r="4" fill="${c}" ${SN}/><circle cx="78" cy="6" r="4" fill="${c}" ${SN}/>
      <path d="M50 14 Q76 14 76 44 Q76 64 50 64 Q24 64 24 44 Q24 14 50 14 Z" fill="${c}" ${S}/>
      <ellipse cx="38" cy="40" rx="7" ry="10" fill="#2d2a26"/>
      <ellipse cx="62" cy="40" rx="7" ry="10" fill="#2d2a26"/>
      <circle cx="36" cy="36" r="2.5" fill="#fff"/><circle cx="60" cy="36" r="2.5" fill="#fff"/>
      <path d="M44 54 Q50 58 56 54" fill="none" ${SN}/>
      <path d="M38 66 Q36 84 42 94 L58 94 Q64 84 62 66" fill="${shade(c, 0.3)}" ${S}/>`
  },
  {
    id: 'ufo', zone: 'water', canMirror: false, canRotate: true,
    colors: ['#95a5a6', '#5fb3b3', '#cfa0e8', '#5b7fd4'],
    draw: c => `
      <path d="M34 44 Q34 24 50 24 Q66 24 66 44 Z" fill="#bfe6ff" ${S}/>
      <ellipse cx="50" cy="52" rx="40" ry="16" fill="${c}" ${S}/>
      <circle cx="24" cy="52" r="4.5" fill="#ffc93c" ${SN}/>
      <circle cx="50" cy="58" r="4.5" fill="#ffc93c" ${SN}/>
      <circle cx="76" cy="52" r="4.5" fill="#ffc93c" ${SN}/>
      <path d="M36 70 L30 88 M50 72 L50 92 M64 70 L70 88" fill="none" stroke="#ffc93c" stroke-width="4" stroke-dasharray="2 6" stroke-linecap="round"/>`
  },
  {
    id: 'satellite', zone: 'water', canMirror: true, canRotate: true,
    colors: ['#5b7fd4', '#3498db', '#ffa62b'],
    draw: c => `
      <rect x="6" y="38" width="24" height="28" rx="3" fill="${c}" ${S}/>
      <path d="M10 47 L30 47 M10 56 L30 56 M14 38 L14 66 M22 38 L22 66" stroke="${O}" stroke-width="1.5"/>
      <rect x="70" y="38" width="24" height="28" rx="3" fill="${c}" ${S}/>
      <path d="M74 47 L94 47 M74 56 L94 56 M78 38 L78 66 M86 38 L86 66" stroke="${O}" stroke-width="1.5"/>
      <path d="M30 52 L40 52 M60 52 L70 52" ${S}/>
      <rect x="40" y="38" width="20" height="30" rx="5" fill="#dcdcdc" ${S}/>
      <path d="M50 38 L50 24 M50 24 L58 18" fill="none" ${SN}/>
      <circle cx="60" cy="16" r="4" fill="#e74c3c" ${SN}/>`
  },
];

/* ============================== FARM ============================== */

const farmObjects = [
  {
    id: 'cow', zone: 'ground', canMirror: true, canRotate: false,
    colors: ['#ffffff', '#f2e9c9', '#e6cba8'],
    draw: c => `
      <path d="M30 70 L30 94 M44 72 L44 94 M58 72 L58 94 M72 70 L72 94" stroke="${c}" stroke-width="9" stroke-linecap="round"/>
      <path d="M30 70 L30 94 M44 72 L44 94 M58 72 L58 94 M72 70 L72 94" stroke="${O}" stroke-width="2" opacity="0.5"/>
      <rect x="20" y="42" width="62" height="36" rx="15" fill="${c}" ${S}/>
      <path d="M40 46 Q52 44 54 56 Q52 66 42 64 Q34 60 40 46 Z" fill="#3b3b3b" opacity="0.85"/>
      <circle cx="86" cy="42" r="15" fill="${c}" ${S}/>
      <path d="M74 30 Q68 24 70 18 Q78 20 80 28 M96 28 Q100 22 98 16 Q90 18 88 26" fill="${shade(c, -0.12)}" ${SN}/>
      <ellipse cx="88" cy="50" rx="9" ry="6" fill="#ffb6c1" ${SN}/>
      <circle cx="82" cy="38" r="2.5" fill="${O}"/><circle cx="93" cy="38" r="2.5" fill="${O}"/>`
  },
  {
    id: 'pig', zone: 'ground', canMirror: true, canRotate: false,
    colors: ['#ffb6c1', '#ff8fa3', '#ffd7e8'],
    draw: c => `
      <path d="M34 76 L34 94 M64 76 L64 94" stroke="${c}" stroke-width="10" stroke-linecap="round"/>
      <path d="M34 76 L34 94 M64 76 L64 94" stroke="${O}" stroke-width="2" opacity="0.5"/>
      <ellipse cx="50" cy="60" rx="32" ry="24" fill="${c}" ${S}/>
      <path d="M30 42 Q26 30 34 28 Q40 32 38 40 M70 42 Q74 30 66 28 Q60 32 62 40" fill="${shade(c, -0.1)}" ${SN}/>
      <ellipse cx="50" cy="62" rx="11" ry="8" fill="${shade(c, -0.15)}" ${S}/>
      <circle cx="46" cy="62" r="2" fill="${O}"/><circle cx="54" cy="62" r="2" fill="${O}"/>
      <circle cx="38" cy="50" r="2.5" fill="${O}"/><circle cx="62" cy="50" r="2.5" fill="${O}"/>
      <path d="M82 56 Q90 52 88 46" fill="none" ${SN}/>`
  },
  {
    id: 'sheep', zone: 'ground', canMirror: true, canRotate: false,
    colors: ['#ffffff', '#f2e9c9', '#dcdcdc'],
    draw: c => `
      <path d="M36 76 L36 94 M62 76 L62 94" stroke="#4a4a4a" stroke-width="7" stroke-linecap="round"/>
      <circle cx="30" cy="52" r="13" fill="${c}" ${SN}/><circle cx="46" cy="44" r="14" fill="${c}" ${SN}/>
      <circle cx="64" cy="46" r="13" fill="${c}" ${SN}/><circle cx="72" cy="58" r="12" fill="${c}" ${SN}/>
      <circle cx="60" cy="66" r="13" fill="${c}" ${SN}/><circle cx="40" cy="66" r="13" fill="${c}" ${SN}/>
      <circle cx="28" cy="64" r="11" fill="${c}" ${SN}/>
      <ellipse cx="82" cy="42" rx="12" ry="10" fill="#4a4a4a" ${S}/>
      <path d="M72 34 Q68 28 70 24 Q76 26 78 32" fill="#4a4a4a" ${SN}/>
      <circle cx="80" cy="40" r="2" fill="#fff"/><circle cx="88" cy="40" r="2" fill="#fff"/>`
  },
  {
    id: 'hen', zone: 'ground', canMirror: true, canRotate: false,
    colors: ['#ffffff', '#e67e22', '#e6cba8'],
    draw: c => `
      <path d="M44 84 L44 96 M58 84 L58 96 M40 96 L48 96 M54 96 L62 96" fill="none" stroke="#ffa62b" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M28 56 Q28 34 52 36 L52 30 Q52 20 62 20 Q74 20 72 34 L66 40 Q78 46 76 60 Q74 80 50 82 Q28 78 28 56 Z" fill="${c}" ${S}/>
      <path d="M56 16 Q54 8 60 6 Q62 12 62 16 Q66 8 72 8 Q72 16 66 18 Z" fill="#e74c3c" ${SN}/>
      <path d="M72 32 L82 34 L72 40 Z" fill="#ffa62b" ${S}/>
      <circle cx="63" cy="28" r="2.5" fill="${O}"/>
      <path d="M30 58 Q40 62 44 70 Q36 72 30 66" fill="${shade(c, -0.12)}" ${SN}/>
      <path d="M64 44 Q70 48 68 52" fill="#e74c3c" ${SN}/>`
  },
  {
    id: 'chick', zone: 'ground', canMirror: true, canRotate: false,
    colors: ['#ffc93c', '#ffe08a', '#ffa62b'],
    draw: c => `
      <path d="M44 88 L44 97 M56 88 L56 97 M40 97 L48 97 M52 97 L60 97" fill="none" stroke="#e67e22" stroke-width="3" stroke-linecap="round"/>
      <circle cx="50" cy="66" r="24" fill="${c}" ${S}/>
      <circle cx="50" cy="34" r="17" fill="${c}" ${S}/>
      <path d="M65 32 L74 35 L65 40 Z" fill="#e67e22" ${S}/>
      <circle cx="55" cy="30" r="2.5" fill="${O}"/>
      <path d="M30 62 Q22 66 24 74 Q32 76 38 70" fill="${shade(c, -0.1)}" ${SN}/>
      <path d="M44 12 Q46 6 50 8 Q50 12 48 16" fill="none" ${SN}/>`
  },
  {
    id: 'duck', zone: 'ground', canMirror: true, canRotate: false,
    colors: ['#ffc93c', '#ffffff', '#ffe08a'],
    draw: c => `
      <path d="M20 62 Q18 82 44 86 L64 86 Q82 82 82 66 L70 66 Q60 68 58 60 L58 48 Q58 34 44 34 Q30 34 30 48 Q30 56 36 60 Q26 58 20 62 Z" fill="${c}" ${S}/>
      <path d="M30 44 L18 48 L30 52 Z" fill="#e67e22" ${S}/>
      <circle cx="40" cy="44" r="2.5" fill="${O}"/>
      <path d="M48 70 Q58 74 64 70 Q60 80 48 78 Z" fill="${shade(c, -0.12)}" ${SN}/>
      <path d="M14 86 Q30 92 50 92 Q70 92 86 86" fill="none" stroke="#5fb3b3" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`
  },
  {
    id: 'tractor', zone: 'ground', canMirror: true, canRotate: false,
    colors: ['#e74c3c', '#2ecc71', '#3498db', '#ffa62b'],
    draw: c => `
      <rect x="52" y="26" width="28" height="26" rx="3" fill="${shade(c, 0.3)}" ${S}/>
      <rect x="58" y="32" width="16" height="14" rx="2" fill="#bfe6ff" ${SN}/>
      <path d="M14 56 L14 44 L40 44 L46 26 L58 26 L58 56 L84 56 L84 72 L10 72 Z" fill="${c}" ${S}/>
      <circle cx="28" cy="74" r="17" fill="#3b3b3b" ${S}/>
      <circle cx="28" cy="74" r="8" fill="#95a5a6" ${SN}/>
      <circle cx="74" cy="80" r="12" fill="#3b3b3b" ${S}/>
      <circle cx="74" cy="80" r="5" fill="#95a5a6" ${SN}/>
      <path d="M20 44 L20 34 L26 34 L26 44" fill="${O}"/>`
  },
  {
    id: 'haybale', zone: 'ground', canMirror: false, canRotate: false,
    colors: ['#ffe08a', '#e6cba8', '#ffc93c'],
    draw: c => `
      <circle cx="50" cy="60" r="34" fill="${c}" ${S}/>
      <circle cx="50" cy="60" r="22" fill="none" stroke="${shade(c, -0.25)}" stroke-width="3.5"/>
      <circle cx="50" cy="60" r="11" fill="none" stroke="${shade(c, -0.25)}" stroke-width="3.5"/>
      <path d="M50 26 Q56 24 58 20 M78 44 Q84 42 86 38 M76 78 Q82 80 84 84" fill="none" stroke="${shade(c, -0.3)}" stroke-width="3" stroke-linecap="round"/>`
  },
  {
    id: 'appletree', zone: 'ground', canMirror: false, canRotate: false,
    colors: ['#6ab04c', '#4c9a3c', '#2e8b57'],
    draw: c => `
      <path d="M45 62 L45 96 L55 96 L55 62 Z" fill="#8d6437" ${S}/>
      <path d="M50 62 Q40 54 34 56 M50 68 Q60 60 66 62" fill="none" stroke="#8d6437" stroke-width="4"/>
      <ellipse cx="50" cy="36" rx="32" ry="26" fill="${c}" ${S}/>
      <circle cx="36" cy="30" r="5" fill="#e74c3c" ${SN}/>
      <circle cx="58" cy="24" r="5" fill="#e74c3c" ${SN}/>
      <circle cx="64" cy="44" r="5" fill="#e74c3c" ${SN}/>
      <circle cx="44" cy="46" r="5" fill="#e74c3c" ${SN}/>`
  },
  {
    id: 'scarecrow', zone: 'ground', canMirror: false, canRotate: false,
    colors: ['#e67e22', '#c0392b', '#5b7fd4'],
    draw: c => `
      <path d="M50 46 L50 96" stroke="#8d6437" stroke-width="6" stroke-linecap="round"/>
      <path d="M22 54 L78 54" stroke="#8d6437" stroke-width="5" stroke-linecap="round"/>
      <path d="M38 46 L62 46 L66 74 L34 74 Z" fill="${c}" ${S}/>
      <path d="M38 54 L24 60 M62 54 L76 60" fill="none" stroke="${c}" stroke-width="8" stroke-linecap="round"/>
      <circle cx="50" cy="32" r="14" fill="#ffe08a" ${S}/>
      <path d="M30 24 L70 24 L64 14 L36 14 Z" fill="${shade(c, -0.25)}" ${S}/>
      <circle cx="45" cy="30" r="2" fill="${O}"/><circle cx="55" cy="30" r="2" fill="${O}"/>
      <path d="M46 37 Q50 40 54 37" fill="none" ${SN}/>`
  },
  {
    id: 'windmill', zone: 'ground', canMirror: false, canRotate: false,
    colors: ['#e6cba8', '#dcdcdc', '#ffd7e8'],
    draw: c => `
      <path d="M40 40 L60 40 L66 96 L34 96 Z" fill="${c}" ${S}/>
      <path d="M30 30 L50 10 L70 30 Z" fill="${shade(c, -0.3)}" ${S}/>
      <path d="M50 38 L50 16 M50 38 L72 38 M50 38 L50 60 M50 38 L28 38" stroke="#8d6437" stroke-width="4"/>
      <path d="M50 16 L62 20 L50 26 Z M72 38 L68 50 L62 38 Z M50 60 L38 56 L50 50 Z M28 38 L32 26 L38 38 Z" fill="#8d6437" ${SN}/>
      <circle cx="50" cy="38" r="4" fill="#c0392b" ${SN}/>
      <rect x="45" y="76" width="10" height="20" rx="2" fill="#8d6437" ${SN}/>`
  },
];

/* ============================== CHRISTMAS ============================== */

const christmasObjects = [
  {
    id: 'xmastree', zone: 'ground', canMirror: false, canRotate: false,
    colors: ['#e74c3c', '#ffc93c', '#3498db', '#e91e8c'],
    draw: c => `
      <rect x="44" y="82" width="12" height="14" fill="#8d6437" ${S}/>
      <path d="M50 8 L72 38 L60 38 L78 62 L64 62 L84 86 L16 86 L36 62 L22 62 L40 38 L28 38 Z" fill="#2e7d4f" ${S}/>
      <path d="M43 4 L50 10 L57 4 L55 13 L50 16 L45 13 Z" fill="#ffc93c" ${S}/>
      <circle cx="44" cy="46" r="4.5" fill="${c}" ${SN}/>
      <circle cx="58" cy="58" r="4.5" fill="${c}" ${SN}/>
      <circle cx="36" cy="72" r="4.5" fill="${c}" ${SN}/>
      <circle cx="62" cy="76" r="4.5" fill="${c}" ${SN}/>`
  },
  {
    id: 'snowman', zone: 'ground', canMirror: true, canRotate: false,
    colors: ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6'],
    draw: c => `
      <circle cx="50" cy="74" r="23" fill="#ffffff" ${S}/>
      <circle cx="50" cy="40" r="16" fill="#ffffff" ${S}/>
      <path d="M36 22 L64 22 L62 14 L38 14 Z M42 14 L58 14 L58 4 L42 4 Z" fill="#3b3b3b" ${S}/>
      <path d="M34 52 Q50 62 66 52 L66 46 Q50 56 34 46 Z" fill="${c}" ${S}/>
      <path d="M58 54 L62 66 L54 66 Z" fill="${c}" ${SN}/>
      <circle cx="44" cy="38" r="2.2" fill="${O}"/><circle cx="56" cy="38" r="2.2" fill="${O}"/>
      <path d="M50 42 L60 45 L50 47 Z" fill="#ff8c1a" ${SN}/>
      <circle cx="50" cy="70" r="2.2" fill="${O}"/><circle cx="50" cy="80" r="2.2" fill="${O}"/>`
  },
  {
    id: 'gift', zone: 'ground', canMirror: false, canRotate: false,
    colors: ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#ffc93c'],
    draw: c => `
      <rect x="20" y="46" width="60" height="50" rx="4" fill="${c}" ${S}/>
      <rect x="16" y="34" width="68" height="16" rx="4" fill="${shade(c, 0.25)}" ${S}/>
      <rect x="44" y="34" width="12" height="62" fill="${shade(c, 0.55)}" ${SN}/>
      <path d="M50 34 Q34 30 36 18 Q46 16 50 30 Q54 16 64 18 Q66 30 50 34 Z" fill="${shade(c, 0.55)}" ${S}/>`
  },
  {
    id: 'candycane', zone: 'ground', canMirror: true, canRotate: true,
    colors: ['#e74c3c', '#2ecc71', '#e91e8c'],
    draw: c => `
      <path d="M36 96 L36 34 Q36 12 56 12 Q74 12 74 30 L62 30 Q62 24 56 24 Q48 24 48 34 L48 96 Z" fill="#ffffff" ${S}/>
      <path d="M36 44 L48 40 M36 60 L48 56 M36 76 L48 72 M38 26 Q42 20 48 24 M58 12 Q64 14 66 20" stroke="${c}" stroke-width="7" fill="none"/>
      <path d="M36 96 L36 34 Q36 12 56 12 Q74 12 74 30 L62 30 Q62 24 56 24 Q48 24 48 34 L48 96 Z" fill="none" ${S}/>`
  },
  {
    id: 'stocking', zone: 'ground', canMirror: true, canRotate: false,
    colors: ['#e74c3c', '#2ecc71', '#3498db', '#9b59b6'],
    draw: c => `
      <path d="M34 26 L66 26 L66 62 Q66 70 74 74 Q86 80 82 90 Q76 98 64 94 Q52 88 48 76 L44 62 Q34 50 34 26 Z" fill="${c}" ${S}/>
      <rect x="30" y="12" width="40" height="18" rx="6" fill="#ffffff" ${S}/>
      <circle cx="58" cy="46" r="5" fill="#ffffff" ${SN}/>`
  },
  {
    id: 'bell', zone: 'ground', canMirror: false, canRotate: true,
    colors: ['#e74c3c', '#2ecc71', '#9b59b6'],
    draw: c => `
      <path d="M40 18 Q40 8 50 8 Q60 8 60 18" fill="none" ${S}/>
      <path d="M26 74 Q26 66 32 62 Q36 38 50 24 Q64 38 68 62 Q74 66 74 74 Z" fill="#ffc93c" ${S}/>
      <circle cx="50" cy="82" r="8" fill="#ffc93c" ${S}/>
      <path d="M38 22 Q50 14 62 22 L58 34 Q50 28 42 34 Z" fill="${c}" ${S}/>`
  },
  {
    id: 'gingerbread', zone: 'ground', canMirror: false, canRotate: false,
    colors: ['#e74c3c', '#2ecc71', '#3498db'],
    draw: c => `
      <circle cx="50" cy="26" r="16" fill="#b5713a" ${S}/>
      <path d="M38 40 L62 40 L70 52 Q76 58 70 62 Q64 64 60 56 L58 60 L64 88 Q64 94 56 94 L50 78 L44 94 Q36 94 36 88 L42 60 L40 56 Q36 64 30 62 Q24 58 30 52 Z" fill="#b5713a" ${S}/>
      <circle cx="44" cy="24" r="2.2" fill="${O}"/><circle cx="56" cy="24" r="2.2" fill="${O}"/>
      <path d="M43 31 Q50 36 57 31" fill="none" ${SN}/>
      <circle cx="50" cy="50" r="3" fill="${c}" ${SN}/>
      <circle cx="50" cy="62" r="3" fill="${c}" ${SN}/>
      <path d="M36 42 Q50 48 64 42" fill="none" stroke="#ffffff" stroke-width="3"/>`
  },
  {
    id: 'reindeer', zone: 'ground', canMirror: true, canRotate: false,
    colors: ['#a9713d', '#8d6437', '#c98d55'],
    draw: c => `
      <path d="M34 74 L34 94 M62 74 L62 94" stroke="${c}" stroke-width="9" stroke-linecap="round"/>
      <path d="M34 74 L34 94 M62 74 L62 94" stroke="${O}" stroke-width="2" opacity="0.5"/>
      <ellipse cx="48" cy="64" rx="26" ry="17" fill="${c}" ${S}/>
      <circle cx="74" cy="42" r="13" fill="${c}" ${S}/>
      <path d="M66 30 Q60 20 64 12 M66 30 Q56 26 52 18 M80 30 Q84 18 92 16 M80 30 Q88 26 92 30" fill="none" stroke="#7a5230" stroke-width="4" stroke-linecap="round"/>
      <circle cx="84" cy="46" r="6" fill="#e74c3c" ${SN}/>
      <circle cx="72" cy="38" r="2.5" fill="${O}"/>
      <ellipse cx="26" cy="60" rx="7" ry="9" fill="${shade(c, 0.35)}" ${SN}/>`
  },
  {
    id: 'wreath', zone: 'air', canMirror: false, canRotate: false,
    colors: ['#e74c3c', '#ffc93c', '#9b59b6'],
    draw: c => `
      <circle cx="50" cy="52" r="30" fill="none" stroke="#2e7d4f" stroke-width="16"/>
      <circle cx="50" cy="52" r="30" fill="none" stroke="${O}" stroke-width="2" opacity="0.3"/>
      <circle cx="30" cy="40" r="4" fill="${c}" ${SN}/>
      <circle cx="66" cy="34" r="4" fill="${c}" ${SN}/>
      <circle cx="72" cy="64" r="4" fill="${c}" ${SN}/>
      <circle cx="34" cy="72" r="4" fill="${c}" ${SN}/>
      <path d="M50 18 L42 8 L50 12 L58 8 Z M46 18 L54 18 L50 26 Z" fill="#e74c3c" ${SN}/>`
  },
  {
    id: 'ornament', zone: 'air', canMirror: false, canRotate: false,
    colors: ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#ffc93c'],
    draw: c => `
      <path d="M50 2 L50 14" stroke="${O}" stroke-width="2.5"/>
      <rect x="43" y="14" width="14" height="10" rx="3" fill="#c9a227" ${SN}/>
      <circle cx="50" cy="58" r="34" fill="${c}" ${S}/>
      <path d="M18 52 Q34 42 50 52 Q66 62 82 52" fill="none" stroke="${shade(c, 0.45)}" stroke-width="5"/>
      <circle cx="38" cy="42" r="6" fill="#ffffff" opacity="0.5"/>`
  },
  {
    id: 'snowflake', zone: 'air', canMirror: false, canRotate: false,
    colors: ['#7fb8e6', '#a5cdee', '#5b9fd4'],
    draw: c => `
      ${[0, 60, 120].map(a => `<path d="M50 10 L50 90 M50 22 L40 12 M50 22 L60 12 M50 78 L40 88 M50 78 L60 88" stroke="${c}" stroke-width="6" stroke-linecap="round" fill="none" transform="rotate(${a} 50 50)"/>`).join('')}
      <circle cx="50" cy="50" r="7" fill="${c}" ${SN}/>`
  },
  {
    id: 'robin', zone: 'air', canMirror: true, canRotate: false,
    colors: ['#8d6437', '#7a5230'],
    draw: c => `
      <ellipse cx="46" cy="58" rx="24" ry="19" fill="${c}" ${S}/>
      <circle cx="70" cy="44" r="13" fill="${c}" ${S}/>
      <path d="M60 52 Q66 62 58 68 Q50 70 48 62 Z" fill="#e8552d" ${SN}/>
      <path d="M82 42 L93 45 L82 50 Z" fill="#ffc93c" ${S}/>
      <path d="M40 52 Q24 48 20 58 Q30 64 44 60 Z" fill="${shade(c, 0.3)}" ${S}/>
      <circle cx="73" cy="41" r="2.5" fill="${O}"/>
      <path d="M40 76 L40 90 M52 76 L52 90" fill="none" ${S}/>`
  },
];

/* ============================== HALLOWEEN ============================== */

const halloweenObjects = [
  {
    id: 'pumpkin', zone: 'ground', canMirror: false, canRotate: false,
    colors: ['#ff8c1a', '#ffc93c', '#9b59b6', '#2ecc71'],
    draw: c => `
      <path d="M48 22 Q46 12 54 8 L58 14 Q52 16 54 24 Z" fill="#4c7a3a" ${SN}/>
      <ellipse cx="50" cy="62" rx="36" ry="32" fill="${c}" ${S}/>
      <ellipse cx="50" cy="62" rx="16" ry="32" fill="none" ${SN}/>
      <path d="M34 34 Q26 48 26 62 Q26 76 34 90 M66 34 Q74 48 74 62 Q74 76 66 90" fill="none" ${SN}/>
      <path d="M34 54 L44 62 L34 66 Z M66 54 L56 62 L66 66 Z" fill="${O}"/>
      <path d="M36 76 L44 70 L48 76 L54 70 L58 76 L64 70 L64 80 Q50 88 36 80 Z" fill="${O}"/>`
  },
  {
    id: 'ghost', zone: 'air', canMirror: true, canRotate: false,
    colors: ['#ffffff', '#dff1ff', '#e8dcf5'],
    draw: c => `
      <path d="M22 92 Q18 40 50 30 Q82 40 78 92 Q72 84 66 92 Q60 84 54 92 Q48 84 42 92 Q36 84 30 92 Q26 84 22 92 Z" fill="${c}" ${S}/>
      <ellipse cx="40" cy="56" rx="5" ry="8" fill="${O}"/>
      <ellipse cx="60" cy="56" rx="5" ry="8" fill="${O}"/>
      <ellipse cx="50" cy="72" rx="6" ry="8" fill="${O}"/>`
  },
  {
    id: 'bat', zone: 'air', canMirror: false, canRotate: true,
    colors: ['#4a4458', '#3b3b4d'],
    draw: c => `
      <path d="M44 50 Q20 30 6 40 Q16 44 16 54 Q28 48 34 56 Q40 50 46 56 Z" fill="${c}" ${S}/>
      <path d="M56 50 Q80 30 94 40 Q84 44 84 54 Q72 48 66 56 Q60 50 54 56 Z" fill="${c}" ${S}/>
      <ellipse cx="50" cy="58" rx="14" ry="16" fill="${c}" ${S}/>
      <path d="M42 46 L46 38 L48 46 M58 46 L54 38 L52 46" fill="${c}" ${SN}/>
      <circle cx="45" cy="56" r="2.5" fill="#ffc93c"/><circle cx="55" cy="56" r="2.5" fill="#ffc93c"/>
      <path d="M46 66 Q50 69 54 66" fill="none" stroke="#ffffff" stroke-width="2"/>`
  },
  {
    id: 'witchhat', zone: 'ground', canMirror: true, canRotate: true,
    colors: ['#9b59b6', '#e8552d', '#2ecc71', '#ffc93c'],
    draw: c => `
      <ellipse cx="50" cy="82" rx="38" ry="12" fill="#4a3b5c" ${S}/>
      <path d="M26 80 Q40 30 66 8 Q60 40 74 78 Q50 90 26 80 Z" fill="#4a3b5c" ${S}/>
      <path d="M30 72 Q52 82 72 70 L74 78 Q50 90 27 78 Z" fill="${c}" ${S}/>
      <rect x="46" y="66" width="11" height="11" rx="2" fill="#ffc93c" ${SN}/>`
  },
  {
    id: 'spider', zone: 'air', canMirror: false, canRotate: false,
    colors: ['#3b3b4d', '#4a4458'],
    draw: c => `
      <path d="M50 0 L50 34" stroke="${O}" stroke-width="2.5"/>
      <path d="M36 52 Q20 46 12 34 M36 60 Q18 60 8 52 M36 68 Q22 72 16 84 M64 52 Q80 46 88 34 M64 60 Q82 60 92 52 M64 68 Q78 72 84 84" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>
      <circle cx="50" cy="62" r="20" fill="${c}" ${S}/>
      <circle cx="50" cy="38" r="11" fill="${c}" ${S}/>
      <circle cx="46" cy="36" r="2.5" fill="#ffc93c"/><circle cx="54" cy="36" r="2.5" fill="#ffc93c"/>`
  },
  {
    id: 'cauldron', zone: 'ground', canMirror: false, canRotate: false,
    colors: ['#2ecc71', '#9b59b6', '#e8552d'],
    draw: c => `
      <circle cx="34" cy="26" r="6" fill="${c}" ${SN}/>
      <circle cx="56" cy="18" r="4.5" fill="${c}" ${SN}/>
      <circle cx="68" cy="28" r="5" fill="${c}" ${SN}/>
      <path d="M22 40 Q50 30 78 40 Q80 44 76 46 Q50 38 24 46 Q20 44 22 40 Z" fill="${shade(c, -0.1)}" ${S}/>
      <path d="M24 46 Q16 78 40 90 L60 90 Q84 78 76 46 Q50 38 24 46 Z" fill="#4a4458" ${S}/>
      <path d="M30 90 L26 97 M70 90 L74 97" ${S}/>
      <path d="M30 42 Q50 36 72 43" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`
  },
  {
    id: 'candycorn', zone: 'ground', canMirror: false, canRotate: true,
    colors: ['#ff8c1a', '#ffc93c'],
    draw: c => `
      <path d="M50 8 Q58 8 60 20 L70 72 Q72 88 50 92 Q28 88 30 72 L40 20 Q42 8 50 8 Z" fill="#ffffff" ${S}/>
      <path d="M36 42 L64 42 L70 72 Q72 88 50 92 Q28 88 30 72 Z" fill="${c}" ${SN}/>
      <path d="M33 58 L67 58 L70 72 Q72 88 50 92 Q28 88 30 72 Z" fill="#ffe08a" ${SN}/>
      <path d="M50 8 Q58 8 60 20 L70 72 Q72 88 50 92 Q28 88 30 72 L40 20 Q42 8 50 8 Z" fill="none" ${S}/>`
  },
  {
    id: 'blackcat', zone: 'ground', canMirror: true, canRotate: false,
    colors: ['#3b3b4d', '#4a4458'],
    draw: c => `
      <path d="M74 60 Q88 58 86 44 Q94 46 92 58 Q90 70 76 70 Z" fill="${c}" ${S}/>
      <ellipse cx="52" cy="76" rx="26" ry="20" fill="${c}" ${S}/>
      <circle cx="42" cy="42" r="17" fill="${c}" ${S}/>
      <path d="M28 32 L26 14 L38 24 M56 32 L58 14 L46 24" fill="${c}" ${S}/>
      <circle cx="36" cy="40" r="3" fill="#ffc93c"/><circle cx="48" cy="40" r="3" fill="#ffc93c"/>
      <path d="M38 48 Q42 51 46 48" fill="none" stroke="#ffffff" stroke-width="2"/>
      <path d="M24 44 L12 42 M24 48 L13 50" stroke="#ffffff" stroke-width="1.8"/>`
  },
  {
    id: 'owl', zone: 'ground', canMirror: false, canRotate: false,
    colors: ['#8d6437', '#a9713d', '#7f8fa6'],
    draw: c => `
      <ellipse cx="50" cy="60" rx="28" ry="34" fill="${c}" ${S}/>
      <path d="M26 34 L34 20 L42 32 M74 34 L66 20 L58 32" fill="${c}" ${S}/>
      <circle cx="40" cy="46" r="11" fill="#ffffff" ${SN}/>
      <circle cx="60" cy="46" r="11" fill="#ffffff" ${SN}/>
      <circle cx="40" cy="46" r="4.5" fill="${O}"/><circle cx="60" cy="46" r="4.5" fill="${O}"/>
      <path d="M50 52 L44 60 L56 60 Z" fill="#ffc93c" ${SN}/>
      <path d="M36 68 Q42 76 50 70 Q58 76 64 68" fill="none" ${SN}/>
      <path d="M42 92 L42 96 M50 92 L50 97 M58 92 L58 96" ${S}/>`
  },
  {
    id: 'tombstone', zone: 'ground', canMirror: false, canRotate: false,
    colors: ['#95a5a6', '#7f8fa6', '#b8b8c4'],
    draw: c => `
      <path d="M26 96 L26 40 Q26 16 50 16 Q74 16 74 40 L74 96 Z" fill="${c}" ${S}/>
      <path d="M40 40 L60 40 M50 30 L50 52" stroke="${shade(c, -0.35)}" stroke-width="5" stroke-linecap="round"/>
      <path d="M36 64 L64 64 M38 74 L62 74" stroke="${shade(c, -0.25)}" stroke-width="3" stroke-linecap="round"/>
      <path d="M20 96 Q24 86 30 92 Q34 84 40 92" fill="#4c7a3a" ${SN}/>`
  },
  {
    id: 'spookytree', zone: 'ground', canMirror: true, canRotate: false,
    colors: ['#4a3b5c', '#3b3b4d'],
    draw: c => `
      <path d="M46 96 L46 56 Q46 40 34 34 Q26 30 26 20 M46 60 Q46 44 60 38 Q70 34 70 22 M46 70 Q40 62 30 62 M46 52 Q56 50 62 54" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/>
      <path d="M54 96 L54 56 Q54 44 62 40" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round"/>
      <path d="M40 96 L60 96 L58 90 L42 90 Z" fill="${c}" ${SN}/>`
  },
  {
    id: 'moonpop', zone: 'air', canMirror: true, canRotate: false,
    colors: ['#ffe08a', '#ffd24d'],
    draw: c => `
      <path d="M62 10 Q34 18 34 50 Q34 82 62 90 Q44 94 30 84 Q12 70 12 50 Q12 30 30 16 Q44 6 62 10 Z" fill="${c}" ${S}/>
      <circle cx="30" cy="38" r="4" fill="${shade(c, -0.15)}" ${SN}/>
      <circle cx="26" cy="60" r="5" fill="${shade(c, -0.15)}" ${SN}/>`
  },
];

/* ============================== BACKGROUNDS ============================== */
// Each returns static SVG for a 1000x700 canvas. rng keeps clouds/stars varied per puzzle
// but identical between the two images (same scene data).

function cloud(x, y, s, o = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})" opacity="${o}">
    <path d="M0 20 Q0 4 16 4 Q22 -8 36 -4 Q48 -10 54 2 Q68 2 68 14 Q68 24 56 24 L10 24 Q0 24 0 20 Z" fill="#ffffff" stroke="#d8e6f0" stroke-width="2"/>
  </g>`;
}

const backgrounds = {
  garden: (rng) => {
    const clouds = [];
    const n = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) clouds.push(cloud(60 + rng() * 760, 30 + rng() * 80, 0.9 + rng() * 0.7));
    return `
      <rect x="0" y="0" width="1000" height="700" fill="#cdeafd"/>
      <circle cx="${880 + rng() * 60}" cy="70" r="46" fill="#ffdf6b" stroke="#f4b942" stroke-width="4"/>
      ${clouds.join('')}
      <path d="M0 300 Q250 260 500 300 Q750 340 1000 290 L1000 700 L0 700 Z" fill="#b8dd8f"/>
      <path d="M0 380 Q300 340 620 385 Q820 410 1000 375 L1000 700 L0 700 Z" fill="#9fd07a"/>
      <path d="M0 480 Q350 440 1000 480 L1000 700 L0 700 Z" fill="#8bc46a"/>`;
  },
  ocean: (rng) => {
    const bubbles = [];
    const n = 4 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const x = 40 + rng() * 920, y = 60 + rng() * 300, r = 4 + rng() * 7;
      bubbles.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#bfe9f7" stroke-width="2.5" opacity="0.8"/>`);
    }
    return `
      <rect x="0" y="0" width="1000" height="700" fill="#7fd0ea"/>
      <rect x="0" y="200" width="1000" height="500" fill="#5cbede"/>
      <path d="M0 200 Q125 180 250 200 Q375 220 500 200 Q625 180 750 200 Q875 220 1000 200 L1000 210 Q875 230 750 210 Q625 190 500 210 Q375 230 250 210 Q125 190 0 210 Z" fill="#a5e2f2" opacity="0.7"/>
      ${bubbles.join('')}
      <path d="M0 560 Q250 520 500 555 Q750 590 1000 550 L1000 700 L0 700 Z" fill="#f2dfa9"/>
      <path d="M0 630 Q300 600 1000 635 L1000 700 L0 700 Z" fill="#e8cf8e"/>`;
  },
  space: (rng) => {
    const stars = [];
    const n = 26 + Math.floor(rng() * 10);
    for (let i = 0; i < n; i++) {
      const x = 15 + rng() * 970, y = 15 + rng() * 560, r = 1.5 + rng() * 2.2;
      stars.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff8d9" opacity="${0.6 + rng() * 0.4}"/>`);
    }
    return `
      <rect x="0" y="0" width="1000" height="700" fill="#1f2a5c"/>
      <rect x="0" y="0" width="1000" height="350" fill="#25336e" opacity="0.6"/>
      ${stars.join('')}
      <path d="M0 640 Q250 590 500 625 Q750 660 1000 615 L1000 700 L0 700 Z" fill="#5f5f9c"/>
      <path d="M0 700 Q300 640 1000 670 L1000 700 Z" fill="#4d4d85"/>
      <circle cx="150" cy="655" r="14" fill="#4d4d85" stroke="#3c3c6e" stroke-width="3"/>
      <circle cx="820" cy="668" r="18" fill="#4d4d85" stroke="#3c3c6e" stroke-width="3"/>`;
  },
  farm: (rng) => {
    const clouds = [];
    const n = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) clouds.push(cloud(80 + rng() * 720, 30 + rng() * 70, 0.9 + rng() * 0.6));
    const posts = [];
    for (let x = 30; x <= 970; x += 94) {
      posts.push(`<rect x="${x - 5}" y="300" width="10" height="52" rx="2" fill="#b98a56" stroke="#8d6437" stroke-width="2"/>`);
    }
    return `
      <rect x="0" y="0" width="1000" height="700" fill="#cdeafd"/>
      <circle cx="${100 + rng() * 60}" cy="72" r="42" fill="#ffdf6b" stroke="#f4b942" stroke-width="4"/>
      ${clouds.join('')}
      <path d="M0 290 Q250 255 500 290 Q750 325 1000 285 L1000 700 L0 700 Z" fill="#cfe09a"/>
      ${posts.join('')}
      <rect x="0" y="312" width="1000" height="8" rx="4" fill="#b98a56" stroke="#8d6437" stroke-width="2"/>
      <rect x="0" y="334" width="1000" height="8" rx="4" fill="#b98a56" stroke="#8d6437" stroke-width="2"/>
      <path d="M0 430 Q300 395 640 432 Q840 452 1000 425 L1000 700 L0 700 Z" fill="#b3d383"/>
      <path d="M0 540 Q350 505 1000 540 L1000 700 L0 700 Z" fill="#9cc46e"/>`;
  },
  christmas: (rng) => {
    const flakes = [];
    const n = 18 + Math.floor(rng() * 8);
    for (let i = 0; i < n; i++) {
      const x = 15 + rng() * 970, y = 15 + rng() * 420, r = 2 + rng() * 3;
      flakes.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" opacity="${0.65 + rng() * 0.35}"/>`);
    }
    return `
      <rect x="0" y="0" width="1000" height="700" fill="#cfdff0"/>
      <rect x="0" y="0" width="1000" height="260" fill="#c2d4ea"/>
      ${flakes.join('')}
      <path d="M0 330 Q250 290 500 330 Q750 370 1000 320 L1000 700 L0 700 Z" fill="#eef4fb"/>
      <path d="M0 440 Q300 400 640 445 Q840 465 1000 435 L1000 700 L0 700 Z" fill="#f7fafd"/>
      <path d="M0 560 Q350 525 1000 560 L1000 700 L0 700 Z" fill="#ffffff"/>
      <path d="M60 330 Q100 340 140 330 M760 350 Q820 362 880 350" fill="none" stroke="#d8e4f2" stroke-width="5" stroke-linecap="round"/>`;
  },
  halloween: (rng) => {
    const stars = [];
    const n = 14 + Math.floor(rng() * 8);
    for (let i = 0; i < n; i++) {
      const x = 15 + rng() * 970, y = 15 + rng() * 300, r = 1.5 + rng() * 2;
      stars.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="#f5e9c9" opacity="${0.5 + rng() * 0.5}"/>`);
    }
    const posts = [];
    for (let x = 40; x <= 960; x += 110) {
      posts.push(`<path d="M${x} 402 L${x} 470" stroke="#3f3654" stroke-width="9" stroke-linecap="round"/>`);
    }
    return `
      <rect x="0" y="0" width="1000" height="700" fill="#584a75"/>
      <rect x="0" y="0" width="1000" height="330" fill="#4c3f66"/>
      ${stars.join('')}
      <path d="M0 400 Q250 370 500 400 Q750 430 1000 395 L1000 700 L0 700 Z" fill="#6e5f8c"/>
      ${posts.join('')}
      <path d="M0 424 L1000 424" stroke="#3f3654" stroke-width="8"/>
      <path d="M0 500 Q300 470 640 502 Q840 520 1000 495 L1000 700 L0 700 Z" fill="#7d6da0"/>
      <path d="M0 610 Q350 580 1000 612 L1000 700 L0 700 Z" fill="#8b7bb0"/>`;
  },
};

/* ============================== EXPORT ============================== */

export const THEMES = {
  garden: { id: 'garden', label: 'Garden', emoji: '🌷', objects: gardenObjects, background: backgrounds.garden,
            zones: { ground: [0.42, 0.94], air: [0.10, 0.36] } },
  ocean:  { id: 'ocean', label: 'Ocean', emoji: '🐠', objects: oceanObjects, background: backgrounds.ocean,
            zones: { water: [0.12, 0.70], floor: [0.76, 0.94] } },
  space:  { id: 'space', label: 'Space', emoji: '🚀', objects: spaceObjects, background: backgrounds.space,
            zones: { water: [0.08, 0.86] } },
  farm:   { id: 'farm', label: 'Farm', emoji: '🐮', objects: farmObjects, background: backgrounds.farm,
            zones: { ground: [0.50, 0.94], air: [0.08, 0.30] } },
  christmas: { id: 'christmas', label: 'Christmas', emoji: '🎄', objects: christmasObjects, background: backgrounds.christmas,
            zones: { ground: [0.48, 0.94], air: [0.08, 0.34] } },
  halloween: { id: 'halloween', label: 'Halloween', emoji: '🎃', objects: halloweenObjects, background: backgrounds.halloween,
            zones: { ground: [0.60, 0.94], air: [0.06, 0.42] } },
};

export { shade };
