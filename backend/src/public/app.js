/**
 * ARDocShield - Frontend
 * ✅ Cookie HttpOnly pur
 * ✅ Affichage PDF avec pdf.js (zoom possible)
 * ✅ Affichage image avec zoom
 * ✅ Affichage texte avec zoom
 * ✅ Enregistrement empreinte digitale (WebAuthn)
 */

// ============================================================
// CONFIG
// ============================================================
const API_URL = "";
const SCAN_INTERVAL_MS = 300;

let scanning = false;
let lastDocId = null;
let scanTimer = null;
let currentUser = null;
let refreshInterval = null;

// ============================================================
// GPS
// ============================================================
window._gpsLat = null;
window._gpsLng = null;

function startGPS() {
    if (!navigator.geolocation) return;
    navigator.geolocation.watchPosition(
        pos => {
            window._gpsLat = pos.coords.latitude;
            window._gpsLng = pos.coords.longitude;
            console.log(`📍 GPS: ${window._gpsLat}, ${window._gpsLng}`);
        },
        err => console.warn("GPS non disponible:", err.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
}

// ============================================================
// LOGIN
// ============================================================
async function doLogin() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const errEl = document.getElementById("login-error");
    const btn = document.getElementById("loginBtn");

    errEl.style.display = 'none';
    if (!email || !password) {
        errEl.textContent = "Veuillez remplir tous les champs";
        errEl.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = 'Vérification...';

    try {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok && data.user) {
            currentUser = data.user; // ✅ mémoire uniquement
            showAR();
            startTokenRefresh();
        } else if (data.mfa_required) {
            window._mfaToken = data.mfa_token;
            btn.innerHTML = 'Se connecter';
            btn.disabled = false;
            showMFAScreen();
        } else {
            errEl.textContent = data.message || "Identifiants incorrects";
            errEl.style.display = 'block';
            btn.innerHTML = 'Se connecter';
            btn.disabled = false;
        }
    } catch (error) {
        errEl.textContent = "Erreur réseau";
        errEl.style.display = 'block';
        btn.innerHTML = 'Se connecter';
        btn.disabled = false;
    }
}

// ============================================================
// BIOMETRIE - ENREGISTREMENT EMPREINTE (WebAuthn)
// ============================================================
function bufferToBase64url(buffer) {
    const bytes = new Uint8Array(buffer);
    let str = '';
    for (const b of bytes) str += String.fromCharCode(b);
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToBuffer(b64url) {
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b64);
    return Uint8Array.from(raw, c => c.charCodeAt(0));
}

// Enregistrer une nouvelle empreinte (biométrie)
async function registerBiometric() {
    if (!window.PublicKeyCredential) {
        alert('WebAuthn non supporté sur ce navigateur');
        return false;
    }

    const userId = localStorage.getItem('userId');
    const userNom = localStorage.getItem('userNom');
    const userEmail = localStorage.getItem('userEmail');

    if (!userId || !userEmail) {
        alert('Veuillez vous connecter d\'abord');
        return false;
    }

    // Afficher l'overlay de scan biométrique
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:10000;display:flex;align-items:center;justify-content:center;flex-direction:column;color:white;';
    overlay.innerHTML = `
        <div style="text-align:center;">
            <div style="width:80px;height:80px;margin:0 auto 20px;">
                <svg viewBox="0 0 80 80" width="80" height="80">
                    <circle cx="40" cy="40" r="36" fill="none" stroke="white" stroke-width="4"/>
                    <circle cx="40" cy="40" r="36" fill="none" stroke="#00c9a7" stroke-width="4" stroke-dasharray="226" stroke-dashoffset="226" id="bio-arc" style="transform:rotate(-90deg);transform-origin:40px 40px;animation:bioScan 1.8s ease-in-out infinite;"/>
                </svg>
            </div>
            <div style="font-size:1.2rem;margin-bottom:10px;">🔐 Enregistrement biométrique</div>
            <div style="font-size:0.9rem;color:#aaa;">Placez votre doigt ou utilisez Face ID</div>
            <div style="margin-top:20px;"><button id="cancelBio" style="padding:8px 20px;background:#ef4444;border:none;border-radius:8px;color:white;cursor:pointer;">Annuler</button></div>
        </div>
    `;
    document.body.appendChild(overlay);

    try {
        // 1. Récupérer les options d'enregistrement
        const optRes = await fetch("/api/auth/biometric/register-options", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (!optRes.ok) throw new Error('Erreur récupération options');
        
        const options = await optRes.json();
        
        // Convertir les challenges
        options.challenge = base64urlToBuffer(options.challenge);
        options.user.id = base64urlToBuffer(options.user.id);
        if (options.excludeCredentials) {
            options.excludeCredentials = options.excludeCredentials.map(cred => ({
                ...cred,
                id: base64urlToBuffer(cred.id)
            }));
        }

        // 2. Demander la création de la clé
        const credential = await navigator.credentials.create({ publicKey: options });
        
     // Dans app.js - fonction registerBiometric
const registrationResponse = {
    id: credential.id,
    rawId: bufferToBase64url(credential.rawId),
    type: credential.type,
    response: {
        attestationObject: bufferToBase64url(credential.response.attestationObject),
        clientDataJSON: bufferToBase64url(credential.response.clientDataJSON),
        transports: credential.response.getTransports ? credential.response.getTransports() : []
    }
};

console.log('📦 Envoi au backend:', registrationResponse);
        // 4. Vérifier avec le backend
        const verRes = await fetch("/api/auth/biometric/register-verify", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(registrationResponse)
        });

        const verData = await verRes.json();
        
        if (verRes.ok) {
            alert('✅ Empreinte digitale enregistrée avec succès !\nVous pouvez maintenant utiliser la biométrie pour vous connecter.');
            return true;
        } else {
            throw new Error(verData.message || 'Erreur lors de l\'enregistrement');
        }
    } catch (err) {
        console.error('Erreur enregistrement biométrique:', err);
        alert('❌ Erreur: ' + err.message);
        return false;
    } finally {
        document.body.removeChild(overlay);
    }
}

// Authentification biométrique (login)
window.startBiometricAuth = async function() {
    if (!window.PublicKeyCredential) {
        alert('WebAuthn non supporté sur ce navigateur');
        return;
    }
    
    const email = document.getElementById('bio-email').value.trim();
    if (!email) {
        alert('Veuillez entrer votre email');
        return;
    }

    document.getElementById('bio-step-email').classList.add('hidden');
    document.getElementById('bio-error').classList.add('hidden');
    document.getElementById('bio-step-scanning').classList.remove('hidden');

    try {
        const optRes = await fetch("/api/auth/biometric/auth-options", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        
        if (!optRes.ok) throw new Error('Erreur récupération options');
        
        const options = await optRes.json();
        const { userId, ...credOptions } = options;

        credOptions.challenge = base64urlToBuffer(credOptions.challenge);
        credOptions.allowCredentials = (credOptions.allowCredentials || []).map(c => ({
            ...c, id: base64urlToBuffer(c.id)
        }));

        const assertion = await navigator.credentials.get({ publicKey: credOptions });

        const assertionJSON = {
            userId,
            id: assertion.id,
            rawId: bufferToBase64url(assertion.rawId),
            type: assertion.type,
            response: {
                authenticatorData: bufferToBase64url(assertion.response.authenticatorData),
                clientDataJSON: bufferToBase64url(assertion.response.clientDataJSON),
                signature: bufferToBase64url(assertion.response.signature),
                userHandle: assertion.response.userHandle ? bufferToBase64url(assertion.response.userHandle) : null
            }
        };

        const verRes = await fetch("/api/auth/biometric/auth-verify", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(assertionJSON)
        });
        
        const verData = await verRes.json();
        if (!verRes.ok) throw new Error(verData.message);

        document.getElementById('bio-step-scanning').classList.add('hidden');
        document.getElementById('bio-step-success').classList.remove('hidden');
        
        setTimeout(() => {
            if (verData.user) {
                currentUser = verData.user;
                startTokenRefresh();
                showAR();
            }
        }, 900);

    } catch (err) {
        document.getElementById('bio-step-scanning').classList.add('hidden');
        document.getElementById('bio-step-email').classList.remove('hidden');
        const errEl = document.getElementById('bio-error');
        if (errEl) {
            errEl.textContent = err.message || 'Erreur biométrie';
            errEl.classList.remove('hidden');
        }
    }
};

// ============================================================
// NAVIGATION
// ============================================================
function showAR() {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("mfa-screen").classList.add("hidden");
    document.getElementById("ar-screen").classList.remove("hidden");
    updateARHeader(); // ✅ mettre à jour nom/avatar
    startCamera();
    startGPS();
}
function showLoginScreen() {
    if (refreshInterval) clearInterval(refreshInterval);
    if (scanTimer) clearInterval(scanTimer);
    scanning = false;
    currentUser = null;
    lastDocId = null;

    document.getElementById("ar-screen").classList.add("hidden");
    document.getElementById("doc-panel").classList.add("hidden");
    document.getElementById("mfa-screen").classList.add("hidden");
    document.getElementById("login-screen").classList.remove("hidden");

    const emailEl = document.getElementById("email");
    const passEl = document.getElementById("password");
    if (emailEl) emailEl.value = '';
    if (passEl) passEl.value = '';
}

function logout() {
    fetch("/api/auth/logout", {
        method: 'POST',
        credentials: 'include'
    }).finally(() => showLoginScreen());
}

function closeDoc() {
    document.getElementById("doc-panel").classList.add("hidden");
    document.getElementById("ar-screen").classList.remove("hidden");
    scanning = true;
    lastDocId = null;
    setStatus("🔍 Cherche QR code...");
}

// ============================================================
// CAMERA
// ============================================================
async function startCamera() {
    const vid = document.getElementById("video");
    if (!vid) {
        console.error('❌ Element video introuvable');
        return;
    }

    if (vid.srcObject) {
        vid.srcObject.getTracks().forEach(t => t.stop());
        vid.srcObject = null;
    }

    if (scanTimer) {
        clearInterval(scanTimer);
        scanTimer = null;
    }

    const constraints = [
        { video: { facingMode: { exact: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } },
        { video: { facingMode: "environment" } },
        { video: { facingMode: "user" } },
        { video: true }
    ];

    let stream = null;
    for (const constraint of constraints) {
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraint);
            console.log('✅ Caméra démarrée');
            break;
        } catch (err) {
            console.warn('Contrainte échouée:', err.message);
        }
    }

    if (!stream) {
        setStatus("❌ Impossible d'accéder à la caméra");
        return;
    }

    vid.srcObject = stream;
    vid.setAttribute("playsinline", "true");
    vid.setAttribute("autoplay", "true");
    vid.muted = true;

    await new Promise((resolve) => {
        vid.onloadedmetadata = () => {
            vid.play().then(resolve).catch(resolve);
        };
        setTimeout(resolve, 3000);
    });

    console.log(`✅ Vidéo: ${vid.videoWidth}x${vid.videoHeight}`);
    setStatus("✅ Prêt — pointez sur un QR code");

    scanning = true;
    startScanning(vid);
}

