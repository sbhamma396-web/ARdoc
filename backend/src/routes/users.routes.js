const express = require('express');
const router = express.Router();
const { User, AuditLog, Document } = require('../models/schemas');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// ════════════════════════════════════════════════════
// GESTION DES UTILISATEURS
// ════════════════════════════════════════════════════

// Liste tous les utilisateurs (avec stats)
router.get('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { search, role, actif, page = 1, limit = 50 } = req.query;
        const filter = {};
        if (search) filter.$or = [
            { nom: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
        if (role) filter.role = role;
        if (actif !== undefined) filter.actif = actif === 'true';

        const [users, total] = await Promise.all([
            User.find(filter)
                .select('-password_hash -mfa_secret -mfa_backup_codes -webauthn_credentials')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(Number(limit)),
            User.countDocuments(filter)
        ]);

        res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ════════════════════════════════════════════════════
// AUDIT LOGS
// ════════════════════════════════════════════════════

// Logs avec filtres avancés
router.get('/logs', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { user_id, document_id, action, status, from, to, page = 1, limit = 100 } = req.query;
        const filter = {};
        if (user_id)     filter.user_id     = user_id;
        if (document_id) filter.document_id = document_id;
        if (action)      filter.action      = action;
        if (status)      filter.status      = status;
        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = new Date(from);
            if (to)   filter.createdAt.$lte = new Date(to);
        }

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .populate('user_id', 'nom email role')
                .populate('document_id', 'nom file_type')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(Number(limit)),
            AuditLog.countDocuments(filter)
        ]);

        res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ════════════════════════════════════════════════════
// DASHBOARD — KPIs et statistiques
// ════════════════════════════════════════════════════

// Stats globales du dashboard
router.get('/dashboard/stats', authenticate, authorize('admin'), async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(today - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalUsers, activeUsers, totalDocs,
            accessToday, accessGrantedToday, accessDeniedToday,
            accessThisWeek, accessThisMonth,
            usersByRole, accessByHour, recentAlerts
        ] = await Promise.all([
            // Utilisateurs
            User.countDocuments(),
            User.countDocuments({ actif: true }),

            // Documents
            Document.countDocuments(),

            // Accès aujourd'hui
            AuditLog.countDocuments({ action: 'access_check', createdAt: { $gte: today } }),
            AuditLog.countDocuments({ action: 'access_check', status: 'SUCCESS', createdAt: { $gte: today } }),
            AuditLog.countDocuments({ action: 'access_check', status: 'DENIED', createdAt: { $gte: today } }),

            // Accès semaine / mois
            AuditLog.countDocuments({ action: 'access_check', createdAt: { $gte: thisWeek } }),
            AuditLog.countDocuments({ action: 'access_check', createdAt: { $gte: thisMonth } }),

            // Répartition par rôle
            User.aggregate([
                { $group: { _id: '$role', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),

            // Accès par heure (dernières 24h) — courbe d'activité
            AuditLog.aggregate([
                { $match: { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
                { $group: {
                    _id: { $hour: '$createdAt' },
                    total: { $sum: 1 },
                    granted: { $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] } },
                    denied:  { $sum: { $cond: [{ $eq: ['$status', 'DENIED'] }, 1, 0] } }
                }},
                { $sort: { '_id': 1 } }
            ]),

            // Alertes récentes (accès refusés des 24 dernières heures)
            AuditLog.find({
                status: 'DENIED',
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            })
            .populate('user_id', 'nom email')
            .populate('document_id', 'nom')
            .sort({ createdAt: -1 })
            .limit(10)
        ]);

        res.json({
            users: { total: totalUsers, active: activeUsers, inactive: totalUsers - activeUsers },
            documents: { total: totalDocs },
            access: {
                today: { total: accessToday, granted: accessGrantedToday, denied: accessDeniedToday },
                week:  { total: accessThisWeek },
                month: { total: accessThisMonth },
                successRate: accessToday > 0
                    ? Math.round((accessGrantedToday / accessToday) * 100)
                    : 0,
            },
            charts: { byHour: accessByHour, byRole: usersByRole },
            alerts: recentAlerts,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Top documents les plus accédés
router.get('/dashboard/top-documents', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { limit = 10, period = '7d' } = req.query;
        const periods = { '24h': 1, '7d': 7, '30d': 30 };
        const days = periods[period] || 7;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const topDocs = await AuditLog.aggregate([
            { $match: { document_id: { $ne: null }, createdAt: { $gte: since } } },
            { $group: {
                _id: '$document_id',
                totalAccess: { $sum: 1 },
                granted: { $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] } },
                denied:  { $sum: { $cond: [{ $eq: ['$status', 'DENIED'] }, 1, 0] } },
                uniqueUsers: { $addToSet: '$user_id' }
            }},
            { $addFields: { uniqueUserCount: { $size: '$uniqueUsers' } } },
            { $sort: { totalAccess: -1 } },
            { $limit: Number(limit) },
            { $lookup: { from: 'documents', localField: '_id', foreignField: '_id', as: 'document' } },
            { $unwind: { path: '$document', preserveNullAndEmptyArrays: true } },
            { $project: { uniqueUsers: 0 } }
        ]);

        res.json(topDocs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Top utilisateurs les plus actifs
router.get('/dashboard/top-users', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { limit = 10, period = '7d' } = req.query;
        const days = { '24h': 1, '7d': 7, '30d': 30 }[period] || 7;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const topUsers = await AuditLog.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: {
                _id: '$user_id',
                totalActions: { $sum: 1 },
                successes: { $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] } },
                denied:    { $sum: { $cond: [{ $eq: ['$status', 'DENIED'] }, 1, 0] } },
                lastAction: { $max: '$createdAt' }
            }},
            { $sort: { totalActions: -1 } },
            { $limit: Number(limit) },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            { $project: { 'user.password_hash': 0, 'user.mfa_secret': 0 } }
        ]);

        res.json(topUsers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Activité en temps réel (derniers événements — pour WebSocket fallback)
router.get('/dashboard/live', authenticate, authorize('admin'), async (req, res) => {
    try {
        const events = await AuditLog.find()
            .populate('user_id', 'nom email role')
            .populate('document_id', 'nom')
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(events);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Détail d'un utilisateur avec ses stats d'accès
router.get('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password_hash -mfa_secret -mfa_backup_codes -webauthn_credentials');
        if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

        // Statistiques d'accès de cet utilisateur
        const [totalAccess, grantedAccess, deniedAccess, lastAccess] = await Promise.all([
            AuditLog.countDocuments({ user_id: user._id }),
            AuditLog.countDocuments({ user_id: user._id, status: 'SUCCESS' }),
            AuditLog.countDocuments({ user_id: user._id, status: 'DENIED' }),
            AuditLog.findOne({ user_id: user._id }).sort({ createdAt: -1 }).select('createdAt action')
        ]);

        res.json({ ...user.toObject(), stats: { totalAccess, grantedAccess, deniedAccess, lastAccess } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ════════════════════════════════════════════════════
// AUDIT LOGS
// ════════════════════════════════════════════════════

// Logs avec filtres avancés
router.get('/logs', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { user_id, document_id, action, status, from, to, page = 1, limit = 100 } = req.query;
        const filter = {};
        if (user_id)     filter.user_id     = user_id;
        if (document_id) filter.document_id = document_id;
        if (action)      filter.action      = action;
        if (status)      filter.status      = status;
        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = new Date(from);
            if (to)   filter.createdAt.$lte = new Date(to);
        }

        const [logs, total] = await Promise.all([
            AuditLog.find(filter)
                .populate('user_id', 'nom email role')
                .populate('document_id', 'nom file_type')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(Number(limit)),
            AuditLog.countDocuments(filter)
        ]);

        res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ════════════════════════════════════════════════════
// DASHBOARD — KPIs et statistiques
// ════════════════════════════════════════════════════

// Stats globales du dashboard
router.get('/dashboard/stats', authenticate, authorize('admin'), async (req, res) => {
    try {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const thisWeek = new Date(today - 7 * 24 * 60 * 60 * 1000);
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalUsers, activeUsers, totalDocs,
            accessToday, accessGrantedToday, accessDeniedToday,
            accessThisWeek, accessThisMonth,
            usersByRole, accessByHour, recentAlerts
        ] = await Promise.all([
            // Utilisateurs
            User.countDocuments(),
            User.countDocuments({ actif: true }),

            // Documents
            Document.countDocuments(),

            // Accès aujourd'hui
            AuditLog.countDocuments({ action: 'access_check', createdAt: { $gte: today } }),
            AuditLog.countDocuments({ action: 'access_check', status: 'SUCCESS', createdAt: { $gte: today } }),
            AuditLog.countDocuments({ action: 'access_check', status: 'DENIED', createdAt: { $gte: today } }),

            // Accès semaine / mois
            AuditLog.countDocuments({ action: 'access_check', createdAt: { $gte: thisWeek } }),
            AuditLog.countDocuments({ action: 'access_check', createdAt: { $gte: thisMonth } }),

            // Répartition par rôle
            User.aggregate([
                { $group: { _id: '$role', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),

            // Accès par heure (dernières 24h) — courbe d'activité
            AuditLog.aggregate([
                { $match: { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
                { $group: {
                    _id: { $hour: '$createdAt' },
                    total: { $sum: 1 },
                    granted: { $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] } },
                    denied:  { $sum: { $cond: [{ $eq: ['$status', 'DENIED'] }, 1, 0] } }
                }} ,
                { $sort: { '_id': 1 } }
            ]),

            // Alertes récentes (accès refusés des 24 dernières heures)
            AuditLog.find({
                status: 'DENIED',
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
            })
            .populate('user_id', 'nom email')
            .populate('document_id', 'nom')
            .sort({ createdAt: -1 })
            .limit(10)
        ]);

        res.json({
            users: { total: totalUsers, active: activeUsers, inactive: totalUsers - activeUsers },
            documents: { total: totalDocs },
            access: {
                today: { total: accessToday, granted: accessGrantedToday, denied: accessDeniedToday },
                week:  { total: accessThisWeek },
                month: { total: accessThisMonth },
                successRate: accessToday > 0
                    ? Math.round((accessGrantedToday / accessToday) * 100)
                    : 0,
            },
            charts: { byHour: accessByHour, byRole: usersByRole },
            alerts: recentAlerts,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Top documents les plus accédés
router.get('/dashboard/top-documents', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { limit = 10, period = '7d' } = req.query;
        const periods = { '24h': 1, '7d': 7, '30d': 30 };
        const days = periods[period] || 7;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const topDocs = await AuditLog.aggregate([
            { $match: { document_id: { $ne: null }, createdAt: { $gte: since } } },
            { $group: {
                _id: '$document_id',
                totalAccess: { $sum: 1 },
                granted: { $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] } },
                denied:  { $sum: { $cond: [{ $eq: ['$status', 'DENIED'] }, 1, 0] } },
                uniqueUsers: { $addToSet: '$user_id' }
            }},
            { $addFields: { uniqueUserCount: { $size: '$uniqueUsers' } } },
            { $sort: { totalAccess: -1 } },
            { $limit: Number(limit) },
            { $lookup: { from: 'documents', localField: '_id', foreignField: '_id', as: 'document' } },
            { $unwind: { path: '$document', preserveNullAndEmptyArrays: true } },
            { $project: { uniqueUsers: 0 } }
        ]);

        res.json(topDocs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Top utilisateurs les plus actifs
router.get('/dashboard/top-users', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { limit = 10, period = '7d' } = req.query;
        const days = { '24h': 1, '7d': 7, '30d': 30 }[period] || 7;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        const topUsers = await AuditLog.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: {
                _id: '$user_id',
                totalActions: { $sum: 1 },
                successes: { $sum: { $cond: [{ $eq: ['$status', 'SUCCESS'] }, 1, 0] } },
                denied:    { $sum: { $cond: [{ $eq: ['$status', 'DENIED'] }, 1, 0] } },
                lastAction: { $max: '$createdAt' }
            }},
            { $sort: { totalActions: -1 } },
            { $limit: Number(limit) },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
            { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
            { $project: { 'user.password_hash': 0, 'user.mfa_secret': 0 } }
        ]);

        res.json(topUsers);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Activité en temps réel (derniers événements — pour WebSocket fallback)
router.get('/dashboard/live', authenticate, authorize('admin'), async (req, res) => {
    try {
        const events = await AuditLog.find()
            .populate('user_id', 'nom email role')
            .populate('document_id', 'nom')
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(events);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Modifier le rôle d'un utilisateur
router.put('/:id/role', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { role } = req.body;
        const validRoles = ['admin', 'medecin', 'juriste', 'lecteur'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: `Rôle invalide. Valeurs: ${validRoles.join(', ')}` });
        }
        const user = await User.findByIdAndUpdate(
            req.params.id, { role }, { new: true }
        ).select('-password_hash -mfa_secret');

        if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
        await AuditLog.create({ user_id: req.user.sub, action: 'admin_role_change', status: 'SUCCESS',
            details: `User ${user.email} → role ${role}` });
        res.json({ message: 'Rôle mis à jour', user });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Activer / désactiver un compte
router.put('/:id/toggle', authenticate, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
        if (user._id.toString() === req.user.sub) {
            return res.status(400).json({ message: 'Impossible de désactiver votre propre compte' });
        }
        user.actif = !user.actif;
        await user.save();
        await AuditLog.create({ user_id: req.user.sub, action: user.actif ? 'admin_user_enabled' : 'admin_user_disabled',
            status: 'SUCCESS', details: `User ${user.email}` });
        res.json({ message: user.actif ? 'Utilisateur activé' : 'Utilisateur désactivé', actif: user.actif });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Réinitialiser le MFA d'un utilisateur (admin uniquement)
router.delete('/:id/mfa', authenticate, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, {
            mfa_enabled: false, mfa_secret: null, mfa_backup_codes: []
        }, { new: true });
        if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
        await AuditLog.create({ user_id: req.user.sub, action: 'admin_mfa_reset', status: 'SUCCESS',
            details: `User ${user.email}` });
        res.json({ message: 'MFA réinitialisé pour ' + user.email });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Supprimer un utilisateur
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
        if (user._id.toString() === req.user.sub) {
            return res.status(400).json({ message: 'Impossible de supprimer votre propre compte' });
        }
        await User.findByIdAndDelete(req.params.id);
        await AuditLog.create({ user_id: req.user.sub, action: 'admin_user_deleted', status: 'SUCCESS',
            details: `User ${user.email}` });
        res.json({ message: 'Utilisateur supprimé' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ════════════════════════════════════════════════════
// GESTION DES DOCUMENTS (admin)
// ════════════════════════════════════════════════════

// Liste tous les documents avec leurs stats d'accès
router.get('/documents', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { search, page = 1, limit = 50 } = req.query;
        const filter = {};
        if (search) filter.nom = { $regex: search, $options: 'i' };

        const [documents, total] = await Promise.all([
            Document.find(filter)
                .select('-content_chiffre')  // ne pas renvoyer le contenu chiffré
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(Number(limit)),
            Document.countDocuments(filter)
        ]);

        res.json({ documents, total, page: Number(page), pages: Math.ceil(total / limit) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Révoquer l'accès à un document (le désactiver sans le supprimer)
router.put('/documents/:id/revoke', authenticate, authorize('admin'), async (req, res) => {
    try {
        const doc = await Document.findByIdAndUpdate(
            req.params.id, { actif: false }, { new: true }
        );
        if (!doc) return res.status(404).json({ message: 'Document introuvable' });
        await AuditLog.create({ user_id: req.user.sub, document_id: doc._id,
            action: 'admin_doc_revoked', status: 'SUCCESS' });
        res.json({ message: `Accès révoqué pour "${doc.nom}"` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Réactiver un document
router.put('/documents/:id/restore', authenticate, authorize('admin'), async (req, res) => {
    try {
        const doc = await Document.findByIdAndUpdate(
            req.params.id, { actif: true }, { new: true }
        );
        if (!doc) return res.status(404).json({ message: 'Document introuvable' });
        await AuditLog.create({ user_id: req.user.sub, document_id: doc._id,
            action: 'admin_doc_restored', status: 'SUCCESS' });
        res.json({ message: `Document "${doc.nom}" réactivé` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Supprimer définitivement un document
router.delete('/documents/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const doc = await Document.findByIdAndDelete(req.params.id);
        if (!doc) return res.status(404).json({ message: 'Document introuvable' });
        await AuditLog.create({ user_id: req.user.sub, document_id: doc._id,
            action: 'admin_doc_deleted', status: 'SUCCESS', details: `Doc: ${doc.nom}` });
        res.json({ message: `Document "${doc.nom}" supprimé définitivement` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});









// ════════════════════════════════════════════════════
// POLITIQUES UTILISATEUR (gps_zone, time_window, device_id)
// ════════════════════════════════════════════════════
router.put('/users/:id/policy', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { gps_zone, time_window, device_id } = req.body;
        const update = {};
        if (gps_zone !== undefined) update.gps_zone = gps_zone;
        if (time_window !== undefined) update.time_window = time_window;
        if (device_id !== undefined) update.device_id = device_id;
        const user = await User.findByIdAndUpdate(req.params.id, update, { new: true })
            .select('-password_hash -mfa_secret -mfa_backup_codes');
        if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
        await AuditLog.create({ user_id: req.user.sub, action: 'admin_update_user_policy', status: 'SUCCESS' });
        res.json({ message: 'Politique utilisateur mise à jour', user });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ════════════════════════════════════════════════════
// GESTION DES UTILISATEURS AUTORISÉS POUR UN DOCUMENT
// ════════════════════════════════════════════════════
router.get('/documents/:id/users', authenticate, authorize('admin'), async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id).populate('allowedUsers', 'nom email role');
        if (!doc) return res.status(404).json({ message: 'Document introuvable' });
        res.json({ allowedUsers: doc.allowedUsers });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

router.put('/documents/:id/users', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { userIds } = req.body; // tableau d'ObjectId
        const doc = await Document.findByIdAndUpdate(req.params.id, { allowedUsers: userIds }, { new: true });
        if (!doc) return res.status(404).json({ message: 'Document introuvable' });
        await AuditLog.create({ user_id: req.user.sub, document_id: doc._id, action: 'admin_update_allowed_users', status: 'SUCCESS' });
        res.json({ message: 'Utilisateurs autorisés mis à jour', allowedUsers: doc.allowedUsers });
    } catch (err) { res.status(500).json({ message: err.message }); }
});

// ════════════════════════════════════════════════════
// STATS SUPPLÉMENTAIRES (top documents, top users)
// ════════════════════════════════════════════════════
// (déjà présents dans votre code)

module.exports = router;










