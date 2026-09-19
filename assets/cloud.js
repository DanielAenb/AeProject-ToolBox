/* ============================================================
   CLOUD · Capa de abstracción sobre Firestore + localStorage
   assets/cloud.js

   Uso desde cualquier herramienta:

     const data = await cloud.load("guion-v1", {});
     await cloud.save("guion-v1", state);

   Comportamiento:
   - load(): intenta Firestore primero. Si no hay nada, cae a
     localStorage y MIGRA los datos a Firestore en background.
   - save(): escribe en localStorage (instantáneo) y en Firestore
     (background, sin bloquear).

   Si Firebase no está listo, todo funciona contra localStorage.
   ============================================================ */

window.cloud = (() => {
  const TIMEOUT = 8000; // 8s por operación

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))
    ]);
  }

  async function getFB() {
    if (!window.FB) return null;
    try {
      return await withTimeout(window.FB.ready, TIMEOUT);
    } catch {
      return null;
    }
  }

  async function getUid() {
    const fb = await getFB();
    return fb && fb.user ? fb.user.uid : null;
  }

  async function load(key, fallback = null) {
    const fb = await getFB();

    // 1. Intenta Firestore
    if (fb && fb.user) {
      try {
        const { doc, getDoc } = fb._firestore;
        const ref = doc(fb.db, "users", fb.user.uid, "data", key);
        const snap = await withTimeout(getDoc(ref), TIMEOUT);

        if (snap.exists()) {
          const remote = snap.data().value;
          // Cache local para próxima carga offline
          try { localStorage.setItem(key, JSON.stringify(remote)); } catch {}
          return remote;
        }

        // Firestore vacío → ¿hay datos locales que migrar?
        const localRaw = localStorage.getItem(key);
        if (localRaw) {
          try {
            const local = JSON.parse(localRaw);
            // Sube en background
            save(key, local).catch(() => {});
            return local;
          } catch {}
        }
      } catch (e) {
        console.warn("[cloud] load falló, cae a localStorage:", e.message);
      }
    }

    // 2. Fallback a localStorage
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  async function save(key, value) {
    // Local primero (respuesta instantánea, funciona offline)
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}

    // Firestore en background
    const fb = await getFB();
    if (!fb || !fb.user) return;

    try {
      const { doc, setDoc } = fb._firestore;
      const ref = doc(fb.db, "users", fb.user.uid, "data", key);
      await setDoc(ref, {
        value,
        updatedAt: new Date().toISOString(),
        version: 1,
      });
    } catch (e) {
      console.warn("[cloud] save falló, quedó solo en local:", e.message);
    }
  }

  async function remove(key) {
    try { localStorage.removeItem(key); } catch {}
    const fb = await getFB();
    if (!fb || !fb.user) return;
    try {
      const { doc, deleteDoc } = fb._firestore;
      const ref = doc(fb.db, "users", fb.user.uid, "data", key);
      await deleteDoc(ref);
    } catch (e) {
      console.warn("[cloud] remove falló:", e.message);
    }
  }

  return { load, save, remove, getUid };
})();