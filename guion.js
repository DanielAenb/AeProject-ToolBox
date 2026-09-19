/* ============================================================
   GUION · LÓGICA
   assets/guion.js
   ============================================================ */

/* ============================================================
   ESTADO
   ────────────────────────────────────────────────────────────
   Persistencia: localStorage con clave "guion-v1".
   Plan futuro: migrar a Firebase (Firestore). Cuando eso pase,
   solo cambian las funciones save() y load() — todo lo demás
   sigue intacto.
   ============================================================ */
const LS_KEY = "guion-v1";
const HOOKS_LEGACY_KEY = "hooks-v1"; // para migrar hooks viejos

let state = {
  version: 1,

  // Metadata del video
  titulo: "",
  cliente: "",
  duracion: 30,
  plantillaId: "tutorial",

  // Contenido del guion: { seccionId: "texto..." }
  secciones: {},

  // Tomas en secuencia
  // [{ shotId, nota, duracion, marcador, transicion, grabada, seccionAsignada }]
  tomas: [],

  // Biblioteca de hooks
  hooks: [],

  // Borradores
  drafts: [],

  // Plantillas de guion guardadas (snapshot del contenido)
  templates: [],

  // UI
  activeTab: "guion",
};

function save() { store.set(LS_KEY, state); }

function load() {
  const s = store.get(LS_KEY);
  if (s) {
    state = { ...state, ...s };
  } else {
    // Primera vez: migrar hooks viejos si existen
    const legacy = store.get(HOOKS_LEGACY_KEY);
    if (legacy && Array.isArray(legacy.hooks) && legacy.hooks.length > 0) {
      state.hooks = legacy.hooks;
    } else {
      state.hooks = JSON.parse(JSON.stringify(HOOKS_DEFAULT));
    }
    // Inicializar secciones de la plantilla por defecto
    const tpl = plantilla(state.plantillaId);
    tpl.secciones.forEach(s => { state.secciones[s.id] = ""; });
    save();
  }
  // Asegurar que existan las secciones de la plantilla activa
  const tpl = plantilla(state.plantillaId);
  tpl.secciones.forEach(s => {
    if (typeof state.secciones[s.id] === "undefined") state.secciones[s.id] = "";
  });
}

/* ============================================================
   HELPERS
   ============================================================ */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const plantilla = id => PLANTILLAS.find(p => p.id === id) || PLANTILLAS[0];
const shot      = id => SHOTS.find(s => s.id === id);
const marcador  = id => MARCADORES.find(m => m.id === id);
const transicion = id => TRANSICIONES.find(t => t.id === id);
const catHook   = id => CATEGORIAS_HOOKS.find(c => c.id === id) || { id, label: id };

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function today() { return new Date().toISOString().slice(0, 10); }

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
   MODALES
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
  save();
  $$(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
  $$(".tab-panel").forEach(p => {
    const active = p.dataset.panel === tabId;
    p.classList.toggle("active", active);
    p.hidden = !active;
  });
  if (tabId === "tomas") renderSecuencia();
  if (tabId === "transiciones") renderTransiciones();
  if (tabId === "hooks") renderHooks();
  if (tabId === "guion") renderAllGuion();
}

/* ============================================================
   TAB 1 · GUION
   ============================================================ */

/* --- Config --- */
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
    const hasContent = Object.values(state.secciones).some(v => v && v.trim()) || state.tomas.length > 0;
    if (hasContent) {
      openConfirm(
        "Cambiar plantilla",
        "Las secciones actuales no coinciden con la nueva plantilla. Se conservará el texto de las secciones cuyo id coincida (hook, cta, etc.).",
        "Cambiar",
        () => applyTemplateChange(newId)
      );
    } else {
      applyTemplateChange(newId);
    }
  }));
}

function applyTemplateChange(newId) {
  state.plantillaId = newId;
  const tpl = plantilla(newId);
  // Asegurar que las secciones de la nueva plantilla existan
  tpl.secciones.forEach(s => {
    if (typeof state.secciones[s.id] === "undefined") state.secciones[s.id] = "";
  });
  // Desasignar tomas cuya sección ya no existe
  const validIds = new Set(tpl.secciones.map(s => s.id));
  state.tomas.forEach(t => {
    if (t.seccionAsignada && !validIds.has(t.seccionAsignada)) t.seccionAsignada = null;
  });
  save(); renderTplPicker(); renderAllGuion(); renderSecuencia();
  toast("Plantilla cambiada", plantilla(newId).nombre, "info");
}

