/* ============================================================
   GUION · LÓGICA (workspace compartido)
   assets/guion.js

   Persistencia:
     config/hooks          → { list: [...], updatedAt }   (biblioteca compartida)
     guiones/{id}          → { titulo, cliente, duracion,
                               plantillaId, secciones, tomas,
                               createdAt, updatedAt }    (un doc por guion)

   localStorage:
     guion-active-id       → id del guion activo en este dispositivo
     guion-active-tab      → última pestaña abierta
     guion-ref-open        → estado del panel "Guion de referencia"
     guion-v1-backup       → backup del doc legacy tras migrar
   ============================================================ */

/* ============================================================
   CONSTANTES
   ============================================================ */
const LS_ACTIVE_ID  = "guion-active-id";
const LS_ACTIVE_TAB = "guion-active-tab";
const LS_REF_OPEN   = "guion-ref-open";
const BACKUP_KEY    = "guion-v1-backup";
const LEGACY_KEY    = "guion-v1";        // → config/guion-v1
const HOOKS_DOC     = "hooks";           // → config/hooks
const GUIONES_COL   = "guiones";

/* ============================================================
   ESTADO
   ============================================================ */
let state = {
  // Guion activo (persiste en guiones/{id})
  guionId: null,
  titulo: "",
  cliente: "",
  duracion: 30,
  plantillaId: "tutorial",
  secciones: [],
  tomas: [],

  // Biblioteca compartida (persiste en config/hooks)
  hooks: [],

  // UI (localStorage)
  ui: { guionRefOpen: false },
  activeTab: "guion",

  // Cache en memoria de la lista de guiones
  guionesList: [],
};

/* ============================================================
   IDS
   ============================================================ */
function newSecId() {
  return "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
}
function newGuionId() {
  return "g_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
}

/* ============================================================
   PERSISTENCIA · GUION ACTIVO
   ============================================================ */
let saveTimer = null;
let dirty = false;   // true = hay cambios sin confirmar en Firestore

function save() {
  dirty = true;

  // 1) Escritura inmediata a localStorage (síncrona, a prueba de cierres)
  //    cloud.save ya escribe la caché antes de ir a Firestore, pero al
  //    debouncear también debounceamos esa caché. Aquí la forzamos ya.
  writeLocalCache();

  // 2) Debounce de 30s para Firestore
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushSave, 30000);
}

// Escribe la caché local sin tocar Firestore (rápido, sync)
function writeLocalCache() {
  if (!state.guionId) return;
  const payload = {
    titulo: state.titulo,
    cliente: state.cliente,
    duracion: state.duracion,
    plantillaId: state.plantillaId,
    secciones: state.secciones,
    tomas: state.tomas,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(
      "cloud-cache-guiones/" + state.guionId,
      JSON.stringify(payload)
    );
  } catch {}
}

function flushSave() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  if (!state.guionId) { dirty = false; return; }

  const now = new Date().toISOString();
  const payload = {
    titulo: state.titulo,
    cliente: state.cliente,
    duracion: state.duracion,
    plantillaId: state.plantillaId,
    secciones: state.secciones,
    tomas: state.tomas,
    updatedAt: now,
  };

  cloud.save(`${GUIONES_COL}/${state.guionId}`, payload).catch(() => {});

  const entry = state.guionesList.find(g => g.id === state.guionId);
  if (entry) {
    entry.titulo = payload.titulo;
    entry.cliente = payload.cliente;
    entry.updatedAt = now;
  } else {
    state.guionesList.unshift({ id: state.guionId, ...payload, createdAt: now });
  }

  dirty = false;
}

// Aviso al cerrar/recargar si hay cambios sin volcar
window.addEventListener("beforeunload", (e) => {
  if (!dirty) return;

  // Aprovechamos para intentar el flush
  flushSave();

  // El navegador mostrará su diálogo genérico (no podemos personalizar el texto)
  e.preventDefault();
  e.returnValue = "";
  return "";
});



/* ============================================================
   PERSISTENCIA · HOOKS
   ============================================================ */
function saveHooks() {
  cloud.save(HOOKS_DOC, {
    list: state.hooks,
    updatedAt: new Date().toISOString(),
  }).catch(() => {});
}

/* ============================================================
   NORMALIZACIÓN
   ============================================================ */
function normalizeSecciones(secciones, plantillaId) {
  if (Array.isArray(secciones)) {
    return secciones.map(s => ({
      id: s.id || newSecId(),
      tipo: s.tipo || "custom",
      label: s.label || (TIPOS_SECCION.find(t => t.id === s.tipo) || {}).label || "Sección",
      hint: typeof s.hint === "string" ? s.hint : "",
      weight: typeof s.weight === "number" ? s.weight : 0.2,
      texto: typeof s.texto === "string" ? s.texto : "",
    }));
  }
  // Formato legacy: objeto { hook: "texto", ... }
  const old = secciones || {};
  const tpl = plantilla(plantillaId || "tutorial");
  return tpl.estructura.map(e => {
    const t = TIPOS_SECCION.find(x => x.id === e.tipo) || {};
    return {
      id: newSecId(),
      tipo: e.tipo,
      label: t.label || e.tipo,
      hint: t.hint || "",
      weight: typeof e.weight === "number" ? e.weight : (t.weight || 0.2),
      texto: old[e.tipo] || "",
    };
  });
}

function normalizeTomas(tomas) {
  if (!Array.isArray(tomas)) return [];
  return tomas.map(t => ({
    shotId: t.shotId,
    nota: t.nota || "",
    duracion: Number(t.duracion) || 3,
    marcador: t.marcador || "",
    transicion: t.transicion || "cut",
    grabada: !!t.grabada,
    seccionAsignada: t.seccionAsignada || null,
    overlay: t.overlay || null,
  }));
}

/* ============================================================
   MIGRACIÓN (una sola vez)
   ============================================================ */
async function ensureHooks() {
  // 1. ¿Ya existe config/hooks?
  const hooksDoc = await cloud.load(HOOKS_DOC);
  if (hooksDoc && Array.isArray(hooksDoc.list)) {
    state.hooks = hooksDoc.list;
    return false;
  }

  // 2. Buscar el documento viejo
  const legacy = await cloud.load(LEGACY_KEY);
  if (!legacy) {
    state.hooks = JSON.parse(JSON.stringify(HOOKS_DEFAULT));
    saveHooks();
    return false;
  }

  // 3. Backup local del legacy (por si algo falla)
  try { localStorage.setItem(BACKUP_KEY, JSON.stringify(legacy)); } catch {}

  // 4. Hooks
  state.hooks = Array.isArray(legacy.hooks) && legacy.hooks.length > 0
    ? legacy.hooks
    : JSON.parse(JSON.stringify(HOOKS_DEFAULT));
  saveHooks();

  // 5. Guion principal
  const now = new Date().toISOString();
  const mainId = newGuionId();
  await cloud.save(`${GUIONES_COL}/${mainId}`, {
    titulo: legacy.titulo || "Guion principal",
    cliente: legacy.cliente || "",
    duracion: legacy.duracion || 30,
    plantillaId: legacy.plantillaId || "tutorial",
    secciones: normalizeSecciones(legacy.secciones, legacy.plantillaId),
    tomas: normalizeTomas(legacy.tomas),
    createdAt: now,
    updatedAt: now,
  });

  // 6. Drafts → un guion por cada uno
  if (Array.isArray(legacy.drafts)) {
    for (const d of legacy.drafts) {
      if (!d || !d.snapshot) continue;
      const s = d.snapshot;
      const id = newGuionId();
      await cloud.save(`${GUIONES_COL}/${id}`, {
        titulo: d.nombre || s.titulo || "Borrador",
        cliente: s.cliente || "",
        duracion: s.duracion || 30,
        plantillaId: s.plantillaId || "tutorial",
        secciones: normalizeSecciones(s.secciones, s.plantillaId),
        tomas: normalizeTomas(s.tomas),
        createdAt: d.fecha || now,
        updatedAt: d.fecha || now,
      });
    }
  }

  // config/guion-v1 NO se borra — queda como respaldo manual.
  return true;
}

/* ============================================================
   CRUD DE GUIONES
   ============================================================ */
async function loadGuionesList() {
  const list = await cloud.list(GUIONES_COL);
  list.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  state.guionesList = list;
  return list;
}

async function loadGuionById(id) {
  const g = await cloud.load(`${GUIONES_COL}/${id}`);
  if (!g) return false;
  state.guionId = id;
  state.titulo = g.titulo || "";
  state.cliente = g.cliente || "";
  state.duracion = g.duracion || 30;
  state.plantillaId = g.plantillaId || "tutorial";
  state.secciones = normalizeSecciones(g.secciones, g.plantillaId);
  state.tomas = normalizeTomas(g.tomas);
  return true;
}

async function createNewGuion(titulo) {
  flushSave();
  const id = newGuionId();
  const now = new Date().toISOString();
  const secciones = seccionesDesdePlantilla("tutorial");
  const guion = {
    titulo: titulo || "Guion sin título",
    cliente: "",
    duracion: 30,
    plantillaId: "tutorial",
    secciones,
    tomas: [],
    createdAt: now,
    updatedAt: now,
  };
  await cloud.save(`${GUIONES_COL}/${id}`, guion);

  state.guionId = id;
  state.titulo = guion.titulo;
  state.cliente = "";
  state.duracion = 30;
  state.plantillaId = "tutorial";
  state.secciones = secciones;
  state.tomas = [];

  localStorage.setItem(LS_ACTIVE_ID, id);
  state.guionesList.unshift({ id, ...guion });
  return id;
}

async function switchGuion(id) {
  if (id === state.guionId) { closeGuionesModal(); return; }
  flushSave();
  const ok = await loadGuionById(id);
  if (!ok) { toast("No se pudo abrir el guion", "", "danger"); return; }
  localStorage.setItem(LS_ACTIVE_ID, id);
  renderAll();
  closeGuionesModal();
  toast("Guion abierto", state.titulo || "Sin título", "info");
}

async function deleteGuion(id) {
  const g = state.guionesList.find(x => x.id === id);
  if (!g) return;
  const isActive = state.guionId === id;
  openConfirm(
    "Eliminar guion",
    `Se eliminará "${g.titulo || "Sin título"}". Esta acción no se puede deshacer.`,
    "Eliminar",
    async () => {
      await cloud.remove(`${GUIONES_COL}/${id}`);
      state.guionesList = state.guionesList.filter(x => x.id !== id);

      if (isActive) {
        if (state.guionesList.length > 0) {
          await loadGuionById(state.guionesList[0].id);
          localStorage.setItem(LS_ACTIVE_ID, state.guionesList[0].id);
        } else {
          await createNewGuion("Guion sin título");
        }
        renderAll();
      }
      renderGuionesList();
      toast("Guion eliminado", "", "info");
    }
  );
}

async function duplicateGuion(id) {
  const source = await cloud.load(`${GUIONES_COL}/${id}`);
  if (!source) { toast("No se pudo duplicar", "", "danger"); return; }
  const newId = newGuionId();
  const now = new Date().toISOString();
  const copy = {
    titulo: (source.titulo || "Guion") + " (copia)",
    cliente: source.cliente || "",
    duracion: source.duracion || 30,
    plantillaId: source.plantillaId || "tutorial",
    secciones: source.secciones || [],
    tomas: source.tomas || [],
    createdAt: now,
    updatedAt: now,
  };
  await cloud.save(`${GUIONES_COL}/${newId}`, copy);
  state.guionesList.unshift({ id: newId, ...copy });
  state.guionesList.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
  renderGuionesList();
  toast("Guion duplicado", copy.titulo, "success");
}

/* ============================================================
   MODAL GUIONES
   ============================================================ */
function openGuionesModal() {
  renderGuionesList();
  $("#guionesModal").classList.add("on");
}
function closeGuionesModal() {
  $("#guionesModal").classList.remove("on");
}

