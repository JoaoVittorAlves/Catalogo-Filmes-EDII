const mapa = L.map("mapa").setView([-7.15, -34.83], 11);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
}).addTo(mapa);

let marcadores = [];

function limparMarcadores() {
    marcadores.forEach(marcador => mapa.removeLayer(marcador));
    marcadores = [];
}

function mostrarLocais(locais) {
    limparMarcadores();

    locais.forEach(local => {
        const marcador = L.marker([
            local.latitude,
            local.longitude
        ]).addTo(mapa);

        marcador.bindPopup(`
            <strong>${local.nome}</strong><br>
            ${local.cidade} - ${local.estado}<br>
            <button onclick="selecionarLocal(${local.id})">
                Ver local
            </button>
        `);

        marcadores.push(marcador);
    });
}

async function carregarLocais(nivel = 0) {
    const resposta = await fetch(`/api/locais?nivel=${nivel}`);
    const dados = await resposta.json();

    mostrarLocais(dados.locais);
    document.getElementById("nivel-valor").textContent = dados.nivel;
}

async function carregarCategorias() {
    const resposta = await fetch("/api/categorias");
    const dados = await resposta.json();

    const container = document.getElementById("categorias");
    container.innerHTML = "";

    dados.categorias.forEach(categoria => {
        const botao = document.createElement("button");
        botao.textContent = categoria;

        botao.addEventListener("click", async () => {
            const resposta = await fetch(
                `/api/categoria/${encodeURIComponent(categoria)}`
            );

            const dadosCategoria = await resposta.json();

            mostrarLocais(dadosCategoria.locais);
            renderizarCategorias(dadosCategoria.categorias);
        });

        container.appendChild(botao);
    });
}

function renderizarCategorias(categorias) {
    const container = document.getElementById("categorias");
    container.innerHTML = "";

    categorias.forEach(categoria => {
        const botao = document.createElement("button");
        botao.textContent = categoria;

        botao.onclick = async () => {
            const resposta = await fetch(
                `/api/categoria/${encodeURIComponent(categoria)}`
            );

            const dados = await resposta.json();

            mostrarLocais(dados.locais);
            renderizarCategorias(dados.categorias);
        };

        container.appendChild(botao);
    });
}

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
    `;

    renderizarSplay(dados.splay);
    await carregarSkipList();
}

function renderizarSkipList(niveis) {
    const container = document.getElementById("skip-list");

    container.innerHTML = niveis.map(item => {
        const nomes = item.elementos
            .map(elemento => `<span class="no-skip">${elemento.nome}</span>`)
            .join(" → ");

        return `
            <div class="nivel-skip">
                <strong>Nível ${item.nivel}</strong>
                ${nomes || "(vazio)"}
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
            `${prefixo}${lado}: ${no.nome} [id=${no.chave}]`
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

document.getElementById("nivel").addEventListener("input", event => {
    carregarLocais(Number(event.target.value));
});

carregarLocais(0);
carregarCategorias();
carregarSkipList();
