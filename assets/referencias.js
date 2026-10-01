/* ============================================================
   REFERENCIAS · Lógica
   assets/referencias.js
   ============================================================ */

/* ============================================================
   PALETA DE COLORES DE RUBRO
   ============================================================ */
const RUBRO_COLORS = [
  "#FE0557", // brand
  "#F97316", // orange
  "#EAB308", // yellow
  "#22C55E", // green
  "#14B8A6", // teal
  "#0EA5E9", // sky
  "#6366F1", // indigo
  "#A855F7", // purple
  "#EC4899", // pink
  "#64748B", // slate
];

/* ============================================================
   INDEXEDDB
   ============================================================ */
const DB_NAME = "ae-referencias";
const DB_VERSION = 1;
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("capturas")) {
        db.createObjectStore("capturas", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function dbPutCaptura(id, dataUrl) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("capturas", "readwrite");
    const req = tx.objectStore("capturas").put({ id, dataUrl });
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}

async function dbGetCaptura(id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("capturas", "readonly");
    const req = tx.objectStore("capturas").get(id);
    req.onsuccess = () => res(req.result ? req.result.dataUrl : null);
    req.onerror = () => rej(req.error);
  });
}

async function dbDeleteCaptura(id) {
  const db = await openDB();
  return new Promise((res, rej) => {
    const tx = db.transaction("capturas", "readwrite");
    const req = tx.objectStore("capturas").delete(id);
    req.onsuccess = () => res();
    req.onerror = () => rej(req.error);
  });
}

/* ============================================================
   ESTADO
   ============================================================ */
const LS_KEY = "referencias-v1";

let state = {
  rubros: [],
  activeRubroId: null,
};

/* Caché en memoria: id → dataUrl. Acelera el render y evita ir a IndexedDB cada vez */
const capturaCache = {};

function save() { store.set(LS_KEY, state); }

function load() {
  const saved = store.get(LS_KEY);
  if (saved) state = { ...state, ...saved };
  if (!Array.isArray(state.rubros)) state.rubros = [];
  state.rubros.forEach(r => {
    if (!Array.isArray(r.fichas)) r.fichas = [];
  });
  if (!state.activeRubroId && state.rubros.length > 0) {
    state.activeRubroId = state.rubros[0].id;
  }
}

const rubroById = id => state.rubros.find(r => r.id === id);
const activeRubro = () => rubroById(state.activeRubroId);

function newId(prefix) {
  return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
}

/* ============================================================
   HELPERS
   ============================================================ */
function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.max(el.scrollHeight, 68) + "px";
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1400;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          const ratio = Math.min(MAX / width, MAX / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
   CONFIRM MODAL
   ============================================================ */
let confirmCb = null;
function openConfirm(title, body, label, cb) {
  $("#confirmTitle").textContent = title;
  $("#confirmBody").textContent = body;
  $("#confirmOk").textContent = label || "Confirmar";
  confirmCb = cb;
  $("#confirmModal").classList.add("on");
}
function closeConfirm() {
  $("#confirmModal").classList.remove("on");
  confirmCb = null;
}

/* ============================================================
   RENDER · SIDEBAR DE RUBROS
   ============================================================ */
function renderSidebar() {
  const list = $("#rubroList");
  $("#rubrosCount").textContent = state.rubros.length;

  if (state.rubros.length === 0) {
    list.innerHTML = `<div class="rubro-empty">Aún no hay rubros.<br>Pulsa "+ Nuevo rubro" arriba.</div>`;
    return;
  }

  list.innerHTML = state.rubros.map(r => `
    <div class="rubro-item ${r.id === state.activeRubroId ? "active" : ""}" data-rubro="${r.id}" style="--rubro-color:${escapeHTML(r.color || RUBRO_COLORS[0])}">
      <span class="ri-dot"></span>
      <span class="ri-name">${escapeHTML(r.nombre || "Sin nombre")}</span>
      <span class="ri-count">${r.fichas.length}</span>
      <div class="ri-actions">
        <button data-edit-rubro="${r.id}" title="Editar">
          <svg class="icon" style="width:12px;height:12px" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="danger" data-del-rubro="${r.id}" title="Eliminar">
          <svg class="icon" style="width:12px;height:12px" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  `).join("");

  $$("[data-rubro]").forEach(el => el.addEventListener("click", (e) => {
    if (e.target.closest("[data-edit-rubro]") || e.target.closest("[data-del-rubro]")) return;
    state.activeRubroId = el.dataset.rubro;
    save(); renderAll();
  }));
  $$("[data-edit-rubro]").forEach(b => b.addEventListener("click", (e) => {
    e.stopPropagation();
    openRubroModal(b.dataset.editRubro);
  }));
  $$("[data-del-rubro]").forEach(b => b.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteRubro(b.dataset.delRubro);
  }));
}