// ============================================================
// SCAN QR
// ============================================================
function startScanning(vid) {
    if (scanTimer) clearInterval(scanTimer);

    const cnv = document.getElementById("canvas");
    if (!cnv) {
        console.error('❌ Canvas introuvable');
        return;
    }
    const ctx = cnv.getContext("2d", { willReadFrequently: true });

    console.log('🔍 Scan QR démarré');

    scanTimer = setInterval(() => {
        if (!scanning) return;
        if (!vid) return;
        if (vid.readyState < vid.HAVE_ENOUGH_DATA) return;
        if (vid.videoWidth === 0 || vid.videoHeight === 0) return;

        if (cnv.width !== vid.videoWidth || cnv.height !== vid.videoHeight) {
            cnv.width = vid.videoWidth;
            cnv.height = vid.videoHeight;
        }

        ctx.drawImage(vid, 0, 0, cnv.width, cnv.height);

        let imageData;
        try {
            imageData = ctx.getImageData(0, 0, cnv.width, cnv.height);
        } catch (e) {
            return;
        }

        const qr = jsQR(imageData.data, cnv.width, cnv.height, {
            inversionAttempts: "dontInvert"
        });

        if (qr && qr.data) {
            console.log('🎯 QR détecté:', qr.data);
            handleQR(qr.data);
        }
    }, SCAN_INTERVAL_MS);
}

