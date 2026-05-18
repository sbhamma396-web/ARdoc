const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const { TokenBlacklist } = require('../models/schemas');
require('dotenv').config();

async function hashPassword(password) {
    return await bcrypt.hash(password, 12);
}

async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

function generateToken(user) {
    return jwt.sign(
        {
            sub: user._id.toString(),
            role: user.role,
            email: user.email,
            jti: randomUUID()
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );
}

async function verifyToken(token) {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const blacklisted = await TokenBlacklist.findOne({ token_jti: decoded.jti });
        if (blacklisted) throw new Error('Token révoqué');
        return decoded;
    } catch (err) {
        throw new Error('Token invalide: ' + err.message);
    }
}

// 🔥 CORRECTION de revokeToken
async function revokeToken(userOrJti) {
    try {
        // Si c'est un objet avec jti
        const jti = typeof userOrJti === 'object' ? userOrJti.jti : userOrJti;
        if (!jti) return;
        
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await TokenBlacklist.create({ token_jti: jti, expires_at: expiresAt });
    } catch (err) {
        console.error('Revoke error:', err.message);
    }
}

module.exports = { hashPassword, verifyPassword, generateToken, verifyToken, revokeToken };