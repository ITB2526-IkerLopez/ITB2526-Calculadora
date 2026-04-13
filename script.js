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
        // Cridem al fitxer que ha d'estar a la mateixa carpeta
        const response = await fetch('dataclean.json');

        if (!response.ok) {
            throw new Error(`Error en carregar el JSON: ${response.statusText}`);
        }

        const jsonITB = await response.json();

        // Cridem a la funció per processar les dades un cop carregades
        processarDades(jsonITB);

    } catch (error) {
        console.error("No s'ha pogut llegir el fitxer dataclean.json.", error);
        document.getElementById('resultats-grid').innerHTML = `
            <div class="targeta" style="border-color: red; background: #ffe6e6;">
                <strong>❌ Error de càrrega</strong>
                <p>No s'ha pogut llegir 'dataclean.json'. Recorda que has d'utilitzar un servidor local (ex: Live Server) per fer servir 'fetch()' o tenir-ho penjat a la web.</p>
            </div>
        `;
    }
}

function processarDades(jsonITB) {
    // 1. Aigua
    const aiguaDies = jsonITB.dades.subministraments.aigua;
    const sumaAigua = aiguaDies.reduce((acc, curr) => acc + curr.consum_litres, 0);
    const baseAiguaMensual = (sumaAigua / aiguaDies.length) * 30; // Mitjana diària x 30

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
    // Es divideix per 5 perquè hi ha factures de 5 mesos diferents per fer la mitjana mensual
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

    // Imprimir els 8 indicadors a la graella
    document.getElementById('resultats-grid').innerHTML = `
        <div class="targeta">
            <strong>⚡ Electricitat</strong>
            <p>1. Pròxim any: ${resultats.elecAny.toFixed(2)} kWh</p>
            <p>2. Curs (Set-Jun): ${resultats.elecCurs.toFixed(2)} kWh</p>
        </div>
        <div class="targeta">
            <strong>💧 Aigua</strong>
            <p>3. Pròxim any: ${resultats.aiguaAny.toFixed(2)} L</p>
            <p>4. Curs (Set-Jun): ${resultats.aiguaCurs.toFixed(2)} L</p>
        </div>
        <div class="targeta">
            <strong>📎 Oficina (Lyreco)</strong>
            <p>5. Pròxim any: ${resultats.ofiAny.toFixed(2)} €</p>
            <p>6. Curs (Set-Jun): ${resultats.ofiCurs.toFixed(2)} €</p>
        </div>
        <div class="targeta">
            <strong>🧼 Neteja</strong>
            <p>7. Pròxim any: ${resultats.netAny.toFixed(2)} €</p>
            <p>8. Curs (Set-Jun): ${resultats.netCurs.toFixed(2)} €</p>
        </div>
    `;

    // Recàlcul Final: Pla a 3 Anys (-30%)
    const reduccio = 0.70;
    document.getElementById('recalcul-grid').innerHTML = `
        <div class="targeta">
            <strong>⚡ Electricitat (-30%)</strong>
            <p>Objectiu Any 3: ${(resultats.elecAny * reduccio).toFixed(2)} kWh</p>
        </div>
        <div class="targeta">
            <strong>💧 Aigua (-30%)</strong>
            <p>Objectiu Any 3: ${(resultats.aiguaAny * reduccio).toFixed(2)} L</p>
        </div>
        <div class="targeta">
            <strong>📎 Oficina (-30%)</strong>
            <p>Objectiu Any 3: ${(resultats.ofiAny * reduccio).toFixed(2)} €</p>
        </div>
        <div class="targeta">
            <strong>🧼 Neteja (-30%)</strong>
            <p>Objectiu Any 3: ${(resultats.netAny * reduccio).toFixed(2)} €</p>
        </div>
    `;
}

// Iniciar l'extracció del JSON just en obrir la pàgina
window.onload = carregarDadesJSON;