function renderGuionesList() {
  const el = $("#guionesList");
  if (!el) return;

  if (state.guionesList.length === 0) {
    el.innerHTML = `<div class="empty-msg" style="margin:20px">No hay guiones todavía.<br>Pulsa "Nuevo" para crear el primero.</div>`;
    return;
  }

  el.innerHTML = state.guionesList.map(g => {
    const active = g.id === state.guionId;
    let fecha = "";
    if (g.updatedAt) {
      try {
        fecha = new Date(g.updatedAt).toLocaleDateString("es-VE", {
          day: "numeric", month: "short", year: "numeric",
        });
      } catch {}
    }
    return `
      <div class="guion-row ${active ? "active" : ""}" data-guion-open="${escapeHTML(g.id)}">
        <div class="gr-body">
          <div class="gr-title">${escapeHTML(g.titulo || "Sin título")}</div>
          <div class="gr-meta">${g.cliente ? escapeHTML(g.cliente) + " · " : ""}${escapeHTML(fecha)}</div>
        </div>
        ${active ? `<span class="badge badge-ready">Activo</span>` : ""}
        <button class="gr-action" data-guion-dup="${escapeHTML(g.id)}" title="Duplicar">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="gr-action danger" data-guion-del="${escapeHTML(g.id)}" title="Eliminar">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    `;
  }).join("");

  $$("[data-guion-open]").forEach(el => el.addEventListener("click", (e) => {
    if (e.target.closest("[data-guion-dup]") || e.target.closest("[data-guion-del]")) return;
    switchGuion(el.dataset.guionOpen);
  }));
  $$("[data-guion-dup]").forEach(b => b.addEventListener("click", (e) => {
    e.stopPropagation();
    duplicateGuion(b.dataset.guionDup);
  }));
  $$("[data-guion-del]").forEach(b => b.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteGuion(b.dataset.guionDel);
  }));
}

/* ============================================================
   HELPERS · DATOS ESTÁTICOS
   ============================================================ */
const plantilla     = id => PLANTILLAS.find(p => p.id === id) || PLANTILLAS[0];
const shot          = id => SHOTS.find(s => s.id === id);
const marcador      = id => MARCADORES.find(m => m.id === id);
const catHook       = id => CATEGORIAS_HOOKS.find(c => c.id === id) || { id, label: id };
const tipoSeccion   = id => TIPOS_SECCION.find(t => t.id === id) || TIPOS_SECCION[TIPOS_SECCION.length - 1];
const allTransitions = () => TRANSICIONES;
const transicion    = id => TRANSICIONES.find(t => t.id === id);
const secById       = id => state.secciones.find(s => s.id === id);

/* ============================================================
   HELPERS · FORMATO
   ============================================================ */
function fmtDur(sec) {
  sec = Math.max(0, Math.round(Number(sec) || 0));
  if (sec < 60) return sec + "s";
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return r === 0 ? m + "m" : m + "m " + r + "s";
}
function wordCount(text) {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}
function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.max(el.scrollHeight, 68) + "px";
}
const isYT = url => /youtube\.com|youtu\.be/.test(url || "");

function thumbHTML(video, tipo) {
  if (!video) return `<div class="thumb-label">${escapeHTML(tipo || "—")}</div>`;
  if (isYT(video)) {
    const id = (video.split("/").pop() || "").split("?")[0];
    return `<iframe src="${video}?mute=1&controls=0&loop=1&playlist=${id}" allow="autoplay; encrypted-media" loading="lazy"></iframe>`;
  }
  return `<video src="${escapeHTML(video)}" muted loop playsinline preload="metadata"></video>`;
}

/* ============================================================
   SECCIONES · helpers
   ============================================================ */
function crearSeccion(tipo, weight) {
  const t = TIPOS_SECCION.find(x => x.id === tipo) || TIPOS_SECCION[TIPOS_SECCION.length - 1];
  return {
    id: newSecId(),
    tipo: t.id,
    label: t.label,
    hint: t.hint,
    weight: typeof weight === "number" ? weight : t.weight,
    texto: "",
  };
}
function seccionesDesdePlantilla(tplId) {
  const tpl = plantilla(tplId);
  return tpl.estructura.map(e => crearSeccion(e.tipo, e.weight));
}

/* ============================================================
   MODALES GENÉRICOS
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

let saveCb = null;
function openSaveModal(title, desc, def, onOk) {
  $("#saveTitle").textContent = title;
  $("#saveDesc").textContent = desc;
  $("#saveName").value = def || "";
  saveCb = onOk;
  $("#saveModal").classList.add("on");
  setTimeout(() => { $("#saveName").focus(); $("#saveName").select(); }, 60);
}
function closeSaveModal() {
  $("#saveModal").classList.remove("on");
  saveCb = null;
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
   TABS
   ============================================================ */
function switchTab(tabId) {
  state.activeTab = tabId;
  localStorage.setItem(LS_ACTIVE_TAB, tabId);
  $$(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
  $$(".tab-panel").forEach(p => {
    const active = p.dataset.panel === tabId;
    p.classList.toggle("active", active);
    p.hidden = !active;
  });
  if (tabId === "tomas") { renderSecuencia(); renderGuionRef(); }
  if (tabId === "transiciones") renderTransiciones();
  if (tabId === "hooks") renderHooks();
  if (tabId === "guion") renderAllGuion();
}

/* ============================================================
   TAB 1 · GUION
   ============================================================ */
function renderDurChips() {
  $("#durChips").innerHTML = DURACIONES.map(d => `
    <button class="dur-chip ${state.duracion === d.s ? "active" : ""}" data-dur="${d.s}">
      ${d.label}
    </button>
  `).join("");
  $$("#durChips [data-dur]").forEach(b => b.addEventListener("click", () => {
    state.duracion = +b.dataset.dur;
    save(); renderDurChips(); renderAllGuion(); renderSecuencia();
  }));
}

function renderTplPicker() {
  $("#tplPicker").innerHTML = PLANTILLAS.map(p => `
    <button class="tpl-opt ${state.plantillaId === p.id ? "active" : ""}" data-tpl="${p.id}">
      <div class="tpl-name">${escapeHTML(p.nombre)}</div>
      <div class="tpl-desc">${escapeHTML(p.desc)}</div>
    </button>
  `).join("");
  $$("#tplPicker [data-tpl]").forEach(b => b.addEventListener("click", () => {
    const newId = b.dataset.tpl;
    if (newId === state.plantillaId) return;
    const hasContent = state.secciones.some(s => s.texto && s.texto.trim()) || state.tomas.length > 0;
    if (hasContent) {
      openConfirm(
        "Cambiar plantilla",
        "Esto reemplazará las secciones actuales. Los textos que se puedan conservar por tipo se mantendrán.",
        "Cambiar",
        () => applyTemplateChange(newId)
      );
    } else {
      applyTemplateChange(newId);
    }
  }));
}

function applyTemplateChange(newId) {
  const textosPorTipo = {};
  state.secciones.forEach(s => {
    if (s.texto && s.texto.trim()) textosPorTipo[s.tipo] = s.texto;
  });
  state.plantillaId = newId;
  const nuevas = seccionesDesdePlantilla(newId);
  nuevas.forEach(s => { if (textosPorTipo[s.tipo]) s.texto = textosPorTipo[s.tipo]; });
  state.secciones = nuevas;

  const validIds = new Set(state.secciones.map(s => s.id));
  state.tomas.forEach(t => {
    if (t.seccionAsignada && !validIds.has(t.seccionAsignada)) t.seccionAsignada = null;
  });

  save(); renderTplPicker(); renderAllGuion(); renderSecuencia();
  toast("Plantilla aplicada", plantilla(newId).nombre, "info");
}

function renderScriptList() {
  const list = $("#scriptList");
  if (state.secciones.length === 0) {
    list.innerHTML = `
      <div class="empty-msg" style="margin:16px">
        No hay secciones.<br>
        Pulsa "+ Añadir sección" abajo para empezar, o elige una plantilla arriba.
      </div>
    `;
    return;
  }

  list.innerHTML = state.secciones.map((sec, idx) => {
    const text = sec.texto || "";
    const words = wordCount(text);
    const target = Math.round(state.duracion * PALABRAS_POR_SEGUNDO * (sec.weight || 0));
    const isHook = sec.tipo === "hook";

    const tomasAsignadas = state.tomas
      .map((t, i) => ({ ...t, idx: i }))
      .filter(t => t.seccionAsignada === sec.id);

    const isFirst = idx === 0;
    const isLast = idx === state.secciones.length - 1;

    const tomasHTML = tomasAsignadas.length === 0
      ? `<div class="sec-tomas empty">
          <div class="st-head">
            <span>Tomas asignadas</span>
            <span class="st-spacer"></span>
            <button data-assign-open="${sec.id}">
              <svg class="icon" style="width:11px;height:11px" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
              Asignar
            </button>
          </div>
          <div class="st-empty">Esta sección no tiene tomas asociadas. Asígnale alguna para cubrir lo que dices.</div>
        </div>`
      : `<div class="sec-tomas">
          <div class="st-head">
            <span>Tomas asignadas · ${tomasAsignadas.length}</span>
            <span class="st-spacer"></span>
            <button data-assign-open="${sec.id}">
              <svg class="icon" style="width:11px;height:11px" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
              Editar
            </button>
          </div>
          <div class="st-chips">
            ${tomasAsignadas.map(t => {
              const s = shot(t.shotId);
              return `<span class="toma-chip">
                <span class="tc-num">${t.idx + 1}</span>
                <span class="tc-name">${escapeHTML(s ? s.nombre : t.shotId)}</span>
                <span class="tc-x" data-unassign="${sec.id}:${t.idx}" title="Quitar">×</span>
              </span>`;
            }).join("")}
          </div>
        </div>`;

    return `
      <div class="script-sec" data-sec="${sec.id}" data-tipo="${sec.tipo}">
        <div class="sec-head">
          <span class="sec-label ${sec.tipo}">${escapeHTML(sec.label)}</span>
          <span class="sec-hint">${escapeHTML(sec.hint || "")}</span>
          <span class="sec-target" data-target="${sec.id}">~${target} pal.</span>
          <div class="sec-tools">
            <button class="sec-tool" data-sec-edit="${sec.id}" title="Editar sección">
              <svg class="icon" style="width:13px;height:13px" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
            <button class="sec-tool" data-sec-up="${sec.id}" title="Mover arriba" ${isFirst ? "disabled" : ""}>
              <svg class="icon" style="width:13px;height:13px" viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button class="sec-tool" data-sec-down="${sec.id}" title="Mover abajo" ${isLast ? "disabled" : ""}>
              <svg class="icon" style="width:13px;height:13px" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button class="sec-tool danger" data-sec-del="${sec.id}" title="Eliminar sección">
              <svg class="icon" style="width:13px;height:13px" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <textarea class="sec-textarea" data-input="${sec.id}" rows="3" placeholder="Escribe aquí…">${escapeHTML(text)}</textarea>
        <div class="sec-actions">
          <span class="foot-stat" data-wc="${sec.id}">${words} palabras · ${fmtDur(words / PALABRAS_POR_SEGUNDO)}</span>
          <div class="spacer"></div>
          ${isHook ? `
            <button class="hook-action" data-hook-open="${sec.id}">
              <svg class="icon" style="width:11px;height:11px" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              Insertar hook
            </button>
          ` : ""}
          <button data-clear="${sec.id}" title="Limpiar sección">
            <svg class="icon" style="width:11px;height:11px" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            Limpiar
          </button>
        </div>
        ${tomasHTML}
      </div>
    `;
  }).join("");

  $$("[data-input]").forEach(ta => {
    autoResize(ta);
    ta.addEventListener("input", () => {
      const s = secById(ta.dataset.input);
      if (!s) return;
      s.texto = ta.value;
      save(); autoResize(ta);
      updateSectionMeta(ta.dataset.input);
      updateAllGuion();
    });
  });
  $$("[data-clear]").forEach(b => b.addEventListener("click", () => {
    const s = secById(b.dataset.clear);
    if (!s || !s.texto) return;
    s.texto = "";
    save(); renderAllGuion();
  }));
  $$("[data-hook-open]").forEach(b => b.addEventListener("click", () => {
    openHooksDrawer("guion", b.dataset.hookOpen);
  }));
  $$("[data-assign-open]").forEach(b => b.addEventListener("click", () => {
    openAssignModal(b.dataset.assignOpen);
  }));
  $$("[data-unassign]").forEach(b => b.addEventListener("click", () => {
    const [secId, idx] = b.dataset.unassign.split(":");
    const i = +idx;
    if (state.tomas[i]) {
      state.tomas[i].seccionAsignada = null;
      save(); renderAllGuion(); renderSecuencia();
    }
  }));
  $$("[data-sec-edit]").forEach(b => b.addEventListener("click", () => openEditSec(b.dataset.secEdit)));
  $$("[data-sec-up]").forEach(b => b.addEventListener("click", () => moveSeccion(b.dataset.secUp, -1)));
  $$("[data-sec-down]").forEach(b => b.addEventListener("click", () => moveSeccion(b.dataset.secDown, +1)));
  $$("[data-sec-del]").forEach(b => b.addEventListener("click", () => deleteSeccion(b.dataset.secDel)));
}

function updateSectionMeta(secId) {
  const s = secById(secId);
  if (!s) return;
  const words = wordCount(s.texto || "");
  const target = Math.round(state.duracion * PALABRAS_POR_SEGUNDO * (s.weight || 0));

  const wcEl = $(`[data-wc="${secId}"]`);
  const targetEl = $(`[data-target="${secId}"]`);
  if (wcEl) wcEl.textContent = `${words} palabras · ${fmtDur(words / PALABRAS_POR_SEGUNDO)}`;
  if (targetEl) {
    targetEl.textContent = `~${target} pal.`;
    targetEl.classList.remove("ok", "warn", "over");
    if (target > 0) {
      const ratio = words / target;
      if (ratio > 1.4) targetEl.classList.add("over");
      else if (ratio > 1.15) targetEl.classList.add("warn");
      else if (ratio >= 0.6) targetEl.classList.add("ok");
    }
  }
}

function updateAllGuion() {
  const allText = state.secciones.map(s => s.texto || "").join(" ");
  const totalWords = wordCount(allText);
  const totalTime = totalWords / PALABRAS_POR_SEGUNDO;
  const target = state.duracion;
  const secDone = state.secciones.filter(s => (s.texto || "").trim().length > 0).length;

  $("#secCounter").textContent = `${secDone} / ${state.secciones.length} completas`;
  $("#progressValue").textContent = `${totalWords} / ~${Math.round(target * PALABRAS_POR_SEGUNDO)} palabras`;
  $("#progressTime").textContent = fmtDur(totalTime) + " escritos";
  $("#progressTarget").textContent = "Objetivo: " + fmtDur(target);

  const pct = target > 0 ? Math.min(100, (totalTime / target) * 100) : 0;
  const fill = $("#progressFill");
  fill.style.width = pct + "%";
  fill.classList.remove("warn", "over");
  if (totalTime > target * 1.25) fill.classList.add("over");
  else if (totalTime > target * 1.1) fill.classList.add("warn");

  renderCoverage();
}

function renderCoverage() {
  const rows = state.secciones.map(sec => {
    const count = state.tomas.filter(t => t.seccionAsignada === sec.id).length;
    return { sec, count };
  });
  if (rows.length === 0) {
    $("#coverageList").innerHTML = `<div class="empty-msg">Añade secciones al guion para ver la cobertura.</div>`;
    return;
  }
  $("#coverageList").innerHTML = rows.map(r => `
    <div class="coverage-row ${r.count === 0 ? "warn" : ""}">
      <span class="cv-dot"></span>
      <span class="cv-name">${escapeHTML(r.sec.label)}</span>
      <span class="cv-count">${r.count} ${r.count === 1 ? "toma" : "tomas"}</span>
    </div>
  `).join("");
}

function renderQuickHooks() {
  const favs = state.hooks.filter(h => h.fav).slice(0, 5);
  const list = favs.length > 0 ? favs : state.hooks.slice(0, 5);
  if (list.length === 0) {
    $("#quickHooks").innerHTML = `<div style="font-size:12px;color:var(--text-subtle);line-height:1.5">Aún no tienes hooks. Ve a la pestaña Hooks para crear algunos.</div>`;
    return;
  }
  $("#quickHooks").innerHTML = `<div class="quick-hooks">${list.map(h => {
    const html = escapeHTML(h.texto).replace(/\[([^\]]+)\]/g, '<span class="qh-var">[$1]</span>');
    return `<button class="quick-hook" data-quick-hook="${h.id}">${html}</button>`;
  }).join("")}</div>`;
  $$("[data-quick-hook]").forEach(b => b.addEventListener("click", () => {
    const h = state.hooks.find(x => x.id === b.dataset.quickHook);
    if (h) insertHookIntoSection(h, firstHookSectionId());
  }));
}

function firstHookSectionId() {
  const h = state.secciones.find(s => s.tipo === "hook");
  if (h) return h.id;
  return state.secciones[0] ? state.secciones[0].id : null;
}

function renderAllGuion() {
  $("#titulo").value = state.titulo;
  $("#cliente").value = state.cliente;
  renderTplPicker();
  renderDurChips();
  renderScriptList();
  renderQuickHooks();
  updateAllGuion();
  ensureAddSecButton();
}

function ensureAddSecButton() {
  let btn = $("#btnAddSec");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "btnAddSec";
    btn.className = "add-sec-btn";
    btn.innerHTML = `
      <svg class="icon" style="width:14px;height:14px" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
      Añadir sección
    `;
    btn.addEventListener("click", openAddSecModal);
  }
  const list = $("#scriptList");
  if (list && btn.parentNode !== list.parentNode) {
    list.parentNode.insertBefore(btn, list.nextSibling);
  }
}

