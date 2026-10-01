/* ============================================================
   CLOUD · Capa de abstracción Firestore + localStorage + ImgBB
   assets/cloud.js

   Estructura de Firestore (compartida entre todos los dispositivos):
     hooks                    → documento único { list, updatedAt }
     guiones/{id}             → un documento por guion

   API:
     cloud.load(path, fallback)     → lee un documento por path
     cloud.save(path, value)        → escribe un documento por path
     cloud.delete(path)             → borra un documento
     cloud.list(collection)         → devuelve todos los docs de una colección
     cloud.imgbb.upload(file)       → sube imagen, devuelve { url, thumbUrl, deleteUrl }
     cloud.imgbb.remove(deleteUrl)  → borra imagen
   ============================================================ */

window.cloud = (() => {
  const TIMEOUT = 8000;

  /* ------------------------------------------------------------
     IMGBB · Sustituye por tu API key
     ------------------------------------------------------------ */
  const IMGBB_KEY = "f9fb92f002a7223797acfb562f6e5e7f";
  const IMGBB_ENDPOINT = "https://api.imgbb.com/1/upload";

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))
    ]);
  }

  async function getFB() {
    if (!window.FB) return null;
    try { return await withTimeout(window.FB.ready, TIMEOUT); }
    catch { return null; }
  }

  /* ============================================================
     DOCUMENTOS · genéricos por path
     ============================================================ */

  /**
   * Lee un documento por path.
   * Ej: cloud.load("hooks") o cloud.load("guiones/abc123")
   */

  async function load(path, fallback = null) {
    // Auto-corregir paths de un solo segmento → config/{path}
    if (!path.includes("/")) path = "config/" + path;

    const cacheKey = "cloud-cache-" + path;
    let localCached = null;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) localCached = JSON.parse(raw);
    } catch {}

    const fb = await getFB();
    if (!fb || !fb.user) return localCached !== null ? localCached : fallback;

    try {
      const { doc, getDoc } = fb._firestore;
      const ref = doc(fb.db, path);
      const snap = await withTimeout(getDoc(ref), TIMEOUT);

      if (snap.exists()) {
        const remote = snap.data();
        try { localStorage.setItem(cacheKey, JSON.stringify(remote)); } catch {}
        return remote;
      }

      return localCached !== null ? localCached : fallback;
    } catch (e) {
      console.warn("[cloud] load falló para", path, ":", e.message);
      return localCached !== null ? localCached : fallback;
    }
  }

  /**
   * Escribe un documento por path.
   * Ej: cloud.save("hooks", { list: [...] })
   */
  async function save(path, value) {
    if (!path.includes("/")) path = "config/" + path;

    const cacheKey = "cloud-cache-" + path;
    try { localStorage.setItem(cacheKey, JSON.stringify(value)); } catch {}

    const fb = await getFB();
    if (!fb || !fb.user) return;

    try {
      const { doc, setDoc } = fb._firestore;
      const ref = doc(fb.db, path);
      await setDoc(ref, value);
    } catch (e) {
      console.warn("[cloud] save falló para", path, ":", e.message);
    }
  }
  
  /**
   * Borra un documento por path.
   */
  async function remove(path) {
    if (!path.includes("/")) path = "config/" + path;

    const cacheKey = "cloud-cache-" + path;
    try { localStorage.removeItem(cacheKey); } catch {}

    const fb = await getFB();
    if (!fb || !fb.user) return;

    try {
      const { doc, deleteDoc } = fb._firestore;
      await deleteDoc(doc(fb.db, path));
    } catch (e) {
      console.warn("[cloud] remove falló para", path, ":", e.message);
    }
  }

  /**
   * Lista todos los documentos de una colección.
   * Ej: cloud.list("guiones") → [{ id, ...data }, ...]
   */
  async function list(collectionName) {
    const fb = await getFB();
    if (!fb || !fb.user) return [];

    try {
      const { collection, getDocs } = fb._firestore;
      const ref = collection(fb.db, collectionName);
      const snap = await withTimeout(getDocs(ref), TIMEOUT);
      const results = [];
      snap.forEach(d => {
        results.push({ id: d.id, ...d.data() });
      });
      return results;
    } catch (e) {
      console.warn("[cloud] list falló para", collectionName, ":", e.message);
      return [];
    }
  }

  /* ============================================================
     ImgBB · subida y borrado de imágenes
     ============================================================ */

  async function imgbbUpload(fileOrBlob) {
    if (!IMGBB_KEY) {
      throw new Error("Falta IMGBB_KEY en cloud.js");
    }

    const formData = new FormData();
    formData.append("key", IMGBB_KEY);
    formData.append("image", fileOrBlob);

    const res = await fetch(IMGBB_ENDPOINT, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("ImgBB respondió " + res.status);
    }

    const data = await res.json();
    if (!data.success || !data.data) {
      throw new Error("ImgBB rechazó la imagen");
    }

    return {
      url: data.data.url,
      displayUrl: data.data.display_url || data.data.url,
      thumbUrl: data.data.thumb?.url || data.data.url,
      deleteUrl: data.data.delete_url || null,
    };
  }

  async function imgbbRemove(deleteUrl) {
    if (!deleteUrl) return false;
    try {
      const res = await fetch(deleteUrl, { method: "DELETE" });
      return res.ok;
    } catch (e) {
      console.warn("[cloud] imgbbRemove falló:", e.message);
      return false;
    }
  }

  /* ============================================================
     Export
     ============================================================ */
  return {
    load,
    save,
    remove,
    list,
    imgbb: {
      upload: imgbbUpload,
      remove: imgbbRemove,
    },
  };
})();