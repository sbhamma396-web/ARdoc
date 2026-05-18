const mongoose = require('mongoose');

// ── USER ─────────────────────────────
const userSchema = new mongoose.Schema({
    nom: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password_hash: { type: String, required: true },

    role: {
        type: String,
        enum: ['admin', 'medecin', 'juriste', 'lecteur'],
        default: 'lecteur'
    },

    // MFA (TOTP)
    mfa_secret:       { type: String, default: null },
    mfa_enabled:      { type: Boolean, default: false },
    mfa_backup_codes: [{ type: String }],

    // Ajouter dans userSchema
webauthn_credentials: [{
    credentialID: { type: String, required: true },
    credentialPublicKey: { type: String, required: true },
    counter: { type: Number, default: 0 },
    transports: [{ type: String }],
    registeredAt: { type: Date, default: Date.now }
}],
    actif: { type: Boolean, default: true },

    device_id: String,

    gps_zone: {
        lat: Number,
        lng: Number,
        radius: Number
    },

    time_window: { type: String, default: '00:00-23:59' }

}, { timestamps: true });


const documentSchema = new mongoose.Schema({
    nom: { type: String, required: true },
    file_path: String,
    file_type: String,
    mime_type: String,
    original_name: String,
    file_size: Number,
    contenu_chiffre: { type: String },  // ← enlever required: true
    iv: { type: String },               // ← enlever required: true
    hash: String,
    qr_data: {
        masterKey: { type: String },    // ← enlever required: true
        qr: String
    },
    allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actif: { type: Boolean, default: true }
}, { timestamps: true });
// ── AUDIT ────────────────────────────
const auditLogSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    document_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    action: String,
    status: String
}, { timestamps: true });


// ── TOKEN BLACKLIST ──────────────────
const tokenBlacklistSchema = new mongoose.Schema({
    token_jti: { type: String, unique: true },
    expires_at: Date
});


module.exports = {
    User: mongoose.model('User', userSchema),
    Document: mongoose.model('Document', documentSchema),
    AuditLog: mongoose.model('AuditLog', auditLogSchema),
    TokenBlacklist: mongoose.model('TokenBlacklist', tokenBlacklistSchema)
};