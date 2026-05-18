/**
 * ARDocShield - Server
 */

require('dotenv').config();
console.log('🔧 Environment variables loaded:');
console.log('   RP_ID:', process.env.RP_ID);
console.log('   RP_ORIGIN:', process.env.RP_ORIGIN);
const app = require('./app');
const connectDB = require('./models/db');

const PORT = process.env.PORT || 3000;
let server = null;

async function startServer() {
    try {
        await connectDB();
        console.log('✅ MongoDB connecté');
        
        server = app.listen(PORT, () => {
            console.log('\n═══════════════════════════════════════════════════════════');
            console.log(`🚀 ARDocShield Server`);
            console.log(`📡 Local: http://localhost:${PORT}`);
            console.log(`🍪 Cookies: HttpOnly | Secure | SameSite=None`);
            console.log('═══════════════════════════════════════════════════════════\n');
            
            const ngrokUrl = process.env.NGROK_URL;
            if (ngrokUrl) {
                console.log(`🌍 Ngrok URL: ${ngrokUrl}`);
            }
        });
        
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`❌ Port ${PORT} déjà utilisé`);
                process.exit(1);
            }
        });
        
    } catch (err) {
        console.error('❌ Erreur démarrage:', err);
        process.exit(1);
    }
}

function shutdown(signal) {
    console.log(`\n⚠️ Signal ${signal} reçu. Arrêt...`);
    if (server) {
        server.close(() => {
            console.log('✅ Serveur fermé');
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000);
    } else {
        process.exit(0);
    }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();