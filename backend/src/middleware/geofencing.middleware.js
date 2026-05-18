function checkGpsZone(req, res, next) {
    const userZone = req.user.gps_zone;
    
    // Si pas de zone définie → accès libre
    if (!userZone) return next();

    const { gps_lat, gps_lng } = req.body;

    // Si zone définie mais pas de GPS fourni
    if (!gps_lat || !gps_lng) {
        return res.status(403).json({
            message: 'Accès refusé — coordonnées GPS requises',
            status: 'DENY'
        });
    }

    // Zones autorisées
    const zones = {
        'CHU_SFAX': { lat: 34.7406, lng: 10.7603, radius: 500 },
        'ISIMG': { lat: 34.7398, lng: 10.7600, radius: 300 },
        'TRIBUNAL': { lat: 34.7440, lng: 10.7580, radius: 200 }
    };

    const zone = zones[userZone];
    if (!zone) return next();

    // Calcul distance (Haversine)
    const distance = calculateDistance(
        parseFloat(gps_lat), parseFloat(gps_lng),
        zone.lat, zone.lng
    );

    if (distance > zone.radius) {
        return res.status(403).json({
            message: `Accès refusé — hors zone autorisée (${userZone})`,
            distance: Math.round(distance) + 'm',
            status: 'DENY'
        });
    }

    next();
}

// ── Calcul distance Haversine (mètres) ───────────
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

module.exports = { checkGpsZone };