/* ============================================================
   RENDER · CONTENIDO (fichas)
   ============================================================ */
let currentQuery = "";

function renderContent() {
  const area = $("#fichasArea");
  const title = $("#contentTitle");
  const count = $("#contentCount");

  const q = currentQuery.toLowerCase().trim();

  // Modo búsqueda global
  if (q) {
    title.textContent = "Resultados";
    const matches = [];
    state.rubros.forEach(r => {
      r.fichas.forEach(f => {
        const haystack = [(f.nombre || ""), (f.instagram || ""), (f.copy || "")].join(" ").toLowerCase();
        if (haystack.includes(q)) matches.push({ ficha: f, rubro: r });
      });
    });
    count.textContent = `${matches.length} ${matches.length === 1 ? "ficha" : "fichas"}`;
    if (matches.length === 0) {
      area.innerHTML = `
        <div class="empty-area">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <div class="ea-title">Sin resultados</div>
          <div class="ea-desc">No hay fichas que coincidan con "${escapeHTML(currentQuery)}".</div>
        </div>
      `;
      return;
    }
    area.innerHTML = `<div class="fichas-grid">${matches.map(m => fichaCardHTML(m.ficha, m.rubro, true)).join("")}</div>`;
    bindFichaCards();
    loadMissingCapturas();
    return;
  }

  // Modo normal: rubro activo
  const r = activeRubro();
  if (!r) {
    title.textContent = "—";
    count.textContent = "";
    area.innerHTML = `
      <div class="empty-area">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        <div class="ea-title">Sin rubros todavía</div>
        <div class="ea-desc">Crea tu primer rubro para empezar a guardar referencias: "Gimnasios", "Restaurantes", "Carpintería"…</div>
        <button class="btn btn-primary" id="emptyNewRubro">Crear primer rubro</button>
      </div>
    `;
    const btn = $("#emptyNewRubro");
    if (btn) btn.addEventListener("click", () => openRubroModal(null));
    return;
  }

  title.textContent = r.nombre || "Sin nombre";
  count.textContent = `${r.fichas.length} ${r.fichas.length === 1 ? "ficha" : "fichas"}`;

  if (r.fichas.length === 0) {
    area.innerHTML = `
      <div class="empty-area">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        <div class="ea-title">Este rubro está vacío</div>
        <div class="ea-desc">Añade tu primera ficha de referencia con captura, nombre, Instagram y copy.</div>
        <button class="btn btn-primary" id="emptyNewFicha">Crear primera ficha</button>
      </div>
    `;
    const btn = $("#emptyNewFicha");
    if (btn) btn.addEventListener("click", () => openFichaModal({ fichaId: null, rubroId: r.id }));
    return;
  }

  area.innerHTML = `<div class="fichas-grid">${r.fichas.map(f => fichaCardHTML(f, r, false)).join("")}</div>`;
  bindFichaCards();
  loadMissingCapturas();
}

