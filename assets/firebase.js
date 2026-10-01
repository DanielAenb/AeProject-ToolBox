/* ============================================================
   FIREBASE · Inicialización y Auth
   assets/firebase.js
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

      authMod.onAuthStateChanged(auth, (user) => {
        if (user) {
          FB.user = user;
          FB._listeners.forEach(cb => { try { cb(user); } catch {} });
          if (!resolved) { resolved = true; resolveReady(FB); }
        }
      });

      // Clave: esperar a que Firebase restaure la sesión persistida
      await auth.authStateReady();

      // Solo crear anónimo si realmente no hay sesión
      if (!auth.currentUser) {
        try {
          await authMod.signInAnonymously(auth);
        } catch (err) {
          console.warn("[FB] No se pudo crear sesión anónima:", err);
          if (!resolved) { resolved = true; resolveReady(null); }
        }
      }

      // Login con Google (para sincronizar entre dispositivos)
      FB.loginGoogle = async () => {
        const provider = new authMod.GoogleAuthProvider();
        const cur = auth.currentUser;
        if (cur && cur.isAnonymous) {
          try {
            await authMod.linkWithPopup(cur, provider);
          } catch (e) {
            if (e.code === "auth/credential-already-in-use" ||
                e.code === "auth/email-already-in-use") {
              await authMod.signInWithPopup(auth, provider);
            } else {
              throw e;
            }
          }
        } else {
          await authMod.signInWithPopup(auth, provider);
        }
      };

      FB.logout = async () => {
        await authMod.signOut(auth);
        await authMod.signInAnonymously(auth);
      };

      // Timeout de seguridad: si en 8s no pasó nada, resolvemos null
      setTimeout(() => {
        if (!resolved) { resolved = true; resolveReady(null); }
      }, 8000);

    } catch (e) {
      console.warn("[FB] Firebase no disponible. Modo local activado.", e);
      resolveReady(null);
    }
  })();
})();