// ============================================================
// OVERLAY DE VÉRIFICATION
// ============================================================
function showVerifyOverlay() {
    const card = document.getElementById("verify-card");
    if (card) card.classList.remove("denied");
    const title = document.getElementById("verify-title");
    if (title) title.textContent = "Vérification du document...";
    const reason = document.getElementById("denied-reason");
    if (reason) reason.classList.add("hidden");

    ["step-1", "step-2", "step-3"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove("visible", "done");
    });

    const overlay = document.getElementById("verify-overlay");
    if (overlay) overlay.classList.remove("hidden");

    setTimeout(() => document.getElementById("step-1")?.classList.add("visible"), 200);
    setTimeout(() => {
        document.getElementById("step-1")?.classList.add("done");
        document.getElementById("step-2")?.classList.add("visible");
    }, 700);
    setTimeout(() => {
        document.getElementById("step-2")?.classList.add("done");
        document.getElementById("step-3")?.classList.add("visible");
    }, 1200);
}

function completeVerifyGranted(callback) {
    setTimeout(() => document.getElementById("step-3")?.classList.add("done"), 1700);
    setTimeout(() => {
        document.getElementById("verify-overlay")?.classList.add("hidden");
        if (callback) callback();
    }, 2000);
}

function showVerifyDenied(reason, callback) {
    setTimeout(() => {
        document.getElementById("verify-card")?.classList.add("denied");
        const title = document.getElementById("verify-title");
        if (title) title.textContent = "Accès refusé";
        const dr = document.getElementById("denied-reason");
        if (dr) { dr.textContent = reason || "Accès non autorisé"; dr.classList.remove("hidden"); }
    }, 1400);
    setTimeout(() => {
        document.getElementById("verify-overlay")?.classList.add("hidden");
        if (callback) callback();
    }, 3200);
}

