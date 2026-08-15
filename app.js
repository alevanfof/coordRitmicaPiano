// ===================================================================
// Pianito San Lorenzo — bootstrap (100% local, sin backend ni login)
// ===================================================================
(function () {
    'use strict';

    function cargarJugadores() {
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

    function guardarJugadores(j) {
        localStorage.setItem('pianito_jugadores', JSON.stringify(j));
    }

    document.addEventListener('DOMContentLoaded', function () {
        // Instanciar el juego (la clase está definida en juego.js)
        const cr = new CoordinacionRitmica();
        window.__pianito = cr;

        // ---- Nombres de jugadores editables y persistidos ----
        const inputP = document.getElementById('pianito_pianista');
        const inputC = document.getElementById('pianito_percusionista');
        const j = cargarJugadores();
        if (inputP) inputP.value = j.pianista;
        if (inputC) inputC.value = j.percusionista;

        function aplicar() {
            const jp = (inputP && inputP.value.trim()) || 'jugador1';
            const jc = (inputC && inputC.value.trim()) || 'jugador2';
            guardarJugadores({ pianista: jp, percusionista: jc });
            if (typeof cr.aplicarNombresJugadores === 'function') {
                cr.aplicarNombresJugadores(jp, jc);
            }
        }

        if (inputP) inputP.addEventListener('change', aplicar);
        if (inputC) inputC.addEventListener('change', aplicar);
        // Aplicar nombres iniciales al historial de instrumentos
        if (typeof cr.aplicarNombresJugadores === 'function') {
            cr.aplicarNombresJugadores(j.pianista, j.percusionista);
        }

        // ---- Botón para abrir el piano ----
        const btn = document.getElementById('coordinacionBtn');
        if (btn) {
            btn.addEventListener('click', function () {
                if (typeof cr.abrirMenu === 'function') cr.abrirMenu();
            });
        }
    });
})();
