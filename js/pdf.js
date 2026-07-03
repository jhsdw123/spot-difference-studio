// PDF export — renders puzzles (procedural SVG scenes or photo pairs) to raster pages via jsPDF.

const PAGE_FORMATS = {
  a4: { w: 210, h: 297, label: 'A4' },
  letter: { w: 215.9, h: 279.4, label: 'Letter' },
  kdp85x11: { w: 215.9, h: 279.4, label: 'KDP 8.5″×11″' },
  kdp6x9: { w: 152.4, h: 228.6, label: 'KDP 6″×9″' },
};

const SVG_RATIO = 0.7; // procedural scenes are 1000x700

function svgToPng(svg, pxWidth, ratio) {
  return new Promise((resolve, reject) => {
    const pxHeight = Math.round(pxWidth * ratio);
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

function loadImg(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function photoToJpeg(img, regions) {
  const w = img.naturalWidth, h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  if (regions && regions.length) {
    ctx.strokeStyle = '#e8262d';
    ctx.lineWidth = Math.max(4, w * 0.008);
    ctx.setLineDash([w * 0.024, w * 0.015]);
    for (const r of regions) {
      ctx.beginPath();
      ctx.arc(r.x / 100 * w, r.y / 100 * h, r.radius / 100 * w, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  return canvas.toDataURL('image/jpeg', 0.9);
}

// -> { imgA, imgB, imgAns, type, ratio }
async function puzzleToImages(p, raster) {
  if (p.photo) {
    const [a, b] = await Promise.all([loadImg(p.aUrl), loadImg(p.bUrl)]);
    return {
      imgA: photoToJpeg(a), imgB: photoToJpeg(b), imgAns: photoToJpeg(b, p.regions),
      type: 'JPEG', ratio: (a.naturalHeight / a.naturalWidth) || 1,
    };
  }
  const [imgA, imgB, imgAns] = await Promise.all([
    svgToPng(p.svgA, raster, SVG_RATIO), svgToPng(p.svgB, raster, SVG_RATIO), svgToPng(p.svgAnswer, raster, SVG_RATIO),
  ]);
  return { imgA, imgB, imgAns, type: 'PNG', ratio: SVG_RATIO };
}

function fitImage(pageW, availH, margin, ratio) {
  let w = pageW - margin * 2;
  let h = w * ratio;
  if (h > availH) { h = availH; w = h / ratio; }
  return { w, h, x: (pageW - w) / 2 };
}

function puzzleLabel(p) {
  return p.photo ? `${p.styleLabel} #${p.num}` : `Puzzle #${p.seed} · ${p.themeId} · ${p.difficulty}`;
}

function drawPuzzlePage(doc, puzzle, fmt, imgs, siteUrl) {
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
  const im = fitImage(fmt.w, availH, M, imgs.ratio);
  doc.addImage(imgs.imgA, imgs.type, im.x, top, im.w, im.h);
  doc.addImage(imgs.imgB, imgs.type, im.x, top + im.h + gap, im.w, im.h);

  doc.setFontSize(8.5);
  doc.setTextColor(150, 145, 138);
  doc.text(puzzleLabel(puzzle), M, fmt.h - M + 4);
  doc.text(siteUrl, fmt.w - M, fmt.h - M + 4, { align: 'right' });
}

function drawAnswerPages(doc, puzzles, imgsList, fmt, siteUrl) {
  const M = 12;
  for (let i = 0; i < puzzles.length; i += 2) {
    if (i > 0) doc.addPage([fmt.w, fmt.h], 'portrait');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(45, 42, 38);
    doc.text('Answer Key', fmt.w / 2, M + 4, { align: 'center' });
    const top = M + 10;
    const footH = 6;
    const gap = 12;
    const availH = (fmt.h - top - footH - M - gap) / 2;
    for (let k = 0; k < 2 && i + k < puzzles.length; k++) {
      const p = puzzles[i + k];
      const imgs = imgsList[i + k];
      const im = fitImage(fmt.w, availH - 6, M, imgs.ratio);
      const y = top + k * (availH + gap);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(110, 105, 98);
      doc.text(p.photo ? `${p.styleLabel} #${p.num}` : `Puzzle #${p.seed}`, fmt.w / 2, y + 3, { align: 'center' });
      doc.addImage(imgs.imgAns, imgs.type, im.x, y + 6, im.w, im.h);
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

  const raster = puzzles.length > 5 ? 1700 : 2200;
  const imgsList = [];
  for (let i = 0; i < puzzles.length; i++) {
    if (onProgress) onProgress(i + 1, puzzles.length);
    const imgs = await puzzleToImages(puzzles[i], raster);
    imgsList.push(imgs);
    if (i > 0) doc.addPage([fmt.w, fmt.h], 'portrait');
    drawPuzzlePage(doc, puzzles[i], fmt, imgs, siteUrl);
  }
  doc.addPage([fmt.w, fmt.h], 'portrait');
  drawAnswerPages(doc, puzzles, imgsList, fmt, siteUrl);

  const first = puzzles[0];
  const name = puzzles.length === 1
    ? (first.photo ? `spot-the-difference-${(first.styleLabel || 'photo').toLowerCase()}-${first.num}.pdf` : `spot-the-difference-${first.themeId}-${first.seed}.pdf`)
    : `spot-the-difference-pack-${puzzles.length}-puzzles.pdf`;
  doc.save(name);
}

export { PAGE_FORMATS };
