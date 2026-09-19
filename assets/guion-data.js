/* ============================================================
   GUION · DATOS ESTÁTICOS
   assets/guion-data.js

   Este archivo contiene los datos que editas tú:
   - PLANTILLAS: estructuras de guion
   - SHOTS: biblioteca de tomas
   - TRANSICIONES: catálogo de transiciones
   - HOOKS_DEFAULT: hooks de fábrica
   - MARCADORES: etapas del relato
   - DURACIONES: objetivos de duración
   - CATEGORIAS_HOOKS: categorías de hooks
   ============================================================ */

const PLANTILLAS = [
  {
    id: "tutorial",
    nombre: "Tutorial",
    desc: "Enseñar algo paso a paso",
    secciones: [
      { id: "hook",     label: "Hook",     hint: "3 segundos. Genera curiosidad o promete algo.", weight: 0.10 },
      { id: "contexto", label: "Contexto", hint: "Por qué importa o para quién es.",               weight: 0.15 },
      { id: "pasos",    label: "Pasos",    hint: "El contenido, en pasos claros y ordenados.",      weight: 0.55 },
      { id: "cierre",   label: "Cierre",   hint: "Recapitula o refuerza la idea principal.",        weight: 0.10 },
      { id: "cta",      label: "CTA",      hint: "Qué quieres que haga el espectador.",             weight: 0.10 },
    ],
  },
  {
    id: "storytelling",
    nombre: "Storytelling",
    desc: "Contar una historia personal",
    secciones: [
      { id: "hook",       label: "Hook",       hint: "Abre una escena o frase que intrigue.",       weight: 0.10 },
      { id: "contexto",   label: "Contexto",   hint: "Dónde, cuándo, quién.",                        weight: 0.15 },
      { id: "conflicto",  label: "Conflicto",  hint: "El problema o la tensión.",                    weight: 0.30 },
      { id: "resolucion", label: "Resolución", hint: "Cómo se resolvió o qué aprendiste.",           weight: 0.30 },
      { id: "cta",        label: "CTA",        hint: "Conecta con el espectador.",                   weight: 0.15 },
    ],
  },
  {
    id: "venta",
    nombre: "Venta",
    desc: "Presentar un producto o servicio",
    secciones: [
      { id: "hook",     label: "Hook",     hint: "Captura con el dolor o el deseo.",            weight: 0.10 },
      { id: "dolor",    label: "Dolor",    hint: "El problema del cliente, en sus palabras.",   weight: 0.20 },
      { id: "solucion", label: "Solución", hint: "Cómo tu producto o servicio lo resuelve.",    weight: 0.35 },
      { id: "prueba",   label: "Prueba",   hint: "Un dato, un testimonio, un resultado.",       weight: 0.20 },
      { id: "cta",      label: "CTA",      hint: "Acción concreta. Una sola.",                  weight: 0.15 },
    ],
  },
  {
    id: "bts",
    nombre: "Behind the scenes",
    desc: "Mostrar el detrás de cámaras",
    secciones: [
      { id: "hook",     label: "Hook",     hint: "Algo que sorprenda del proceso.", weight: 0.10 },
      { id: "contexto", label: "Contexto", hint: "Qué se está haciendo.",            weight: 0.20 },
      { id: "proceso",  label: "Proceso",  hint: "El detrás de cámaras, sin filtros.", weight: 0.50 },
      { id: "cta",      label: "CTA",      hint: "Invita a seguir o comentar.",       weight: 0.20 },
    ],
  },
  {
    id: "listicle",
    nombre: "Lista",
    desc: "Puntos rápidos sobre un tema",
    secciones: [
      { id: "hook",   label: "Hook",    hint: "Promete una lista con valor claro.", weight: 0.10 },
      { id: "punto1", label: "Punto 1", hint: "El más fuerte o el más obvio.",      weight: 0.20 },
      { id: "punto2", label: "Punto 2", hint: "Sube la intensidad.",                weight: 0.20 },
      { id: "punto3", label: "Punto 3", hint: "El que más sorprende.",               weight: 0.20 },
      { id: "punto4", label: "Punto 4", hint: "Cierre conceptual.",                  weight: 0.20 },
      { id: "cta",    label: "CTA",     hint: "Siguiente paso.",                     weight: 0.10 },
    ],
  },
];

