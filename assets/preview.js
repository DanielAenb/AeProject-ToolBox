/* ============================================================
   VISTA PREVIA DE REDES · LÓGICA
   assets/preview.js
   ============================================================ */

/* ============================================================
   PERSISTENCIA
   ────────────────────────────────────────────────────────────
   IndexedDB con dos stores:
   - "images": { id, dataUrl, name, order, visible }
   - "settings": un único registro "main" con la config
   Plan futuro: migrar a Firebase. Solo cambian dbPut/dbGet.
   ============================================================ */
const DB_NAME = "ae-preview";
const DB_VERSION = 1;
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("images")) {
        const store = db.createObjectStore("images", { keyPath: "id" });
        store.createIndex("order", "order");
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function dbGetAll(storeName) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function dbPut(storeName, value, key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(storeName, "readwrite");
    const req = key !== undefined
      ? tx.objectStore(storeName).put(value, key)
      : tx.objectStore(storeName).put(value);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function dbGet(storeName, key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(storeName, "readonly");
    const req = tx.objectStore(storeName).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function dbDelete(storeName, key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).delete(key);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}

async function dbClear(storeName) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(storeName, "readwrite");
    const req = tx.objectStore(storeName).clear();
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}

/* ============================================================
   ESTADO
   ($, $$, escapeHTML, today vienen de utils.js)
   ============================================================ */
const PROFILE_DEFAULT = {
  displayName: "ae.project",
  username: "ae.project.studio",
  bio: "Diseño · Contenido · Dirección visual",
  posts: 42,
  followers: "12.4K",
  following: 128,
  avatar: null,
};

let state = {
  images: [],
  settings: {
    mockup: "instagram",
    rows: "auto",
    size: 400,
    mockupTheme: "light",
    profile: { ...PROFILE_DEFAULT },
  },
};

/* ============================================================
   TOAST
   ============================================================ */
function toast(title, desc = "", variant = "brand") {
  const icons = {
    brand:   '<svg class="icon toast-icon" viewBox="0 0 24 24"><path d="M12 2v6l4 2"/><path d="M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0z"/></svg>',
    success: '<svg class="icon toast-icon" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    danger:  '<svg class="icon toast-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>',
    info:    '<svg class="icon toast-icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
  };
  const el = document.createElement("div");
  el.className = `toast ${variant}`;
  el.innerHTML = `
    ${icons[variant] || icons.info}
    <div style="flex:1">
      <div class="toast-title">${escapeHTML(title)}</div>
      ${desc ? `<div class="toast-desc">${escapeHTML(desc)}</div>` : ""}
    </div>
    <button class="toast-close" aria-label="Cerrar">
      <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </button>
  `;
  el.querySelector(".toast-close").addEventListener("click", () => el.remove());
  $("#toastHost").appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity .3s";
    setTimeout(() => el.remove(), 300);
  }, 3600);
}

/* ============================================================
   CARGA INICIAL
   ============================================================ */
async function loadAll() {
  const images = await dbGetAll("images");
  images.sort((a, b) => (a.order || 0) - (b.order || 0));
  state.images = images;

  const settings = await dbGet("settings", "main");
  if (settings) {
    state.settings = { ...state.settings, ...settings };
    if (!state.settings.profile) state.settings.profile = { ...PROFILE_DEFAULT };
    else state.settings.profile = { ...PROFILE_DEFAULT, ...state.settings.profile };
  }
}

async function saveSettings() {
  await dbPut("settings", state.settings, "main");
}

async function saveImage(img) {
  await dbPut("images", img);
}

/* ============================================================
   SUBIDA DE IMÁGENES
   ============================================================ */
function openFilePicker() {
  $("#fileInput").click();
}

