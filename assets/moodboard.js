/* ============================================================
   MOODBOARD · Lógica
   assets/moodboard.js
   ============================================================ */

/* ============================================================
   INDEXEDDB
   ============================================================ */
const DB_NAME = "ae-moodboard";
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

async function dbGetAll(store) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function dbPut(store, value, key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, "readwrite");
    const req = key !== undefined ? tx.objectStore(store).put(value, key) : tx.objectStore(store).put(value);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function dbGet(store, key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function dbDelete(store, key) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}
async function dbClear(store) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).clear();
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}

/* ============================================================
   ROLES DE LA PALETA
   ============================================================ */
const ROLES = [
  { id: "primary",    label: "Primary",    desc: "Marca principal" },
  { id: "secondary",  label: "Secondary",  desc: "Marca secundaria" },
  { id: "accent",     label: "Accent",     desc: "Destacar, CTAs" },
  { id: "background", label: "Background", desc: "Fondo principal" },
  { id: "surface",    label: "Surface",    desc: "Superficies y cards" },
  { id: "text",       label: "Text",       desc: "Texto principal" },
  { id: "textMuted",  label: "Text muted", desc: "Texto secundario" },
  { id: "border",     label: "Border",     desc: "Bordes y divisores" },
];

/* ============================================================
   ESTADO
   ============================================================ */
let state = {
  images: [],
  pool: [],
  roles: {},
  activeView: "moodboard",
  selectedImageId: null,
  gridCols: 4,
};

function saveSettings() {
  dbPut("settings", {
    pool: state.pool,
    roles: state.roles,
    activeView: state.activeView,
    gridCols: state.gridCols,
  }, "main");
}

async function loadAll() {
  const images = await dbGetAll("images");
  images.sort((a, b) => (a.order || 0) - (b.order || 0));
  state.images = images;

  const settings = await dbGet("settings", "main");
  if (settings) {
    state.pool = settings.pool || [];
    state.roles = settings.roles || {};
    state.activeView = settings.activeView || "moodboard";
    state.gridCols = settings.gridCols || 4;
  } else {
    state.roles = {};
    ROLES.forEach(r => { state.roles[r.id] = null; });
  }
  // Asegurar todos los roles
  ROLES.forEach(r => {
    if (typeof state.roles[r.id] === "undefined") state.roles[r.id] = null;
  });
}

/* ============================================================
   HELPERS DE COLOR
   ============================================================ */
