/* ============================================================
   PRODUCCIÓN · Lógica
   assets/produccion.js

   Persistencia:
     produccion/{id}                 → un doc por ítem
     config/produccion-settings      → límites, pesos, días lab.
   ============================================================ */

const COL_ITEMS = "produccion";
const DOC_SETTINGS = "produccion-settings";

let state = {
  items: [],
  settings: {
    limites: { ...LIMITES_DEFAULT },
    pesos: pesosDefault(),
    diasLaborables: [...DIAS_LABORABLES_DEFAULT],
  },
  filterCat: "all",
  search: "",
  editingId: null,
};

function newId() {
  return "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
}

/* ============================================================
   HELPERS DE FECHA
   ============================================================ */
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function startOfWeekISO(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0=dom
  const diff = day === 0 ? -6 : 1 - day; // lunes como inicio
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function endOfWeekISO(dateStr) {
  const d = new Date(startOfWeekISO(dateStr) + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

function startOfMonthISO(dateStr) {
  return dateStr.slice(0, 8) + "01";
}

function endOfMonthISO(dateStr) {
  const d = new Date(dateStr.slice(0, 7) + "-01T00:00:00");
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d.toISOString().slice(0, 10);
}

function fmtDateLabel(iso) {
  const d = new Date(iso + "T00:00:00");
  const today = todayISO();
  const yesterday = (() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return y.toISOString().slice(0, 10);
  })();
  if (iso === today) return "Hoy";
  if (iso === yesterday) return "Ayer";
  return d.toLocaleDateString("es-VE", { weekday: "long", day: "numeric", month: "long" });
}

function fmtDateShort(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-VE", { day: "numeric", month: "short" });
}

/* ============================================================
   HELPERS DE TIPO
   ============================================================ */
function tipoById(id) {
  return TIPOS_ITEM.find(t => t.id === id) || { id, label: id, cat: "—", uc: 0 };
}
function pesoDe(tipoId) {
  return typeof state.settings.pesos[tipoId] === "number"
    ? state.settings.pesos[tipoId]
    : (tipoById(tipoId).uc || 0);
}

/* ============================================================
   PERSISTENCIA
   ============================================================ */
async function loadSettings() {
  const s = await cloud.load(DOC_SETTINGS);
  if (s) {
    state.settings = {
      limites: { ...LIMITES_DEFAULT, ...(s.limites || {}) },
      pesos: { ...pesosDefault(), ...(s.pesos || {}) },
      diasLaborables: Array.isArray(s.diasLaborables) ? s.diasLaborables : [...DIAS_LABORABLES_DEFAULT],
    };
  }
}

async function saveSettings() {
  await cloud.save(DOC_SETTINGS, {
    limites: state.settings.limites,
    pesos: state.settings.pesos,
    diasLaborables: state.settings.diasLaborables,
    updatedAt: new Date().toISOString(),
  });
}

async function loadItems() {
  const list = await cloud.list(COL_ITEMS);
  list.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "") || (b.createdAt || "").localeCompare(a.createdAt || ""));
  state.items = list;
}

async function saveItem(item) {
  await cloud.save(`${COL_ITEMS}/${item.id}`, item);
  const i = state.items.findIndex(x => x.id === item.id);
  if (i >= 0) state.items[i] = item;
  else state.items.unshift(item);
  state.items.sort((a, b) => (b.fecha || "").localeCompare(a.fecha || "") || (b.createdAt || "").localeCompare(a.createdAt || ""));
}

async function deleteItem(id) {
  await cloud.remove(`${COL_ITEMS}/${id}`);
  state.items = state.items.filter(x => x.id !== id);
}

/* ============================================================
   CÁLCULO DE TOTALES
   ============================================================ */
function sumUC(items) {
  return items.reduce((acc, it) => {
    if (it.tipo === "fuera") return acc;
    return acc + (Number(it.peso) || 0);
  }, 0);
}

function itemsBetween(startISO, endISO) {
  return state.items.filter(it => it.fecha >= startISO && it.fecha <= endISO);
}