/* --- Secciones del guion --- */
function renderScriptList() {
  const tpl = plantilla(state.plantillaId);
  const list = $("#scriptList");

  if (tpl.secciones.length === 0) {
    list.innerHTML = `<div class="empty-msg" style="margin:16px">Esta plantilla no tiene secciones.</div>`;
    return;
  }

  list.innerHTML = tpl.secciones.map(sec => {
    const text = state.secciones[sec.id] || "";
    const words = wordCount(text);
    const target = Math.round(state.duracion * PALABRAS_POR_SEGUNDO * (sec.weight || 0));
    const isHook = sec.id === "hook";

    // Tomas asignadas a esta sección
    const tomasAsignadas = state.tomas
      .map((t, i) => ({ ...t, idx: i }))
      .filter(t => t.seccionAsignada === sec.id);

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
      <div class="script-sec" data-sec="${sec.id}">
        <div class="sec-head">
          <span class="sec-label ${sec.id}">${escapeHTML(sec.label)}</span>
          <span class="sec-hint">${escapeHTML(sec.hint || "")}</span>
          <span class="sec-target" data-target="${sec.id}">~${target} pal.</span>
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

  // Bindings
  $$("[data-input]").forEach(ta => {
    autoResize(ta);
    ta.addEventListener("input", () => {
      state.secciones[ta.dataset.input] = ta.value;
      save(); autoResize(ta);
      updateSectionMeta(ta.dataset.input);
      updateAllGuion();
    });
  });

  $$("[data-clear]").forEach(b => b.addEventListener("click", () => {
    const secId = b.dataset.clear;
    if (!state.secciones[secId]) return;
    state.secciones[secId] = "";
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
}

function updateSectionMeta(secId) {
  const tpl = plantilla(state.plantillaId);
  const sec = tpl.secciones.find(s => s.id === secId);
  if (!sec) return;
  const text = state.secciones[secId] || "";
  const words = wordCount(text);
  const target = Math.round(state.duracion * PALABRAS_POR_SEGUNDO * (sec.weight || 0));

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
  const tpl = plantilla(state.plantillaId);
  const allText = tpl.secciones.map(s => state.secciones[s.id] || "").join(" ");
  const totalWords = wordCount(allText);
  const totalTime = totalWords / PALABRAS_POR_SEGUNDO;
  const target = state.duracion;

  const secDone = tpl.secciones.filter(s => (state.secciones[s.id] || "").trim().length > 0).length;

  $("#secCounter").textContent = `${secDone} / ${tpl.secciones.length} completas`;
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
  const tpl = plantilla(state.plantillaId);
  const rows = tpl.secciones.map(sec => {
    const count = state.tomas.filter(t => t.seccionAsignada === sec.id).length;
    return { sec, count };
  });
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
    if (h) insertHookIntoSection(h, "hook");
  }));
}

function renderAllGuion() {
  $("#titulo").value = state.titulo;
  $("#cliente").value = state.cliente;
  renderTplPicker();
  renderDurChips();
  renderScriptList();
  renderQuickHooks();
  updateAllGuion();
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
  const n = state.tomas.length;

  const totalDur = state.tomas.reduce((a, t) => a + (Number(t.duracion) || 0), 0);
  $("#statTomas").textContent = n;
  $("#statDuracion").textContent = fmtDur(totalDur);

  const badge = $("#badgeDur");
  if (n === 0) {
    badge.textContent = "—";
    badge.className = "badge badge-dur";
  } else if (totalDur < 30) {
    badge.textContent = "Reel corto";
    badge.className = "badge badge-dur ok";
  } else if (totalDur <= 60) {
    badge.textContent = "Reel estándar";
    badge.className = "badge badge-dur ok";
  } else if (totalDur <= 90) {
    badge.textContent = "Reel largo";
    badge.className = "badge badge-dur warn";
  } else {
    badge.textContent = "Excede 90s";
    badge.className = "badge badge-dur over";
  }

  if (n === 0) {
    strip.innerHTML = `<div class="seq-empty">Aún no hay tomas.<br>Añade tomas desde la biblioteca de la izquierda.</div>`;
    return;
  }

  const tpl = plantilla(state.plantillaId);

  strip.innerHTML = state.tomas.map((it, i) => {
    const s = shot(it.shotId);
    if (!s) return "";
    const isFirst = i === 0;
    const isLast = i === n - 1;
    const markerOpts = [
      `<option value="">— marcador —</option>`,
      ...MARCADORES.map(m => `<option value="${m.id}" ${it.marcador === m.id ? "selected" : ""}>${m.label}</option>`)
    ].join("");

    const secAssigned = it.seccionAsignada ? tpl.secciones.find(x => x.id === it.seccionAsignada) : null;
    const secLabel = secAssigned ? secAssigned.label : "Sin sección";

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
    // Update stats
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

  // Drag & drop
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
}

/* ============================================================
   ASIGNACIÓN DE TOMAS A SECCIONES
   ============================================================ */
let assignSectionId = null;
let assignSelected = new Set();

function openAssignModal(secId) {
  assignSectionId = secId;
  const sec = plantilla(state.plantillaId).secciones.find(s => s.id === secId);
  if (!sec) return;

  $("#assignTitle").textContent = `Asignar tomas a "${sec.label}"`;
  assignSelected = new Set(
    state.tomas.map((t, i) => t.seccionAsignada === secId ? i : -1).filter(i => i >= 0)
  );

  renderAssignList();
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
    const otherSec = t.seccionAsignada && t.seccionAsignada !== assignSectionId
      ? plantilla(state.plantillaId).secciones.find(x => x.id === t.seccionAsignada)
      : null;
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
    if (inp.checked) assignSelected.add(i);
    else assignSelected.delete(i);
    inp.closest(".assign-opt").classList.toggle("checked", inp.checked);
  }));
}

function confirmAssign() {
  // Primero limpiar todas las tomas que estaban asignadas a esta sección
  state.tomas.forEach(t => {
    if (t.seccionAsignada === assignSectionId) t.seccionAsignada = null;
  });
  // Luego asignar las seleccionadas
  assignSelected.forEach(i => {
    if (state.tomas[i]) state.tomas[i].seccionAsignada = assignSectionId;
  });
  save();
  $("#assignModal").classList.remove("on");
  renderAllGuion(); renderSecuencia();
  toast("Asignación guardada", "", "success");
}

function openSectionPickerForToma(i) {
  // Cicla entre las secciones disponibles + "sin sección"
  const tpl = plantilla(state.plantillaId);
  const options = [{ id: null, label: "Sin sección" }, ...tpl.secciones];
  const current = state.tomas[i].seccionAsignada;
  const idx = options.findIndex(o => o.id === current);

  // Modal simple: mostramos un picker con las opciones
  const currentLabel = current ? tpl.secciones.find(s => s.id === current)?.label : "Sin sección";
  const optsHTML = options.map(o => `
    <button class="assign-opt ${o.id === current ? "checked" : ""}" data-pick-sec="${o.id || ""}">
      <span class="ao-num">${o.id ? o.label.charAt(0) : "—"}</span>
      <span class="ao-body">
        <span class="ao-name">${escapeHTML(o.label)}</span>
      </span>
    </button>
  `).join("");

  // Reutilizamos el modal assign como picker simple
  $("#assignTitle").textContent = `Asignar toma ${i + 1} a una sección`;
  $("#assignList").innerHTML = optsHTML;
  $$("[data-pick-sec]").forEach(b => b.addEventListener("click", () => {
    const val = b.dataset.pickSec || null;
    state.tomas[i].seccionAsignada = val;
    save();
    $("#assignModal").classList.remove("on");
    renderAllGuion(); renderSecuencia();
  }));
  // Cambiar el botón de confirmar por solo un botón cancelar
  $("#assignConfirm").style.display = "none";
  const restore = () => {
    $("#assignConfirm").style.display = "";
    $("#assignConfirm").removeEventListener("click", restore);
    $("#assignModal").removeEventListener("transitionend", restore);
  };
  $("#assignModal").addEventListener("transitionend", restore);
  // Truco simple: usar el botón cancelar como acción
  $("#assignModal").classList.add("on");
  // Restaurar el botón confirmar después de cerrar
  const origClose = () => {
    setTimeout(() => { $("#assignConfirm").style.display = ""; }, 200);
    $("#assignModal").removeEventListener("transitionend", origClose);
  };
  $("#assignModal").addEventListener("transitionend", origClose);
}

/* Auto-asignación: distribuye las tomas según los pesos de la plantilla */
function autoAssignTomas() {
  const tpl = plantilla(state.plantillaId);
  if (state.tomas.length === 0) {
    toast("No hay tomas", "Añade tomas primero.", "danger");
    return;
  }

  // Distribuir tomas secuencialmente según los pesos
  const total = state.tomas.length;
  let cursor = 0;
  const counts = tpl.secciones.map((sec, idx) => {
    if (idx === tpl.secciones.length - 1) {
      return total - cursor; // el último se lleva el remanente
    }
    const w = sec.weight || 0;
    const n = Math.max(1, Math.round(total * w));
    cursor += n;
    return n;
  });

  // Ajuste fino si nos pasamos
  let sum = counts.reduce((a, b) => a + b, 0);
  while (sum > total) {
    // quitar del que más tiene
    const maxIdx = counts.indexOf(Math.max(...counts));
    counts[maxIdx]--;
    sum--;
  }
  while (sum < total) {
    // añadir al que menos tiene (que no sea el último)
    const minIdx = counts.slice(0, -1).indexOf(Math.min(...counts.slice(0, -1)));
    counts[minIdx]++;
    sum++;
  }

  // Asignar
  let i = 0;
  tpl.secciones.forEach((sec, si) => {
    for (let k = 0; k < counts[si]; k++) {
      if (i < state.tomas.length) {
        state.tomas[i].seccionAsignada = sec.id;
        i++;
      }
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
      : `<svg viewBox="0 0 24 24">${t.icon}</svg>`;

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
  updateTransBadges();
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
  // Cuántas veces se usa cada transición en la secuencia
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
      : `<svg viewBox="0 0 24 24">${t.icon}</svg>`;
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

function updateTransBadges() {
  const n = Math.max(0, state.tomas.length - 1);
  const badge = $(`[data-badge="tomas"]`);
  if (badge) {
    badge.hidden = state.tomas.length === 0;
    badge.textContent = state.tomas.length;
  }
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
      ${escapeHTML(c.label)} <span class="count" style="font-family:var(--font-mono);font-size:10px;opacity:.6">${n}</span>
    </button>`;
  }).join("");
  $("#hookFilters").innerHTML = `
    <button class="filter-chip ${hookFilterCat === "all" && !hookFilterFav ? "active" : ""}" data-hook-cat="all">
      Todas <span class="count" style="font-family:var(--font-mono);font-size:10px;opacity:.6">${total}</span>
    </button>
    <button class="filter-chip ${hookFilterFav ? "active" : ""}" data-hook-fav style="color:var(--warning);border-color:rgba(245,158,11,.3)">
      ★ Favoritos <span class="count" style="font-family:var(--font-mono);font-size:10px;opacity:.6">${favCount}</span>
    </button>
    ${catsHTML}
  `;
  $$("[data-hook-cat]").forEach(b => b.addEventListener("click", () => {
    hookFilterCat = b.dataset.hookCat;
    hookFilterFav = false;
    renderHookFilters(); renderHooks();
  }));
  $$("[data-hook-fav]").forEach(b => b.addEventListener("click", () => {
    hookFilterFav = !hookFilterFav;
    hookFilterCat = "all";
    renderHookFilters(); renderHooks();
  }));
}

function renderHookCatList() {
  const rows = [
    { id: "all", label: "Todas", count: state.hooks.length },
    ...CATEGORIAS_HOOKS.map(c => ({
      id: c.id,
      label: c.label,
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
    hookFilterCat = el.dataset.hookCatRow;
    hookFilterFav = false;
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

  // Stats
  $("#statHooksTotal").textContent = state.hooks.length;
  $("#statHooksFav").textContent = state.hooks.filter(h => h.fav).length;
  $("#statHooksUsed").textContent = state.hooks.filter(h => h.uses > 0).length;
  $("#statHooksCats").textContent = new Set(state.hooks.map(h => h.cat)).size;

  const badge = $('[data-badge="hooks"]');
  if (badge) {
    badge.hidden = state.hooks.length === 0;
    badge.textContent = state.hooks.length;
  }

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

  // Bindings
  $$("[data-hook-fav-toggle]").forEach(b => b.addEventListener("click", () => {
    const h = state.hooks.find(x => x.id === b.dataset.hookFavToggle);
    if (!h) return;
    h.fav = !h.fav;
    save(); renderHooks(); renderHookFilters(); renderHookCatList();
  }));
  $$("[data-hook-use]").forEach(b => b.addEventListener("click", () => {
    const h = state.hooks.find(x => x.id === b.dataset.hookUse);
    if (h) insertHookIntoSection(h, "hook");
    switchTab("guion");
  }));
  $$("[data-hook-edit]").forEach(b => b.addEventListener("click", () => openHookEdit(b.dataset.hookEdit)));
  $$("[data-hook-del]").forEach(b => b.addEventListener("click", () => {
    const h = state.hooks.find(x => x.id === b.dataset.hookDel);
    if (!h) return;
    openConfirm("Eliminar hook", "Se eliminará este hook de tu biblioteca.", "Eliminar", () => {
      state.hooks = state.hooks.filter(x => x.id !== h.id);
      save(); renderHooks(); renderHookFilters(); renderHookCatList(); renderQuickHooks();
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
  save(); renderHooks(); renderHookFilters(); renderHookCatList(); renderQuickHooks();
  $("#hookEditModal").classList.remove("on");
}

/* ============================================================
   INSERTAR HOOK EN SECCIÓN
   ============================================================ */
let pendingHook = null;
let pendingSectionId = null;

function insertHookIntoSection(h, secId) {
  const vars = extractVars(h.texto || "");
  pendingHook = h;
  pendingSectionId = secId;

  if (vars.length === 0) {
    // Insertar directo
    insertHookText(h.texto);
    return;
  }

  // Mostrar modal de variables
  $("#varFields").innerHTML = vars.map(v => `
    <div class="field">
      <label class="field-label">${escapeHTML(v)}</label>
      <input class="input" data-var="${escapeHTML(v)}" placeholder="Rellena ${escapeHTML(v)}…" />
    </div>
  `).join("");
  $$("#varFields [data-var]").forEach(inp => inp.addEventListener("input", updateVarPreview));
  updateVarPreview();
  $("#hookUseModal").classList.add("on");
  setTimeout(() => {
    const first = $("#varFields input");
    if (first) first.focus();
  }, 60);
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
  $$("#varFields [data-var]").forEach(inp => {
    values[inp.dataset.var] = inp.value.trim();
  });
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
  $$("#varFields [data-var]").forEach(inp => {
    values[inp.dataset.var] = inp.value.trim();
  });
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
  const secId = pendingSectionId || "hook";
  const current = state.secciones[secId] || "";
  state.secciones[secId] = current.trim() ? current + "\n" + text : text;

  // Contar uso
  if (pendingHook) {
    pendingHook.uses = (pendingHook.uses || 0) + 1;
  }

  save();
  renderAllGuion();
  if (state.activeTab === "hooks") renderHooks();
  toast("Hook insertado", "", "success");
  closeDrawer();
  pendingHook = null;
  pendingSectionId = null;
}

/* ============================================================
   DRAWER (hooks rápidos desde la tab Guion)
   ============================================================ */
let drawerSectionId = null;
let drawerSearchQuery = "";
let drawerFilterCat = "all";

function openHooksDrawer(context, secId) {
  drawerSectionId = secId;
  drawerSearchQuery = "";
  drawerFilterCat = "all";
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
    <button class="filter-chip ${drawerFilterCat === "all" ? "active" : ""}" data-drawer-cat="all">Todas</button>
    <button class="filter-chip" data-drawer-fav-only style="color:var(--warning);border-color:rgba(245,158,11,.3)">★ Favoritos</button>
    ${CATEGORIAS_HOOKS.map(c => `
      <button class="filter-chip ${drawerFilterCat === c.id ? "active" : ""}" data-drawer-cat="${c.id}">
        ${escapeHTML(c.label)}
      </button>
    `).join("")}
  `;
  $$("[data-drawer-cat]").forEach(b => b.addEventListener("click", () => {
    drawerFilterCat = b.dataset.drawerCat;
    renderDrawerFilters(); renderDrawerList();
  }));
  $$("[data-drawer-fav-only]").forEach(b => b.addEventListener("click", () => {
    // Alterna entre todos y solo favoritos
    const isFavActive = b.classList.toggle("active");
    b.style.background = isFavActive ? "var(--warning)" : "";
    b.style.color = isFavActive ? "#fff" : "var(--warning)";
    window._drawerFavOnly = isFavActive;
    renderDrawerList();
  }));
}

function renderDrawerList() {
  const q = drawerSearchQuery.toLowerCase().trim();
  const favOnly = window._drawerFavOnly;
  const list = state.hooks.filter(h => {
    if (favOnly && !h.fav) return false;
    if (drawerFilterCat !== "all" && h.cat !== drawerFilterCat) return false;
    if (q && !h.texto.toLowerCase().includes(q)) return false;
    return true;
  }).sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0));

  if (list.length === 0) {
    $("#drawerList").innerHTML = `<div class="drawer-empty">Sin resultados.<br>Crea hooks desde la pestaña Hooks.</div>`;
    return;
  }

  $("#drawerList").innerHTML = list.map(h => {
    const html = escapeHTML(h.texto).replace(/\[([^\]]+)\]/g, '<span class="hp-var" style="color:var(--brand);font-weight:600;background:var(--brand-subtle);padding:0 3px;border-radius:3px">[$1]</span>');
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
  if (state.tomas.length === 0) {
    toast("Nada que reproducir", "Añade tomas primero.", "danger");
    return;
  }
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
  } else {
    mEl.hidden = true;
  }

  $("#playName").textContent = s.nombre;
  $("#playNota").textContent = it.nota || s.descripcion || "";

  const secEl = $("#playSection");
  if (it.seccionAsignada) {
    const tpl = plantilla(state.plantillaId);
    const sec = tpl.secciones.find(x => x.id === it.seccionAsignada);
    if (sec) {
      secEl.textContent = "Sección: " + sec.label;
      secEl.hidden = false;
    } else {
      secEl.hidden = true;
    }
  } else {
    secEl.hidden = true;
  }

  const screen = $("#playScreen");
  if (!s.video) {
    screen.innerHTML = `<span class="ph">${escapeHTML(s.cat)} · ${escapeHTML(fmtDur(it.duracion))}</span>`;
  } else if (isYT(s.video)) {
    screen.innerHTML = `<iframe src="${s.video}?autoplay=1&mute=1&controls=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  } else {
    screen.innerHTML = `<video src="${escapeHTML(s.video)}" autoplay loop muted playsinline controls></video>`;
  }

  $("#playBar").style.width = ((playIndex + 1) / state.tomas.length * 100) + "%";
  $("#btnPrev").disabled = playIndex === 0;
  $("#btnNext").disabled = playIndex === state.tomas.length - 1;
}

/* ============================================================
   COPIAR / EXPORTAR
   ============================================================ */
function buildPlainText() {
  const tpl = plantilla(state.plantillaId);
  const lines = [];
  if (state.titulo) lines.push("# " + state.titulo);
  if (state.cliente) lines.push("_Cliente: " + state.cliente + "_");
  lines.push("");
  tpl.secciones.forEach(sec => {
    const text = (state.secciones[sec.id] || "").trim();
    if (text) {
      lines.push(`**${sec.label}**`);
      lines.push(text);
      lines.push("");
    }
  });
  return lines.join("\n").trim();
}

function buildPlainTextOnlyContent() {
  const tpl = plantilla(state.plantillaId);
  return tpl.secciones
    .map(sec => (state.secciones[sec.id] || "").trim())
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
   NUEVO / GUARDAR / IMPORT / EXPORT
   ============================================================ */
function nuevoVideo() {
  const hasContent = Object.values(state.secciones).some(v => v && v.trim()) ||
                     state.tomas.length > 0 ||
                     state.titulo;
  if (!hasContent) return;
  openConfirm(
    "Nuevo video",
    "Se perderá el video actual si no lo has guardado como borrador. Los borradores no se tocan.",
    "Empezar nuevo",
    () => {
      state.titulo = "";
      state.cliente = "";
      state.secciones = {};
      state.tomas = [];
      const tpl = plantilla(state.plantillaId);
      tpl.secciones.forEach(s => { state.secciones[s.id] = ""; });
      save(); renderAll();
      toast("Video nuevo", "Listo para empezar.", "success");
    }
  );
}

function openSaveDraft() {
  const hasContent = Object.values(state.secciones).some(v => v && v.trim()) || state.tomas.length > 0;
  if (!hasContent) { toast("Nada que guardar", "Escribe o añade tomas primero.", "danger"); return; }
  const def = state.titulo || "Borrador " + (state.drafts.length + 1);
  openSaveModal(
    "Guardar borrador",
    "Ponle un nombre para identificarlo después.",
    def,
    (nombre) => {
      if (!nombre) { toast("Nombre requerido", "", "danger"); return false; }
      const snapshot = {
        titulo: state.titulo,
        cliente: state.cliente,
        duracion: state.duracion,
        plantillaId: state.plantillaId,
        secciones: JSON.parse(JSON.stringify(state.secciones)),
        tomas: JSON.parse(JSON.stringify(state.tomas)),
      };
      state.drafts.unshift({ id: "d" + Date.now(), nombre, fecha: today(), snapshot });
      save(); renderDrafts();
      toast("Borrador guardado", nombre, "success");
    }
  );
}

function renderDrafts() {
  const el = $("#draftsList");
  if (!el) return;
  if (state.drafts.length === 0) {
    el.innerHTML = `<span style="font-size:12px;color:var(--text-subtle)">Sin borradores.</span>`;
    return;
  }
  el.innerHTML = state.drafts.slice(0, 6).map(d => `
    <button class="quick-hook" data-load-draft="${d.id}" style="text-align:left;display:flex;gap:8px;align-items:center">
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHTML(d.nombre)}</span>
      <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-subtle)">${(d.snapshot.tomas || []).length}t</span>
    </button>
  `).join("");
  $$("[data-load-draft]").forEach(b => b.addEventListener("click", () => {
    const d = state.drafts.find(x => x.id === b.dataset.loadDraft);
    if (!d) return;
    Object.assign(state, JSON.parse(JSON.stringify(d.snapshot)));
    save(); renderAll();
    toast("Borrador abierto", d.nombre, "info");
  }));
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
  renderDrafts();
  updateTabBadges();
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

$("#btnNuevo").addEventListener("click", nuevoVideo);
$("#btnGuardar").addEventListener("click", openSaveDraft);
$("#btnCopiar").addEventListener("click", copiarGuion);
$("#btnPlay").addEventListener("click", openPlay);
$("#btnClosePlay").addEventListener("click", closePlay);
$("#btnPrev").addEventListener("click", playPrev);
$("#btnNext").addEventListener("click", playNext);

$("#btnAutoAssign").addEventListener("click", autoAssignTomas);

$("#btnNewHook").addEventListener("click", () => openHookEdit(null));
$("#hookEditSave").addEventListener("click", saveHookEdit);
$("#hookUseConfirm").addEventListener("click", confirmHookUse);

$("#btnOpenHooks").addEventListener("click", () => {
  openHooksDrawer("guion", "hook");
});

$("#assignConfirm").addEventListener("click", confirmAssign);

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

$("#btnExportar").addEventListener("click", () => {
  exportJSON(state, (state.titulo || "guion").replace(/\s+/g, "_").toLowerCase());
  toast("Exportado", "JSON descargado.", "success");
});

$("#btnImportar").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = () => {
    const f = input.files && input.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        state = { ...state, ...data };
        save(); renderAll();
        toast("Importado", "", "success");
      } catch {
        toast("Archivo inválido", "", "danger");
      }
    };
    reader.readAsText(f);
  };
  input.click();
});

/* Hook use modal: Enter avanza entre campos */
$("#hookUseModal").addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.tagName === "INPUT") {
    const inputs = $$("#varFields [data-var]");
    const idx = inputs.indexOf(e.target);
    if (idx >= 0 && idx < inputs.length - 1) {
      e.preventDefault();
      inputs[idx + 1].focus();
    } else if (idx === inputs.length - 1) {
      e.preventDefault();
      confirmHookUse();
    }
  }
});

/* Atajos */
document.addEventListener("keydown", e => {
  if ((e.metaKey || e.ctrlKey) && e.key === "s") {
    e.preventDefault();
    openSaveDraft();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "c" &&
      !window.getSelection().toString() &&
      document.activeElement.tagName !== "TEXTAREA" &&
      document.activeElement.tagName !== "INPUT") {
    e.preventDefault();
    copiarGuion();
  }
  // Cmd/Ctrl + 1..4 → tabs
  if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "4") {
    const tabs = ["guion", "tomas", "transiciones", "hooks"];
    const idx = +e.key - 1;
    if (tabs[idx]) { e.preventDefault(); switchTab(tabs[idx]); }
  }
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
load();
switchTab(state.activeTab || "guion");
renderAll();