/* ============================================================
   SECCIONES · CRUD
   ============================================================ */
function openAddSecModal() {
  const el = $("#addSecList");
  el.innerHTML = TIPOS_SECCION.map(t => `
    <button class="assign-opt" data-add-sec="${t.id}">
      <span class="ao-num ${escapeHTML(t.id)}">${escapeHTML(t.label.charAt(0))}</span>
      <span class="ao-body">
        <span class="ao-name">${escapeHTML(t.label)}</span>
        <span class="ao-meta">${escapeHTML(t.hint || "")}</span>
      </span>
    </button>
  `).join("");
  $$("[data-add-sec]").forEach(b => b.addEventListener("click", () => {
    const s = crearSeccion(b.dataset.addSec);
    state.secciones.push(s);
    save();
    $("#addSecModal").classList.remove("on");
    renderAllGuion(); renderSecuencia();
    toast("Sección añadida", s.label, "success");
  }));
  $("#addSecModal").classList.add("on");
}

let editingSecId = null;

function openEditSec(secId) {
  const s = secById(secId);
  if (!s) return;
  editingSecId = secId;
  $("#editSecTitle").textContent = `Editar "${s.label}"`;
  $("#editSecLabel").value = s.label;
  $("#editSecHint").value = s.hint || "";
  const wRange = $("#editSecWeight");
  wRange.value = s.weight;
  $("#editSecWeightValue").textContent = Number(s.weight).toFixed(2);

  $("#editSecTipo").innerHTML = TIPOS_SECCION.map(t => `
    <button class="filter-chip ${s.tipo === t.id ? "active" : ""}" data-edit-tipo="${t.id}">
      ${escapeHTML(t.label)}
    </button>
  `).join("");
  $$("[data-edit-tipo]").forEach(b => b.addEventListener("click", () => {
    $$("[data-edit-tipo]").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
  }));

  $("#editSecModal").classList.add("on");
  setTimeout(() => $("#editSecLabel").focus(), 60);
}

function saveEditSec() {
  const s = secById(editingSecId);
  if (!s) return;
  const label = $("#editSecLabel").value.trim();
  if (!label) { toast("Nombre requerido", "", "danger"); return; }
  const hint = $("#editSecHint").value.trim();
  const tipoBtn = $("#editSecTipo .filter-chip.active");
  const tipo = tipoBtn ? tipoBtn.dataset.editTipo : s.tipo;
  const weight = parseFloat($("#editSecWeight").value);

  s.label = label; s.hint = hint; s.tipo = tipo; s.weight = weight;

  save();
  $("#editSecModal").classList.remove("on");
  editingSecId = null;
  renderAllGuion(); renderSecuencia(); renderGuionRef();
  toast("Sección actualizada", label, "success");
}

function moveSeccion(id, dir) {
  const idx = state.secciones.findIndex(s => s.id === id);
  if (idx < 0) return;
  const j = idx + dir;
  if (j < 0 || j >= state.secciones.length) return;
  [state.secciones[idx], state.secciones[j]] = [state.secciones[j], state.secciones[idx]];
  save(); renderAllGuion(); renderSecuencia(); renderGuionRef();
}

function deleteSeccion(id) {
  const s = secById(id);
  if (!s) return;
  const hasText = (s.texto || "").trim().length > 0;
  const tomasCount = state.tomas.filter(t => t.seccionAsignada === id).length;

  const msg = hasText || tomasCount > 0
    ? `Se eliminará "${s.label}" con su texto${tomasCount > 0 ? ` y ${tomasCount} toma${tomasCount === 1 ? "" : "s"} asignada${tomasCount === 1 ? "" : "s"}` : ""}.`
    : `Se eliminará "${s.label}".`;

  openConfirm("Eliminar sección", msg, "Eliminar", () => {
    state.secciones = state.secciones.filter(x => x.id !== id);
    state.tomas.forEach(t => { if (t.seccionAsignada === id) t.seccionAsignada = null; });
    save(); renderAllGuion(); renderSecuencia(); renderGuionRef();
    toast("Sección eliminada", s.label, "info");
  });
}

/* ============================================================
   GUION DE REFERENCIA
   ============================================================ */
function renderGuionRef() {
  const el = $("#guionRef");
  if (!el) return;
  const totalSec = state.secciones.length;
  const secDone = state.secciones.filter(s => (s.texto || "").trim()).length;
  const totalWords = wordCount(state.secciones.map(s => s.texto || "").join(" "));

  const infoEl = $("#guionRefInfo");
  if (infoEl) infoEl.textContent = `${secDone} / ${totalSec} secciones · ${fmtDur(totalWords / PALABRAS_POR_SEGUNDO)}`;

  const gridEl = $("#guionRefGrid");
  if (!gridEl) return;

  if (totalSec === 0) {
    gridEl.innerHTML = `<div class="empty-msg">Añade secciones al guion para verlas aquí.</div>`;
    return;
  }

  gridEl.innerHTML = state.secciones.map(sec => {
    const text = (sec.texto || "").trim();
    const tomaCount = state.tomas.filter(t => t.seccionAsignada === sec.id).length;
    const isEmpty = !text;
    return `
      <div class="gr-sec ${isEmpty ? "empty" : ""}">
        <div class="grs-head">
          <span class="grs-label ${sec.tipo}">${escapeHTML(sec.label)}</span>
          <span class="grs-count ${tomaCount > 0 ? "has" : ""}">
            ${tomaCount} ${tomaCount === 1 ? "toma" : "tomas"}
          </span>
        </div>
        <div class="grs-text">${isEmpty ? "Sin escribir" : escapeHTML(text)}</div>
        <div class="grs-actions">
          <button data-jump-to-guion="${sec.id}">Editar →</button>
          ${tomaCount === 0 ? `<button data-assign-from-ref="${sec.id}">Asignar tomas</button>` : ""}
        </div>
      </div>
    `;
  }).join("");

  $$("[data-jump-to-guion]").forEach(b => b.addEventListener("click", () => {
    switchTab("guion");
    setTimeout(() => {
      const target = $(`[data-sec="${b.dataset.jumpToGuion}"]`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        const ta = target.querySelector("textarea");
        if (ta) ta.focus();
      }
    }, 100);
  }));
  $$("[data-assign-from-ref]").forEach(b => b.addEventListener("click", () => {
    openAssignModal(b.dataset.assignFromRef);
  }));
}

function toggleGuionRef() {
  state.ui.guionRefOpen = !state.ui.guionRefOpen;
  localStorage.setItem(LS_REF_OPEN, state.ui.guionRefOpen ? "true" : "false");
  const el = $("#guionRef");
  if (el) el.classList.toggle("open", state.ui.guionRefOpen);
}

/* ============================================================
   TAB 2 · TOMAS
   ============================================================ */
let libFilter = "all";
let libSearch = "";

