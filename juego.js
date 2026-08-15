const NOTAS = {
    Do3: { nombre: "Do", alteracion: "", octava: 3, tipo: "blanca", midi: 48 },
    "Do#3": { nombre: "Do", alteracion: "#", octava: 3, tipo: "negra", midi: 49 },
    Re3: { nombre: "Re", alteracion: "", octava: 3, tipo: "blanca", midi: 50 },
    "Re#3": { nombre: "Re", alteracion: "#", octava: 3, tipo: "negra", midi: 51 },
    Mi3: { nombre: "Mi", alteracion: "", octava: 3, tipo: "blanca", midi: 52 },
    Fa3: { nombre: "Fa", alteracion: "", octava: 3, tipo: "blanca", midi: 53 },
    "Fa#3": { nombre: "Fa", alteracion: "#", octava: 3, tipo: "negra", midi: 54 },
    Sol3: { nombre: "Sol", alteracion: "", octava: 3, tipo: "blanca", midi: 55 },
    "Sol#3": { nombre: "Sol", alteracion: "#", octava: 3, tipo: "negra", midi: 56 },
    La3: { nombre: "La", alteracion: "", octava: 3, tipo: "blanca", midi: 57 },
    "La#3": { nombre: "La", alteracion: "#", octava: 3, tipo: "negra", midi: 58 },
    Si3: { nombre: "Si", alteracion: "", octava: 3, tipo: "blanca", midi: 59 },

    Do4: { nombre: "Do", alteracion: "", octava: 4, tipo: "blanca", midi: 60 },
    "Do#4": { nombre: "Do", alteracion: "#", octava: 4, tipo: "negra", midi: 61 },
    Re4: { nombre: "Re", alteracion: "", octava: 4, tipo: "blanca", midi: 62 },
    "Re#4": { nombre: "Re", alteracion: "#", octava: 4, tipo: "negra", midi: 63 },
    Mi4: { nombre: "Mi", alteracion: "", octava: 4, tipo: "blanca", midi: 64 },
    Fa4: { nombre: "Fa", alteracion: "", octava: 4, tipo: "blanca", midi: 65 },
    "Fa#4": { nombre: "Fa", alteracion: "#", octava: 4, tipo: "negra", midi: 66 },
    Sol4: { nombre: "Sol", alteracion: "", octava: 4, tipo: "blanca", midi: 67 },
    "Sol#4": { nombre: "Sol", alteracion: "#", octava: 4, tipo: "negra", midi: 68 },
    La4: { nombre: "La", alteracion: "", octava: 4, tipo: "blanca", midi: 69 },
    "La#4": { nombre: "La", alteracion: "#", octava: 4, tipo: "negra", midi: 70 },
    Si4: { nombre: "Si", alteracion: "", octava: 4, tipo: "blanca", midi: 71 },

    Do5: { nombre: "Do", alteracion: "", octava: 5, tipo: "blanca", midi: 72 },
};

// Frecuencia desde MIDI: f = 440 * 2^((midi - 69) / 12)
function midiAFrecuencia(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

// 🔹 Motor de Audio — Engine de osciladores con envelope ADSR simplificado
class MotorAudio {
    constructor() {
        this.ctx = null;
        this._activas = new Map(); // notaId → { osc, gain }
    }

    _ensureCtx() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    play(notaId) {
        const nota = NOTAS[notaId];
        if (!nota) return;

        const ctx = this._ensureCtx();
        const freq = midiAFrecuencia(nota.midi);

        // Si la misma nota ya está sonando, pararla primero
        this.stop(notaId);

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        // Envelope: attack rápido + decay suave
        const now = ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.01);   // attack 10ms
        gain.gain.exponentialRampToValueAtTime(0.18, now + 0.4); // decay a 400ms

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);

        this._activas.set(notaId, { osc, gain });
    }

    stop(notaId) {
        const activa = this._activas.get(notaId);
        if (!activa) return;

        const ctx = this.ctx;
        const now = ctx.currentTime;

        // Release: fade out en 80ms
        activa.gain.gain.cancelScheduledValues(now);
        activa.gain.gain.setValueAtTime(activa.gain.gain.value, now);
        activa.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        activa.osc.stop(now + 0.09);

        this._activas.delete(notaId);
    }

    stopAll() {
        for (const notaId of this._activas.keys()) {
            this.stop(notaId);
        }
    }
}

