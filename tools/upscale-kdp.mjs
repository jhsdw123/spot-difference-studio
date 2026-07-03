// KDP print pipeline step 1: upscale library pairs 1024 -> 4096 with Real-ESRGAN (anime model).
// Output: tools/kdp-hd/<id>_{a,b}.jpg (quality 95, visually lossless for print).
// Usage: node upscale-kdp.mjs [--style toon|photo] [--ids id1,id2] [--force]
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';

const args = process.argv.slice(2);
const getArg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const styleFilter = getArg('--style') || 'toon';
const idsFilter = getArg('--ids')?.split(',');
const force = args.includes('--force');

const root = resolve(import.meta.dirname);
const exe = join(root, 'bin/realesrgan/realesrgan-ncnn-vulkan.exe');
const libImg = join(root, '../library/img');
const outDir = join(root, 'kdp-hd');
const tmpDir = join(root, 'kdp-tmp');
mkdirSync(outDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

const manifest = JSON.parse(readFileSync(join(root, '../library/manifest.json'), 'utf8'));
const targets = manifest.filter(e =>
  (idsFilter ? idsFilter.includes(e.id) : (e.style || 'photo') === styleFilter));
console.log(`upscaling ${targets.length} pairs (style=${idsFilter ? 'ids' : styleFilter})`);

let done = 0, skipped = 0;
for (const e of targets) {
  for (const side of ['a', 'b']) {
    const out = join(outDir, `${e.id}_${side}.jpg`);
    if (!force && existsSync(out)) { skipped++; continue; }
    const srcPng = join(tmpDir, 'in.png');
    const upPng = join(tmpDir, 'up.png');
    await sharp(join(libImg, `${e.id}_${side}.webp`)).png().toFile(srcPng);
    execFileSync(exe, ['-i', srcPng, '-o', upPng, '-n', 'realesrgan-x4plus-anime', '-s', '4'], { stdio: 'pipe' });
    await sharp(upPng).jpeg({ quality: 95 }).toFile(out);
    done++;
  }
  process.stdout.write(`\r${done + skipped}/${targets.length * 2} images`);
}
rmSync(tmpDir, { recursive: true, force: true });
console.log(`\ndone: ${done} upscaled, ${skipped} already existed -> ${outDir}`);
