const PDFDocument = require('pdfkit');

// Render a finished letter (already filled with the user's details) to a formal-looking PDF:
// a thin letterhead accent bar, clean serif typography, and a footer with page numbers.
function buildPDF(body, { footer } = {}) {
  return new Promise((resolve, reject) => {
    try {
      const M = 64;
      const doc = new PDFDocument({ size: 'LETTER', margins: { top: 96, bottom: 72, left: M, right: M }, bufferPages: true });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width;
      const foot = footer || 'Prepared with Reclaim — a self-help document tool. Not a law firm or medical provider; not legal or medical advice.';

      // Letterhead accent bar across the top.
      doc.rect(0, 0, W, 6).fill('#2563eb');

      // Letter body.
      doc.fillColor('#111').font('Times-Roman').fontSize(11.5)
        .text(body || '', M, 96, { width: W - M * 2, lineGap: 3, align: 'left' });

      // Footer (rule + disclaimer + page number) on every page.
      const range = doc.bufferedPageRange();
      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);
        const y = doc.page.height - 52;
        doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.5).strokeColor('#d0d0d0').stroke();
        doc.font('Times-Italic').fontSize(8).fillColor('#999')
          .text(foot, M, y + 6, { width: W - M * 2 - 70, align: 'left' });
        doc.text(`Page ${i + 1} of ${range.count}`, W - M - 70, y + 6, { width: 70, align: 'right' });
      }

      doc.end();
    } catch (e) { reject(e); }
  });
}

module.exports = { buildPDF };