function fichaCardHTML(ficha, rubro, showRubro) {
  const firstCaptura = ficha.capturas && ficha.capturas[0];
  const count = (ficha.capturas || []).length;

  let thumbContent;
  if (!firstCaptura) {
    thumbContent = `<div class="fc-empty">Sin captura</div>`;
  } else {
    const cached = capturaCache[firstCaptura.id];
    thumbContent = cached
      ? `<img src="${cached}" alt="" data-cap-id="${firstCaptura.id}" />`
      : `<img alt="" data-cap-id="${firstCaptura.id}" data-lazy="1" style="background:var(--surface-3)" />`;
  }

  const badge = count > 1
    ? `<span class="fc-badge">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
        ${count}
       </span>`
    : "";

  const name = ficha.nombre && ficha.nombre.trim()
    ? `<div class="fc-name">${escapeHTML(ficha.nombre)}</div>`
    : `<div class="fc-name muted">Sin nombre</div>`;

  const ig = ficha.instagram && ficha.instagram.trim()
    ? `<div class="fc-ig">${escapeHTML(ficha.instagram)}</div>`
    : "";

  const rubroTag = showRubro && rubro
    ? `<div class="fc-rubro" style="--rubro-color:${escapeHTML(rubro.color || RUBRO_COLORS[0])}">
        <span class="dot"></span>
        <span>${escapeHTML(rubro.nombre || "Sin nombre")}</span>
       </div>`
    : "";

  return `
    <div class="ficha-card" data-ficha="${ficha.id}" data-rubro="${rubro.id}">
      <div class="fc-thumb">
        ${thumbContent}
        ${badge}
      </div>
      <div class="fc-info">
        ${name}
        ${ig}
        ${rubroTag}
      </div>
    </div>
  `;
}

function bindFichaCards() {
  $$(".ficha-card").forEach(card => {
    card.addEventListener("click", () => {
      const fichaId = card.dataset.ficha;
      const rubroId = card.dataset.rubro;
      openFichaModal({ fichaId, rubroId });
    });
  });
}

/* Carga en background las capturas que no estén en caché */
async function loadMissingCapturas() {
  const imgs = $$('img[data-lazy="1"]');
  for (const img of imgs) {
    const id = img.dataset.capId;
    if (!id) continue;
    if (capturaCache[id]) {
      img.src = capturaCache[id];
      img.removeAttribute("data-lazy");
      continue;
    }
    try {
      const dataUrl = await dbGetCaptura(id);
      if (dataUrl) {
        capturaCache[id] = dataUrl;
        img.src = dataUrl;
        img.removeAttribute("data-lazy");
      }
    } catch (e) {
      console.warn("No se pudo cargar captura", id, e);
    }
  }
}

/* ============================================================
   RUBRO MODAL
   ============================================================ */
let editingRubroId = null;
let selectedColor = RUBRO_COLORS[0];

function openRubroModal(rubroId) {
  editingRubroId = rubroId || null;
  const r = rubroId ? rubroById(rubroId) : null;

  $("#rubroModalTitle").textContent = r ? "Editar rubro" : "Nuevo rubro";
  $("#rubroNombre").value = r ? r.nombre : "";
  selectedColor = r ? (r.color || RUBRO_COLORS[0]) : RUBRO_COLORS[0];

  renderColorPicker();
  $("#rubroModal").classList.add("on");
  setTimeout(() => $("#rubroNombre").focus(), 60);
}

function renderColorPicker() {
  $("#rubroColorPicker").innerHTML = RUBRO_COLORS.map(c => `
    <button class="color-pick ${c === selectedColor ? "active" : ""}" data-color="${c}" style="background:${c}" aria-label="${c}"></button>
  `).join("");
  $$("[data-color]").forEach(b => b.addEventListener("click", () => {
    selectedColor = b.dataset.color;
    renderColorPicker();
  }));
}

