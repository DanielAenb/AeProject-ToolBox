/* ============================================================
   TIPOGRAFÍA · Lógica
   assets/tipografia.js
   ============================================================ */

/* ============================================================
   PERSONALIDADES
   ============================================================ */
const PERSONALIDADES = [
  { id: "elegante",    label: "Elegante" },
  { id: "minimalista", label: "Minimalista" },
  { id: "editorial",   label: "Editorial" },
  { id: "rebelde",     label: "Rebelde" },
  { id: "calida",      label: "Cálida" },
  { id: "tecnica",     label: "Técnica" },
];

/* ============================================================
   FALLBACKS
   ============================================================ */
const FUENTE_FALLBACK = {
  "Playfair Display": "serif",
  "Cormorant Garamond": "serif",
  "DM Serif Display": "serif",
  "Fraunces": "serif",
  "Lora": "serif",
  "Source Serif 4": "serif",
  "Literata": "serif",
  "Space Grotesk": "sans-serif",
  "Archivo": "sans-serif",
  "Syne": "sans-serif",
  "Bebas Neue": "sans-serif",
  "Big Shoulders Display": "sans-serif",
  "Inter": "sans-serif",
  "DM Sans": "sans-serif",
  "Manrope": "sans-serif",
  "Work Sans": "sans-serif",
  "Outfit": "sans-serif",
  "Plus Jakarta Sans": "sans-serif",
  "Karla": "sans-serif",
  "JetBrains Mono": "monospace",
  "IBM Plex Mono": "monospace",
  "Space Mono": "monospace",
};

/* ============================================================
   PAREJAS · 18 curadas
   displayWord / bodyWord se muestran en la tarjeta de preview
   ============================================================ */
const PAREJAS_DEFAULT = [
  /* ELEGANTE */
  { id:"el-1", pers:"elegante", nombre:"Alta costura",  display:"Playfair Display",     body:"Lora",              displayWord:"Timeless",    bodyWord:"Grace",     desc:"Clásica, editorial, sofisticada" },
  { id:"el-2", pers:"elegante", nombre:"Minimal chic",  display:"Cormorant Garamond",   body:"Inter",             displayWord:"Delicate",    bodyWord:"Touch",     desc:"Delicada, ligera, moderna" },
  { id:"el-3", pers:"elegante", nombre:"Contemporánea", display:"DM Serif Display",     body:"DM Sans",           displayWord:"Elegant",     bodyWord:"Form",      desc:"Serif moderna con body geométrico" },

  /* MINIMALISTA */
  { id:"mi-1", pers:"minimalista", nombre:"Nórdica",   display:"Space Grotesk",        body:"Inter",             displayWord:"Modern",      bodyWord:"Simplicity", desc:"Funcional, limpia, contemporánea" },
  { id:"mi-2", pers:"minimalista", nombre:"Neutra",    display:"Manrope",              body:"Inter",             displayWord:"Effortless",  bodyWord:"Charm",     desc:"Silenciosa, equilibrada, atemporal" },
  { id:"mi-3", pers:"minimalista", nombre:"Limpia",    display:"Archivo",              body:"Work Sans",         displayWord:"Sleek",       bodyWord:"Simplicity", desc:"Grotesca, sistemática, industrial" },

  /* EDITORIAL */
  { id:"ed-1", pers:"editorial", nombre:"Revista",     display:"Fraunces",             body:"Source Serif 4",    displayWord:"Editorial",   bodyWord:"Narrative", desc:"Serif expresiva con cuerpo clásico" },
  { id:"ed-2", pers:"editorial", nombre:"Suplemento",  display:"Playfair Display",     body:"Inter",             displayWord:"Headline",    bodyWord:"Story",     desc:"Titulares dramáticos, cuerpo neutro" },
  { id:"ed-3", pers:"editorial", nombre:"Long-form",   display:"Lora",                 body:"Karla",             displayWord:"Reader",      bodyWord:"Comfort",   desc:"Serif cálida con sans humanista" },

  /* REBELDE */
  { id:"re-1", pers:"rebelde", nombre:"Vanguardia",    display:"Syne",                 body:"Space Grotesk",     displayWord:"Standout",    bodyWord:"Statement", desc:"Rompe la retícula, carácter fuerte" },
  { id:"re-2", pers:"rebelde", nombre:"Manifiesto",    display:"Bebas Neue",           body:"Inter",             displayWord:"LOUD",        bodyWord:"Clear",     desc:"Condensada, directa, tipo póster" },
  { id:"re-3", pers:"rebelde", nombre:"Brutalist",     display:"Big Shoulders Display", body:"JetBrains Mono",   displayWord:"Raw",         bodyWord:"Signal",    desc:"Industrial, brutalista, técnica" },

  /* CÁLIDA */
  { id:"ca-1", pers:"calida", nombre:"Artesanal",      display:"Fraunces",             body:"DM Sans",           displayWord:"Whimsy",      bodyWord:"Warm",      desc:"Serif humanista con cuerpo amable" },
  { id:"ca-2", pers:"calida", nombre:"Íntima",         display:"Cormorant Garamond",   body:"Lora",              displayWord:"Soft",        bodyWord:"Whisper",   desc:"Delicada, cercana, literaria" },
  { id:"ca-3", pers:"calida", nombre:"Amable",         display:"DM Serif Display",     body:"Plus Jakarta Sans", displayWord:"Friendly",    bodyWord:"Voice",     desc:"Serif suave con body geométrico" },

  /* TÉCNICA */
  { id:"te-1", pers:"tecnica", nombre:"Developer",     display:"Space Grotesk",        body:"IBM Plex Mono",     displayWord:"Signal",      bodyWord:"System",    desc:"Grotesca moderna con mono funcional" },
  { id:"te-2", pers:"tecnica", nombre:"Data",          display:"Archivo",              body:"JetBrains Mono",    displayWord:"Metric",      bodyWord:"Value",     desc:"Sistemática, densa, para datos" },
  { id:"te-3", pers:"tecnica", nombre:"Innovación",    display:"Syne",                 body:"Space Mono",        displayWord:"Future",      bodyWord:"Protocol",  desc:"Experimental con cuerpo retro-técnico" },
];