function renderLibFilters() {
  const cats = ["all", ...new Set(SHOTS.map(s => s.cat))];
  $("#libFilters").innerHTML = cats.map(c => `
    <button class="filter-chip ${c === libFilter ? "active" : ""}" data-filter="${c}">
      ${c === "all" ? "Todas" : escapeHTML(c)}
    </button>
  `).join("");
  $$("[data-filter]").forEach(b => b.addEventListener("click", () => {
    libFilter = b.dataset.filter;
    renderLibFilters(); renderLib();
  }));
}

function renderLib() {
  const q = libSearch.toLowerCase().trim();
  const list = SHOTS.filter(s => {
    if (libFilter !== "all" && s.cat !== libFilter) return false;
    if (!q) return true;
    return (s.nombre + " " + s.descripcion + " " + (s.tags || []).join(" ")).toLowerCase().includes(q);
  });
  $("#libCount").textContent = list.length;
  if (list.length === 0) {
    $("#libGrid").innerHTML = `<div class="empty-msg" style="grid-column:1/-1">Sin resultados.</div>`;
    return;
  }
  $("#libGrid").innerHTML = list.map(s => `
    <button class="lib-card" data-add="${s.id}">
      <div class="lib-thumb">${thumbHTML(s.video, s.cat)}</div>
      <div class="lib-name">${escapeHTML(s.nombre)}</div>
      <div class="lib-foot">
        <span>${escapeHTML(s.cat)}</span>
        <span>~${fmtDur(s.duracion)}</span>
      </div>
    </button>
  `).join("");
  $$("[data-add]").forEach(el => el.addEventListener("click", () => addShot(el.dataset.add)));
}

function addShot(shotId) {
  const s = shot(shotId);
  if (!s) return;
  const prev = state.tomas[state.tomas.length - 1];
  state.tomas.push({
    shotId,
    nota: "",
    duracion: s.duracion || 3,
    marcador: "",
    transicion: prev ? (prev.transicion || "cut") : "",
    grabada: false,
    seccionAsignada: null,
    overlay: null,
  });
  save(); renderSecuencia(); renderAllGuion();
  updateTabBadges();
}

function removeToma(i) {
  state.tomas.splice(i, 1);
  save(); renderSecuencia(); renderAllGuion(); updateTabBadges();
}
function moveToma(i, dir) {
  const j = i + dir;
  if (j < 0 || j >= state.tomas.length) return;
  [state.tomas[i], state.tomas[j]] = [state.tomas[j], state.tomas[i]];
  save(); renderSecuencia();
}
function duplicateToma(i) {
  const copy = { ...state.tomas[i] };
  state.tomas.splice(i + 1, 0, copy);
  save(); renderSecuencia(); renderAllGuion(); updateTabBadges();
}
function updateTomaField(i, field, value) {
  state.tomas[i][field] = value;
  save();
}

function renderSecuencia() {
  const strip = $("#seqStrip");
  if (!strip) return;
  const n = state.tomas.length;
  const totalDur = state.tomas.reduce((a, t) => a + (Number(t.duracion) || 0), 0);

  $("#statTomas").textContent = n;
  $("#statDuracion").textContent = fmtDur(totalDur);

  const badge = $("#badgeDur");
  if (n === 0) { badge.textContent = "—"; badge.className = "badge badge-dur"; }
  else if (totalDur < 30) { badge.textContent = "Reel corto"; badge.className = "badge badge-dur ok"; }
  else if (totalDur <= 60) { badge.textContent = "Reel estándar"; badge.className = "badge badge-dur ok"; }
  else if (totalDur <= 90) { badge.textContent = "Reel largo"; badge.className = "badge badge-dur warn"; }
  else { badge.textContent = "Excede 90s"; badge.className = "badge badge-dur over"; }

  if (n === 0) {
    strip.innerHTML = `<div class="seq-empty">Aún no hay tomas.<br>Añade tomas desde la biblioteca de la izquierda.</div>`;
    return;
  }

  strip.innerHTML = state.tomas.map((it, i) => {
    const s = shot(it.shotId);
    if (!s) return "";
    const isFirst = i === 0;
    const isLast = i === n - 1;
    const markerOpts = [
      `<option value="">— marcador —</option>`,
      ...MARCADORES.map(m => `<option value="${m.id}" ${it.marcador === m.id ? "selected" : ""}>${m.label}</option>`)
    ].join("");

    const secAssigned = it.seccionAsignada ? secById(it.seccionAsignada) : null;
    const secLabel = secAssigned ? secAssigned.label : "Sin sección";

    const ov = it.overlay && it.overlay.shotId ? shot(it.overlay.shotId) : null;
    const overlayHTML = `
      <button class="seq-overlay ${ov ? "assigned" : ""}" data-overlay="${i}" title="${ov ? "Cambiar B-roll" : "Añadir B-roll sobre esta toma"}">
        ${ov
          ? `<svg class="icon" style="width:11px;height:11px" viewBox="0 0 24 24"><rect x="2" y="7" width="15" height="10" rx="1"/><path d="M17 10l5-3v10l-5-3"/></svg>
             <span style="overflow:hidden;text-overflow:ellipsis">${escapeHTML(ov.nombre)}</span>
             <span class="so-x" data-overlay-clear="${i}">×</span>`
          : `<svg class="icon" style="width:11px;height:11px" viewBox="0 0 24 24"><rect x="2" y="7" width="15" height="10" rx="1"/><path d="M17 10l5-3v10l-5-3"/><path d="M12 5v3M10.5 6.5h3"/></svg>
             <span>+ B-roll</span>`}
      </button>
    `;

    const cardHTML = `
      <div class="seq-item ${it.grabada ? "grabada" : ""}" data-i="${i}" draggable="true">
        <div class="seq-top">
          <span class="seq-num">${i + 1}</span>
          <select class="chip-select marker" data-marcador="${i}" data-value="${escapeHTML(it.marcador || "")}">
            ${markerOpts}
          </select>
          <button class="seq-remove" data-remove="${i}" aria-label="Quitar">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="seq-thumb">
          ${thumbHTML(s.video, s.cat)}
          <span class="seq-dur">${fmtDur(it.duracion)}</span>
        </div>
        <div class="seq-name">${escapeHTML(s.nombre)}</div>
        <button class="seq-section-chip ${it.seccionAsignada ? "assigned" : ""}" data-section-pick="${i}" title="Cambiar sección asignada">
          <svg class="icon" style="width:11px;height:11px" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <span class="sc-name">${escapeHTML(secLabel)}</span>
        </button>
        ${overlayHTML}
        <div class="seq-controls">
          <input type="number" class="seq-dur-input" data-dur="${i}" value="${it.duracion}" min="0" step="1" title="Duración (seg)" />
          <span class="unit">s</span>
          <div class="spacer" style="flex:1"></div>
          <button class="mini ${it.grabada ? "active" : ""}" data-grabada="${i}" title="Marcar como grabada">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
          <button class="mini" data-dup="${i}" title="Duplicar">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="mini" data-move-left="${i}" title="Mover" ${isFirst ? "disabled" : ""}>
            <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="mini" data-move-right="${i}" title="Mover" ${isLast ? "disabled" : ""}>
            <svg class="icon icon-sm" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <textarea class="seq-nota" data-nota="${i}" placeholder="Nota para esta toma…" rows="2">${escapeHTML(it.nota || "")}</textarea>
      </div>
    `;

    let dividerHTML = "";
    if (!isLast) {
      const nextIt = state.tomas[i + 1];
      const transId = nextIt.transicion || "cut";
      const isDefault = transId === "cut";
      const trans = transicion(transId);
      const label = trans ? trans.label : "Corte";
      dividerHTML = `
        <div class="seq-divider">
          <button class="divider-btn ${!isDefault ? "active" : ""}"
                  data-trans-open="${i + 1}"
                  title="Transición: ${escapeHTML(label)}">
            ${!isDefault
              ? escapeHTML(label)
              : `<svg class="icon icon-sm" viewBox="0 0 24 24" style="width:12px;height:12px"><path d="M12 5v14M5 12h14"/></svg>`}
          </button>
        </div>
      `;
    }
    return cardHTML + dividerHTML;
  }).join("");

  // Bindings
  $$("[data-remove]").forEach(b => b.addEventListener("click", () => removeToma(+b.dataset.remove)));
  $$("[data-dup]").forEach(b => b.addEventListener("click", () => duplicateToma(+b.dataset.dup)));
  $$("[data-move-left]").forEach(b => b.addEventListener("click", () => moveToma(+b.dataset.moveLeft, -1)));
  $$("[data-move-right]").forEach(b => b.addEventListener("click", () => moveToma(+b.dataset.moveRight, +1)));
  $$("[data-grabada]").forEach(b => b.addEventListener("click", () => {
    const i = +b.dataset.grabada;
    state.tomas[i].grabada = !state.tomas[i].grabada;
    save(); renderSecuencia();
  }));
  $$("[data-dur]").forEach(inp => inp.addEventListener("input", () => {
    const i = +inp.dataset.dur;
    const v = inp.value === "" ? 0 : Number(inp.value);
    state.tomas[i].duracion = v;
    save();
    const card = inp.closest(".seq-item");
    if (card) card.querySelector(".seq-dur").textContent = fmtDur(v);
    const totalDur = state.tomas.reduce((a, t) => a + (Number(t.duracion) || 0), 0);
    $("#statDuracion").textContent = fmtDur(totalDur);
  }));
  $$("[data-marcador]").forEach(sel => {
    sel.addEventListener("change", () => {
      sel.dataset.value = sel.value;
      updateTomaField(+sel.dataset.marcador, "marcador", sel.value);
    });
  });
  $$("[data-trans-open]").forEach(b => b.addEventListener("click", () => openTransPicker(+b.dataset.transOpen)));
  $$("[data-nota]").forEach(ta => {
    autoResize(ta);
    ta.addEventListener("input", () => {
      updateTomaField(+ta.dataset.nota, "nota", ta.value);
      autoResize(ta);
    });
  });
  $$("[data-section-pick]").forEach(b => b.addEventListener("click", () => openSectionPickerForToma(+b.dataset.sectionPick)));
  $$("[data-overlay]").forEach(b => b.addEventListener("click", (e) => {
    if (e.target.dataset.overlayClear) return;
    openOverlayModal(+b.dataset.overlay);
  }));
  $$("[data-overlay-clear]").forEach(b => b.addEventListener("click", (e) => {
    e.stopPropagation();
    const i = +b.dataset.overlayClear;
    state.tomas[i].overlay = null;
    save(); renderSecuencia();
  }));

  let dragIndex = null;
  $$(".seq-item").forEach(card => {
    card.addEventListener("dragstart", e => {
      dragIndex = +card.dataset.i;
      card.style.opacity = "0.4";
      e.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend", () => { card.style.opacity = ""; });
    card.addEventListener("dragover", e => e.preventDefault());
    card.addEventListener("drop", e => {
      e.preventDefault();
      const target = +card.dataset.i;
      if (dragIndex === null || dragIndex === target) return;
      const [moved] = state.tomas.splice(dragIndex, 1);
      state.tomas.splice(target, 0, moved);
      save(); renderSecuencia();
    });
  });

  renderGuionRef();
}

/* ============================================================
   OVERLAY (B-roll)
   ============================================================ */
let overlayIndex = null;

function openOverlayModal(i) {
  overlayIndex = i;
  const current = state.tomas[i].overlay;
  renderOverlayList(current ? current.shotId : null);
  $("#overlayModal").classList.add("on");
}

function renderOverlayList(selectedId) {
  const list = $("#overlayList");
  if (!list) return;
  list.innerHTML = SHOTS.map(s => {
    const isSel = s.id === selectedId;
    return `
      <button class="assign-opt ${isSel ? "checked" : ""}" data-overlay-pick="${s.id}">
        <span class="ao-num">${s.nombre.charAt(0).toUpperCase()}</span>
        <span class="ao-body">
          <span class="ao-name">${escapeHTML(s.nombre)}</span>
          <span class="ao-meta">${escapeHTML(s.cat)} · ~${fmtDur(s.duracion)}</span>
        </span>
      </button>
    `;
  }).join("");
  $$("[data-overlay-pick]").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.overlayPick;
    state.tomas[overlayIndex].overlay = { shotId: id, nota: "" };
    save();
    $("#overlayModal").classList.remove("on");
    renderSecuencia();
    toast("B-roll asignado", "", "success");
  }));
}