const MARCADORES = [
  { id: "hook",       label: "Hook" },
  { id: "contexto",   label: "Contexto" },
  { id: "desarrollo", label: "Desarrollo" },
  { id: "cta",        label: "CTA" },
  { id: "cierre",     label: "Cierre" },
];

const DURACIONES = [
  { s: 15,  label: "15s" },
  { s: 30,  label: "30s" },
  { s: 45,  label: "45s" },
  { s: 60,  label: "60s" },
  { s: 90,  label: "90s" },
  { s: 120, label: "2m"  },
];

const CATEGORIAS_HOOKS = [
  { id: "curiosidad",   label: "Curiosidad" },
  { id: "controversia", label: "Controversia" },
  { id: "historia",     label: "Historia personal" },
  { id: "dato",         label: "Dato sorprendente" },
  { id: "error",        label: "Error común" },
  { id: "pregunta",     label: "Pregunta directa" },
  { id: "promesa",      label: "Promesa" },
  { id: "urgencia",     label: "Urgencia" },
  { id: "revelacion",   label: "Nadie te dice esto" },
  { id: "autoridad",    label: "Autoridad" },
];

/* Ritmo de habla para estimar duración: 150 palabras por minuto */
const PALABRAS_POR_SEGUNDO = 2.5;

/* ============================================================
   BIBLIOTECA DE TOMAS

   📹 El campo "video" acepta:
   - "" → placeholder
   - "clips/cenital.mp4" → archivo local
   - "https://www.youtube.com/embed/ID" → YouTube
   ============================================================ */
