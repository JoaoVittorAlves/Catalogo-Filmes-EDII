// preferCanvas deixa o mapa leve mesmo com milhares de pontos.
const mapa = L.map("mapa", { preferCanvas: true }).setView([-8.5, -39.5], 5);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(mapa);

let marcadores = [];
let marcadorReferencia = null;

// Filtros atuais da exploração.
let categoriaAtual = "";
let caminhoUltimaBusca = [];

function limparMarcadores() {
    marcadores.forEach(marcador => mapa.removeLayer(marcador));
    marcadores = [];
}

function mostrarLocais(locais) {
    limparMarcadores();

    locais.forEach(local => {
        const marcador = L.circleMarker([
            local.latitude,
            local.longitude
        ], {
            radius: 5,
            color: "#2563eb",
            // Clicar no ponto não deve disparar o clique do mapa.
            bubblingMouseEvents: false
        }).addTo(mapa);

        marcador.bindPopup(`
            <strong>${local.nome}</strong><br>
            ${local.cidade} - ${local.estado}<br>
            ${local.distancia} km da referência<br>
            <button onclick="selecionarLocal(${local.id})">
                Ver local
            </button>
        `);

        marcadores.push(marcador);
    });
}

async function carregarLocais() {
    const nivel = document.getElementById("nivel").value;
    const raioMin = document.getElementById("raio-min").value;
    const raio = document.getElementById("raio").value;
    const busca = document.getElementById("busca").value;

    const parametros = new URLSearchParams({
        nivel, raio_min: raioMin, raio, busca, categoria: categoriaAtual
    });

    const resposta = await fetch(`/api/locais?${parametros}`);
    const dados = await resposta.json();

    mostrarLocais(dados.locais);
    document.getElementById("nivel-valor").textContent = dados.nivel;
    document.getElementById("raio-min-valor").textContent = raioMin;
    document.getElementById("raio-valor").textContent = raio;
    document.getElementById("total-locais").textContent = dados.total;

    caminhoUltimaBusca = dados.caminho.map(chave => chave.join(","));
    await carregarSkipList();
}

async function carregarCategorias() {
    const resposta = await fetch("/api/categorias");
    const dados = await resposta.json();

    renderizarCategorias(dados.categorias);
}

function renderizarCategorias(categorias) {
    const container = document.getElementById("categorias");
    container.innerHTML = "";

    // Botão para limpar o filtro (não altera a lista).
    const todas = document.createElement("button");
    todas.textContent = "Todas";
    todas.className = categoriaAtual === "" ? "ativo" : "";
    todas.onclick = () => {
        categoriaAtual = "";
        renderizarCategorias(categorias);
        carregarLocais();
    };
    container.appendChild(todas);

    // A ordem dos botões é a ordem da Lista com Movimentação ao Início.
    categorias.forEach(item => {
        const botao = document.createElement("button");
        botao.textContent = `${item.valor} (${item.acessos})`;
        botao.className = item.valor === categoriaAtual ? "ativo" : "";

        botao.onclick = async () => {
            const resposta = await fetch(
                `/api/categoria/${encodeURIComponent(item.valor)}`
            );

            const dados = await resposta.json();

            categoriaAtual = item.valor;
            renderizarCategorias(dados.categorias);
            carregarLocais();
        };

        container.appendChild(botao);
    });
}

function mostrarReferencia(latitude, longitude) {
    if (marcadorReferencia) {
        mapa.removeLayer(marcadorReferencia);
    }

    marcadorReferencia = L.circleMarker([latitude, longitude], {
        radius: 9, color: "#dc2626", fillOpacity: 0.8, bubblingMouseEvents: false
    }).addTo(mapa).bindTooltip("Ponto de referência");
}

// Clicar no mapa muda o ponto de referência e reconstrói a Skip List.
mapa.on("click", async evento => {
    await fetch("/api/referencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat: evento.latlng.lat, lon: evento.latlng.lng })
    });

    mostrarReferencia(evento.latlng.lat, evento.latlng.lng);
    carregarLocais();
});

