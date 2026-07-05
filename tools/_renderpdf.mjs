import * as mupdf from 'mupdf';
import { readFileSync, writeFileSync } from 'node:fs';
const [,, pdfPath, pagesArg, outPrefix] = process.argv;
const doc = mupdf.Document.openDocument(readFileSync(pdfPath), 'application/pdf');
for (const pn of pagesArg.split(',').map(Number)) {
  const page = doc.loadPage(pn - 1);
  const pix = page.toPixmap(mupdf.Matrix.scale(1.3, 1.3), mupdf.ColorSpace.DeviceRGB, false, true);
  writeFileSync(`${outPrefix}-p${pn}.png`, pix.asPNG());
  console.log(`${outPrefix}-p${pn}.png`);
}
