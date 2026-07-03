// PDF export — renders puzzle SVGs to high-resolution raster pages via jsPDF (window.jspdf).

const PAGE_FORMATS = {
  a4: { w: 210, h: 297, label: 'A4' },
  letter: { w: 215.9, h: 279.4, label: 'Letter' },
  kdp85x11: { w: 215.9, h: 279.4, label: 'KDP 8.5″×11″' },
  kdp6x9: { w: 152.4, h: 228.6, label: 'KDP 6″×9″' },
};

const IMG_RATIO = 0.7; // canvas is 1000x700

function svgToPng(svg, pxWidth) {
  return new Promise((resolve, reject) => {
    const pxHeight = Math.round(pxWidth * IMG_RATIO);
    const withSize = svg.replace('<svg ', `<svg width="${pxWidth}" height="${pxHeight}" `);
    const blob = new Blob([withSize], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pxWidth; canvas.height = pxHeight;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pxWidth, pxHeight);
      ctx.drawImage(img, 0, 0, pxWidth, pxHeight);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

function fitImage(pageW, availH, margin) {
  let w = pageW - margin * 2;
  let h = w * IMG_RATIO;
  if (h > availH) { h = availH; w = h / IMG_RATIO; }
  return { w, h, x: (pageW - w) / 2 };
}

// Draws one puzzle (both images stacked) onto the current page. Returns nothing.
async function drawPuzzlePage(doc, puzzle, fmt, pngA, pngB, siteUrl) {
  const M = 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(45, 42, 38);
  doc.text('Spot the Difference!', fmt.w / 2, M + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(110, 105, 98);
  doc.text(`Can you find all ${puzzle.count} differences between the two pictures?`, fmt.w / 2, M + 11, { align: 'center' });

  const top = M + 16;
  const footH = 8;
  const gap = 5;
  const availH = (fmt.h - top - footH - M - gap) / 2;
  const im = fitImage(fmt.w, availH, M);
  doc.addImage(pngA, 'PNG', im.x, top, im.w, im.h);
  doc.addImage(pngB, 'PNG', im.x, top + im.h + gap, im.w, im.h);

  doc.setFontSize(8.5);
  doc.setTextColor(150, 145, 138);
  doc.text(`Puzzle #${puzzle.seed} · ${puzzle.themeId} · ${puzzle.difficulty}`, M, fmt.h - M + 4);
  doc.text(siteUrl, fmt.w - M, fmt.h - M + 4, { align: 'right' });
}

async function drawAnswerPage(doc, puzzles, pngAnswers, fmt, siteUrl) {
  // up to 2 answer images per page
  const M = 12;
  for (let i = 0; i < puzzles.length; i += 2) {
    if (i > 0) doc.addPage([fmt.w, fmt.h], fmt.h >= fmt.w ? 'portrait' : 'landscape');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(45, 42, 38);
    doc.text('Answer Key', fmt.w / 2, M + 4, { align: 'center' });
    const top = M + 10;
    const footH = 6;
    const gap = 12;
    const availH = (fmt.h - top - footH - M - gap) / 2;
    for (let k = 0; k < 2 && i + k < puzzles.length; k++) {
      const im = fitImage(fmt.w, availH - 6, M);
      const y = top + k * (availH + gap);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(110, 105, 98);
      doc.text(`Puzzle #${puzzles[i + k].seed}`, fmt.w / 2, y + 3, { align: 'center' });
      doc.addImage(pngAnswers[i + k], 'PNG', im.x, y + 6, im.w, im.h);
    }
    doc.setFontSize(8.5);
    doc.setTextColor(150, 145, 138);
    doc.text(siteUrl, fmt.w - M, fmt.h - M + 4, { align: 'right' });
  }
}

export async function exportPdf(puzzles, { pageFormat = 'a4', siteUrl = '', onProgress } = {}) {
  const fmt = PAGE_FORMATS[pageFormat] || PAGE_FORMATS.a4;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: [fmt.w, fmt.h], orientation: 'portrait', compress: true });

  const raster = puzzles.length > 5 ? 1700 : 2200; // keep batch PDFs a reasonable size
  const pngAnswers = [];
  for (let i = 0; i < puzzles.length; i++) {
    const p = puzzles[i];
    if (onProgress) onProgress(i + 1, puzzles.length);
    const [pngA, pngB, pngAns] = await Promise.all([
      svgToPng(p.svgA, raster), svgToPng(p.svgB, raster), svgToPng(p.svgAnswer, raster),
    ]);
    pngAnswers.push(pngAns);
    if (i > 0) doc.addPage([fmt.w, fmt.h], 'portrait');
    await drawPuzzlePage(doc, p, fmt, pngA, pngB, siteUrl);
  }
  doc.addPage([fmt.w, fmt.h], 'portrait');
  await drawAnswerPage(doc, puzzles, pngAnswers, fmt, siteUrl);

  const name = puzzles.length === 1
    ? `spot-the-difference-${puzzles[0].themeId}-${puzzles[0].seed}.pdf`
    : `spot-the-difference-pack-${puzzles.length}-puzzles.pdf`;
  doc.save(name);
}

export { PAGE_FORMATS };