// ============================================================
// HANDLE QR
// ============================================================
async function handleQR(rawData) {
    let parsed;
    try {
        parsed = JSON.parse(rawData);
    } catch {
        return;
    }

    const docId = parsed.doc_id;
    if (!docId) return;

    if (docId === lastDocId) return;
    lastDocId = docId;

    scanning = false;
    console.log('📋 Document ID:', docId);

    showVerifyOverlay();

    try {
        const res = await fetch("/api/access-check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: 'include',
            body: JSON.stringify({
                doc_id: docId,
                gps_lat: window._gpsLat,
                gps_lng: window._gpsLng
            })
        });

        console.log('📡 access-check status:', res.status);

        if (res.status === 401) {
            document.getElementById("verify-overlay")?.classList.add("hidden");
            showLoginScreen();
            return;
        }

        const data = await res.json();
        console.log('📡 Réponse:', data.granted, data.reason || '');

        if (data.granted && data.content) {
            completeVerifyGranted(() => {
                showDocument(
                    data.document.nom,
                    data.content,
                    data.document.file_type || 'text',
                    data.document.mime_type || 'text/plain'
                );
            });
        } else {
            showVerifyDenied(data.reason || "Accès refusé", () => {
                lastDocId = null;
                scanning = true;
                setStatus("🔍 Cherche QR code...");
            });
        }
    } catch (error) {
        console.error('❌ Erreur réseau:', error);
        showVerifyDenied("Erreur réseau", () => {
            lastDocId = null;
            scanning = true;
            setStatus("🔍 Cherche QR code...");
        });
    }
}

