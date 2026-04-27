let dadesGlobals = {};
let elMeuGrafic = null;
let maxEscalaUnits = 0;
let maxEscalaEuros = 0;

// TENDÈNCIES ESTACIONALS I TEMPORALS
const factors = {
    elec:  [0.5, 1.2, 1.0, 0.9, 0.9, 1.1, 0.3, 0.1, 1.3, 1.1, 1.1, 0.5],
    aigua: [0.4, 0.9, 1.0, 1.0, 1.1, 1.3, 0.2, 0.0, 1.1, 1.0, 0.9, 0.4],
    ofi:   [0.2, 1.0, 1.1, 1.0, 1.0, 1.0, 0.1, 0.0, 1.8, 1.1, 1.0, 0.2],
    net:   [0.5, 1.0, 1.0, 1.0, 1.0, 1.1, 0.3, 0.1, 1.2, 1.0, 1.0, 0.5]
};

const IVA = 1.21;
const mesosAny = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // Gen a Des
const mesosCurs = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7]; // Set a Ago

async function carregarDadesJSON() {
    try {
        const response = await fetch('json/dataclean.json');
        if (!response.ok) throw new Error("No s'ha pogut carregar el fitxer JSON");
        const json = await response.json();

        // --- Càlculs de Bases ---
        const dadesAigua = json.dades?.subministraments?.aigua || [];
        const baseAigua = dadesAigua.length > 0 ? (dadesAigua.reduce((a, c) => a + (c.consum_litres || 0), 0) / dadesAigua.length) * 30 : 0;

        const dadesElec = json.dades?.subministraments?.energia?.registres_diaris || [];
        const baseElec = dadesElec.length > 0 ? (dadesElec.reduce((a, c) => a + (c.consumida_kwh || 0), 0) / dadesElec.length) * 30 : 0;

        const matOfi = json.dades?.compres_i_manteniment?.material_oficina || [];
        const lyreco = (json.dades?.compres_i_manteniment?.altres_factures_np || []).filter(f => f.proveidor === "Lyreco");
        const classificats = json.dades?.documents_classificats?.[0]?.import_total_eur || 0;
        const baseOfi = (matOfi.reduce((a, c) => a + (c.import_total_eur || 0), 0) + lyreco.reduce((a, c) => a + (c.import_total_eur || 0), 0) + classificats) / 5;

        const dadesNet = json.dades?.compres_i_manteniment?.serveis_neteja || [];
        const baseNet = dadesNet.length > 0 ? dadesNet.reduce((a, c) => a + (c.import_total_eur || 0), 0) / dadesNet.length : 0;

        dadesGlobals = { baseElec, baseAigua, baseOfi, baseNet };

        // --- CÀLCUL DE L'ESCALA MÀXIMA AMB ARRODONIMENT ---
        let maxUnitsBrut = Math.max(
            ...factors.elec.map(f => f * baseElec),
            ...factors.aigua.map(f => f * baseAigua)
        ) * 1.1;

        let maxEurosBrut = Math.max(
            ...factors.ofi.map(f => f * baseOfi * IVA),
            ...factors.net.map(f => f * baseNet * IVA)
        ) * 1.1;

        // Arrodonim cap amunt a la centena més propera (ex: 3421 -> 3500)
        maxEscalaUnits = Math.ceil(maxUnitsBrut / 100) * 100;
        maxEscalaEuros = Math.ceil(maxEurosBrut / 100) * 100;

        // Omplir inputs
        document.getElementById('baseElec').value = baseElec.toFixed(0);
        document.getElementById('baseAigua').value = baseAigua.toFixed(0);
        document.getElementById('baseOfi').value = baseOfi.toFixed(0);
        document.getElementById('baseNet').value = baseNet.toFixed(0);

        actualitzarDashboard();

    } catch (e) { console.error(e); }
}

