/**
 * AUTH MIDDLEWARE
 * ✅ Cookie HttpOnly Strict — même domaine ngrok
 */

const jwt = require('jsonwebtoken');
const { User, TokenBlacklist } = require('../models/schemas');

// ✅ Même domaine → SameSite=Strict (plus sécurisé que None)
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,          // HTTPS ngrok obligatoire
    sameSite: 'strict',    // même domaine = Strict possible
    path: '/',
    maxAge: 15 * 60 * 1000
};

async function authenticate(req, res, next) {
    try {
        let token = null;

        // 1. Cookie HttpOnly (priorité)
        if (req.cookies?.access_token) {
            token = req.cookies.access_token;
            console.log('✅ Token cookie');
        }

        // 2. Fallback Bearer (Postman / admin panel)
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
                console.log('✅ Token Bearer');
            }
        }

        if (!token) {
            return res.status(401).json({ message: 'Non authentifié' });
        }

        let payload;
        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ message: 'Token invalide ou expiré' });
        }

        const blacklisted = await TokenBlacklist.findOne({ token_jti: payload.jti });
        if (blacklisted) {
            return res.status(401).json({ message: 'Session expirée' });
        }

        const user = await User.findById(payload.sub).select('_id role actif email');
        if (!user) {
            return res.status(401).json({ message: 'Utilisateur introuvable' });
        }
        if (!user.actif) {
            return res.status(403).json({ message: 'Compte désactivé' });
        }

        req.user = {
            sub: user._id.toString(),
            role: user.role,
            email: user.email,
            jti: payload.jti,
            exp: payload.exp
        };

        next();
    } catch (err) {
        console.error('Auth error:', err.message);
        res.status(401).json({ message: "Erreur d'authentification" });
    }
}

function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ message: 'Non authentifié' });
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Accès refusé — rôle requis: ${roles.join(', ')}` });
        }
        next();
    };
}

module.exports = { authenticate, authorize, COOKIE_OPTIONS };