// ============================================================
// RENDER PDF avec PDF.js (zoom supporté)
// ============================================================
async function renderPDF(container, base64Data) {
    const loader = document.createElement('div');
    loader.style.cssText = 'display:flex;align-items:center;justify-content:center;padding:40px;color:#666;gap:12px;';
    loader.innerHTML = '<div style="width:30px;height:30px;border:3px solid #e2e8f0;border-top-color:#00c9a7;border-radius:50%;animation:spin 0.8s linear infinite;"></div><span>Chargement du PDF...</span>';
    container.appendChild(loader);

    try {
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const loadingTask = pdfjsLib.getDocument({ data: bytes });
        const pdf = await loadingTask.promise;
        
        console.log(`📄 PDF chargé: ${pdf.numPages} pages`);

        container.removeChild(loader);

        // Conteneur avec scroll pour zoom
        const scrollContainer = document.createElement('div');
        scrollContainer.style.cssText = 'width:100%;height:70vh;overflow:auto;background:#f0f0f0;border-radius:12px;';
        
        const pagesContainer = document.createElement('div');
        pagesContainer.style.cssText = 'width:100%;padding:20px;';
        
        let currentScale = 1.2;
        let zoomLevel = 1.2;

        // Barre de zoom
        const zoomBar = document.createElement('div');
        zoomBar.style.cssText = 'position:sticky;top:0;background:rgba(0,0,0,0.8);padding:8px;border-radius:8px;margin-bottom:10px;display:flex;justify-content:center;gap:10px;z-index:10;';
        zoomBar.innerHTML = `
            <button id="zoom-out" style="background:#00c9a7;border:none;border-radius:5px;padding:5px 10px;color:white;cursor:pointer;">− Zoom</button>
            <span id="zoom-level" style="color:white;padding:5px;">${Math.round(zoomLevel * 100)}%</span>
            <button id="zoom-in" style="background:#00c9a7;border:none;border-radius:5px;padding:5px 10px;color:white;cursor:pointer;">Zoom +</button>
        `;
        
        pagesContainer.appendChild(zoomBar);

        const pageElements = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const originalViewport = page.getViewport({ scale: 1 });
            
            const pageWrapper = document.createElement('div');
            pageWrapper.style.cssText = 'margin-bottom:20px;text-align:center;';
            
            const pageNumber = document.createElement('div');
            pageNumber.style.cssText = 'text-align:center;font-size:12px;color:#666;margin-bottom:8px;';
            pageNumber.textContent = `Page ${pageNum} / ${pdf.numPages}`;
            
            const canvas = document.createElement('canvas');
            canvas.style.cssText = 'display:block;margin:0 auto;box-shadow:0 4px 12px rgba(0,0,0,0.15);border-radius:4px;';
            
            pageWrapper.appendChild(pageNumber);
            pageWrapper.appendChild(canvas);
            pagesContainer.appendChild(pageWrapper);
            
            pageElements.push({ page, canvas, originalWidth: originalViewport.width });
        }
        
        // Fonction pour mettre à jour l'échelle
        async function updateZoom() {
            for (const item of pageElements) {
                const viewport = item.page.getViewport({ scale: zoomLevel });
                item.canvas.width = viewport.width;
                item.canvas.height = viewport.height;
                item.canvas.style.width = 'auto';
                item.canvas.style.height = 'auto';
                const context = item.canvas.getContext('2d');
                await item.page.render({ canvasContext: context, viewport: viewport }).promise;
            }
            document.getElementById('zoom-level').textContent = `${Math.round(zoomLevel * 100)}%`;
        }
        
        // Événements zoom
        setTimeout(() => {
            const zoomInBtn = document.getElementById('zoom-in');
            const zoomOutBtn = document.getElementById('zoom-out');
            if (zoomInBtn) {
                zoomInBtn.onclick = () => {
                    zoomLevel = Math.min(zoomLevel + 0.2, 3);
                    updateZoom();
                };
            }
            if (zoomOutBtn) {
                zoomOutBtn.onclick = () => {
                    zoomLevel = Math.max(zoomLevel - 0.2, 0.5);
                    updateZoom();
                };
            }
        }, 100);
        
        scrollContainer.appendChild(pagesContainer);
        container.appendChild(scrollContainer);
        
        await updateZoom();
        
    } catch (err) {
        console.error('Erreur PDF:', err);
        container.removeChild(loader);
        container.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444;">❌ Erreur chargement PDF: ${err.message}</div>`;
    }
}