function clearOverlay() {
  if (overlayIndex === null) return;
  state.tomas[overlayIndex].overlay = null;
  save();
  $("#overlayModal").classList.remove("on");
  renderSecuencia();
  toast("Overlay eliminado", "", "info");
}

/* ============================================================
   ASIGNAR TOMAS A SECCIONES
   ============================================================ */
let assignSectionId = null;
let assignSelected = new Set();

function openAssignModal(secId) {
  assignSectionId = secId;
  const sec = secById(secId);
  if (!sec) return;
  $("#assignTitle").textContent = `Asignar tomas a "${sec.label}"`;
  assignSelected = new Set(
    state.tomas.map((t, i) => t.seccionAsignada === secId ? i : -1).filter(i => i >= 0)
  );
  renderAssignList();
  $("#assignConfirm").style.display = "";
  $("#assignModal").classList.add("on");
}

function renderAssignList() {
  const list = $("#assignList");
  if (state.tomas.length === 0) {
    list.innerHTML = `<div class="empty-msg">No hay tomas en la secuencia todavía.</div>`;
    return;
  }
  list.innerHTML = state.tomas.map((t, i) => {
    const s = shot(t.shotId);
    const checked = assignSelected.has(i) ? "checked" : "";
    const otherSec = t.seccionAsignada && t.seccionAsignada !== assignSectionId ? secById(t.seccionAsignada) : null;
    const meta = otherSec ? `En "${otherSec.label}" · ${fmtDur(t.duracion)}` : fmtDur(t.duracion);
    return `
      <label class="assign-opt ${checked}">
        <input type="checkbox" data-assign-i="${i}" ${checked ? "checked" : ""} style="display:none" />
        <span class="ao-num">${i + 1}</span>
        <span class="ao-body">
          <span class="ao-name">${escapeHTML(s ? s.nombre : t.shotId)}</span>
          <span class="ao-meta">${escapeHTML(meta)}</span>
        </span>
      </label>
    `;
  }).join("");

  $$("[data-assign-i]").forEach(inp => inp.addEventListener("change", () => {
    const i = +inp.dataset.assignI;
    if (inp.checked) assignSelected.add(i); else assignSelected.delete(i);
    inp.closest(".assign-opt").classList.toggle("checked", inp.checked);
  }));
}

function confirmAssign() {
  state.tomas.forEach(t => { if (t.seccionAsignada === assignSectionId) t.seccionAsignada = null; });
  assignSelected.forEach(i => { if (state.tomas[i]) state.tomas[i].seccionAsignada = assignSectionId; });
  save();
  $("#assignModal").classList.remove("on");
  renderAllGuion(); renderSecuencia();
  toast("Asignación guardada", "", "success");
}

function openSectionPickerForToma(i) {
  const options = [{ id: null, label: "Sin sección" }, ...state.secciones.map(s => ({ id: s.id, label: s.label }))];
  const current = state.tomas[i].seccionAsignada;

  $("#assignTitle").textContent = `Asignar toma ${i + 1} a una sección`;
  $("#assignList").innerHTML = options.map(o => `
    <button class="assign-opt ${o.id === current ? "checked" : ""}" data-pick-sec="${o.id || ""}">
      <span class="ao-num">${o.id ? o.label.charAt(0).toUpperCase() : "—"}</span>
      <span class="ao-body"><span class="ao-name">${escapeHTML(o.label)}</span></span>
    </button>
  `).join("");
  $("#assignConfirm").style.display = "none";
  $$("[data-pick-sec]").forEach(b => b.addEventListener("click", () => {
    state.tomas[i].seccionAsignada = b.dataset.pickSec || null;
    save();
    $("#assignModal").classList.remove("on");
    $("#assignConfirm").style.display = "";
    renderAllGuion(); renderSecuencia();
  }));
  $("#assignModal").classList.add("on");
}

function autoAssignTomas() {
  if (state.tomas.length === 0) { toast("No hay tomas", "Añade tomas primero.", "danger"); return; }
  if (state.secciones.length === 0) { toast("No hay secciones", "Añade secciones al guion primero.", "danger"); return; }

  const total = state.tomas.length;
  let cursor = 0;
  const counts = state.secciones.map((sec, idx) => {
    if (idx === state.secciones.length - 1) return total - cursor;
    const n = Math.max(1, Math.round(total * (sec.weight || 0)));
    cursor += n;
    return n;
  });

  let sum = counts.reduce((a, b) => a + b, 0);
  while (sum > total) { counts[counts.indexOf(Math.max(...counts))]--; sum--; }
  while (sum < total) {
    const minIdx = counts.slice(0, -1).indexOf(Math.min(...counts.slice(0, -1)));
    counts[minIdx]++; sum++;
  }

  let i = 0;
  state.secciones.forEach((sec, si) => {
    for (let k = 0; k < counts[si]; k++) {
      if (i < state.tomas.length) { state.tomas[i].seccionAsignada = sec.id; i++; }
    }
  });

  save(); renderSecuencia(); renderAllGuion();
  toast("Asignación sugerida", "Ajusta manualmente si quieres.", "success");
}

/* ============================================================
   TRANS PICKER
   ============================================================ */
let transPickerIndex = null;
let transKeyHandler = null;

function openTransPicker(i) {
  transPickerIndex = i;
  const current = state.tomas[i].transicion || "cut";

  $("#transGrid").innerHTML = TRANSICIONES.map(t => {
    const previewHTML = t.video
      ? (isYT(t.video)
          ? `<iframe src="${t.video}?mute=1&controls=0&loop=1" allow="autoplay; encrypted-media" loading="lazy"></iframe>`
          : `<video src="${escapeHTML(t.video)}" muted loop autoplay playsinline></video>`)
      : `<svg viewBox="0 0 24 24">${t.icon || '<circle cx="12" cy="12" r="8"/>'}</svg>`;
    return `
      <button class="trans-opt ${t.id === current ? "active" : ""}" data-pick="${t.id}">
        <div class="icon-prev">${previewHTML}</div>
        <div class="t-name">${escapeHTML(t.label)}</div>
        <div class="t-hint">${escapeHTML(t.desc)}</div>
      </button>
    `;
  }).join("");

  $("#transPicker").classList.add("on");

  $$("#transGrid [data-pick]").forEach(btn => btn.addEventListener("click", () => {
    state.tomas[transPickerIndex].transicion = btn.dataset.pick;
    save(); renderSecuencia();
    if (state.activeTab === "transiciones") renderTransiciones();
    closeTransPicker();
  }));

  transKeyHandler = (e) => {
    if (e.key === "Escape") { e.preventDefault(); closeTransPicker(); }
  };
  document.addEventListener("keydown", transKeyHandler);
}

function closeTransPicker() {
  $("#transPicker").classList.remove("on");
  transPickerIndex = null;
  if (transKeyHandler) document.removeEventListener("keydown", transKeyHandler);
  transKeyHandler = null;
}

/* ============================================================
   TAB 3 · TRANSICIONES
   ============================================================ */
function renderTransiciones() {
  renderTransChain();
  renderTransCatalog();
}

function renderTransChain() {
  const n = state.tomas.length;
  if (n === 0) {
    $("#transChain").innerHTML = `<div class="empty-msg">Añade tomas en la pestaña Tomas para ver el ritmo del video.</div>`;
    $("#transAppliedCount").textContent = "0 transiciones";
    return;
  }
  const parts = [];
  state.tomas.forEach((t, i) => {
    const s = shot(t.shotId);
    parts.push(`
      <div class="trans-chain-step">
        <span class="tc-num">${i + 1}</span>
        <span class="tc-name">${escapeHTML(s ? s.nombre : t.shotId)}</span>
      </div>
    `);
    if (i < n - 1) {
      const nextIt = state.tomas[i + 1];
      const transId = nextIt.transicion || "cut";
      const isDefault = transId === "cut";
      const trans = transicion(transId);
      const label = trans ? trans.label : "Corte";
      parts.push(`
        <button class="trans-chain-arrow ${isDefault ? "is-default" : ""}" data-trans-open="${i + 1}" title="Cambiar">
          → ${escapeHTML(label)}
        </button>
      `);
    }
  });
  $("#transChain").innerHTML = parts.join("");
  $("#transAppliedCount").textContent = `${Math.max(0, n - 1)} transiciones`;
  $$("#transChain [data-trans-open]").forEach(b => b.addEventListener("click", () => openTransPicker(+b.dataset.transOpen)));
}

function renderTransCatalog() {
  const usage = {};
  state.tomas.forEach((t, i) => {
    if (i === 0) return;
    const id = t.transicion || "cut";
    usage[id] = (usage[id] || 0) + 1;
  });

  $("#transCatalog").innerHTML = TRANSICIONES.map(t => {
    const previewHTML = t.video
      ? (isYT(t.video)
          ? `<iframe src="${t.video}?mute=1&controls=0&loop=1" allow="autoplay; encrypted-media" loading="lazy"></iframe>`
          : `<video src="${escapeHTML(t.video)}" muted loop autoplay playsinline></video>`)
      : `<svg viewBox="0 0 24 24">${t.icon || '<circle cx="12" cy="12" r="8"/>'}</svg>`;
    const count = usage[t.id] || 0;
    return `
      <div class="trans-card">
        <div class="tc-icon">${previewHTML}</div>
        <div class="tc-name">${escapeHTML(t.label)}</div>
        <div class="tc-desc">${escapeHTML(t.desc)}</div>
        <div class="tc-count">${count === 0 ? "no usada" : `${count}×`}</div>
      </div>
    `;
  }).join("");
}

/* ============================================================
   TAB 4 · HOOKS
   ============================================================ */
let hookFilterCat = "all";
let hookFilterFav = false;
let hookSearchQuery = "";

function renderHookFilters() {
  const total = state.hooks.length;
  const favCount = state.hooks.filter(h => h.fav).length;
  const catsHTML = CATEGORIAS_HOOKS.map(c => {
    const n = state.hooks.filter(h => h.cat === c.id).length;
    return `<button class="filter-chip ${hookFilterCat === c.id && !hookFilterFav ? "active" : ""}" data-hook-cat="${c.id}">
      ${escapeHTML(c.label)} <span class="count">${n}</span>
    </button>`;
  }).join("");
  $("#hookFilters").innerHTML = `
    <button class="filter-chip ${hookFilterCat === "all" && !hookFilterFav ? "active" : ""}" data-hook-cat="all">
      Todas <span class="count">${total}</span>
    </button>
    <button class="filter-chip ${hookFilterFav ? "active" : ""}" data-hook-fav>
      ★ Favoritos <span class="count">${favCount}</span>
    </button>
    ${catsHTML}
  `;
  $$("[data-hook-cat]").forEach(b => b.addEventListener("click", () => {
    hookFilterCat = b.dataset.hookCat; hookFilterFav = false;
    renderHookFilters(); renderHooks();
  }));
  $$("[data-hook-fav]").forEach(b => b.addEventListener("click", () => {
    hookFilterFav = !hookFilterFav; hookFilterCat = "all";
    renderHookFilters(); renderHooks();
  }));
}

function renderHookCatList() {
  const rows = [
    { id: "all", label: "Todas", count: state.hooks.length },
    ...CATEGORIAS_HOOKS.map(c => ({
      id: c.id, label: c.label,
      count: state.hooks.filter(h => h.cat === c.id).length,
    })),
  ];
  $("#hookCatList").innerHTML = rows.map(r => `
    <div class="cat-row ${r.id !== "all" && hookFilterCat === r.id && !hookFilterFav ? "active" : ""} ${r.id === "all" && hookFilterCat === "all" && !hookFilterFav ? "active" : ""}" data-hook-cat-row="${r.id}">
      ${r.id !== "all" ? '<span class="cat-dot"></span>' : ""}
      <span class="cat-name">${escapeHTML(r.label)}</span>
      <span class="cat-count">${r.count}</span>
    </div>
  `).join("");
  $$("[data-hook-cat-row]").forEach(el => el.addEventListener("click", () => {
    hookFilterCat = el.dataset.hookCatRow; hookFilterFav = false;
    renderHookFilters(); renderHookCatList(); renderHooks();
  }));
}