async function handleFiles(files) {
  const arr = [...files].filter(f => f.type.startsWith("image/"));
  if (arr.length === 0) return;

  toast("Procesando imágenes…", arr.length + " archivo" + (arr.length === 1 ? "" : "s"), "info");

  let nextOrder = state.images.length ? Math.max(...state.images.map(i => i.order || 0)) + 1 : 0;

  for (const file of arr) {
    try {
      const dataUrl = await readFileAsDataURL(file);
      const img = {
        id: "img_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        dataUrl,
        name: file.name,
        order: nextOrder++,
        visible: true,
      };
      state.images.push(img);
      await saveImage(img);
    } catch (e) {
      console.error(e);
    }
  }

  renderAll();
  toast("Imágenes añadidas", arr.length + " nueva" + (arr.length === 1 ? "" : "s"), "success");
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function deleteImage(id) {
  state.images = state.images.filter(i => i.id !== id);
  await dbDelete("images", id);
  renderAll();
}

async function toggleImageVisible(id) {
  const img = state.images.find(i => i.id === id);
  if (!img) return;
  img.visible = !img.visible;
  await saveImage(img);
  renderAll();
}

async function toggleAll() {
  const anyVisible = state.images.some(i => i.visible);
  state.images.forEach(i => { i.visible = !anyVisible; });
  for (const img of state.images) await saveImage(img);
  renderAll();
}

async function clearAllImages() {
  if (state.images.length === 0) return;
  if (!confirm("¿Vaciar toda la biblioteca? Esta acción no se puede deshacer.")) return;
  state.images = [];
  await dbClear("images");
  renderAll();
  toast("Biblioteca vaciada", "", "info");
}

/* ============================================================
   DRAG & DROP (reordenar en biblioteca)
   ============================================================ */
let dragIndex = null;

function bindDragAndDrop() {
  $$(".lib-item").forEach(el => {
    el.addEventListener("dragstart", e => {
      dragIndex = +el.dataset.i;
      el.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    el.addEventListener("dragend", () => {
      el.classList.remove("dragging");
      $$(".lib-item").forEach(x => x.classList.remove("drop-target"));
    });
    el.addEventListener("dragover", e => {
      e.preventDefault();
      el.classList.add("drop-target");
    });
    el.addEventListener("dragleave", () => el.classList.remove("drop-target"));
    el.addEventListener("drop", async e => {
      e.preventDefault();
      const target = +el.dataset.i;
      if (dragIndex === null || dragIndex === target) return;
      const [moved] = state.images.splice(dragIndex, 1);
      state.images.splice(target, 0, moved);
      state.images.forEach((im, i) => im.order = i);
      for (const im of state.images) await saveImage(im);
      renderAll();
    });
  });
}

/* ============================================================
   RENDER · Biblioteca
   ============================================================ */
function renderBiblioteca() {
  $("#imgCount").textContent = state.images.length;
  const el = $("#libList");

  if (state.images.length === 0) {
    el.innerHTML = "";
    return;
  }

  el.innerHTML = state.images.map((img, i) => `
    <div class="lib-item ${!img.visible ? "hidden-img" : ""}" data-i="${i}" draggable="true" title="${escapeHTML(img.name)}">
      <img src="${img.dataUrl}" alt="" draggable="false" />
      <span class="li-index">${i + 1}</span>
      <button class="li-remove" data-del="${img.id}" aria-label="Eliminar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  `).join("");

  $$(".lib-item").forEach((el, i) => {
    el.addEventListener("click", (e) => {
      if (e.target.closest(".li-remove")) return;
      toggleImageVisible(state.images[i].id);
    });
  });
  $$("[data-del]").forEach(b => b.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteImage(b.dataset.del);
  }));

  bindDragAndDrop();
}

/* ============================================================
   RENDER · Mockup
   ============================================================ */
function visibleImages() {
  return state.images.filter(i => i.visible);
}

function renderMockup() {
  const s = state.settings;
  const prof = s.profile;
  const imgs = visibleImages();
  const isFB = s.mockup === "facebook";

  const mockupTheme = s.mockupTheme || "light";

  /* ============================================================
     FACEBOOK · Feed vertical
     ============================================================ */
  if (isFB) {
    const minPosts = 3;
    const totalPosts = Math.max(imgs.length, minPosts);
    const maxH = "520px";

    const avatarSmall = prof.avatar
      ? `<img src="${prof.avatar}" alt="" />`
      : (prof.displayName || "A").charAt(0).toUpperCase();

    const avatarBig = prof.avatar
      ? `<img src="${prof.avatar}" alt="" />`
      : (prof.displayName || "A").charAt(0).toUpperCase();

    const postsHTML = [];
    for (let i = 0; i < totalPosts; i++) {
      const img = imgs[i];
      postsHTML.push(`
        <article class="mk-fb-post">
          <div class="mk-fb-post-head">
            <div class="mk-fb-post-avatar">${avatarSmall}</div>
            <div>
              <div class="mk-fb-post-name">${escapeHTML(prof.displayName)}</div>
              <div class="mk-fb-post-time">1 d · 🌐</div>
            </div>
          </div>
          <div class="mk-fb-post-img ${!img ? "empty" : ""}">
            ${img ? `<img src="${img.dataUrl}" alt="" />` : ""}
          </div>
          <div class="mk-fb-post-actions">
            <button>
              <svg viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
              Me gusta
            </button>
            <button>
              <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg>
              Comentar
            </button>
            <button>
              <svg viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              Compartir
            </button>
          </div>
        </article>
      `);
    }

    const headerHTML = `
      <div class="mk-fb-banner"></div>
      <div class="mk-fb-header">
        <div class="mk-fb-avatar-wrap">
          <div class="mk-fb-avatar">${avatarBig}</div>
        </div>
        <div class="mk-fb-name-wrap">
          <div class="mk-fb-name-large">${escapeHTML(prof.displayName)}</div>
          <div class="mk-fb-bio">${escapeHTML(prof.bio)}</div>
        </div>
        <div class="mk-fb-actions">
          <button class="mk-fb-btn solid">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Añadir a historia
          </button>
          <button class="mk-fb-btn plain">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar perfil
          </button>
          <button class="mk-fb-btn plain" style="width:38px">···</button>
        </div>
      </div>
      <div class="mk-fb-tabs">
        <div class="mk-fb-tab active">Publicaciones</div>
        <div class="mk-fb-tab">Reels</div>
        <div class="mk-fb-tab">Fotos</div>
      </div>
    `;

    $("#mockupFrame").innerHTML = `
      <div class="mockup" data-mockup-theme="${mockupTheme}" style="--mockup-scale: ${s.size}px">
        ${headerHTML}
        <div class="mk-fb-feed" style="--grid-max-h: ${maxH}">
          ${postsHTML.join("")}
        </div>
      </div>
    `;
    return;
  }

  /* ============================================================
     INSTAGRAM + TIKTOK · Grid 3 columnas
     ============================================================ */
  const cols = 3;
  const minRows = 3;

  let totalCells;
  if (s.rows === "auto") {
    const needed = Math.max(imgs.length, cols * minRows);
    totalCells = cols * Math.ceil(needed / cols);
  } else {
    totalCells = cols * Math.max(s.rows, minRows);
  }

  let cellAspect = "1";
  if (s.mockup === "instagram") cellAspect = "4 / 5";
  else if (s.mockup === "tiktok")  cellAspect = "3 / 4";

  const maxH = s.rows === "auto" ? "460px" : "auto";

  const cellsHTML = [];
  for (let i = 0; i < totalCells; i++) {
    const img = imgs[i];
    const ttOverlay = s.mockup === "tiktok"
      ? `<div class="mk-cell-overlay">
           <svg viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
           1 d
         </div>`
      : "";
    if (img) {
      cellsHTML.push(`<div class="mk-cell ${s.mockup === "tiktok" ? "tt-cell" : ""}"><img src="${img.dataUrl}" alt="" />${ttOverlay}</div>`);
    } else {
      cellsHTML.push(`<div class="mk-cell ${s.mockup === "tiktok" ? "tt-cell" : ""} empty">${ttOverlay}</div>`);
    }
  }

  let headerHTML = "";

  /* ===================== INSTAGRAM ===================== */
  if (s.mockup === "instagram") {
    const avatarHTML = prof.avatar
      ? `<img src="${prof.avatar}" alt="" />`
      : (prof.displayName || "A").charAt(0).toUpperCase();

    const hlNames = ["About", "Catalog", "Price", "Reviews", "Location"];
    const hlHTML = hlNames.map(n => `
      <div class="mk-hl">
        <div class="mk-hl-circle"></div>
        <div class="mk-hl-label">${n}</div>
      </div>
    `).join("");

    headerHTML = `
      <div class="mk-ig-header">
        <div class="mk-ig-top">
          <div class="mk-avatar">
            <div class="mk-avatar-inner">${avatarHTML}</div>
          </div>
          <div class="mk-ig-stats">
            <div class="mk-stat">
              <div class="mk-stat-value">${escapeHTML(String(prof.posts))}</div>
              <div class="mk-stat-label">posts</div>
            </div>
            <div class="mk-stat">
              <div class="mk-stat-value">${escapeHTML(String(prof.followers))}</div>
              <div class="mk-stat-label">followers</div>
            </div>
            <div class="mk-stat">
              <div class="mk-stat-value">${escapeHTML(String(prof.following))}</div>
              <div class="mk-stat-label">following</div>
            </div>
          </div>
        </div>

        <div class="mk-ig-bio">
          <div class="mk-name">${escapeHTML(prof.displayName)}</div>
          <div class="mk-sub">${escapeHTML(prof.bio)}</div>
        </div>

        <div class="mk-ig-actions">
          <button class="mk-btn plain">Siguiendo ⌄</button>
          <button class="mk-btn plain">Mensaje</button>
          <button class="mk-btn plain" style="width:38px">+</button>
        </div>
      </div>

      <div class="mk-ig-highlights">${hlHTML}</div>

      <div class="mk-ig-tabs">
        <div class="mk-ig-tab active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        </div>
        <div class="mk-ig-tab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="9 3 9 21 22 12 9 3"/><line x1="2" y1="3" x2="2" y2="21"/></svg>
        </div>
        <div class="mk-ig-tab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
      </div>
    `;
  }

  /* ===================== TIKTOK ===================== */
  else if (s.mockup === "tiktok") {
    const avatarHTML = prof.avatar
      ? `<img src="${prof.avatar}" alt="" />`
      : (prof.displayName || "A").charAt(0).toUpperCase();

    headerHTML = `
      <div class="mk-tt-topbar">
        <svg class="mk-tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
        </svg>
        <div class="mk-tt-icons-right">
          <svg class="mk-tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          <svg class="mk-tt-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </div>
      </div>

      <div class="mk-tt-header">
        <div class="mk-tt-avatar-wrap">
          <div class="mk-tt-avatar">${avatarHTML}</div>
          <div class="mk-tt-add-badge">+</div>
        </div>

        <div>
          <div class="mk-tt-name">
            ${escapeHTML(prof.displayName)}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
        <div class="mk-tt-user">@${escapeHTML(prof.username)}</div>

        <div class="mk-tt-stats">
          <div class="mk-tt-stat">
            <span class="mk-tt-stat-value">${escapeHTML(String(prof.following))}</span>
            <span class="mk-tt-stat-label">Siguiendo</span>
          </div>
          <div class="mk-tt-stat">
            <span class="mk-tt-stat-value">${escapeHTML(String(prof.followers))}</span>
            <span class="mk-tt-stat-label">Seguidores</span>
          </div>
          <div class="mk-tt-stat">
            <span class="mk-tt-stat-value">${escapeHTML(String(prof.posts))}</span>
            <span class="mk-tt-stat-label">Me gusta</span>
          </div>
        </div>

        <button class="mk-tt-bio-btn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          ${escapeHTML((prof.bio || "Agregar descripción").split("\n")[0])}
        </button>

        <div>
          <span class="mk-tt-studio">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/><polygon points="19 2 20.5 5 24 5.5 21.5 8 22 11.5 19 10 16 11.5 16.5 8 14 5.5 17.5 5"/></svg>
            TikTok Studio
          </span>
        </div>
      </div>

      <div class="mk-tt-tabs">
        <div class="mk-tt-tab active">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        </div>
        <div class="mk-tt-tab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <div class="mk-tt-tab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        </div>
        <div class="mk-tt-tab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div class="mk-tt-tab">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </div>
      </div>
    `;
  }

  $("#mockupFrame").innerHTML = `
    <div class="mockup" data-mockup-theme="${mockupTheme}" style="--mockup-scale: ${s.size}px">
      ${headerHTML}
      <div class="mk-grid-wrap">
        <div class="mk-grid" style="--cols: ${cols}; --cell-aspect: ${cellAspect}; --grid-max-h: ${maxH}">
          ${cellsHTML.join("")}
        </div>
      </div>
    </div>
  `;
}

/* ============================================================
   RENDER · Tabs de mockup
   ============================================================ */
function renderMockupTabs() {
  $$(".mockup-tab").forEach(t => t.classList.toggle("active", t.dataset.mockup === state.settings.mockup));
  const label = state.settings.mockupTheme === "dark" ? "Oscuro" : "Claro";
  $("#mockupThemeLabel").textContent = label;
}

/* ============================================================
   RENDER · Ajustes
   ============================================================ */
function renderAjustes() {
  const s = state.settings;
  const isFB = s.mockup === "facebook";

  const prof = s.profile;
  $("#profileName").value = prof.displayName;
  $("#profileUser").value = prof.username;
  $("#profileBio").value = prof.bio;
  $("#profilePosts").value = prof.posts;
  $("#profileFollowers").value = prof.followers;
  $("#profileFollowing").value = prof.following;

  const avPrev = $("#profileAvatarPreview");
  if (prof.avatar) {
    avPrev.innerHTML = `<img src="${prof.avatar}" alt="" />`;
  } else {
    avPrev.textContent = (prof.displayName || "A").charAt(0).toUpperCase();
  }

  // Ocultar "Filas visibles" cuando es Facebook
  $("#rowsField").style.display = isFB ? "none" : "";

  // Filas — solo para IG/TikTok
  const rowsOpts = [
    { v: "auto", l: "Auto" },
    { v: 3, l: "3" },
    { v: 4, l: "4" },
    { v: 5, l: "5" },
    { v: 6, l: "6" },
  ];
  $("#gridRows").innerHTML = rowsOpts.map(o => `
    <button class="filter-chip ${s.rows == o.v ? "active" : ""}" data-rows="${o.v}">${o.l}</button>
  `).join("");

  // Tamaño
  const sizeOpts = [
    { v: 340, l: "S" },
    { v: 400, l: "M" },
    { v: 480, l: "L" },
  ];
  $("#gridSize").innerHTML = sizeOpts.map(o => `
    <button class="filter-chip ${s.size === o.v ? "active" : ""}" data-size="${o.v}">${o.l}</button>
  `).join("");

  // Bindings
  $$("[data-rows]").forEach(b => b.addEventListener("click", () => {
    const v = b.dataset.rows;
    state.settings.rows = v === "auto" ? "auto" : +v;
    saveSettings(); renderAll();
  }));
  $$("[data-size]").forEach(b => b.addEventListener("click", () => {
    state.settings.size = +b.dataset.size;
    saveSettings(); renderAll();
  }));
}

/* ============================================================
   RENDER MAESTRO
   ============================================================ */
function renderAll() {
  renderBiblioteca();
  renderMockupTabs();
  renderMockup();
  renderAjustes();
}

/* ============================================================
   EXPORT PNG
   ============================================================ */
async function exportPNG() {
  const mockup = $("#mockupFrame .mockup");
  if (!mockup) { toast("Nada que exportar", "", "danger"); return; }

  toast("Preparando PNG…", "Esto puede tardar un momento.", "info");

  try {
    const html2canvas = await loadHtml2Canvas();
    const bgColor = state.settings.mockupTheme === "dark" ? "#000" : "#fff";

    // Aseguramos que el grid no tenga scroll al capturar
    const grid = mockup.querySelector(".mk-grid, .mk-fb-feed");
    let savedMaxH = null;
    if (grid) {
      savedMaxH = grid.style.maxHeight;
      grid.style.maxHeight = "none";
    }

    const canvasReal = await html2canvas(mockup, {
      backgroundColor: bgColor,
      scale: 2,
      useCORS: true,
      logging: false,
    });

    if (grid && savedMaxH !== null) grid.style.maxHeight = savedMaxH;

    canvasReal.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `preview-${state.settings.mockup}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast("PNG descargado", "", "success");
    }, "image/png");
  } catch (e) {
    console.error(e);
    toast("Error al exportar", "Revisa la consola para más detalles.", "danger");
  }
}

function loadHtml2Canvas() {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) { resolve(window.html2canvas); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    s.onload = () => resolve(window.html2canvas);
    s.onerror = () => reject(new Error("No se pudo cargar html2canvas"));
    document.head.appendChild(s);
  });
}

function printPDF() {
  const mockup = $("#mockupFrame .mockup");
  if (!mockup) { toast("Nada que imprimir", "", "danger"); return; }

  const mockupHTML = mockup.outerHTML;
  const bgColor = state.settings.mockupTheme === "dark" ? "#000" : "#fff";

  const win = window.open("", "_blank");
  if (!win) { toast("Popup bloqueado", "Permite ventanas emergentes.", "danger"); return; }

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Vista previa · ${escapeHTML(state.settings.mockup)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    background: #fff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, sans-serif;
    padding: 20px;
    display: flex;
    justify-content: center;
  }
  .mockup {
    background: ${bgColor};
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 10px 40px rgba(0,0,0,0.12);
    transform-origin: top center;
  }
  .mk-grid, .mk-fb-feed { max-height: none !important; overflow: visible !important; }
  @page { size: auto; margin: 10mm; }
  @media print {
    body { padding: 0; }
    .mockup { box-shadow: none; }
  }
</style>
</head>
<body>${mockupHTML}</body>
</html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 400);
}

/* ============================================================
   EVENTOS
   ============================================================ */
$("#btnAddImgs").addEventListener("click", openFilePicker);
$("#btnAddImgs2").addEventListener("click", openFilePicker);
$("#fileInput").addEventListener("change", e => handleFiles(e.target.files));

$("#btnToggleAll").addEventListener("click", toggleAll);
$("#btnClearImgs").addEventListener("click", clearAllImages);
$("#btnExportPNG").addEventListener("click", exportPNG);
$("#btnPrint").addEventListener("click", printPDF);

$$(".mockup-tab").forEach(t => t.addEventListener("click", () => {
  state.settings.mockup = t.dataset.mockup;
  saveSettings(); renderAll();
}));

$("#btnMockupTheme").addEventListener("click", () => {
  state.settings.mockupTheme = state.settings.mockupTheme === "dark" ? "light" : "dark";
  saveSettings(); renderAll();
});

// Perfil
$("#profileName").addEventListener("input", e => { state.settings.profile.displayName = e.target.value; saveSettings(); renderMockup(); });
$("#profileUser").addEventListener("input", e => { state.settings.profile.username = e.target.value; saveSettings(); renderMockup(); });
$("#profileBio").addEventListener("input", e => { state.settings.profile.bio = e.target.value; saveSettings(); renderMockup(); });
$("#profilePosts").addEventListener("input", e => { state.settings.profile.posts = e.target.value; saveSettings(); renderMockup(); });
$("#profileFollowers").addEventListener("input", e => { state.settings.profile.followers = e.target.value; saveSettings(); renderMockup(); });
$("#profileFollowing").addEventListener("input", e => { state.settings.profile.following = e.target.value; saveSettings(); renderMockup(); });

$("#btnResetProfile").addEventListener("click", () => {
  if (!confirm("¿Restaurar los datos de perfil por defecto?")) return;
  state.settings.profile = { ...PROFILE_DEFAULT };
  saveSettings(); renderAll();
  toast("Perfil restaurado", "", "info");
});

$("#profileAvatarInput").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  const dataUrl = await readFileAsDataURL(file);
  state.settings.profile.avatar = dataUrl;
  await saveSettings();
  renderAll();
  toast("Avatar actualizado", "", "success");
});

// Drop zone
const dz = $("#dropZone");
dz.addEventListener("dragover", e => { e.preventDefault(); dz.classList.add("over"); });
dz.addEventListener("dragleave", () => dz.classList.remove("over"));
dz.addEventListener("drop", e => {
  e.preventDefault();
  dz.classList.remove("over");
  if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
});

// Pegar desde el portapapeles
document.addEventListener("paste", e => {
  const items = e.clipboardData?.items;
  if (!items) return;
  const files = [];
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      const f = item.getAsFile();
      if (f) files.push(f);
    }
  }
  if (files.length) handleFiles(files);
});

// Theme toggle de la app
(function () {
  const KEY = "ae-theme";
  const saved = localStorage.getItem(KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute("data-theme", saved || (prefersDark ? "dark" : "light"));
  $("#themeToggle").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(KEY, next);
  });
})();

/* ============================================================
   INIT
   ============================================================ */
(async () => {
  await loadAll();
  renderAll();
})();