function calcTotals() {
  const today = todayISO();
  const wStart = startOfWeekISO(today);
  const wEnd = endOfWeekISO(today);
  const mStart = startOfMonthISO(today);
  const mEnd = endOfMonthISO(today);

  return {
    diario: sumUC(itemsBetween(today, today)),
    semanal: sumUC(itemsBetween(wStart, wEnd)),
    mensual: sumUC(itemsBetween(mStart, mEnd)),
  };
}

function statusFor(value, limit) {
  if (limit <= 0) return "ok";
  const pct = value / limit;
  if (pct > 1) return "over";
  if (pct >= 0.8) return "warn";
  return "ok";
}

/* ============================================================
   RENDER DASHBOARD
   ============================================================ */
function renderDashboard() {
  const t = calcTotals();
  const L = state.settings.limites;
  const today = todayISO();

  $("#dcDateToday").textContent = fmtDateShort(today);
  $("#dcWeekRange").textContent = `${fmtDateShort(startOfWeekISO(today))} – ${fmtDateShort(endOfWeekISO(today))}`;
  $("#dcMonthRange").textContent = new Date(today + "T00:00:00").toLocaleDateString("es-VE", { month: "long", year: "numeric" });

  $("#dcDailyMax").textContent = L.diario;
  $("#dcWeeklyMax").textContent = L.semanal;
  $("#dcMonthlyMax").textContent = L.mensual;

  updateDashCard("Daily", t.diario, L.diario);
  updateDashCard("Weekly", t.semanal, L.semanal);
  updateDashCard("Monthly", t.mensual, L.mensual);
}

function updateDashCard(scope, value, limit) {
  const num = $("#dc" + scope);
  const fill = $("#dc" + scope + "Fill");
  const foot = $("#dc" + scope + "Foot");
  const card = num.closest(".dash-card");
  const st = statusFor(value, limit);

  num.textContent = value.toFixed(2).replace(/\.?0+$/, "");
  const pct = limit > 0 ? Math.min(100, (value / limit) * 100) : 0;
  fill.style.width = pct + "%";

  card.dataset.state = st;

  if (limit <= 0) {
    foot.textContent = "Sin límite configurado";
    return;
  }

  if (value > limit) {
    const excess = value - limit;
    foot.textContent = `Excedido por ${excess.toFixed(2).replace(/\.?0+$/, "")} UC`;
  } else {
    const rest = limit - value;
    foot.textContent = `Quedan ${rest.toFixed(2).replace(/\.?0+$/, "")} UC`;
  }
}

/* ============================================================
   RENDER FILTROS
   ============================================================ */
function renderFilters() {
  const el = $("#catFilters");
  const cats = ["all", ...CATEGORIAS_ITEM];
  el.innerHTML = cats.map(c => {
    const count = c === "all"
      ? state.items.length
      : state.items.filter(i => tipoById(i.tipo).cat === c).length;
    return `<button class="filter-chip ${state.filterCat === c ? "active" : ""}" data-cat="${c}">
      ${c === "all" ? "Todas" : c} <span class="count">${count}</span>
    </button>`;
  }).join("");

  $$("[data-cat]").forEach(b => b.addEventListener("click", () => {
    state.filterCat = b.dataset.cat;
    renderFilters();
    renderList();
  }));
}

/* ============================================================
   RENDER LISTA
   ============================================================ */