/* ============================================================
   NIVELES · jerarquía tipográfica
   group: agrupación visual en la tab Sistema
   ============================================================ */
const NIVELES = [
  { id:"h1",       label:"H1",           group:"Headings",  familia:"display", ratioPow:4,    defaultWeight:700, defaultLH:1.05, defaultLS:-0.03 },
  { id:"h2",       label:"H2",           group:"Headings",  familia:"display", ratioPow:3,    defaultWeight:700, defaultLH:1.10, defaultLS:-0.025 },
  { id:"h3",       label:"H3",           group:"Headings",  familia:"display", ratioPow:2,    defaultWeight:600, defaultLH:1.15, defaultLS:-0.02 },
  { id:"h4",       label:"H4",           group:"Headings",  familia:"display", ratioPow:1,    defaultWeight:600, defaultLH:1.25, defaultLS:-0.01 },
  { id:"sub1",     label:"Subtitle 1",   group:"Subtitles", familia:"body",    ratioPow:0.5,  defaultWeight:600, defaultLH:1.40, defaultLS:0 },
  { id:"sub2",     label:"Subtitle 2",   group:"Subtitles", familia:"body",    ratioPow:0.25, defaultWeight:600, defaultLH:1.45, defaultLS:0 },
  { id:"body1",    label:"Body 1",       group:"Body",      familia:"body",    ratioPow:0,    defaultWeight:400, defaultLH:1.55, defaultLS:0 },
  { id:"body2",    label:"Body 2",       group:"Body",      familia:"body",    ratioPow:-0.25,defaultWeight:400, defaultLH:1.55, defaultLS:0 },
  { id:"caption1", label:"Caption 1",    group:"Captions",  familia:"body",    ratioPow:-0.5, defaultWeight:500, defaultLH:1.45, defaultLS:0.005 },
  { id:"caption2", label:"Caption 2",    group:"Captions",  familia:"body",    ratioPow:-1,   defaultWeight:500, defaultLH:1.40, defaultLS:0.01 },
  { id:"overline", label:"Overline",     group:"Captions",  familia:"body",    ratioPow:-1,   defaultWeight:600, defaultLH:1.30, defaultLS:0.12, uppercase:true },
  { id:"button1",  label:"Button 1",     group:"Buttons",   familia:"body",    ratioPow:0,    defaultWeight:600, defaultLH:1.4,  defaultLS:0 },
  { id:"button2",  label:"Button 2",     group:"Buttons",   familia:"body",    ratioPow:-0.25,defaultWeight:600, defaultLH:1.4,  defaultLS:0.005 },
];

/* ============================================================
   RATIOS
   ============================================================ */
const RATIOS = [
  { v: 1.125, label: "1.125", desc: "Sutil · Apple" },
  { v: 1.2,   label: "1.2",   desc: "Natural · Material Design" },
  { v: 1.25,  label: "1.25",  desc: "Clásico · Tailwind" },
  { v: 1.333, label: "1.333", desc: "Expresivo · Editorial" },
  { v: 1.414, label: "1.414", desc: "Dramático · Revista" },
  { v: 1.5,   label: "1.5",   desc: "Brutal · Póster" },
  { v: 1.618, label: "1.618", desc: "Áureo · Libro de arte" },
];

/* ============================================================
   ESTADO
   ============================================================ */
const LS_KEY = "tipografia-v2";

let state = {
  personalidad: "elegante",
  parejaId: "el-1",
  baseSize: 16,
  ratio: 1.25,
  niveles: {},
  previewText: "Diseño · Contenido · Dirección visual",
  customParejas: [],
  presets: [],
  selectedNivel: "h1",
  activeView: "parejas",
};

function initNiveles() {
  NIVELES.forEach(n => {
    if (!state.niveles[n.id]) {
      state.niveles[n.id] = {
        weight: n.defaultWeight,
        lineHeight: n.defaultLH,
        letterSpacing: n.defaultLS,
        familia: n.familia,
        uppercase: !!n.uppercase,
      };
    }
  });
}

function save() { store.set(LS_KEY, state); }

function load() {
  const s = store.get(LS_KEY);
  if (s) state = { ...state, ...s };
  if (!Array.isArray(state.customParejas)) state.customParejas = [];
  initNiveles();
}

/* ============================================================
   HELPERS
   ============================================================ */
