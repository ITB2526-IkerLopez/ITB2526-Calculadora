// TENDÈNCIES ESTACIONALS I TEMPORALS
const factors = {
    elec:  [1.3, 1.2, 1.0, 0.9, 0.9, 1.1, 1.3, 0.4, 1.0, 1.0, 1.1, 1.3],
    aigua: [0.9, 0.9, 1.0, 1.0, 1.1, 1.3, 1.4, 0.3, 1.1, 1.0, 0.9, 0.9],
    ofi:   [1.0, 1.0, 1.1, 1.0, 1.0, 1.2, 0.2, 0.0, 1.5, 1.1, 1.0, 1.0],
    net:   [1.0, 1.0, 1.0, 1.0, 1.0, 1.1, 1.3, 0.2, 1.2, 1.0, 1.0, 1.0]
};

const mesosCurs = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5]; // Setembre a Juny
const mesosAny = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // Gener a Desembre

function calcularConsum(base, tipus, mesos) {
    let total = 0;
    mesos.forEach(mes => { total += base * factors[tipus][mes]; });
    return total;
}

// LLEGIR EL FITXER EXTERNAMENTE AMB FETCH
async function carregarDadesJSON() {
    try {
        const response = await fetch('dataclean.json');

        if (!response.ok) {
            throw new Error(`Error en carregar el JSON: ${response.statusText}`);
        }

        const jsonITB = await response.json();
        processarDades(jsonITB);

    } catch (error) {
        console.error("No s'ha pogut llegir el fitxer dataclean.json.", error);
        document.getElementById('resultats-grid').innerHTML = `
            <div class="targeta" style="border-color: red; background: rgba(255,0,0,0.1);">
                <strong>❌ Error de càrrega</strong>
                <p style="color: #ffb3b3;">No s'ha pogut llegir 'dataclean.json'. Recorda que has d'utilitzar un servidor local (ex: Live Server).</p>
            </div>
        `;
    }
}

function processarDades(jsonITB) {
    // 1. Aigua
    const aiguaDies = jsonITB.dades.subministraments.aigua;
    const sumaAigua = aiguaDies.reduce((acc, curr) => acc + curr.consum_litres, 0);
    const baseAiguaMensual = (sumaAigua / aiguaDies.length) * 30;

    // 2. Electricitat
    const elecDies = jsonITB.dades.subministraments.energia.registres_diaris;
    const sumaElec = elecDies.reduce((acc, curr) => acc + curr.consumida_kwh, 0);
    const baseElecMensual = (sumaElec / elecDies.length) * 30;

    // 3. Oficina (Factures Lyreco + Desclassificats)
    const ofiPrincipal = jsonITB.dades.compres_i_manteniment.material_oficina.reduce((acc, c) => acc + c.import_total_eur, 0);
    const ofiExtra = jsonITB.dades.compres_i_manteniment.altres_factures_np
        .filter(f => f.proveidor === "Lyreco")
        .reduce((acc, c) => acc + c.import_total_eur, 0);
    const ofiDesclasificat = jsonITB.dades.documents_classificats[0].import_total_eur;
    const baseOfiMensual = (ofiPrincipal + ofiExtra + ofiDesclasificat) / 5;

    // 4. Neteja
    const netejaFactures = jsonITB.dades.compres_i_manteniment.serveis_neteja;
    const sumaNeteja = netejaFactures.reduce((acc, c) => acc + c.import_total_eur, 0);
    const baseNetejaMensual = sumaNeteja / netejaFactures.length;

    // Mostrar els valors calculats als inputs de l'HTML
    document.getElementById('baseElec').value = baseElecMensual.toFixed(2);
    document.getElementById('baseAigua').value = baseAiguaMensual.toFixed(2);
    document.getElementById('baseOfi').value = baseOfiMensual.toFixed(2);
    document.getElementById('baseNet').value = baseNetejaMensual.toFixed(2);

    // Executar càlculs (Any i Curs)
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

    // Imprimir els 8 indicadors a la graella amb el disseny premium
    document.getElementById('resultats-grid').innerHTML = `
        <div class="targeta">
            <strong>⚡ Electricitat</strong>
            <p>
                <span class="etiqueta-dada">Pròxim any</span>
                <span class="valor-destacat">${resultats.elecAny.toFixed(0)} <span class="unitat">kWh</span></span>
            </p>
            <p>
                <span class="etiqueta-dada">Curs (Set-Jun)</span>
                <span class="valor-destacat">${resultats.elecCurs.toFixed(0)} <span class="unitat">kWh</span></span>
            </p>
        </div>
        <div class="targeta">
            <strong>💧 Aigua</strong>
            <p>
                <span class="etiqueta-dada">Pròxim any</span>
                <span class="valor-destacat">${resultats.aiguaAny.toFixed(0)} <span class="unitat">L</span></span>
            </p>
            <p>
                <span class="etiqueta-dada">Curs (Set-Jun)</span>
                <span class="valor-destacat">${resultats.aiguaCurs.toFixed(0)} <span class="unitat">L</span></span>
            </p>
        </div>
        <div class="targeta">
            <strong>📎 Oficina (Lyreco)</strong>
            <p>
                <span class="etiqueta-dada">Pròxim any</span>
                <span class="valor-destacat">${resultats.ofiAny.toFixed(2)} <span class="unitat">€</span></span>
            </p>
            <p>
                <span class="etiqueta-dada">Curs (Set-Jun)</span>
                <span class="valor-destacat">${resultats.ofiCurs.toFixed(2)} <span class="unitat">€</span></span>
            </p>
        </div>
        <div class="targeta">
            <strong>🧼 Neteja</strong>
            <p>
                <span class="etiqueta-dada">Pròxim any</span>
                <span class="valor-destacat">${resultats.netAny.toFixed(2)} <span class="unitat">€</span></span>
            </p>
            <p>
                <span class="etiqueta-dada">Curs (Set-Jun)</span>
                <span class="valor-destacat">${resultats.netCurs.toFixed(2)} <span class="unitat">€</span></span>
            </p>
        </div>
    `;

    // Recàlcul Final: Pla a 3 Anys (-30%)
    const reduccio = 0.70;
    document.getElementById('recalcul-grid').innerHTML = `
        <div class="targeta">
            <strong>⚡ Electricitat (-30%)</strong>
            <p>
                <span class="etiqueta-dada">Objectiu Any 3</span>
                <span class="valor-destacat">${(resultats.elecAny * reduccio).toFixed(0)} <span class="unitat">kWh</span></span>
            </p>
        </div>
        <div class="targeta">
            <strong>💧 Aigua (-30%)</strong>
            <p>
                <span class="etiqueta-dada">Objectiu Any 3</span>
                <span class="valor-destacat">${(resultats.aiguaAny * reduccio).toFixed(0)} <span class="unitat">L</span></span>
            </p>
        </div>
        <div class="targeta">
            <strong>📎 Oficina (-30%)</strong>
            <p>
                <span class="etiqueta-dada">Objectiu Any 3</span>
                <span class="valor-destacat">${(resultats.ofiAny * reduccio).toFixed(2)} <span class="unitat">€</span></span>
            </p>
        </div>
        <div class="targeta">
            <strong>🧼 Neteja (-30%)</strong>
            <p>
                <span class="etiqueta-dada">Objectiu Any 3</span>
                <span class="valor-destacat">${(resultats.netAny * reduccio).toFixed(2)} <span class="unitat">€</span></span>
            </p>
        </div>
    `;
}

// Iniciar l'extracció del JSON just en obrir la pàgina
window.onload = carregarDadesJSON;