function renderHooks() {
  const q = hookSearchQuery.toLowerCase().trim();
  const list = state.hooks.filter(h => {
    if (hookFilterFav && !h.fav) return false;
    if (hookFilterCat !== "all" && h.cat !== hookFilterCat) return false;
    if (q && !(h.texto + " " + catHook(h.cat).label).toLowerCase().includes(q)) return false;
    return true;
  });

  $("#statHooksTotal").textContent = state.hooks.length;
  $("#statHooksFav").textContent = state.hooks.filter(h => h.fav).length;
  $("#statHooksUsed").textContent = state.hooks.filter(h => h.uses > 0).length;
  $("#statHooksCats").textContent = new Set(state.hooks.map(h => h.cat)).size;

  const badge = $('[data-badge="hooks"]');
  if (badge) { badge.hidden = state.hooks.length === 0; badge.textContent = state.hooks.length; }

  if (list.length === 0) {
    $("#hooksGrid").innerHTML = `<div class="empty-msg" style="grid-column:1/-1">Sin resultados.<br>Prueba otro filtro o crea un hook nuevo.</div>`;
    return;
  }

  $("#hooksGrid").innerHTML = list.map(h => {
    const c = catHook(h.cat);
    const textHTML = escapeHTML(h.texto).replace(/\[([^\]]+)\]/g, '<span class="hook-var">$1</span>');
    return `
      <article class="hook ${h.fav ? "fav" : ""}" data-id="${h.id}">
        <div class="hook-top">
          <span class="hook-cat ${escapeHTML(h.cat)}">${escapeHTML(c.label)}</span>
          <span class="hook-uses">${h.uses > 0 ? "usado " + h.uses + "×" : ""}</span>
          <button class="hook-star ${h.fav ? "active" : ""}" data-hook-fav-toggle="${h.id}" aria-label="Favorito">
            <svg class="icon icon-sm" viewBox="0 0 24 24" fill="${h.fav ? "currentColor" : "none"}"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
        </div>
        <div class="hook-text">${textHTML}</div>
        <div class="hook-actions">
          <button class="primary" data-hook-use="${h.id}">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Usar
          </button>
          <button data-hook-edit="${h.id}">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="danger" data-hook-del="${h.id}">
            <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </article>
    `;
  }).join("");

  $$("[data-hook-fav-toggle]").forEach(b => b.addEventListener("click", () => {
    const h = state.hooks.find(x => x.id === b.dataset.hookFavToggle);
    if (!h) return;
    h.fav = !h.fav;
    saveHooks();
    renderHooks(); renderHookFilters(); renderHookCatList(); renderQuickHooks();
  }));
  $$("[data-hook-use]").forEach(b => b.addEventListener("click", () => {
    const h = state.hooks.find(x => x.id === b.dataset.hookUse);
    if (h) insertHookIntoSection(h, firstHookSectionId());
    switchTab("guion");
  }));
  $$("[data-hook-edit]").forEach(b => b.addEventListener("click", () => openHookEdit(b.dataset.hookEdit)));
  $$("[data-hook-del]").forEach(b => b.addEventListener("click", () => {
    const h = state.hooks.find(x => x.id === b.dataset.hookDel);
    if (!h) return;
    openConfirm("Eliminar hook", "Se eliminará este hook de tu biblioteca.", "Eliminar", () => {
      state.hooks = state.hooks.filter(x => x.id !== h.id);
      saveHooks();
      renderHooks(); renderHookFilters(); renderHookCatList(); renderQuickHooks();
      toast("Hook eliminado", "", "info");
    });
  }));
}

/* ============================================================
   HOOK EDIT
   ============================================================ */
let editingHookId = null;

function renderHookCatPicker(selected) {
  $("#hookCatPicker").innerHTML = CATEGORIAS_HOOKS.map(c => `
    <button class="filter-chip ${selected === c.id ? "active" : ""}" data-hook-cat-pick="${c.id}">
      ${escapeHTML(c.label)}
    </button>
  `).join("");
  $$("[data-hook-cat-pick]").forEach(b => b.addEventListener("click", () => {
    $$("[data-hook-cat-pick]").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
  }));
}

function openHookEdit(id) {
  editingHookId = id || null;
  const h = id ? state.hooks.find(x => x.id === id) : null;
  $("#hookEditTitle").textContent = h ? "Editar hook" : "Nuevo hook";
  $("#hookEditText").value = h ? h.texto : "";
  $("#hookEditFav").checked = h ? !!h.fav : false;
  renderHookCatPicker(h ? h.cat : "curiosidad");
  $("#hookEditModal").classList.add("on");
  setTimeout(() => $("#hookEditText").focus(), 60);
}

function saveHookEdit() {
  const texto = $("#hookEditText").value.trim();
  if (!texto) { toast("Escribe el hook", "", "danger"); return; }
  const catSel = $("#hookCatPicker .filter-chip.active");
  const catId = catSel ? catSel.dataset.hookCatPick : "curiosidad";
  const fav = $("#hookEditFav").checked;

  if (editingHookId) {
    const h = state.hooks.find(x => x.id === editingHookId);
    if (h) { h.texto = texto; h.cat = catId; h.fav = fav; }
    toast("Hook actualizado", "", "success");
  } else {
    state.hooks.unshift({ id: "h" + Date.now(), cat: catId, texto, fav, uses: 0 });
    toast("Hook añadido", "", "success");
  }
  saveHooks();
  renderHooks(); renderHookFilters(); renderHookCatList(); renderQuickHooks();
  $("#hookEditModal").classList.remove("on");
}

/* ============================================================
   INSERTAR HOOK
   ============================================================ */
let pendingHook = null;
let pendingSectionId = null;

function insertHookIntoSection(h, secId) {
  if (!secId) { toast("No hay sección destino", "Añade una sección al guion primero.", "danger"); return; }
  const vars = extractVars(h.texto || "");
  pendingHook = h;
  pendingSectionId = secId;

  if (vars.length === 0) { insertHookText(h.texto); return; }

  $("#varFields").innerHTML = vars.map(v => `
    <div class="field">
      <label class="field-label">${escapeHTML(v)}</label>
      <input class="input" data-var="${escapeHTML(v)}" placeholder="Rellena ${escapeHTML(v)}…" />
    </div>
  `).join("");
  $$("#varFields [data-var]").forEach(inp => inp.addEventListener("input", updateVarPreview));
  updateVarPreview();
  $("#hookUseModal").classList.add("on");
  setTimeout(() => { const first = $("#varFields input"); if (first) first.focus(); }, 60);
}

function extractVars(text) {
  const found = [];
  const re = /\[([^\]]+)\]/g;
  let m;
  while ((m = re.exec(text))) {
    const v = m[1].trim();
    if (!found.includes(v)) found.push(v);
  }
  return found;
}

function updateVarPreview() {
  if (!pendingHook) return;
  const values = {};
  $$("#varFields [data-var]").forEach(inp => { values[inp.dataset.var] = inp.value.trim(); });
  const html = escapeHTML(pendingHook.texto).replace(/\[([^\]]+)\]/g, (_, v) => {
    const key = v.trim();
    const val = values[key];
    return val ? `<span class="filled">${escapeHTML(val)}</span>` : `<span class="pending">[${escapeHTML(v)}]</span>`;
  });
  $("#varPreview").innerHTML = html;
}

function buildHookText() {
  if (!pendingHook) return "";
  const values = {};
  $$("#varFields [data-var]").forEach(inp => { values[inp.dataset.var] = inp.value.trim(); });
  return pendingHook.texto.replace(/\[([^\]]+)\]/g, (_, v) => {
    const key = v.trim();
    return values[key] || `[${v}]`;
  });
}

function confirmHookUse() {
  const text = buildHookText();
  if (!text) return;
  insertHookText(text);
  $("#hookUseModal").classList.remove("on");
  pendingHook = null;
  pendingSectionId = null;
}

function insertHookText(text) {
  const secId = pendingSectionId;
  if (!secId) return;
  const s = secById(secId);
  if (!s) return;

  const current = s.texto || "";
  s.texto = current.trim() ? current + "\n" + text : text;

  if (pendingHook) pendingHook.uses = (pendingHook.uses || 0) + 1;
  saveHooks();

  save();
  renderAllGuion();
  if (state.activeTab === "hooks") renderHooks();
  toast("Hook insertado", "", "success");
  closeDrawer();
  pendingHook = null;
  pendingSectionId = null;
}

/* ============================================================
   DRAWER
   ============================================================ */
let drawerSectionId = null;
let drawerSearchQuery = "";
let drawerFilterCat = "all";
let drawerFavOnly = false;

function openHooksDrawer(context, secId) {
  drawerSectionId = secId;
  drawerSearchQuery = "";
  drawerFilterCat = "all";
  drawerFavOnly = false;
  $("#drawerSearch").value = "";
  renderDrawerFilters();
  renderDrawerList();
  $("#hooksDrawer").hidden = false;
  $("#hooksDrawer").classList.add("on");
  setTimeout(() => $("#drawerSearch").focus(), 60);
}

function closeDrawer() {
  $("#hooksDrawer").classList.remove("on");
  $("#hooksDrawer").hidden = true;
  drawerSectionId = null;
}

function renderDrawerFilters() {
  $("#drawerFilters").innerHTML = `
    <button class="filter-chip ${drawerFilterCat === "all" && !drawerFavOnly ? "active" : ""}" data-drawer-cat="all">Todas</button>
    <button class="filter-chip ${drawerFavOnly ? "active" : ""}" data-drawer-fav-only>★ Favoritos</button>
    ${CATEGORIAS_HOOKS.map(c => `
      <button class="filter-chip ${drawerFilterCat === c.id ? "active" : ""}" data-drawer-cat="${c.id}">
        ${escapeHTML(c.label)}
      </button>
    `).join("")}
  `;
  $$("[data-drawer-cat]").forEach(b => b.addEventListener("click", () => {
    drawerFilterCat = b.dataset.drawerCat; drawerFavOnly = false;
    renderDrawerFilters(); renderDrawerList();
  }));
  $$("[data-drawer-fav-only]").forEach(b => b.addEventListener("click", () => {
    drawerFavOnly = !drawerFavOnly;
    if (drawerFavOnly) drawerFilterCat = "all";
    renderDrawerFilters(); renderDrawerList();
  }));
}

function renderDrawerList() {
  const q = drawerSearchQuery.toLowerCase().trim();
  const list = state.hooks.filter(h => {
    if (drawerFavOnly && !h.fav) return false;
    if (drawerFilterCat !== "all" && h.cat !== drawerFilterCat) return false;
    if (q && !h.texto.toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0));

  if (list.length === 0) {
    $("#drawerList").innerHTML = `<div class="drawer-empty">Sin resultados.<br>Crea hooks desde la pestaña Hooks.</div>`;
    return;
  }

  $("#drawerList").innerHTML = list.map(h => {
    const html = escapeHTML(h.texto).replace(/\[([^\]]+)\]/g, '<span style="color:var(--brand);font-weight:600;background:var(--brand-subtle);padding:0 3px;border-radius:3px">[$1]</span>');
    return `
      <button class="quick-hook" data-drawer-pick="${h.id}">
        ${h.fav ? '<span style="color:var(--warning);margin-right:4px">★</span>' : ""}${html}
      </button>
    `;
  }).join("");

  $$("[data-drawer-pick]").forEach(b => b.addEventListener("click", () => {
    const h = state.hooks.find(x => x.id === b.dataset.drawerPick);
    if (h) insertHookIntoSection(h, drawerSectionId);
  }));
}

/* ============================================================
   PLAY MODE
   ============================================================ */
let playIndex = 0;
let playKeyHandler = null;