async function selecionarLocal(id) {
    const resposta = await fetch(`/api/local/${id}`);
    const dados = await resposta.json();

    const local = dados.local;

    document.getElementById("detalhes-local").innerHTML = `
        ${local.imagem ? `<img src="${local.imagem}" alt="${local.nome}">` : ""}
        <h3>${local.nome}</h3>
        <p><strong>Categoria:</strong> ${local.categoria}</p>
        <p><strong>Localização:</strong> ${local.cidade} - ${local.estado}</p>
        <p>${local.descricao}</p>
        <p>
            <strong>Coordenadas:</strong>
            ${local.latitude}, ${local.longitude}
        </p>
        <p><strong>Distância da referência:</strong> ${local.distancia} km</p>
        <p><strong>Relevância:</strong> ${local.relevancia} artigos na Wikipédia</p>
    `;

    // Origem do local: cache (Splay Tree) ou busca linear na base.
    let info = dados.origem === "cache"
        ? "Encontrado no cache (Splay Tree): a base não foi consultada. "
        : "Não estava no cache: buscado na base e inserido na árvore. ";

    info += `Rotações do último splay: ${dados.rotacoes.join(" → ") || "nenhuma"}.`;

    if (dados.removido) {
        info += ` Capacidade excedida: "${dados.removido}" (folha mais profunda) foi removido.`;
    }

    document.getElementById("splay-info").textContent = info;
    renderizarSplay(dados.splay);
}

function renderizarSkipList(niveis) {
    const container = document.getElementById("skip-list");

    container.innerHTML = niveis.map(item => {
        const nomes = item.elementos
            .map(elemento => {
                // Destaca os nós visitados na descida da última busca.
                const visitado = caminhoUltimaBusca.includes(elemento.chave.join(","));
                const classe = visitado ? "no-skip visitado" : "no-skip";

                return `<span class="${classe}">${elemento.nome} (${elemento.chave[0]} km)</span>`;
            })
            .join(" → ");

        const restantes = item.total - item.elementos.length;

        return `
            <div class="nivel-skip">
                <strong>Nível ${item.nivel} (${item.total} nós)</strong>
                ${nomes || "(vazio)"}
                ${restantes > 0 ? ` → ... mais ${restantes}` : ""}
            </div>
        `;
    }).join("");
}

function renderizarSplay(raiz) {
    const container = document.getElementById("splay-tree");

    if (!raiz) {
        container.innerHTML = "<p>Árvore vazia.</p>";
        return;
    }

    const linhas = [];

    function percorrer(no, prefixo = "", lado = "RAIZ") {
        if (!no) return;

        linhas.push(
            `${prefixo}${lado}: ${no.nome} [id=${no.chave}, acessos=${no.acessos}]`
        );

        if (no.esquerda) {
            percorrer(
                no.esquerda,
                prefixo + "    ",
                "E"
            );
        }

        if (no.direita) {
            percorrer(
                no.direita,
                prefixo + "    ",
                "D"
            );
        }
    }

    percorrer(raiz);

    container.innerHTML = `
        <div class="arvore">${linhas.join("\n")}</div>
    `;
}

async function carregarSkipList() {
    const resposta = await fetch("/api/skip-list");
    const dados = await resposta.json();

    renderizarSkipList(dados.niveis);
}

document.getElementById("nivel").addEventListener("input", carregarLocais);
document.getElementById("raio-min").addEventListener("change", carregarLocais);
document.getElementById("raio").addEventListener("change", carregarLocais);
document.getElementById("busca").addEventListener("input", carregarLocais);

// Ponto de referência inicial: centro de João Pessoa (o mesmo do app.py).
mostrarReferencia(-7.115, -34.863);
carregarLocais();
carregarCategorias();