function allParejas() {
  return [...PAREJAS_DEFAULT, ...state.customParejas];
}
const pareja = id => allParejas().find(p => p.id === id) || PAREJAS_DEFAULT[0];

function fontStack(name) {
  const fb = FUENTE_FALLBACK[name] || "sans-serif";
  return /\s/.test(name) ? `"${name}", ${fb}` : `${name}, ${fb}`;
}

const calcSize = (ratioPow, base, ratio) => base * Math.pow(ratio, ratioPow);

function fmtSize(px) {
  const r = Math.round(px * 100) / 100;
  return (r % 1 === 0 ? r.toFixed(0) : r.toFixed(2).replace(/\.?0+$/, "")) + "px";
}

function fmtSizeRem(px) {
  const rem = px / 16;
  const r = Math.round(rem * 1000) / 1000;
  return (r % 1 === 0 ? r.toFixed(0) : r.toFixed(3).replace(/\.?0+$/, "")) + "rem";
}

function fmtTracking(v) {
  return v === 0 ? "0" : v.toFixed(3).replace(/\.?0+$/, "") + "em";
}

function fmtWeight(w) {
  return { 400: "Regular", 500: "Medium", 600: "SemiBold", 700: "Bold", 800: "ExtraBold" }[w] || w;
}

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
   SYSTEM DATA
   ============================================================ */
function systemData() {
  const p = pareja(state.parejaId);
  const displayStack = fontStack(p.display);
  const bodyStack = fontStack(p.body);

  return NIVELES.map(n => {
    const props = state.niveles[n.id];
    const size = calcSize(n.ratioPow, state.baseSize, state.ratio);
    const family = props.familia === "display" ? displayStack : bodyStack;
    const familyName = props.familia === "display" ? p.display : p.body;
    return {
      id: n.id,
      label: n.label,
      group: n.group,
      size,
      sizeStr: fmtSize(size),
      sizeRem: fmtSizeRem(size),
      lineHeight: props.lineHeight,
      lineHeightStr: fmtSize(size * props.lineHeight),
      lineHeightRem: fmtSizeRem(size * props.lineHeight),
      letterSpacing: props.letterSpacing,
      letterSpacingStr: fmtTracking(props.letterSpacing),
      weight: props.weight,
      weightStr: fmtWeight(props.weight),
      familia: props.familia,
      family,
      familyName,
      uppercase: props.uppercase,
    };
  });
}

/* ============================================================
   RENDER · Sidebar
   ============================================================ */
function renderPersChips() {
  $("#persChips").innerHTML = PERSONALIDADES.map(p => `
    <button class="filter-chip ${state.personalidad === p.id ? "active" : ""}" data-pers="${p.id}">
      ${escapeHTML(p.label)}
    </button>
  `).join("");
  $$("[data-pers]").forEach(b => b.addEventListener("click", () => {
    state.personalidad = b.dataset.pers;
    const first = allParejas().find(p => p.pers === state.personalidad);
    if (first) state.parejaId = first.id;
    save(); renderAll();
  }));
}

function renderParejas() {
  const list = allParejas().filter(p => p.pers === state.personalidad);
  $("#parejaList").innerHTML = list.map(p => `
    <button class="pareja-item ${state.parejaId === p.id ? "active" : ""}" data-pareja="${p.id}">
      <div class="pi-name">${escapeHTML(p.nombre)}</div>
      <div class="pi-sub">${escapeHTML(p.display)} · ${escapeHTML(p.body)}</div>
    </button>
  `).join("");
  $$("[data-pareja]").forEach(b => b.addEventListener("click", () => {
    state.parejaId = b.dataset.pareja;
    save(); renderAll();
  }));
}

function renderEscala() {
  $("#baseRange").value = state.baseSize;
  $("#baseValue").textContent = state.baseSize + "px";

  $("#ratioChips").innerHTML = RATIOS.map(r => `
    <button class="filter-chip ${Math.abs(state.ratio - r.v) < 0.001 ? "active" : ""}" data-ratio="${r.v}">
      ${r.label}
    </button>
  `).join("");

  const r = RATIOS.find(x => Math.abs(x.v - state.ratio) < 0.001);
  $("#ratioHint").textContent = r ? r.desc : "";

  $$("[data-ratio]").forEach(b => b.addEventListener("click", () => {
    state.ratio = parseFloat(b.dataset.ratio);
    save(); renderAll();
  }));
}

function renderPresets() {
  $("#presetCount").textContent = state.presets.length;
  const el = $("#presetList");
  if (state.presets.length === 0) {
    el.innerHTML = `<div style="font-size:11.5px;color:var(--text-subtle);text-align:center;padding:10px 0">Sin presets.</div>`;
    return;
  }
  el.innerHTML = state.presets.map(pr => `
    <div class="preset-item">
      <span class="pr-name" title="${escapeHTML(pr.nombre)}">${escapeHTML(pr.nombre)}</span>
      <button data-load-preset="${pr.id}" title="Cargar">
        <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
      </button>
      <button class="danger" data-del-preset="${pr.id}" title="Eliminar">
        <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  `).join("");
  $$("[data-load-preset]").forEach(b => b.addEventListener("click", () => {
    const pr = state.presets.find(x => x.id === b.dataset.loadPreset);
    if (!pr) return;
    Object.assign(state, JSON.parse(JSON.stringify(pr.snapshot)));
    initNiveles();
    save(); renderAll();
    toast("Preset cargado", pr.nombre, "success");
  }));
  $$("[data-del-preset]").forEach(b => b.addEventListener("click", () => {
    state.presets = state.presets.filter(x => x.id !== b.dataset.delPreset);
    save(); renderPresets();
  }));
}