function openPlay() {
  if (state.tomas.length === 0) { toast("Nada que reproducir", "Añade tomas primero.", "danger"); return; }
  playIndex = 0;
  $("#play").classList.add("on");
  renderPlay();
  playKeyHandler = (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); playNext(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); playPrev(); }
    else if (e.key === "Escape") { e.preventDefault(); closePlay(); }
    else if (e.key === "Home") { e.preventDefault(); playIndex = 0; renderPlay(); }
    else if (e.key === "End") { e.preventDefault(); playIndex = state.tomas.length - 1; renderPlay(); }
  };
  document.addEventListener("keydown", playKeyHandler);
}

function closePlay() {
  $("#play").classList.remove("on");
  $("#playScreen").innerHTML = "";
  if (playKeyHandler) document.removeEventListener("keydown", playKeyHandler);
  playKeyHandler = null;
}

function playNext() { if (playIndex < state.tomas.length - 1) { playIndex++; renderPlay(); } }
function playPrev() { if (playIndex > 0) { playIndex--; renderPlay(); } }

function renderPlay() {
  const it = state.tomas[playIndex];
  const s = shot(it.shotId);
  if (!s) return;

  $("#playTitle").textContent = state.titulo || "Secuencia";
  $("#playCounter").textContent = `${playIndex + 1} / ${state.tomas.length}`;

  const mEl = $("#playMarcador");
  if (it.marcador) {
    mEl.textContent = (marcador(it.marcador) || {}).label || it.marcador;
    mEl.hidden = false;
  } else mEl.hidden = true;

  $("#playName").textContent = s.nombre;
  $("#playNota").textContent = it.nota || s.descripcion || "";

  const secEl = $("#playSection");
  if (it.seccionAsignada) {
    const sec = secById(it.seccionAsignada);
    if (sec) { secEl.textContent = "Sección: " + sec.label; secEl.hidden = false; }
    else secEl.hidden = true;
  } else secEl.hidden = true;

  const screen = $("#playScreen");
  if (!s.video) {
    screen.innerHTML = `<span class="ph">${escapeHTML(s.cat)} · ${escapeHTML(fmtDur(it.duracion))}</span>`;
  } else if (isYT(s.video)) {
    screen.innerHTML = `<iframe src="${s.video}?autoplay=1&mute=1&controls=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  } else {
    screen.innerHTML = `<video src="${escapeHTML(s.video)}" autoplay loop muted playsinline controls></video>`;
  }

  const existingOv = screen.querySelector(".play-overlay");
  if (existingOv) existingOv.remove();
  const ov = it.overlay && it.overlay.shotId ? shot(it.overlay.shotId) : null;
  if (ov) {
    const ovEl = document.createElement("div");
    ovEl.className = "play-overlay";
    let ovContent;
    if (!ov.video) {
      ovContent = `<span style="color:rgba(255,255,255,.3);font-size:10px;position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-transform:uppercase;letter-spacing:.2em">${escapeHTML(ov.cat)}</span>`;
    } else if (isYT(ov.video)) {
      ovContent = `<iframe src="${ov.video}?autoplay=1&mute=1&controls=0&loop=1" allow="autoplay; encrypted-media"></iframe>`;
    } else {
      ovContent = `<video src="${escapeHTML(ov.video)}" autoplay loop muted playsinline></video>`;
    }
    ovEl.innerHTML = `<span class="po-label">B-roll</span>${ovContent}`;
    screen.appendChild(ovEl);
  }

  $("#playBar").style.width = ((playIndex + 1) / state.tomas.length * 100) + "%";
  $("#btnPrev").disabled = playIndex === 0;
  $("#btnNext").disabled = playIndex === state.tomas.length - 1;
}

/* ============================================================
   COPIAR GUION
   ============================================================ */
function buildPlainTextOnlyContent() {
  return state.secciones
    .map(sec => (sec.texto || "").trim())
    .filter(Boolean)
    .join("\n\n");
}

async function copiarGuion() {
  const allText = buildPlainTextOnlyContent();
  if (!allText) { toast("Guion vacío", "Escribe algo primero.", "danger"); return; }
  try {
    await navigator.clipboard.writeText(allText);
    toast("Guion copiado", "Listo para pegar en el teleprompter.", "success");
  } catch {
    toast("No se pudo copiar", "Permisos bloqueados.", "danger");
  }
}

/* ============================================================
   STORYBOARD PNG/PDF
   ============================================================ */
const CAT_COLORS = {
  "Encuadre":   { bg: "#f3f4f6", fg: "#6b7280" },
  "Ángulo":     { bg: "#eff6ff", fg: "#2563eb" },
  "Movimiento": { bg: "#fdf2f8", fg: "#db2777" },
  "Recurso":    { bg: "#f0fdf4", fg: "#16a34a" },
};

function wrapText(text, maxChars) {
  return String(text || "").split("\n").flatMap(line => {
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [""];
    const lines = [];
    let current = "";
    for (const w of words) {
      if ((current + " " + w).trim().length > maxChars) {
        if (current.trim()) lines.push(current.trim());
        current = w;
      } else current += " " + w;
    }
    if (current.trim()) lines.push(current.trim());
    return lines;
  });
}

function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function buildStoryboardSVG() {
  const tomas = state.tomas;
  if (tomas.length === 0) return null;

  const totalDur = tomas.reduce((a, t) => a + (Number(t.duracion) || 0), 0);
  const n = tomas.length;
  const PAD = 40, CARD_W = 200, THUMB_H = Math.round(CARD_W * 9 / 16);
  const CARD_H = 230, ARROW_W = 40, HEADER_H = 110;
  const totalW = Math.max(900, PAD * 2 + n * CARD_W + Math.max(0, n - 1) * ARROW_W);
  const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
  const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
  const parts = [];

  parts.push(`<circle cx="${PAD + 5}" cy="${PAD + 12}" r="5" fill="#FE0557"/>`);
  parts.push(`<text x="${PAD + 20}" y="${PAD + 17}" font-family="${FONT}" font-size="14" font-weight="600" fill="#0a0a0b">Ae Project <tspan fill="#9ca3af" font-weight="400">.studio</tspan></text>`);
  const title = state.titulo || "Storyboard";
  parts.push(`<text x="${PAD}" y="${PAD + 58}" font-family="${FONT}" font-size="24" font-weight="700" fill="#0a0a0b" letter-spacing="-0.5">${esc(title)}</text>`);

  const metaBits = [];
  if (state.cliente) metaBits.push(esc(state.cliente));
  metaBits.push(`${n} ${n === 1 ? "toma" : "tomas"}`);
  metaBits.push(fmtDur(totalDur));
  metaBits.push(`objetivo ${fmtDur(state.duracion)}`);
  parts.push(`<text x="${PAD}" y="${PAD + 82}" font-family="${FONT}" font-size="13" fill="#6b7280">${metaBits.join("  ·  ")}</text>`);
  parts.push(`<line x1="${PAD}" y1="${PAD + 98}" x2="${totalW - PAD}" y2="${PAD + 98}" stroke="#FE0557" stroke-width="2"/>`);

  const cardsY = HEADER_H + PAD;

  tomas.forEach((t, i) => {
    const x = PAD + i * (CARD_W + ARROW_W);
    const s = shot(t.shotId);
    const catName = s ? s.cat : "";
    const col = CAT_COLORS[catName] || { bg: "#f3f4f6", fg: "#6b7280" };

    parts.push(`<rect x="${x}" y="${cardsY}" width="${CARD_W}" height="${CARD_H}" rx="10" fill="#ffffff" stroke="#e5e7eb" stroke-width="1"/>`);
    parts.push(`<rect x="${x}" y="${cardsY}" width="${CARD_W}" height="${THUMB_H}" rx="10" fill="${col.bg}"/>`);
    parts.push(`<rect x="${x}" y="${cardsY + THUMB_H - 10}" width="${CARD_W}" height="10" fill="${col.bg}"/>`);
    parts.push(`<text x="${x + CARD_W / 2}" y="${cardsY + THUMB_H / 2 + 4}" font-family="${FONT}" font-size="10.5" font-weight="600" fill="${col.fg}" text-anchor="middle" letter-spacing="1.5">${esc((catName || "").toUpperCase())}</text>`);
    parts.push(`<rect x="${x + 8}" y="${cardsY + 8}" width="24" height="22" rx="4" fill="rgba(0,0,0,0.72)"/>`);
    parts.push(`<text x="${x + 20}" y="${cardsY + 23}" font-family="${MONO}" font-size="11" font-weight="600" fill="#ffffff" text-anchor="middle">${i + 1}</text>`);
    const durText = fmtDur(t.duracion);
    const durW = 42;
    parts.push(`<rect x="${x + CARD_W - durW - 8}" y="${cardsY + 8}" width="${durW}" height="22" rx="4" fill="rgba(0,0,0,0.72)"/>`);
    parts.push(`<text x="${x + CARD_W - durW / 2 - 8}" y="${cardsY + 23}" font-family="${MONO}" font-size="11" font-weight="500" fill="#ffffff" text-anchor="middle">${durText}</text>`);

    const textY = cardsY + THUMB_H + 22;
    const nameLines = wrapText(s ? s.nombre : t.shotId, 26).slice(0, 2);
    nameLines.forEach((line, li) => {
      parts.push(`<text x="${x + 12}" y="${textY + li * 17}" font-family="${FONT}" font-size="13" font-weight="600" fill="#0a0a0b">${esc(line)}</text>`);
    });
    let ty = textY + nameLines.length * 17 + 4;

    const subBits = [];
    if (t.marcador) subBits.push((marcador(t.marcador) || {}).label || "");
    if (t.seccionAsignada) {
      const sec = secById(t.seccionAsignada);
      if (sec) subBits.push("→ " + sec.label);
    }
    if (subBits.length === 0) subBits.push(catName || "");
    parts.push(`<text x="${x + 12}" y="${ty}" font-family="${FONT}" font-size="11" fill="#6b7280">${esc(subBits.join("  ·  "))}</text>`);
    ty += 16;

    if (t.nota) {
      const noteLines = wrapText(t.nota, 30).slice(0, 3);
      noteLines.forEach((line, li) => {
        parts.push(`<text x="${x + 12}" y="${ty + li * 14}" font-family="${FONT}" font-size="10.5" fill="#9ca3af">${esc(line)}</text>`);
      });
    }

    if (t.overlay && t.overlay.shotId) {
      const os = shot(t.overlay.shotId);
      const ovName = os ? os.nombre : t.overlay.shotId;
      parts.push(`<rect x="${x + 8}" y="${cardsY + CARD_H - 24}" width="${CARD_W - 16}" height="18" rx="4" fill="#eff6ff"/>`);
      parts.push(`<text x="${x + 14}" y="${cardsY + CARD_H - 11}" font-family="${FONT}" font-size="9.5" font-weight="600" fill="#2563eb" letter-spacing="0.5">+ B-ROLL · ${esc(ovName.toUpperCase())}</text>`);
    }

    if (i < n - 1) {
      const nextT = tomas[i + 1];
      const transId = nextT.transicion || "cut";
      const isDefault = transId === "cut";
      const trans = transicion(transId);
      const label = trans ? trans.label : "Corte";
      const arrowX = x + CARD_W;
      const arrowY = cardsY + THUMB_H / 2;
      const color = isDefault ? "#d1d5db" : "#FE0557";

      parts.push(`<line x1="${arrowX + 6}" y1="${arrowY}" x2="${arrowX + ARROW_W - 8}" y2="${arrowY}" stroke="${color}" stroke-width="1.5" ${isDefault ? 'stroke-dasharray="3,3"' : ""}/>`);
      parts.push(`<polygon points="${arrowX + ARROW_W - 6},${arrowY} ${arrowX + ARROW_W - 12},${arrowY - 4} ${arrowX + ARROW_W - 12},${arrowY + 4}" fill="${color}"/>`);
      const shortLabel = label.length > 11 ? label.substring(0, 10) + "…" : label;
      parts.push(`<text x="${arrowX + ARROW_W / 2}" y="${arrowY - 8}" font-family="${FONT}" font-size="9.5" font-weight="500" fill="${isDefault ? "#9ca3af" : "#FE0557"}" text-anchor="middle">${esc(shortLabel)}</text>`);
    }
  });

  let bottomY = cardsY + CARD_H + 40;
  const secsWithContent = state.secciones.filter(s => (s.texto || "").trim());

  if (secsWithContent.length > 0) {
    parts.push(`<line x1="${PAD}" y1="${bottomY}" x2="${totalW - PAD}" y2="${bottomY}" stroke="#e5e7eb" stroke-width="1"/>`);
    bottomY += 26;
    parts.push(`<text x="${PAD}" y="${bottomY}" font-family="${FONT}" font-size="11" font-weight="600" fill="#6b7280" letter-spacing="1.5">GUION</text>`);
    bottomY += 26;

    secsWithContent.forEach(sec => {
      const text = sec.texto.trim();
      const lines = wrapText(text, 110).slice(0, 6);
      parts.push(`<text x="${PAD}" y="${bottomY}" font-family="${FONT}" font-size="10.5" font-weight="600" fill="#FE0557" letter-spacing="1">${esc(sec.label.toUpperCase())}</text>`);
      bottomY += 16;
      lines.forEach(line => {
        parts.push(`<text x="${PAD}" y="${bottomY}" font-family="${FONT}" font-size="13" fill="#0a0a0b">${esc(line)}</text>`);
        bottomY += 18;
      });
      bottomY += 10;
    });
  }

  bottomY += 16;
  parts.push(`<line x1="${PAD}" y1="${bottomY}" x2="${totalW - PAD}" y2="${bottomY}" stroke="#e5e7eb" stroke-width="1"/>`);
  bottomY += 22;
  parts.push(`<text x="${PAD}" y="${bottomY}" font-family="${FONT}" font-size="11" fill="#9ca3af">Ae Project .studio</text>`);
  const todayStr = new Date().toLocaleDateString("es-VE", { day: "numeric", month: "long", year: "numeric" });
  parts.push(`<text x="${totalW - PAD}" y="${bottomY}" font-family="${FONT}" font-size="11" fill="#9ca3af" text-anchor="end">${esc(todayStr)}</text>`);

  const totalH = bottomY + PAD;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
    <rect width="${totalW}" height="${totalH}" fill="#ffffff"/>
    ${parts.join("\n    ")}
  </svg>`;
}

function openStoryboardExport() {
  if (state.tomas.length === 0) { toast("Nada que exportar", "Añade tomas primero.", "danger"); return; }
  $("#sbExportModal").classList.add("on");
}

function exportStoryboardPNG() {
  const svg = buildStoryboardSVG();
  if (!svg) { toast("Nada que exportar", "Añade tomas primero.", "danger"); return; }
  const filename = (state.titulo || "storyboard").replace(/[^\w\-]+/g, "_").toLowerCase();
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    canvas.toBlob(pngBlob => {
      const pngUrl = URL.createObjectURL(pngBlob);
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = filename + ".png";
      a.click();
      URL.revokeObjectURL(pngUrl);
      URL.revokeObjectURL(url);
      $("#sbExportModal").classList.remove("on");
      toast("PNG descargado", filename + ".png", "success");
    }, "image/png");
  };
  img.onerror = () => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename + ".svg";
    a.click();
    URL.revokeObjectURL(url);
    $("#sbExportModal").classList.remove("on");
    toast("SVG descargado", "", "info");
  };
  img.src = url;
}

function exportStoryboardPDF() {
  const svg = buildStoryboardSVG();
  if (!svg) { toast("Nada que exportar", "Añade tomas primero.", "danger"); return; }
  const win = window.open("", "_blank");
  if (!win) { toast("Popup bloqueado", "Permite ventanas emergentes.", "danger"); return; }
  const title = (state.titulo || "Storyboard").replace(/[<>]/g, "");
  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title} · Storyboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #fff; }
  body { display: flex; align-items: flex-start; justify-content: center; padding: 20px; }
  svg { max-width: 100%; height: auto; display: block; }
  @page { size: A3 landscape; margin: 10mm; }
  @media print { body { padding: 0; } svg { max-width: 100%; max-height: 100vh; width: auto; } }
</style></head><body>${svg}</body></html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 500);
  $("#sbExportModal").classList.remove("on");
}

/* ============================================================
   NUEVO / EXPORTAR / IMPORTAR
   ============================================================ */
function nuevoGuion() {
  flushSave();
  createNewGuion("Guion sin título").then(() => {
    renderAll();
    toast("Guion nuevo", "Listo para empezar.", "success");
    setTimeout(() => {
      const input = $("#titulo");
      if (input) { input.focus(); input.select(); }
    }, 100);
  });
}

function exportGuionJSON() {
  const payload = {
    titulo: state.titulo,
    cliente: state.cliente,
    duracion: state.duracion,
    plantillaId: state.plantillaId,
    secciones: state.secciones,
    tomas: state.tomas,
  };
  const filename = (state.titulo || "guion").replace(/\s+/g, "_").toLowerCase();
  exportJSON(payload, filename);
  toast("Exportado", filename + ".json", "success");
}

function importGuionJSON() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = () => {
    const f = input.files && input.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        flushSave();
        const id = newGuionId();
        const now = new Date().toISOString();
        const guion = {
          titulo: data.titulo || "Importado",
          cliente: data.cliente || "",
          duracion: data.duracion || 30,
          plantillaId: data.plantillaId || "tutorial",
          secciones: normalizeSecciones(data.secciones, data.plantillaId),
          tomas: normalizeTomas(data.tomas),
          createdAt: now,
          updatedAt: now,
        };
        await cloud.save(`${GUIONES_COL}/${id}`, guion);
        state.guionesList.unshift({ id, ...guion });
        await loadGuionById(id);
        localStorage.setItem(LS_ACTIVE_ID, id);
        renderAll();
        toast("Guion importado", guion.titulo, "success");
      } catch {
        toast("Archivo inválido", "", "danger");
      }
    };
    reader.readAsText(f);
  };
  input.click();
}

/* ============================================================
   RENDER MAESTRO
   ============================================================ */
function renderAll() {
  renderAllGuion();
  renderLibFilters(); renderLib();
  renderSecuencia();
  renderTransiciones();
  renderHooks();
  renderHookFilters();
  renderHookCatList();
  updateTabBadges();
  renderGuionesList();
}

function updateTabBadges() {
  const tomasBadge = $('[data-badge="tomas"]');
  if (tomasBadge) {
    tomasBadge.hidden = state.tomas.length === 0;
    tomasBadge.textContent = state.tomas.length;
  }
  const hooksBadge = $('[data-badge="hooks"]');
  if (hooksBadge) {
    hooksBadge.hidden = state.hooks.length === 0;
    hooksBadge.textContent = state.hooks.length;
  }
}

/* ============================================================
   EVENTOS GLOBALES
   ============================================================ */
$$(".tab-btn").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));

$("#titulo").addEventListener("input", e => { state.titulo = e.target.value; save(); });
$("#cliente").addEventListener("input", e => { state.cliente = e.target.value; save(); });

$("#libSearch").addEventListener("input", e => { libSearch = e.target.value; renderLib(); });
$("#hookSearch").addEventListener("input", debounce(e => { hookSearchQuery = e.target.value; renderHooks(); }, 100));
$("#drawerSearch").addEventListener("input", debounce(e => { drawerSearchQuery = e.target.value; renderDrawerList(); }, 100));

$("#btnGuiones").addEventListener("click", openGuionesModal);
$("#btnGuionesNuevo").addEventListener("click", () => { closeGuionesModal(); nuevoGuion(); });
$("#btnNuevo").addEventListener("click", nuevoGuion);
$("#btnGuardar").addEventListener("click", () => { flushSave(); toast("Guardado", "Se sincronizó con la nube.", "success"); });
$("#btnCopiar").addEventListener("click", copiarGuion);
$("#btnPlay").addEventListener("click", openPlay);
$("#btnClosePlay").addEventListener("click", closePlay);
$("#btnPrev").addEventListener("click", playPrev);
$("#btnNext").addEventListener("click", playNext);

$("#btnAutoAssign").addEventListener("click", autoAssignTomas);
$("#btnExportStoryboard").addEventListener("click", openStoryboardExport);
$("#sbExportPNG").addEventListener("click", exportStoryboardPNG);
$("#sbExportPDF").addEventListener("click", exportStoryboardPDF);

$("#btnNewHook").addEventListener("click", () => openHookEdit(null));
$("#hookEditSave").addEventListener("click", saveHookEdit);
$("#hookUseConfirm").addEventListener("click", confirmHookUse);

$("#btnOpenHooks").addEventListener("click", () => openHooksDrawer("guion", firstHookSectionId()));

$("#assignConfirm").addEventListener("click", confirmAssign);
$("#overlayClear").addEventListener("click", clearOverlay);

$("#editSecSave").addEventListener("click", saveEditSec);
$("#editSecWeight").addEventListener("input", e => {
  $("#editSecWeightValue").textContent = Number(e.target.value).toFixed(2);
});

$("#saveConfirm").addEventListener("click", () => {
  if (typeof saveCb === "function") {
    const val = $("#saveName").value.trim();
    const r = saveCb(val);
    if (r !== false) closeSaveModal();
  }
});
$("#saveName").addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); $("#saveConfirm").click(); }
});

$("#confirmOk").addEventListener("click", () => {
  if (typeof confirmCb === "function") confirmCb();
  closeConfirm();
});

$$("[data-close]").forEach(n => n.addEventListener("click", () => {
  n.closest(".modal").classList.remove("on");
}));

$$("[data-drawer-close]").forEach(n => n.addEventListener("click", closeDrawer));

$("#btnExportar").addEventListener("click", exportGuionJSON);
$("#btnImportar").addEventListener("click", importGuionJSON);

$("#hookUseModal").addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.tagName === "INPUT") {
    const inputs = $$("#varFields [data-var]");
    const idx = inputs.indexOf(e.target);
    if (idx >= 0 && idx < inputs.length - 1) { e.preventDefault(); inputs[idx + 1].focus(); }
    else if (idx === inputs.length - 1) { e.preventDefault(); confirmHookUse(); }
  }
});

document.addEventListener("keydown", e => {
  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
    e.preventDefault();
    flushSave();
    toast("Guardado", "", "success");
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "c" &&
      !window.getSelection().toString() &&
      document.activeElement.tagName !== "TEXTAREA" &&
      document.activeElement.tagName !== "INPUT") {
    e.preventDefault();
    copiarGuion();
  }
  if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "4") {
    const tabs = ["guion", "tomas", "transiciones", "hooks"];
    const idx = +e.key - 1;
    if (tabs[idx]) { e.preventDefault(); switchTab(tabs[idx]); }
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
  const overlay = $("#loadingOverlay");

  try {
    if (window.FB && window.cloud) {
      try { await FB.ready; } catch {}
    }

    // 1. Hooks (o migración)
    const migro = await ensureHooks();
    if (migro) console.info("[guion] migración completada desde config/guion-v1");

    // 2. Lista de guiones
    await loadGuionesList();

    // 3. Guion activo
    const activeId = localStorage.getItem(LS_ACTIVE_ID);
    let targetId = null;

    if (activeId && state.guionesList.some(g => g.id === activeId)) {
      targetId = activeId;
    } else if (state.guionesList.length > 0) {
      targetId = state.guionesList[0].id;
    }

    if (targetId) {
      const ok = await loadGuionById(targetId);
      if (!ok) targetId = null;
    }

    if (!targetId) {
      await createNewGuion("Guion sin título");
    }

    // 4. UI local
    state.activeTab = localStorage.getItem(LS_ACTIVE_TAB) || "guion";
    state.ui.guionRefOpen = localStorage.getItem(LS_REF_OPEN) === "true";

    const guionRefEl = $("#guionRef");
    if (guionRefEl) guionRefEl.classList.toggle("open", state.ui.guionRefOpen);
    const guionToggle = $("[data-guion-toggle]");
    if (guionToggle) guionToggle.addEventListener("click", toggleGuionRef);

    // 5. Render
    switchTab(state.activeTab);
    renderAll();
  } catch (e) {
    console.warn("[guion] init falló:", e);
    // Fallback: render vacío para que la app no se quede en blanco
    try {
      state.secciones = seccionesDesdePlantilla("tutorial");
      switchTab("guion");
      renderAll();
    } catch {}
  } finally {
    if (overlay) {
      overlay.classList.add("hidden");
      setTimeout(() => overlay.remove(), 260);
    }
  }
})();