function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("");
}
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const v = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const num = parseInt(v, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function colorDistance(a, b) {
  const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}
function relLuminance(rgb) {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(hex1, hex2) {
  const l1 = relLuminance(hexToRgb(hex1));
  const l2 = relLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/* ============================================================
   EXTRACCIÓN DE PALETA
   ============================================================ */
function extractPalette(imgEl, numColors = 8) {
  const SIZE = 128;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(imgEl, 0, 0, SIZE, SIZE);

  let data;
  try {
    data = ctx.getImageData(0, 0, SIZE, SIZE).data;
  } catch (e) {
    return [];
  }

  // Cuantizar en buckets y guardar sumas para promediar
  const buckets = {};
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 128) continue;
    // Ignorar casi-blanco puro y casi-negro puro (suelen ser fondos poco útiles)
    const maxC = Math.max(r, g, b), minC = Math.min(r, g, b);
    if (maxC > 245 && minC > 240) continue;
    if (maxC < 15) continue;

    const qr = r >> 4, qg = g >> 4, qb = b >> 4;
    const key = `${qr},${qg},${qb}`;
    if (!buckets[key]) buckets[key] = { r: 0, g: 0, b: 0, count: 0 };
    buckets[key].r += r;
    buckets[key].g += g;
    buckets[key].b += b;
    buckets[key].count++;
  }

  const list = Object.values(buckets)
    .map(b => ({ r: b.r / b.count, g: b.g / b.count, b: b.b / b.count, count: b.count }))
    .sort((a, b) => b.count - a.count);

  // Seleccionar los más distintos entre sí
  const picked = [];
  const MIN_DIST = 40;
  for (const c of list) {
    if (picked.every(p => colorDistance(p, c) > MIN_DIST)) {
      picked.push(c);
      if (picked.length >= numColors) break;
    }
  }

  // Si no conseguimos suficientes, bajamos el umbral
  if (picked.length < numColors) {
    for (const c of list) {
      if (picked.every(p => colorDistance(p, c) > 20)) {
        picked.push(c);
        if (picked.length >= numColors) break;
      }
    }
  }

  return picked.map(c => ({
    r: Math.round(c.r),
    g: Math.round(c.g),
    b: Math.round(c.b),
    hex: rgbToHex(c.r, c.g, c.b),
  }));
}

/* ============================================================
   SUBIR IMÁGENES
   ============================================================ */
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function handleFiles(files) {
  const arr = [...files].filter(f => f.type.startsWith("image/"));
  if (arr.length === 0) return;

  toast("Procesando imágenes…", arr.length + " archivo" + (arr.length === 1 ? "" : "s"), "info");

  let nextOrder = state.images.length ? Math.max(...state.images.map(i => i.order || 0)) + 1 : 0;

  for (const file of arr) {
    try {
      const dataUrl = await readFileAsDataURL(file);
      const imgEl = await loadImage(dataUrl);
      const palette = extractPalette(imgEl, 8);

      const img = {
        id: "img_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        dataUrl,
        name: file.name,
        order: nextOrder++,
        palette,
      };
      state.images.push(img);
      await dbPut("images", img);
    } catch (e) {
      console.error(e);
    }
  }

  renderAll();
  toast("Imágenes añadidas", arr.length + " nueva" + (arr.length === 1 ? "" : "s"), "success");
}

async function deleteImage(id) {
  state.images = state.images.filter(i => i.id !== id);
  await dbDelete("images", id);
  if (state.selectedImageId === id) state.selectedImageId = null;
  renderAll();
}

async function clearAll() {
  if (state.images.length === 0) return;
  if (!confirm("¿Vaciar toda la biblioteca? Esta acción no se puede deshacer.")) return;
  state.images = [];
  state.selectedImageId = null;
  await dbClear("images");
  renderAll();
  toast("Biblioteca vaciada", "", "info");
}

/* ============================================================
   POOL
   ============================================================ */
function isInPool(hex) {
  return state.pool.some(c => c.hex.toLowerCase() === hex.toLowerCase());
}

function addToPool(hex) {
  if (isInPool(hex)) return false;
  state.pool.unshift({ hex: hex.toLowerCase(), addedAt: Date.now() });
  saveSettings();
  return true;
}

function removeFromPool(hex) {
  state.pool = state.pool.filter(c => c.hex.toLowerCase() !== hex.toLowerCase());
  saveSettings();
}

function clearPool() {
  if (state.pool.length === 0) return;
  state.pool = [];
  saveSettings();
  renderAll();
}

/* ============================================================
   ROLES
   ============================================================ */
function assignRole(roleId, hex) {
  state.roles[roleId] = hex.toLowerCase();
  saveSettings();
  renderAll();
}

function clearRole(roleId) {
  state.roles[roleId] = null;
  saveSettings();
  renderAll();
}

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
    <div class="lib-item ${state.selectedImageId === img.id ? "selected" : ""}" data-i="${i}" title="${escapeHTML(img.name)}">
      <img src="${img.dataUrl}" alt="" draggable="false" />
      <button class="li-remove" data-del="${img.id}" aria-label="Eliminar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  `).join("");

  $$(".lib-item").forEach((node, i) => {
    node.addEventListener("click", e => {
      if (e.target.closest(".li-remove")) return;
      state.selectedImageId = state.images[i].id;
      saveSettings();
      renderAll();
      // En la pestaña moodboard, hacer scroll al item
      if (state.activeView === "moodboard") {
        setTimeout(() => {
          const it = $(`.mb-grid-item[data-id="${state.images[i].id}"]`);
          if (it) it.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
      }
    });
  });
  $$("[data-del]").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation();
    deleteImage(b.dataset.del);
  }));
}

/* ============================================================
   RENDER · Vistas
   ============================================================ */
