import * as mupdf from 'mupdf';
import { readFileSync, writeFileSync } from 'node:fs';
const [,, pdfPath, outPrefix] = process.argv;
const doc = mupdf.Document.openDocument(readFileSync(pdfPath), 'application/pdf');
const n = doc.countPages();
console.log('pages:', n);
for (let i = 0; i < n; i++) {
  const page = doc.loadPage(i);
  const pix = page.toPixmap(mupdf.Matrix.scale(1.2, 1.2), mupdf.ColorSpace.DeviceRGB);
  writeFileSync(`${outPrefix}-p${i + 1}.png`, pix.asPNG());
}