function saveRubro() {
  const nombre = $("#rubroNombre").value.trim();
  if (!nombre) { toast("Nombre requerido", "", "danger"); return; }

  if (editingRubroId) {
    const r = rubroById(editingRubroId);
    if (r) {
      r.nombre = nombre;
      r.color = selectedColor;
    }
    toast("Rubro actualizado", nombre, "success");
  } else {
    const r = {
      id: newId("r"),
      nombre,
      color: selectedColor,
      fichas: [],
    };
    state.rubros.push(r);
    state.activeRubroId = r.id;
    toast("Rubro creado", nombre, "success");
  }
  save();
  $("#rubroModal").classList.remove("on");
  renderAll();
}

function deleteRubro(rubroId) {
  const r = rubroById(rubroId);
  if (!r) return;
  const count = r.fichas.length;
  const msg = count > 0
    ? `Se eliminará "${r.nombre}" con sus ${count} ficha${count === 1 ? "" : "s"} y todas las capturas guardadas.`
    : `Se eliminará "${r.nombre}".`;
  openConfirm("Eliminar rubro", msg, "Eliminar", async () => {
    for (const f of r.fichas) {
      for (const c of (f.capturas || [])) {
        await dbDeleteCaptura(c.id);
        delete capturaCache[c.id];
      }
    }
    state.rubros = state.rubros.filter(x => x.id !== rubroId);
    if (state.activeRubroId === rubroId) {
      state.activeRubroId = state.rubros[0] ? state.rubros[0].id : null;
    }
    save();
    renderAll();
    toast("Rubro eliminado", r.nombre, "info");
  });
}

/* ============================================================
   FICHA MODAL
   ============================================================ */
let modalFicha = null;
let modalOriginalCapturas = [];
let editingFichaId = null;
let editingFichaRubroId = null;

async function openFichaModal(params) {
  if (!params || typeof params !== "object") {
    console.warn("[referencias] openFichaModal llamado sin parámetros válidos");
    return;
  }
  const { fichaId = null, rubroId = null } = params;

  if (!rubroId) {
    toast("Rubro no encontrado", "", "danger");
    return;
  }

  editingFichaId = fichaId || null;
  editingFichaRubroId = rubroId;

  if (fichaId) {
    const r = rubroById(rubroId);
    const f = r ? r.fichas.find(x => x.id === fichaId) : null;
    if (!f) return;

    $("#fichaModalTitle").textContent = "Editar ficha";
    $("#btnDeleteFicha").hidden = false;
    $("#btnMoveFicha").hidden = state.rubros.length < 2;

    modalFicha = {
      id: f.id,
      nombre: f.nombre || "",
      instagram: f.instagram || "",
      copy: f.copy || "",
      capturas: [],
    };
    modalOriginalCapturas = (f.capturas || []).map(c => c.id);

    $("#capturasGrid").innerHTML = `<div style="grid-column:1/-1;padding:20px;text-align:center;color:var(--text-subtle);font-size:12px">Cargando capturas…</div>`;
    for (const c of (f.capturas || [])) {
      const dataUrl = await dbGetCaptura(c.id);
      if (dataUrl) {
        capturaCache[c.id] = dataUrl;
        modalFicha.capturas.push({ id: c.id, dataUrl });
      }
    }
  } else {
    $("#fichaModalTitle").textContent = "Nueva ficha";
    $("#btnDeleteFicha").hidden = true;
    $("#btnMoveFicha").hidden = true;
    modalFicha = {
      nombre: "",
      instagram: "",
      copy: "",
      capturas: [],
    };
    modalOriginalCapturas = [];
  }

  $("#fichaNombre").value = modalFicha.nombre;
  $("#fichaInstagram").value = modalFicha.instagram;
  $("#fichaCopy").value = modalFicha.copy;

  renderCapturasGrid();
  $("#fichaModal").classList.add("on");
  setTimeout(() => $("#fichaNombre").focus(), 60);
}

