const PDFDocument = require('pdfkit');

// Render a finished letter (already filled with the user's details) to a PDF buffer.
function buildPDF(body, { footer } = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'LETTER', margin: 72 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.font('Times-Roman').fontSize(11).fillColor('#111').text(body || '', { lineGap: 2, align: 'left' });
      doc.moveDown(2);
      doc.font('Times-Italic').fontSize(8).fillColor('#888')
        .text(footer || 'Prepared with Overturn — a self-help document tool. Not a law firm or medical provider; not legal or medical advice.', { align: 'left' });
      doc.end();
    } catch (e) { reject(e); }
  });
}

module.exports = { buildPDF };