/* ============================================================
   RENDER · Vista Parejas
   ============================================================ */
function renderParejasView() {
  const list = allParejas().filter(p => p.pers === state.personalidad);
  const pers = PERSONALIDADES.find(p => p.id === state.personalidad);

  return `
    <div class="parejas-view">
      <div class="parejas-header">
        <div class="ph-eyebrow">Ae Project · Tipografía</div>
        <div class="ph-title">${escapeHTML(pers.label)}</div>
        <div class="ph-sub">Font Pairing Ideas</div>
      </div>

      <div class="parejas-grid">
        ${list.map(p => {
          const displayStack = fontStack(p.display);
          const bodyStack = fontStack(p.body);
          return `
            <button class="pareja-card ${state.parejaId === p.id ? "active" : ""}" data-pareja-card="${p.id}">
              <div class="pc-pers">${escapeHTML(pers.label)}</div>
              <div class="pc-display-word" style="font-family:${displayStack}; font-weight:700;">${escapeHTML(p.displayWord || p.nombre)}</div>
              <div class="pc-body-word" style="font-family:${bodyStack}; font-weight:300;">${escapeHTML(p.bodyWord || "")}</div>
              <div class="pc-names">
                <div><strong>${escapeHTML(p.display)}</strong> Bold</div>
                <div><strong>${escapeHTML(p.body)}</strong> Regular</div>
              </div>
            </button>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

/* ============================================================
   RENDER · Vista Sistema
   ============================================================ */
function renderSistemaView() {
  const p = pareja(state.parejaId);
  const sys = systemData();
  const displayStack = fontStack(p.display);

  // Agrupar niveles
  const groups = {};
  sys.forEach(n => {
    (groups[n.group] = groups[n.group] || []).push(n);
  });

  // Tokens por grupo de tokens (family, weight, size)
  const tokensHTML = `
    <div class="sys-tokens-table-wrap">
      <table class="sys-tokens-table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><strong>font.family.display</strong></td><td>${escapeHTML(p.display)}</td></tr>
          <tr><td><strong>font.family.body</strong></td><td>${escapeHTML(p.body)}</td></tr>
          <tr><td><strong>font.base</strong></td><td>${state.baseSize}px / ${fmtSizeRem(state.baseSize)}</td></tr>
          <tr><td><strong>font.ratio</strong></td><td>${state.ratio}</td></tr>
          <tr><td><strong>font.weights</strong></td><td>400 · 500 · 600 · 700</td></tr>
        </tbody>
      </table>
    </div>
  `;

  // Niveles
  const levelsHTML = Object.entries(groups).map(([groupName, items]) => `
    <div class="sys-section-head">${escapeHTML(groupName)}</div>
    ${items.map(n => `
      <div class="sys-level ${state.selectedNivel === n.id ? "selected" : ""}" data-nivel="${n.id}">
        <div class="sl-group">${escapeHTML(n.group)}</div>
        <div class="sl-name">${escapeHTML(n.label)}</div>
        <div class="sl-sample" style="
          font-family: ${n.family};
          font-size: ${n.size}px;
          font-weight: ${n.weight};
          line-height: ${n.lineHeight};
          letter-spacing: ${n.letterSpacing}em;
          ${n.uppercase ? "text-transform: uppercase;" : ""}
        ">${escapeHTML(state.previewText || "Tipografía")}</div>
        <div class="sl-specs">
          <span class="sp"><span class="k">Size:</span><span class="v">${n.sizeStr} / ${n.sizeRem}</span></span>
          <span class="sp"><span class="k">Weight:</span><span class="v">${n.weight} / ${n.weightStr}</span></span>
          <span class="sp"><span class="k">Line-height:</span><span class="v">${n.lineHeightStr} / ${n.lineHeightRem}</span></span>
          <span class="sp"><span class="k">Tracking:</span><span class="v">${n.letterSpacingStr}</span></span>
        </div>
      </div>
    `).join("")}
  `).join("");

  return `
    <div class="sistema-view">

      <!-- Hero -->
      <div class="sys-hero">
        <div class="sys-hero-left">
          <div class="hero-specimen" style="font-family:${displayStack};">
            ${escapeHTML(p.display)}
          </div>
          <div class="hero-alphabet" style="font-family:${displayStack};">
            ABCDEFGHIJKLMNOPQRSTUVWXYZ
          </div>
          <div class="hero-alphabet" style="font-family:${displayStack};">
            abcdefghijklmnopqrstuvwxyz 0123456789
          </div>
        </div>
        <div class="sys-hero-right">
          <div class="hero-weights">
            <div class="hw-label">Pesos disponibles</div>
            <div class="hw-item" style="font-family:${displayStack};font-weight:700;">Bold</div>
            <div class="hw-item" style="font-family:${displayStack};font-weight:600;">SemiBold</div>
            <div class="hw-item" style="font-family:${displayStack};font-weight:500;">Medium</div>
            <div class="hw-item" style="font-family:${displayStack};font-weight:400;">Regular</div>
          </div>
        </div>
      </div>

      <!-- Tokens -->
      <div class="sys-section">
        <div class="sys-section-head">Tokens</div>
        <div class="sys-tokens">${tokensHTML}</div>
      </div>

      <!-- Niveles -->
      ${levelsHTML}

    </div>
  `;
}

/* ============================================================
   RENDER · Vista Guía
   ============================================================ */
function renderGuiaView() {
  const sys = systemData();
  const h1 = sys.find(n => n.id === "h1");
  const body1 = sys.find(n => n.id === "body1");

  return `
    <div class="guia-view">

      <!-- Card 1: Line Height -->
      <div class="guia-card">
        <div class="gc-head">
          <div class="gc-title">Line Height</div>
          <span class="gc-badge">Fórmula</span>
        </div>
        <div class="gc-formula">Line Height = Font size × 1.4 a 1.6</div>
        <div class="gc-body">
          <div class="guia-demo">
            <div class="wrong" style="font-size:14px;line-height:0.85">A TEXT TO SHOW YOU HOW LINE HEIGHT CHANGES</div>
            <div class="right" style="font-size:14px">A TEXT TO SHOW YOU HOW LINE HEIGHT CHANGES</div>
          </div>
          <div class="gc-note">
            Font size 50 · line-height 40 (apretado, ilegible).<br>
            Font size 50 · line-height 50 × 1.4 = 70 (correcto).
          </div>
        </div>
        <div class="gc-footer">This range just hits perfect</div>
      </div>

      <!-- Card 2: Font Size Scale -->
      <div class="guia-card">
        <div class="gc-head">
          <div class="gc-title">Font Size Scale</div>
          <span class="gc-badge">Fórmula</span>
        </div>
        <div class="gc-formula">Next size = Current size × ${state.ratio}</div>
        <div class="gc-body">
          <div class="guia-scale-row"><span class="gsr-size">${state.baseSize}px</span><span class="gsr-sample" style="font-size:${state.baseSize}px">Body</span></div>
          <div class="guia-scale-row"><span class="gsr-size">${fmtSize(state.baseSize * state.ratio)}</span><span class="gsr-sample" style="font-size:${state.baseSize * state.ratio}px">Subheading</span></div>
          <div class="guia-scale-row"><span class="gsr-size">${fmtSize(state.baseSize * Math.pow(state.ratio, 2))}</span><span class="gsr-sample" style="font-size:${state.baseSize * Math.pow(state.ratio, 2)}px">Heading</span></div>
          <div class="guia-scale-row"><span class="gsr-size">${fmtSize(state.baseSize * Math.pow(state.ratio, 3))}</span><span class="gsr-sample" style="font-size:${state.baseSize * Math.pow(state.ratio, 3)}px">Display</span></div>
          <div class="gc-note">
            Los valores sin redondear son guías. Redondea al múltiplo de 4 más cercano antes de entregar.
          </div>
        </div>
        <div class="gc-footer">A consistent scale feels intentional, not random</div>
      </div>

      <!-- Card 3: Tracking -->
      <div class="guia-card">
        <div class="gc-head">
          <div class="gc-title">Tracking</div>
          <span class="gc-badge">Regla</span>
        </div>
        <div class="gc-formula">Negativo en grande · Positivo en pequeño</div>
        <div class="gc-body">
          <div style="font-size:32px;letter-spacing:-0.04em;line-height:1.1;font-weight:700">Títulos grandes</div>
          <div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:600;margin-top:8px">Etiquetas pequeñas</div>
          <div class="gc-note" style="margin-top:16px">
            Los display necesitan tracking negativo para verse compactos. Los labels pequeños necesitan tracking positivo para respirar.
          </div>
        </div>
        <div class="gc-footer">Espacio entre letras, no entre palabras</div>
      </div>

      <!-- Card 4: Rules -->
      <div class="guia-card light">
        <div class="gc-head">
          <div class="gc-title" style="color:var(--text)">Reglas</div>
          <span class="gc-badge">Práctica</span>
        </div>
        <div class="gc-formula">5 reglas que siempre aplican</div>
        <div class="gc-body" style="gap:12px">
          <div class="rule-item"><span class="rule-dot"></span><span>Máximo 2 familias por proyecto. Más es ruido.</span></div>
          <div class="rule-item"><span class="rule-dot"></span><span>Body entre 60-75 caracteres por línea.</span></div>
          <div class="rule-item"><span class="rule-dot"></span><span>Line-height 1.5+ en cuerpo, 1.05-1.25 en títulos.</span></div>
          <div class="rule-item"><span class="rule-dot"></span><span>Contraste de peso antes que contraste de tamaño.</span></div>
          <div class="rule-item"><span class="rule-dot"></span><span>Redondea a múltiplos de 4px para consistencia.</span></div>
        </div>
        <div class="gc-footer">System rules · v1</div>
      </div>

      <!-- Card 5: Current system preview -->
      <div class="guia-card light">
        <div class="gc-head">
          <div class="gc-title" style="color:var(--text)">Tu sistema</div>
          <span class="gc-badge">En vivo</span>
        </div>
        <div class="gc-formula">Base ${state.baseSize}px · Ratio ${state.ratio}</div>
        <div class="gc-body" style="gap:14px">
          <div style="font-family:${h1.family};font-size:${h1.size}px;font-weight:${h1.weight};line-height:${h1.lineHeight};letter-spacing:${h1.letterSpacing}em;color:var(--text)">Aa</div>
          <div style="font-family:${body1.family};font-size:${body1.size}px;line-height:${body1.lineHeight};color:var(--text-muted)">Texto de cuerpo</div>
        </div>
        <div class="gc-footer">${escapeHTML(pareja(state.parejaId).nombre)}</div>
      </div>

    </div>
  `;
}

/* ============================================================
   RENDER · Vista activa
   ============================================================ */
function renderView() {
  const content = $("#viewContent");
  if (state.activeView === "parejas")  content.innerHTML = renderParejasView();
  if (state.activeView === "sistema")  content.innerHTML = renderSistemaView();
  if (state.activeView === "guia")     content.innerHTML = renderGuiaView();

  // Bindings
  $$("[data-pareja-card]").forEach(b => b.addEventListener("click", () => {
    state.parejaId = b.dataset.parejaCard;
    save(); renderAll();
  }));
  $$("[data-nivel]").forEach(el => el.addEventListener("click", () => {
    state.selectedNivel = el.dataset.nivel;
    save(); renderAll();
  }));

  // Tabs
  $$(".vt-btn").forEach(t => t.classList.toggle("active", t.dataset.view === state.activeView));
}

/* ============================================================
   RENDER · Nivel panel (sidebar derecho)
   ============================================================ */
function renderNivelPanel() {
  const n = NIVELES.find(x => x.id === state.selectedNivel);
  if (!n) {
    $("#nivelSelLabel").textContent = "—";
    $("#nivelControls").innerHTML = `<div class="empty-hint">Haz clic en un nivel para editarlo.</div>`;
    return;
  }

  const props = state.niveles[n.id];
  $("#nivelSelLabel").textContent = n.label;

  const weights = [400, 500, 600, 700];
  const lhOptions = [1.0, 1.05, 1.1, 1.15, 1.25, 1.3, 1.4, 1.45, 1.5, 1.55, 1.6, 1.7];
  const lsOptions = [-0.03, -0.025, -0.02, -0.015, -0.01, -0.005, 0, 0.005, 0.01, 0.02, 0.05, 0.1, 0.12];

  $("#nivelControls").innerHTML = `
    <div class="ctrl-field">
      <div class="ctrl-label">
        <span>Familia</span>
        <span class="ctrl-value">${props.familia === "display" ? "Display" : "Body"}</span>
      </div>
      <div class="ctrl-chips">
        <button class="ctrl-chip ${props.familia === "display" ? "active" : ""}" data-fam="display">Display</button>
        <button class="ctrl-chip ${props.familia === "body" ? "active" : ""}" data-fam="body">Body</button>
      </div>
    </div>

    <div class="ctrl-field">
      <div class="ctrl-label">
        <span>Peso</span>
        <span class="ctrl-value">${props.weight}</span>
      </div>
      <div class="ctrl-chips">
        ${weights.map(w => `<button class="ctrl-chip ${props.weight === w ? "active" : ""}" data-w="${w}">${w}</button>`).join("")}
      </div>
    </div>

    <div class="ctrl-field">
      <div class="ctrl-label">
        <span>Line-height</span>
        <span class="ctrl-value">${props.lineHeight}</span>
      </div>
      <div class="ctrl-chips">
        ${lhOptions.map(v => `<button class="ctrl-chip ${Math.abs(props.lineHeight - v) < 0.001 ? "active" : ""}" data-lh="${v}">${v}</button>`).join("")}
      </div>
    </div>

    <div class="ctrl-field">
      <div class="ctrl-label">
        <span>Tracking</span>
        <span class="ctrl-value">${fmtTracking(props.letterSpacing)}</span>
      </div>
      <div class="ctrl-chips">
        ${lsOptions.map(v => `<button class="ctrl-chip ${Math.abs(props.letterSpacing - v) < 0.0001 ? "active" : ""}" data-ls="${v}">${fmtTracking(v)}</button>`).join("")}
      </div>
    </div>

    <div class="ctrl-field">
      <label class="switch" style="font-size:12.5px">
        <input type="checkbox" id="ctrlUppercase" ${props.uppercase ? "checked" : ""} />
        <span class="track"><span class="thumb"></span></span>
        <span>Mayúsculas</span>
      </label>
    </div>
  `;

  $$("[data-fam]").forEach(b => b.addEventListener("click", () => {
    state.niveles[n.id].familia = b.dataset.fam;
    save(); renderAll();
  }));
  $$("[data-w]").forEach(b => b.addEventListener("click", () => {
    state.niveles[n.id].weight = +b.dataset.w;
    save(); renderAll();
  }));
  $$("[data-lh]").forEach(b => b.addEventListener("click", () => {
    state.niveles[n.id].lineHeight = +b.dataset.lh;
    save(); renderAll();
  }));
  $$("[data-ls]").forEach(b => b.addEventListener("click", () => {
    state.niveles[n.id].letterSpacing = +b.dataset.ls;
    save(); renderAll();
  }));
  $("#ctrlUppercase").addEventListener("change", e => {
    state.niveles[n.id].uppercase = e.target.checked;
    save(); renderAll();
  });
}

/* ============================================================
   RENDER · System info
   ============================================================ */
function renderSysInfo() {
  const p = pareja(state.parejaId);
  const sys = systemData();
  const first = sys[0];
  const last = sys[sys.length - 1];

  $("#sysInfo").innerHTML = `
    <div class="si-row"><span class="si-k">Display</span><span class="si-v">${escapeHTML(p.display)}</span></div>
    <div class="si-row"><span class="si-k">Body</span><span class="si-v">${escapeHTML(p.body)}</span></div>
    <div class="si-row"><span class="si-k">Base</span><span class="si-v">${state.baseSize}px</span></div>
    <div class="si-row"><span class="si-k">Ratio</span><span class="si-v">${state.ratio}</span></div>
    <div class="si-row"><span class="si-k">Niveles</span><span class="si-v">${NIVELES.length}</span></div>
    <div class="si-row"><span class="si-k">Rango</span><span class="si-v">${fmtSize(last.size)} → ${fmtSize(first.size)}</span></div>
  `;
}

/* ============================================================
   RENDER MAESTRO
   ============================================================ */
function renderAll() {
  renderPersChips();
  renderParejas();
  renderEscala();
  renderPresets();
  renderView();
  renderNivelPanel();
  renderSysInfo();
}

/* ============================================================
   EXPORTACIONES
   ============================================================ */
function exportCSS() {
  const p = pareja(state.parejaId);
  const sys = systemData();
  const lines = [];

  lines.push("/* ============================================================");
  lines.push(`   Sistema tipográfico · ${p.nombre}`);
  lines.push(`   ${p.display} + ${p.body}`);
  lines.push(`   Base: ${state.baseSize}px · Ratio: ${state.ratio}`);
  lines.push(`   Generado por Ae Project .studio`);
  lines.push("   ============================================================ */");
  lines.push("");
  lines.push(":root {");
  lines.push(`  --font-display: ${fontStack(p.display)};`);
  lines.push(`  --font-body: ${fontStack(p.body)};`);
  lines.push("");
  sys.forEach(n => {
    lines.push(`  --fs-${n.id}: ${n.sizeStr};`);
    lines.push(`  --lh-${n.id}: ${n.lineHeight};`);
    lines.push(`  --ls-${n.id}: ${n.letterSpacing}em;`);
    lines.push(`  --fw-${n.id}: ${n.weight};`);
  });
  lines.push("}");
  lines.push("");

  sys.forEach(n => {
    lines.push(`.text-${n.id} {`);
    lines.push(`  font-family: var(--font-${n.familia});`);
    lines.push(`  font-size: var(--fs-${n.id});`);
    lines.push(`  line-height: var(--lh-${n.id});`);
    lines.push(`  letter-spacing: var(--ls-${n.id});`);
    lines.push(`  font-weight: var(--fw-${n.id});`);
    if (n.uppercase) lines.push("  text-transform: uppercase;");
    lines.push("}");
    lines.push("");
  });

  downloadText(lines.join("\n"), `${p.nombre.replace(/\s+/g, "_").toLowerCase()}-tokens.css`, "text/css");
  toast("CSS exportado", "", "success");
}

function exportJSONTokens() {
  const p = pareja(state.parejaId);
  const sys = systemData();

  const tokens = {
    meta: {
      pareja: p.nombre,
      display: p.display,
      body: p.body,
      baseSize: state.baseSize,
      ratio: state.ratio,
      generado: new Date().toISOString(),
    },
    fonts: {
      display: fontStack(p.display),
      body: fontStack(p.body),
    },
    levels: {},
  };

  sys.forEach(n => {
    tokens.levels[n.id] = {
      label: n.label,
      group: n.group,
      fontSize: n.sizeStr,
      fontSizeNumeric: Math.round(n.size * 100) / 100,
      lineHeight: n.lineHeight,
      letterSpacing: n.letterSpacing,
      fontWeight: n.weight,
      familia: n.familia,
      uppercase: n.uppercase,
    };
  });

  exportJSON(tokens, `${p.nombre.replace(/\s+/g, "_").toLowerCase()}-tokens`);
  toast("JSON exportado", "", "success");
}

function exportHTMLRef() {
  const p = pareja(state.parejaId);
  const sys = systemData();

  const cssVars = [];
  cssVars.push(":root {");
  cssVars.push(`  --font-display: ${fontStack(p.display)};`);
  cssVars.push(`  --font-body: ${fontStack(p.body)};`);
  sys.forEach(n => {
    cssVars.push(`  --fs-${n.id}: ${n.sizeStr};`);
    cssVars.push(`  --lh-${n.id}: ${n.lineHeight};`);
    cssVars.push(`  --ls-${n.id}: ${n.letterSpacing}em;`);
    cssVars.push(`  --fw-${n.id}: ${n.weight};`);
  });
  cssVars.push("}");

  const levels = sys.map(n => `
    <div class="item">
      <div class="label">${escapeHTML(n.label)} · ${n.sizeStr}</div>
      <div class="${n.id}">Diseño · Contenido · Dirección visual</div>
    </div>`).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHTML(p.nombre)} · Sistema tipográfico</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(p.display).replace(/%20/g, "+")}:wght@400;500;600;700&family=${encodeURIComponent(p.body).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: var(--font-body);
    padding: 48px;
    max-width: 900px;
    margin: 0 auto;
    line-height: 1.55;
    color: #0a0a0b;
  }