// 🔹 Conversión nombre de nota → MIDI → frecuencia
// Ej: "D4" → 62 → 293.66 Hz
function notaAMIDI(nombre) {
    const match = nombre.match(/^([A-G])(#?)(\d)$/);
    if (!match) return null;
    const [, letra, sostenido, octava] = match;
    const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letra];
    return (Number(octava) + 1) * 12 + base + (sostenido ? 1 : 0);
}

function notaAFrecuencia(nombre) {
    const midi = notaAMIDI(nombre);
    if (midi === null) return 0;
    return midiAFrecuencia(midi);
}

// 🔹 Sesiones por canción — define qué notas son visibles
const SESIONES = {
    sanLorenzo_A: {
        titulo: "Marcha de San Lorenzo — Motivo A",
        compases: ["I", "II", "I", "II"],
        cantidadDesafios: 3,
        notasVisibles: ["Si4", "La4", "Sol4", "Fa4", "Mi4", "Re4", "Do4", "Si3", "La3", "Sol3", "Fa3", "Mi3", "Re3", "Do3"],
        notasNegrasVisibles: ["La#4", "Sol#4", "Fa#4", "Do#4", "Re#4", "La#3", "Sol#3", "Fa#3", "Re#3", "Do#3"]
    },
    sanLorenzo_B: {
        titulo: "Marcha de San Lorenzo — Motivo B",
        compases: ["I", "II", "I", "II"],
        cantidadDesafios: 3,
        notasVisibles: ["Si4", "La4", "Sol4", "Fa4", "Mi4", "Re4", "Do4", "Si3", "La3", "Sol3", "Fa3", "Mi3", "Re3", "Do3"],
        notasNegrasVisibles: ["La#4", "Sol#4", "Fa#4", "Do#4", "Re#4", "La#3", "Sol#3", "Fa#3", "Re#3", "Do#3"]
    }
};

// 🔹 Partitura — Marcha de San Lorenzo — Parte A (Motivo A: "Por la patria, por la gloria...")
const MARCHA_SAN_LORENZO_A = {
    titulo: "Marcha de San Lorenzo — Parte A",
    tempo: 110,
    notas: [
        // TODO: Reemplazar con las notas reales de la Parte A
        // Placeholder: 4 compases simples en Re mayor
        { nota: "A3", inicio: 0, duracion: 0.75, silencio: false, silaba: "Fe" },
        { nota: "G3", inicio: 0.75, duracion: 0.25, silencio: false, silaba: "boa" },
        { nota: "F3", inicio: 1, duracion: 2, silencio: false, silaba: "so" },
        { nota: "C3", inicio: 3, duracion: 0.5, silencio: false, silaba: "ma" },
        { nota: null, inicio: 3.5, duracion: 0.5, silencio: true, silaba: "" },
        { nota: "A3", inicio: 4, duracion: 0.75, silencio: false, silaba: "ya" },
        { nota: "G3", inicio: 4.75, duracion: 0.25, silencio: false, silaba: "sus" },
        { nota: "F3", inicio: 5, duracion: 2, silencio: false, silaba: "ra" },
        { nota: "C3", inicio: 7, duracion: 0.5, silencio: false, silaba: "yos" },
        { nota: null, inicio: 7.5, duracion: 0.5, silencio: true, silaba: "" },
        { nota: "A3", inicio: 8, duracion: 0.75, silencio: false, silaba: "I" },
        { nota: "G3", inicio: 8.75, duracion: 0.25, silencio: false, silaba: "lu" },
        { nota: "F3", inicio: 9, duracion: 0.75, silencio: false, silaba: "mi" },
        { nota: "G3", inicio: 9.75, duracion: 0.25, silencio: false, silaba: "nan" },
        { nota: "A3", inicio: 10, duracion: 0.75, silencio: false, silaba: "el" },
        { nota: "A#3", inicio: 10.75, duracion: 0.25, silencio: false, silaba: "his" },
        { nota: "D4", inicio: 11, duracion: 0.75, silencio: false, silaba: "to" },
        { nota: "C4", inicio: 11.75, duracion: 0.25, silencio: false, silaba: "ri" },
        { nota: "A#3", inicio: 12, duracion: 0.75, silencio: false, silaba: "co" },
        { nota: "A3", inicio: 12.75, duracion: 0.25, silencio: false, silaba: "con" },
        
        
        { nota: "G3", inicio: 13, duracion: 2, silencio: false, silaba: "ven" },
        { nota: "D3", inicio: 15, duracion: 0.5, silencio: false, silaba: "to" },
        { nota: null, inicio: 15.5, duracion: 0.5, silencio: true, silaba: "" },
        { nota: "A#3", inicio: 16, duracion: 0.75, silencio: false, silaba: "sor" },
        { nota: "A3", inicio: 16.75, duracion: 0.25, silencio: false, silaba: "do" },
        { nota: "G3", inicio: 17, duracion: 2, silencio: false, silaba: "rui" },
        { nota: "D3", inicio: 19, duracion: 0.5, silencio: false, silaba: "do" },
        { nota: null, inicio: 19.5, duracion: 0.5, silencio: true, silaba: "" },
        { nota: "A#3", inicio: 20, duracion: 0.75, silencio: false, silaba: "tras" },
        { nota: "A3", inicio: 20.75, duracion: 0.25, silencio: false, silaba: "los" },
        { nota: "G3", inicio: 21, duracion: 2, silencio: false, silaba: "mu" },
        { nota: "D3", inicio: 23, duracion: 0.5, silencio: false, silaba: "ros" },
        { nota: null, inicio: 23.5, duracion: 0.5, silencio: true, silaba: "" },
        { nota: "A#3", inicio: 24, duracion: 0.75, silencio: false, silaba: "oir" },
        { nota: "A3", inicio: 24.75, duracion: 0.25, silencio: false, silaba: "se" },
        { nota: "G3", inicio: 25, duracion: 0.75, silencio: false, silaba: "de" },
        { nota: "A3", inicio: 25.75, duracion: 0.25, silencio: false, silaba: "jan" },
        { nota: "A#3", inicio: 26, duracion: 0.75, silencio: false, silaba: "de" },
        { nota: "C4", inicio: 26.75, duracion: 0.25, silencio: false, silaba: "cor" },
        { nota: "E4", inicio: 27, duracion: 0.75, silencio: false, silaba: "ce" },
        { nota: "D4", inicio: 27.75, duracion: 0.25, silencio: false, silaba: "les" },
        { nota: "C4", inicio: 28, duracion: 0.75, silencio: false, silaba: "y" },
        { nota: "A#3", inicio: 28.75, duracion: 0.25, silencio: false, silaba: "dea" },
        { nota: "G#3", inicio: 29, duracion: 2, silencio: false, silaba: "ce" },
        { nota: "A3", inicio: 31, duracion: 0.5, silencio: false, silaba: "ro" },
        { nota: null, inicio: 31.5, duracion: 0.5, silencio: true, silaba: "" },

        { nota: "A3", inicio: 32, duracion: 0.75, silencio: false, silaba: "Son" },
        { nota: "G3", inicio: 32.75, duracion: 0.25, silencio: false, silaba: "las" },
        { nota: "F3", inicio: 33, duracion: 2, silencio: false, silaba: "hues" },
        { nota: "C3", inicio: 35, duracion: 0.5, silencio: false, silaba: "tes" },
        { nota: null, inicio: 35.5, duracion: 0.5, silencio: true, silaba: "" },
        { nota: "A3", inicio: 36, duracion: 0.75, silencio: false, silaba: "que" },
        { nota: "G3", inicio: 36.75, duracion: 0.25, silencio: false, silaba: "pre" },
        { nota: "F3", inicio: 37, duracion: 2, silencio: false, silaba: "pa" },
        { nota: "C3", inicio: 39, duracion: 0.5, silencio: false, silaba: "ra" },
        { nota: null, inicio: 39.5, duracion: 0.5, silencio: true, silaba: "" },
        { nota: "A3", inicio: 40, duracion: 0.75, silencio: false, silaba: "San" },
        { nota: "G3", inicio: 40.75, duracion: 0.25, silencio: false, silaba: "mar" },
        { nota: "F3", inicio: 41, duracion: 0.75, silencio: false, silaba: "tin" },
        { nota: "G3", inicio: 41.75, duracion: 0.25, silencio: false, silaba: "pa" },
        { nota: "A3", inicio: 42, duracion: 0.75, silencio: false, silaba: "ra" },
        { nota: "A#3", inicio: 42.75, duracion: 0.25, silencio: false, silaba: "cru" },
        { nota: "C4", inicio: 43, duracion: 0.74, silencio: false, silaba: "zar" },
        { nota: null, inicio: 43.74, duracion: 0.01, silencio: true, silaba: "" },
        { nota: "C4", inicio: 43.75, duracion: 0.25, silencio: false, silaba: "en" },
        { nota: "F4", inicio: 44, duracion: 0.74, silencio: false, silaba: "San" },
        { nota: null, inicio: 44.74, duracion: 0.01, silencio: true, silaba: "" },
        { nota: "F4", inicio: 44.75, duracion: 0.24, silencio: false, silaba: "Lo" },
        { nota: null, inicio: 44.99, duracion: 0.01, silencio: true, silaba: "" },
        
        { nota: "F4", inicio: 45, duracion: 2, silencio: false, silaba: "ren" },
        { nota: "G3", inicio: 47, duracion: 0.5, silencio: false, silaba: "zo" },
        { nota: null, inicio: 47.5, duracion: 0.5, silencio: true, silaba: "" },
        { nota: "G3", inicio: 48, duracion: 0.74, silencio: false, silaba: "El" },
        { nota: null, inicio: 48.74, duracion: 0.01, silencio: true, silaba: "" },
        { nota: "G3", inicio: 48.75, duracion: 0.25, silencio: false, silaba: "cla" },
        { nota: "E4", inicio: 49, duracion: 2.33, silencio: false, silaba: "rín" },
        { nota: "D4", inicio: 51.33, duracion: 0.32, silencio: false, silaba: "es" },
        { nota: null, inicio: 51.65, duracion: 0.01, silencio: true, silaba: "" },
        { nota: "D4", inicio: 51.66, duracion: 0.33, silencio: false, silaba: "tri" },
        { nota: null, inicio: 51.99, duracion: 0.01, silencio: true, silaba: "" },
        { nota: "D4", inicio: 52, duracion: 0.33, silencio: false, silaba: "den" },
        { nota: "C4", inicio: 52.33, duracion: 0.32, silencio: false, silaba: "te" },
        { nota: null, inicio: 52.65, duracion: 0.01, silencio: true, silaba: "" },
        { nota: "C4", inicio: 52.66, duracion: 0.33, silencio: false, silaba: "so" },
        { nota: null, inicio: 52.99, duracion: 0.01, silencio: true, silaba: "" },
        { nota: "C4", inicio: 53, duracion: 2, silencio: false, silaba: "nó" },
        { nota: null, inicio: 55, duracion: 0.33, silencio: true, silaba: "" },
        { nota: "A3", inicio: 55.33, duracion: 0.32, silencio: false, silaba: "Y-a" },
        { nota: null, inicio: 55.65, duracion: 0.01, silencio: true, silaba: "" },
        { nota: "A3", inicio: 55.66, duracion: 0.33, silencio: false, silaba: "la" },
        { nota: null, inicio: 55.99, duracion: 0.01, silencio: true, silaba: "" },
        { nota: "A3", inicio: 56, duracion: 0.33, silencio: false, silaba: "voz" },
        { nota: "G3", inicio: 56.33, duracion: 0.33, silencio: false, silaba: "deun" },
        { nota: "F3", inicio: 56.66, duracion: 0.34, silencio: false, silaba: "gran" },
        { nota: "D3", inicio: 57, duracion: 0.66, silencio: false, silaba: "je" },
        { nota: "C4", inicio: 57.66, duracion: 1.34, silencio: false, silaba: "fe" },
        { nota: null, inicio: 59, duracion: 0.33, silencio: true, silaba: "" },
        { nota: "C4", inicio: 59.33, duracion: 0.33, silencio: false, silaba: "a" },
        { nota: "D4", inicio: 59.66, duracion: 0.34, silencio: false, silaba: "la" },
        { nota: "A3", inicio: 60, duracion: 0.33, silencio: false, silaba: "car" },
        { nota: "G3", inicio: 60.33, duracion: 0.33, silencio: false, silaba: "gaor" },
        { nota: "F3", inicio: 60.66, duracion: 0.33, silencio: false, silaba: "de" },
        { nota: null, inicio: 60.99, duracion: 0.01, silencio: true, silaba: "" },
{ nota: "F3", inicio: 61, duracion: 0.5, silencio: false, silaba: "nó" },

    
],
    percusion: (() => {
        const eventos = [];
        // La melodía dura ~62 beats → 16 ciclos de 4 beats (0-63)
        // La percusión empieza en beat 1 ("so", primer tiempo fuerte), no en beat 0 ("Fe", anacrusa)
        for (let i = 0; i < 16; i++) {
            const base = i * 4;
            eventos.push(
                { inicio: base + 1, zona: "grave", duracion: 1 },
                { inicio: base + 2, zona: "agudo", duracion: 1 },
                { inicio: base + 3, zona: "grave", duracion: 0.75 },
                { inicio: base + 3.75, zona: "grave", duracion: 0.25 },
                { inicio: base + 4, zona: "agudo", duracion: 1 },
            );
        }
        return eventos;
    })()
};

// 🔹 Partitura — Marcha de San Lorenzo (hasta "su rojo pabellón") — Parte B
const MARCHA_SAN_LORENZO = {
    titulo: "Marcha de San Lorenzo",
    tempo: 110,
    notas: [
        // ── Frase 1: "A van zael-e ne mi go a" ──
        { nota: "D4", inicio: 0, duracion: 1, silencio: false, silaba: "A" },
        { nota: "C4", inicio: 1, duracion: 2.75, silencio: false, silaba: "van" },
        { nota: "A#3", inicio: 3.75, duracion: 0.25, silencio: false, silaba: "zael" },
        { nota: "A3", inicio: 4, duracion: 0.75, silencio: false, silaba: "e" },
        { nota: "G3", inicio: 4.75, duracion: 0.25, silencio: false, silaba: "ne" },
        { nota: "A3", inicio: 5, duracion: 1.9, silencio: false, silaba: "mi" },
        { nota: null, inicio: 6.9, duracion: 0.1, silencio: true, silaba: "" },
        { nota: "A3", inicio: 7, duracion: 0.5, silencio: false, silaba: "go" },
        { nota: "A#3", inicio: 8, duracion: 1, silencio: false, silaba: "a" },

        // ── Frase 2: " pa so re do bla" ──
        { nota: "A3", inicio: 9, duracion: 2.75, silencio: false, silaba: "pa" },
        { nota: "G3", inicio: 11.75, duracion: 0.25, silencio: false, silaba: "so" },
        { nota: "F3", inicio: 12, duracion: 0.75, silencio: false, silaba: "re" },
        { nota: "E3", inicio: 12.75, duracion: 0.25, silencio: false, silaba: "do" },
        { nota: "F3", inicio: 13, duracion: 1.9, silencio: false, silaba: "bla" },

        // ── Frase 3: "do y al vien-to des-pl e-ga" ──
        { nota: null, inicio: 14.9, duracion: 0.1, silencio: true, silaba: "" },
        { nota: "F3", inicio: 15, duracion: 0.5, silencio: false, silaba: "do" },
        { nota: null, inicio: 15.5, duracion: 0.5, silencio: true, silaba: "" },
        { nota: "D3", inicio: 16, duracion: 1, silencio: false, silaba: "yal" },
        { nota: "D4", inicio: 17, duracion: 2.75, silencio: false, silaba: "vien" },
        { nota: "E4", inicio: 19.75, duracion: 0.25, silencio: false, silaba: "to" },
        { nota: "D4", inicio: 20, duracion: 0.75, silencio: false, silaba: "des" },
        { nota: "E4", inicio: 20.75, duracion: 0.25, silencio: false, silaba: "ple" },
        { nota: "D4", inicio: 21, duracion: 2, silencio: false, silaba: "ga" },

        // ── Frase 4: "do su ro-jo pa-be-llón" ──        
        { nota: "C4", inicio: 23, duracion: 0.5, silencio: false, silaba: "do" },
        { nota: null, inicio: 23.5, duracion: 0.5, silencio: true, silaba: "" },
        { nota: "C4", inicio: 24, duracion: 1, silencio: false, silaba: "su" },
        { nota: "A#3", inicio: 25, duracion: 2.75, silencio: false, silaba: "ro" },
        { nota: "A3", inicio: 27.75, duracion: 0.25, silencio: false, silaba: "jo" },
        { nota: "A#3", inicio: 28, duracion: 0.75, silencio: false, silaba: "pa" },
        { nota: "C4", inicio: 28.75, duracion: 0.25, silencio: false, silaba: "be" },
        { nota: "A#3", inicio: 29, duracion: 2, silencio: false, silaba: "lló" },
        { nota: "A3", inicio: 31, duracion: 0.5, silencio: false, silaba: "ón" },

        // ── Frase 5: "y al vien-to des-pl e-ga" ──
        { nota: null, inicio: 31.5, duracion: 0.5, silencio: true, silaba: "" },
        { nota: "A3", inicio: 32, duracion: 1, silencio: false, silaba: "yal" },
        { nota: "G3", inicio: 33, duracion: 1, silencio: false, silaba: "vien" },
        { nota: "D4", inicio: 34, duracion: 1.5, silencio: false, silaba: "to" },
        { nota: "E4", inicio: 35.5, duracion: 0.74, silencio: false, silaba: "des" },
        { nota: null, inicio: 36.24, duracion: 0.01, silencio: true, silaba: "" },
        { nota: "E4", inicio: 36.25, duracion: 0.75, silencio: false, silaba: "ple" },
        { nota: "F4", inicio: 37, duracion: 2, silencio: false, silaba: "ga" },

        // ── Frase 4: "do su ro-jo pa-be-llón" ──        
        { nota: "C4", inicio: 39, duracion: 0.5, silencio: false, silaba: "do" },
        { nota: null, inicio: 39.5, duracion: 0.5, silencio: true, silaba: "" },
        { nota: "D4", inicio: 40, duracion: 1, silencio: false, silaba: "su" },
        { nota: "C4", inicio: 41, duracion: 2.75, silencio: false, silaba: "ro" },
        { nota: "A#3", inicio: 43.75, duracion: 0.25, silencio: false, silaba: "jo" },
        { nota: "A3", inicio: 44, duracion: 0.75, silencio: false, silaba: "pa" },
        { nota: "G3", inicio: 44.75, duracion: 0.25, silencio: false, silaba: "be" },
        { nota: "F3", inicio: 45, duracion: 2, silencio: false, silaba: "llón" },
        { nota: null, inicio: 47, duracion: 1, silencio: true, silaba: "" },

        // ── Frase 1: "Y nues tros gra na de ros - a" ──
        { nota: "D4", inicio: 48, duracion: 1, silencio: false, silaba: "Y" },
        { nota: "C4", inicio: 49, duracion: 2.75, silencio: false, silaba: "nue" },
        { nota: "A#3", inicio: 51.75, duracion: 0.25, silencio: false, silaba: "stros" },
        { nota: "A3", inicio: 52, duracion: 0.75, silencio: false, silaba: "gra" },
        { nota: "G3", inicio: 52.75, duracion: 0.25, silencio: false, silaba: "na" },
        { nota: "A3", inicio: 53, duracion: 1.9, silencio: false, silaba: "de" },
        { nota: null, inicio: 54.9, duracion: 0.1, silencio: true, silaba: "" },
        { nota: "A3", inicio: 55, duracion: 0.5, silencio: false, silaba: "ros" },
        { nota: null, inicio: 55.5, duracion: 0.5, silencio: true, silaba: "" },
        { nota: "A#3", inicio: 56, duracion: 1, silencio: false, silaba: "a" },

        // ── Frase 2: " a lia dos de la glo" ──
        { nota: "A3", inicio: 57, duracion: 2.75, silencio: false, silaba: "lia" },
        { nota: "G3", inicio: 59.75, duracion: 0.25, silencio: false, silaba: "dos" },
        { nota: "F3", inicio: 60, duracion: 0.75, silencio: false, silaba: "de" },
        { nota: "E3", inicio: 60.75, duracion: 0.25, silencio: false, silaba: "la" },
        { nota: "F3", inicio: 61, duracion: 1.9, silencio: false, silaba: "glo" },

        // ── Frase 3: "do y al vien-to des-pl e-ga" ──
        { nota: null, inicio: 62.9, duracion: 0.1, silencio: true, silaba: "" },
        { nota: "F3", inicio: 63, duracion: 0.5, silencio: false, silaba: "ria" },
        { nota: null, inicio: 63.5, duracion: 0.5, silencio: true, silaba: "" },
        { nota: "D3", inicio: 64, duracion: 1, silencio: false, silaba: "ins" },
        { nota: "D4", inicio: 65, duracion: 2.75, silencio: false, silaba: "cri" },
        { nota: "E4", inicio: 67.75, duracion: 0.25, silencio: false, silaba: "ben" },
        { nota: "D4", inicio: 68, duracion: 0.75, silencio: false, silaba: "en" },
        { nota: "E4", inicio: 68.75, duracion: 0.25, silencio: false, silaba: "lahis" },
        { nota: "D4", inicio: 69, duracion: 2, silencio: false, silaba: "to" },

        // ── Frase 4: "do su ro-jo pa-be-llón" ──        
        { nota: "C4", inicio: 71, duracion: 0.5, silencio: false, silaba: "ria" },
        { nota: null, inicio: 71.5, duracion: 0.5, silencio: true, silaba: "" },
        { nota: "C4", inicio: 72, duracion: 1, silencio: false, silaba: "su" },
        { nota: "A#3", inicio: 73, duracion: 2.75, silencio: false, silaba: "pá" },
        { nota: "A3", inicio: 75.75, duracion: 0.25, silencio: false, silaba: "gi" },
        { nota: "A#3", inicio: 76, duracion: 0.75, silencio: false, silaba: "na" },
        { nota: "C4", inicio: 76.75, duracion: 0.25, silencio: false, silaba: "me" },
        { nota: "A#3", inicio: 77, duracion: 2, silencio: false, silaba: "jor" },
        { nota: "A3", inicio: 79, duracion: 0.5, silencio: false, silaba: "or" },

        // ── Frase 5: "y al vien-to des-pl e-ga" ──
        { nota: null, inicio: 79.5, duracion: 0.5, silencio: true, silaba: "" },
        { nota: "A3", inicio: 80, duracion: 1, silencio: false, silaba: "ins" },
        { nota: "G3", inicio: 81, duracion: 1, silencio: false, silaba: "cri" },
        { nota: "D4", inicio: 82, duracion: 1.5, silencio: false, silaba: "ben" },
        { nota: "E4", inicio: 83.5, duracion: 0.74, silencio: false, silaba: "en" },
        { nota: null, inicio: 84.24, duracion: 0.01, silencio: true, silaba: "" },
        { nota: "E4", inicio: 84.25, duracion: 0.75, silencio: false, silaba: "lahis" },
        { nota: "F4", inicio: 85, duracion: 2, silencio: false, silaba: "to" },

        // ── Frase 4: "do su ro-jo pa-be-llón" ──        
        { nota: "C4", inicio: 87, duracion: 0.5, silencio: false, silaba: "ria" },
        { nota: null, inicio: 87.5, duracion: 0.5, silencio: true, silaba: "" },
        { nota: "D4", inicio: 88, duracion: 1, silencio: false, silaba: "su" },
        { nota: "C4", inicio: 89, duracion: 2.75, silencio: false, silaba: "pá" },
        { nota: "A#3", inicio: 91.75, duracion: 0.25, silencio: false, silaba: "gi" },
        { nota: "A3", inicio: 92, duracion: 0.75, silencio: false, silaba: "na" },
        { nota: "G3", inicio: 92.75, duracion: 0.25, silencio: false, silaba: "me" },
        { nota: "F3", inicio: 93, duracion: 2, silencio: false, silaba: "jor" },
        { nota: null, inicio: 95, duracion: 1, silencio: true, silaba: "" },
    ],
    percusion: (() => {
        const eventos = [];
        for (let i = 0; i < 24; i++) {
            const base = 1 + i * 4;
            eventos.push(
                { inicio: base, zona: "grave", duracion: 1 },
                { inicio: base + 1, zona: "agudo", duracion: 1 },
                { inicio: base + 2, zona: "grave", duracion: 0.75 },
                { inicio: base + 2.75, zona: "grave", duracion: 0.25 },
                { inicio: base + 3, zona: "agudo", duracion: 1 },
            );
        }
        return eventos;
    })()
};

// 🔹 Definición de niveles de desafío
const DESAFIO_NIVELES = {
    practica: {
        id: 'practica',
        nombre: 'Práctica de Desafío',
        descripcion: 'Practicá sin presión',
        icono: '🎯',
        tempo: 110,
        countIn: true,
        metronomo: true,
        vueltas: null,
        bloquearControles: false,
        requisito: null,
    },
    pulso: {
        id: 'pulso',
        nombre: 'Pulso',
        descripcion: 'Reconocé el tiempo y mantené un ritmo básico',
        icono: '🥁',
        tempo: 90,
        countIn: true,
        metronomo: true,
        vueltas: 1,
        bloquearControles: true,
        requisito: null,
    },
    coordinacion: {
        id: 'coordinacion',
        nombre: 'Coordinación',
        descripcion: 'Integrá instrumento + lectura visual',
        icono: '🎯',
        tempo: 110,
        countIn: true,
        metronomo: true,
        vueltas: 1,
        bloquearControles: true,
        requisito: { nivel: 'pulso', precisionMinima: 80 },
    },
    precision: {
        id: 'precision',
        nombre: 'Precisión',
        descripcion: 'Exigí exactitud temporal',
        icono: '⚡',
        tempo: 120,
        countIn: true,
        metronomo: true,
        vueltas: 1,
        bloquearControles: true,
        requisito: { nivel: 'coordinacion', precisionMinima: 85 },
    },
    dominio: {
        id: 'dominio',
        nombre: 'Dominio',
        descripcion: 'Ejecutá autónomamente sin ayudas externas',
        icono: '👑',
        tempo: 120,
        countIn: true,
        metronomo: false,
        vueltas: 1,
        bloquearControles: true,
        requisito: { nivel: 'precision', precisionMinima: 90 },
    },
};

const DESAFIO_ORDEN = ['practica', 'pulso', 'coordinacion', 'precision', 'dominio'];

// ═══════════════════════════════════════════
// TELEMETRÍA DE RENDIMIENTO Y DIAGNÓSTICO
// ═══════════════════════════════════════════

class TelemetriaRendimiento {
    constructor(audioCtx) {
        this.ctx = audioCtx;
        this.fpsTiempos = [];
        this.framesLentos = 0;
        this.activo = false;
        this.latenciaAudio = 0;
        this._loopRef = null;
        this._lastFrameTime = 0;
        this.notasPercusion = [];
        this.notasPiano = [];
    }

    iniciar() {
        this.fpsTiempos = [];
        this.framesLentos = 0;
        this.activo = true;
        this._lastFrameTime = performance.now();
        this.notasPercusion = [];
        this.notasPiano = [];

        if (this.ctx) {
            this.latenciaAudio = (this.ctx.outputLatency || 0) * 1000;
        }

        this._medirFPS();
    }

    _medirFPS() {
        if (!this.activo) return;

        const ahora = performance.now();
        this.fpsTiempos.push(ahora);

        while (this.fpsTiempos.length > 0 && this.fpsTiempos[0] < ahora - 1000) {
            this.fpsTiempos.shift();
        }

        if (this._lastFrameTime > 0) {
            const delta = ahora - this._lastFrameTime;
            if (delta > 33.3) {
                this.framesLentos++;
            }
        }
        this._lastFrameTime = ahora;

        this._loopRef = requestAnimationFrame(() => this._medirFPS());
    }

    registrarNotaPercusion(zona, expectedMs, actualMs, diffMs, clase) {
        this.notasPercusion.push({ zona, expectedMs, actualMs, diffMs, clase, ts: Date.now() });
    }

    registrarNotaPiano(notaId, silaba, expectedMs, actualMs, diffMs, clase, durSec) {
        this.notasPiano.push({ notaId, silaba, expectedMs, actualMs, diffMs, clase, durSec, ts: Date.now() });
    }

    detener() {
        this.activo = false;
        if (this._loopRef) {
            cancelAnimationFrame(this._loopRef);
            this._loopRef = null;
        }
    }

    _calcularDesvioMedio(notas) {
        if (notas.length === 0) return 0;
        const suma = notas.reduce((acc, n) => acc + n.diffMs, 0);
        return suma / notas.length;
    }

    _calcularDesviacionEstandar(notas) {
        if (notas.length < 2) return 0;
        const media = this._calcularDesvioMedio(notas);
        const sumaCuadrados = notas.reduce((acc, n) => acc + Math.pow(n.diffMs - media, 2), 0);
        return Math.sqrt(sumaCuadrados / notas.length);
    }

    obtenerReporte() {
        const allNotas = [...this.notasPercusion, ...this.notasPiano];
        const fpsPromedio = this.fpsTiempos.length;

        return {
            latenciaAudioMs: Math.round(this.latenciaAudio * 10) / 10,
            fpsPromedio,
            caidasAbruptasFPS: this.framesLentos,
            totalNotasPercusion: this.notasPercusion.length,
            totalNotasPiano: this.notasPiano.length,
            desvioMedioMs: Math.round(this._calcularDesvioMedio(allNotas) * 10) / 10,
            desviacionEstandarMs: Math.round(this._calcularDesviacionEstandar(allNotas) * 10) / 10,
            notasPercusion: this.notasPercusion,
            notasPiano: this.notasPiano,
        };
    }
}

class ProcesadorDiagnostico {
    static interpretar(datos) {
        const { latenciaAudioMs, caidasAbruptasFPS, desvioMedioMs, desviacionEstandarMs, porcentajeAcierto } = datos;

        let estadoHardware = 'EXCELENTE';
        let estadoMotriz = 'RITMICO';
        let interpretacionBreve = '';
        let analisisDetallado = '';

        const hardwareGrave = latenciaAudioMs > 100 || caidasAbruptasFPS > 8;
        const hardwareAdvertencia = (latenciaAudioMs > 50 && latenciaAudioMs <= 100) || (caidasAbruptasFPS > 3 && caidasAbruptasFPS <= 8);

        if (hardwareGrave) {
            estadoHardware = 'CRITICO';
        } else if (hardwareAdvertencia) {
            estadoHardware = 'ESTABLE';
        }

        const esConsistente = desviacionEstandarMs < 25;
        const esMuyAdelantado = desvioMedioMs < -40;
        const esMuyAtrasado = desvioMedioMs > 40;

        if (porcentajeAcierto >= 80) {
            estadoMotriz = 'RITMICO';
        } else if (porcentajeAcierto < 80 && esConsistente) {
            if (hardwareGrave || hardwareAdvertencia) {
                estadoMotriz = 'COMPENSANDO_LAG';
            } else if (esMuyAdelantado || esMuyAtrasado) {
                estadoMotriz = 'DESAFINADO_TEMPO';
            }
        } else {
            estadoMotriz = 'APRENDIZAJE';
        }

        if (estadoHardware === 'CRITICO') {
            interpretacionBreve = 'Rendimiento de dispositivo deficiente.';
            analisisDetallado = `El dispositivo presenta retrasos severos que comprometen la ejecución. La medición de latencia de audio registró ${latenciaAudioMs}ms de retraso de salida (umbral crítico: >100ms), y se contabilizaron ${caidasAbruptasFPS} caídas abruptas de rendimiento visual durante la sesión. Con estos valores, los estímulos visuales y sonoros no están sincronizados de forma confiable en la pantalla del alumno, forzándolo a errar de forma involuntaria aunque su percepción rítmica sea correcta. Se recomienda usar auriculares con cable, cerrar aplicaciones en segundo plano y verificar que el navegador no esté limitando los recursos del dispositivo.`;
        } else if (estadoHardware === 'ESTABLE' && estadoMotriz === 'COMPENSANDO_LAG') {
            interpretacionBreve = 'Coordinación buena, afectada por latencia leve.';
            analisisDetallado = `El alumno demuestra consistencia rítmica (dispersión de apenas ${desviacionEstandarMs}ms entre golpes), lo que indica un buen pulso interno. Sin embargo, su tendencia es tocar adelantado de forma sistemática para compensar los ${latenciaAudioMs}ms de latencia de audio detectados (rango advertencia: 50-100ms), accompagnados de ${caidasAbruptasFPS} tirones visuales. La triangulación de estos datos muestra que la motricidad del alumno es sólida, pero el hardware le está imponiendo una carga extra de anticipación que distorsiona su ejecución natural.`;
        } else if (estadoHardware === 'EXCELENTE' && estadoMotriz === 'DESAFINADO_TEMPO') {
            interpretacionBreve = 'Pulso estable pero fuera de fase.';
            analisisDetallado = `El alumno tiene excelente regularidad en la dispersión de sus golpes (desviación estándar de ${desviacionEstandarMs}ms), y el hardware funciona sin impedimentos: latencia de audio de ${latenciaAudioMs}ms (umbral óptimo: <50ms) y ${caidasAbruptasFPS} caídas de rendimiento, lo que descarta al dispositivo como factor influyente. Sin embargo, su tendencia es atacar consistentemente ${Math.abs(Math.round(desvioMedioMs))}ms corrido del centro de la nota, lo que indica que tiene pulso interno pero está fuera de fase con el tempo del ejercicio. Requiere práctica enfocada en alinear el ataque con el pulso referencial.`;
        } else if (estadoHardware === 'EXCELENTE' && estadoMotriz === 'APRENDIZAJE') {
            interpretacionBreve = 'Inestabilidad rítmica (Falla motriz/atención).';
            analisisDetallado = `El dispositivo responde de manera óptima: latencia de audio de ${latenciaAudioMs}ms (dentro del rango ideal), ${caidasAbruptasFPS} caídas de rendimiento en todo el nivel, valores que descartan de forma contundente al hardware como causa de los errores. La baja precisión del alumno se debe íntegramente a una alta dispersión en los golpes (${desviacionEstandarMs}ms de variación), lo que denota que no logra sostener un patrón regular en el tiempo. Esta firma de datos es consistente con una dificultad puramente motriz o de atención rítmica que requiere práctica lenta y constante.`;
        } else if (estadoHardware === 'CRITICO' && estadoMotriz === 'RITMICO') {
            interpretacionBreve = 'Buena motricidad, obstaculizada por hardware.';
            analisisDetallado = `A pesar de la precisión alcanzada (${porcentajeAcierto}%), el hardware evidencia problemas significativos: ${latenciaAudioMs}ms de latencia de audio y ${caidasAbruptasFPS} caídas de rendimiento. El hecho de que el alumno logre mantener un nivel aceptable pese a estas condiciones indica que su coordinación rítmica es notable, pero la ejecución estaría considerablemente mejor con un dispositivo más estable o con auriculares con cable.`;
        } else if (estadoHardware === 'ESTABLE' && estadoMotriz === 'APRENDIZAJE') {
            interpretacionBreve = 'Ejecución inestable sin justificación de hardware.';
            analisisDetallado = `El hardware opera dentro de parámetros razonables (${latenciaAudioMs}ms de latencia, ${caidasAbruptasFPS} caídas de rendimiento, ambos dentro de rangos aceptables), lo que descarta al dispositivo como causa significativa de los errores. La dispersión de los golpes del alumno (${desviacionEstandarMs}ms de variación) no se justifica por interferencia técnica, lo que confirma que la dificultad es de naturaleza motriz o atencional y requiere trabajo específico de coordinación.`;
        } else {
            interpretacionBreve = 'Ejecución excelente.';
            analisisDetallado = `Sincronización óptima entre hardware y motricidad del alumno. Las mediciones registradas — latencia de audio de ${latenciaAudioMs}ms (rango ideal: <50ms), ${caidasAbruptasFPS} caídas de rendimiento visual (mínimas), y una dispersión de golpes de ${desviacionEstandarMs}ms — convergen en una triangulación de evidencia que confirma que el dispositivo funciona dentro de parámetros normales y que la ejecución rítmica del alumno está al nivel esperado. No se detectaron interferencias técnicas ni dificultades motrices que requieran intervención.`;
        }

        return { estadoHardware, estadoMotriz, interpretacionBreve, analisisDetallado };
    }
}

// ═══════════════════════════════════════════
// ANALIZADOR DE RENDIMIENTO POR INSTRUMENTO
// ═══════════════════════════════════════════

class AnalizadorRendimiento {

    static FIGURAS_PERCUSION = [
        { cuadrante: 0, nombre: 'negra', duracion: 1, zona: 'grave' },
        { cuadrante: 1, nombre: 'negra', duracion: 1, zona: 'agudo' },
        { cuadrante: 2, nombre: 'corchea+corchea', duracion: 0.75, zona: 'grave', segunda: { nombre: 'corchea', duracion: 0.25 } },
        { cuadrante: 3, nombre: 'negra', duracion: 1, zona: 'agudo' },
    ];

    static FIGURAS_PIANO = {
        0.25: 'semicorchea',
        0.5: 'corchea',
        0.75: 'corchea-punto',
        1: 'negra',
        1.5: 'negra-punto',
        1.9: 'negra-larga',
        2: 'blanca',
        2.75: 'blanca-punto',
    };

    static analizarPercusion(notas, precision, tempo = 110) {
        if (!notas || notas.length === 0) return null;

        const UMBRAL_TENDENCIA = 30;
        const UMBRAL_ACIERTO = 150;
        const BEAT_SEC = 60 / tempo;

        const porCuadrante = { 0: [], 1: [], 2: [], 3: [] };

        for (const nota of notas) {
            const beatEnCiclo = ((nota.expectedMs / 1000 - BEAT_SEC) / BEAT_SEC) % 4;
            let cuadrante;
            if (beatEnCiclo < 1) cuadrante = 0;
            else if (beatEnCiclo < 2) cuadrante = 1;
            else if (beatEnCiclo < 3) cuadrante = 2;
            else cuadrante = 3;

            if (porCuadrante[cuadrante]) {
                porCuadrante[cuadrante].push(nota);
            }
        }

        const analisisCuadrantes = [];
        for (let c = 0; c <= 3; c++) {
            const notasC = porCuadrante[c];
            if (notasC.length === 0) continue;

            const aciertos = notasC.filter(n => Math.abs(n.diffMs) <= UMBRAL_ACIERTO).length;
            const precisionC = Math.round((aciertos / notasC.length) * 100);
            const fig = AnalizadorRendimiento.FIGURAS_PERCUSION[c];

            let tendencia = 'estable';
            const mediaDiff = notasC.reduce((s, n) => s + n.diffMs, 0) / notasC.length;
            if (mediaDiff < -UMBRAL_TENDENCIA) tendencia = 'adelantado';
            else if (mediaDiff > UMBRAL_TENDENCIA) tendencia = 'atrasado';

            analisisCuadrantes.push({
                cuadrante: c,
                figura: fig.nombre,
                zona: fig.zona,
                duracion: fig.duracion,
                precision: precisionC,
                total: notasC.length,
                aciertos,
                errores: notasC.length - aciertos,
                tendencia,
                mediaDiffMs: Math.round(mediaDiff),
            });
        }

        const diffMsArr = notas.map(n => n.diffMs);
        const mediaGeneral = diffMsArr.reduce((s, v) => s + v, 0) / diffMsArr.length;
        const varianza = diffMsArr.reduce((s, v) => s + Math.pow(v - mediaGeneral, 2), 0) / diffMsArr.length;
        const desviacion = Math.sqrt(varianza);

        let tendenciaGeneral = 'estable';
        if (mediaGeneral < -UMBRAL_TENDENCIA) tendenciaGeneral = 'adelantado';
        else if (mediaGeneral > UMBRAL_TENDENCIA) tendenciaGeneral = 'atrasado';

        const figurasConErrores = analisisCuadrantes
            .filter(c => c.precision < 80)
            .sort((a, b) => a.precision - b.precision);

        return {
            precision,
            totalNotas: notas.length,
            tendenciaGeneral,
            mediaDiffMs: Math.round(mediaGeneral),
            desviacionMs: Math.round(desviacion),
            cuadrantes: analisisCuadrantes,
            figurasConErrores,
        };
    }

    static analizarPiano(notas, precision, tempo = 110) {
        if (!notas || notas.length === 0) return null;

        const UMBRAL_TENDENCIA = 30;
        const UMBRAL_ACIERTO = 150;
        const BEAT_SEC = 60 / tempo;

        const porDuracion = {};

        for (const nota of notas) {
            const durBeat = nota.durSec ? nota.durSec / BEAT_SEC : 1;
            let durKey = 1;
            for (const key of Object.keys(AnalizadorRendimiento.FIGURAS_PIANO).map(Number).sort((a, b) => a - b)) {
                if (Math.abs(durBeat - key) < 0.125) { durKey = key; break; }
            }
            if (!porDuracion[durKey]) porDuracion[durKey] = [];
            porDuracion[durKey].push(nota);
        }

        const analisisFiguras = [];
        for (const [durKey, notasD] of Object.entries(porDuracion)) {
            const dur = Number(durKey);
            const aciertos = notasD.filter(n => Math.abs(n.diffMs) <= UMBRAL_ACIERTO).length;
            const precisionD = Math.round((aciertos / notasD.length) * 100);
            const nombreFigura = AnalizadorRendimiento.FIGURAS_PIANO[dur] || `~${dur}b`;

            let tendencia = 'estable';
            const mediaDiff = notasD.reduce((s, n) => s + n.diffMs, 0) / notasD.length;
            if (mediaDiff < -UMBRAL_TENDENCIA) tendencia = 'adelantado';
            else if (mediaDiff > UMBRAL_TENDENCIA) tendencia = 'atrasado';

            analisisFiguras.push({
                duracion: dur,
                figura: nombreFigura,
                precision: precisionD,
                total: notasD.length,
                aciertos,
                errores: notasD.length - aciertos,
                tendencia,
                mediaDiffMs: Math.round(mediaDiff),
            });
        }

        analisisFiguras.sort((a, b) => a.duracion - b.duracion);

        const diffMsArr = notas.map(n => n.diffMs);
        const mediaGeneral = diffMsArr.reduce((s, v) => s + v, 0) / diffMsArr.length;
        const varianza = diffMsArr.reduce((s, v) => s + Math.pow(v - mediaGeneral, 2), 0) / diffMsArr.length;
        const desviacion = Math.sqrt(varianza);

        let tendenciaGeneral = 'estable';
        if (mediaGeneral < -UMBRAL_TENDENCIA) tendenciaGeneral = 'adelantado';
        else if (mediaGeneral > UMBRAL_TENDENCIA) tendenciaGeneral = 'atrasado';

        const figurasConErrores = analisisFiguras
            .filter(f => f.precision < 80)
            .sort((a, b) => a.precision - b.precision);

        return {
            precision,
            totalNotas: notas.length,
            tendenciaGeneral,
            mediaDiffMs: Math.round(mediaGeneral),
            desviacionMs: Math.round(desviacion),
            figuras: analisisFiguras,
            figurasConErrores,
        };
    }

    static generarFeedbackPercusion(analisis) {
        if (!analisis) return '';

        const { precision, tendenciaGeneral, mediaDiffMs, desviacionMs, cuadrantes, figurasConErrores } = analisis;

        if (precision >= 90) {
            if (figurasConErrores.length > 0) {
                return `Mejorar "${figurasConErrores[0].figura}" (${figurasConErrores[0].zona}).`;
            }
            return desviacionMs > 20 ? 'Faltas de atención puntuales.' : 'Excelente ejecución.';
        }

        const parts = [];

        if (tendenciaGeneral === 'adelantado') {
            parts.push('Se obs. aceleraciones.');
        } else if (tendenciaGeneral === 'atrasado') {
            parts.push('Se obs. desaceleraciones.');
        }

        if (figurasConErrores.length > 0) {
            const f = figurasConErrores[0];
            parts.push(`Practicar "${f.figura}" (${f.zona}).`);
        }

        return parts.join(' ') || 'Practicar con metrónomo lento.';
    }

    static generarFeedbackPiano(analisis) {
        if (!analisis) return '';

        const { precision, tendenciaGeneral, mediaDiffMs, desviacionMs, figuras, figurasConErrores } = analisis;

        if (precision >= 90) {
            if (figurasConErrores.length > 0) {
                return `Mejorar "${figurasConErrores[0].figura}".`;
            }
            return desviacionMs > 20 ? 'Faltas de atención puntuales.' : 'Excelente ejecución.';
        }

        const parts = [];

        if (tendenciaGeneral === 'adelantado') {
            parts.push('Se obs. aceleraciones.');
        } else if (tendenciaGeneral === 'atrasado') {
            parts.push('Se obs. desaceleraciones.');
        }

        if (figurasConErrores.length > 0) {
            parts.push(`Practicar "${figurasConErrores[0].figura}".`);
        }

        return parts.join(' ') || 'Practicar con metrónomo lento.';
    }

    static generarDetallePercusion(analisis) {
        if (!analisis) return '';

        const { precision, tendenciaGeneral, mediaDiffMs, desviacionMs, cuadrantes, figurasConErrores } = analisis;
        const lines = [];

        lines.push(`Precisión general de percusión: ${precision}%.`);

        if (precision >= 90) {
            if (figurasConErrores.length > 0) {
                const f = figurasConErrores[0];
                lines.push(`Figura con desviación puntual: "${f.figura}" en zona ${f.zona} (${f.precision}%).`);
            } else {
                lines.push('Ejecución sólida sin figuras con dificultad destacable.');
            }
            return lines.join(' ');
        }

        if (tendenciaGeneral === 'adelantado') {
            lines.push(`Se observa una tendencia a acelerar el pulso, golpeando antes de tiempo.`);
        } else if (tendenciaGeneral === 'atrasado') {
            lines.push(`Se observa una tendencia a desacelerar el pulso, golpeando después de tiempo.`);
        } else {
            lines.push(`La tendencia de timing es estable.`);
        }

        if (figurasConErrores.length > 0) {
            lines.push(`Figuras con mayor dificultad:`);
            for (const f of figurasConErrores) {
                const tendF = f.tendencia === 'adelantado' ? ' (acelerando)' : f.tendencia === 'atrasado' ? ' (desacelerando)' : '';
                lines.push(`- "${f.figura}" en zona ${f.zona}: ${f.precision}% de precisión (${f.errores} de ${f.total} errores)${tendF}.`);
            }
        }

        const cuadrantesOK = cuadrantes.filter(c => c.precision >= 80);
        if (cuadrantesOK.length > 0 && figurasConErrores.length > 0) {
            lines.push(`Los compases con buen rendimiento: ${cuadrantesOK.map(c => `compás ${c.cuadrante + 1}`).join(', ')}.`);
        }

        if (precision < 70 && desviacionMs > 60) {
            lines.push(`Alta dispersión en los golpes (${desviacionMs}ms), dificultad para sostener un patrón regular.`);
        }

        return lines.join(' ');
    }

    static generarDetallePiano(analisis) {
        if (!analisis) return '';

        const { precision, tendenciaGeneral, mediaDiffMs, desviacionMs, figuras, figurasConErrores } = analisis;
        const lines = [];

        lines.push(`Precisión general de piano: ${precision}%.`);

        if (precision >= 90) {
            if (figurasConErrores.length > 0) {
                const f = figurasConErrores[0];
                lines.push(`Figura con desviación puntual: "${f.figura}" (${f.precision}%).`);
            } else {
                lines.push('Ejecución sólida sin figuras con dificultad destacable.');
            }
            return lines.join(' ');
        }

        if (tendenciaGeneral === 'adelantado') {
            lines.push(`Se observa una tendencia a presionar las teclas antes del tiempo establecido.`);
        } else if (tendenciaGeneral === 'atrasado') {
            lines.push(`Se observa una tendencia a presionar las teclas después del tiempo establecido.`);
        } else {
            lines.push(`La tendencia de timing es estable.`);
        }

        if (figurasConErrores.length > 0) {
            lines.push(`Figuras con mayor dificultad:`);
            for (const f of figurasConErrores) {
                const tendF = f.tendencia === 'adelantado' ? ' (adelantándose)' : f.tendencia === 'atrasado' ? ' (retrasándose)' : '';
                lines.push(`- "${f.figura}": ${f.precision}% de precisión (${f.errores} de ${f.total} errores)${tendF}.`);
            }
        }

        const figurasOK = figuras.filter(f => f.precision >= 80 && !figurasConErrores.includes(f));
        if (figurasOK.length > 0 && figurasConErrores.length > 0) {
            lines.push(`Figuras ejecutadas correctamente: ${figurasOK.map(f => `"${f.figura}"`).join(', ')}.`);
        }

        if (precision < 70 && desviacionMs > 60) {
            lines.push(`Alta dispersión en los ataques (${desviacionMs}ms), dificultad para sostener un patrón regular.`);
        }

        return lines.join(' ');
    }
}

// 🔹 Secuenciador musical — programa eventos con AudioContext.currentTime
class Secuenciador {
    constructor(ctx) {
        this.ctx = ctx;
        this.partitura = null;
        this._activos = [];
        this._timers = [];
        this.reproduciendo = false;
        this._inicioAbsoluto = 0;
        this._pulsoASeg = 0;
        this._callbacks = {};
        this._notasProgramadas = [];
        this._silenciarMelodia = false;
        this._segmentoTimer = null;
        this._segmentoBeats = 24;
    }

    cargar(partitura, tempoOverride) {
        this.partitura = partitura;
        this.tempo = tempoOverride || partitura.tempo;
    }

    reproducir(callbacks = {}) {
        if (!this.partitura || !this.ctx) return;
        this.detener();

        this.reproduciendo = true;
        this._callbacks = callbacks;
        this._pulsoASeg = 60 / this.tempo;
        const now = this.ctx.currentTime;
        this._inicioAbsoluto = now;
        this._reprogramarSegmento(0, now);
    }

    _reprogramarSegmento(desdeBeat, timeBase) {
        this._limpiarSegmentoTimer();
        this._programarDesde(desdeBeat, timeBase, desdeBeat + this._segmentoBeats);

        if (!this.reproduciendo || !this.partitura) return;
        const notas = this.partitura.notas;
        const pulso = this._pulsoASeg;
        const maxBeat = notas.reduce((max, ev) => Math.max(max, ev.inicio + ev.duracion), 0);
        if (maxBeat <= desdeBeat + this._segmentoBeats) return;

        const siguienteDesdeBeat = desdeBeat + this._segmentoBeats;
        const tiempoHastaSiguiente = Math.max(0, ((siguienteDesdeBeat - desdeBeat) * pulso) - (this.ctx.currentTime - timeBase)) * 1000;
        const tid = setTimeout(() => {
            if (!this.reproduciendo) return;
            const planeado = timeBase + (siguienteDesdeBeat - desdeBeat) * pulso;
            const nuevoTimeBase = Math.max(planeado, this.ctx.currentTime);
            this._reprogramarSegmento(siguienteDesdeBeat, nuevoTimeBase);
        }, tiempoHastaSiguiente);
        this._segmentoTimer = tid;
        this._timers.push(tid);
    }

    _programarDesde(desdeBeat, timeBase, desdeHastaBeat) {
        const notas = this.partitura.notas;
        const pulso = this._pulsoASeg;
        const hastaBeat = desdeHastaBeat != null ? desdeHastaBeat : Infinity;

        for (let i = 0; i < notas.length; i++) {
            const ev = notas[i];
            if (ev.inicio < desdeBeat - 0.001 || ev.inicio >= hastaBeat - 0.001) continue;

            const tInicio = timeBase + (ev.inicio - desdeBeat) * pulso;

            if (this._callbacks.onEvento) {
                const delay = Math.max(0, (tInicio - this.ctx.currentTime) * 1000);
                const tid = setTimeout(() => {
                    if (this.reproduciendo) this._callbacks.onEvento(ev);
                }, delay);
                this._timers.push(tid);
                this._notasProgramadas.push({ ev, tid, type: 'evento' });
            }

            if (ev.silencio || !ev.nota) continue;

            if (i > 0 && !notas[i - 1].silencio && notas[i - 1].nota === ev.nota &&
                Math.abs(notas[i - 1].inicio + notas[i - 1].duracion - ev.inicio) < 0.001) {
                continue;
            }

            let duracionTotal = ev.duracion;
            let j = i + 1;
            while (j < notas.length && !notas[j].silencio && notas[j].nota === ev.nota &&
                Math.abs(notas[j].inicio - (ev.inicio + duracionTotal)) < 0.001) {
                duracionTotal += notas[j].duracion;
                j++;
            }

            this._programarNota(ev.nota, tInicio, duracionTotal * pulso);
        }

        if (this.partitura.percusion && this._callbacks.onPercusion) {
            const perc = this.partitura.percusion;
            for (let i = 0; i < perc.length; i++) {
                const ev = perc[i];
                if (ev.inicio < desdeBeat - 0.001 || ev.inicio >= hastaBeat - 0.001) continue;
                const tInicio = timeBase + (ev.inicio - desdeBeat) * pulso;
                const delay = Math.max(0, (tInicio - this.ctx.currentTime) * 1000);
                const tid = setTimeout(() => {
                    if (this.reproduciendo) this._callbacks.onPercusion(ev.zona);
                }, delay);
                this._timers.push(tid);
            }
        }
    }

    _limpiarSegmentoTimer() {
        if (this._segmentoTimer != null) {
            clearTimeout(this._segmentoTimer);
            this._segmentoTimer = null;
        }
    }

    cambiarTempo(nuevoTempo) {
        if (!this.reproduciendo || !this.partitura || !this.ctx) return false;
        const viejoPulso = this._pulsoASeg;
        const elapsed = this.ctx.currentTime - this._inicioAbsoluto;
        const beatActual = elapsed / viejoPulso;

        this.tempo = nuevoTempo;
        this._pulsoASeg = 60 / nuevoTempo;

        this._limpiarSegmentoTimer();

        for (const osc of this._activos) {
            try { osc.stop(); } catch (e) { }
        }
        this._activos = [];
        for (const tid of this._timers) clearTimeout(tid);
        this._timers = [];
        this._notasProgramadas = [];

        const now = this.ctx.currentTime;
        this._inicioAbsoluto = now;
        this._reprogramarSegmento(beatActual, now);

        return beatActual;
    }

    _programarNota(nombreNota, startTime, duration) {
        if (this._silenciarMelodia) return;
        const freq = notaAFrecuencia(nombreNota);
        if (!freq) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        const attack = Math.min(0.01, duration * 0.1);
        const release = Math.min(0.08, duration * 0.3);
        const sustainEnd = startTime + duration - release;

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.35, startTime + attack);

        if (duration > attack + release) {
            gain.gain.setValueAtTime(0.35, sustainEnd);
        }

        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.01);

        this._activos.push(osc);
        osc.onended = () => {
            const idx = this._activos.indexOf(osc);
            if (idx !== -1) this._activos.splice(idx, 1);
            gain.disconnect();
        };
    }

    detener() {
        this.reproduciendo = false;
        this._limpiarSegmentoTimer();
        for (const osc of this._activos) {
            try { osc.stop(); } catch (e) { }
        }
        this._activos = [];
        for (const tid of this._timers) clearTimeout(tid);
        this._timers = [];
        this._notasProgramadas = [];
    }

    crearClick(fuerte) {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const freq = fuerte ? 880 : 540;
        const vol = fuerte ? 0.45 : 0.25;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    get duracionTotal() {
        if (!this.partitura) return 0;
        return this.partitura.notas.reduce((max, ev) => {
            const fin = ev.inicio + ev.duracion;
            return fin > max ? fin : max;
        }, 0) * (60 / this.tempo);
    }
}

