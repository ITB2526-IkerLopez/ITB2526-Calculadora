// TENDÈNCIES ESTACIONALS I TEMPORALS (Índex: 0=Gen, ..., 11=Des)
// TENDÈNCIES ESTACIONALS I TEMPORALS (Índex: 0=Gen, ..., 11=Des)
// Ajustat per mostrar caigudes dràstiques en vacances (Desembre, Gener) i tancament estival (Juliol, Agost)
const factors = {
    // elec: Baixa a la meitat a l'hivern per dies festius, mínim històric a l'agost (0.1, només neveres/servidors)
    elec:  [0.5, 1.2, 1.0, 0.9, 0.9, 1.1, 0.3, 0.1, 1.3, 1.1, 1.1, 0.5],

    // aigua: Consum zero a l'agost, caiguda forta a l'hivern i juliol
    aigua: [0.4, 0.9, 1.0, 1.0, 1.1, 1.3, 0.2, 0.0, 1.1, 1.0, 0.9, 0.4],

    // ofi: Zero absolut a l'agost, gairebé zero per festes, i un pic enorme (1.8) al setembre per inici de curs
    ofi:   [0.2, 1.0, 1.1, 1.0, 1.0, 1.0, 0.1, 0.0, 1.8, 1.1, 1.0, 0.2],

    // net: Servei sota mínims a l'agost i desembre/gener
    net:   [0.5, 1.0, 1.0, 1.0, 1.0, 1.1, 0.3, 0.1, 1.2, 1.0, 1.0, 0.5]
};

const mesosCurs = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5];
const mesosAny = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

function calcularConsum(base, tipus, mesos) {
    let total = 0;
    mesos.forEach(mes => { total += base * factors[tipus][mes]; });
    return total;
}

// FETCH DE DATOS JSON
async function carregarDadesJSON() {
    try {
        const response = await fetch('dataclean.json');
        if (!response.ok) throw new Error(`Error: ${response.statusText}`);

        const jsonITB = await response.json();
        processarDades(jsonITB);

    } catch (error) {
        console.error("No s'ha pogut llegir el fitxer.", error);
        document.getElementById('resultats-grid').innerHTML = `
            <div class="targeta" style="border-color: red; background: rgba(255,0,0,0.1);">
                <strong>❌ Error de càrrega</strong>
                <p style="color: #ffb3b3;">Has d'obrir-ho amb Live Server perquè funcioni el fetch() de les dades.</p>
            </div>
        `;
    }
}

