/**
 * DOCUMENTS ROUTES - Upload, chiffrement, génération PDF avec QR
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');

const { Document, AuditLog } = require('../models/schemas');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { generateMasterKey, deriveKey, encrypt, decryptDocument, hashSHA256 } = require('../services/crypto');

// ============================================================
// CONFIGURATION MULTER (Upload de fichiers)
// ============================================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const safeName = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        cb(null, safeName);
    }
});

// Middleware pour corriger les MIME types incorrects (ex: application/octet-stream pour JFIF)
function fixMimeType(req, res, next) {
    if (req.file && req.file.mimetype === 'application/octet-stream') {
        const extension = req.file.originalname.split('.').pop().toLowerCase();
        const imageExts = ['jpg', 'jpeg', 'jfif', 'png', 'gif', 'webp', 'bmp'];
        if (imageExts.includes(extension)) {
            req.file.mimetype = `image/${extension === 'jfif' ? 'jpeg' : extension}`;
            console.log(`✅ MIME corrigé: → ${req.file.mimetype}`);
        }
    }
    next();
}

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50 MB max
});

// ============================================================
// ROUTE PRINCIPALE : ENCODE (Upload + Chiffrement + PDF)
// ============================================================
router.post('/encode', authenticate, authorize('admin'), upload.single('file'), fixMimeType, async (req, res) => {
    try {
        const { nom } = req.body;
        let { allowedUsers } = req.body;

        console.log('=== ENCODE START ===');

        // Vérifications de base
        if (!req.file) {
            return res.status(400).json({ message: 'Aucun fichier reçu' });
        }
        if (!nom) {
            return res.status(400).json({ message: 'Nom du document requis' });
        }

        // 1. Détection du type de fichier
        const mimeType = req.file.mimetype;
        const extension = req.file.originalname.split('.').pop().toLowerCase();
        let fileType = null;

        if (mimeType === 'application/pdf' || extension === 'pdf') {
            fileType = 'pdf';
        } else if (mimeType.startsWith('image/') ||
            ['jpg', 'jpeg', 'jfif', 'png', 'gif', 'bmp', 'webp', 'svg', 'tiff'].includes(extension)) {
            fileType = 'image';
        } else if (mimeType.startsWith('text/') ||
            mimeType === 'application/json' ||
            mimeType === 'application/xml' ||
            ['txt', 'html', 'css', 'js', 'xml', 'json', 'csv', 'md', 'rtf'].includes(extension)) {
            fileType = 'text';
        }

        if (!fileType) {
            return res.status(400).json({
                message: `Type non supporté: .${extension}`,
                supported: ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'json']
            });
        }

        console.log(`✅ Type: ${fileType} | Fichier: ${req.file.originalname}`);

        // 2. Traitement des utilisateurs autorisés
        if (typeof allowedUsers === 'string') {
    try {
        allowedUsers = JSON.parse(allowedUsers);
    } catch {
        allowedUsers = allowedUsers.split(',');
    }
}

if (!Array.isArray(allowedUsers)) {
    allowedUsers = [req.user.sub];
}

allowedUsers = allowedUsers
    .map(id => id.toString().trim())
    .filter(id => mongoose.Types.ObjectId.isValid(id))
    .map(id => new mongoose.Types.ObjectId(id));

if (allowedUsers.length === 0) {
    allowedUsers = [new mongoose.Types.ObjectId(req.user.sub)];
}
        // 3. Lecture du fichier
        const fileBuffer = fs.readFileSync(req.file.path);
        const base64Data = fileBuffer.toString('base64');

        // 4. Chiffrement
        const masterKey = generateMasterKey();
        const docId = new mongoose.Types.ObjectId();
        const derivedKey = deriveKey(masterKey, docId.toString());
        const { ciphertext, iv } = await encrypt(base64Data, derivedKey);
        const hash = hashSHA256(base64Data);

        // 5. QR Payload (uniquement l'ID du document)
        const qrPayload = {
            doc_id: docId.toString(),
            v: '1.0'
        };

        // 6. Création du document en base de données
        const doc = new Document({
            _id: docId,
            nom,
            file_path: req.file.path,
            file_type: fileType,
            mime_type: mimeType,
            original_name: req.file.originalname,
            file_size: req.file.size,
            allowedUsers,
            uploaded_by: req.user.sub,
            actif: true,
            contenu_chiffre: ciphertext,
            iv,
            hash,
            qr_data: {
                masterKey: masterKey.toString('base64'),
                qr: JSON.stringify(qrPayload)
            }
        });

        await doc.save();
        console.log(`✅ Document créé: ${doc._id}`);

        // 7. Génération du PDF avec QR code
        const pdfDir = path.join(__dirname, '../generated_pdfs');
        if (!fs.existsSync(pdfDir)) {
            fs.mkdirSync(pdfDir, { recursive: true });
        }

        const qrCodeBuffer = await QRCode.toBuffer(JSON.stringify(qrPayload), {
            type: 'png',
            width: 250,
            margin: 2,
            errorCorrectionLevel: 'H'
        });

        const pdfPath = path.join(pdfDir, `${doc._id}_${Date.now()}.pdf`);
        const pdfDoc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const pdfStream = fs.createWriteStream(pdfPath);
        pdfDoc.pipe(pdfStream);

        // Design du PDF
        // Ligne bleue en haut
        pdfDoc.rect(0, 0, pdfDoc.page.width, 4).fill('#1a3a5c');

        // Titre de l'application
        pdfDoc.fontSize(20)
            .fillColor('#1a3a5c')
            .font('Helvetica-Bold')
            .text('ARDocShield', 40, 30);

        pdfDoc.fontSize(9)
            .fillColor('#888888')
            .font('Helvetica')
            .text('Document sécurisé', 40, 55);

        // Ligne de séparation
        pdfDoc.moveDown(3);
        pdfDoc.strokeColor('#dddddd')
            .lineWidth(1)
            .moveTo(40, pdfDoc.y)
            .lineTo(pdfDoc.page.width - 40, pdfDoc.y)
            .stroke();

        pdfDoc.moveDown(2);

        // Nom du document
        pdfDoc.fontSize(14)
            .fillColor('#333333')
            .font('Helvetica-Bold')
            .text(nom, { align: 'center' });

        pdfDoc.moveDown(3);

        // QR code centré
        const qrX = (pdfDoc.page.width - 200) / 2;
        pdfDoc.image(qrCodeBuffer, qrX, pdfDoc.y, { width: 200 });

        pdfDoc.moveDown(4);

        // Instructions
        pdfDoc.fontSize(9)
            .fillColor('#888888')
            .font('Helvetica')
            .text('Scannez ce QR code', { align: 'center' });

        pdfDoc.fontSize(8)
            .fillColor('#aaaaaa')
            .text('avec l\'application ARDocShield', { align: 'center' });

        pdfDoc.end();

        await new Promise((resolve, reject) => {
            pdfStream.on('finish', resolve);
            pdfStream.on('error', reject);
        });

        console.log(`✅ PDF généré: ${pdfPath}`);

        // 8. Audit log
        await AuditLog.create({
            user_id: req.user.sub,
            document_id: doc._id,
            action: 'encode',
            status: 'SUCCESS'
        });

        // 9. Envoi du PDF au client
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${nom.replace(/[^a-z0-9]/gi, '_')}.pdf"`);

        const readStream = fs.createReadStream(pdfPath);
        readStream.pipe(res);

        // Nettoyage du fichier temporaire
        readStream.on('end', () => {
            setTimeout(() => {
                try {
                    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
                } catch (e) { }
            }, 5000);
        });

    } catch (err) {
        console.error('❌ Erreur encode:', err);
        res.status(500).json({ message: err.message });
    }
});

// ============================================================
// ROUTE : DECODE (Déchiffrement d'un document)
// ============================================================
router.post('/decode', authenticate, async (req, res) => {
    try {
        const { doc_id } = req.body;

        if (!doc_id) {
            return res.status(400).json({ message: 'doc_id requis' });
        }

        // Recherche du document
        const doc = await Document.findById(doc_id);
        if (!doc) {
            return res.status(404).json({ message: 'Document introuvable' });
        }

        // Vérification des droits d'accès
        const allowed = (doc.allowedUsers || []).map(id => id.toString());
        const isAuthorized = req.user.role === 'admin' || allowed.includes(req.user.sub);

        if (!isAuthorized) {
            return res.status(403).json({ message: 'Non autorisé' });
        }

        // Déchiffrement du document
        const plaintext = await decryptDocument(doc);

        res.json({
            success: true,
            plaintext,
            document: {
                nom: doc.nom,
                type: doc.file_type,
                mime: doc.mime_type
            }
        });

    } catch (err) {
        console.error('❌ Erreur decode:', err);
        res.status(500).json({ message: err.message });
    }
});

// ============================================================
// ROUTE : LISTE des documents
// ============================================================
router.get('/', authenticate, async (req, res) => {
    try {
        let query = { actif: true };

        if (req.user.role !== 'admin') {
            query.allowedUsers = { $in: [req.user.sub] };
        }

        const docs = await Document.find(query)
            .select('nom file_type file_size original_name createdAt')
            .sort({ createdAt: -1 });

        res.json(docs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ============================================================
// ROUTE : SUPPRESSION d'un document
// ============================================================
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const doc = await Document.findByIdAndUpdate(req.params.id, { actif: false });

        if (!doc) {
            return res.status(404).json({ message: 'Document introuvable' });
        }

        await AuditLog.create({
            user_id: req.user.sub,
            document_id: req.params.id,
            action: 'delete',
            status: 'SUCCESS'
        });

        res.json({ message: 'Document supprimé avec succès' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



// Route pour encoder du texte directement
router.post('/encode-text', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { nom, contenu, allowedUsers } = req.body;
        
        if (!nom || !contenu) {
            return res.status(400).json({ message: 'Nom et contenu requis' });
        }
        
        // Convertir le texte en base64
        const base64Data = Buffer.from(contenu, 'utf8').toString('base64');
        
        // Créer le document
        const doc = new Document({
            nom: nom,
            file_type: 'text',
            mime_type: 'text/plain',
            original_name: `${nom}.txt`,
            file_size: Buffer.byteLength(contenu, 'utf8'),
            allowedUsers: allowedUsers ? (Array.isArray(allowedUsers) ? allowedUsers : [allowedUsers]) : [req.user.sub],
            uploaded_by: req.user.sub,
            actif: true
        });
        
        await doc.save();
        
        // Chiffrement
        const masterKey = generateMasterKey();
        const derivedKey = deriveKey(masterKey, doc._id.toString());
        const { ciphertext, iv } = await encrypt(base64Data, derivedKey);
        const hash = hashSHA256(base64Data);
        
        // QR Payload
        const qrPayload = {
            doc_id: doc._id.toString(),
            hash: hash.substring(0, 16),
            v: '1.0'
        };
        
        doc.contenu_chiffre = ciphertext;
        doc.iv = iv;
        doc.hash = hash;
        doc.qr_data = {
            masterKey: masterKey.toString('base64'),
            qr: JSON.stringify(qrPayload)
        };
        
        await doc.save();
        
        // Générer PDF avec QR code
        const PDFDocument = require('pdfkit');
        const QRCode = require('qrcode');
        const path = require('path');
        const fs = require('fs');
        
        const pdfDir = path.join(__dirname, '../generated_pdfs');
        if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
        
        const qrBuffer = await QRCode.toBuffer(JSON.stringify(qrPayload), { 
            width: 250, 
            margin: 2,
            errorCorrectionLevel: 'H'
        });
        
        const pdfPath = path.join(pdfDir, `${doc._id}_${Date.now()}.pdf`);
        const pdfDoc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 50, left: 50, right: 50 } });
        const stream = fs.createWriteStream(pdfPath);
        
        pdfDoc.pipe(stream);
        
        // Design du PDF
        pdfDoc.rect(0, 0, pdfDoc.page.width, 4).fill('#1a3a5c');
        pdfDoc.fontSize(20).fillColor('#1a3a5c').font('Helvetica-Bold').text('ARDocShield', 40, 30);
        pdfDoc.fontSize(9).fillColor('#888888').text('Document sécurisé', 40, 55);
        
        pdfDoc.moveDown(3);
        pdfDoc.strokeColor('#dddddd').lineWidth(1).moveTo(40, pdfDoc.y).lineTo(pdfDoc.page.width - 40, pdfDoc.y).stroke();
        pdfDoc.moveDown(2);
        
        pdfDoc.fontSize(14).fillColor('#333333').text(nom, { align: 'center' });
        pdfDoc.moveDown(3);
        
        const qrX = (pdfDoc.page.width - 200) / 2;
        pdfDoc.image(qrBuffer, qrX, pdfDoc.y, { width: 200 });
        
        pdfDoc.moveDown(4);
        pdfDoc.fontSize(9).fillColor('#888888').text('Scannez ce QR code', { align: 'center' });
        pdfDoc.fontSize(8).fillColor('#aaaaaa').text('avec l\'application ARDocShield', { align: 'center' });
        
        pdfDoc.end();
        
        await new Promise((resolve) => stream.on('finish', resolve));
        
        // Envoyer le PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${nom.replace(/[^a-z0-9]/gi, '_')}_secure.pdf"`);
        fs.createReadStream(pdfPath).pipe(res);
        
        // Nettoyage
        setTimeout(() => {
            try { if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath); } catch(e) {}
        }, 5000);
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});
module.exports = router;