function renderCapturasGrid() {
  const grid = $("#capturasGrid");
  const empty = $("#capturasEmpty");
  const count = $("#capturasCount");

  const n = modalFicha.capturas.length;
  count.textContent = n;

  if (n === 0) {
    empty.style.display = "";
    grid.innerHTML = "";
    return;
  }
  empty.style.display = "none";
  grid.innerHTML = modalFicha.capturas.map((c, i) => `
    <div class="captura-thumb" data-cap-index="${i}">
      <img src="${c.dataUrl}" alt="" />
      <button class="ct-remove" data-cap-remove="${i}" aria-label="Quitar">
        <svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  `).join("");

  $$("[data-cap-remove]").forEach(b => b.addEventListener("click", (e) => {
    e.stopPropagation();
    modalFicha.capturas.splice(+b.dataset.capRemove, 1);
    renderCapturasGrid();
  }));
  $$("[data-cap-index]").forEach(el => el.addEventListener("click", () => {
    openLightbox(+el.dataset.capIndex, true);
  }));
}

async function addCapturasFromFiles(files) {
  const arr = [...files].filter(f => f.type.startsWith("image/"));
  if (arr.length === 0) return;

  toast("Procesando…", arr.length + " imagen" + (arr.length === 1 ? "" : "es"), "info");
  for (const file of arr) {
    try {
      const dataUrl = await compressImage(file);
      modalFicha.capturas.push({ id: newId("tmp"), dataUrl });
    } catch (e) {
      console.error(e);
    }
  }
  renderCapturasGrid();
}

async function saveFicha() {
  const r = rubroById(editingFichaRubroId);
  if (!r) { toast("Rubro no encontrado", "", "danger"); return; }

  modalFicha.nombre = $("#fichaNombre").value.trim();
  modalFicha.instagram = $("#fichaInstagram").value.trim();
  modalFicha.copy = $("#fichaCopy").value;

  const finalCapturas = [];
  for (const c of modalFicha.capturas) {
    if (c.id.startsWith("tmp")) {
      const realId = newId("c");
      await dbPutCaptura(realId, c.dataUrl);
      capturaCache[realId] = c.dataUrl;
      finalCapturas.push({ id: realId });
    } else {
      capturaCache[c.id] = c.dataUrl;
      finalCapturas.push({ id: c.id });
    }
  }

  const finalIds = new Set(finalCapturas.map(c => c.id));
  for (const origId of modalOriginalCapturas) {
    if (!finalIds.has(origId)) {
      await dbDeleteCaptura(origId);
      delete capturaCache[origId];
    }
  }

  if (editingFichaId) {
    const f = r.fichas.find(x => x.id === editingFichaId);
    if (f) {
      f.nombre = modalFicha.nombre;
      f.instagram = modalFicha.instagram;
      f.copy = modalFicha.copy;
      f.capturas = finalCapturas;
    }
    toast("Ficha actualizada", modalFicha.nombre || "(sin nombre)", "success");
  } else {
    r.fichas.unshift({
      id: newId("f"),
      nombre: modalFicha.nombre,
      instagram: modalFicha.instagram,
      copy: modalFicha.copy,
      capturas: finalCapturas,
      fecha: today(),
    });
    toast("Ficha creada", modalFicha.nombre || "(sin nombre)", "success");
  }

  save();
  $("#fichaModal").classList.remove("on");
  modalFicha = null;
  renderAll();
}

function deleteFicha() {
  if (!editingFichaId) return;
  const r = rubroById(editingFichaRubroId);
  if (!r) return;
  const f = r.fichas.find(x => x.id === editingFichaId);
  if (!f) return;

  openConfirm("Eliminar ficha", "Se eliminará esta ficha con sus capturas. Esta acción no se puede deshacer.", "Eliminar", async () => {
    for (const c of (f.capturas || [])) {
      await dbDeleteCaptura(c.id);
      delete capturaCache[c.id];
    }
    r.fichas = r.fichas.filter(x => x.id !== editingFichaId);
    save();
    $("#fichaModal").classList.remove("on");
    closeConfirm();
    modalFicha = null;
    renderAll();
    toast("Ficha eliminada", "", "info");
  });
}

/* ============================================================
   MOVE MODAL
   ============================================================ */