// ============================================================
// AFFICHAGE DOCUMENT AVEC ZOOM
// ============================================================
function showDocument(nom, contentBase64, fileType, mimeType) {
    const now = new Date();
    const username = currentUser?.nom || '—';
    const role = currentUser?.role || '—';

    const docName = document.getElementById("doc-name");
    if (docName) docName.textContent = nom;

    const docTs = document.getElementById("doc-timestamp");
    if (docTs) docTs.textContent = `Consulté le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}`;

    const wmUser = document.getElementById("wm-user");
    if (wmUser) wmUser.textContent = `${username} · ${role.toUpperCase()}`;

    const wmTime = document.getElementById("wm-time");
    if (wmTime) wmTime.textContent = now.toLocaleTimeString('fr-FR');

    const contentDiv = document.getElementById("doc-content");
    if (!contentDiv) return;
    contentDiv.innerHTML = '';

    if (!contentBase64) {
        contentDiv.innerHTML = '<div style="padding:40px;text-align:center;color:#ef4444;">❌ Contenu vide</div>';
        return;
    }

    try {
        let clean = contentBase64.trim();
        if (clean.includes(',')) clean = clean.split(',')[1];

        const binaryStr = atob(clean.substring(0, 32));
        const byte0 = binaryStr.charCodeAt(0);
        const byte1 = binaryStr.charCodeAt(1);
        const byte2 = binaryStr.charCodeAt(2);
        const byte3 = binaryStr.charCodeAt(3);

        // PDF avec zoom
        if (binaryStr.startsWith('%PDF') || (byte0 === 0x25 && byte1 === 0x50)) {
            console.log('📄 Affichage PDF avec zoom');
            renderPDF(contentDiv, clean);
        }
        // IMAGE avec zoom
        else if (byte0 === 0xFF && byte1 === 0xD8 || (byte0 === 0x89 && byte1 === 0x50)) {
            console.log('🖼️ Affichage Image avec zoom');
            const container = document.createElement('div');
            container.style.cssText = 'width:100%;height:70vh;overflow:auto;background:#f0f0f0;border-radius:12px;display:flex;justify-content:center;align-items:center;';
            
            const img = document.createElement('img');
            img.src = `data:${mimeType || 'image/jpeg'};base64,${clean}`;
            img.style.cssText = 'max-width:none;cursor:zoom-in;transition:transform 0.2s;';
            
            let scale = 1;
            img.onclick = () => {
                scale = scale === 1 ? 2 : 1;
                img.style.transform = `scale(${scale})`;
                img.style.cursor = scale === 1 ? 'zoom-in' : 'zoom-out';
            };
            
            container.appendChild(img);
            contentDiv.appendChild(container);
        }
        // TEXTE avec zoom
        else {
            console.log('📝 Affichage Texte avec zoom');
            let text = '';
            try {
                const bytes = Uint8Array.from(atob(clean), c => c.charCodeAt(0));
                text = new TextDecoder('utf-8').decode(bytes);
            } catch {
                text = atob(clean);
            }
            
            const container = document.createElement('div');
            container.style.cssText = 'width:100%;height:70vh;overflow:auto;background:#f8f9fa;border-radius:12px;';
            
            const pre = document.createElement('pre');
            pre.textContent = text;
            pre.style.cssText = 'white-space:pre-wrap;word-break:break-word;font-family:monospace;font-size:0.9rem;line-height:1.6;padding:25px;margin:0;';
            
            // Zoom texte avec Ctrl + Molette
            let fontSize = 14;
            container.addEventListener('wheel', (e) => {
                if (e.ctrlKey) {
                    e.preventDefault();
                    if (e.deltaY < 0) {
                        fontSize = Math.min(fontSize + 2, 28);
                    } else {
                        fontSize = Math.max(fontSize - 2, 8);
                    }
                    pre.style.fontSize = fontSize + 'px';
                }
            });
            
            container.appendChild(pre);
            contentDiv.appendChild(container);
            
            // Info zoom
            const zoomInfo = document.createElement('div');
            zoomInfo.style.cssText = 'position:fixed;bottom:70px;right:20px;background:rgba(0,0,0,0.6);color:white;padding:4px 10px;border-radius:20px;font-size:11px;z-index:100;';
            zoomInfo.textContent = 'Ctrl + Molette pour zoomer';
            document.body.appendChild(zoomInfo);
            setTimeout(() => zoomInfo.remove(), 5000);
        }
    } catch (err) {
        console.error('❌ Erreur affichage:', err);
        contentDiv.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444;">❌ Erreur: ${err.message}</div>`;
    }

    const vid = document.getElementById("video");
    const vid2 = document.getElementById("video2");
    if (vid?.srcObject && vid2) vid2.srcObject = vid.srcObject;

    document.getElementById("ar-screen")?.classList.add("hidden");
    document.getElementById("doc-panel")?.classList.remove("hidden");
}