const SHOTS = [
  { id:"general",     cat:"Encuadre",   nombre:"Plano general",     descripcion:"Contexto completo de la escena.",              cuando_usar:"Presentar el lugar y la situación.",                  video:"", duracion:4,  tags:["contexto"] },
  { id:"medio",       cat:"Encuadre",   nombre:"Plano medio",       descripcion:"De cintura hacia arriba.",                    cuando_usar:"Diálogo, presentación, talking head.",                video:"", duracion:4,  tags:["persona"] },
  { id:"primer-plano",cat:"Encuadre",   nombre:"Primer plano",      descripcion:"Rostro o detalle de persona.",                cuando_usar:"Emoción, énfasis, reacción.",                         video:"", duracion:3,  tags:["persona","emoción"] },
  { id:"detalle",     cat:"Encuadre",   nombre:"Plano detalle",     descripcion:"Objeto o parte muy concreta.",                cuando_usar:"Insertos, texturas, manos, producto.",                video:"", duracion:3,  tags:["inserto"] },

  { id:"cenital",     cat:"Ángulo",     nombre:"Cenital",           descripcion:"Cámara arriba mirando hacia abajo.",           cuando_usar:"Mesas, patrones, mapas, comida, flat lay.",           video:"", duracion:4,  tags:["aéreo"] },
  { id:"contrapicado",cat:"Ángulo",     nombre:"Contrapicado",      descripcion:"Cámara abajo mirando hacia arriba.",           cuando_usar:"Dar poder, dramatismo o altura.",                     video:"", duracion:4,  tags:["drama"] },
  { id:"pov",         cat:"Ángulo",     nombre:"POV",               descripcion:"Vista en primera persona.",                   cuando_usar:"Inmersión, tutoriales, videojuegos.",                 video:"", duracion:4,  tags:["inmersivo"] },
  { id:"ots",         cat:"Ángulo",     nombre:"Over the shoulder", descripcion:"Sobre el hombro de alguien.",                 cuando_usar:"Conversaciones, pantallas, escritorios.",             video:"", duracion:4,  tags:["conversación"] },

  { id:"zoom-in",     cat:"Movimiento", nombre:"Zoom in",           descripcion:"Acercarse al sujeto.",                        cuando_usar:"Dirigir atención a un detalle.",                      video:"", duracion:4,  tags:["zoom"] },
  { id:"zoom-out",    cat:"Movimiento", nombre:"Zoom out",          descripcion:"Alejarse del sujeto.",                        cuando_usar:"Revelar contexto, cerrar una idea.",                  video:"", duracion:5,  tags:["zoom"] },
  { id:"paneo",       cat:"Movimiento", nombre:"Paneo",             descripcion:"Giro horizontal de la cámara.",               cuando_usar:"Mostrar un espacio amplio, panorámica.",              video:"", duracion:5,  tags:["horizontal"] },
  { id:"tilt",        cat:"Movimiento", nombre:"Tilt",              descripcion:"Giro vertical de la cámara.",                 cuando_usar:"Revelar altura, edificios, cuerpos.",                 video:"", duracion:4,  tags:["vertical"] },
  { id:"dolly",       cat:"Movimiento", nombre:"Dolly",             descripcion:"Desplazamiento físico de la cámara.",         cuando_usar:"Sensación cinematográfica, entrada de personaje.",    video:"", duracion:6,  tags:["cine"] },
  { id:"tracking",    cat:"Movimiento", nombre:"Tracking",          descripcion:"Cámara sigue a un sujeto en movimiento.",     cuando_usar:"Acción, caminatas, deportes.",                        video:"", duracion:6,  tags:["acción"] },
  { id:"secuencia",   cat:"Movimiento", nombre:"Plano secuencia",   descripcion:"Toma larga sin cortes.",                      cuando_usar:"Momentos inmersivos y continuos.",                    video:"", duracion:12, tags:["largo"] },

  { id:"inserto",     cat:"Recurso",    nombre:"Inserto",           descripcion:"Toma breve que apoya la acción.",             cuando_usar:"Ritmo, transición, detalle entre tomas largas.",      video:"", duracion:2,  tags:["corto"] },
];

/* ============================================================
   TRANSICIONES
   ============================================================ */
const TRANSICIONES = [
  { id:"cut",        label:"Corte",           desc:"Cambio directo sin efecto. El más común.",       icon:'<line x1="12" y1="4" x2="12" y2="20"/><line x1="3" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="21" y2="12"/>', video:"" },
  { id:"fade",       label:"Fundido",         desc:"Aparece desde negro. Ritmo pausado, cierre de escena.", icon:'<rect x="3" y="3" width="18" height="18" rx="2" opacity="0.2"/><rect x="7" y="7" width="10" height="10" rx="1"/>', video:"" },
  { id:"cross",      label:"Cross dissolve",  desc:"Una toma se disuelve en la siguiente. Suave, cinematográfico.", icon:'<circle cx="9" cy="12" r="6" opacity="0.45"/><circle cx="15" cy="12" r="6" opacity="0.45"/>', video:"" },
  { id:"dip-black",  label:"Dip to black",    desc:"Baja a negro y sube. Separa capítulos o bloques.", icon:'<rect x="3" y="3" width="5" height="18"/><rect x="16" y="3" width="5" height="18"/><rect x="10" y="10" width="4" height="4"/>', video:"" },
  { id:"whip",       label:"Whip pan",        desc:"Barrido lateral rápido. Energía, cambio de escena.", icon:'<path d="M3 12h18"/><polyline points="15 8 19 12 15 16"/><polyline points="9 8 5 12 9 16"/>', video:"" },
  { id:"zoom-blur",  label:"Zoom blur",       desc:"Zoom rápido con desenfoque. Impacto musical.", icon:'<circle cx="12" cy="12" r="2.5"/><circle cx="12" cy="12" r="5.5" opacity="0.5"/><circle cx="12" cy="12" r="9" opacity="0.25"/>', video:"" },
  { id:"match",      label:"Match cut",       desc:"Dos tomas comparten forma o movimiento. Elegante, requiere planificación.", icon:'<circle cx="9" cy="12" r="4"/><circle cx="15" cy="12" r="4" opacity="0.5"/>', video:"" },
  { id:"glitch",     label:"Glitch",          desc:"Interferencia digital. Tech, error, drama.", icon:'<path d="M3 8h10"/><path d="M15 8h6"/><path d="M3 12h18"/><path d="M3 16h5"/><path d="M10 16h11"/>', video:"" },
  { id:"slide",      label:"Slide",           desc:"La nueva toma entra deslizándose desde un lado.", icon:'<rect x="3" y="6" width="9" height="12" rx="1"/><path d="M15 12h6"/><polyline points="18 9 21 12 18 15"/>', video:"" },
  { id:"morph",      label:"Morph",           desc:"Una forma se transforma en otra. Muy fluido, requiere trabajo en post.", icon:'<path d="M4 12c0-3.5 3.5-6 8-6s8 2.5 8 6-3.5 6-8 6-8-2.5-8-6z" opacity="0.45"/><circle cx="12" cy="12" r="2.5"/>', video:"" },
  { id:"flash",      label:"Flash",           desc:"Destello blanco. Impacto en un beat.", icon:'<polygon points="12 3 14 10 21 12 14 14 12 21 10 14 3 12 10 10"/>', video:"" },
  { id:"spin",       label:"Spin",            desc:"Rotación rápida. Dinamismo, cambio de nivel o energía.", icon:'<path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/>', video:"" },
];

