/**
 * ARDocShield - Backend Application
 * ✅ Sert le frontend depuis public/
 * ✅ Cookie HttpOnly SameSite=Strict (même domaine ngrok)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
app.set('trust proxy', 1);

const authRoutes = require('./routes/auth.routes');
const documentsRoutes = require('./routes/documents.routes');
const usersRoutes = require('./routes/users.routes');
const accessRoutes = require('./routes/access.routes');

// ============================================================
// RATE LIMITING
// ============================================================
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { message: 'Trop de requêtes' },
    skip: (req) => req.url === '/api/health',
    validate: false,
    keyGenerator: (req) => {
        const forwarded = req.headers['x-forwarded-for'];
        return forwarded ? forwarded.split(',')[0] : (req.ip || 'unknown');
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { message: 'Trop de tentatives' },
    skipSuccessfulRequests: true,
    validate: false,
    keyGenerator: (req) => {
        const forwarded = req.headers['x-forwarded-for'];
        return forwarded ? forwarded.split(',')[0] : (req.ip || 'unknown');
    }
});

// ============================================================
// CORS — même domaine ngrok, pas besoin de cross-origin
// ============================================================
const NGROK_URL = process.env.NGROK_URL || '';

app.use(cors({
    origin: function(origin, callback) {
        // Accepter: même domaine (no origin), ngrok, localhost
        if (!origin) return callback(null, true);
        if (
            origin === NGROK_URL ||
            origin.includes('ngrok-free') ||
            origin.includes('ngrok.io') ||
            origin.includes('localhost')
        ) {
            return callback(null, true);
        }
        callback(null, true); // permissif en dev
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie']
}));

// ============================================================
// HELMET — désactiver CSP pour laisser jsQR et scripts locaux
// ============================================================
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "same-site" }
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(limiter);

// ============================================================
// STATIC FILES — doit être AVANT les routes API
// ============================================================
app.use(express.static(path.join(__dirname, 'public'), {
    // Ne pas cacher index.html pour éviter les problèmes de session
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-store');
        }
    }
}));

// ============================================================
// FAVICON
// ============================================================
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ============================================================
// LOGGING
// ============================================================
app.use((req, res, next) => {
    if (!req.url.startsWith('/api')) return next(); // ne pas logger les assets
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = forwarded ? forwarded.split(',')[0] : (req.ip || '?');
    console.log(`📨 ${req.method} ${req.url} — IP: ${clientIp}`);
    next();
});

// ============================================================
// PRÉ-FLIGHT OPTIONS
// ============================================================
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    res.header('Access-Control-Max-Age', '86400');
    res.status(204).send();
});

// ============================================================
// ROUTES API
// ============================================================
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api', accessRoutes);

// ============================================================
// FALLBACK — toutes les routes non-API servent index.html
// ✅ CRITIQUE : sans ça, /scan /doc etc. retournent 404
// ============================================================
app.get('*', (req, res) => {
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ message: 'Route API non trouvée' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// ERREURS GLOBALES
// ============================================================
app.use((err, req, res, next) => {
    console.error('💥 Erreur:', err.message);
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ message: 'Fichier trop volumineux (max 50MB)' });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'Fichier trop volumineux (max 50MB)' });
    }
    res.status(500).json({
        message: 'Erreur serveur',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

module.exports = app;