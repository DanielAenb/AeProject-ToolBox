/* ============================================================
   Ae Project .studio — Utilidades compartidas
   assets/utils.js
   ============================================================ */

/* Selectores cortos: $('.btn') y $$('.card') */
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* Escapa <, >, &, ", ' para inyectar texto del usuario sin romper el HTML */
function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* LocalStorage con JSON automático. Evita try/catch repetido en cada tool */
const store = {
  get(key, fallback = null) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
  remove(key) { try { localStorage.removeItem(key); } catch {} }
};

/* Fecha de hoy en formato YYYY-MM-DD (ideal para <input type="date">) */
const today = () => new Date().toISOString().slice(0, 10);

/* Convierte "2026-03-18" → "18 mar 2026". Para mostrar en documentos */
function formatDate(iso, locale = 'es-VE') {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

/* Formatea números como dinero. fmt(330) → "$330.00" */
function fmt(value, symbol = '$') {
  const n = Number(value) || 0;
  return symbol + n.toFixed(2);
}

/* Descarga un objeto como archivo .json */
function exportJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.json') ? filename : filename + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* Abre el selector de archivos y pasa el JSON parseado al callback */
function importJSON(onLoad) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { onLoad(JSON.parse(reader.result)); }
      catch { alert('Archivo inválido.'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

/* Retrasa la ejecución N ms. Útil en inputs que guardan al escribir */
function debounce(fn, ms = 200) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