// 🔹 Percusión — síntesis Web Audio pre-renderizada a AudioBuffers
class Percusion {
    constructor(ctx) {
        this.ctx = ctx;
        this._buffers = {};
        this._precargarBuffers();
    }

    _precargarBuffers() {
        // Crear buffers offline para los 4 sonidos
        const duraciones = {
            bomboParche: 0.35,
            bomboAro: 0.12,
            cajonCuerpo: 0.2,
            cajonTapa: 0.1
        };

        for (const [nombre, dur] of Object.entries(duraciones)) {
            this._renderBuffer(nombre, dur);
        }
    }

    _renderBuffer(nombre, duracion) {
        // Usar OfflineAudioContext para renderizar a buffer
        const offlineCtx = new OfflineAudioContext(1, Math.ceil(this.ctx.sampleRate * duracion), this.ctx.sampleRate);
        const now = 0;

        try {
            if (nombre === 'bomboParche') {
                this._bomboParcheOffline(offlineCtx, now);
            } else if (nombre === 'bomboAro') {
                this._bomboAroOffline(offlineCtx, now);
            } else if (nombre === 'cajonCuerpo') {
                this._cajonCuerpoOffline(offlineCtx, now);
            } else if (nombre === 'cajonTapa') {
                this._cajonTapaOffline(offlineCtx, now);
            }

            offlineCtx.startRendering().then(buffer => {
                this._buffers[nombre] = buffer;
            }).catch(err => console.warn(`[PERC] Error renderizando ${nombre}:`, err));
        } catch (e) {
            console.warn(`[PERC] Error en _renderBuffer ${nombre}:`, e);
        }
    }

    _ruidoBlanco(duracion, sampleRate) {
        const frames = Math.ceil(sampleRate * duracion);
        const buffer = new OfflineAudioContext(1, frames, sampleRate).createBuffer(1, frames, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
        return buffer;
    }

    _envolvente(gain, vol, attack, sustain, release, now) {
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(vol, now + attack);
        if (sustain > 0) gain.gain.setValueAtTime(vol, now + attack + sustain);
        gain.gain.exponentialRampToValueAtTime(0.001, now + attack + sustain + release);
    }

    _bomboParcheOffline(offlineCtx, now) {
        // Sub-grave con barrido
        const osc = offlineCtx.createOscillator();
        const oscGain = offlineCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(55, now);
        osc.frequency.exponentialRampToValueAtTime(22, now + 0.15);
        this._envolvente(oscGain, 1.0, 0.003, 0.08, 0.18, now);
        osc.connect(oscGain);
        oscGain.connect(offlineCtx.destination);
        osc.start(now);
        osc.stop(now + 0.3);

        // Armónico medio
        const osc2 = offlineCtx.createOscillator();
        const osc2Gain = offlineCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(110, now);
        osc2.frequency.exponentialRampToValueAtTime(45, now + 0.1);
        this._envolvente(osc2Gain, 0.35, 0.003, 0.05, 0.12, now);
        osc2.connect(osc2Gain);
        osc2Gain.connect(offlineCtx.destination);
        osc2.start(now);
        osc2.stop(now + 0.2);

        // Ruido lowpass
        const noiseSrc = offlineCtx.createBufferSource();
        noiseSrc.buffer = this._ruidoBlanco(0.06, offlineCtx.sampleRate);
        const noiseGain = offlineCtx.createGain();
        const lp = offlineCtx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 400;
        this._envolvente(noiseGain, 0.3, 0.001, 0.02, 0.04, now);
        noiseSrc.connect(lp);
        lp.connect(noiseGain);
        noiseGain.connect(offlineCtx.destination);
        noiseSrc.start(now);
        noiseSrc.stop(now + 0.07);
    }

    _bomboAroOffline(offlineCtx, now) {
        const noiseSrc = offlineCtx.createBufferSource();
        noiseSrc.buffer = this._ruidoBlanco(0.06, offlineCtx.sampleRate);
        const gain = offlineCtx.createGain();
        const bp = offlineCtx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 3200;
        bp.Q.value = 1.5;
        this._envolvente(gain, 0.45, 0.001, 0.01, 0.04, now);
        noiseSrc.connect(bp);
        bp.connect(gain);
        gain.connect(offlineCtx.destination);
        noiseSrc.start(now);
        noiseSrc.stop(now + 0.07);
    }

    _cajonCuerpoOffline(offlineCtx, now) {
        const osc = offlineCtx.createOscillator();
        const oscGain = offlineCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);
        this._envolvente(oscGain, 0.7, 0.003, 0.04, 0.1, now);
        osc.connect(oscGain);
        oscGain.connect(offlineCtx.destination);
        osc.start(now);
        osc.stop(now + 0.16);

        const noiseSrc = offlineCtx.createBufferSource();
        noiseSrc.buffer = this._ruidoBlanco(0.08, offlineCtx.sampleRate);
        const noiseGain = offlineCtx.createGain();
        const lp = offlineCtx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 500;
        this._envolvente(noiseGain, 0.3, 0.001, 0.02, 0.05, now);
        noiseSrc.connect(lp);
        lp.connect(noiseGain);
        noiseGain.connect(offlineCtx.destination);
        noiseSrc.start(now);
        noiseSrc.stop(now + 0.09);
    }

    _cajonTapaOffline(offlineCtx, now) {
        const noiseSrc = offlineCtx.createBufferSource();
        noiseSrc.buffer = this._ruidoBlanco(0.05, offlineCtx.sampleRate);
        const gain = offlineCtx.createGain();
        const bp = offlineCtx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 2500;
        bp.Q.value = 2;
        this._envolvente(gain, 0.55, 0.001, 0.008, 0.035, now);
        noiseSrc.connect(bp);
        bp.connect(gain);
        gain.connect(offlineCtx.destination);
        noiseSrc.start(now);
        noiseSrc.stop(now + 0.06);
    }

    reproducir(instrumento, zona) {
        if (!this.ctx) return;
        const bufferKey = instrumento === 'bombo'
            ? (zona === 'grave' ? 'bomboParche' : 'bomboAro')
            : (zona === 'grave' ? 'cajonCuerpo' : 'cajonTapa');

        const buffer = this._buffers[bufferKey];
        if (!buffer) {
            // Fallback: renderizar síncrono si no está listo (primer golpe)
            console.warn('[PERC] Buffer no listo para', bufferKey, '- usando síntesis directa');
            this._reproducirDirecto(instrumento, zona);
            return;
        }

        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.8;
        src.connect(gain);
        gain.connect(this.ctx.destination);
        src.start();
    }

    _reproducirDirecto(instrumento, zona) {
        // Fallback a síntesis directa original si buffer no está listo
        if (instrumento === 'bombo') {
            zona === 'grave' ? this._bomboParche() : this._bomboAro();
        } else {
            zona === 'grave' ? this._cajonCuerpo() : this._cajonTapa();
        }
    }

    // Métodos de síntesis directa original (fallback)
    _bomboParche() {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(55, now);
        osc.frequency.exponentialRampToValueAtTime(22, now + 0.15);
        this._envolvente(oscGain, 1.0, 0.003, 0.08, 0.18, now);
        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);

        const osc2 = this.ctx.createOscillator();
        const osc2Gain = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(110, now);
        osc2.frequency.exponentialRampToValueAtTime(45, now + 0.1);
        this._envolvente(osc2Gain, 0.35, 0.003, 0.05, 0.12, now);
        osc2.connect(osc2Gain);
        osc2Gain.connect(this.ctx.destination);
        osc2.start(now);
        osc2.stop(now + 0.2);

        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = this._ruidoBlanco(0.06, this.ctx.sampleRate);
        const noiseGain = this.ctx.createGain();
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 400;
        this._envolvente(noiseGain, 0.3, 0.001, 0.02, 0.04, now);
        noiseSrc.connect(lp);
        lp.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noiseSrc.start(now);
        noiseSrc.stop(now + 0.07);
    }

    _bomboAro() {
        const now = this.ctx.currentTime;
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = this._ruidoBlanco(0.06, this.ctx.sampleRate);
        const gain = this.ctx.createGain();
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 3200;
        bp.Q.value = 1.5;
        this._envolvente(gain, 0.45, 0.001, 0.01, 0.04, now);
        noiseSrc.connect(bp);
        bp.connect(gain);
        gain.connect(this.ctx.destination);
        noiseSrc.start(now);
        noiseSrc.stop(now + 0.07);
    }

    _cajonCuerpo() {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);
        this._envolvente(oscGain, 0.7, 0.003, 0.04, 0.1, now);
        osc.connect(oscGain);
        oscGain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.16);

        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = this._ruidoBlanco(0.08);
        const noiseGain = this.ctx.createGain();
        const lp = this.ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 500;
        this._envolvente(noiseGain, 0.3, 0.001, 0.02, 0.05, now);
        noiseSrc.connect(lp);
        lp.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        noiseSrc.start(now);
        noiseSrc.stop(now + 0.09);
    }

    _cajonTapa() {
        const now = this.ctx.currentTime;
        const noiseSrc = this.ctx.createBufferSource();
        noiseSrc.buffer = this._ruidoBlanco(0.05);
        const gain = this.ctx.createGain();
        const bp = this.ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 2500;
        bp.Q.value = 2;
        this._envolvente(gain, 0.55, 0.001, 0.008, 0.035, now);
        noiseSrc.connect(bp);
        bp.connect(gain);
        gain.connect(this.ctx.destination);
        noiseSrc.start(now);
        noiseSrc.stop(now + 0.06);
    }
}

// 🔹 Mapeo de teclado del PC → notaId
const MAPEO_TECLAS = {
    // Blanca: mano izquierda + mano derecha
    q: "Do3", w: "Re3", e: "Mi3", r: "Fa3", g: "Sol3",
    h: "La3", u: "Si3", i: "Do4", o: "Re4", p: "Mi4",
    a: "Fa4", s: "Sol4", d: "La4", f: "Si4",
    // Negras: sostenidos
    2: "Do#3", 3: "Re#3", 5: "Fa#3", 6: "Sol#3", y: "La#3", 8: "Do#4", 9: "Re#4",
    z: "Fa#4", x: "Sol#4", c: "La#4"
};

// Percusión: Numpad — SGC = Sonido Grave Cuadrante, SAC = Sonido Agudo Cuadrante
const MAPEO_PERCUSION = {
    Numpad4: { zona: "grave", cuadrante: 0 },
    Numpad7: { zona: "agudo", cuadrante: 0 },
    Numpad5: { zona: "grave", cuadrante: 1 },
    Numpad8: { zona: "agudo", cuadrante: 1 },
    Numpad6: { zona: "grave", cuadrante: 2 },
    Numpad9: { zona: "agudo", cuadrante: 2 },
    Numpad0: { zona: "grave", cuadrante: 3 },
    Numpad1: { zona: "agudo", cuadrante: 3 },
};

class CoordinacionRitmica {

    // _esDesarrollador() {
    //     const urlParams = new URLSearchParams(window.location.search);
    //     return urlParams.get('dev') === 'true' ||
    // }

    _esDesarrollador() {
        return false;
    }

    constructor() {

        // Modal
        this.modalCancionero = document.getElementById("modalCancioneroPiano");

        // Header
        this.titulo = document.getElementById("modalCancioneroPiano_titulo");
        this.subtitulo = document.getElementById("modalCancioneroPiano_subtitulo");
        this.btnBack = document.getElementById("modalCancioneroPiano_back");

        // Vistas
        this.vistaCanciones = document.getElementById("coordRitm_vistaCanciones");
        this.vistaPartes = document.getElementById("coordRitm_vistaPartes");
        this.vistaModo = document.getElementById("coordRitm_vistaModo");
        this.vistaDesafio = document.getElementById("coordRitm_vistaDesafio");
        this.vistas = [this.vistaCanciones, this.vistaPartes, this.vistaModo, this.vistaDesafio];

        // Pantalla del juego (se genera dinámicamente)
        this.contenedorJuego = null;

        // Estado
        this.cancionActual = null;
        this.modoActual = null;
        this.enJuego = false;
        this.pausado = false;
        this._autoHideTimer = null;
        this.vistaActual = 0; // 0 = canciones, 1 = partes, 2 = modo

        // Motor de audio
        this.motorAudio = new MotorAudio();
        this.secuenciador = null;
        this._marcadorIdx = 0;
        this._timerFinCancion = null;
        this._timelineInterval = null;

        // Animaciones (modo desafío)
        this._animacionesNotas = [];
        this._animFrameId = null;
        this._posicionesTeclas = null;

        // Estado de desafíos
        this._desafioNivel = null;
        this._desafioVuelta = 0;
        this._desafioAcum = null;
        this.telemetria = null;

        // Informes periódicos
        this._informeTrackerInicio = null;
        this._informeTimerId = null;
        this._informeSuprimirHasta = 0;
        this._informeActivosConsecutivos = 0;
        this._informeSalidas = [];
        this._informeSalidaActual = null;
        this._informeMinutosPrevios = 0;
        this._informePostergado = false;
        this._informeLogTimerId = null;

        this._rolUsuario = 'pianista';

        // Tracker de actividad real
        this._trackerActivo = false;
        this._trackerTipo = null;
        this._trackerInicioMs = null;
        this._trackerUltimaActividadMs = null;
        this._trackerAcumuladoMs = 0;
        this._trackerPausado = false;
        this._idleTimer = null;

        // Teclado del PC (una sola vez)
        this._initTeclado();

        this.inicializarEventos();

    }

    inicializarEventos() {

        // Cerrar modal
        document.getElementById("modalCancioneroPiano_close")
            ?.addEventListener("click", () => this.cerrarMenu());

        // Botón ← volver
        this.btnBack?.addEventListener("click", () => this.volver());

        // Cards de canciones → navegar a partes
                document.querySelectorAll('.coordRitm_cardCancion').forEach(card => {
            card.addEventListener("click", () => {
                const cancion = card.getAttribute("data-cancion");
                this.irAPartes(cancion);
            });
        });
        // Salir de fullscreen → limpiar juego
        document.addEventListener("fullscreenchange", () => {
            if (!document.fullscreenElement && this.enJuego) {
                this.salir();
            }
        });
        document.addEventListener("webkitfullscreenchange", () => {
            if (!document.webkitFullscreenElement && this.enJuego) {
                this.salir();
            }
        });

        // Cards de partes → elegir modo
        document.querySelectorAll('.coordRitm_cardParte').forEach(card => {
            card.addEventListener("click", () => {
                const cancion = card.getAttribute("data-cancion");
                const parte = card.getAttribute("data-parte");
                const config = {
                    id: `${cancion}_${parte}`,
                    titulo: this._titulosCanciones[cancion] || cancion,
                    parte: parte
                };
                this.cargarSesion(config);
            });
        });

        // Cards de modo → iniciar sesión
        document.querySelectorAll('.coordRitm_cardModo').forEach(card => {
            card.addEventListener("click", () => {
                // ── Bypass admin: si es alevanfof@gmail.com en Escuela 467, asignar compañero ficticio ──
                // }
                const modo = card.getAttribute("data-modo");
                if (modo === 'desafio') {
                    this._renderizarVistaDesafio();
                    this.subtitulo.textContent = "Elegí un nivel";
                    this.navegarA(3);
                    return;
                }
                this.modoActual = modo;
                this.iniciar();
            });
        });


    }

    // Mapa de títulos legibles
    _titulosCanciones = {
        sanLorenzo: "Marcha de San Lorenzo"
    };

    // --- Navegación entre vistas ---

    irAPartes(cancion) {

        this.cancionActual = cancion;

        // Actualizar header
        this.titulo.textContent = this._titulosCanciones[cancion] || cancion;
        this.subtitulo.textContent = "Elegí una parte";

        this.navegarA(1);

    }

    volver() {

        if (this.vistaActual === 0) return;

        if (this.vistaActual === 3) {
            this.subtitulo.textContent = "Elegí un modo";
            this.navegarA(2);
            return;
        }

        if (this.vistaActual === 2) {
            this._sesionPendiente = null;
            const titulo = this.cancionActual?.titulo || this.cancionActual?.id || this.cancionActual;
            this.titulo.textContent = titulo;
            this.subtitulo.textContent = "Elegí una parte";
            this.navegarA(1);
            return;
        }

        this.cancionActual = null;

        // Restaurar header
        this.titulo.textContent = "Coordinación Rítmica";
        this.subtitulo.textContent = "Seleccioná una canción";

        this.navegarA(0);

    }

    navegarA(indice) {

        const salida = this.vistas[this.vistaActual];
        const entrada = this.vistas[indice];

        if (!salida || !entrada) return;

        const yendoAderecha = indice > this.vistaActual;

        // Preparar posición de entrada
        entrada.classList.remove("coordRitm_vista_active", "coordRitm_vista_izquierda", "coordRitm_vista_derecha");
        entrada.classList.add(yendoAderecha ? "coordRitm_vista_derecha" : "coordRitm_vista_izquierda");
        entrada.style.display = "flex";

        // Forzar reflow para que el browser registre la posición inicial
        void entrada.offsetWidth;

        // Mover salida
        salida.classList.remove("coordRitm_vista_active");
        salida.classList.add(yendoAderecha ? "coordRitm_vista_izquierda" : "coordRitm_vista_derecha");

        // Mover entrada al centro
        entrada.classList.remove("coordRitm_vista_derecha", "coordRitm_vista_izquierda");
        entrada.classList.add("coordRitm_vista_active");

        // Actualizar estado
        this.vistaActual = indice;

        // Botón ← visible solo si no estamos en la vista raíz
        if (indice > 0) {
            this.btnBack.classList.add("coordRitm_back_visible");
        } else {
            this.btnBack.classList.remove("coordRitm_back_visible");
        }

        // Ocultar vista anterior después de la transición
        setTimeout(() => {
            this.vistas.forEach((v, i) => {
                if (i !== this.vistaActual) {
                    v.style.display = "none";
                }
            });
        }, 360);

    }

    // --- Apertura / cierre del modal ---

    abrirMenu() {

        if (this.modalCancionero) {
            this.modalCancionero.style.display = "flex";
        }

        if (!this._informeTrackerInicio) {
            const horarioOk = this._puedeAccederActividad();
            if (horarioOk.permitido) {
                this._iniciarInformeTracker();
            } else {
                console.log('[INFORME] Tracker no iniciado:', horarioOk.motivo);
            }
        } else {
            this._registrarReentradaInforme();
        }

        const btn = document.getElementById("coordinacionBtn");
        if (btn) btn.style.display = "none";

    }

    cerrarMenu() {

        if (this.enJuego) {
            this.salir();
        }

        if (this.modalCancionero) {
            this.modalCancionero.style.display = "none";
        }

        this._registrarSalidaInforme();

        const btn = document.getElementById("coordinacionBtn");
        if (btn) btn.style.display = "inline-block";

        this.volver();
        this.vistas.forEach((v, i) => {
            v.style.display = i === 0 ? "flex" : "none";
        });
        this.modoActual = null;
        this._sesionPendiente = null;

    }

    // --- Sesión de juego ---

    cargarSesion(config) {

        this.cancionActual = config;
        this._sesionPendiente = config;

        const sesionKey = config.id || '';
        const sesionDef = SESIONES[sesionKey];
        if (sesionDef && typeof sesionDef.cantidadDesafios === 'number') {
            const data = this._cargarPianoHistorial();
            if (data.cantidadDesafios !== sesionDef.cantidadDesafios) {
                data.cantidadDesafios = sesionDef.cantidadDesafios;
                this._guardarPianoHistorial(data);
            }
        }

        this.titulo.textContent = config.titulo || config.id;
        this.subtitulo.textContent = "Elegí un modo";

        this.navegarA(2);

    }

    // --- Obtener partitura según la sesión actual (Parte A, B, etc.) ---

    _obtenerPartituraActual() {
        const sesionKey = this._sesionPendiente?.id || this.cancionActual?.id || '';
        if (sesionKey.startsWith('sanLorenzo_A')) {
            return MARCHA_SAN_LORENZO_A;
        }
        if (sesionKey.startsWith('sanLorenzo_B')) {
            return MARCHA_SAN_LORENZO;
        }
        return MARCHA_SAN_LORENZO;
    }

    // --- Desafíos: persistencia y progresión ---

    _obtenerNombreJugador() {
return this._cargarJugadores().pianista;
        }

    _cargarInstrumentos() {
        const data = this._cargarPianoHistorial();
        if (!data.instrumentos || !data.instrumentos.pianista || !data.instrumentos.percusionista) {
            data.instrumentos = this._inicializarInstrumentos();
            this._guardarPianoHistorial(data);
        }
        return {
            pianista: this._parsearNombre(data.instrumentos.pianista),
            percusionista: this._parsearNombre(data.instrumentos.percusionista)
        };
    }

    _parsearNombre(valor) {
        if (!valor) return 'Jugador';
        const match = valor.match(/\((.+)\)$/);
        return match ? match[1] : valor;
    }

    _inicializarInstrumentos() {
        const j = this._cargarJugadores();
        return {
            pianista: j.pianista + ' (' + j.pianista + ')',
            percusionista: j.percusionista + ' (' + j.percusionista + ')'
        };
        }

    _guardarInstrumentos(instrumentos) {
        const data = this._cargarPianoHistorial();
        data.instrumentos = instrumentos;
        this._guardarPianoHistorial(data);
    }

    _snapshotInstrumentos() {
        const data = this._cargarPianoHistorial();
        return data.instrumentos || {};
    }

    _intercambiarRoles() {
        const data = this._cargarPianoHistorial();
        if (!data.instrumentos) return;
        const temp = data.instrumentos.pianista;
        data.instrumentos.pianista = data.instrumentos.percusionista;
        data.instrumentos.percusionista = temp;
        this._guardarPianoHistorial(data);
        this._rolUsuario = this._rolUsuario === 'pianista' ? 'percusionista' : 'pianista';
        this._actualizarLabelsInstrumentos();
        this._actualizarIconoSwap();
    }

    _actualizarLabelsInstrumentos() {
        const inst = this._cargarInstrumentos();
        const labelPerc = this.contenedorJuego?.querySelector('.coordRitm_zonaLabel_percusionista');
        const labelPno = this.contenedorJuego?.querySelector('.coordRitm_zonaLabel_pianista');
        if (labelPerc) labelPerc.textContent = inst.percusionista;
        if (labelPno) labelPno.textContent = inst.pianista;
    }

    _actualizarIconoSwap() {
        const wrap = document.getElementById('coordRitm_dragWrap');
        if (!wrap) return;
        const btn = wrap.querySelector('[data-btn-id="swap"]');
        if (!btn) return;
        const label = btn.querySelector('.coordRitm_dragBtnSwap_label');
        if (label) {
            const inst = this._cargarInstrumentos();
            label.textContent = inst.pianista.charAt(0) + '↔' + inst.percusionista.charAt(0);
        }
    }