function renderView() {
  const content = $("#viewContent");
  if (state.activeView === "moodboard")  content.innerHTML = renderMoodboardView();
  if (state.activeView === "paleta")     content.innerHTML = renderPaletaView();
  if (state.activeView === "preview")    content.innerHTML = renderPreviewView();

  // Bindings según vista
  bindViewEvents();
  $$(".vt-btn").forEach(t => t.classList.toggle("active", t.dataset.view === state.activeView));
}

function renderMoodboardView() {
  if (state.images.length === 0) {
    return `
      <div class="empty-state">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <div class="es-title">Sin imágenes todavía</div>
        <div class="es-desc">Sube referencias desde la biblioteca de la izquierda. La paleta se extrae automáticamente.</div>
      </div>
    `;
  }

  const selected = state.images.find(i => i.id === state.selectedImageId);

  return `
    <div class="mb-grid" style="--cols:${state.gridCols}">
      ${state.images.map(img => `
        <div class="mb-grid-item ${state.selectedImageId === img.id ? "selected" : ""}" data-id="${img.id}">
          <img src="${img.dataUrl}" alt="" />
          <button class="mbx" data-del-mb="${img.id}" aria-label="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      `).join("")}
    </div>

    ${selected ? `
      <div class="mb-extract-panel">
        <div class="mb-extract-head">
          <span class="meh-title">Colores de la imagen</span>
          <span class="meh-sub">${escapeHTML(selected.name)}</span>
          <div class="spacer"></div>
          <button class="btn btn-ghost btn-sm" data-add-all-pool="${selected.id}">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            Añadir todos al pool
          </button>
        </div>
        <div class="mb-extract-grid">
          ${selected.palette.map(c => `
            <button class="swatch ${isInPool(c.hex) ? "in-pool" : ""}" data-add-pool="${c.hex}" title="Clic para añadir al pool">
              <div class="sw-color" style="background:${c.hex}"></div>
              <div class="sw-hex">${c.hex.replace("#", "")}</div>
            </button>
          `).join("")}
        </div>
      </div>
    ` : `
      <div style="text-align:center;padding:24px 0 0;color:var(--text-subtle);font-size:12.5px;border-top:1px solid var(--border);margin-top:8px;padding-top:20px">
        Selecciona una imagen para ver su paleta extraída.
      </div>
    `}
  `;
}

function renderPaletaView() {
  const poolHTML = state.pool.length === 0
    ? `<div class="pool-empty">Aún no has seleccionado colores.<br>Ve a la pestaña Moodboard, selecciona una imagen y haz clic en sus colores.</div>`
    : `<div class="pool-grid">
        ${state.pool.map(c => `
          <div class="pool-color" style="background:${c.hex}" title="${c.hex}" data-pool-hex="${c.hex}">
            <button class="pc-x" data-pool-del="${c.hex}" aria-label="Quitar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        `).join("")}
      </div>`;

  const rolesHTML = ROLES.map(r => {
    const hex = state.roles[r.id];
    return `
      <div class="role-card" data-role="${r.id}">
        <div class="rc-label">
          ${escapeHTML(r.label)}
          <small>${escapeHTML(r.desc)}</small>
        </div>
        <div class="rc-swatch ${hex ? "" : "empty"}" style="${hex ? `background:${hex}` : ""}"></div>
        ${hex ? `
          <div class="rc-hex">${hex}</div>
          <button class="rc-clear" data-role-clear="${r.id}">Quitar</button>
        ` : `
          <button class="rc-clear" style="cursor:default;color:var(--text-subtle)">Arrastra un color aquí</button>
        `}
      </div>
    `;
  }).join("");

  return `
    <div class="pool-section">
      <div class="pool-head">
        <span class="ph-title">Pool</span>
        <span class="ph-count">${state.pool.length} ${state.pool.length === 1 ? "color" : "colores"}</span>
        <div class="spacer"></div>
        ${state.pool.length > 0 ? `<button id="poolClearBtn">Vaciar pool</button>` : ""}
      </div>
      ${poolHTML}
    </div>

    <div class="roles-section">
      <div class="roles-head">
        <span class="rh-title">Roles</span>
        <div class="spacer"></div>
        <span class="rh-hint">Arrastra un color del pool a un rol</span>
      </div>
      <div class="roles-grid">${rolesHTML}</div>
    </div>
  `;
}

function renderPreviewView() {
  const r = state.roles;
  const primary = r.primary || "#0a0a0b";
  const accent = r.accent || primary;
  const bg = r.background || "#ffffff";
  const surface = r.surface || "#f5f5f5";
  const text = r.text || "#0a0a0b";
  const textMuted = r.textMuted || "#6b6b75";
  const border = r.border || "#e5e5e5";

  const contrastText = (bgHex) => {
    const ratio = contrastRatio("#ffffff", bgHex);
    const ratioDark = contrastRatio("#0a0a0b", bgHex);
    return ratio > ratioDark ? "#ffffff" : "#0a0a0b";
  };

  const onPrimary = contrastText(primary);
  const onAccent = contrastText(accent);

  return `
    <div class="preview-view" style="background:${bg}">

      <div class="preview-hero" style="background:${primary};color:${onPrimary}">
        <div class="pv-eyebrow" style="color:${onPrimary};opacity:0.75">Ae Project Studio</div>
        <h1>Dirección visual<br>con criterio</h1>
        <p style="opacity:0.85">Una propuesta de identidad pensada para comunicar con claridad, jerarquía y una paleta coherente en cada punto de contacto.</p>
        <div class="preview-buttons">
          <button class="preview-btn" style="background:${accent};color:${onAccent}">Empezar proyecto</button>
          <button class="preview-btn outline" style="color:${onPrimary};border-color:${onPrimary}80">Ver portafolio</button>
        </div>
      </div>

      <div class="preview-cards">
        <div class="preview-card" style="background:${surface};color:${text};border-color:${border}">
          <span class="pcx-tag" style="background:${primary};color:${onPrimary}">Servicio</span>
          <div class="pcx-title">Identidad visual</div>
          <div class="pcx-body" style="color:${textMuted}">Conceptualización, desarrollo de marca y entrega de archivos finales vectoriales.</div>
        </div>
        <div class="preview-card" style="background:${surface};color:${text};border-color:${border}">
          <span class="pcx-tag" style="background:${accent};color:${onAccent}">Contenido</span>
          <div class="pcx-title">Producción mensual</div>
          <div class="pcx-body" style="color:${textMuted}">Posts, reels y stories con dirección de arte consistente y lenguaje propio.</div>
        </div>
        <div class="preview-card" style="background:${surface};color:${text};border-color:${border}">
          <span class="pcx-tag" style="background:${text};color:${bg}">Dirección</span>
          <div class="pcx-title">Dirección de arte</div>
          <div class="pcx-body" style="color:${textMuted}">Acompañamiento estratégico en cada decisión visual y sonora de la marca.</div>
        </div>
      </div>

    </div>
  `;
}

/* ============================================================
   Bindings de la vista activa
   ============================================================ */
function bindViewEvents() {
  // Moodboard
  $$(".mb-grid-item").forEach(el => el.addEventListener("click", e => {
    if (e.target.closest(".mbx")) return;
    state.selectedImageId = el.dataset.id;
    saveSettings();
    renderAll();
  }));
  $$("[data-del-mb]").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation();
    deleteImage(b.dataset.delMb);
  }));
  $$("[data-add-pool]").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation();
    const hex = b.dataset.addPool;
    if (addToPool(hex)) {
      toast("Añadido al pool", hex, "success");
    } else {
      toast("Ya estaba en el pool", "", "info");
    }
    renderAll();
  }));
  $$("[data-add-all-pool]").forEach(b => b.addEventListener("click", () => {
    const img = state.images.find(i => i.id === b.dataset.addAllPool);
    if (!img) return;
    let added = 0;
    img.palette.forEach(c => {
      if (addToPool(c.hex)) added++;
    });
    toast("Añadidos al pool", added + " colores", "success");
    renderAll();
  }));

  // Paleta
  const poolClear = $("#poolClearBtn");
  if (poolClear) poolClear.addEventListener("click", clearPool);

  $$("[data-pool-del]").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation();
    removeFromPool(b.dataset.poolDel);
    renderAll();
  }));

  // Drag pool → role
  let dragging = null;
  $$("[data-pool-hex]").forEach(el => {
    el.draggable = true;
    el.addEventListener("dragstart", e => {
      dragging = el.dataset.poolHex;
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData("text/plain", dragging);
    });
  });
  $$("[data-role]").forEach(roleEl => {
    roleEl.addEventListener("dragover", e => {
      e.preventDefault();
      roleEl.classList.add("drop-target");
    });
    roleEl.addEventListener("dragleave", () => roleEl.classList.remove("drop-target"));
    roleEl.addEventListener("drop", e => {
      e.preventDefault();
      roleEl.classList.remove("drop-target");
      const hex = e.dataTransfer.getData("text/plain") || dragging;
      if (!hex) return;
      assignRole(roleEl.dataset.role, hex);
      toast("Rol asignado", hex, "success");
    });
  });

  // Click también asigna (fallback para touch)
  $$("[data-pool-hex]").forEach(el => el.addEventListener("click", () => {
    const hex = el.dataset.poolHex;
    // Si hay un rol "seleccionado" o si hay solo uno vacío, asignar
    const emptyRole = ROLES.find(r => !state.roles[r.id]);
    if (emptyRole) {
      assignRole(emptyRole.id, hex);
      toast("Asignado a " + emptyRole.label, hex, "success");
    } else {
      toast("Todos los roles están asignados", "Arrastra a un rol específico o vacía uno.", "info");
    }
  }));

  $$("[data-role-clear]").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation();
    clearRole(b.dataset.roleClear);
  }));
}

/* ============================================================
   RENDER · Contraste
   ============================================================ */
function renderContrast() {
  const r = state.roles;
  const el = $("#contrastPanel");

  // Pares de interés
  const pairs = [
    { a: "text", b: "background", label: "Texto / Fondo" },
    { a: "text", b: "surface",    label: "Texto / Superficie" },
    { a: "textMuted", b: "background", label: "Texto muted / Fondo" },
    { a: "textMuted", b: "surface", label: "Texto muted / Superficie" },
    { a: "primary", b: "background", label: "Primary / Fondo" },
    { a: "primary", b: "surface", label: "Primary / Superficie" },
    { a: "accent", b: "background", label: "Accent / Fondo" },
  ];

  const validPairs = pairs.filter(p => r[p.a] && r[p.b]);

  if (validPairs.length === 0) {
    el.innerHTML = `<div class="empty-hint">Asigna al menos texto y fondo para ver el contraste.</div>`;
    return;
  }

  el.innerHTML = `<div class="contrast-list">
    ${validPairs.map(p => {
      const ratio = contrastRatio(r[p.a], r[p.b]);
      let level = "fail";
      let label = "Falla";
      if (ratio >= 7) { level = "pass-aaa"; label = "AAA"; }
      else if (ratio >= 4.5) { level = "pass-aa"; label = "AA"; }
      else if (ratio >= 3) { level = "pass-aa"; label = "AA Lg"; }
      return `
        <div class="contrast-row">
          <div class="cr-pair">
            <div class="cr-labels">${escapeHTML(p.label)}</div>
            <div class="cr-preview" style="background:${r[p.b]};color:${r[p.a]}">Aa</div>
          </div>
          <span class="cr-ratio">${ratio.toFixed(2)}</span>
          <span class="cr-badge ${level}">${label}</span>
        </div>
      `;
    }).join("")}
  </div>`;
}

/* ============================================================
   RENDER · System info
   ============================================================ */
function renderSysInfo() {
  const assigned = ROLES.filter(r => state.roles[r.id]).length;
  const poolCount = state.pool.length;
  const imgCount = state.images.length;

  $("#sysInfo").innerHTML = `
    <div class="si-row"><span class="si-k">Imágenes</span><span class="si-v">${imgCount}</span></div>
    <div class="si-row"><span class="si-k">Pool</span><span class="si-v">${poolCount}</span></div>
    <div class="si-row"><span class="si-k">Roles</span><span class="si-v">${assigned} / ${ROLES.length}</span></div>
  `;
}

/* ============================================================
   RENDER MAESTRO
   ============================================================ */
function renderAll() {
  renderBiblioteca();
  renderView();
  renderContrast();
  renderSysInfo();
}

/* ============================================================
   EXPORTACIONES
   ============================================================ */
function exportCSS() {
  const r = state.roles;
  if (!r.primary && !r.background) {
    toast("Asigna al menos primary y background", "", "danger");
    return;
  }
  const lines = [];
  lines.push("/* ============================================================");
  lines.push("   Paleta · Ae Project .studio");
  lines.push("   " + new Date().toLocaleDateString("es-VE"));
  lines.push("   ============================================================ */");
  lines.push("");
  lines.push(":root {");
  ROLES.forEach(role => {
    if (r[role.id]) {
      const name = role.id.replace(/([A-Z])/g, "-$1").toLowerCase();
      lines.push(`  --color-${name}: ${r[role.id]};`);
    }
  });
  lines.push("}");

  downloadText(lines.join("\n"), "paleta-tokens.css", "text/css");
  toast("CSS exportado", "", "success");
}

function exportJSONTokens() {
  const r = state.roles;
  const tokens = {
    meta: { generado: new Date().toISOString() },
    colors: {},
  };
  ROLES.forEach(role => {
    if (r[role.id]) {
      const rgb = hexToRgb(r[role.id]);
      tokens.colors[role.id] = {
        hex: r[role.id],
        rgb: [rgb.r, rgb.g, rgb.b],
        hsl: rgbToHsl(rgb),
      };
    }
  });
  if (state.pool.length > 0) {
    tokens.pool = state.pool.map(c => c.hex);
  }
  exportJSON(tokens, "paleta-tokens");
  toast("JSON exportado", "", "success");
}

function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

async function exportPNG() {
  const content = $("#viewContent");
  if (!content) { toast("Nada que exportar", "", "danger"); return; }

  toast("Preparando PNG…", "Puede tardar un momento.", "info");

  try {
    const html2canvas = await loadHtml2Canvas();
    const bgColor = document.documentElement.getAttribute("data-theme") === "dark" ? "#0a0a0b" : "#fff";
    const canvas = await html2canvas(content, {
      backgroundColor: bgColor,
      scale: 2,
      useCORS: true,
      logging: false,
    });
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `moodboard-${state.activeView}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast("PNG descargado", "", "success");
    }, "image/png");
  } catch (e) {
    console.error(e);
    toast("Error al exportar", e.message, "danger");
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

function downloadText(text, filename, mime) {
  const blob = new Blob([text], { type: mime + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ============================================================
   EVENTOS
   ============================================================ */
const btnAddImgs1 = $("#btnAddImgs");
if (btnAddImgs1) btnAddImgs1.addEventListener("click", () => $("#fileInput").click());

const btnAddImgs2 = $("#btnAddImgs2");
if (btnAddImgs2) btnAddImgs2.addEventListener("click", () => $("#fileInput").click());
$("#fileInput").addEventListener("change", e => handleFiles(e.target.files));
$("#btnClearImgs").addEventListener("click", clearAll);

$$(".vt-btn").forEach(t => t.addEventListener("click", () => {
  state.activeView = t.dataset.view;
  saveSettings();
  renderView();
}));

$("#btnGridToggle").addEventListener("click", () => {
  const options = [2, 3, 4, 5];
  const idx = options.indexOf(state.gridCols);
  state.gridCols = options[(idx + 1) % options.length];
  saveSettings();
  renderView();
});

$("#btnExportCSS").addEventListener("click", exportCSS);
$("#btnExportJSON").addEventListener("click", exportJSONTokens);
$("#btnExportPNG").addEventListener("click", exportPNG);

// Drop zone
const dz = $("#dropZone");
dz.addEventListener("dragover", e => { e.preventDefault(); dz.classList.add("over"); });
dz.addEventListener("dragleave", () => dz.classList.remove("over"));
dz.addEventListener("drop", e => {
  e.preventDefault();
  dz.classList.remove("over");
  if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
});

// Pegar imágenes
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

/* Theme toggle */
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