${cssVars.join("\n")}
  .item { padding: 20px 0; border-bottom: 1px solid #eee; }
  .item:last-child { border-bottom: 0; }
  .label {
    font-family: monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #999;
    margin-bottom: 8px;
  }
${sys.map(n => `  .${n.id} {
    font-family: var(--font-${n.familia});
    font-size: var(--fs-${n.id});
    line-height: var(--lh-${n.id});
    letter-spacing: var(--ls-${n.id});
    font-weight: var(--fw-${n.id});
    ${n.uppercase ? "text-transform: uppercase;" : ""}
  }`).join("\n")}
</style>
</head>
<body>
  <h1 style="margin-bottom:32px">${escapeHTML(p.nombre)}</h1>
  ${levels}
</body>
</html>`;

  downloadText(html, `${p.nombre.replace(/\s+/g, "_").toLowerCase()}-sistema.html`, "text/html");
  toast("HTML exportado", "", "success");
}

async function exportPNG() {
  const view = $("#viewContent");
  if (!view) { toast("Nada que exportar", "", "danger"); return; }

  toast("Preparando PNG…", "Puede tardar un momento.", "info");

  try {
    const html2canvas = await loadHtml2Canvas();
    const bgColor = document.documentElement.getAttribute("data-theme") === "dark" ? "#0a0a0b" : "#fff";
    const canvas = await html2canvas(view, {
      backgroundColor: bgColor,
      scale: 2,
      useCORS: true,
      logging: false,
    });
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tipografia-${state.activeView}-${Date.now()}.png`;
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
   PRESETS
   ============================================================ */
function savePreset() {
  const p = pareja(state.parejaId);
  const def = `${p.nombre} · ${state.baseSize}px · ${state.ratio}`;
  const nombre = prompt("Nombre del preset:", def);
  if (!nombre) return;

  state.presets.unshift({
    id: "pr_" + Date.now(),
    nombre,
    fecha: today(),
    snapshot: {
      personalidad: state.personalidad,
      parejaId: state.parejaId,
      baseSize: state.baseSize,
      ratio: state.ratio,
      niveles: JSON.parse(JSON.stringify(state.niveles)),
    },
  });
  save(); renderPresets();
  toast("Preset guardado", nombre, "success");
}

/* ============================================================
   MODAL · Añadir pareja
   ============================================================ */
function openAddPareja() {
  $("#npNombre").value = "";
  $("#npDisplay").value = "";
  $("#npBody").value = "";
  $("#npPers").innerHTML = PERSONALIDADES.map(p => `
    <button class="filter-chip" data-np-pers="${p.id}">${escapeHTML(p.label)}</button>
  `).join("");
  // Marca la personalidad actual como default
  const current = PERSONALIDADES.find(p => p.id === state.personalidad);
  if (current) {
    const btn = $(`[data-np-pers="${current.id}"]`);
    if (btn) btn.classList.add("active");
  }
  $$("[data-np-pers]").forEach(b => b.addEventListener("click", () => {
    $$("[data-np-pers]").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
  }));
  $("#modalPareja").classList.add("on");
}

function saveNewPareja() {
  const nombre = $("#npNombre").value.trim();
  const display = $("#npDisplay").value.trim();
  const body = $("#npBody").value.trim();
  const persBtn = $("#npPers .filter-chip.active");
  const pers = persBtn ? persBtn.dataset.npPers : state.personalidad;

  if (!nombre || !display || !body) {
    toast("Completa todos los campos", "", "danger");
    return;
  }

  const id = "custom-" + Date.now();
  state.customParejas.push({
    id, pers, nombre,
    display, body,
    displayWord: nombre,
    bodyWord: "",
    desc: "Pareja personalizada",
  });
  state.parejaId = id;
  state.personalidad = pers;
  save();
  $("#modalPareja").classList.remove("on");
  renderAll();
  toast("Pareja añadida", nombre, "success");
}

/* ============================================================
   EVENTOS
   ============================================================ */
$("#baseRange").addEventListener("input", e => {
  state.baseSize = parseFloat(e.target.value);
  $("#baseValue").textContent = state.baseSize + "px";
  save();
  renderView();
  renderSysInfo();
});

$("#previewText").addEventListener("input", debounce(e => {
  state.previewText = e.target.value;
  save();
  renderView();
}, 150));

$$(".vt-btn").forEach(t => t.addEventListener("click", () => {
  state.activeView = t.dataset.view;
  save(); renderView();
}));

$("#btnSavePreset").addEventListener("click", savePreset);
$("#btnExportCSS").addEventListener("click", exportCSS);
$("#btnExportJSON").addEventListener("click", exportJSONTokens);
$("#btnExportHTML").addEventListener("click", exportHTMLRef);
$("#btnExportPNG").addEventListener("click", exportPNG);
$("#btnAddPareja").addEventListener("click", openAddPareja);
$("#npSave").addEventListener("click", saveNewPareja);

$$("[data-close]").forEach(n => n.addEventListener("click", () => {
  n.closest(".modal").classList.remove("on");
}));

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
    renderView();
  });
})();

/* ============================================================
   INIT
   ============================================================ */
load();
$("#previewText").value = state.previewText;
renderAll();