/* ============================================================
   HOOKS DE FÁBRICA
   ============================================================ */
const HOOKS_DEFAULT = [
  { id:"h001", cat:"curiosidad",   texto:"El 90% de las marcas comete este error con [tema] sin darse cuenta.", fav:false, uses:0 },
  { id:"h002", cat:"curiosidad",   texto:"Nadie habla de esto, pero cambia por completo cómo ves [tema].", fav:false, uses:0 },
  { id:"h003", cat:"curiosidad",   texto:"Estuve [número] meses investigando esto y solo ahora lo entiendo.", fav:false, uses:0 },
  { id:"h004", cat:"curiosidad",   texto:"Esto que voy a decirte sobre [tema] probablemente no lo has escuchado antes.", fav:false, uses:0 },

  { id:"h010", cat:"controversia", texto:"Deja de hacer [tema]. En serio. Te está costando dinero.", fav:false, uses:0 },
  { id:"h011", cat:"controversia", texto:"El consejo más popular sobre [tema] está mal. Y te explico por qué.", fav:false, uses:0 },
  { id:"h012", cat:"controversia", texto:"No necesitas [producto] para crecer. Necesitas dejar de hacer esto.", fav:false, uses:0 },
  { id:"h013", cat:"controversia", texto:"Opinión impopular: [tema] no funciona. Y lo digo con datos.", fav:false, uses:0 },

  { id:"h020", cat:"historia",     texto:"Hace [número] años perdí [cliente]. Hoy sé exactamente por qué pasó.", fav:false, uses:0 },
  { id:"h021", cat:"historia",     texto:"Cuando empecé con [tema] no tenía idea de nada. Esto es lo que hubiera querido saber.", fav:false, uses:0 },
  { id:"h022", cat:"historia",     texto:"El peor consejo que me dieron sobre [tema] me costó [número] meses de trabajo.", fav:false, uses:0 },
  { id:"h023", cat:"historia",     texto:"Un cliente me dijo algo sobre [tema] que cambió cómo trabajo para siempre.", fav:false, uses:0 },

  { id:"h030", cat:"dato",         texto:"[número]% de las marcas pierden clientes por hacer esto. Y es reversible.", fav:false, uses:0 },
  { id:"h031", cat:"dato",         texto:"Hay un estudio sobre [tema] que casi nadie cita, y explica todo.", fav:false, uses:0 },
  { id:"h032", cat:"dato",         texto:"3 de cada 4 personas abandonan [tema] en los primeros [número] segundos. Aquí el motivo.", fav:false, uses:0 },
  { id:"h033", cat:"dato",         texto:"Esto dura [número] segundos y multiplica por 3 la retención de [tema].", fav:false, uses:0 },

  { id:"h040", cat:"error",        texto:"Si haces esto con [tema], estás perdiendo dinero sin darte cuenta.", fav:false, uses:0 },
  { id:"h041", cat:"error",        texto:"Deja de publicar [tema] sin hacer esto primero.", fav:false, uses:0 },
  { id:"h042", cat:"error",        texto:"El error #1 de [cliente] con [producto]: creer que más es mejor.", fav:false, uses:0 },
  { id:"h043", cat:"error",        texto:"Nunca hagas esto si vendes [producto]. Te va a costar más de lo que crees.", fav:false, uses:0 },

  { id:"h050", cat:"pregunta",     texto:"¿Por qué tu [producto] no vende tanto como debería?", fav:false, uses:0 },
  { id:"h051", cat:"pregunta",     texto:"¿Cuánto tiempo pierdes cada semana por no tener esto resuelto?", fav:false, uses:0 },
  { id:"h052", cat:"pregunta",     texto:"¿Sabes cuál es la diferencia entre [tema] que funciona y el que no?", fav:false, uses:0 },
  { id:"h053", cat:"pregunta",     texto:"¿Cuándo fue la última vez que revisaste [tema] en tu negocio?", fav:false, uses:0 },

  { id:"h060", cat:"promesa",      texto:"En [número] segundos vas a saber cómo mejorar [tema] sin gastar más.", fav:false, uses:0 },
  { id:"h061", cat:"promesa",      texto:"Esto te va a ahorrar [número] horas al mes. Garantizado.", fav:false, uses:0 },
  { id:"h062", cat:"promesa",      texto:"Al terminar este video vas a ver [tema] con otros ojos.", fav:false, uses:0 },
  { id:"h063", cat:"promesa",      texto:"Hay una forma de hacer [tema] en la mitad del tiempo. Y no es la que usas.", fav:false, uses:0 },

  { id:"h070", cat:"urgencia",     texto:"Esto que te voy a decir solo funciona hasta [número] de este mes.", fav:false, uses:0 },
  { id:"h071", cat:"urgencia",     texto:"Si no arreglas [tema] esta semana, vas a perder [cliente].", fav:false, uses:0 },
  { id:"h072", cat:"urgencia",     texto:"Llevas meses evitando esto. Hoy lo resolvemos en [número] minutos.", fav:false, uses:0 },

  { id:"h080", cat:"revelacion",   texto:"Nadie te dice esto sobre [tema], y deberían.", fav:false, uses:0 },
  { id:"h081", cat:"revelacion",   texto:"Esto no lo enseña nadie. Y es lo que separa a los que venden de los que no.", fav:false, uses:0 },
  { id:"h082", cat:"revelacion",   texto:"El truco que usan las marcas grandes para [tema] y que no verás en ningún curso.", fav:false, uses:0 },
  { id:"h083", cat:"revelacion",   texto:"Esto no es magia, es [tema] bien hecho. Y casi nadie lo hace.", fav:false, uses:0 },

  { id:"h090", cat:"autoridad",    texto:"Trabajé con [número] marcas en [tema]. Esto es lo que funciona siempre.", fav:false, uses:0 },
  { id:"h091", cat:"autoridad",    texto:"Llevo [número] años haciendo [tema]. Y esto es lo que he aprendido.", fav:false, uses:0 },
  { id:"h092", cat:"autoridad",    texto:"No es opinión: es lo que veo en cada proyecto de [tema] que toco.", fav:false, uses:0 },
];