// ============================================================
// PROTECTIONS
// ============================================================
function enableSecurityGuards() {
    document.addEventListener("copy", e => e.preventDefault());
    document.addEventListener("selectstart", e => e.preventDefault());
    document.addEventListener("contextmenu", e => e.preventDefault());
    
    window.addEventListener("beforeprint", () => { alert("❌ Impression bloquée"); });
    
    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey && ["c", "u", "s", "p"].includes(e.key.toLowerCase())) || e.key === "PrintScreen") {
            e.preventDefault();
        }
    });
}

function setStatus(msg) {
    const el = document.getElementById("status");
    if (el) el.textContent = msg;
}

// ============================================================
// AUTO-REFRESH TOKEN
// ============================================================
function startTokenRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(async () => {
        try {
            const res = await fetch("/api/auth/refresh", {
                method: 'POST',
                credentials: 'include'
            });
            if (res.ok) {
                console.log('🔄 Token rafraîchi');
            } else if (res.status === 401) {
                console.warn('⚠️ Session expirée');
                showLoginScreen();
            }
        } catch (err) {
            console.warn('Refresh échoué:', err.message);
        }
    }, 13 * 60 * 1000);
}

// ============================================================
// MFA
// ============================================================
let mfaTimerInterval = null;

function showMFAScreen() {
    document.getElementById('login-screen')?.classList.add('hidden');
    document.getElementById('mfa-screen')?.classList.remove('hidden');
    for (let i = 0; i < 6; i++) {
        const d = document.getElementById(`d${i}`);
        if (d) { d.value = ''; d.classList.remove('filled'); }
    }
    const mfaErr = document.getElementById('mfa-error');
    if (mfaErr) mfaErr.style.display = 'none';
    const mfaBtn = document.getElementById('mfaVerifyBtn');
    if (mfaBtn) mfaBtn.disabled = true;
    initMFADigits();
    startMFATimer();
    setTimeout(() => document.getElementById('d0')?.focus(), 100);
}

function startMFATimer() {
    if (mfaTimerInterval) clearInterval(mfaTimerInterval);
    const timerEl = document.getElementById('mfa-timer-text');
    if (!timerEl) return;
    function update() {
        const seconds = 30 - (Math.floor(Date.now() / 1000) % 30);
        timerEl.textContent = `Code valide encore ${seconds}s`;
        timerEl.style.color = seconds <= 5 ? '#ef4444' : '';
    }
    update();
    mfaTimerInterval = setInterval(update, 1000);
}

async function verifyMFACode() {
    let code = '';
    for (let i = 0; i < 6; i++) {
        const val = document.getElementById(`d${i}`)?.value || '';
        code += val;
    }
    if (code.length < 6) return;

    const btn = document.getElementById('mfaVerifyBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = 'Vérification...'; }

    try {
        const res = await fetch("/api/auth/mfa/verify", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ mfa_token: window._mfaToken, code })
        });
        const data = await res.json();

        if (res.ok && data.user) {
            if (mfaTimerInterval) clearInterval(mfaTimerInterval);
            currentUser = data.user;
            showAR();
            startTokenRefresh();
        } else {
            const mfaErr = document.getElementById('mfa-error');
            if (mfaErr) { mfaErr.textContent = data.message || 'Code invalide'; mfaErr.style.display = 'block'; }
            for (let i = 0; i < 6; i++) {
                const d = document.getElementById(`d${i}`);
                if (d) { d.value = ''; d.classList.remove('filled'); }
            }
            document.getElementById('d0')?.focus();
            if (btn) { btn.innerHTML = 'Confirmer'; btn.disabled = false; }
        }
    } catch {
        const mfaErr = document.getElementById('mfa-error');
        if (mfaErr) { mfaErr.textContent = 'Erreur réseau'; mfaErr.style.display = 'block'; }
        if (btn) { btn.innerHTML = 'Confirmer'; btn.disabled = false; }
    }
}