function openMoveModal() {
  const currentRubroId = editingFichaRubroId;
  const list = $("#moveList");

  if (state.rubros.length < 2) {
    toast("Necesitas más rubros", "Crea otro rubro para mover esta ficha.", "info");
    return;
  }

  list.innerHTML = state.rubros.map(r => {
    const isCurrent = r.id === currentRubroId;
    return `
      <button class="move-item" data-move-to="${r.id}" ${isCurrent ? "disabled" : ""} style="--rubro-color:${escapeHTML(r.color || RUBRO_COLORS[0])}">
        <span class="mi-dot"></span>
        <span class="mi-name">${escapeHTML(r.nombre || "Sin nombre")}</span>
        ${isCurrent
          ? `<span class="mi-current">Actual</span>`
          : `<span class="mi-count">${r.fichas.length}</span>`}
      </button>
    `;
  }).join("");

  $$("[data-move-to]").forEach(b => b.addEventListener("click", async () => {
    const targetId = b.dataset.moveTo;
    if (targetId === currentRubroId) return;
    await moveFicha(targetId);
  }));

  $("#moveModal").classList.add("on");
}

async function moveFicha(targetRubroId) {
  modalFicha.nombre = $("#fichaNombre").value.trim();
  modalFicha.instagram = $("#fichaInstagram").value.trim();
  modalFicha.copy = $("#fichaCopy").value;

  const sourceRubro = rubroById(editingFichaRubroId);
  const targetRubro = rubroById(targetRubroId);
  if (!sourceRubro || !targetRubro) return;

  const finalCapturas = [];
  for (const c of modalFicha.capturas) {
    if (c.id.startsWith("tmp")) {
      const realId = newId("c");
      await dbPutCaptura(realId, c.dataUrl);
      capturaCache[realId] = c.dataUrl;
      finalCapturas.push({ id: realId });
    } else {
      capturaCache[c.id] = c.dataUrl;
      finalCapturas.push({ id: c.id });
    }
  }
  const finalIds = new Set(finalCapturas.map(c => c.id));
  for (const origId of modalOriginalCapturas) {
    if (!finalIds.has(origId)) {
      await dbDeleteCaptura(origId);
      delete capturaCache[origId];
    }
  }

  if (editingFichaId) {
    const f = sourceRubro.fichas.find(x => x.id === editingFichaId);
    if (!f) return;
    f.nombre = modalFicha.nombre;
    f.instagram = modalFicha.instagram;
    f.copy = modalFicha.copy;
    f.capturas = finalCapturas;

    sourceRubro.fichas = sourceRubro.fichas.filter(x => x.id !== editingFichaId);
    targetRubro.fichas.unshift(f);
    toast("Ficha movida", `→ ${targetRubro.nombre}`, "success");
  } else {
    targetRubro.fichas.unshift({
      id: newId("f"),
      nombre: modalFicha.nombre,
      instagram: modalFicha.instagram,
      copy: modalFicha.copy,
      capturas: finalCapturas,
      fecha: today(),
    });
    toast("Ficha creada", `en ${targetRubro.nombre}`, "success");
  }

  save();
  $("#moveModal").classList.remove("on");
  $("#fichaModal").classList.remove("on");
  modalFicha = null;
  renderAll();
}

/* ============================================================
   LIGHTBOX
   ============================================================ */
let lbIndex = 0;
let lbFromModal = false;

function openLightbox(index, fromModal) {
  if (!modalFicha) return;
  if (modalFicha.capturas.length === 0) return;
  lbIndex = Math.max(0, Math.min(index, modalFicha.capturas.length - 1));
  lbFromModal = !!fromModal;
  $("#lightbox").classList.add("on");
  renderLightbox();
}

function closeLightbox() {
  $("#lightbox").classList.remove("on");
}

function renderLightbox() {
  if (!modalFicha) return;
  const c = modalFicha.capturas[lbIndex];
  if (!c) return;
  $("#lbStage").innerHTML = `<img src="${c.dataUrl}" alt="" />`;
  $("#lbCounter").textContent = `${lbIndex + 1} / ${modalFicha.capturas.length}`;
  $("#lbPrev").disabled = lbIndex === 0;
  $("#lbNext").disabled = lbIndex === modalFicha.capturas.length - 1;
}

