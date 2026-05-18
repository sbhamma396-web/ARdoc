const PDFDocument = require('pdfkit');
const fs = require('fs');
const QRCode = require('qrcode');

async function encodeDocument(nom, ciphertext, qrPayload) {
  return new Promise(async (resolve, reject) => {
    const pdfPath = `uploads/${Date.now()}_${nom.replace(/\s/g, '_')}.pdf`;
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(pdfPath);

    doc.pipe(stream);

    doc.fontSize(20).text(nom, { align: 'center' });
    doc.moveDown();

    doc.fontSize(10).text(
      `Contenu chiffré : ${ciphertext.substring(0, 80)}...`
    );

    doc.moveDown();

    // 🔥 QR JSON
    const qrData = JSON.stringify(qrPayload);

    console.log("QR GENERATED:", qrData);

    const qrImage = await QRCode.toDataURL(qrData);
    const qrBuffer = Buffer.from(qrImage.split(',')[1], 'base64');

    doc.image(qrBuffer, { fit: [150, 150], align: 'center' });

    doc.end();

    stream.on('finish', () => resolve({ pdfPath }));
    stream.on('error', reject);
  });
}

module.exports = { encodeDocument };