function backToLogin() {
    if (mfaTimerInterval) clearInterval(mfaTimerInterval);
    window._mfaToken = null;
    document.getElementById('mfa-screen')?.classList.add('hidden');
    document.getElementById('login-screen')?.classList.remove('hidden');
}

function initMFADigits() {
    for (let i = 0; i < 6; i++) {
        const input = document.getElementById(`d${i}`);
        if (!input) continue;
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        newInput.addEventListener('input', (e) => {
            const val = e.target.value.replace(/\D/g, '');
            e.target.value = val ? val[0] : '';
            e.target.classList.toggle('filled', !!val);
            if (val && i < 5) document.getElementById(`d${i + 1}`)?.focus();
            const allFilled = Array.from({ length: 6 }, (_, j) =>
                document.getElementById(`d${j}`)?.value
            ).every(v => v);
            const btn = document.getElementById('mfaVerifyBtn');
            if (btn) btn.disabled = !allFilled;
        });
        newInput.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !newInput.value && i > 0) {
                document.getElementById(`d${i - 1}`)?.focus();
            }
            if (e.key === 'Enter') verifyMFACode();
        });
    }
}

// ============================================================
// MENU UTILISATEUR AR
// ============================================================
function toggleUserMenu() {
    const dropdown = document.getElementById('arDropdown');
    const chevron = document.getElementById('arChevron');
    const isOpen = dropdown.classList.toggle('open');
    chevron.style.transform = isOpen ? 'rotate(180deg)' : '';
}

function closeUserMenu() {
    document.getElementById('arDropdown')?.classList.remove('open');
    const chevron = document.getElementById('arChevron');
    if (chevron) chevron.style.transform = '';
}

function updateARHeader() {
    if (!currentUser) return;
    const nom = currentUser.nom || '—';
    const role = currentUser.role || '—';

    // Initiales pour l'avatar
    const initiales = nom.split(' ')
        .map(w => w[0]?.toUpperCase() || '')
        .slice(0, 2).join('');

    const avatar = document.getElementById('arAvatar');
    const userName = document.getElementById('arUserName');
    const dropName = document.getElementById('arDropdownName');
    const dropRole = document.getElementById('arDropdownRole');

    if (avatar) avatar.textContent = initiales || '?';
    if (userName) userName.textContent = nom;
    if (dropName) dropName.textContent = nom;
    if (dropRole) dropRole.textContent = role.charAt(0).toUpperCase() + role.slice(1);
}

// Fermer menu si clic ailleurs
document.addEventListener('click', e => {
    const menu = document.getElementById('arUserMenu');
    if (menu && !menu.contains(e.target)) closeUserMenu();
});

// Badge GPS dans le menu
setInterval(() => {
    const badge = document.getElementById('gpsBadge');
    if (!badge) return;
    if (window._gpsLat !== null) {
        badge.textContent = 'Actif';
        badge.style.background = 'rgba(0,201,167,0.2)';
        badge.style.color = '#00c9a7';
    } else {
        badge.textContent = 'Inactif';
        badge.style.background = 'rgba(148,163,184,0.2)';
        badge.style.color = 'rgba(255,255,255,0.4)';
    }
}, 2000);

// ============================================================
// MODIFIER showAR — ajouter updateARHeader()
// ============================================================



// ============================================================
// INITIALISATION
// ============================================================
document.addEventListener("DOMContentLoaded", async () => {
    console.log('🚀 ARDocShield démarré');
    initMFADigits();
    enableSecurityGuards();

    try {
        const res = await fetch("/api/auth/me", { credentials: 'include' });
        if (res.ok) {
            currentUser = await res.json();
            console.log('✅ Session restaurée:', currentUser.nom);
            showAR();
            startTokenRefresh();
        } else {
            console.log('ℹ️ Pas de session active');
        }
    } catch (err) {
        console.warn('Vérification session:', err.message);
    }
});

// Fonction pour enregistrer empreinte (accessible depuis console ou menu)
window.enrollBiometric = registerBiometric;