function processarDades(jsonITB) {
    // Càlcul de bases
    const aiguaDies = jsonITB.dades.subministraments.aigua;
    const baseAiguaMensual = (aiguaDies.reduce((a, c) => a + c.consum_litres, 0) / aiguaDies.length) * 30;

    const elecDies = jsonITB.dades.subministraments.energia.registres_diaris;
    const baseElecMensual = (elecDies.reduce((a, c) => a + c.consumida_kwh, 0) / elecDies.length) * 30;

    const ofiPrincipal = jsonITB.dades.compres_i_manteniment.material_oficina.reduce((a, c) => a + c.import_total_eur, 0);
    const ofiExtra = jsonITB.dades.compres_i_manteniment.altres_factures_np.filter(f => f.proveidor === "Lyreco").reduce((a, c) => a + c.import_total_eur, 0);
    const ofiDesclasificat = jsonITB.dades.documents_classificats[0].import_total_eur;
    const baseOfiMensual = (ofiPrincipal + ofiExtra + ofiDesclasificat) / 5;

    const netejaFactures = jsonITB.dades.compres_i_manteniment.serveis_neteja;
    const baseNetejaMensual = netejaFactures.reduce((a, c) => a + c.import_total_eur, 0) / netejaFactures.length;

    // Pintar inputs HTML
    document.getElementById('baseElec').value = baseElecMensual.toFixed(2);
    document.getElementById('baseAigua').value = baseAiguaMensual.toFixed(2);
    document.getElementById('baseOfi').value = baseOfiMensual.toFixed(2);
    document.getElementById('baseNet').value = baseNetejaMensual.toFixed(2);

    // Càlculs totals
    const resultats = {
        elecAny: calcularConsum(baseElecMensual, 'elec', mesosAny),
        elecCurs: calcularConsum(baseElecMensual, 'elec', mesosCurs),
        aiguaAny: calcularConsum(baseAiguaMensual, 'aigua', mesosAny),
        aiguaCurs: calcularConsum(baseAiguaMensual, 'aigua', mesosCurs),
        ofiAny: calcularConsum(baseOfiMensual, 'ofi', mesosAny),
        ofiCurs: calcularConsum(baseOfiMensual, 'ofi', mesosCurs),
        netAny: calcularConsum(baseNetejaMensual, 'net', mesosAny),
        netCurs: calcularConsum(baseNetejaMensual, 'net', mesosCurs)
    };

    // PINTAR DASHBOARD RESULTATS
    document.getElementById('resultats-grid').innerHTML = `
        <div class="targeta">
            <strong>⚡ Electricitat</strong>
            <p><span class="etiqueta-dada">Pròxim any</span><span class="valor-destacat">${resultats.elecAny.toFixed(0)} <span class="unitat">kWh</span></span></p>
            <p><span class="etiqueta-dada">Curs (Set-Jun)</span><span class="valor-destacat">${resultats.elecCurs.toFixed(0)} <span class="unitat">kWh</span></span></p>
        </div>
        <div class="targeta">
            <strong>💧 Aigua</strong>
            <p><span class="etiqueta-dada">Pròxim any</span><span class="valor-destacat">${resultats.aiguaAny.toFixed(0)} <span class="unitat">L</span></span></p>
            <p><span class="etiqueta-dada">Curs (Set-Jun)</span><span class="valor-destacat">${resultats.aiguaCurs.toFixed(0)} <span class="unitat">L</span></span></p>
        </div>
        <div class="targeta">
            <strong>📎 Oficina (Lyreco)</strong>
            <p><span class="etiqueta-dada">Pròxim any</span><span class="valor-destacat">${resultats.ofiAny.toFixed(2)} <span class="unitat">€</span></span></p>
            <p><span class="etiqueta-dada">Curs (Set-Jun)</span><span class="valor-destacat">${resultats.ofiCurs.toFixed(2)} <span class="unitat">€</span></span></p>
        </div>
        <div class="targeta">
            <strong>🧼 Neteja</strong>
            <p><span class="etiqueta-dada">Pròxim any</span><span class="valor-destacat">${resultats.netAny.toFixed(2)} <span class="unitat">€</span></span></p>
            <p><span class="etiqueta-dada">Curs (Set-Jun)</span><span class="valor-destacat">${resultats.netCurs.toFixed(2)} <span class="unitat">€</span></span></p>
        </div>
    `;

    // --- PINTAR EL GRÀFIC (CHART.JS) ---
    // Ordenem els mesos perquè comenci al Setembre (Inici de Curs) i acabi a l'Agost
    const ordreCurs = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7];
    const etiquetesMesos = ['Setembre', 'Octubre', 'Novembre', 'Desembre', 'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost'];

    const dadesGrafic = {
        labels: etiquetesMesos,
        datasets: [
            {
                label: '⚡ Electricitat (kWh)',
                data: ordreCurs.map(m => baseElecMensual * factors.elec[m]),
                borderColor: '#facc15',
                backgroundColor: 'rgba(250, 204, 21, 0.1)',
                tension: 0.4, fill: true, yAxisID: 'y'
            },
            {
                label: '💧 Aigua (L)',
                data: ordreCurs.map(m => baseAiguaMensual * factors.aigua[m]),
                borderColor: '#38bdf8',
                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                tension: 0.4, fill: true, yAxisID: 'y'
            },
            {
                label: '📎 Oficina (€)',
                data: ordreCurs.map(m => baseOfiMensual * factors.ofi[m]),
                borderColor: '#a78bfa',
                backgroundColor: 'rgba(167, 139, 250, 0.1)',
                tension: 0.4, fill: true, yAxisID: 'y-euros'
            },
            {
                label: '🧼 Neteja (€)',
                data: ordreCurs.map(m => baseNetejaMensual * factors.net[m]),
                borderColor: '#34d399',
                backgroundColor: 'rgba(52, 211, 153, 0.1)',
                tension: 0.4, fill: true, yAxisID: 'y-euros'
            }
        ]
    };

    const configuracioGrafic = {
        type: 'line',
        data: dadesGrafic,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { color: '#fafafa', font: { family: 'Plus Jakarta Sans', size: 14 } } },
                tooltip: { backgroundColor: 'rgba(24, 24, 27, 0.9)', titleColor: '#fff', bodyColor: '#a1a1aa', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#a1a1aa', font: { family: 'Plus Jakarta Sans' } }
                },
                y: {
                    type: 'linear', display: true, position: 'left',
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#a1a1aa' },
                    title: { display: true, text: 'Consums Físics (kWh / L)', color: '#a1a1aa' }
                },
                'y-euros': {
                    type: 'linear', display: true, position: 'right',
                    grid: { drawOnChartArea: false }, // Evita que les línies es creuin
                    ticks: { color: '#a1a1aa' },
                    title: { display: true, text: 'Despesa Econòmica (€)', color: '#a1a1aa' }
                }
            }
        }
    };

    // Si ja hi ha un gràfic, el destrueix abans de pintar (per evitar errors si es recarrega la funció)
    let myChart = Chart.getChart("graficEvolucio");
    if (myChart) myChart.destroy();

    // Dibuixa el gràfic al canvas
    new Chart(document.getElementById('graficEvolucio'), configuracioGrafic);

    // PINTAR RECÀLCUL OBJECTIUS (-30%)
    const reduccio = 0.70;
    document.getElementById('recalcul-grid').innerHTML = `
        <div class="targeta">
            <strong>⚡ Electricitat (-30%)</strong>
            <p><span class="etiqueta-dada">Objectiu Any 3</span><span class="valor-destacat">${(resultats.elecAny * reduccio).toFixed(0)} <span class="unitat">kWh</span></span></p>
        </div>
        <div class="targeta">
            <strong>💧 Aigua (-30%)</strong>
            <p><span class="etiqueta-dada">Objectiu Any 3</span><span class="valor-destacat">${(resultats.aiguaAny * reduccio).toFixed(0)} <span class="unitat">L</span></span></p>
        </div>
        <div class="targeta">
            <strong>📎 Oficina (-30%)</strong>
            <p><span class="etiqueta-dada">Objectiu Any 3</span><span class="valor-destacat">${(resultats.ofiAny * reduccio).toFixed(2)} <span class="unitat">€</span></span></p>
        </div>
        <div class="targeta">
            <strong>🧼 Neteja (-30%)</strong>
            <p><span class="etiqueta-dada">Objectiu Any 3</span><span class="valor-destacat">${(resultats.netAny * reduccio).toFixed(2)} <span class="unitat">€</span></span></p>
        </div>
    `;
}

window.onload = carregarDadesJSON;