const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

async function encodeDocument(nom, ciphertext, qrPayload, docId) {

  fs.mkdirSync('uploads', { recursive: true });

  const qrPath = path.join('uploads', `${docId}_qr.png`);
  await QRCode.toFile(qrPath, JSON.stringify(qrPayload));

  const pdfPath = path.join('uploads', `${docId}.pdf`);

  await generatePDF(nom, ciphertext, qrPath, pdfPath, docId);

  return { pdfPath };
}

function generatePDF(nom, ciphertext, qrPath, pdfPath, docId) {
  return new Promise((resolve) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(pdfPath);

    doc.pipe(stream);

    doc.fontSize(18).text("DOCUMENT SECURISE", { align: "center" });
    doc.moveDown();

    doc.text(`Nom: ${nom}`);
    doc.text(`ID: ${docId}`);

    doc.moveDown();
    doc.text("Contenu protégé:");

    const chunks = ciphertext.match(/.{1,80}/g) || [];
    chunks.forEach(c => {
      doc.fontSize(6).fillColor('#cccccc').text(c);
    });

    doc.moveDown();
    doc.image(qrPath, { fit: [150,150], align: 'center' });

    doc.end();
    stream.on('finish', resolve);
  });
}

module.exports = { encodeDocument };