    _editarNombreLabel(label, campo) {
        if (!this.enJuego) return;
        this._editandoLabel = true;
        const inst = this._cargarInstrumentos();
        const valorActual = inst[campo];
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'coordRitm_zonaLabel_input';
        input.value = valorActual;
        input.maxLength = 20;
        label.textContent = '';
        label.appendChild(input);
        input.focus();
        input.select();
        const guardar = () => {
            this._editandoLabel = false;
            const nuevo = input.value.trim() || valorActual;
            const data = this._cargarPianoHistorial();
            if (data.instrumentos && data.instrumentos[campo]) {
                const stored = data.instrumentos[campo];
                const openParen = stored.lastIndexOf('(');
                if (openParen >= 0) {
                    data.instrumentos[campo] = stored.substring(0, openParen).trim() + `(${nuevo})`;
                } else {
                    data.instrumentos[campo] = `${stored} (${nuevo})`;
                }
            }
            this._guardarPianoHistorial(data);
            label.textContent = nuevo;
            this._actualizarIconoSwap();
        };
        input.addEventListener('blur', guardar);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') { input.value = valorActual; input.blur(); }
        });
    }

    _obtenerClavesCancion() {
        const datos = this.cancionActual || {};
        const cancionKey = datos.id ? datos.id.split('_')[0] : 'sanLorenzo';
        return { cancionKey };
    }

    _cargarPianoHistorial() {
        try {
            const data = JSON.parse(localStorage.getItem('pianoHistorial') || 'null');
            if (data && typeof data === 'object') {
                if (!data.actividad) data.actividad = 'Actividad Musical';
                if (!('tituloCancion' in data)) data.tituloCancion = null;
                if (!data.metricas) data.metricas = { tiempoRealMs: 0, historialDiario: {} };
                if (!('contextoVinculacion' in data)) data.contextoVinculacion = null;
                if (!('ultimoIntentoDenegado' in data)) data.ultimoIntentoDenegado = null;
                if (!('aceptoTerminos' in data)) data.aceptoTerminos = null;
                if (!('paseHorario' in data)) data.paseHorario = null;
                if (!('intentosGpsFallidos' in data)) data.intentosGpsFallidos = 0;
                if (!('bloqueoGpsHasta' in data)) data.bloqueoGpsHasta = null;
                if (!('contadorIntentosDenegados' in data)) data.contadorIntentosDenegados = { gps: 0, horario: 0, bloqueosGps: 0, fechaUltimoReset: null };
                return data;
            }
        } catch { }
        return this._migrarHistorialLegacy();
    }

    _guardarPianoHistorial(data) {
        this._podarPianoHistorial(data);
        localStorage.setItem('pianoHistorial', JSON.stringify(data));
    }

    _podarPianoHistorial(data) {
        if (!data || typeof data !== 'object') return;
        const DOS_SEMANAS_MS = 14 * 24 * 60 * 60 * 1000;
        const UNA_SEMANA_MS = 7 * 24 * 60 * 60 * 1000;
        const ahora = Date.now();
        const semanaActual = this._getSemanaId(ahora);
        const semanaLimite = this._getSemanaId(ahora - DOS_SEMANAS_MS);
        const SEMANAS_PERMITIDAS_DESAFIOS = new Set([semanaActual, semanaLimite]);
        const semanaLimitePracticas = this._getSemanaId(ahora - UNA_SEMANA_MS);
        const SEMANAS_PERMITIDAS_PRACTICAS = new Set([semanaActual, semanaLimitePracticas]);

        if (data.desafio && typeof data.desafio === 'object') {
            for (const ck of Object.keys(data.desafio)) {
                if (typeof data.desafio[ck] !== 'object') continue;
                for (const nid of Object.keys(data.desafio[ck])) {
                    const nivel = data.desafio[ck][nid];
                    if (!nivel || typeof nivel !== 'object') continue;
                    const jugadores = Object.keys(nivel);
                    const entries = [];
                    for (const jug of jugadores) {
                        const e = nivel[jug];
                        if (!e || typeof e !== 'object') continue;
                        const sid = this._getSemanaId(e.fecha || 0);
                        const esLogrado = e.precision >= 90;
                        entries.push({ jug, entry: e, semana: sid, esLogrado });
                    }
                    const filtrados = entries.filter(e => e.esLogrado || SEMANAS_PERMITIDAS_DESAFIOS.has(e.semana));
                    const ordenados = filtrados.sort((a, b) => (b.entry.fecha || 0) - (a.entry.fecha || 0));
                    const acotados = ordenados.slice(0, 3);
                    const nuevoNivel = {};
                    for (const item of acotados) {
                        nuevoNivel[item.jug] = item.entry;
                    }
                    data.desafio[ck][nid] = nuevoNivel;
                }
            }
        }

        if (data.practicas && typeof data.practicas === 'object') {
            for (const ck of Object.keys(data.practicas)) {
                if (typeof data.practicas[ck] !== 'object') continue;
                const semanaIds = Object.keys(data.practicas[ck]).sort().reverse();
                for (const sid of semanaIds) {
                    if (!SEMANAS_PERMITIDAS_PRACTICAS.has(sid)) {
                        delete data.practicas[ck][sid];
                        continue;
                    }
                    const sem = data.practicas[ck][sid];
                    if (sem && Array.isArray(sem.practicas) && sem.practicas.length > 2) {
                        sem.practicas = sem.practicas.slice(-2);
                        sem.cantidadPracticas = (sem.cantidadPracticas || 0) + (sem.practicasAnteriores ? 1 : 0);
                        sem.practicasAnteriores = true;
                    }
                }
            }
        }

        if (Array.isArray(data.telemetria)) {
            if (data.telemetria.length > 1) {
                data.telemetria.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                data.telemetria = [data.telemetria[0]];
            }
        }

        if (data.metricas && typeof data.metricas === 'object' && data.metricas.historialDiario && typeof data.metricas.historialDiario === 'object') {
            for (const fecha of Object.keys(data.metricas.historialDiario)) {
                const ts = new Date(fecha + 'T23:59:59').getTime();
                if (ts < ahora - DOS_SEMANAS_MS) {
                    delete data.metricas.historialDiario[fecha];
                }
            }
        }
    }

    _puedeImputarClase() {
return false;
        }

    _nivelYaSuperado(nivelId) {
        if (!nivelId || nivelId === 'practica') return true;
        const idx = DESAFIO_ORDEN.indexOf(nivelId);
        if (idx === -1 || idx >= DESAFIO_ORDEN.length - 1) return false;
        const siguienteId = DESAFIO_ORDEN[idx + 1];
        return this._estaNivelDesbloqueado(siguienteId);
    }

    _puedeAccederActividad() {
return { permitido: true, motivo: null };
        }

    _paseVigente() {
return true;
        }

    _puedeReportarIntento() {
return true;
        }

    async _registrarIntentoDenegado(dni, motivo, detalles, boton = null) {
return;
        }

    _volverAlMenu() {
        this._mostrarAviso('🕐', 'Se venció tu pase de horario. Volvé a ingresar desde el menú de canciones.');
        this.navegarA(0);
    }

    _iniciarTracker(tipo, modo = 'general') {
        if (this._trackerActivo) this._finalizarTracker();
        this._trackerActivo = true;
        this._trackerTipo = tipo;
        this._trackerModo = modo;
        this._trackerInicioMs = Date.now();
        this._trackerUltimaActividadMs = Date.now();
        this._trackerAcumuladoMs = 0;

        if (modo === 'musical') {
            this._trackerPianoAcumuladoMs = 0;
            this._trackerPianoNotasSinTocar = 0;
            this._trackerPianoPausado = false;
            this._trackerPianoUltimaActividadMs = 0;
            this._trackerPercAcumuladoMs = 0;
            this._trackerPercNotasSinTocar = 0;
            this._trackerPercPausado = false;
            this._trackerPercUltimaActividadMs = 0;
            this._trackerPianoPulsaciones = 0;
            this._trackerCargaMs = 0;
            this._trackerCargaAcumuladaMs = 0;
            this._trackerUltimaCargaMs = 0;
            this._iniciarMonitoreoRendimiento();
        } else if (modo === 'vinculacion') {
            this._trackerCargaAcumuladaMs = 0;
            this._trackerUltimaCargaMs = 0;
            this._iniciarMonitoreoRendimiento();
        }

        this._reanudarIdleTracker();
    }

    _registrarActividadTracker(role) {
        if (!this._trackerActivo) return;
        const ahora = Date.now();

        if (this._trackerModo === 'musical') {
            if (role === 'piano' || role === 'percusion') {
                const isPiano = role === 'piano';
                const acumKey = isPiano ? '_trackerPianoAcumuladoMs' : '_trackerPercAcumuladoMs';
                const notasKey = isPiano ? '_trackerPianoNotasSinTocar' : '_trackerPercNotasSinTocar';
                const pausadoKey = isPiano ? '_trackerPianoPausado' : '_trackerPercPausado';
                const ultimaKey = isPiano ? '_trackerPianoUltimaActividadMs' : '_trackerPercUltimaActividadMs';

                this[notasKey] = 0;
                if (this[pausadoKey]) this[pausadoKey] = false;

                const desde = this[ultimaKey];
                this[ultimaKey] = ahora;
                if (desde > 0 && ahora - desde < 30000 && !this._trackerPausado) {
                    this[acumKey] += ahora - desde;
                }
                if (role === 'piano') {
                    this._trackerPianoPulsaciones = (this._trackerPianoPulsaciones || 0) + 1;
                }
            }
        } else {
            const desde = this._trackerUltimaActividadMs;
            this._trackerUltimaActividadMs = ahora;
            if (ahora - desde < 30000) {
                this._trackerAcumuladoMs += ahora - desde;
            }
        }

        if (this._trackerCargaAcumuladaMs > 0) this._trackerCargaAcumuladaMs = 0;
        this._reanudarIdleTracker();
    }

    _reanudarIdleTracker() {
        clearTimeout(this._idleTimer);
        this._idleTimer = setTimeout(() => {
            if (this._trackerActivo) this._trackerPausado = true;
        }, 30000);
    }

    _finalizarTracker() {
        if (!this._trackerActivo) return;

        if (this._trackerModo === 'musical' || this._trackerModo === 'vinculacion') {
            this._detenerMonitoreoRendimiento();
        }

        let tiempoComputadoMs = 0;

        let tiempoPianoComputadoMs = 0;
        let tiempoPercComputadoMs = 0;

        if (this._trackerModo === 'musical') {
            const pianoMs = this._trackerPianoAcumuladoMs;
            const percMs = this._trackerPercAcumuladoMs;
            const cargaMs = this._trackerCargaMs;
            const pianoActivo = pianoMs > 0;
            const percActivo = percMs > 0;
            const ambosActivos = pianoActivo && percActivo;
            const totalRolMs = pianoMs + percMs;
            const cargaPiano = totalRolMs > 0 ? cargaMs * (pianoMs / totalRolMs) : 0;
            const cargaPerc = totalRolMs > 0 ? cargaMs * (percMs / totalRolMs) : 0;
            tiempoPianoComputadoMs = pianoActivo ? (ambosActivos ? pianoMs + cargaPiano : (pianoMs + cargaPiano) * 0.5) : 0;
            tiempoPercComputadoMs = percActivo ? (ambosActivos ? percMs + cargaPerc : (percMs + cargaPerc) * 0.5) : 0;
            tiempoComputadoMs = tiempoPianoComputadoMs + tiempoPercComputadoMs;
            console.log(`[TRACKER] Finalizar musical: piano=${pianoMs}ms perc=${percMs}ms carga=${cargaMs}ms ambos=${ambosActivos} → pianoFinal=${tiempoPianoComputadoMs}ms percFinal=${tiempoPercComputadoMs}ms total=${tiempoComputadoMs}ms`);
        } else {
            if (!this._trackerPausado) {
                const ahora = Date.now();
                const desde = this._trackerUltimaActividadMs;
                if (ahora - desde < 30000) {
                    this._trackerAcumuladoMs += ahora - desde;
                }
            }
            tiempoComputadoMs = this._trackerAcumuladoMs;
        }

        clearTimeout(this._idleTimer);
        if (tiempoComputadoMs >= 1000) {
            this._guardarMetricasSesion(this._trackerTipo, tiempoComputadoMs, tiempoPianoComputadoMs, tiempoPercComputadoMs);
        }

        this._trackerActivo = false;
        this._trackerTipo = null;
        this._trackerModo = 'general';
        this._trackerAcumuladoMs = 0;
        this._trackerPausado = false;
        this._trackerPianoAcumuladoMs = 0;
        this._trackerPianoNotasSinTocar = 0;
        this._trackerPianoPausado = false;
        this._trackerPianoUltimaActividadMs = 0;
        this._trackerPercAcumuladoMs = 0;
        this._trackerPercNotasSinTocar = 0;
        this._trackerPercPausado = false;
        this._trackerPercUltimaActividadMs = 0;
        this._trackerCargaMs = 0;
        this._trackerCargaAcumuladaMs = 0;
        this._trackerUltimaCargaMs = 0;
    }

    _guardarMetricasSesion(tipo, duracionMs, duracionPianoMs = 0, duracionPercMs = 0) {
        const hoy = new Date().toISOString().slice(0, 10);
        const data = this._cargarPianoHistorial();
        if (!data.metricas || typeof data.metricas !== 'object' || Array.isArray(data.metricas)) data.metricas = { tiempoRealMs: 0, tiempoPianoMs: 0, tiempoPercMs: 0, historialDiario: {} };
        if (!data.metricas.historialDiario || typeof data.metricas.historialDiario !== 'object') data.metricas.historialDiario = {};
        const m = data.metricas;
        if (!m.historialDiario[hoy]) m.historialDiario[hoy] = { minutosReal: 0, minutosPianoReal: 0, minutosPercReal: 0, practicas: 0, vinculacionMin: 0 };
        const dia = m.historialDiario[hoy];
        const minutos = duracionMs / 60000;
        const minutosPiano = duracionPianoMs / 60000;
        const minutosPerc = duracionPercMs / 60000;
        dia.minutosReal += minutos;
        dia.minutosPianoReal = (dia.minutosPianoReal || 0) + minutosPiano;
        dia.minutosPercReal = (dia.minutosPercReal || 0) + minutosPerc;
        if (tipo === 'practica') {
            dia.practicas = Math.min((dia.practicas || 0) + 1, 2);
        }
        if (tipo === 'vinculacion') dia.vinculacionMin += minutos;
        m.tiempoRealMs += duracionMs;
        m.tiempoPianoMs = (m.tiempoPianoMs || 0) + duracionPianoMs;
        m.tiempoPercMs = (m.tiempoPercMs || 0) + duracionPercMs;
        this._guardarPianoHistorial(data);
    }

    // ── Informes periódicos de actividad ──

    _iniciarInformeTracker() {
return;
        }

    _detenerInformeTracker() {
return;
        }

    _registrarSalidaInforme(esBeforeUnload = false) {
return;
        }

    _registrarReentradaInforme() {
return;
        }

    _guardarEstadoTracker() {
return;
        }

    _detectarMotivoSalida() {
return null;
        }

    _cargarTFdP() {
return { accUsuMs: 0, accDispMs: 0, gaps: [] };
        }

    _guardarTFdP(tfdp) {
return;
        }

    async _enviarInformePeriodico() {
return;
        }

    _iniciarLogCuentaRegresiva() {
return;
        }

    // ── Monitoreo de rendimiento del dispositivo (solo tracker musical/vinculación) ──

    _iniciarMonitoreoRendimiento() {
return;
        }

    _verificarFrameLento() {
return;
        }

    _detenerMonitoreoRendimiento() {
return;
        }

    _registrarCargaTracker(duracionMs) {
return;
        }

    // ── Registro de notas del secuenciador (solo modo musical) ──

    _registrarNotaSecuenciador(role) {
        if (!this._trackerActivo || this._trackerModo !== 'musical') return;
        if (this._trackerPausado) return;

        const isPiano = role === 'piano';
        const pausadoKey = isPiano ? '_trackerPianoPausado' : '_trackerPercPausado';
        const notasKey = isPiano ? '_trackerPianoNotasSinTocar' : '_trackerPercNotasSinTocar';

        if (this[pausadoKey]) return;

        this[notasKey]++;
        if (this[notasKey] >= 2) {
            this[pausadoKey] = true;
        }
    }

    _calcularMetricasDerivadas() {
return {};
        }

    _contarDesafiosPasados() {
return 0;
        }

    _ultimoDesafioActivo() {
return { nivelId: '', nombre: '', porcentaje: 0, fecha: 0 };
        }

    _calcularProgresoClase(jugador, rol) {
        const data = this._cargarPianoHistorial();
        const metricas = data.metricas || {};
        const historialMs = rol === 'piano' ? (metricas.tiempoPianoMs || 0) : (metricas.tiempoPercMs || 0);
        const sesionMs = rol === 'piano' ? (this._trackerPianoAcumuladoMs || 0) : (this._trackerPercAcumuladoMs || 0);
        const totalMs = historialMs + sesionMs;
        const totalMin = totalMs / 60000;
        const maxDesafios = data.cantidadDesafios || 3;
        const clasesPorTiempo = Math.floor(totalMin / 65);
        const clasesPorDesafios = this._contarDesafiosPasados();
        const clasesReconocidas = Math.min(clasesPorTiempo, clasesPorDesafios, maxDesafios);
        if (clasesReconocidas >= maxDesafios) return { porcentaje: 100, estado: 'completo', clases: clasesReconocidas, desafios: clasesPorDesafios, maxClases: maxDesafios };
        const siguienteClase = clasesReconocidas + 1;
        const tieneTiempo = clasesPorTiempo >= siguienteClase;
        if (tieneTiempo && clasesPorDesafios < siguienteClase) {
            return { porcentaje: 100, estado: 'trabada', clases: clasesReconocidas, desafios: clasesPorDesafios, maxClases: maxDesafios };
        }
        if (!tieneTiempo) {
            return { porcentaje: Math.floor((totalMin % 65) / 65 * 100), estado: 'avanzando', clases: clasesReconocidas, desafios: clasesPorDesafios, maxClases: maxDesafios };
        }
        return { porcentaje: 100, estado: 'trabada', clases: clasesReconocidas, desafios: clasesPorDesafios, maxClases: maxDesafios };
        }

    _migrarHistorialLegacy() {
        const data = { desafio: {}, practicas: {}, telemetria: [], estadoSolicitud: null, instrumentos: null, actividad: 'Actividad Musical', tituloCancion: null, metricas: { tiempoRealMs: 0, historialDiario: {} }, contextoVinculacion: null };

        try {
            const viejoDesafio = JSON.parse(localStorage.getItem('desafioHistorial') || '{}');
            data.desafio = this._migrarHistorialSiEsNecesario(viejoDesafio);
            localStorage.removeItem('desafioHistorial');
        } catch { }

        try {
            const viejasPracticas = JSON.parse(localStorage.getItem('practicasHistorial') || '{}');
            if (viejasPracticas.estadoSolicitud) {
                data.estadoSolicitud = viejasPracticas.estadoSolicitud;
                delete viejasPracticas.estadoSolicitud;
            }
            data.practicas = viejasPracticas;
            localStorage.removeItem('practicasHistorial');
        } catch { }

        try {
            const viejaTelemetria = JSON.parse(localStorage.getItem('desafioTelemetria') || '[]');
            if (Array.isArray(viejaTelemetria) && viejaTelemetria.length) {
                data.telemetria = viejaTelemetria;
            }
            localStorage.removeItem('desafioTelemetria');
        } catch { }

        this._guardarPianoHistorial(data);
        console.log('[HISTORIAL] Migrado a pianoHistorial:', data);
        return data;
    }

    _cargarHistorialDesafio() {
        return this._cargarPianoHistorial().desafio || {};
    }

    _migrarHistorialSiEsNecesario(data) {
        if (!data || typeof data !== 'object') return {};
        const nivelIds = ['practica', 'pulso', 'coordinacion', 'precision', 'dominio'];
        const esPlano = nivelIds.some(k => data[k] && typeof data[k] === 'object' && 'precision' in data[k]);
        if (!esPlano) return data;
        const migrado = { sanLorenzo: { A: {} } };
        nivelIds.forEach(k => { if (data[k]) migrado.sanLorenzo.A[k] = data[k]; });
        return migrado;
    }

    _guardarHistorialDesafio(nivelId, precision, puntaje, estrellas) {
        const { cancionKey } = this._obtenerClavesCancion();
        const jugador = this._obtenerNombreJugador();
        const data = this._cargarPianoHistorial();
        if (!data.desafio) data.desafio = {};
        const historial = data.desafio;
        if (!historial[cancionKey]) historial[cancionKey] = {};
        if (!historial[cancionKey][nivelId]) historial[cancionKey][nivelId] = {};
        const prev = historial[cancionKey][nivelId][jugador];
        if (!prev || precision > prev.precision) {
            historial[cancionKey][nivelId][jugador] = { precision, puntaje, estrellas, fecha: Date.now(), instrumentos: this._snapshotInstrumentos() };
            this._guardarPianoHistorial(data);
        }
    }

    _cargarTelemetria() {
        const t = this._cargarPianoHistorial().telemetria;
        return Array.isArray(t) ? t : [];
    }

    _guardarTelemetria(sesion) {
        sesion.jugador = this._obtenerNombreJugador();
        const data = this._cargarPianoHistorial();
        if (!Array.isArray(data.telemetria)) data.telemetria = [];
        const registros = data.telemetria;
        const existente = registros.findIndex(r => r.sesionId === sesion.sesionId);
        if (existente >= 0) {
            registros[existente] = sesion;
        } else {
            registros.push(sesion);
        }
        registros.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        if (registros.length > 1) {
            data.telemetria = [registros[0]];
        }
        this._guardarPianoHistorial(data);
    }

    _getSemanaId(timestamp) {
        const d = new Date(timestamp);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        const week1 = new Date(d.getFullYear(), 0, 4);
        const weekNum = 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    }

    _cargarPracticasHistorial() {
        return this._cargarPianoHistorial().practicas || {};
    }

    _guardarPracticasHistorial(sesion) {
        const { cancionKey } = this._obtenerClavesCancion();
        const data = this._cargarPianoHistorial();
        if (!data.practicas) data.practicas = {};
        const historial = data.practicas;
        if (!historial[cancionKey]) historial[cancionKey] = {};

        const semanaId = this._getSemanaId(sesion.timestamp);
        if (!historial[cancionKey][semanaId]) {
            historial[cancionKey][semanaId] = { practicas: [], practicasAnteriores: false, cantidadPracticas: 0 };
        }

        const semana = historial[cancionKey][semanaId];
        const UNA_SEMANA = 7 * 24 * 60 * 60 * 1000;
        const ahora = Date.now();
        const esDeEstaSemana = (ahora - sesion.timestamp) < UNA_SEMANA;

        if (semana.practicas.length < 2 || !esDeEstaSemana) {
            const existente = semana.practicas.findIndex(p => p.sesionId === sesion.sesionId);
            if (existente >= 0) {
                semana.practicas[existente] = sesion;
            } else {
                semana.practicas.push(sesion);
            }
        } else {
            semana.practicas.shift();
            semana.practicas.push(sesion);
            semana.practicasAnteriores = true;
            semana.cantidadPracticas++;
        }

        this._guardarPianoHistorial(data);
    }

    _estaNivelDesbloqueado(nivelId) {
        const nivel = DESAFIO_NIVELES[nivelId];
        if (!nivel || !nivel.requisito) return true;
        const { cancionKey } = this._obtenerClavesCancion();
        const jugador = this._obtenerNombreJugador();
        const historial = this._cargarHistorialDesafio();
        const nivelRequisito = historial[cancionKey]?.[nivel.requisito.nivel];
        const req = nivelRequisito?.[jugador];
        return !!(req && req.precision >= nivel.requisito.precisionMinima);
    }

    _renderizarVistaDesafio() {
        const vista = this.vistaDesafio;
        if (!vista) return;
        vista.innerHTML = '';

        const historial = this._cargarHistorialDesafio();
        const { cancionKey } = this._obtenerClavesCancion();
        const jugador = this._obtenerNombreJugador();
        const niveles = historial[cancionKey] || {};

        DESAFIO_ORDEN.forEach(nivelId => {
            const nivel = DESAFIO_NIVELES[nivelId];
            const desbloqueado = this._estaNivelDesbloqueado(nivelId);
            const prev = niveles[nivelId]?.[jugador];

            const card = document.createElement('div');
            card.className = 'coordRitm_cardNivel' + (desbloqueado ? '' : ' coordRitm_cardNivel_bloqueado');

            let estrellasHtml = '';
            if (prev) {
                estrellasHtml = '<div class="coordRitm_estrellas">' +
                    '⭐'.repeat(prev.estrellas) + '☆'.repeat(5 - prev.estrellas) +
                    '</div>';
            }

            let estadoHtml = '';
            if (!desbloqueado && nivel.requisito) {
                const reqNombre = DESAFIO_NIVELES[nivel.requisito.nivel]?.nombre || nivel.requisito.nivel;
                estadoHtml = `<p class="coordRitm_cardNivel_req">🔒 Requiere ${reqNombre} ≥ ${nivel.requisito.precisionMinima}%</p>`;
            } else if (prev) {
                estadoHtml = `<p class="coordRitm_cardNivel_score">Conjunta: ${Math.round(prev.precision)}%</p>`;
            }

            const bpmTexto = nivel.id === 'practica' ? 'Configurable' : nivel.tempo + ' BPM';

            card.innerHTML =
                `<div class="coordRitm_cardNivel_header">` +
                `<span class="coordRitm_cardNivel_icon">${nivel.icono}</span>` +
                `<div>` +
                `<h3>${nivel.nombre}</h3>` +
                `<p class="coordRitm_parteDesc">${nivel.descripcion}</p>` +
                `</div>` +
                `</div>` +
                `<button class="coordRitm_btnCompanion" data-nivel="${nivelId}" title="Seleccionar compañero">👥</button>` +
                `<div class="coordRitm_cardNivel_footer">` +
                `<span class="coordRitm_cardNivel_bpm">${bpmTexto}</span>` +
                (nivel.vueltas ? `<span class="coordRitm_cardNivel_vueltas">${nivel.vueltas} vueltas</span>` : '') +
                `</div>` +
                estrellasHtml +
                estadoHtml;


            if (desbloqueado) {
                card.addEventListener('click', () => {
                    const inst = this._cargarInstrumentos();
                    this._progresoAlIniciar = {
                        perc: this._calcularProgresoClase(inst.percusionista, 'percusion'),
                        pno: this._calcularProgresoClase(inst.pianista, 'piano')
                    };
                    this._desafioNivel = nivel;
                    this.modoActual = 'desafio';
                    this.iniciar();
                });
            }

            vista.appendChild(card);
        });
    }

    _mostrarTerminosUso() {
return Promise.resolve(true);
        }


    _mostrarAviso(icono, texto) {
        const existente = document.querySelector('.coordRitm_overlayAviso');
        if (existente) existente.remove();

        const overlay = document.createElement('div');
        overlay.className = 'coordRitm_overlayConfirmacion coordRitm_overlayAviso';
        overlay.innerHTML =
            `<div class="coordRitm_overlayConfirmacion_contenido">` +
            `<div class="coordRitm_overlayConfirmacion_icono">${icono}</div>` +
            `<div class="coordRitm_overlayConfirmacion_texto">${texto}</div>` +
            `</div>`;
        document.body.appendChild(overlay);

        const cerrar = () => overlay.remove();
        overlay.addEventListener('click', cerrar);
        setTimeout(cerrar, 3000);
    }

    _mostrarMenuCompaneros(nivelId, evento) {
return;
        }

    _confirmarNuevaSolicitud(nivelId, accion) {
return;
        }

    _recibirSolicitud(nivelId) {
return;
        }

    async _comprobarSolicitud(nivelId) {
return;
        }

    async _fetchRecibirSolicitudes(nivelId) {
return;
        }

    _mostrarSolicitudesRecibidas(nivelId, solicitudes) {
return;
        }

    _confirmarVinculo(nivelId, nombreCompanero, solicitudes) {
return;
        }

    _confirmarDesvinculo(nivelId) {
return;
        }

    async _desvincular(nivelId) {
return;
        }

    async _asentarVinculo(nivelId, nombreCompanero) {
return;
        }

    async _solicitarCompaneros(nivelId, accionCompanero) {
return;
        }

    _mostrarListaCompaneros(nivelId, alumnos) {
return;
        }

    _seleccionarCompanero(nivelId, alumno, duplicado) {
return;
        }

    _mostrarMenuCodigo(nivelId, alumno, sitAlumnoPagina) {
return;
        }

    async _asentarPeticion(nivelId, alumno, codigo, tipoPeticion, sitAlumnoPagina) {
return;
        }

    _guardarEstadoSolicitud(estado, alumnoNombre) {
return;
        }

    _validarEstadoSolicitud(raw) {
return null;
        }

    _obtenerEstadoSolicitud() {
return null;
        }

    _mostrarResultadosDesafio() {
        const a = this._desafioAcum;
        const nivel = this._desafioNivel;
        if (!a || !nivel) return;

        const percPrecision = this._calcularPrecisionDesafio();
        const percCorrectos = a.perfecto + a.bien;

        const pianoA = this._pianoAcum || { totalGolpes: 0, perfecto: 0, bien: 0, adelantado: 0, tarde: 0, fallo: 0, puntaje: 0 };
        const pianoPrecision = this._calcularPrecisionPiano();
        const pianoCorrectos = pianoA.perfecto + pianoA.bien;

        const precisionConjunta = Math.round((percPrecision + pianoPrecision) / 2);
        const puntajeConjunto = Math.round((a.puntaje + pianoA.puntaje) / 2);
        const estrellas = this._calcularEstrellas(precisionConjunta);

        this._guardarHistorialDesafio(nivel.id, precisionConjunta, puntajeConjunto, estrellas);

        let sesionTelemetria = null;
        let feedbackPerc = '';
        let feedbackPno = '';
        if (this.telemetria) {
            this.telemetria.detener();
            const reporte = this.telemetria.obtenerReporte();
            const datosDiag = {
                latenciaAudioMs: reporte.latenciaAudioMs,
                caidasAbruptasFPS: reporte.caidasAbruptasFPS,
                desvioMedioMs: reporte.desvioMedioMs,
                desviacionEstandarMs: reporte.desviacionEstandarMs,
                porcentajeAcierto: precisionConjunta,
            };
            const diagnostico = ProcesadorDiagnostico.interpretar(datosDiag);

            const analisisPerc = AnalizadorRendimiento.analizarPercusion(reporte.notasPercusion, percPrecision, nivel.tempo);
            const analisisPno = AnalizadorRendimiento.analizarPiano(reporte.notasPiano, pianoPrecision, nivel.tempo);
            feedbackPerc = AnalizadorRendimiento.generarFeedbackPercusion(analisisPerc);
            feedbackPno = AnalizadorRendimiento.generarFeedbackPiano(analisisPno);
            const detallePerc = AnalizadorRendimiento.generarDetallePercusion(analisisPerc);
            const detallePno = AnalizadorRendimiento.generarDetallePiano(analisisPno);

            sesionTelemetria = {
                sesionId: 'ses_' + Date.now(),
                nivelId: nivel.id,
                timestamp: Date.now(),
                modalidad: nivel.id,
                datosRendimiento: datosDiag,
                diagnostico,
                analisisPercusion: analisisPerc,
                analisisPiano: analisisPno,
                feedbackPercusion: feedbackPerc,
                feedbackPiano: feedbackPno,
                detallePercusion: detallePerc,
                detallePiano: detallePno,
                ejecucion: {
                    precisionPercusion: percPrecision,
                    precisionPiano: pianoPrecision,
                    precisionConjunta,
                    puntajeConjunto,
                    estrellas,
                    acumPercusion: { ...a },
                    acumPiano: { ...pianoA },
                },
                notasPercusion: reporte.notasPercusion,
                notasPiano: reporte.notasPiano,
                instrumentos: this._snapshotInstrumentos(),
                enviado: false,
            };

            this._guardarTelemetria(sesionTelemetria);
        }

        const overlay = document.createElement('div');
        overlay.className = 'coordRitm_resultados_overlay';

        const percEstrellas = estrellas;
        const pianoEstrellas = estrellas;

        const inst = this._cargarInstrumentos();

        const buildCard = (data) => {
            const s = '⭐'.repeat(data.estrellas) + '☆'.repeat(5 - data.estrellas);
            const gc = data.correctos + '/' + data.acum.totalGolpes;
            const feedbackHtml = data.feedback ?
                `<div class="coordRitm_resultados_feedback">${data.feedback}</div>` : '';
            const nombreHtml = data.nombre ?
                `<div class="coordRitm_resultados_nombre">${data.nombre}</div>` : '';
            const prog = data.progreso;
            const viejo = data.progresoViejo;
            const oldPct = viejo ? viejo.porcentaje : 0;
            const newPct = prog ? prog.porcentaje : 0;
            const claseBarraHtml = prog ? `<div class="coordRitm_clase_info">` +
                `<span class="coordRitm_clase_texto">Clases: ${prog.clases} / ${prog.maxClases || 3}</span>` +
                `<span class="coordRitm_clase_texto">Desafíos: ${prog.desafios}</span>` +
                `</div>` +
                `<div class="coordRitm_clase_barra">` +
                `<div class="coordRitm_clase_barra_fill coordRitm_clase_${prog.estado}" data-old="${oldPct}" data-new="${newPct}"></div>` +
                `</div>` : '';
            return `<div class="coordRitm_resultados_icon">${data.icono}</div>` +
                nombreHtml +
                `<div class="coordRitm_resultados_titulo">${data.titulo}</div>` +
                `<div class="coordRitm_resultados_estrellas">${s}</div>` +
                `<div class="coordRitm_resultados_metricas">` +
                `<div class="coordRitm_resultados_metrica">` +
                `<span class="coordRitm_resultados_valor">${data.precision}%</span>` +
                `<span class="coordRitm_resultados_label">Precisión</span>` +
                `</div>` +
                `<div class="coordRitm_resultados_metrica">` +
                `<span class="coordRitm_resultados_valor">${gc}</span>` +
                `<span class="coordRitm_resultados_label">Golpes</span>` +
                `</div>` +
                `<div class="coordRitm_resultados_metrica">` +
                `<span class="coordRitm_resultados_valor">${data.acum.puntaje}</span>` +
                `<span class="coordRitm_resultados_label">Puntaje</span>` +
                `</div>` +
                `</div>` +
                `<div class="coordRitm_resultados_detalle">` +
                `<span class="coordRitm_detalleperfecto">${data.acum.perfecto}</span>` +
                `<span class="coordRitm_detallebien">${data.acum.bien}</span>` +
                `<span class="coordRitm_detalleadelantado">${data.acum.adelantado}</span>` +
                `<span class="coordRitm_detalletarde">${data.acum.tarde}</span>` +
                `<span class="coordRitm_detallefallo">${data.acum.fallo}</span>` +
                `</div>` +
                claseBarraHtml +
                feedbackHtml;
        };

        const percProgreso = this._calcularProgresoClase(inst.percusionista, 'percusion');
        const pianoProgreso = this._calcularProgresoClase(inst.pianista, 'piano');
        const viejo = this._progresoAlIniciar || {};
        const percHTML = buildCard({ icono: nivel.icono, nombre: inst.percusionista, titulo: 'Percusión', acum: a, precision: percPrecision, correctos: percCorrectos, estrellas: percEstrellas, feedback: feedbackPerc, progreso: percProgreso, progresoViejo: viejo.perc });
        const pianoHTML = buildCard({ icono: '🎹', nombre: inst.pianista, titulo: 'Piano', acum: pianoA, precision: pianoPrecision, correctos: pianoCorrectos, estrellas: pianoEstrellas, feedback: feedbackPno, progreso: pianoProgreso, progresoViejo: viejo.pno });

        const enviarHtml = '';


        overlay.innerHTML =
            `<div class="coordRitm_resultados_card coordRitm_resultados_cardTop">` +
            percHTML +
            `</div>` +
            `<div class="coordRitm_resultados_center">` +
            `<button class="coordRitm_btnResultado coordRitm_btnReintentar">Reintentar</button>` +
            `<button class="coordRitm_btnResultado coordRitm_btnNiveles">Niveles</button>` +
            `</div>` +
            `<div class="coordRitm_resultados_card coordRitm_resultados_cardBottom">` +
            pianoHTML +
            `</div>`;

        this.contenedorJuego?.appendChild(overlay);

        overlay.querySelectorAll('.coordRitm_clase_barra_fill').forEach(bar => {
            const oldW = parseFloat(bar.dataset.old) || 0;
            const newW = parseFloat(bar.dataset.new) || 0;
            bar.style.width = oldW + '%';

            if (newW > oldW) {
                const barraContainer = bar.closest('.coordRitm_clase_barra');
                const card = bar.closest('.coordRitm_resultados_card');
                const estado = bar.classList.contains('coordRitm_clase_completo') ? 'completo' :
                    bar.classList.contains('coordRitm_clase_trabada') ? 'trabada' : 'avanzando';
                const colores = {
                    avanzando: ['#00e5ff', '#76ff03', '#b388ff'],
                    trabada: ['#ffab00', '#ff6d00', '#ffd740'],
                    completo: ['#00e676', '#00c853', '#69f0ae']
                };
                const palette = colores[estado] || colores.avanzando;

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        bar.style.width = newW + '%';
                        if (barraContainer && card) {
                            const barRect = barraContainer.getBoundingClientRect();
                            const cardRect = card.getBoundingClientRect();
                            const barWidth = barRect.width;
                            const startX = (oldW / 100) * barWidth;
                            const endX = (newW / 100) * barWidth;
                            const relY = barRect.bottom - cardRect.top - 2;
                            for (let i = 0; i < 12; i++) {
                                const spark = document.createElement('div');
                                spark.className = 'coordRitm_sparkle';
                                const color = palette[Math.floor(Math.random() * palette.length)];
                                const size = 3 + Math.random() * 5;
                                const delay = i * 0.06 + Math.random() * 0.12;
                                const yOff = -8 + Math.random() * 16;
                                const dur = 0.7 + Math.random() * 0.5;
                                Object.assign(spark.style, {
                                    position: 'absolute',
                                    top: relY + 'px',
                                    left: (barRect.left - cardRect.left + startX) + 'px',
                                    width: size + 'px',
                                    height: size + 'px',
                                    borderRadius: '50%',
                                    background: color,
                                    boxShadow: `0 0 ${6 + Math.random() * 8}px ${color}, 0 0 ${12 + Math.random() * 14}px ${color}`,
                                    zIndex: '10',
                                    pointerEvents: 'none',
                                    animation: `coordRitm_sparkleFly ${dur}s ${delay}s cubic-bezier(0.22,0.61,0.36,1) forwards`,
                                    '--sparkle-target-x': (endX - startX) + 'px',
                                    '--sparkle-y-off': yOff + 'px'
                                });
                                card.appendChild(spark);
                                setTimeout(() => spark.remove(), (delay + dur) * 1000 + 300);
                            }
                        }
                    });
                });
            } else {
                bar.style.width = newW + '%';
            }
        });

        overlay.querySelector('.coordRitm_btnReintentar').addEventListener('click', async () => {
            if (!this._paseVigente()) {
                overlay.remove();
                this._volverAlMenu();
                return;
            }
            overlay.remove();
            this._desafioVuelta = 0;
            this._desafioAcum = {
                totalGolpes: 0, perfecto: 0, bien: 0,
                adelantado: 0, tarde: 0, fallo: 0, puntaje: 0,
            };
            this._pianoAcum = {
                totalGolpes: 0, perfecto: 0, bien: 0,
                adelantado: 0, tarde: 0, fallo: 0, puntaje: 0,
            };
            this.telemetria = null;
            const inst = this._cargarInstrumentos();
            this._progresoAlIniciar = {
                perc: this._calcularProgresoClase(inst.percusionista, 'percusion'),
                pno: this._calcularProgresoClase(inst.pianista, 'piano')
            };
            this._desafioNivel = nivel;
            this.modoActual = 'desafio';
            await this.iniciar();

            const btnPlay = this.contenedorJuego?.querySelector('.coordRitm_dragBtn_play');
            const wrap = this.contenedorJuego?.querySelector('#coordRitm_dragWrap');
            if (btnPlay && wrap) {
                this._togglePlayPause(btnPlay, wrap);
            }
        });

        overlay.querySelector('.coordRitm_btnNiveles').addEventListener('click', () => {
            if (!this._paseVigente()) {
                overlay.remove();
                this._volverAlMenu();
                return;
            }
            overlay.remove();
            this.salir();
            this._renderizarVistaDesafio();
            this.subtitulo.textContent = "Elegí un nivel";
            this.navegarA(3);
        });
    }

    async iniciar() {

        console.log("Iniciando sesión:", this.cancionActual);

        this.enJuego = true;
        this.pausado = false;

        this._iniciarTracker('practica', 'musical');

        this._trackerVisibilityHandler = () => {
            if (document.hidden) {
                this._trackerPausado = true;
                clearTimeout(this._idleTimer);
            } else if (this._trackerActivo) {
                this._trackerPausado = false;
                const ahora = Date.now();
                this._trackerUltimaActividadMs = ahora;
                if (this._trackerModo === 'musical') {
                    if (this._trackerPianoUltimaActividadMs > 0) this._trackerPianoUltimaActividadMs = ahora;
                    if (this._trackerPercUltimaActividadMs > 0) this._trackerPercUltimaActividadMs = ahora;
                }
                this._reanudarIdleTracker();
            }
        };
        document.addEventListener('visibilitychange', this._trackerVisibilityHandler);

        this._trackerUnloadHandler = () => this._finalizarTracker();
        window.addEventListener('beforeunload', this._trackerUnloadHandler);

        const data = this._cargarPianoHistorial();
        data.actividad = 'Actividad Musical';
        const cancionKey = this.cancionActual?.id?.split('_')[0] || this.cancionActual;
        data.tituloCancion = this._titulosCanciones[cancionKey] || this.cancionActual?.titulo || this.cancionActual || null;
        this._guardarPianoHistorial(data);

        await this.entrarFullscreen();
        await this.bloquearLandscape();
        this.crearInterfaz();
        if (this._desafioNivel) {
            this._configurarNivelDesafio();
        } else if (this.modoActual === 'practica') {
            this._desafioAcum = {
                totalGolpes: 0, perfecto: 0, bien: 0,
                adelantado: 0, tarde: 0, fallo: 0, puntaje: 0,
            };
            this._pianoAcum = {
                totalGolpes: 0, perfecto: 0, bien: 0,
                adelantado: 0, tarde: 0, fallo: 0, puntaje: 0,
            };
        }

    }

    async entrarFullscreen() {

        const el = this.modalCancionero;

        if (!el) return;

        try {
            if (el.requestFullscreen) {
                await el.requestFullscreen();
            } else if (el.webkitRequestFullscreen) {
                await el.webkitRequestFullscreen();
            } else if (el.msRequestFullscreen) {
                await el.msRequestFullscreen();
            }
        } catch (e) {
            console.warn("Fullscreen no soportado:", e);
        }

    }

    async bloquearLandscape() {

        try {
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock("landscape");
            }
        } catch (e) {
            console.warn("Orientation lock no soportado:", e);
        }

    }

    crearInterfaz() {

        const existente = this.modalCancionero.querySelector('#coordRitm_juego');
        if (existente) existente.remove();

        // Ocultar contenido del modal (header + vistas)
        const container = this.modalCancionero.querySelector(".modalCancioneroPiano_container");
        if (container) container.style.display = "none";

        const closeBtn = this.modalCancionero.querySelector(".coordRitm_close");
        if (closeBtn) closeBtn.style.display = "none";

        // Datos de la canción / parte
        const datos = this.cancionActual || {};
        const compases = datos.compases || this._obtenerCompases(datos.id);

        // --- Contenedor principal del juego ---
        // Layout: columna — ritmo arriba, piano abajo (cada jugador enfrentado)
        this.contenedorJuego = document.createElement("div");
        this.contenedorJuego.id = "coordRitm_juego";

        // ========================================
        // ZONA SUPERIOR: Ritmo (Jugador B)
        // ========================================
        const zonaRitmo = document.createElement("section");
        zonaRitmo.className = "coordRitm_zona coordRitm_zonaRitmo";

        const labelPercusionista = document.createElement("div");
        labelPercusionista.className = "coordRitm_zonaLabel coordRitm_zonaLabel_percusionista";
        const instPerc = this._cargarInstrumentos();
        labelPercusionista.textContent = instPerc.percusionista;
        labelPercusionista.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            this._editarNombreLabel(labelPercusionista, 'percusionista');
        });
        zonaRitmo.appendChild(labelPercusionista);

        // Fila: selector de instrumento + zona de círculos
        const ritmoContenido = document.createElement("div");
        ritmoContenido.className = "coordRitm_ritmoContenido";

        // Selector de instrumento → se transforma en representación visual
        const selector = document.createElement("div");
        selector.className = "coordRitm_selectorInstrumento";
        selector.id = "coordRitm_selectorInstrumento";

        const instrumentos = [
            { id: "bombo", label: "Bombo Leguero", icon: "🪘" },
            { id: "cajon", label: "Cajón", icon: "📦" }
        ];

        instrumentos.forEach(inst => {
            const btn = document.createElement("button");
            btn.className = "coordRitm_btnInstrumento";
            btn.dataset.instrumento = inst.id;
            btn.innerHTML = `<span class="coordRitm_instIcon">${inst.icon}</span><span class="coordRitm_instLabel">${inst.label}</span>`;
            btn.addEventListener("click", () => this._seleccionarInstrumento(inst.id));
            selector.appendChild(btn);
        });

        // Representación visual del instrumento seleccionado
        const instrumentDisplay = document.createElement("div");
        instrumentDisplay.className = "coordRitm_instrumentDisplay";
        instrumentDisplay.id = "coordRitm_instrumentDisplay";
        instrumentDisplay.style.display = "none";

        const displayAgudo = document.createElement("div");
        displayAgudo.className = "coordRitm_instDisplayZone coordRitm_instDisplayAgudo";

        const displayVisual = document.createElement("div");
        displayVisual.className = "coordRitm_instDisplayVisual";

        const displayGrave = document.createElement("div");
        displayGrave.className = "coordRitm_instDisplayZone coordRitm_instDisplayGrave";

        instrumentDisplay.appendChild(displayAgudo);
        instrumentDisplay.appendChild(displayVisual);
        instrumentDisplay.appendChild(displayGrave);

        // Click en display → volver a mostrar selector
        instrumentDisplay.addEventListener("click", () => {
            this._seleccionarInstrumento(null);
        });

        // Zona de percusión (reemplaza circulosRitmo)
        const percZone = document.createElement("div");
        percZone.className = "coordRitm_percZone";
        percZone.id = "coordRitm_percZone";

        // Divisor visual central (solo decorativo)
        const percDivisor = document.createElement("div");
        percDivisor.className = "coordRitm_percDivisor";

        // Agudo = cerca del centro (arriba), Grave = lejos del centro (abajo)
        const percAguda = document.createElement("div");
        percAguda.className = "coordRitm_percCapa coordRitm_percAguda";
        percAguda.dataset.zona = "agudo";
        percAguda.dataset.label = "AGUDO";

        const percGrave = document.createElement("div");
        percGrave.className = "coordRitm_percCapa coordRitm_percGrave";
        percGrave.dataset.zona = "grave";
        percGrave.dataset.label = "GRAVE";

        percZone.appendChild(percGrave);
        percZone.appendChild(percAguda);
        percZone.appendChild(percDivisor);

        // Cachear referencias a capas de percusión para evitar querySelector en hot path
        this._percAgudaEl = percAguda;
        this._percGraveEl = percGrave;

        // Set para debounce de pointerIds (evita doble disparo en móvil)
        this._percPointerIds = new Set();

        // Inicializar motor de percusión
        this.percusion = null;

        // Eventos de percusión
        const onPercHit = (zona, e) => {
            // Debounce por pointerId: ignorar si ya se procesó este pointer
            if (this._percPointerIds.has(e.pointerId)) return;
            this._percPointerIds.add(e.pointerId);

            e.preventDefault();
            this._registrarActividadTracker('percusion');
            if (!this.percusion) return;
            if (this.enJuego && this.secuenciador?.reproduciendo) {
                this._evaluarGolpePercusion(zona);
            } else {
                const capa = zona === 'agudo' ? percAguda : percGrave;
                capa.classList.remove('flash');
                void capa.offsetWidth;
                capa.classList.add('flash');
                this.percusion.reproducir(this.instrumentoActual, zona);
            }
        };
        const onPercUp = (e) => {
            this._percPointerIds.delete(e.pointerId);
        };
        percAguda.addEventListener('pointerdown', (e) => onPercHit('agudo', e), { passive: false });
        percGrave.addEventListener('pointerdown', (e) => onPercHit('grave', e), { passive: false });
        percAguda.addEventListener('pointerup', onPercUp);
        percGrave.addEventListener('pointerup', onPercUp);
        percAguda.addEventListener('pointercancel', onPercUp);
        percGrave.addEventListener('pointercancel', onPercUp);

        ritmoContenido.appendChild(instrumentDisplay);
        ritmoContenido.appendChild(percZone);

        zonaRitmo.appendChild(selector);
        zonaRitmo.appendChild(ritmoContenido);

        // 3 divisores sutiles — hijos directos de la section (position: relative)
        for (let d = 0; d < 3; d++) {
            const divisor = document.createElement("div");
            divisor.className = "coordRitm_divisorTiempo";
            divisor.style.left = ((d + 1) * 25) + "%";
            zonaRitmo.appendChild(divisor);
        }

        // ========================================
        // BARRA DE TIEMPO — en el medio, doble cara
        // ========================================
        const timeline = document.createElement("div");
        timeline.className = "coordRitm_timeline";
        timeline.id = "coordRitm_timeline";

        // Fila superior (percusionista, rotada 180°): 1 2 3 4 vista al revés
        const filaSuperior = document.createElement("div");
        filaSuperior.className = "coordRitm_timelineFila coordRitm_timelineFilaInvertida";

        // Fila inferior (pianista, normal): 1 2 3 4
        const filaInferior = document.createElement("div");
        filaInferior.className = "coordRitm_timelineFila";

        for (let i = 0; i < 4; i++) {
            const num = (i % 2) + 1; // 1 2 1 2

            // Superior — el percusionista lee 1→2→3→4 hacia su derecha
            const s = document.createElement("span");
            s.className = "coordRitm_marcador";
            s.dataset.index = i;
            s.dataset.fila = "superior";
            s.textContent = num;
            filaSuperior.appendChild(s);

            // Inferior — el pianista lee 1→2→3→4 hacia su derecha
            const inf = document.createElement("span");
            inf.className = "coordRitm_marcador";
            inf.dataset.index = i;
            inf.dataset.fila = "inferior";
            inf.textContent = num;
            filaInferior.appendChild(inf);
        }

        timeline.appendChild(filaSuperior);
        timeline.appendChild(filaInferior);

        // ========================================
        // ZONA INFERIOR: Piano (Jugador A)
        // ========================================
        const zonaPiano = document.createElement("section");
        zonaPiano.className = "coordRitm_zona coordRitm_zonaPiano";

        const labelPianista = document.createElement("div");
        labelPianista.className = "coordRitm_zonaLabel coordRitm_zonaLabel_pianista";
        const instPno = this._cargarInstrumentos();
        labelPianista.textContent = instPno.pianista;
        labelPianista.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            this._editarNombreLabel(labelPianista, 'pianista');
        });
        zonaPiano.appendChild(labelPianista);

        // Zona donde aparecen los círculos del piano
        const circulosPiano = document.createElement("div");
        circulosPiano.className = "coordRitm_campoCirculos coordRitm_campoCirculosPiano";
        circulosPiano.id = "coordRitm_campoCirculosPiano";

        // Zona de animaciones (solo modo desafío/práctica)
        let zonaAnimaciones = null;
        if (this.modoActual === 'desafio' || this.modoActual === 'practica') {
            zonaAnimaciones = document.createElement("div");
            zonaAnimaciones.className = "coordRitm_zonaAnimaciones";
            zonaAnimaciones.id = "coordRitm_zonaAnimaciones";
        }

        // Piano — se genera desde la configuración de la sesión
        const piano = document.createElement("div");
        piano.className = "coordRitm_piano";
        piano.id = "coordRitm_piano";

        this._cargarNotas(piano, datos);

        // Circulito peek — aparece cuando ambos btns están guardados
        const dragPeek = document.createElement("div");
        dragPeek.className = "coordRitm_dragPeek";
        dragPeek.addEventListener("click", () => this._mostrarDrag());

        // Anillo de pulso
        const dragPeekRing = document.createElement("div");
        dragPeekRing.className = "coordRitm_dragPeekRing";

        // --- Botón Swap (intercambiar roles) ---
        const dragBtnSwap = document.createElement("div");
        dragBtnSwap.className = "coordRitm_dragBtn coordRitm_dragBtn_swap";
        dragBtnSwap.dataset.btnId = "swap";

        const swapLabel = document.createElement("div");
        swapLabel.className = "coordRitm_dragBtnSwap_label";
        const instDefault = this._cargarInstrumentos();
        const swapP = (instDefault.pianista || 'P').charAt(0);
        const swapS = (instDefault.percusionista || 'P').charAt(0);
        swapLabel.textContent = swapP + '↔' + swapS;
        dragBtnSwap.appendChild(swapLabel);

        // --- Botón Play/Pause ---
        const dragBtnPlay = document.createElement("div");
        dragBtnPlay.className = "coordRitm_dragBtn coordRitm_dragBtn_play";
        dragBtnPlay.dataset.state = "play";
        dragBtnPlay.dataset.btnId = "play";

        const iconPlay = document.createElement("div");
        iconPlay.className = "coordRitm_dragIcon coordRitm_dragIcon_play";
        iconPlay.innerHTML = '<svg viewBox="0 0 24 24"><polygon points="8,5 19,12 8,19"/></svg>';
        const iconPause = document.createElement("div");
        iconPause.className = "coordRitm_dragIcon coordRitm_dragIcon_pause";
        iconPause.innerHTML = '<svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>';
        dragBtnPlay.appendChild(iconPlay);
        dragBtnPlay.appendChild(iconPause);

        // --- Botón Salir ---
        const dragBtnSalir = document.createElement("div");
        dragBtnSalir.className = "coordRitm_dragBtn coordRitm_dragBtn_salir";
        dragBtnSalir.dataset.btnId = "salir";

        const iconSalir = document.createElement("div");
        iconSalir.className = "coordRitm_dragIcon";
        iconSalir.innerHTML = '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>';
        dragBtnSalir.appendChild(iconSalir);

        // --- Botón Tempo (arriba=+ / abajo=-) ---
        const dragBtnTempo = document.createElement("div");
        dragBtnTempo.className = "coordRitm_dragBtn coordRitm_dragBtn_tempo";
        dragBtnTempo.dataset.btnId = "tempo";

        const tempoUp = document.createElement("div");
        tempoUp.className = "coordRitm_dragBtnTempo_half coordRitm_dragBtnTempo_up";
        tempoUp.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 15l5-5 5 5" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';

        const tempoLabel = document.createElement("div");
        tempoLabel.className = "coordRitm_dragBtnTempo_label";

        const tempoDown = document.createElement("div");
        tempoDown.className = "coordRitm_dragBtnTempo_half coordRitm_dragBtnTempo_down";
        tempoDown.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 9l5 5 5-5" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';

        dragBtnTempo.appendChild(tempoUp);
        dragBtnTempo.appendChild(tempoLabel);
        dragBtnTempo.appendChild(tempoDown);

        // --- Botón Loop ---
        const dragBtnLoop = document.createElement("div");
        dragBtnLoop.className = "coordRitm_dragBtn coordRitm_dragBtn_loop";
        dragBtnLoop.dataset.btnId = "loop";

        const iconLoop = document.createElement("div");
        iconLoop.className = "coordRitm_dragIcon";
        iconLoop.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17 1l4 4-4 4" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M3 11V9a4 4 0 014-4h14" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" stroke-linecap="round" fill="none"/><path d="M7 23l-4-4 4-4" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M21 13v2a4 4 0 01-4 4H3" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>';
        dragBtnLoop.appendChild(iconLoop);

        // --- Botón Metrónomo (arriba=intro / abajo=canción) ---
        const dragBtnMetro = document.createElement("div");
        dragBtnMetro.className = "coordRitm_dragBtn coordRitm_dragBtn_metro";
        dragBtnMetro.dataset.btnId = "metro";

        const metroUp = document.createElement("div");
        metroUp.className = "coordRitm_dragBtnMetro_half coordRitm_dragBtnMetro_up";
        metroUp.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3v3m0 12v3M4.93 4.93l2.12 2.12m9.9 9.9l2.12 2.12M2 12h3m14 0h3M4.93 19.07l2.12-2.12m9.9-9.9l2.12-2.12" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>';
        const metroLabel = document.createElement("div");
        metroLabel.className = "coordRitm_dragBtnMetro_label";
        metroLabel.textContent = 'A+C';
        const metroDown = document.createElement("div");
        metroDown.className = "coordRitm_dragBtnMetro_half coordRitm_dragBtnMetro_down";
        metroDown.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" fill="none"/><circle cx="12" cy="12" r="3" fill="rgba(255,255,255,0.4)"/></svg>';

        dragBtnMetro.appendChild(metroUp);
        dragBtnMetro.appendChild(metroLabel);
        dragBtnMetro.appendChild(metroDown);

        // --- Botón Melodía+Percusión (arriba=melodía / abajo=percusión) ---
        const dragBtnTracks = document.createElement("div");
        dragBtnTracks.className = "coordRitm_dragBtn coordRitm_dragBtn_tracks";
        dragBtnTracks.dataset.btnId = "tracks";

        const tracksUp = document.createElement("div");
        tracksUp.className = "coordRitm_dragBtnTracks_half coordRitm_dragBtnTracks_up";
        tracksUp.innerHTML = '<svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="6" cy="18" r="3" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" fill="none"/><circle cx="18" cy="16" r="3" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" fill="none"/></svg>';

        const tracksLabel = document.createElement("div");
        tracksLabel.className = "coordRitm_dragBtnTracks_label";
        tracksLabel.textContent = 'M+P';

        const tracksDown = document.createElement("div");
        tracksDown.className = "coordRitm_dragBtnTracks_half coordRitm_dragBtnTracks_down";
        tracksDown.innerHTML = '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="16" rx="9" ry="5" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" fill="none"/><path d="M5 16V11c0-2.2 3.6-4 8-4s8 1.8 8 4v5" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" fill="none"/><path d="M12 7V3" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" stroke-linecap="round"/><path d="M8 5l4 2 4-2" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';

        dragBtnTracks.appendChild(tracksUp);
        dragBtnTracks.appendChild(tracksLabel);
        dragBtnTracks.appendChild(tracksDown);
        dragBtnTracks.classList.add('tracksMelodia', 'tracksPercusion');

        // Wrapper
        const dragWrap = document.createElement("div");
        dragWrap.className = "coordRitm_dragWrap oculto";
        dragWrap.id = "coordRitm_dragWrap";
        dragWrap.appendChild(dragPeekRing);
        dragWrap.appendChild(dragPeek);
        dragWrap.appendChild(dragBtnPlay);
        dragWrap.appendChild(dragBtnSalir);
        dragWrap.appendChild(dragBtnTempo);
        dragWrap.appendChild(dragBtnLoop);
        dragWrap.appendChild(dragBtnMetro);
        dragWrap.appendChild(dragBtnTracks);
        dragWrap.appendChild(dragBtnSwap);

        // Salir, tempo, loop, metrónomo, tracks y swap inician guardados
        dragBtnSalir.classList.add('oculto');
        dragBtnTempo.classList.add('oculto');
        dragBtnLoop.classList.add('oculto');
        dragBtnMetro.classList.add('oculto');
        dragBtnTracks.classList.add('oculto');
        dragBtnSwap.classList.add('oculto');
        this._salirVisible = false;
        this._tempoVisible = false;
        this._loopVisible = false;
        this._metroVisible = false;
        this._tracksVisible = false;
        this._swapVisible = false;
        this._loopActivo = false;
        this._metronomoIntro = false;
        this._metronomoCancion = false;
        this._melodiaActiva = true;
        this._percusionActiva = true;
        this._tempoBPM = this._obtenerPartituraActual().tempo;

        this._initDragSystem(dragBtnPlay, dragBtnSalir, dragBtnTempo, dragBtnLoop, dragBtnMetro, dragBtnTracks, dragBtnSwap, dragWrap);
        this._actualizarLabelTempo(dragWrap);

        // Se agrega al contenedorJuego (NO a zonaPiano que tiene overflow:hidden)
        this.contenedorJuego.appendChild(dragWrap);
        if (zonaAnimaciones) zonaPiano.appendChild(zonaAnimaciones);

        // Zona de feedback (solo modo desafío/práctica)
        let feedbackZone = null;
        if (this.modoActual === 'desafio' || this.modoActual === 'practica') {
            feedbackZone = document.createElement("div");
            feedbackZone.className = "coordRitm_feedbackZone";
            feedbackZone.id = "coordRitm_feedbackZone";
            const feedbackText = document.createElement("span");
            feedbackText.className = "coordRitm_feedbackText";
            feedbackText.id = "coordRitm_feedbackText";
            feedbackZone.appendChild(feedbackText);
            zonaPiano.appendChild(feedbackZone);
        }

        zonaPiano.appendChild(piano);

        // ========================================
        // Ensamblar
        // ========================================
        this.contenedorJuego.appendChild(zonaRitmo);
        this.contenedorJuego.appendChild(timeline);
        this.contenedorJuego.appendChild(zonaPiano);

        this.modalCancionero.appendChild(this.contenedorJuego);

        // Seleccionar instrumento por defecto
        this._seleccionarInstrumento("bombo");

    }

    // --- Configuración de sesiones ---

    _obtenerCompases(id) {
        return SESIONES[id]?.compases || ["I", "II", "I", "II"];
    }

    // --- Helpers para animaciones (modo desafío) ---

    _notaInglesAEspanol(nombre) {
        const mapa = { C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si' };
        const match = nombre.match(/^([A-G]#?)(\d)$/);
        if (!match) return nombre;
        const nota = match[1];
        const octava = match[2];
        const esSostenido = nota.includes('#');
        const base = esSostenido ? nota[0] : nota;
        return mapa[base] + (esSostenido ? '#' : '') + octava;
    }

    _mapearPosicionesTeclas() {
        const zonaAnim = this.contenedorJuego?.querySelector('#coordRitm_zonaAnimaciones');
        if (!zonaAnim) return;
        const containerRect = zonaAnim.getBoundingClientRect();
        const pianoEl = this.contenedorJuego?.querySelector('#coordRitm_piano');
        if (!pianoEl) return;

        const teclas = [];
        pianoEl.querySelectorAll('[data-nota]').forEach(tecla => {
            const notaId = tecla.dataset.nota;
            const rect = tecla.getBoundingClientRect();
            teclas.push({
                notaId,
                left: rect.left - containerRect.left,
                right: rect.right - containerRect.left,
                x: rect.left + rect.width / 2 - containerRect.left,
                ancho: rect.width,
                esNegra: tecla.classList.contains('coordRitm_teclaNegra'),
            });
        });

        teclas.sort((a, b) => a.left - b.left);

        const mapa = new Map();
        teclas.forEach((t, i) => {
            const prev = teclas[i - 1];
            const next = teclas[i + 1];
            const carrilLeft = prev ? (prev.right + t.left) / 2 : t.left;
            const carrilRight = next ? (t.right + next.left) / 2 : t.right;
            mapa.set(t.notaId, {
                x: (carrilLeft + carrilRight) / 2,
                carrilAncho: carrilRight - carrilLeft,
                ancho: t.ancho,
                esNegra: t.esNegra,
            });
        });

        this._posicionesTeclas = mapa;
    }

    _crearAnimaciones() {
        if (this.modoActual !== 'desafio') return;

        const zonaAnim = this.contenedorJuego?.querySelector('#coordRitm_zonaAnimaciones');
        if (!zonaAnim || !this._posicionesTeclas) return;

        zonaAnim.innerHTML = "";

        const piso = document.createElement("div");
        piso.className = "coordRitm_floorLine";
        zonaAnim.appendChild(piso);

        const partitura = this._obtenerPartituraActual();
        const MIN_BAR_H = 4;

        const animaciones = [];

        partitura.notas.forEach(ev => {
            if (ev.silencio || !ev.nota) return;

            const notaEsp = this._notaInglesAEspanol(ev.nota);
            const pos = this._posicionesTeclas.get(notaEsp);
            if (!pos) return;

            const barra = document.createElement("div");
            barra.className = "coordRitm_fallingBar";
            barra.style.width = pos.carrilAncho + "px";
            barra.style.left = (pos.x - pos.carrilAncho / 2) + "px";
            barra.style.opacity = "0";

            if (ev.silaba) {
                const txt = document.createElement("span");
                txt.className = "coordRitm_fallingBarText";
                txt.textContent = ev.silaba;
                barra.appendChild(txt);
            }

            zonaAnim.appendChild(barra);

            animaciones.push({
                ev,
                el: barra,
                minH: MIN_BAR_H,
            });
        });

        this._animacionesNotas = animaciones;
    }

    _animarNotas() {
        if (this.modoActual !== 'desafio') return;
        if (!this.secuenciador || !this.secuenciador.reproduciendo) return;

        const ctx = this.motorAudio.ctx;
        if (!ctx) return;

        const zonaAnim = this.contenedorJuego?.querySelector('#coordRitm_zonaAnimaciones');
        if (!zonaAnim) return;

        const now = ctx.currentTime;
        const pulso = this.secuenciador._pulsoASeg;
        const inicio = this.secuenciador._inicioAbsoluto;
        const containerH = zonaAnim.clientHeight;
        const FLOOR_OFFSET = 10;
        const floorY = containerH - FLOOR_OFFSET;
        const APPROACH_SECONDS = 4;
        const VIRTUAL_FACTOR = 2;
        const virtualHeight = containerH * VIRTUAL_FACTOR;
        const totalDistance = virtualHeight - FLOOR_OFFSET;
        const speed = totalDistance / APPROACH_SECONDS;
        const spawnY = -(virtualHeight - containerH);

        this._animacionesNotas.forEach(({ ev, el, minH }) => {
            const attackTime = inicio + ev.inicio * pulso;
            const durSec = ev.duracion * pulso;
            const endTime = attackTime + durSec;
            const spawnTime = attackTime - APPROACH_SECONDS;
            const barH = Math.max(minH, speed * durSec);

            if (now < spawnTime || now > endTime + 0.5) {
                el.style.opacity = "0";
                return;
            }

            el.style.opacity = "1";

            if (now < attackTime) {
                // FASE 1: Cae hacia el piso a velocidad constante
                const barBottom = spawnY + (now - spawnTime) * speed;
                el.style.top = (barBottom - barH) + "px";
                el.style.height = barH + "px";
            } else {
                // FASE 2: Se consume desde abajo — duración exacta de la nota
                const consumo = Math.min(1, (now - attackTime) / durSec);
                const hActual = barH * (1 - consumo);
                el.style.top = (floorY - hActual) + "px";
                el.style.height = hActual + "px";

                const FALLO_GRACE = 0.3;
                if (this._scoring && now > endTime + FALLO_GRACE) {
                    const sn = this._scoring.notasPendientes.find(s => s.ev === ev);
                    if (sn && !sn.jugada) {
                        sn.jugada = true;
                        el.style.background = "#ff1744";
                        if (this._pianoAcum) {
                            this._pianoAcum.totalGolpes++;
                            this._pianoAcum.fallo++;
                        }
                        if (this.telemetria) {
                            this.telemetria.registrarNotaPiano(
                                sn.notaEsp, sn.ev.silaba || '',
                                sn.attackTime * 1000, now * 1000,
                                (now - sn.attackTime) * 1000, 'fallo',
                                sn.durSec * 1000
                            );
                        }
                        console.log(`[FALLO] ${sn.notaEsp} (${sn.ev.silaba || '—'}) | esperado: ${sn.attackTime.toFixed(3)}s | no pulsada → FALLO (0pts)`);
                    }
                }
            }
        });

        this._animFrameId = requestAnimationFrame(() => this._animarNotas());
    }

    _detenerAnimaciones() {
        if (this._animFrameId) {
            cancelAnimationFrame(this._animFrameId);
            this._animFrameId = null;
        }
        const zonaAnim = this.contenedorJuego?.querySelector('#coordRitm_zonaAnimaciones');
        if (zonaAnim) zonaAnim.innerHTML = "";
        this._animacionesNotas = [];
        if (this._scoring?.feedbackTimer) {
            clearTimeout(this._scoring.feedbackTimer);
        }
        this._scoring = null;
    }

    // --- Generador de teclado desde lista de notas ---

    _cargarNotas(pianoEl, datos) {
        const sesion = SESIONES[datos.id] || {};
        const notasVisibles = sesion.notasVisibles || [];
        const notasNegrasVisibles = sesion.notasNegrasVisibles || [];

        // Teclas blancas — de mayor a menor (izquierda al rotar 180°)
        notasVisibles.forEach((notaId, i) => {
            const nota = NOTAS[notaId];
            if (!nota || nota.tipo !== "blanca") return;

            const tecla = document.createElement("button");
            tecla.className = "coordRitm_tecla";
            tecla.dataset.nota = notaId;
            tecla.dataset.index = i;

            const label = document.createElement("span");
            label.className = "coordRitm_teclaLabel";
            label.textContent = nota.nombre + nota.octava;
            tecla.appendChild(label);

            pianoEl.appendChild(tecla);
        });

        // Teclas negras — agrupadas en bloques para mantener la alineación.
        // Bloque "do": Do# / Re#  |  Bloque "fa": Fa# / Sol# / La#  (por octava)
        if (notasNegrasVisibles.length > 0) {
            const capaNegras = document.createElement("div");
            capaNegras.className = "coordRitm_teclasNegras";

            const bloques = {};
            const orden = [];

            notasNegrasVisibles.forEach((notaId) => {
                const nota = NOTAS[notaId];
                if (!nota || nota.tipo !== "negra") return;

                const m = /^([A-Za-z]+)#(\d)$/.exec(notaId);
                if (!m) return;

                const raiz = m[1];
                const octava = m[2];
                const tipo = (raiz === "Do" || raiz === "Re") ? "do" : "fa";
                const clave = tipo + octava;

                if (!bloques[clave]) {
                    bloques[clave] = {
                        clase: "coordRitm_bloqueNegras--" + clave,
                        notas: []
                    };
                    orden.push(clave);
                }
                bloques[clave].notas.push({ notaId: notaId, midi: nota.midi });
            });

            // Orden de izquierda a derecha: por octava, "do" antes que "fa"
            orden.sort((a, b) => {
                const oa = parseInt(a.replace(/\D/g, ""), 10);
                const ob = parseInt(b.replace(/\D/g, ""), 10);
                if (oa !== ob) return oa - ob;
                return a.indexOf("do") === 0 ? -1 : 1;
            });

            orden.forEach((clave) => {
                const bloque = document.createElement("div");
                bloque.className = "coordRitm_bloqueNegras " + bloques[clave].clase;

                bloques[clave].notas.forEach((n) => {
                    const negra = document.createElement("button");
                    negra.className = "coordRitm_teclaNegra";
                    negra.dataset.nota = n.notaId;
                    negra.dataset.midi = n.midi;
                    bloque.appendChild(negra);
                });

                capaNegras.appendChild(bloque);
            });

            pianoEl.appendChild(capaNegras);
        }

        // Glissando: touch y mouse a nivel del contenedor
        this._initGlissando(pianoEl);
    }

    _initGlissando(pianoEl) {
        // --- Touch glissando multi-touch ---
        const touchesActivos = new Map(); // touchId -> teclaEl

        function getTeclaFromTouch(touch) {
            return document.elementFromPoint(touch.clientX, touch.clientY)?.closest('[data-nota]');
        }

        pianoEl.addEventListener('touchstart', (e) => {
            for (const touch of e.changedTouches) {
                const teclaEl = getTeclaFromTouch(touch);
                if (!teclaEl) continue;
                e.preventDefault();
                this._registrarActividadTracker('piano');
                touchesActivos.set(touch.identifier, teclaEl);
                this._tocarTecla(teclaEl.dataset.nota, teclaEl);
            }
        }, { passive: false });

        pianoEl.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (const touch of e.changedTouches) {
                const teclaEl = getTeclaFromTouch(touch);
                const prevTecla = touchesActivos.get(touch.identifier);
                if (teclaEl && teclaEl !== prevTecla) {
                    if (prevTecla) this._soltarTecla(prevTecla);
                    touchesActivos.set(touch.identifier, teclaEl);
                    this._tocarTecla(teclaEl.dataset.nota, teclaEl);
                }
            }
        }, { passive: false });

        const endTouch = (e) => {
            for (const touch of e.changedTouches) {
                const teclaEl = touchesActivos.get(touch.identifier);
                if (teclaEl) this._soltarTecla(teclaEl);
                touchesActivos.delete(touch.identifier);
            }
        };
        pianoEl.addEventListener('touchend', endTouch);
        pianoEl.addEventListener('touchcancel', endTouch);

        // --- Mouse glissando ---
        let mouseDown = false;
        let teclaMouse = null;

        pianoEl.addEventListener('mousedown', (e) => {
            const teclaEl = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-nota]');
            if (!teclaEl) return;
            e.preventDefault();
            this._registrarActividadTracker('piano');
            mouseDown = true;
            teclaMouse = teclaEl;
            this._tocarTecla(teclaEl.dataset.nota, teclaEl);
        });

        document.addEventListener('mousemove', (e) => {
            if (!mouseDown) return;
            const teclaEl = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-nota]');
            if (teclaEl && teclaEl !== teclaMouse) {
                if (teclaMouse) this._soltarTecla(teclaMouse);
                teclaMouse = teclaEl;
                this._tocarTecla(teclaEl.dataset.nota, teclaEl);
            }
        });

        document.addEventListener('mouseup', () => {
            if (!mouseDown) return;
            if (teclaMouse) this._soltarTecla(teclaMouse);
            mouseDown = false;
            teclaMouse = null;
        });
    }

    _seleccionarInstrumento(id) {
        this.instrumentoActual = id;

        const botones = this.contenedorJuego.querySelectorAll(".coordRitm_btnInstrumento");
        botones.forEach(btn => {
            btn.classList.toggle("coordRitm_btnInstrumento_activo", btn.dataset.instrumento === id);
        });

        // Inicializar percusión si no existe
        if (!this.percusion && this.motorAudio.ctx) {
            this.percusion = new Percusion(this.motorAudio.ctx);
        } else if (!this.percusion && this.motorAudio._ensureCtx) {
            this.motorAudio._ensureCtx();
            this.percusion = new Percusion(this.motorAudio.ctx);
        }

        // Mostrar representación visual del instrumento
        const selector = this.contenedorJuego?.querySelector('#coordRitm_selectorInstrumento');
        const display = this.contenedorJuego?.querySelector('#coordRitm_instrumentDisplay');
        if (!selector || !display) return;

        const btns = selector.querySelectorAll('.coordRitm_btnInstrumento');
        const displayAgudo = display.querySelector('.coordRitm_instDisplayAgudo');
        const displayGrave = display.querySelector('.coordRitm_instDisplayGrave');
        const displayVisual = display.querySelector('.coordRitm_instDisplayVisual');

        if (id) {
            btns.forEach(b => b.style.display = 'none');
            display.style.display = 'flex';
            if (id === 'bombo') {
                displayAgudo.textContent = 'ARO';
                displayGrave.textContent = 'PARCHE';
                displayVisual.innerHTML = '<div class="coordRitm_bomboVisual"><div class="coordRitm_bomboAro"></div><div class="coordRitm_bomboParche"></div></div>';
                if (this._percAgudaEl) this._percAgudaEl.dataset.label = 'ARO';
                if (this._percGraveEl) this._percGraveEl.dataset.label = 'PARCHE';
            } else {
                displayAgudo.textContent = 'TAPA';
                displayGrave.textContent = 'CUERPO';
                displayVisual.innerHTML = '<div class="coordRitm_cajonVisual"><div class="coordRitm_cajonTapa"></div><div class="coordRitm_cajonCuerpo"></div></div>';
                if (this._percAgudaEl) this._percAgudaEl.dataset.label = 'TAPA';
                if (this._percGraveEl) this._percGraveEl.dataset.label = 'CUERPO';
            }
        } else {
            btns.forEach(b => b.style.display = '');
            display.style.display = 'none';
            if (this._percAgudaEl) this._percAgudaEl.dataset.label = 'AGUDO';
            if (this._percGraveEl) this._percGraveEl.dataset.label = 'GRAVE';
        }
    }

    _tocarTecla(nota, teclaEl) {
        const esNegra = teclaEl.classList.contains("coordRitm_teclaNegra");
        const claseActiva = esNegra ? "coordRitm_teclaNegra_activa" : "coordRitm_tecla_activa";
        teclaEl.classList.add(claseActiva);
        this.motorAudio.play(nota);
        if ((this.modoActual === 'desafio' || this.modoActual === 'practica') && this._scoring) {
            this._evaluarAtaque(nota);
        }
    }

    _soltarTecla(teclaEl) {
        teclaEl.classList.remove("coordRitm_tecla_activa", "coordRitm_teclaNegra_activa");
        const nota = teclaEl.dataset.nota;
        if (nota) this.motorAudio.stop(nota);
        if ((this.modoActual === 'desafio' || this.modoActual === 'practica') && this._scoring && this._scoring.notaActiva) {
            this._evaluarDuracion(nota);
        }
    }

    _initTeclado() {
        const teclasPresionadas = new Set();

        document.addEventListener('keydown', (e) => {
            if (e.repeat || this._editandoLabel || e.target.tagName === 'INPUT') return;
            const key = e.key.toLowerCase();

            if (key === ' ' && this.enJuego) {
                e.preventDefault();
                const btn = this.contenedorJuego?.querySelector('.coordRitm_dragBtn_play');
                const wrap = this.contenedorJuego?.querySelector('#coordRitm_dragWrap');
                if (btn && wrap && btn.isConnected) this._togglePlayPause(btn, wrap);
                return;
            }

            if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && this.enJuego) {
                if (this._desafioNivel?.bloquearControles) return;
                e.preventDefault();
                const wrap = this.contenedorJuego?.querySelector('#coordRitm_dragWrap');
                if (wrap) this._ajustarTempo(wrap, e.key === 'ArrowUp' ? +1 : -1);
                return;
            }

            if (e.key === 'F1' && this.enJuego) {
                if (this._desafioNivel?.bloquearControles) return;
                e.preventDefault();
                const btn = document.querySelector('.coordRitm_dragBtn_tracks');
                const wrap = document.getElementById('coordRitm_dragWrap');
                if (btn && wrap) this._toggleTracks(btn, wrap, 'melodia');
                return;
            }

            if (e.key === 'F2' && this.enJuego) {
                if (this._desafioNivel?.bloquearControles) return;
                e.preventDefault();
                const btn = document.querySelector('.coordRitm_dragBtn_tracks');
                const wrap = document.getElementById('coordRitm_dragWrap');
                if (btn && wrap) this._toggleTracks(btn, wrap, 'percusion');
                return;
            }

            // Percusión: Numpad
            const percMapping = MAPEO_PERCUSION[e.code];
            if (percMapping && this.enJuego && this.percusion && this.instrumentoActual) {
                e.preventDefault();
                this._registrarActividadTracker('percusion');
                if (this.secuenciador?.reproduciendo) {
                    this._evaluarGolpePercusion(percMapping.zona, percMapping.cuadrante);
                } else {
                    this.percusion.reproducir(this.instrumentoActual, percMapping.zona);
                    const capa = percMapping.zona === 'agudo' ? this._percAgudaEl : this._percGraveEl;
                    if (capa) {
                        capa.classList.remove('flash');
                        void capa.offsetWidth;
                        capa.classList.add('flash');
                    }
                }
                return;
            }

            const notaId = MAPEO_TECLAS[key];
            if (!notaId || !this.enJuego) return;

            e.preventDefault();
            this._registrarActividadTracker('piano');
            teclasPresionadas.add(key);

            const teclaEl = this.contenedorJuego?.querySelector(`[data-nota="${notaId}"]`);
            if (teclaEl) this._tocarTecla(notaId, teclaEl);
        });

        document.addEventListener('keyup', (e) => {
            if (e.target.tagName === 'INPUT') return;
            const key = e.key.toLowerCase();
            if (!teclasPresionadas.has(key)) return;

            teclasPresionadas.delete(key);
            const notaId = MAPEO_TECLAS[key];
            if (!notaId) return;

            const teclaEl = this.contenedorJuego?.querySelector(`[data-nota="${notaId}"]`);
            if (teclaEl) this._soltarTecla(teclaEl);
        });
    }

    // --- Draggable System (Play + Salir + Tempo) ---

    _initDragSystem(btnPlay, btnSalir, btnTempo, btnLoop, btnMetro, btnTracks, btnSwap, wrap) {
        const HITBOX_IN = 70;
        const HITBOX_OUT = 110;
        const allBtns = [btnPlay, btnSalir, btnTempo, btnLoop, btnMetro, btnTracks, btnSwap];
        const others = (btn) => allBtns.filter(b => b !== btn);

        const getCenter = (el) => {
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        };

        const initBtn = (btn) => {
            btn._accDx = 0;
            btn._accDy = 0;
            btn._nearOther = false;
            btn._nearPeek = false;
            btn._nearOtherBtn = null;

            let startX = 0, startY = 0;
            let dragDx = 0, dragDy = 0;
            let dragging = false;

            const checkProximity = () => {
                const bc = getCenter(btn);
                const pc = getCenter(wrap.querySelector('.coordRitm_dragPeek'));

                // Encontrar el otro botón más cercano
                let nearest = null;
                let nearestDist = Infinity;
                for (const other of others(btn)) {
                    const oc = getCenter(other);
                    const d = Math.hypot(oc.x - bc.x, oc.y - bc.y);
                    if (d < nearestDist) { nearestDist = d; nearest = other; }
                }

                const distPeek = Math.hypot(pc.x - bc.x, pc.y - bc.y);

                // Histéresis peek
                if (btn._nearPeek) {
                    if (distPeek > HITBOX_OUT) btn._nearPeek = false;
                } else {
                    if (distPeek < HITBOX_IN) btn._nearPeek = true;
                }

                // Histéresis otro botón
                if (btn._nearOther) {
                    if (nearestDist > HITBOX_OUT || nearest !== btn._nearOtherBtn) {
                        btn._nearOther = false;
                        btn._nearOtherBtn = null;
                    }
                } else {
                    if (nearestDist < HITBOX_IN) {
                        btn._nearOther = true;
                        btn._nearOtherBtn = nearest;
                    }
                }

                // Wrap pulsando
                if (btn._nearPeek || btn._nearOther) {
                    wrap.classList.add('atrapando');
                } else {
                    wrap.classList.remove('atrapando');
                }

                // Efecto 3D en el par
                for (const other of others(btn)) {
                    other.classList.remove('atrapadoNaranja');
                }
                btn.classList.remove('atrapandoNaranja');
                if (btn._nearOther && btn._nearOtherBtn) {
                    btn._nearOtherBtn.classList.add('atrapadoNaranja');
                    btn.classList.add('atrapandoNaranja');
                }
            };

            const onStart = (e) => {
                e.preventDefault();
                const touch = e.touches ? e.touches[0] : e;
                startX = touch.clientX;
                startY = touch.clientY;
                dragDx = 0;
                dragDy = 0;
                dragging = false;
                btn.style.setProperty('transition', 'none', 'important');
                btn.style.setProperty('transform', `translate(${btn._accDx}px, ${btn._accDy}px)`, 'important');
                btn.classList.add('arrastrando');
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onEnd);
                document.addEventListener('touchmove', onMove, { passive: false });
                document.addEventListener('touchend', onEnd);
            };

            const onMove = (e) => {
                e.preventDefault();
                const touch = e.touches ? e.touches[0] : e;
                dragDx = touch.clientX - startX;
                dragDy = touch.clientY - startY;
                if (Math.abs(dragDx) > 3 || Math.abs(dragDy) > 3) dragging = true;
                btn.style.setProperty('transform', `translate(${btn._accDx + dragDx}px, ${btn._accDy + dragDy}px)`, 'important');
                checkProximity();
            };

            const onEnd = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onEnd);
                document.removeEventListener('touchmove', onMove);
                document.removeEventListener('touchend', onEnd);
                btn.classList.remove('arrastrando');

                const inRange = btn._nearPeek || btn._nearOther;

                // Limpiar highlights
                for (const other of others(btn)) {
                    other.classList.remove('atrapadoNaranja');
                }
                btn.classList.remove('atrapandoNaranja');
                btn._nearOther = false;
                btn._nearOtherBtn = null;
                btn._nearPeek = false;
                wrap.classList.remove('atrapando');

                if (!dragging) {
                    btn.style.removeProperty('transition');
                    if (btn.dataset.btnId === 'play') {
                        this._togglePlayPause(btn, wrap);
                    } else if (btn.dataset.btnId === 'salir') {
                        this.salir();
                        this._renderizarVistaDesafio();
                        this.subtitulo.textContent = "Elegí un nivel";
                        this.navegarA(3);
                    } else if (btn.dataset.btnId === 'tempo') {
                        const rect = btn.getBoundingClientRect();
                        const tapY = startY;
                        const midY = rect.top + rect.height / 2;
                        this._ajustarTempo(wrap, tapY < midY ? +1 : -1);
                    } else if (btn.dataset.btnId === 'loop') {
                        this._toggleLoop(btn, wrap);
                    } else if (btn.dataset.btnId === 'metro') {
                        const rect = btn.getBoundingClientRect();
                        const tapY = startY;
                        const midY = rect.top + rect.height / 2;
                        this._toggleMetronomo(btn, wrap, tapY < midY ? 'intro' : 'cancion');
                    } else if (btn.dataset.btnId === 'tracks') {
                        const rect = btn.getBoundingClientRect();
                        const tapY = startY;
                        const midY = rect.top + rect.height / 2;
                        this._toggleTracks(btn, wrap, tapY < midY ? 'melodia' : 'percusion');
                    } else if (btn.dataset.btnId === 'swap') {
                        this._intercambiarRoles();
                    }
                    if (btn._accDx || btn._accDy) {
                        btn.style.transform = `translate(${btn._accDx}px, ${btn._accDy}px)`;
                    } else {
                        btn.style.removeProperty('transform');
                    }
                    return;
                }

                if (inRange) {
                    btn.style.removeProperty('transition');
                    btn.style.removeProperty('transform');
                    if (this._autoHideTimer) {
                        clearTimeout(this._autoHideTimer);
                        this._autoHideTimer = null;
                    }
                    if (btn._nearOther && btn._nearOtherBtn) {
                        this._atraparPar(btn, btn._nearOtherBtn, wrap);
                    } else {
                        this._atraparBtn(btn, wrap);
                    }
                } else {
                    btn._accDx += dragDx;
                    btn._accDy += dragDy;
                    btn.style.setProperty('transform', `translate(${btn._accDx}px, ${btn._accDy}px)`, 'important');
                    btn.style.removeProperty('transition');
                }
            };

            btn.addEventListener('touchstart', onStart, { passive: false });
            btn.addEventListener('mousedown', onStart);
        };

        allBtns.forEach(initBtn);
    }

    _atraparPar(btnA, btnB, wrap) {
        if (this._catchCleanup) this._catchCleanup();
        if (this._autoHideTimer) {
            clearTimeout(this._autoHideTimer);
            this._autoHideTimer = null;
        }

        const pair = [btnA, btnB];
        pair.forEach(btn => {
            const fromDx = btn._accDx || 0;
            const fromDy = btn._accDy || 0;
            btn.style.setProperty('--drag-offset', `translate(${fromDx}px, ${fromDy}px)`);
            btn.classList.add('atrapando');
        });

        let ended = 0;
        const onAnimEnd = (e) => {
            if (e.target !== btnA && e.target !== btnB) return;
            ended++;
            if (ended < 2) return;

            btnA.removeEventListener('animationend', onAnimEnd);
            btnB.removeEventListener('animationend', onAnimEnd);

            pair.forEach(btn => {
                btn.classList.remove('atrapando');
                btn.style.removeProperty('--drag-offset');
                btn.style.transform = '';
                btn._accDx = 0;
                btn._accDy = 0;
                btn.classList.add('oculto');
            });
            this._salirVisible = false;
            this._tempoVisible = false;
            this._loopVisible = false;
            this._metroVisible = false;
            wrap.classList.remove('atrapando');
            wrap.classList.add('oculto');
            this._catchCleanup = null;
            this._actualizarContadorPeek();
        };

        btnA.addEventListener('animationend', onAnimEnd);
        btnB.addEventListener('animationend', onAnimEnd);

        this._catchCleanup = () => {
            btnA.removeEventListener('animationend', onAnimEnd);
            btnB.removeEventListener('animationend', onAnimEnd);
            this._catchCleanup = null;
        };
    }

    _atraparTodos(wrap) {
        const btns = [
            wrap.querySelector('.coordRitm_dragBtn_play'),
            wrap.querySelector('.coordRitm_dragBtn_salir'),
            wrap.querySelector('.coordRitm_dragBtn_tempo'),
            wrap.querySelector('.coordRitm_dragBtn_loop'),
            wrap.querySelector('.coordRitm_dragBtn_metro')
        ].filter(b => b && !b.classList.contains('oculto'));

        if (btns.length === 0) return;
        if (btns.length === 1) { this._atraparBtn(btns[0], wrap); return; }
        if (btns.length === 2) { this._atraparPar(btns[0], btns[1], wrap); return; }

        if (this._catchCleanup) this._catchCleanup();
        if (this._autoHideTimer) {
            clearTimeout(this._autoHideTimer);
            this._autoHideTimer = null;
        }

        btns.forEach(btn => {
            const fromDx = btn._accDx || 0;
            const fromDy = btn._accDy || 0;
            btn.style.setProperty('--drag-offset', `translate(${fromDx}px, ${fromDy}px)`);
            btn.classList.add('atrapando');
        });

        let ended = 0;
        const onAnimEnd = (e) => {
            if (!btns.includes(e.target)) return;
            ended++;
            if (ended < btns.length) return;

            btns.forEach(btn => {
                btn.removeEventListener('animationend', onAnimEnd);
            });

            btns.forEach(btn => {
                btn.classList.remove('atrapando');
                btn.style.removeProperty('--drag-offset');
                btn.style.transform = '';
                btn._accDx = 0;
                btn._accDy = 0;
                btn.classList.add('oculto');
            });
            this._salirVisible = false;
            this._tempoVisible = false;
            this._loopVisible = false;
            this._metroVisible = false;
            wrap.classList.remove('atrapando');
            wrap.classList.add('oculto');
            this._catchCleanup = null;
            this._actualizarContadorPeek();
        };

        btns.forEach(btn => btn.addEventListener('animationend', onAnimEnd));

        this._catchCleanup = () => {
            btns.forEach(btn => btn.removeEventListener('animationend', onAnimEnd));
            this._catchCleanup = null;
        };
    }

    _atraparBtn(btn, wrap) {
        const fromDx = btn._accDx || 0;
        const fromDy = btn._accDy || 0;
        btn.style.setProperty('--drag-offset', `translate(${fromDx}px, ${fromDy}px)`);
        btn.classList.add('atrapando');

        const onAnimEnd = (e) => {
            if (e.target !== btn) return;
            btn.removeEventListener('animationend', onAnimEnd);

            btn.classList.remove('atrapando');
            btn.style.removeProperty('--drag-offset');
            btn.style.transform = '';
            btn._accDx = 0;
            btn._accDy = 0;
            btn.classList.add('oculto');

            if (btn.dataset.btnId === 'salir') {
                this._salirVisible = false;
            } else if (btn.dataset.btnId === 'tempo') {
                this._tempoVisible = false;
            } else if (btn.dataset.btnId === 'loop') {
                this._loopVisible = false;
            } else if (btn.dataset.btnId === 'metro') {
                this._metroVisible = false;
            }

            wrap.classList.remove('atrapando');
            this._actualizarContadorPeek();
        };

        btn.addEventListener('animationend', onAnimEnd);
    }

    _togglePlayPause(btn, wrap) {
        // Cancelar auto-ocultar pendiente si existe
        if (this._autoHideTimer) {
            clearTimeout(this._autoHideTimer);
            this._autoHideTimer = null;
        }

        btn.classList.add('tocando');
        setTimeout(() => btn.classList.remove('tocando'), 300);

        const playing = btn.dataset.state === 'pause';
        btn.dataset.state = playing ? 'play' : 'pause';

        if (playing) {
            btn.classList.remove('playing');
            this.pausar();
        } else {
            setTimeout(() => {
                btn.classList.add('playing', 'glow');
                setTimeout(() => btn.classList.remove('glow'), 600);
            }, 280);
            this.continuar();

            this._autoHideTimer = setTimeout(() => {
                this._autoHideTimer = null;
                this._atraparTodos(wrap);
            }, 500);
        }
    }

    _ajustarTempo(wrap, dir) {
        if (this._desafioNivel?.bloquearControles) return;
        this._tempoBPM = Math.max(60, Math.min(180, this._tempoBPM + dir * 5));
        this._actualizarLabelTempo(wrap);

        const btn = wrap.querySelector('.coordRitm_dragBtn_tempo');
        if (btn) {
            btn.classList.add('tocando');
            setTimeout(() => btn.classList.remove('tocando'), 300);
        }

        if (this.secuenciador && this.secuenciador.reproduciendo) {
            const beatActual = this.secuenciador.cambiarTempo(this._tempoBPM);
            this._pararTimeline();
            this._arrancarTimeline(this._marcadorIdx);
            if (this._timerFinCancion) clearTimeout(this._timerFinCancion);
            const totalBeats = this.secuenciador.partitura.notas.reduce((max, ev) => {
                const fin = ev.inicio + ev.duracion;
                return fin > max ? fin : max;
            }, 0);
            const duracionRestante = (totalBeats - beatActual) * (60 / this._tempoBPM);
            this._timerFinCancion = setTimeout(() => this._finCancion(), duracionRestante * 1000);
        }
    }

    _actualizarLabelTempo(wrap) {
        const label = wrap?.querySelector('.coordRitm_dragBtnTempo_label');
        if (label) label.textContent = this._tempoBPM;
    }

    _toggleLoop(btn) {
        if (this._desafioNivel?.bloquearControles) return;
        this._loopActivo = !this._loopActivo;
        btn.classList.toggle('activo', this._loopActivo);
        btn.classList.add('tocando');
        setTimeout(() => btn.classList.remove('tocando'), 300);
    }

    _toggleMetronomo(btn, wrap, zona) {
        if (this._desafioNivel?.bloquearControles) return;
        if (zona === 'intro') {
            this._metronomoIntro = !this._metronomoIntro;
            btn.classList.toggle('metroIntro', this._metronomoIntro);
        } else {
            this._metronomoCancion = !this._metronomoCancion;
            btn.classList.toggle('metroCancion', this._metronomoCancion);
        }
        this._actualizarLabelMetro(wrap);
        btn.classList.add('tocando');
        setTimeout(() => btn.classList.remove('tocando'), 300);
    }

    _actualizarLabelMetro(wrap) {
        const label = wrap?.querySelector('.coordRitm_dragBtnMetro_label');
        if (!label) return;
        const i = this._metronomoIntro ? 'I' : '-';
        const c = this._metronomoCancion ? 'C' : '-';
        label.textContent = i + '+' + c;
    }

    _toggleTracks(btn, wrap, zona) {
        if (this._desafioNivel?.bloquearControles) return;
        if (zona === 'melodia') {
            this._melodiaActiva = !this._melodiaActiva;
            btn.classList.toggle('tracksMelodia', this._melodiaActiva);
            if (this.secuenciador) {
                this.secuenciador._silenciarMelodia = !this._melodiaActiva;
                if (!this._melodiaActiva) {
                    for (const osc of this.secuenciador._activos) {
                        try { osc.stop(); } catch (e) { }
                    }
                    this.secuenciador._activos = [];
                }
            }
        } else {
            this._percusionActiva = !this._percusionActiva;
            btn.classList.toggle('tracksPercusion', this._percusionActiva);
        }
        this._actualizarLabelTracks(wrap);
        btn.classList.add('tocando');
        setTimeout(() => btn.classList.remove('tocando'), 300);
    }

    _actualizarLabelTracks(wrap) {
        const label = wrap?.querySelector('.coordRitm_dragBtnTracks_label');
        if (!label) return;
        const m = this._melodiaActiva ? 'M' : '-';
        const p = this._percusionActiva ? 'P' : '-';
        label.textContent = m + '+' + p;
    }

    _actualizarContadorPeek() {
        const wrap = document.getElementById('coordRitm_dragWrap');
        if (!wrap) return;
        const counter = wrap.querySelector('.coordRitm_dragPeekCounter');
        if (!counter) return;
        const ocultos = wrap.querySelectorAll('.coordRitm_dragBtn.oculto').length;
        counter.textContent = ocultos;
        counter.classList.toggle('oculto', ocultos === 0);
    }

    _mostrarDrag() {
        const wrap = document.getElementById('coordRitm_dragWrap');
        if (!wrap) return;

        const btnPlay = wrap.querySelector('.coordRitm_dragBtn_play');
        const btnSalir = wrap.querySelector('.coordRitm_dragBtn_salir');
        const btnTempo = wrap.querySelector('.coordRitm_dragBtn_tempo');
        const btnLoop = wrap.querySelector('.coordRitm_dragBtn_loop');
        const btnMetro = wrap.querySelector('.coordRitm_dragBtn_metro');
        const btnTracks = wrap.querySelector('.coordRitm_dragBtn_tracks');
        const btnSwap = wrap.querySelector('.coordRitm_dragBtn_swap');

        const wrapOculto = wrap.classList.contains('oculto');
        const playOculto = btnPlay?.classList.contains('oculto');
        const salirOculto = btnSalir?.classList.contains('oculto');
        const tempoOculto = btnTempo?.classList.contains('oculto');
        const loopOculto = btnLoop?.classList.contains('oculto');
        const metroOculto = btnMetro?.classList.contains('oculto');
        const tracksOculto = btnTracks?.classList.contains('oculto');
        const swapOculto = btnSwap?.classList.contains('oculto');

        // Wrap oculto → extraer play
        if (wrapOculto) {
            wrap.classList.remove('oculto');
            if (btnPlay) btnPlay.classList.remove('oculto');
            this._actualizarContadorPeek();
            return;
        }

        // Play oculto → mostrar
        if (playOculto) {
            btnPlay.classList.remove('oculto');
            this._actualizarContadorPeek();
            return;
        }

        // Salir oculto → mostrar
        if (salirOculto) {
            btnSalir.classList.remove('oculto');
            this._salirVisible = true;
            this._actualizarContadorPeek();
            return;
        }

        // Swap oculto → mostrar
        if (swapOculto) {
            btnSwap.classList.remove('oculto');
            this._swapVisible = true;
            this._actualizarContadorPeek();
            return;
        }

        // Tempo oculto → mostrar
        if (tempoOculto) {
            btnTempo.classList.remove('oculto');
            this._tempoVisible = true;
            this._actualizarContadorPeek();
            return;
        }

        // Loop oculto → mostrar
        if (loopOculto) {
            btnLoop.classList.remove('oculto');
            this._loopVisible = true;
            this._actualizarContadorPeek();
            return;
        }

        // Metro oculto → mostrar
        if (metroOculto) {
            btnMetro.classList.remove('oculto');
            this._metroVisible = true;
            this._actualizarContadorPeek();
            return;
        }

        // Tracks oculto → mostrar
        if (tracksOculto) {
            btnTracks.classList.remove('oculto');
            this._tracksVisible = true;
            this._actualizarContadorPeek();
            return;
        }

        // Todos visibles → guardar todos
        wrap.classList.add('oculto');
        if (btnPlay) btnPlay.classList.add('oculto');
        if (btnSalir) btnSalir.classList.add('oculto');
        if (btnSwap) btnSwap.classList.add('oculto');
        if (btnTempo) btnTempo.classList.add('oculto');
        if (btnLoop) btnLoop.classList.add('oculto');
        if (btnMetro) btnMetro.classList.add('oculto');
        if (btnTracks) btnTracks.classList.add('oculto');
        this._salirVisible = false;
        this._swapVisible = false;
        this._tempoVisible = false;
        this._loopVisible = false;
        this._metroVisible = false;
        this._tracksVisible = false;
        this._actualizarContadorPeek();
    }

    _ocultarDrag() {
        const wrap = document.getElementById('coordRitm_dragWrap');
        if (wrap) wrap.classList.add('oculto');
    }

    pausar() {
        this.pausado = true;
        this._detenerSecuencia();
        this._desactivarVistaPercusion();
    }

    continuar() {
        this.pausado = false;
        this._detenerSecuencia();
        this._iniciarSecuencia();
    }

    salir() {

        this._finalizarTracker();

        if (this._trackerVisibilityHandler) {
            document.removeEventListener('visibilitychange', this._trackerVisibilityHandler);
            this._trackerVisibilityHandler = null;
        }
        if (this._trackerUnloadHandler) {
            window.removeEventListener('beforeunload', this._trackerUnloadHandler);
            this._trackerUnloadHandler = null;
        }

        this.enJuego = false;
        this.pausado = false;
        this._loopActivo = false;
        this._metronomoIntro = false;
        this._metronomoCancion = false;
        this._melodiaActiva = true;
        this._percusionActiva = true;
        this.instrumentoActual = null;
        this.percusion = null;

        const acum = this._desafioAcum;
        const pianoAcum = this._pianoAcum;
        const hayDatosPractica = (acum && acum.totalGolpes > 0) || (pianoAcum && pianoAcum.totalGolpes > 0);
        if (hayDatosPractica && this.modoActual) {
            const nivelId = this._desafioNivel?.id || 'practica';
            const aDef = { totalGolpes: 0, perfecto: 0, bien: 0, adelantado: 0, tarde: 0, fallo: 0, puntaje: 0 };
            const a = acum || aDef;
            const p = pianoAcum || aDef;
            const percPrecision = a.totalGolpes > 0 ? Math.round(((a.perfecto + a.bien) / a.totalGolpes) * 100) : 0;
            const pianoPrecision = p.totalGolpes > 0 ? Math.round(((p.perfecto + p.bien) / p.totalGolpes) * 100) : 0;
            const precisionConjunta = Math.round((percPrecision + pianoPrecision) / 2);
            const puntajeConjunto = Math.round((a.puntaje + p.puntaje) / 2);
            const estrellas = this._calcularEstrellas(precisionConjunta);
            let sesionAlSalir = {
                sesionId: 'ses_' + Date.now(),
                nivelId,
                timestamp: Date.now(),
                modalidad: nivelId,
                jugador: this._obtenerNombreJugador(),
                datosRendimiento: { porcentajeAcierto: precisionConjunta },
                diagnostico: null,
                analisisPercusion: null,
                analisisPiano: null,
                feedbackPercusion: '',
                feedbackPiano: '',
                detallePercusion: '',
                detallePiano: '',
                ejecucion: {
                    precisionPercusion: percPrecision,
                    precisionPiano: pianoPrecision,
                    precisionConjunta,
                    puntajeConjunto,
                    estrellas,
                    acumPercusion: { ...a },
                    acumPiano: { ...p },
                },
                notasPercusion: this.telemetria?.notasPercusion || [],
                notasPiano: this.telemetria?.notasPiano || [],
                instrumentos: this._snapshotInstrumentos(),
                enviado: false,
            };
            if (this.telemetria) {
                this.telemetria.detener();
                const reporte = this.telemetria.obtenerReporte();
                sesionAlSalir.datosRendimiento = {
                    latenciaAudioMs: reporte.latenciaAudioMs,
                    caidasAbruptasFPS: reporte.caidasAbruptasFPS,
                    desvioMedioMs: reporte.desvioMedioMs,
                    desviacionEstandarMs: reporte.desviacionEstandarMs,
                    porcentajeAcierto: precisionConjunta,
                };
                sesionAlSalir.diagnostico = ProcesadorDiagnostico.interpretar(sesionAlSalir.datosRendimiento);
                sesionAlSalir.analisisPercusion = AnalizadorRendimiento.analizarPercusion(reporte.notasPercusion, percPrecision, this._tempoBPM);
                sesionAlSalir.analisisPiano = AnalizadorRendimiento.analizarPiano(reporte.notasPiano, pianoPrecision, this._tempoBPM);
                sesionAlSalir.feedbackPercusion = AnalizadorRendimiento.generarFeedbackPercusion(sesionAlSalir.analisisPercusion);
                sesionAlSalir.feedbackPiano = AnalizadorRendimiento.generarFeedbackPiano(sesionAlSalir.analisisPiano);
                sesionAlSalir.detallePercusion = AnalizadorRendimiento.generarDetallePercusion(sesionAlSalir.analisisPercusion);
                sesionAlSalir.detallePiano = AnalizadorRendimiento.generarDetallePiano(sesionAlSalir.analisisPiano);
                sesionAlSalir.notasPercusion = reporte.notasPercusion;
                sesionAlSalir.notasPiano = reporte.notasPiano;
            }
            this._guardarPracticasHistorial(sesionAlSalir);
        }

        this._desafioNivel = null;
        this._desafioVuelta = 0;
        this._desafioAcum = null;
        this._pianoAcum = null;
        this._scoring = null;
        if (this.telemetria) {
            this.telemetria.detener();
            this.telemetria = null;
        }
        this._restaurarControles();
        this._detenerAnimaciones();
        this._animacionesNotas = [];
        this._posicionesTeclas = null;
        this.motorAudio.stopAll();
        this._detenerSecuencia();
        this._desactivarVistaPercusion();

        if (this._autoHideTimer) {
            clearTimeout(this._autoHideTimer);
            this._autoHideTimer = null;
        }

        // Salir de fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => { });
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }

        // Desbloquear orientación
        try {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            }
        } catch (e) { }

        // Ocultar interfaz de juego
        if (this.contenedorJuego) {
            this.contenedorJuego.remove();
            this.contenedorJuego = null;
        }

        // Restaurar contenido del modal
        const container = this.modalCancionero.querySelector(".modalCancioneroPiano_container");
        if (container) container.style.display = "";

        const closeBtn = this.modalCancionero.querySelector(".coordRitm_close");
        if (closeBtn) closeBtn.style.display = "";

    }

    // ── Secuenciador: inicia, detiene y maneja eventos ──

    async _iniciarSecuencia() {
        if (!this.motorAudio.ctx) this.motorAudio._ensureCtx();
        this.secuenciador = new Secuenciador(this.motorAudio.ctx);
        this.secuenciador.cargar(this._obtenerPartituraActual(), this._tempoBPM);
        this.secuenciador._silenciarMelodia = !this._melodiaActiva;
        await this._preparar();
        if (this.pausado || !this.enJuego) return;
        if (!this._desafioNivel || this._desafioNivel.countIn) {
            await this._contarEntrada(this.secuenciador);
        }
        if (this.pausado || !this.enJuego) return;
        this._initMarcadores();
        this._arrancarTimeline(3);
        this.secuenciador.reproducir({
            onEvento: (ev) => this._onSecuenciaEvento(ev),
            onPercusion: (zona) => this._onPercusionEvento(zona)
        });
        this._activarVistaPercusion();
        if (this.modoActual === 'desafio' || this.modoActual === 'practica') {
            if (!this.telemetria) {
                this.telemetria = new TelemetriaRendimiento(this.motorAudio.ctx);
                this.telemetria.iniciar();
            }
            this._initScoring();
            this._mapearPosicionesTeclas();
            this._crearAnimaciones();
            this._animarNotas();
        }
        const duracion = this.secuenciador.duracionTotal;
        this._timerFinCancion = setTimeout(() => this._finCancion(), duracion * 1000);
    }

    _arrancarTimeline(startIdx) {
        const pulso = 60 / this._tempoBPM * 1000;
        this._marcadorIdx = startIdx;
        this._iluminarMarcador(startIdx, startIdx % 2 === 0);
        if (this._metronomoCancion && this.secuenciador) this.secuenciador.crearClick(startIdx % 2 === 0);
        this._timelineInterval = setInterval(() => {
            this._marcadorIdx = (this._marcadorIdx + 1) % 4;
            this._iluminarMarcador(this._marcadorIdx, this._marcadorIdx % 2 === 0);
            if (this._metronomoCancion && this.secuenciador) this.secuenciador.crearClick(this._marcadorIdx % 2 === 0);
        }, pulso);
    }

    _pararTimeline() {
        if (this._timelineInterval) {
            clearInterval(this._timelineInterval);
            this._timelineInterval = null;
        }
    }

    _detenerSecuencia() {
        this._detenerAnimaciones();
        this._pararTimeline();
        this._marcadorIdx = 0;
        if (this._timerFinCancion) {
            clearTimeout(this._timerFinCancion);
            this._timerFinCancion = null;
        }
        if (this._autoHideTimer) {
            clearTimeout(this._autoHideTimer);
            this._autoHideTimer = null;
        }
        if (this._prepararTimers) {
            this._prepararTimers.forEach(clearTimeout);
            this._prepararTimers = null;
        }
        if (this._countinTimers) {
            this._countinTimers.forEach(clearTimeout);
            this._countinTimers = null;
        }
        this._limpiarOverlay();
        this._desactivarMarcadores();
        if (this.secuenciador) this.secuenciador.detener();
    }

    _finCancion() {
        this._pararTimeline();
        this._timerFinCancion = null;
        this._desactivarMarcadores();
        if (this.secuenciador) this.secuenciador.detener();

        if (this._desafioNivel && this._desafioNivel.vueltas) {
            this._desafioVuelta++;
            if (this._desafioVuelta < this._desafioNivel.vueltas) {
                this._reiniciarMelodia();
                return;
            }
            this._desactivarVistaPercusion();
            this._mostrarResultadosDesafio();
            return;
        }

        if (this._loopActivo) {
            this._reiniciarMelodia();
            return;
        }

        this._desactivarVistaPercusion();

        const wrap = document.getElementById('coordRitm_dragWrap');
        if (wrap) {
            const btnPlay = wrap.querySelector('.coordRitm_dragBtn_play');
            if (btnPlay) {
                btnPlay.dataset.state = 'play';
                btnPlay.classList.remove('playing');
            }
        }
    }

    _reiniciarMelodia() {
        if (!this.secuenciador) return;
        this._detenerAnimaciones();
        this.secuenciador.cargar(this._obtenerPartituraActual(), this._tempoBPM);
        this._initMarcadores();
        this._arrancarTimeline(3);
        this.secuenciador.reproducir({
            onEvento: (ev) => this._onSecuenciaEvento(ev),
            onPercusion: (zona) => this._onPercusionEvento(zona)
        });
        this._desactivarVistaPercusion();
        this._activarVistaPercusion();
        if (this.modoActual === 'desafio' || this.modoActual === 'practica') {
            this._initScoring();
            this._mapearPosicionesTeclas();
            this._crearAnimaciones();
            this._animarNotas();
        }
        const duracion = this.secuenciador.duracionTotal;
        this._timerFinCancion = setTimeout(() => this._finCancion(), duracion * 1000);
    }

    // ── Preparación visual (2 compases sin audio) ──

    _preparar() {
        return new Promise((resolve) => {
            const pulso = 60 / this._tempoBPM * 1000;
            const mensajes = [
                { texto: '¿Preparado?', idx: 0 },
                { texto: '¿Preparado?', idx: 1 },
                { texto: '¡Vaaa!', idx: 2 },
                { texto: '¡Vaaa!', idx: 3 }
            ];

            const overlay = document.createElement('div');
            overlay.className = 'coordRitm_countIn_overlay coordRitm_countIn_suave';
            overlay.textContent = '';
            this.contenedorJuego.appendChild(overlay);

            this._prepararTimers = [];

            mensajes.forEach((msg, i) => {
                const tid = setTimeout(() => {
                    if (!this.enJuego || this.pausado) { this._limpiarOverlay(); resolve(); return; }
                    overlay.textContent = msg.texto;
                    this._iluminarMarcador(msg.idx, false);
                    if (this._metronomoIntro && this.secuenciador) this.secuenciador.crearClick(false);
                }, i * pulso);
                this._prepararTimers.push(tid);
            });

            const tidFinal = setTimeout(() => {
                this._limpiarOverlay();
                resolve();
            }, mensajes.length * pulso);
            this._prepararTimers.push(tidFinal);
        });
    }

    // ── Contador de entrada (count-in) ──

    _contarEntrada(sec) {
        return new Promise((resolve) => {
            const pulso = 60 / this._tempoBPM;
            
            // Mismo pre-conteo que Parte B (impecable): 3 beats → 1, 2, Y...
            // Para Parte A (anacrusa): el último "Y..." cae en beat 0 (anacrusa "Fe")
            // Para Parte B: el último "Y..." cae en beat 0 (primer tiempo "A")
            const pasos = [
                { texto: '1', fuerte: true, idx: 0 },    // beat -3
                { texto: '2', fuerte: false, idx: 1 },   // beat -2
                { texto: 'Y...', fuerte: false, idx: 2 } // beat -1 → cae en beat 0 (anacrusa o downbeat)
            ];

            const overlay = document.createElement('div');
            overlay.className = 'coordRitm_countIn_overlay';
            overlay.textContent = '';
            this.contenedorJuego.appendChild(overlay);

            this._countinTimers = [];

            pasos.forEach((paso, i) => {
                const delay = i * pulso * 1000;

                const tid = setTimeout(() => {
                    if (!this.enJuego || this.pausado) { this._limpiarOverlay(); resolve(); return; }

                    overlay.textContent = paso.texto;
                    overlay.classList.remove('coordRitm_countIn_fuerte', 'coordRitm_countIn_suave');
                    overlay.classList.add(paso.fuerte ? 'coordRitm_countIn_fuerte' : 'coordRitm_countIn_suave');

                    if (this._metronomoIntro) sec.crearClick(paso.fuerte);
                    this._iluminarMarcador(paso.idx, paso.fuerte);

                }, delay);
                this._countinTimers.push(tid);
            });

            const tidFinal = setTimeout(() => {
                this._limpiarOverlay();
                resolve();
            }, pasos.length * pulso * 1000);
            this._countinTimers.push(tidFinal);
        });
    }

    _limpiarOverlay() {
        if (!this.contenedorJuego) return;
        const overlay = this.contenedorJuego.querySelector('.coordRitm_countIn_overlay');
        if (overlay) overlay.remove();
    }

    // ── Timeline markers ──

    _initMarcadores() {
        if (!this.contenedorJuego) return;
        const marcadores = this.contenedorJuego.querySelectorAll('.coordRitm_marcador');
        marcadores.forEach(m => {
            m.classList.remove('coordRitm_marcador_golpe', 'coordRitm_marcador_activo');
        });
    }

    _iluminarMarcador(idx, fuerte) {
        if (!this.contenedorJuego) return;
        const marcadores = this.contenedorJuego.querySelectorAll('.coordRitm_marcador');
        marcadores.forEach(m => {
            m.classList.remove('coordRitm_marcador_golpe', 'coordRitm_marcador_activo');
            if (parseInt(m.dataset.index) === idx) {
                m.classList.add(fuerte ? 'coordRitm_marcador_golpe' : 'coordRitm_marcador_activo');
            }
        });
    }

    _desactivarMarcadores() {
        if (!this.contenedorJuego) return;
        const marcadores = this.contenedorJuego.querySelectorAll('.coordRitm_marcador');
        marcadores.forEach(m => {
            m.classList.remove('coordRitm_marcador_golpe', 'coordRitm_marcador_activo');
        });
    }

    _onSecuenciaEvento(ev) {
        if (!this.enJuego) return;
        this._registrarNotaSecuenciador('piano');

        if (ev.nota) {
            const tecla = this.pianoContainer?.querySelector(`[data-nota="${ev.nota}"]`);
            if (tecla) {
                tecla.classList.add('activa');
                setTimeout(() => tecla.classList.remove('activa'), 200);
            }
        }

        if (ev.silaba && this.onSilaba) {
            this.onSilaba(ev.silaba);
        }
    }

    _onPercusionEvento(zona) {
        if (!this.enJuego || !this.percusion || !this.instrumentoActual) return;
        if (!this._percusionActiva) return;
        this._registrarNotaSecuenciador('percusion');
        this.percusion.reproducir(this.instrumentoActual, zona);
        const capa = zona === 'agudo' ? this._percAgudaEl : this._percGraveEl;
        if (capa) {
            capa.classList.remove('flash');
            void capa.offsetWidth;
            capa.classList.add('flash');
        }
    }

    // ── Configuración de nivel de desafío ──

    _configurarNivelDesafio() {
        if (!this._desafioNivel) return;
        const nivel = this._desafioNivel;

        this._tempoBPM = nivel.tempo;
        this._melodiaActiva = false;
        this._percusionActiva = false;
        this._metronomoCancion = nivel.metronomo;
        this._metronomoIntro = nivel.metronomo;

        this._desafioVuelta = 0;
        this._desafioAcum = {
            totalGolpes: 0, perfecto: 0, bien: 0,
            adelantado: 0, tarde: 0, fallo: 0, puntaje: 0,
        };
        this._pianoAcum = {
            totalGolpes: 0, perfecto: 0, bien: 0,
            adelantado: 0, tarde: 0, fallo: 0, puntaje: 0,
        };

        if (nivel.bloquearControles) this._bloquearControlesDesafio();

        this._seleccionarInstrumento('bombo');
    }

    _bloquearControlesDesafio() {
        const wrap = document.getElementById('coordRitm_dragWrap');
        if (wrap) {
            ['loop', 'tempo', 'metro', 'tracks'].forEach(id => {
                const btn = wrap.querySelector(`[data-btn-id="${id}"]`);
                if (btn) {
                    btn.classList.add('oculto');
                    btn.classList.add('bloqueadoDesafio');
                }
            });
        }

    }

    _restaurarControles() {
        const wrap = document.getElementById('coordRitm_dragWrap');
        if (wrap) {
            ['loop', 'tempo', 'metro', 'tracks'].forEach(id => {
                const btn = wrap.querySelector(`[data-btn-id="${id}"]`);
                if (btn) btn.classList.remove('bloqueadoDesafio');
            });
        }
    }

    _calcularPrecisionDesafio() {
        const a = this._desafioAcum;
        if (!a || a.totalGolpes === 0) return 0;
        return Math.round(((a.perfecto + a.bien) / a.totalGolpes) * 100);
    }

    _calcularPrecisionPiano() {
        const a = this._pianoAcum;
        if (!a || a.totalGolpes === 0) return 0;
        return Math.round(((a.perfecto + a.bien) / a.totalGolpes) * 100);
    }

    _calcularEstrellas(precision) {
        if (precision >= 95) return 5;
        if (precision >= 90) return 4;
        if (precision >= 80) return 3;
        if (precision >= 70) return 2;
        if (precision >= 50) return 1;
        return 0;
    }

    // ── Vista de percusión durante reproducción ──
    //
    // Modelo visual: 2 paneles estáticos + reseteo alternado
    //   Panel A: Compás 1 del ciclo → grave(dur1) + agudo(dur1) = 2 óvalos
    //   Panel B: Compás 2 del ciclo → grave(0.75) + grave(0.25) + agudo(1) = 3 óvalos
    //   Reseteo: Panel A en beats 3,7,11... | Panel B en beats 5,9,13...
    //   Sin animación de movimiento, solo óvalos apareciendo y llenándose

    _activarVistaPercusion() {
        if (!this.contenedorJuego) return;

        const selector = this.contenedorJuego.querySelector('#coordRitm_selectorInstrumento');
        const display = this.contenedorJuego.querySelector('#coordRitm_instrumentDisplay');
        const percZone = this.contenedorJuego.querySelector('#coordRitm_percZone');
        if (!percZone) return;

        if (selector) selector.style.display = 'none';
        if (display) display.style.display = 'none';
        percZone.classList.add('playing');

        this._percOvalos = [];
        this._percCicloA = 0;
        this._percCicloB = 0;
        // Debug flag para logs de percusión (desactivado en producción para performance)
        this._debugPerc = false;

        this._renderizarCompasesIniciales();

        if (!this._percAnimLoopActivo) {
            this._percAnimLoopActivo = true;
            this._animationFrame();
        }
    }

    _desactivarVistaPercusion() {
        this._percAnimLoopActivo = false;
        this._percOvalos = [];

        if (!this.contenedorJuego) return;

        const selector = this.contenedorJuego.querySelector('#coordRitm_selectorInstrumento');
        const display = this.contenedorJuego.querySelector('#coordRitm_instrumentDisplay');
        const percZone = this.contenedorJuego.querySelector('#coordRitm_percZone');

        if (selector) selector.style.display = '';
        if (display) display.style.display = this.instrumentoActual ? 'flex' : 'none';
        if (percZone) {
            percZone.classList.remove('playing');
            const vis = percZone.querySelector('.coordRitm_percVis');
            if (vis) vis.remove();
        }
    }

    _renderizarCompasesIniciales() {
        const percZone = this.contenedorJuego?.querySelector('#coordRitm_percZone');
        if (!percZone) return;

        const vis = document.createElement('div');
        vis.className = 'coordRitm_percVis';

        const track = document.createElement('div');
        track.className = 'coordRitm_percTrack';
        this._percTrack = track;

        this._percPanelA = document.createElement('div');
        this._percPanelA.className = 'coordRitm_percMeasure';

        this._percPanelB = document.createElement('div');
        this._percPanelB.className = 'coordRitm_percMeasure';

        const pulso = this.secuenciador._pulsoASeg;
        const inicio = this.secuenciador._inicioAbsoluto;
        const cycleStartTime = inicio + 1 * pulso;

        this._crearOvalosEnPanel(this._percPanelA, 0, 'compas1', cycleStartTime);
        this._crearOvalosEnPanel(this._percPanelB, 0, 'compas2', cycleStartTime);

        track.appendChild(this._percPanelB);
        track.appendChild(this._percPanelA);

        vis.appendChild(track);
        percZone.appendChild(vis);
    }

    _crearOvalosEnPanel(panel, cicloIdx, compasTipo, appearTime) {
        panel.innerHTML = '';

        const pulso = this.secuenciador._pulsoASeg;
        const inicio = this.secuenciador._inicioAbsoluto;
        const baseBeat = 1 + cicloIdx * 4;
        const beatsPorCompas = 2;

        let offsets;
        if (compasTipo === 'compas1') {
            offsets = [
                { offset: 0, zona: 'grave', duracion: 1 },
                { offset: 1, zona: 'agudo', duracion: 1 },
            ];
        } else {
            offsets = [
                { offset: 2, zona: 'grave', duracion: 0.75 },
                { offset: 2.75, zona: 'grave', duracion: 0.25 },
                { offset: 3, zona: 'agudo', duracion: 1 },
            ];
        }

        for (const { offset, zona, duracion } of offsets) {
            const absoluteBeat = baseBeat + offset;
            const hitTime = inicio + absoluteBeat * pulso;

            const oval = document.createElement('div');
            oval.className = 'coordRitm_percOval';

            const panelOffset = compasTipo === 'compas1' ? offset : offset - 2;
            oval.style.right = (panelOffset / beatsPorCompas * 100) + '%';
            oval.style.width = (duracion / beatsPorCompas * 100) + '%';

            if (zona === 'agudo') {
                oval.classList.add('coordRitm_percOval--agudo');
                oval.style.setProperty('--oval-color', 'rgba(100, 200, 255, 0.5)');
            } else {
                oval.classList.add('coordRitm_percOval--grave');
                oval.style.setProperty('--oval-color', 'rgba(255, 140, 100, 0.5)');
            }

            oval.style.setProperty('--progress', '0');
            oval.style.opacity = '0';

            panel.appendChild(oval);

            this._percOvalos.push({
                elemento: oval,
                tiempoAparicion: appearTime,
                tiempoGolpe: hitTime,
                golpeado: false,
                estado: 'PENDIENTE',
                evento: { inicio: absoluteBeat, zona, duracion },
                cicloIdx: cicloIdx,
            });
        }
    }

    _resetearPanelCompas(panel, cicloIdx, compasTipo, appearTime) {
        // Filtrar ovales ANTES de limpiar el panel: remover los que pertenecen a ESTE panel
        this._percOvalos = this._percOvalos.filter(o => o.elemento.parentElement !== panel);
        this._limpiarFeedbackPanel(panel);
        panel.innerHTML = '';
        this._crearOvalosEnPanel(panel, cicloIdx, compasTipo, appearTime);
    }

    _animationFrame() {
        if (!this._percAnimLoopActivo) return;

        this._actualizarOvalos();
        this._verificarReset();

        requestAnimationFrame(() => this._animationFrame());
    }

    _actualizarOvalos() {
        if (!this.secuenciador || !this.secuenciador.reproduciendo) return;
        const now = this.secuenciador.ctx.currentTime;

        for (const o of this._percOvalos) {
            if (o.golpeado) continue;

            if (now < o.tiempoAparicion) {
                o.elemento.style.opacity = '0';
                continue;
            }

            o.elemento.style.opacity = '1';

            const duracion = o.tiempoGolpe - o.tiempoAparicion;
            const progress = duracion > 0
                ? Math.min(1, Math.max(0, (now - o.tiempoAparicion) / duracion))
                : (now >= o.tiempoGolpe ? 1 : 0);
            o.elemento.style.setProperty('--progress', progress);

            if (now > o.tiempoGolpe + 0.3) {
                this._marcarFalloPercusion(o);
            }
        }
    }

    _verificarReset() {
        if (!this.secuenciador || !this.secuenciador.reproduciendo) return;
        const now = this.secuenciador.ctx.currentTime;
        const beatActual = (now - this.secuenciador._inicioAbsoluto) / this.secuenciador._pulsoASeg;
        const inicio = this.secuenciador._inicioAbsoluto;
        const pulso = this.secuenciador._pulsoASeg;

        // La partitura dura ~95 beats → 24 ciclos de 4 beats (0-23)
        const totalCiclos = 24;

        const proxResetA = 3 + 4 * this._percCicloA;
        if (beatActual >= proxResetA && this._percCicloA < totalCiclos - 1) {
            this._percCicloA++;
            this._resetearPanelCompas(this._percPanelA, this._percCicloA, 'compas1', inicio + proxResetA * pulso);
        }

        const proxResetB = 4 + 4 * this._percCicloB;
        if (beatActual >= proxResetB && this._percCicloB < totalCiclos - 1) {
            this._percCicloB++;
            this._resetearPanelCompas(this._percPanelB, this._percCicloB, 'compas2', inicio + proxResetB * pulso);
        }
    }

    _evaluarGolpePercusion(zona, cuadrante) {
        if (!this.enJuego || !this.percusion || !this.instrumentoActual) return;
        if (!this.secuenciador || !this.secuenciador.reproduciendo) return;

        const now = this.secuenciador.ctx.currentTime;
        const inicio = this.secuenciador._inicioAbsoluto;
        const pulso = this.secuenciador._pulsoASeg;
        const beatActual = (now - inicio) / pulso;

        this.percusion.reproducir(this.instrumentoActual, zona);

        // Usar elementos cacheados en lugar de querySelector
        const capa = zona === 'agudo' ? this._percAgudaEl : this._percGraveEl;
        if (capa) {
            capa.classList.remove('flash');
            void capa.offsetWidth;
            capa.classList.add('flash');
        }

        let mejorOval = null;
        let mejorDiff = Infinity;

        if (cuadrante !== undefined) {
            const cicloActual = Math.floor((beatActual - 1) / 4);

            for (const ciclo of [cicloActual - 1, cicloActual, cicloActual + 1]) {
                if (ciclo < 0 || ciclo >= 12) continue;

                const baseBeat = 1 + ciclo * 4;
                let targetBeats;
                switch (cuadrante) {
                    case 0: targetBeats = [baseBeat]; break;
                    case 1: targetBeats = [baseBeat + 1]; break;
                    case 2: targetBeats = [baseBeat + 2, baseBeat + 2.75]; break;
                    case 3: targetBeats = [baseBeat + 3]; break;
                }

                // Debug: solo log si no es móvil o si se fuerza
                if (this._debugPerc) console.log(`[PERC] ${zona} cuad=${cuadrante} | beat=${beatActual.toFixed(2)} ciclo=${ciclo} targets=${JSON.stringify(targetBeats)}`);

                for (const o of this._percOvalos) {
                    if (o.golpeado) continue;
                    if (o.evento.zona !== zona) continue;
                    if (!targetBeats.includes(o.evento.inicio)) continue;

                    const diff = Math.abs(now - o.tiempoGolpe);
                    if (diff < mejorDiff && diff < 0.5) {
                        mejorDiff = diff;
                        mejorOval = o;
                    }
                }
            }

            if (!mejorOval) {
                const disponibles = this._percOvalos
                    .filter(o => !o.golpeado && o.evento.zona === zona)
                    .map(o => `beat=${o.evento.inicio} golpe=${o.tiempoGolpe.toFixed(3)}s`)
                    .join(', ');
                if (this._debugPerc) console.log(`[PERC] SIN MATCH | disponibles: [${disponibles}]`);
            }
        } else {
            for (const o of this._percOvalos) {
                if (o.golpeado) continue;
                if (o.evento.zona !== zona) continue;

                const durTotal = o.tiempoGolpe - o.tiempoAparicion;
                if (durTotal > 0) {
                    const progressActual = Math.min(1, Math.max(0, (now - o.tiempoAparicion) / durTotal));
                    if (progressActual < 0.85) continue;
                }

                const diff = Math.abs(now - o.tiempoGolpe);
                if (diff < mejorDiff && diff < 0.5) {
                    mejorDiff = diff;
                    mejorOval = o;
                }
            }
        }

        if (!mejorOval) return;

        mejorOval.golpeado = true;
        const diffMs = (now - mejorOval.tiempoGolpe) * 1000;
        const absDiff = Math.abs(diffMs);

        let texto, clase, colorClass;
        if (absDiff <= 70) {
            texto = 'PERFECTO';
            clase = 'perfecto';
            colorClass = 'coordRitm_percOval--perfecto';
        } else if (absDiff <= 150) {
            texto = 'BIEN';
            clase = 'bien';
            colorClass = 'coordRitm_percOval--bien';
        } else if (diffMs < -150) {
            texto = 'ADELANTADO';
            clase = 'adelantado';
            colorClass = 'coordRitm_percOval--adelantado';
        } else if (diffMs > 150) {
            texto = 'TARDE';
            clase = 'tarde';
            colorClass = 'coordRitm_percOval--tarde';
        } else {
            texto = 'FALLÓ';
            clase = 'fallo';
            colorClass = 'coordRitm_percOval--fallo';
        }

        if (this._debugPerc) console.log(`[PERC] ${texto} | ${zona} beat=${mejorOval.evento.inicio} | esperado=${mejorOval.tiempoGolpe.toFixed(3)}s real=${now.toFixed(3)}s diff=${diffMs > 0 ? '+' : ''}${Math.round(diffMs)}ms`);

        mejorOval.estado = clase.toUpperCase();
        mejorOval.elemento.classList.add(colorClass);
        this._mostrarFeedbackPercusion(mejorOval.elemento, texto, clase);

        if (this._desafioNivel && this._desafioAcum) {
            this._desafioAcum.totalGolpes++;
            if (clase === 'perfecto') { this._desafioAcum.perfecto++; this._desafioAcum.puntaje += 100; }
            else if (clase === 'bien') { this._desafioAcum.bien++; this._desafioAcum.puntaje += 80; }
            else if (clase === 'adelantado' || clase === 'tarde') { this._desafioAcum[clase]++; this._desafioAcum.puntaje += 50; }
            else { this._desafioAcum.fallo++; }
        }

        if (this.telemetria) {
            this.telemetria.registrarNotaPercusion(
                zona,
                mejorOval.tiempoGolpe * 1000, now * 1000,
                diffMs, clase
            );
        }
    }

    _marcarFalloPercusion(oval) {
        if (oval.golpeado) return;
        if (this._debugPerc) console.log(`[PERC] FALLÓ (auto) | ${oval.evento.zona} beat=${oval.evento.inicio} | esperado=${oval.tiempoGolpe.toFixed(3)}s`);
        oval.golpeado = true;
        oval.estado = 'FALLO';
        oval.elemento.classList.add('coordRitm_percOval--fallo');
        this._mostrarFeedbackPercusion(oval.elemento, 'FALLÓ', 'fallo');

        if (this._desafioNivel && this._desafioAcum) {
            this._desafioAcum.totalGolpes++;
            this._desafioAcum.fallo++;
        }

        if (this.telemetria) {
            const ctx = this.motorAudio.ctx;
            const now = ctx ? ctx.currentTime : 0;
            this.telemetria.registrarNotaPercusion(
                oval.evento.zona,
                oval.tiempoGolpe * 1000, now * 1000,
                (now - oval.tiempoGolpe) * 1000, 'fallo'
            );
        }
    }

    _mostrarFeedbackPercusion(ovalEl, texto, clase) {
        const fbAnterior = ovalEl.querySelector('.coordRitm_percFeedback');
        if (fbAnterior) fbAnterior.remove();

        const fb = document.createElement('div');
        fb.className = 'coordRitm_percFeedback coordRitm_percFeedback--' + clase;
        fb.textContent = texto;

        ovalEl.appendChild(fb);
        const timerId = setTimeout(() => fb.remove(), 850);
        fb._timerId = timerId;
    }

    _limpiarFeedbackPanel(panel) {
        if (!panel) return;
        panel.querySelectorAll('.coordRitm_percFeedback').forEach(fb => {
            if (fb._timerId) clearTimeout(fb._timerId);
            fb.remove();
        });
        panel.querySelectorAll('.coordRitm_percOval').forEach(o => {
            o.classList.remove(
                'coordRitm_percOval--perfecto',
                'coordRitm_percOval--bien',
                'coordRitm_percOval--adelantado',
                'coordRitm_percOval--tarde',
                'coordRitm_percOval--fallo'
            );
        });
    }

    // ═══════════════════════════════════════════
    // SISTEMA DE PUNTUACIÓN (modo desafío)
    // ═══════════════════════════════════════════

    _initScoring() {
        this._scoring = {
            notasPendientes: [],
            notaActiva: null,
            pressTime: 0,
            puntaje: 0,
            totalNotas: 0,
            feedbackTimer: null,
        };

        const pulso = this.secuenciador._pulsoASeg;
        const inicio = this.secuenciador._inicioAbsoluto;

        this._obtenerPartituraActual().notas.forEach(ev => {
            if (ev.silencio || !ev.nota) return;
            this._scoring.notasPendientes.push({
                ev,
                notaEsp: this._notaInglesAEspanol(ev.nota),
                attackTime: inicio + ev.inicio * pulso,
                durSec: ev.duracion * pulso,
                evaluada: false,
                jugada: false,
            });
        });

        this._scoring.totalNotas = this._scoring.notasPendientes.length;
        console.log(`[SCORING] ${this._scoring.totalNotas} notas a evaluar. Modo desafío activo.`);
    }

    _buscarNotaCercana(notaId) {
        if (!this._scoring) return null;
        const ctx = this.motorAudio.ctx;
        if (!ctx) return null;
        const now = ctx.currentTime;
        const MAX_WINDOW = 0.5;

        let mejor = null;
        let mejorDist = Infinity;

        for (const n of this._scoring.notasPendientes) {
            if (n.jugada) continue;
            if (n.notaEsp !== notaId) continue;
            const diff = now - n.attackTime;
            if (diff < -MAX_WINDOW) continue;
            const dist = Math.abs(diff);
            if (dist < mejorDist) {
                mejorDist = dist;
                mejor = n;
            }
        }
        return mejor;
    }

    _buscarBarra(ev) {
        if (!this._animacionesNotas) return null;
        const found = this._animacionesNotas.find(a => a.ev === ev);
        return found ? found.el : null;
    }

    _colorearBarra(ev, color) {
        const barra = this._buscarBarra(ev);
        if (barra) barra.style.background = color;
    }

    _evaluarAtaque(notaId) {
        if (!this._scoring || !this.secuenciador) return;
        const ctx = this.motorAudio.ctx;
        if (!ctx) return;

        const nota = this._buscarNotaCercana(notaId);
        if (!nota) return;

        const now = ctx.currentTime;
        const diffMs = (now - nota.attackTime) * 1000;
        const absDiff = Math.abs(diffMs);

        let resultado, puntos, color;

        if (absDiff <= 70) {
            resultado = "PERFECTO";
            puntos = 100;
            color = "#00e5ff";
        } else if (absDiff <= 150) {
            resultado = "BIEN";
            puntos = 80;
            color = "#76ff03";
        } else if (diffMs > 150 && diffMs <= 250) {
            resultado = "TARDE";
            puntos = 50;
            color = "#ffab00";
        } else if (diffMs < -150 && diffMs >= -250) {
            resultado = "ADELANTADO";
            puntos = 50;
            color = "#ffab00";
        } else {
            resultado = "FALLO";
            puntos = 0;
            color = "#ff1744";
        }

        this._scoring.notaActiva = {
            nota,
            resultadoAtaque: resultado,
            puntosAtaque: puntos,
            pressTime: now,
        };

        nota.jugada = true;
        this._colorearBarra(nota.ev, color);
        this._mostrarFeedback(resultado, diffMs > 0 ? `+${Math.round(diffMs)}ms` : `${Math.round(diffMs)}ms`, color);

        if (this._pianoAcum) {
            this._pianoAcum.totalGolpes++;
            const clase = resultado.toLowerCase();
            if (clase === 'perfecto') { this._pianoAcum.perfecto++; this._pianoAcum.puntaje += 100; }
            else if (clase === 'bien') { this._pianoAcum.bien++; this._pianoAcum.puntaje += 80; }
            else if (clase === 'adelantado' || clase === 'tarde') { this._pianoAcum[clase]++; this._pianoAcum.puntaje += 50; }
            else { this._pianoAcum.fallo++; }
        }

        if (this.telemetria) {
            this.telemetria.registrarNotaPiano(
                notaId, nota.ev.silaba || '',
                nota.attackTime * 1000, now * 1000,
                diffMs, resultado.toLowerCase(),
                nota.durSec * 1000
            );
        }

        // console.log(`[ATAQUE] ${notaId} (${nota.ev.silaba || '—'}) | esperado: ${nota.attackTime.toFixed(3)}s | real: ${now.toFixed(3)}s | diff: ${diffMs > 0 ? '+' : ''}${Math.round(diffMs)}ms → ${resultado} (${puntos}pts)`);
    }

    _evaluarDuracion(notaId) {
        if (!this._scoring || !this._scoring.notaActiva) return;
        const ctx = this.motorAudio.ctx;
        if (!ctx) return;

        const activa = this._scoring.notaActiva;
        if (activa.nota.notaEsp !== notaId) return;

        const now = ctx.currentTime;
        const duracionReal = now - activa.pressTime;
        const duracionEsperada = activa.nota.durSec;
        const ratio = duracionReal / duracionEsperada;

        let resultadoDur, puntosDur, color;

        if (Math.abs(ratio - 1) <= 0.10) {
            resultadoDur = "PERFECTO";
            puntosDur = 100;
            color = "#00e5ff";
        } else if (Math.abs(ratio - 1) <= 0.20) {
            resultadoDur = "BIEN";
            puntosDur = 80;
            color = "#76ff03";
        } else if (ratio < 0.80) {
            resultadoDur = "CORTA";
            puntosDur = 30;
            color = "#ffab00";
        } else {
            resultadoDur = "LARGA";
            puntosDur = 30;
            color = "#ffab00";
        }

        const puntosAtaque = activa.puntosAtaque;
        const puntajeFinal = Math.round(puntosAtaque * 0.7 + puntosDur * 0.3);
        this._scoring.puntaje += puntajeFinal;

        activa.nota.evaluada = true;
        this._scoring.notaActiva = null;

        const combo = `${activa.resultadoAtaque} → ${resultadoDur}`;
        this._mostrarFeedback(combo, `${puntajeFinal} pts`, color);

        // console.log(`[DURACIÓN] ${notaId} (${activa.nota.ev.silaba || '—'}) | esperada: ${duracionEsperada.toFixed(3)}s | real: ${duracionReal.toFixed(3)}s | ratio: ${(ratio * 100).toFixed(0)}% → ${resultadoDur} (${puntosDur}pts) | ataque: ${activa.resultadoAtaque} (${puntosAtaque}pts) | TOTAL: ${puntajeFinal}pts`);
    }

    _marcarFallo(notaId) {
        if (!this._scoring) return;
        for (const n of this._scoring.notasPendientes) {
            if (!n.jugada && n.notaEsp === notaId) {
                n.jugada = true;
            }
        }
    }

    _mostrarFeedback(texto, detalle, color) {
        const el = this.contenedorJuego?.querySelector('#coordRitm_feedbackText');
        if (!el) return;

        if (this._scoring.feedbackTimer) {
            clearTimeout(this._scoring.feedbackTimer);
        }

        el.textContent = `${texto}  ${detalle}`;
        el.style.color = color;
        el.classList.add('visible');

        this._scoring.feedbackTimer = setTimeout(() => {
            el.classList.remove('visible');
            this._scoring.feedbackTimer = null;
        }, 700);
    }

    // ── Jugadores locales (sin login) ──
    _cargarJugadores() {
        try {
            const raw = localStorage.getItem('pianito_jugadores');
            if (raw) {
                const j = JSON.parse(raw);
                return {
                    pianista: (j.pianista && String(j.pianista).trim()) || 'jugador1',
                    percusionista: (j.percusionista && String(j.percusionista).trim()) || 'jugador2'
                };
            }
        } catch (e) { }
        return { pianista: 'jugador1', percusionista: 'jugador2' };
    }

    _guardarJugadores(j) {
        localStorage.setItem('pianito_jugadores', JSON.stringify(j));
    }

    aplicarNombresJugadores(pianista, percusionista) {
        const j = { pianista: (pianista || '').trim() || 'jugador1', percusionista: (percusionista || '').trim() || 'jugador2' };
        this._guardarJugadores(j);
        const data = this._cargarPianoHistorial();
        data.instrumentos = {
            pianista: j.pianista + ' (' + j.pianista + ')',
            percusionista: j.percusionista + ' (' + j.percusionista + ')'
        };
        this._guardarPianoHistorial(data);
        this._actualizarLabelsInstrumentos();
        this._actualizarIconoSwap();
    }


}