/* ============================================================
   RENDER MAESTRO
   ============================================================ */
function renderAll() {
  renderSidebar();
  renderContent();
}

/* ============================================================
   EVENTOS
   ============================================================ */
$("#btnNewRubro").addEventListener("click", () => openRubroModal(null));
$("#btnNewFicha").addEventListener("click", () => {
  if (state.rubros.length === 0) { toast("Crea un rubro primero", "", "info"); return; }
  if (!state.activeRubroId) state.activeRubroId = state.rubros[0].id;
  openFichaModal({ fichaId: null, rubroId: state.activeRubroId });
});

$("#rubroSave").addEventListener("click", saveRubro);
$("#rubroNombre").addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); saveRubro(); }
});

$("#btnSaveFicha").addEventListener("click", saveFicha);
$("#btnDeleteFicha").addEventListener("click", deleteFicha);
$("#btnMoveFicha").addEventListener("click", openMoveModal);

$("#btnAddCaptura").addEventListener("click", () => $("#fileInput").click());
$("#fileInput").addEventListener("change", async (e) => {
  await addCapturasFromFiles(e.target.files);
  e.target.value = "";
});

$("#btnCopyText").addEventListener("click", async () => {
  const text = $("#fichaCopy").value;
  if (!text.trim()) { toast("Nada que copiar", "", "info"); return; }
  try {
    await navigator.clipboard.writeText(text);
    toast("Copy copiado", "Listo para pegar donde quieras.", "success");
  } catch {
    toast("No se pudo copiar", "Permisos bloqueados.", "danger");
  }
});

$("#searchInput").addEventListener("input", debounce(e => {
  currentQuery = e.target.value;
  renderContent();
}, 120));

const dropZone = $("#capturasDrop");
dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("over"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("over"));
dropZone.addEventListener("drop", async e => {
  e.preventDefault();
  dropZone.classList.remove("over");
  if (e.dataTransfer.files.length > 0) {
    await addCapturasFromFiles(e.dataTransfer.files);
  }
});

document.addEventListener("paste", async e => {
  if (!$("#fichaModal").classList.contains("on")) return;
  const items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  const files = [];
  for (const item of items) {
    if (item.type.startsWith("image/")) {
      const f = item.getAsFile();
      if (f) files.push(f);
    }
  }
  if (files.length > 0) {
    e.preventDefault();
    await addCapturasFromFiles(files);
  }
});

$("#confirmOk").addEventListener("click", () => {
  if (typeof confirmCb === "function") confirmCb();
  closeConfirm();
});

$$("[data-close]").forEach(n => n.addEventListener("click", () => {
  n.closest(".modal").classList.remove("on");
}));

$("#lbClose").addEventListener("click", closeLightbox);
$("#lbPrev").addEventListener("click", () => {
  if (lbIndex > 0) { lbIndex--; renderLightbox(); }
});
$("#lbNext").addEventListener("click", () => {
  if (modalFicha && lbIndex < modalFicha.capturas.length - 1) { lbIndex++; renderLightbox(); }
});

document.addEventListener("keydown", e => {
  if ($("#lightbox").classList.contains("on")) {
    if (e.key === "Escape") { e.preventDefault(); closeLightbox(); }
    else if (e.key === "ArrowLeft" && lbIndex > 0) { e.preventDefault(); lbIndex--; renderLightbox(); }
    else if (e.key === "ArrowRight" && modalFicha && lbIndex < modalFicha.capturas.length - 1) { e.preventDefault(); lbIndex++; renderLightbox(); }
    return;
  }
  if ($("#fichaModal").classList.contains("on") && (e.metaKey || e.ctrlKey) && e.key === "s") {
    e.preventDefault();
    saveFicha();
  }
});

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
  await openDB();
  load();
  renderAll();
})();