function renderList() {
  const list = $("#itemsList");
  const empty = $("#itemsEmpty");

  let filtered = state.items;
  if (state.filterCat !== "all") {
    filtered = filtered.filter(i => tipoById(i.tipo).cat === state.filterCat);
  }
  if (state.search) {
    const q = state.search.toLowerCase();
    filtered = filtered.filter(i =>
      (i.titulo || "").toLowerCase().includes(q) ||
      (i.cliente || "").toLowerCase().includes(q) ||
      (i.nota || "").toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    list.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  // Agrupar por fecha
  const groups = {};
  filtered.forEach(it => {
    (groups[it.fecha] = groups[it.fecha] || []).push(it);
  });

  const days = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  list.innerHTML = days.map(day => {
    const dayItems = groups[day];
    const daySum = sumUC(dayItems);
    const limit = state.settings.limites.diario;
    const st = statusFor(daySum, limit);

    return `
      <div class="day-group">
        <div class="day-head">
          <span class="dh-label">${escapeHTML(fmtDateLabel(day))}</span>
          <span class="dh-date">${escapeHTML(day)}</span>
          <span class="dh-sum ${st}">${daySum.toFixed(2).replace(/\.?0+$/, "")} / ${limit} UC</span>
        </div>
        ${dayItems.map(it => itemRowHTML(it)).join("")}
      </div>
    `;
  }).join("");

  bindItemRows();
}

function itemRowHTML(it) {
  const tipo = tipoById(it.tipo);
  const peso = Number(it.peso) || 0;
  const cant = Number(it.cantidad) || 1;
  const ucTotal = peso * cant;
  const isFuera = it.tipo === "fuera";

  let titleHTML;
  if (it.link) {
    titleHTML = `<a href="${escapeHTML(it.link)}" target="_blank" rel="noopener">${escapeHTML(it.titulo || "Sin título")}</a>`;
  } else {
    titleHTML = escapeHTML(it.titulo || "Sin título");
  }

  const meta = [];
  if (it.cliente) meta.push(escapeHTML(it.cliente));
  if (cant > 1) meta.push(`${cant} × ${peso} UC`);

  return `
    <div class="item-row" data-cat="${escapeHTML(tipo.cat)}" data-id="${escapeHTML(it.id)}">
      <span class="ir-dot"></span>
      <div class="ir-body">
        <div class="ir-title">${titleHTML}</div>
        <div class="ir-meta">
          <span class="ir-tipo">${escapeHTML(tipo.label)}</span>
          ${meta.length ? `<span>${meta.join(" · ")}</span>` : ""}
          ${it.nota ? `<span title="${escapeHTML(it.nota)}">nota</span>` : ""}
        </div>
      </div>
      <div class="ir-uc">
        ${isFuera ? "fuera" : ucTotal.toFixed(2).replace(/\.?0+$/, "") + ' <small>UC</small>'}
      </div>
      <div class="ir-actions">
        <button class="edit" data-edit="${escapeHTML(it.id)}" title="Editar">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="danger" data-del="${escapeHTML(it.id)}" title="Eliminar">
          <svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  `;
}

function bindItemRows() {
  $$("[data-edit]").forEach(b => b.addEventListener("click", () => openItemModal(b.dataset.edit)));
  $$("[data-del]").forEach(b => b.addEventListener("click", () => {
    const it = state.items.find(x => x.id === b.dataset.del);
    if (!it) return;
    openConfirm("Eliminar ítem", `Se eliminará "${it.titulo || "Sin título"}".`, "Eliminar", async () => {
      await deleteItem(it.id);
      renderAll();
      toast("Ítem eliminado", "", "info");
    });
  }));
}

/* ============================================================
   MODAL ITEM
   ============================================================ */
function openItemModal(id) {
  state.editingId = id || null;
  const it = id ? state.items.find(x => x.id === id) : null;

  $("#itemModalTitle").textContent = it ? "Editar ítem" : "Registrar ítem";
  $("#itemDelete").style.display = it ? "" : "none";

  renderTipoGrid(it ? it.tipo : "post");
  $("#itemTitulo").value = it ? it.titulo : "";
  $("#itemCliente").value = it ? (it.cliente || "") : "";
  $("#itemLink").value = it ? (it.link || "") : "";
  $("#itemNota").value = it ? (it.nota || "") : "";
  $("#itemFecha").value = it ? it.fecha : todayISO();
  $("#itemCantidad").value = it ? (it.cantidad || 1) : 1;

  renderClientesDatalist();
  updateItemPreview();
  $("#itemModal").classList.add("on");
  setTimeout(() => $("#itemTitulo").focus(), 60);
}

function renderTipoGrid(selected) {
  const cats = CATEGORIAS_ITEM;
  let html = "";
  cats.forEach(cat => {
    const tipos = TIPOS_ITEM.filter(t => t.cat === cat);
    if (tipos.length === 0) return;
    html += `<div class="tipo-cat-label" style="grid-column:1/-1;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--text-subtle);padding:6px 2px 2px">${escapeHTML(cat)}</div>`;
    html += tipos.map(t => {
      const peso = pesoDe(t.id);
      return `
        <button class="tipo-opt ${selected === t.id ? "active" : ""}" data-tipo="${t.id}">
          <span class="to-label">${escapeHTML(t.label)}</span>
          <span class="to-uc">${peso} UC</span>
        </button>
      `;
    }).join("");
  });
  $("#tipoGrid").innerHTML = html;

  $$("[data-tipo]").forEach(b => b.addEventListener("click", () => {
    $$("[data-tipo]").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    updateItemPreview();
  }));
}

function renderClientesDatalist() {
  const clientes = [...new Set(state.items.map(i => i.cliente).filter(Boolean))].sort();
  $("#clientesList").innerHTML = clientes.map(c => `<option value="${escapeHTML(c)}"></option>`).join("");
}

function getSelectedTipo() {
  const btn = $(".tipo-opt.active");
  return btn ? btn.dataset.tipo : "post";
}

function updateItemPreview() {
  const tipoId = getSelectedTipo();
  const peso = pesoDe(tipoId);
  const cant = Math.max(1, parseInt($("#itemCantidad").value) || 1);
  const total = peso * cant;
  const isFuera = tipoId === "fuera";
  $("#itemPreviewValue").textContent = isFuera ? "No cuenta para cuota" : `${total.toFixed(2).replace(/\.?0+$/, "")} UC`;
}

async function saveCurrentItem() {
  const titulo = $("#itemTitulo").value.trim();
  if (!titulo) { toast("Nombre requerido", "Escribe un nombre para el trabajo.", "danger"); return; }

  const tipoId = getSelectedTipo();
  const peso = pesoDe(tipoId);
  const cantidad = Math.max(1, parseInt($("#itemCantidad").value) || 1);

  const item = {
    id: state.editingId || newId(),
    tipo: tipoId,
    titulo,
    cliente: $("#itemCliente").value.trim(),
    link: $("#itemLink").value.trim(),
    nota: $("#itemNota").value.trim(),
    fecha: $("#itemFecha").value || todayISO(),
    cantidad,
    peso,
    createdAt: (state.editingId && state.items.find(x => x.id === state.editingId)?.createdAt) || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveItem(item);
  $("#itemModal").classList.remove("on");
  renderAll();
  toast(state.editingId ? "Ítem actualizado" : "Ítem registrado", titulo, "success");
  state.editingId = null;
}

/* ============================================================
   MODAL AJUSTES
   ============================================================ */
function openAjustes() {
  $("#limDiario").value = state.settings.limites.diario;
  $("#limSemanal").value = state.settings.limites.semanal;
  $("#limMensual").value = state.settings.limites.mensual;
  renderDiasRow();
  renderPesosList();
  $("#ajustesModal").classList.add("on");
}

function renderDiasRow() {
  const dias = ["D", "L", "M", "M", "J", "V", "S"];
  $("#diasRow").innerHTML = dias.map((d, i) => `
    <button class="dia-pick ${state.settings.diasLaborables.includes(i) ? "active" : ""}" data-dia="${i}">
      ${d}
    </button>
  `).join("");
  $$("[data-dia]").forEach(b => b.addEventListener("click", () => {
    const i = +b.dataset.dia;
    const set = new Set(state.settings.diasLaborables);
    if (set.has(i)) set.delete(i); else set.add(i);
    state.settings.diasLaborables = [...set].sort();
    renderDiasRow();
  }));
}

function renderPesosList() {
  $("#pesosList").innerHTML = TIPOS_ITEM.map(t => `
    <div class="peso-row">
      <span class="pr-name">${escapeHTML(t.label)}</span>
      <span class="pr-cat">${escapeHTML(t.cat)}</span>
      <input type="number" step="0.25" min="0" data-peso="${t.id}" value="${pesoDe(t.id)}" />
    </div>
  `).join("");
}

function saveAjustes() {
  state.settings.limites = {
    diario: Math.max(0, parseFloat($("#limDiario").value) || 0),
    semanal: Math.max(0, parseFloat($("#limSemanal").value) || 0),
    mensual: Math.max(0, parseFloat($("#limMensual").value) || 0),
  };
  $$("[data-peso]").forEach(inp => {
    const v = Math.max(0, parseFloat(inp.value) || 0);
    state.settings.pesos[inp.dataset.peso] = v;
  });
  saveSettings();
  $("#ajustesModal").classList.remove("on");
  renderAll();
  toast("Ajustes guardados", "", "success");
}

/* ============================================================
   TOAST / CONFIRM
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
  }, 3200);
}

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
   EXPORT / IMPORT
   ============================================================ */
function exportData() {
  const payload = {
    exportedAt: new Date().toISOString(),
    settings: state.settings,
    items: state.items,
  };
  exportJSON(payload, "produccion-" + todayISO());
  toast("Exportado", state.items.length + " ítems", "success");
}

function importData() {
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
        if (data.settings) {
          state.settings = {
            limites: { ...LIMITES_DEFAULT, ...(data.settings.limites || {}) },
            pesos: { ...pesosDefault(), ...(data.settings.pesos || {}) },
            diasLaborables: Array.isArray(data.settings.diasLaborables) ? data.settings.diasLaborables : [...DIAS_LABORABLES_DEFAULT],
          };
          await saveSettings();
        }
        if (Array.isArray(data.items)) {
          for (const it of data.items) {
            if (!it.id) it.id = newId();
            await saveItem(it);
          }
        }
        renderAll();
        toast("Importado", (data.items || []).length + " ítems", "success");
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
  renderDashboard();
  renderFilters();
  renderList();
}

/* ============================================================
   EVENTOS
   ============================================================ */
$("#btnRegistrar").addEventListener("click", () => openItemModal(null));
$("#itemSave").addEventListener("click", saveCurrentItem);
$("#itemDelete").addEventListener("click", () => {
  if (!state.editingId) return;
  const it = state.items.find(x => x.id === state.editingId);
  if (!it) return;
  openConfirm("Eliminar ítem", `Se eliminará "${it.titulo}".`, "Eliminar", async () => {
    await deleteItem(it.id);
    $("#itemModal").classList.remove("on");
    state.editingId = null;
    renderAll();
    toast("Ítem eliminado", "", "info");
  });
});

$("#itemCantidad").addEventListener("input", updateItemPreview);
$("#itemTitulo").addEventListener("keydown", e => {
  if (e.key === "Enter") { e.preventDefault(); saveCurrentItem(); }
});

$("#btnAjustes").addEventListener("click", openAjustes);
$("#ajustesSave").addEventListener("click", saveAjustes);
$("#btnResetPesos").addEventListener("click", () => {
  state.settings.pesos = pesosDefault();
  renderPesosList();
  toast("Pesos restaurados", "", "info");
});
$("#btnResetLimites").addEventListener("click", () => {
  state.settings.limites = { ...LIMITES_DEFAULT };
  $("#limDiario").value = LIMITES_DEFAULT.diario;
  $("#limSemanal").value = LIMITES_DEFAULT.semanal;
  $("#limMensual").value = LIMITES_DEFAULT.mensual;
  toast("Límites restaurados", "", "info");
});

$("#btnExportar").addEventListener("click", exportData);
$("#btnImportar").addEventListener("click", importData);

$("#searchInput").addEventListener("input", debounce(e => {
  state.search = e.target.value;
  renderList();
}, 120));

$("#confirmOk").addEventListener("click", () => {
  if (typeof confirmCb === "function") confirmCb();
  closeConfirm();
});
$$("[data-close]").forEach(n => n.addEventListener("click", () => {
  n.closest(".modal").classList.remove("on");
  if (n.closest("#itemModal")) state.editingId = null;
}));

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    if ($("#itemModal").classList.contains("on")) state.editingId = null;
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
    await loadSettings();
    await loadItems();
    renderAll();
  } catch (e) {
    console.warn("[produccion] init falló:", e);
    renderAll();
  } finally {
    if (overlay) {
      overlay.classList.add("hidden");
      setTimeout(() => overlay.remove(), 260);
    }
  }
})();