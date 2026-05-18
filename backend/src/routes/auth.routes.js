/**
 * AUTH ROUTES - Authentification, MFA, WebAuthn
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const { User, AuditLog } = require('../models/schemas');
const { hashPassword, verifyPassword, generateToken, revokeToken } = require('../services/auth');
const { authenticate, COOKIE_OPTIONS } = require('../middleware/auth.middleware');

// ═══════════════════════════════════════════════════════════
// WEBAUTHN UTILITIES - Détection dynamique du domaine
// ═══════════════════════════════════════════════════════════
function getRPID(req) {
    const host = req.headers.host || '';
    
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return 'localhost';
    }
    
    if (host.includes('ngrok-free.dev')) {
        return host;
    }
    
    return 'localhost';
}

function getRPOrigin(req) {
    const protocol = req.headers['x-forwarded-proto'] || (req.connection && req.connection.encrypted ? 'https' : 'http');
    const host = req.headers.host;
    return `${protocol}://${host}`;
}

const RP_NAME = 'ARDocShield';

// Log de configuration au démarrage
console.log('═══════════════════════════════════════════════════════════');
console.log('🔐 WebAuthn Configuration:');
console.log(`   RP_NAME: ${RP_NAME}`);
console.log(`   RP_ID: dynamique (selon domaine requête)`);
console.log('═══════════════════════════════════════════════════════════');

const pendingChallenges = new Map();

// ═══════════════════════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════════════════════
router.post('/register', async (req, res) => {
    try {
        const { nom, email, password, role } = req.body;

        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({ message: 'Email déjà utilisé' });
        }

        const password_hash = await hashPassword(password);
        const user = await User.create({
            nom,
            email,
            password_hash,
            role: role || 'lecteur'
        });

        res.status(201).json({
            message: 'Utilisateur créé avec succès',
            user: { id: user._id, nom: user.nom, email: user.email, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        if (!user.actif) {
            return res.status(403).json({ message: 'Compte désactivé' });
        }

        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) {
            await AuditLog.create({ user_id: user._id, action: 'login', status: 'FAILED' });
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        // MFA requis
        if (user.mfa_enabled) {
            const mfa_token = jwt.sign(
                { sub: user._id.toString(), purpose: 'mfa_pending' },
                process.env.JWT_SECRET,
                { expiresIn: '5m' }
            );
            await AuditLog.create({ user_id: user._id, action: 'login_mfa_pending', status: 'SUCCESS' });
            return res.json({ mfa_required: true, mfa_token });
        }

        const token = generateToken(user);

        res.cookie('access_token', token, {
            ...COOKIE_OPTIONS,
            maxAge: 15 * 60 * 1000
        });

        await AuditLog.create({ user_id: user._id, action: 'login', status: 'SUCCESS' });

        res.json({
            message: 'Connexion réussie',
            user: { id: user._id, nom: user.nom, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
// LOGOUT
// ═══════════════════════════════════════════════════════════
router.post('/logout', authenticate, async (req, res) => {
    try {
        await revokeToken(req.user);
        await AuditLog.create({ user_id: req.user.sub, action: 'logout', status: 'SUCCESS' });
        res.clearCookie('access_token', COOKIE_OPTIONS);
        res.json({ message: 'Déconnecté avec succès' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
// CURRENT USER
// ═══════════════════════════════════════════════════════════
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.sub)
            .select('-password_hash -mfa_secret -mfa_backup_codes -webauthn_credentials');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
// MFA SETUP
// ═══════════════════════════════════════════════════════════
router.post('/mfa/setup', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.sub);
        if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
        if (user.mfa_enabled) return res.status(400).json({ message: 'MFA déjà activé' });

        const secret = speakeasy.generateSecret({
            name: `ARDocShield (${user.email})`,
            length: 20,
        });

        await User.findByIdAndUpdate(user._id, { mfa_secret: secret.base32 });

        const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);
        res.json({
            secret: secret.base32,
            qrcode: qrCodeDataURL,
            otpauth_url: secret.otpauth_url,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
// MFA ACTIVATE
// ═══════════════════════════════════════════════════════════
router.post('/mfa/activate', authenticate, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ message: 'Code TOTP requis' });

        const user = await User.findById(req.user.sub);
        if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
        if (!user.mfa_secret) return res.status(400).json({ message: "Lancez d'abord /mfa/setup" });
        if (user.mfa_enabled) return res.status(400).json({ message: 'MFA déjà activé' });

        const verified = speakeasy.totp.verify({
            secret: user.mfa_secret,
            encoding: 'base32',
            token: code.replace(/\s/g, ''),
            window: 1,
        });

        if (!verified) return res.status(400).json({ message: 'Code incorrect' });

        const backupCodes = [];
        const plainCodes = [];
        for (let i = 0; i < 8; i++) {
            const plain = crypto.randomBytes(4).toString('hex').toUpperCase();
            const hashed = await hashPassword(plain);
            backupCodes.push(hashed);
            plainCodes.push(plain);
        }

        await User.findByIdAndUpdate(user._id, {
            mfa_enabled: true,
            mfa_backup_codes: backupCodes,
        });

        await AuditLog.create({ user_id: user._id, action: 'mfa_activated', status: 'SUCCESS' });

        res.json({
            message: 'MFA activé avec succès',
            backup_codes: plainCodes
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
// MFA VERIFY (après login)
// ═══════════════════════════════════════════════════════════
router.post('/mfa/verify', async (req, res) => {
    try {
        const { mfa_token, code } = req.body;
        if (!mfa_token || !code) {
            return res.status(400).json({ message: 'Token et code requis' });
        }

        let payload;
        try {
            payload = jwt.verify(mfa_token, process.env.JWT_SECRET);
        } catch {
            return res.status(401).json({ message: 'Token MFA expiré, reconnectez-vous' });
        }

        if (payload.purpose !== 'mfa_pending') {
            return res.status(401).json({ message: 'Token invalide' });
        }

        const user = await User.findById(payload.sub);
        if (!user || !user.actif) {
            return res.status(401).json({ message: 'Utilisateur introuvable' });
        }

        const verified = speakeasy.totp.verify({
            secret: user.mfa_secret,
            encoding: 'base32',
            token: code.replace(/\s/g, ''),
            window: 1,
        });

        if (!verified) {
            let backupValid = false;
            for (const hashedCode of (user.mfa_backup_codes || [])) {
                if (await verifyPassword(code, hashedCode)) {
                    backupValid = true;
                    break;
                }
            }
            if (!backupValid) {
                return res.status(401).json({ message: 'Code incorrect' });
            }
        }

        const token = generateToken(user);

        res.cookie('access_token', token, {
            ...COOKIE_OPTIONS,
            maxAge: 15 * 60 * 1000
        });

        await AuditLog.create({ user_id: user._id, action: 'login_mfa', status: 'SUCCESS' });

        res.json({
            message: 'Connexion réussie',
            user: { id: user._id, nom: user.nom, email: user.email, role: user.role }
        });
    } catch (err) {
        console.error('MFA verify error:', err);
        res.status(500).json({ message: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
// MFA STATUS
// ═══════════════════════════════════════════════════════════
router.get('/mfa/status', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.sub).select('mfa_enabled');
        res.json({ mfa_enabled: user?.mfa_enabled || false });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
// MFA DISABLE
// ═══════════════════════════════════════════════════════════
router.delete('/mfa/disable', authenticate, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ message: 'Code TOTP requis' });

        const user = await User.findById(req.user.sub);
        if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
        if (!user.mfa_enabled) return res.status(400).json({ message: 'MFA non activé' });

        const verified = speakeasy.totp.verify({
            secret: user.mfa_secret,
            encoding: 'base32',
            token: code.replace(/\s/g, ''),
            window: 1,
        });

        if (!verified) return res.status(400).json({ message: 'Code incorrect' });

        await User.findByIdAndUpdate(user._id, {
            mfa_enabled: false,
            mfa_secret: null,
            mfa_backup_codes: [],
        });

        await AuditLog.create({ user_id: user._id, action: 'mfa_disabled', status: 'SUCCESS' });
        res.json({ message: 'MFA désactivé' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
// WEBAUTHN UTILITIES - Détection dynamique du domaine
// ═══════════════════════════════════════════════════════════
function getRPID(req) {
    const host = req.headers.host || '';
    
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return 'localhost';
    }
    
    if (host.includes('ngrok-free.dev')) {
        return host;
    }
    
    return 'localhost';
}

function getRPOrigin(req) {
    const protocol = req.headers['x-forwarded-proto'] || (req.connection && req.connection.encrypted ? 'https' : 'http');
    const host = req.headers.host;
    return `${protocol}://${host}`;
}

// ═══════════════════════════════════════════════════════════
// WEBAUTHN - Register Options (Nouvelle inscription)
// ═══════════════════════════════════════════════════════════
router.post('/biometric/register-options', authenticate, async (req, res) => {
    try {
        console.log('🔐 Register Options - User:', req.user.sub);
        
        const user = await User.findById(req.user.sub);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        const existingDevices = user.webauthn_credentials || [];
        console.log(`📱 Existing devices: ${existingDevices.length}`);

        const rpID = getRPID(req);
        const rpOrigin = getRPOrigin(req);
        
        console.log(`🌐 WebAuthn pour domaine: ${rpID}`);
        console.log(`🌐 Origin: ${rpOrigin}`);

        const encoder = new TextEncoder();
        const userID = encoder.encode(user._id.toString());

        const options = {
            rpName: 'ARDocShield',
            rpID: rpID,
            userID: userID,
            userName: user.email,
            userDisplayName: user.nom,
            attestationType: 'none',
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'required',
                authenticatorAttachment: 'platform'
            },
            timeout: 60000,
            excludeCredentials: existingDevices.map(dev => ({
                id: dev.credentialID,
                type: 'public-key',
            })),
        };

        const registrationOptions = await generateRegistrationOptions(options);

        pendingChallenges.set(user._id.toString(), {
            challenge: registrationOptions.challenge,
            expiresAt: Date.now() + 5 * 60 * 1000,
            rpID: rpID
        });

        console.log('✅ Options d\'inscription générées');
        res.json(registrationOptions);
        
    } catch (err) {
        console.error('❌ Erreur register-options:', err);
        res.status(500).json({ message: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
// WEBAUTHN - Register Verify (Vérification inscription)
// ═══════════════════════════════════════════════════════════
router.post('/biometric/register-verify', authenticate, async (req, res) => {
    try {
        console.log('🔐 Register Verify - User:', req.user.sub);
        
        const user = await User.findById(req.user.sub);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        const pending = pendingChallenges.get(user._id.toString());
        if (!pending || Date.now() > pending.expiresAt) {
            pendingChallenges.delete(user._id.toString());
            return res.status(400).json({ message: 'Challenge expiré, recommencez' });
        }
        
        const rpID = pending.rpID || getRPID(req);
        const origin = getRPOrigin(req);
        
        console.log(`🌍 Vérification - Origin: ${origin}, RP_ID: ${rpID}`);
        
        pendingChallenges.delete(user._id.toString());

        const verification = await verifyRegistrationResponse({
            response: req.body,
            expectedChallenge: pending.challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            requireUserVerification: true,
        });

        if (!verification.verified) {
            console.log('❌ Vérification échouée');
            return res.status(400).json({ message: 'Vérification biométrique échouée' });
        }

        const { credentialID, credentialPublicKey, counter } = verification.registrationInfo || {};

        if (!credentialID) {
            console.log('❌ credentialID manquant');
            return res.status(400).json({ message: 'Credential ID manquant' });
        }

        if (!credentialPublicKey) {
            console.log('❌ credentialPublicKey manquant');
            return res.status(400).json({ message: 'Credential Public Key manquant' });
        }

        const credentialIDBase64 = Buffer.from(credentialID).toString('base64url');
        const credentialPublicKeyBase64 = Buffer.from(credentialPublicKey).toString('base64url');

        console.log('✅ Nouvelle credential enregistrée');

        const newCredential = {
            credentialID: credentialIDBase64,
            credentialPublicKey: credentialPublicKeyBase64,
            counter: counter || 0,
            transports: req.body.response?.transports || ['internal'],
            registeredAt: new Date(),
        };

        await User.findByIdAndUpdate(user._id, { 
            $push: { webauthn_credentials: newCredential } 
        });
        
        await AuditLog.create({ 
            user_id: user._id, 
            action: 'biometric_register', 
            status: 'SUCCESS' 
        });
        
        console.log('✅ Biométrie enregistrée avec succès');
        res.json({ verified: true, message: 'Biométrie enregistrée avec succès' });
        
    } catch (err) {
        console.error('❌ Erreur register-verify:', err);
        res.status(500).json({ message: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
// WEBAUTHN - Auth Options (Options d'authentification)
// ═══════════════════════════════════════════════════════════
router.post('/biometric/auth-options', async (req, res) => {
    try {
        const { email } = req.body;
        console.log('🔐 Auth Options - Email:', email);
        
        if (!email) {
            return res.status(400).json({ message: 'Email requis' });
        }

        const user = await User.findOne({ email });
        if (!user || !user.actif) {
            return res.status(401).json({ message: 'Utilisateur introuvable ou inactif' });
        }

        const credentials = user.webauthn_credentials || [];
        if (credentials.length === 0) {
            return res.status(400).json({ message: 'Aucune biométrie enregistrée' });
        }

        const rpID = getRPID(req);
        console.log(`🌐 Auth Options - RP_ID: ${rpID}`);

        const options = await generateAuthenticationOptions({
            rpID: rpID,
            timeout: 60000,
            userVerification: 'required',
            allowCredentials: credentials.map(cred => ({
                id: cred.credentialID,
                type: 'public-key',
                transports: cred.transports || ['internal'],
            })),
        });

        pendingChallenges.set(user._id.toString(), {
            challenge: options.challenge,
            expiresAt: Date.now() + 5 * 60 * 1000,
            rpID: rpID
        });

        console.log('✅ Options d\'authentification générées');
        res.json({ ...options, userId: user._id.toString() });
    } catch (err) {
        console.error('❌ Erreur auth-options:', err);
        res.status(500).json({ message: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
// WEBAUTHN - Auth Verify (Vérification authentification)
// ═══════════════════════════════════════════════════════════
router.post('/biometric/auth-verify', async (req, res) => {
    try {
        const { userId, ...assertionResponse } = req.body;
        console.log('🔐 Auth Verify - UserId:', userId);
        
        if (!userId) {
            return res.status(400).json({ message: 'userId manquant' });
        }

        const user = await User.findById(userId);
        if (!user || !user.actif) {
            return res.status(401).json({ message: 'Utilisateur introuvable' });
        }

        const pending = pendingChallenges.get(userId);
        if (!pending || Date.now() > pending.expiresAt) {
            pendingChallenges.delete(userId);
            return res.status(400).json({ message: 'Challenge expiré, reconnectez-vous' });
        }
        
        const rpID = pending.rpID || getRPID(req);
        const origin = getRPOrigin(req);
        
        console.log(`🌍 Auth Verify - Origin: ${origin}, RP_ID: ${rpID}`);
        
        pendingChallenges.delete(userId);

        const credentials = user.webauthn_credentials || [];
        const storedCred = credentials.find(c => c.credentialID === assertionResponse.id);
        
        if (!storedCred) {
            return res.status(400).json({ message: 'Clé biométrique non reconnue' });
        }

        const verification = await verifyAuthenticationResponse({
            response: assertionResponse,
            expectedChallenge: pending.challenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            requireUserVerification: true,
            authenticator: {
                credentialID: Buffer.from(storedCred.credentialID, 'base64url'),
                credentialPublicKey: Buffer.from(storedCred.credentialPublicKey, 'base64url'),
                counter: storedCred.counter,
                transports: storedCred.transports || ['internal'],
            },
        });

        if (!verification.verified) {
            await AuditLog.create({ 
                user_id: user._id, 
                action: 'biometric_auth', 
                status: 'FAILED' 
            });
            return res.status(401).json({ message: 'Authentification biométrique échouée' });
        }

        await User.updateOne(
            { _id: user._id, 'webauthn_credentials.credentialID': storedCred.credentialID },
            { $set: { 'webauthn_credentials.$.counter': verification.authenticationInfo.newCounter } }
        );

        await AuditLog.create({ 
            user_id: user._id, 
            action: 'biometric_auth', 
            status: 'SUCCESS' 
        });
        
        const token = generateToken(user);

        res.cookie('access_token', token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 15 * 60 * 1000,
            path: '/'
        });

        console.log('✅ Authentification biométrique réussie');
        res.json({
            message: 'Authentification biométrique réussie',
            token: token,
            user: { id: user._id, nom: user.nom, email: user.email, role: user.role },
        });
    } catch (err) {
        console.error('❌ Erreur auth-verify:', err);
        res.status(500).json({ message: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
// WEBAUTHN - Liste des dispositifs biométriques
// ═══════════════════════════════════════════════════════════
router.get('/biometric/devices', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.sub);
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        const devices = (user.webauthn_credentials || []).map(cred => ({
            id: cred.credentialID,
            registeredAt: cred.registeredAt,
            transports: cred.transports
        }));

        res.json({ devices, count: devices.length });
    } catch (err) {
        console.error('❌ Erreur liste dispositifs:', err);
        res.status(500).json({ message: err.message });
    }
});

// ═══════════════════════════════════════════════════════════
// WEBAUTHN - Supprimer un dispositif biométrique
// ═══════════════════════════════════════════════════════════
router.delete('/biometric/devices/:credentialId', authenticate, async (req, res) => {
    try {
        const { credentialId } = req.params;
        
        const user = await User.findByIdAndUpdate(
            req.user.sub,
            { $pull: { webauthn_credentials: { credentialID: credentialId } } },
            { new: true }
        );
        
        if (!user) {
            return res.status(404).json({ message: 'Utilisateur introuvable' });
        }

        await AuditLog.create({ 
            user_id: req.user.sub, 
            action: 'biometric_device_removed', 
            status: 'SUCCESS' 
        });

        res.json({ message: 'Dispositif biométrique supprimé' });
    } catch (err) {
        console.error('❌ Erreur suppression dispositif:', err);
        res.status(500).json({ message: err.message });
    }
});





// ═══════════════════════════════════════════════════════════
// CSRF TOKEN
// ═══════════════════════════════════════════════════════════
router.get('/csrf-token', authenticate, async (req, res) => {
    const csrfToken = crypto.randomBytes(32).toString('hex');
    res.json({ csrfToken });
});

// ═══════════════════════════════════════════════════════════
// REFRESH TOKEN
// ═══════════════════════════════════════════════════════════
router.post('/refresh', authenticate, async (req, res) => {
    try {
        const newToken = generateToken({
            _id: req.user.sub,
            role: req.user.role,
            email: req.user.email
        });

        res.cookie('access_token', newToken, {
            ...COOKIE_OPTIONS,
            maxAge: 15 * 60 * 1000
        });

        res.json({ message: 'Token rafraîchi' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;