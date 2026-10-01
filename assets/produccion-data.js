/* ============================================================
   PRODUCCIÓN · Datos estáticos
   assets/produccion-data.js
   ============================================================ */

const TIPOS_ITEM = [
  // Diseño
  { id: "post",        cat: "Diseño", label: "Post estático",       uc: 1,    icono: "square" },
  { id: "historia",    cat: "Diseño", label: "Historia estática",   uc: 1,    icono: "circle" },
  { id: "adaptacion",  cat: "Diseño", label: "Adaptación",          uc: 0.5,  icono: "copy" },
  { id: "carrusel_b",  cat: "Diseño", label: "Carrusel básico (≤5)",uc: 1.5,  icono: "layers" },
  { id: "carrusel_e",  cat: "Diseño", label: "Carrusel extendido",  uc: 2,    icono: "layers" },
  { id: "impresion",   cat: "Diseño", label: "Impresión",           uc: 2,    icono: "file" },
  // Video
  { id: "reel_b",      cat: "Video",  label: "Reel básico",         uc: 2.5,  icono: "video" },
  { id: "reel_pro",    cat: "Video",  label: "Reel Pro",            uc: 4,    icono: "video" },
  { id: "reel_prem",   cat: "Video",  label: "Reel premium / motion", uc: 6,  icono: "video" },
  // Correcciones
  { id: "fix_light",   cat: "Corrección", label: "Corrección leve",  uc: 0.25, icono: "check" },
  { id: "fix_med",     cat: "Corrección", label: "Corrección media", uc: 0.5,  icono: "check" },
  // Fuera de alcance
  { id: "fuera",       cat: "Fuera de cuota", label: "Trabajo fuera de cuota", uc: 0, icono: "alert" },
];

const LIMITES_DEFAULT = {
  diario: 5,
  semanal: 25,
  mensual: 100,
};

// Pesos editables (arrancan con TIPOS_ITEM pero se pueden sobreescribir)
function pesosDefault() {
  const p = {};
  TIPOS_ITEM.forEach(t => { p[t.id] = t.uc; });
  return p;
}

// Días laborables: 0 = domingo, 1 = lunes, ..., 6 = sábado
const DIAS_LABORABLES_DEFAULT = [1, 2, 3, 4, 5];

const CATEGORIAS_ITEM = ["Diseño", "Video", "Corrección", "Fuera de cuota"];