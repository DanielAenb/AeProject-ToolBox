/* ============================================================
   FIREBASE · Inicialización y Auth
   assets/firebase.js

   Carga Firebase por CDN desde un script clásico (no module).
   Cuando termina, expone window.FB con:

   FB.ready       → Promise que resuelve cuando Firebase está listo
   FB.db          → Firestore
   FB.auth        → Auth
   FB.user        → usuario actual (o null)
   FB.onUser(cb)  → suscribirse a cambios de auth
   FB.loginGoogle() → vincula la sesión anónima a Google
   FB.logout()    → cierra sesión

   Si Firebase falla (sin internet, CDN caído, proyecto mal config),
   FB.ready resuelve null y todo el taller sigue funcionando con
   localStorage como respaldo.
   ============================================================ */

(function () {
  const VERSION = "10.12.2";
  const CDN = "https://www.gstatic.com/firebasejs/" + VERSION + "/";

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAp8ZT61c7rwiTyB8ICcY0jQJZ85ofVKPs",
    authDomain: "ae-project-studio.firebaseapp.com",
    projectId: "ae-project-studio",
    storageBucket: "ae-project-studio.firebasestorage.app",
    messagingSenderId: "156536186593",
    appId: "1:156536186593:web:e6e4c750ef573fa405b9a0"
  };

  let resolveReady;
  const readyPromise = new Promise(res => { resolveReady = res; });

  const FB = {
    ready: readyPromise,
    db: null,
    auth: null,
    user: null,
    _firestore: null,
    _authMod: null,
    _listeners: [],
    onUser(cb) {
      this._listeners.push(cb);
      if (this.user) cb(this.user);
    },
    loginGoogle: async () => {},
    logout: async () => {},
  };

  window.FB = FB;

  (async () => {
    try {
      const [
        { initializeApp },
        firestoreMod,
        authMod,
      ] = await Promise.all([
        import(CDN + "firebase-app.js"),
        import(CDN + "firebase-firestore.js"),
        import(CDN + "firebase-auth.js"),
      ]);

      const app = initializeApp(FIREBASE_CONFIG);
      const db = firestoreMod.getFirestore(app);
      const auth = authMod.getAuth(app);

      FB.db = db;
      FB.auth = auth;
      FB._firestore = firestoreMod;
      FB._authMod = authMod;

      let resolved = false;

      authMod.onAuthStateChanged(auth, async (user) => {
        if (user) {
          FB.user = user;
          FB._listeners.forEach(cb => { try { cb(user); } catch {} });
          if (!resolved) { resolved = true; resolveReady(FB); }
        } else {
          // Sin sesión → entra como anónimo
          try {
            await authMod.signInAnonymously(auth);
            // Esto dispara onAuthStateChanged de nuevo con el user
          } catch (err) {
            console.warn("[FB] No se pudo iniciar sesión anónima:", err);
            if (!resolved) { resolved = true; resolveReady(null); }
          }
        }
      });

      // Login con Google (vincula la sesión anónima actual)
      FB.loginGoogle = async () => {
        const provider = new authMod.GoogleAuthProvider();
        const cur = auth.currentUser;
        if (cur && cur.isAnonymous) {
          try {
            await authMod.linkWithPopup(cur, provider);
          } catch (e) {
            if (e.code === "auth/credential-already-in-use" ||
                e.code === "auth/email-already-in-use") {
              // La cuenta ya existe → signIn normal (cambia de uid)
              await authMod.signInWithPopup(auth, provider);
            } else {
              throw e;
            }
          }
        } else {
          await authMod.signInWithPopup(auth, provider);
        }
      };

      // Logout → vuelve a sesión anónima
      FB.logout = async () => {
        await authMod.signOut(auth);
        await authMod.signInAnonymously(auth);
      };

      // Timeout de seguridad: si en 6s no pasó nada, resolvemos null
      setTimeout(() => {
        if (!resolved) { resolved = true; resolveReady(null); }
      }, 6000);

    } catch (e) {
      console.warn("[FB] Firebase no disponible. Modo local activado.", e);
      resolveReady(null);
    }
  })();
})();