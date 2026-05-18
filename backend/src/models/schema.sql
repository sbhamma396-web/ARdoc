const mongoose = require('mongoose');

// ── User Model ────────────────────────────────────
const userSchema = new mongoose.Schema({
    _id: { type: String, default: () => new mongoose.Types.UUID().toString() },
    nom:          { type: String, required: true, maxlength: 100 },
    email:        { type: String, required: true, unique: true, maxlength: 100 },
    password_hash:{ type: String, required: true },
    role:         { type: String, default: 'lecteur' },
    actif:        { type: Boolean, default: true },
    device_id:    { type: String },
    gps_zone:     { type: String },
    time_window:  { type: String, default: '00:00-23:59' },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// ── Document Model ────────────────────────────────
const documentSchema = new mongoose.Schema({
    _id:             { type: String, default: () => new mongoose.Types.UUID().toString() },
    nom:             { type: String, required: true, maxlength: 200 },
    contenu_chiffre: { type: String },
    iv:              { type: String },
    qr_data:         { type: mongoose.Schema.Types.Mixed },
    uploaded_by:     { type: String, ref: 'User' },
    actif:           { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// ── AuditLog Model ────────────────────────────────
const auditLogSchema = new mongoose.Schema({
    user_id:     { type: String, ref: 'User' },
    document_id: { type: String, ref: 'Document' },
    action:      { type: String, maxlength: 100 },
    ip_address:  { type: String, maxlength: 50 },
    gps_location:{ type: String, maxlength: 100 },
    status:      { type: String, maxlength: 20 },
    timestamp:   { type: Date, default: Date.now },
});

// ── TokenBlacklist Model ──────────────────────────
const tokenBlacklistSchema = new mongoose.Schema({
    token_jti:  { type: String, unique: true, required: true },
    expires_at: { type: Date, required: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

// TTL index : MongoDB supprime automatiquement les tokens expirés
tokenBlacklistSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const User           = mongoose.model('User', userSchema);
const Document       = mongoose.model('Document', documentSchema);
const AuditLog       = mongoose.model('AuditLog', auditLogSchema);
const TokenBlacklist = mongoose.model('TokenBlacklist', tokenBlacklistSchema);

module.exports = { User, Document, AuditLog, TokenBlacklist };