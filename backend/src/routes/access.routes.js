/**
 * ACCESS ROUTES - Vérification des droits d'accès
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { Document, AuditLog, User } = require('../models/schemas');
const { authenticate } = require('../middleware/auth.middleware');
const { decryptDocument } = require('../services/crypto');

const DECRYPT_TIMEOUT = 30000;

// ================= DISTANCE =================
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ================= GPS =================
function isWithinGPSZone(zone, lat, lng) {
    // Pas de restriction GPS
    if (!zone || !zone.lat || !zone.lng) {
        return { allowed: true };
    }

    // GPS non fourni mais requis
    if (lat === undefined || lng === undefined) {
        console.log('⚠️ GPS requis mais non fourni');
        return { allowed: false, reason: 'Position GPS requise' };
    }

    const distance = calculateDistance(zone.lat, zone.lng, lat, lng);
    const radius = zone.radius || 100;

    console.log(`📍 Distance: ${distance.toFixed(2)}m / ${radius}m`);

    return {
        allowed: distance <= radius,
        distance: distance,
        radius: radius
    };
}

// ================= TIME =================
function timeToMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function isWithinTimeWindow(window) {
    if (!window || window === '00:00-23:59') {
        return { allowed: true };
    }

    const [start, end] = window.split('-');
    const now = new Date();
    const current = now.getHours() * 60 + now.getMinutes();

    const allowed = current >= timeToMinutes(start) && current <= timeToMinutes(end);
    console.log(`🕐 Horaire: ${Math.floor(current/60)}:${current%60} entre ${start} et ${end} → ${allowed ? 'OK' : 'HORS'}`);

    return { allowed: allowed };
}

// ================= ACCESS =================
router.post('/access-check', authenticate, async (req, res) => {
    console.log('\n=== ACCESS CHECK ===');
    
    try {
        const { doc_id, gps_lat, gps_lng, device_fingerprint } = req.body;
        console.log('📦 Body reçu:', { doc_id, gps_lat, gps_lng });
        console.log('👤 Utilisateur du token:', req.user);

        // 1. Vérification doc_id
        if (!doc_id || !mongoose.Types.ObjectId.isValid(doc_id)) {
            return res.status(400).json({ granted: false, reason: 'doc_id invalide' });
        }

        // 2. Récupération du document
        const doc = await Document.findById(doc_id);
        if (!doc) {
            await logAccess(req.user?.sub, doc_id, 'DOC_NOT_FOUND');
            return res.status(404).json({ granted: false, reason: 'Document introuvable' });
        }

        console.log(`📄 Document: ${doc.nom} (${doc._id})`);

        if (!doc.actif) {
            return res.status(403).json({ granted: false, reason: 'Document désactivé' });
        }

        // 3. Récupération de l'utilisateur (par ID ou email)
        let dbUser = null;
        
        // Essayer par ID
        if (req.user?.sub && mongoose.Types.ObjectId.isValid(req.user.sub)) {
            dbUser = await User.findById(req.user.sub);
        }
        
        // Essayer par email
        if (!dbUser && req.user?.email) {
            dbUser = await User.findOne({ email: req.user.email });
        }
        
        // Essayer par le sub comme email
        if (!dbUser && req.user?.sub && req.user.sub.includes('@')) {
            dbUser = await User.findOne({ email: req.user.sub });
        }

        if (!dbUser) {
            console.log('❌ Utilisateur non trouvé');
            return res.status(403).json({ granted: false, reason: 'Utilisateur introuvable' });
        }

        if (!dbUser.actif) {
            return res.status(403).json({ granted: false, reason: 'Compte désactivé' });
        }

        console.log(`👤 Utilisateur: ${dbUser.nom} (${dbUser.role})`);

        // 4. Vérification des droits (allowedUsers)
        const allowedUsers = (doc.allowedUsers || []).map(id => id.toString());
        const isAuthorized = dbUser.role === 'admin' || allowedUsers.includes(dbUser._id.toString());

        console.log(`🔐 Autorisation: ${isAuthorized ? 'OUI' : 'NON'}`);
        console.log(`   Role: ${dbUser.role}`);
        console.log(`   AllowedUsers: ${allowedUsers.join(', ')}`);

        if (!isAuthorized) {
            await logAccess(dbUser._id, doc_id, 'DENIED');
            return res.json({ granted: false, reason: 'Non autorisé' });
        }

        // 5. Vérification GPS (si configurée)
        if (dbUser.gps_zone && dbUser.gps_zone.lat && dbUser.gps_zone.lng) {
            console.log('\n📍 Vérification GPS:');
            const gpsCheck = isWithinGPSZone(dbUser.gps_zone, gps_lat, gps_lng);
            
            if (!gpsCheck.allowed) {
                await logAccess(dbUser._id, doc_id, 'GPS_OUT_OF_ZONE');
                return res.json({ 
                    granted: false, 
                    reason: `GPS hors zone (distance: ${gpsCheck.distance?.toFixed(0)}m / limite: ${gpsCheck.radius}m)`
                });
            }
            console.log('✅ GPS OK');
        } else {
            console.log('📍 Pas de restriction GPS');
        }

        // 6. Vérification horaire
        console.log('\n🕐 Vérification horaire:');
        const timeCheck = isWithinTimeWindow(dbUser.time_window);
        
        if (!timeCheck.allowed) {
            await logAccess(dbUser._id, doc_id, 'TIME_WINDOW_VIOLATION');
            return res.json({ 
                granted: false, 
                reason: `Hors plage horaire (${dbUser.time_window})`
            });
        }
        console.log('✅ Horaire OK');

        // 7. Déchiffrement du document
        let content;
        try {
            console.log('\n🔓 Déchiffrement...');
            content = await Promise.race([
                decryptDocument(doc),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('TIMEOUT')), DECRYPT_TIMEOUT)
                )
            ]);
            console.log(`✅ Déchiffré: ${(content.length / 1024).toFixed(2)} KB`);
        } catch (err) {
            console.error('❌ Erreur déchiffrement:', err.message);
            return res.json({ granted: false, reason: 'Erreur déchiffrement' });
        }

        // 8. Log succès
        await logAccess(dbUser._id, doc_id, 'GRANTED');

        // 9. Retour du contenu
        res.json({
            granted: true,
            content: content,
            document: {
                id: doc._id,
                nom: doc.nom,
                file_type: doc.file_type || 'text',
                mime_type: doc.mime_type || 'text/plain'
            }
        });

    } catch (err) {
        console.error('💥 Erreur fatale:', err);
        res.status(500).json({ 
            granted: false, 
            reason: 'Erreur serveur',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// ================= LOG =================
async function logAccess(userId, docId, status) {
    try {
        await AuditLog.create({
            user_id: userId,
            document_id: docId,
            action: 'access-check',
            status: status,
            timestamp: new Date()
        });
        console.log(`📝 Log: ${status}`);
    } catch (err) {
        console.error('⚠️ Erreur log:', err.message);
    }
}

module.exports = router;