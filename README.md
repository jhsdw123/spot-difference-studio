# Spot the Difference Studio

Free online generator for printable spot-the-difference puzzles with answer keys.
100% client-side — no server, no signup. Puzzles are procedurally generated SVG scenes,
so every puzzle is unique, reproducible by number, and crisp at print resolution.

**Live site:** https://jhsdw123.github.io/spot-difference-studio/

## Features
- 6 themes (Garden, Ocean, Space, Farm, Christmas, Halloween), ~70 hand-drawn SVG objects
- 3 difficulty levels, 3–15 differences per puzzle
- Print-ready PDF export (A4 / US Letter) with a separate answer key page
- Ink-saver black & white mode (color-based differences are excluded automatically)
- Deterministic seeds — type a puzzle number to recreate the exact puzzle
- Pro tier: bulk packs (10/25/50 puzzles), KDP trim sizes, commercial license

## Development
Static site — open `index.html` via any local server (ES modules require http):

```
npx http-server .
```

QA tools (Node):
```
cd tools
npm install
node render-samples.mjs   # render sample puzzles to PNG
node e2e.mjs              # headless-browser smoke test
```