function actualitzarDashboard() {
    if (!dadesGlobals.baseElec && dadesGlobals.baseElec !== 0) return;

    const escenari = document.getElementById('selectorEscenari').value;
    let mult = 1.0;
    let ordre = mesosAny;
    let labels = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];
    let mesosCalcul = mesosAny;
    let titol = "Any Complet (Estàndard)";

    if (escenari === 'curs') {
        ordre = mesosCurs;
        mesosCalcul = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
        labels = ['Set', 'Oct', 'Nov', 'Des', 'Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'];
        titol = "Curs Escolar (Setembre - Juny)";
    } else {
        if (escenari === 'any1') { mult = 0.9; titol = "Objectiu Any 1 (-10%)"; }
        if (escenari === 'any2') { mult = 0.8; titol = "Objectiu Any 2 (-20%)"; }
        if (escenari === 'any3') { mult = 0.7; titol = "Objectiu Any 3 (-30%)"; }
    }

    document.getElementById('titol-resultats').innerText = "2. " + titol;

    const calc = (base, tipus) => {
        let t = 0;
        mesosCalcul.forEach(m => t += base * factors[tipus][m] * mult);
        return t;
    };

    document.getElementById('resultats-grid').innerHTML = `
        <div class="targeta"><strong>⚡ Electricitat</strong><div class="valor-destacat">${calc(dadesGlobals.baseElec, 'elec').toFixed(0)}<span class="unitat">kWh</span></div></div>
        <div class="targeta"><strong>💧 Aigua</strong><div class="valor-destacat">${calc(dadesGlobals.baseAigua, 'aigua').toFixed(0)}<span class="unitat">L</span></div></div>
        <div class="targeta"><strong>📎 Oficina (+IVA)</strong><div class="valor-destacat">${(calc(dadesGlobals.baseOfi, 'ofi') * IVA).toFixed(2)}<span class="unitat">€</span></div></div>
        <div class="targeta"><strong>🧼 Neteja (+IVA)</strong><div class="valor-destacat">${(calc(dadesGlobals.baseNet, 'net') * IVA).toFixed(2)}<span class="unitat">€</span></div></div>
    `;

    dibuixarGrafic(mult, ordre, labels);
}

function dibuixarGrafic(multiplicador, ordre, labels) {
    const ctx = document.getElementById('graficEvolucio').getContext('2d');

    const datasetTemplate = (label, color, base, tipus, isEuro) => ({
        label: label,
        data: ordre.map(m => {
            const valor = base * factors[tipus][m] * multiplicador * (isEuro ? IVA : 1);
            return parseFloat(valor.toFixed(1)); // Forzamos 1 decimal máximo en los datos
        }),
        borderColor: color, backgroundColor: color + '22',
        tension: 0.4, fill: true, yAxisID: isEuro ? 'y1' : 'y'
    });

    if (elMeuGrafic) elMeuGrafic.destroy();

    elMeuGrafic = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                datasetTemplate('Llum (kWh)', '#facc15', dadesGlobals.baseElec, 'elec', false),
                datasetTemplate('Aigua (L)', '#38bdf8', dadesGlobals.baseAigua, 'aigua', false),
                datasetTemplate('Oficina (€)', '#a78bfa', dadesGlobals.baseOfi, 'ofi', true),
                datasetTemplate('Neteja (€)', '#34d399', dadesGlobals.baseNet, 'net', true)
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    type: 'linear', position: 'left',
                    min: 0, max: maxEscalaUnits,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#aaa',
                        callback: function(value) { return value.toFixed(1); } // Eje izquierdo con 1 decimal
                    }
                },
                y1: {
                    type: 'linear', position: 'right',
                    min: 0, max: maxEscalaEuros,
                    grid: { display: false },
                    ticks: {
                        color: '#aaa',
                        callback: function(value) { return value.toFixed(1); } // Eje derecho con 1 decimal
                    }
                }
            },
            plugins: {
                legend: { labels: { color: '#fafafa' } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(1); // Tooltip con 1 decimal
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}
// Afegeix això al final del teu script.js
window.addEventListener('load', () => {
    const taulaBody = document.getElementById('taula-comparativa-body');
    if (taulaBody) {
        // Aquesta part només s'executa si estem a la pàgina impacte.html
        setTimeout(() => {
            const fmt = (n) => n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
            const m = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
            const calcAny = (base, tipus) => m.reduce((acc, mes) => acc + (base * factors[tipus][mes]), 0);

            const files = [
                { nom: "Electricitat", base: dadesGlobals.baseElec, tipus: 'elec', unit: "kWh" },
                { nom: "Aigua", base: dadesGlobals.baseAigua, tipus: 'aigua', unit: "L" },
                { nom: "Oficina (+IVA)", base: dadesGlobals.baseOfi, tipus: 'ofi', unit: "€", extra: 1.21 },
                { nom: "Neteja (+IVA)", base: dadesGlobals.baseNet, tipus: 'net', unit: "€", extra: 1.21 }
            ];

            taulaBody.innerHTML = files.map(f => {
                const total = calcAny(f.base, f.tipus) * (f.extra || 1);
                return `<tr>
                    <td>${f.nom}</td>
                    <td>${fmt(total)} ${f.unit}</td>
                    <td style="color: #10b981">${fmt(total * 0.7)} ${f.unit}</td>
                    <td>-${fmt(total * 0.3)} ${f.unit}</td>
                </tr>`;
            }).join('');
        }, 500); // Esperem una mica a que carreguin les dades del JSON
    }
});
window.onload = carregarDadesJSON;