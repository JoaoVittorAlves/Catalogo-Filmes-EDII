/**
 * ============================================================================
 *  INTERFACE — liga o Catálogo (estruturas de dados) ao mapa e aos painéis
 * ============================================================================
 *  Regra deste arquivo: ele NUNCA decide nada sobre ordem, filtragem ou
 *  busca. Tudo isso é perguntado ao Catálogo, que por sua vez usa as três
 *  estruturas. Aqui só se desenha o resultado e se repassa a ação do usuário.
 */
(function () {
  'use strict';

  const $ = (seletor) => document.querySelector(seletor);
  const escapar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const numero = (n) => n.toLocaleString('pt-BR');
  const ordinal = (n) => `${numero(n)}ª`;
  const desenharArvoreSVG = self.desenharArvore; // função de src/visualizacao/desenhoArvore.js

  // ---------------------------------------------------------------- dados
  const usandoWikidata = Array.isArray(self.LOCAIS_WIKIDATA) && self.LOCAIS_WIKIDATA.length > 0;
  const brutos = usandoWikidata ? self.LOCAIS_WIKIDATA : self.LOCAIS_SEMENTE;
  const ORIGEM_INICIAL = { lat: -15.7939, lon: -47.8828, nome: 'Brasília' };

  const inicio = performance.now();
  const catalogo = new Catalogo(brutos, { origem: ORIGEM_INICIAL });
  const tempoMontagem = performance.now() - inicio;

  const estado = {
    nivel: 0,
    raioMin: 0,
    raioMax: Infinity,
    selecionado: null,
    origemNome: ORIGEM_INICIAL.nome,
    posicaoDe: new Map(),      // id → posição no nível 0 da skip list
    exibidos: [],
    aba: 'lista',
    animacao: null,
    previaPendente: false,
  };

  $('#fonte-dados').textContent =
    `${numero(catalogo.locais.length)} locais ${usandoWikidata ? 'do Wikidata' : 'da base semente'}, ` +
    `estruturas montadas em ${tempoMontagem.toFixed(0)} ms`;

  // ---------------------------------------------------------------- mapa
  const mapa = L.map('mapa', { preferCanvas: true, zoomSnap: 0.5 }).setView([-14.2, -51.9], 4);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  }).addTo(mapa);

  const desenhista = L.canvas({ padding: 0.4 });
  const camadaLocais = L.layerGroup().addTo(mapa);
  const camadaAnel = L.layerGroup().addTo(mapa);
  const marcadorSelecao = L.circleMarker([0, 0], { radius: 13, color: '#9c7400', weight: 3, fill: false, interactive: false });
  const marcadorOrigem = L.marker([ORIGEM_INICIAL.lat, ORIGEM_INICIAL.lon], {
    draggable: true,
    keyboard: true,
    title: 'Origem das distâncias (arraste para mover)',
    icon: L.divIcon({ className: 'icone-origem', iconSize: [26, 26] }),
    zIndexOffset: 1000,
  }).addTo(mapa);

  marcadorOrigem.on('dragend', () => {
    const { lat, lng } = marcadorOrigem.getLatLng();
    mudarOrigem(lat, lng, 'ponto escolhido no mapa');
  });
  mapa.on('contextmenu', (e) => mudarOrigem(e.latlng.lat, e.latlng.lng, 'ponto escolhido no mapa'));
  $('#botao-origem-centro').addEventListener('click', () => {
    const c = mapa.getCenter();
    mudarOrigem(c.lat, c.lng, 'centro do mapa');
  });

  // ---------------------------------------------------------------- escala dos raios
  // posição 0..100 do controle → km (escala logarítmica; 100 = sem limite)
  const raioDoControle = (v) => (v <= 0 ? 0 : v >= 100 ? Infinity : Math.round(2 * Math.pow(3000, v / 100)));
  const textoRaio = (km) => (km === Infinity ? 'sem limite' : Geo.formatarDistancia(km));

  // ================================================================ ações do usuário

  function selecionarCategoria(chave) {
    catalogo.selecionarCategoria(chave);
    desenharCategorias();
    atualizarMapa();
    desenharAbaAtual();
  }

  function abrirLocal(id, { voar = true } = {}) {
    const local = catalogo.abrirLocal(id);
    if (!local) return;
    estado.selecionado = id;
    desenharCategorias();
    desenharDetalhes();
    destacarSelecao(voar);
    desenharResultados();
    if (estado.aba === 'arvore') animarSplay();
    else desenharAbaAtual();
  }

  function previsualizarLocal(id) {
    if (!$('#opcao-previa').checked) return;
    catalogo.previsualizarLocal(id, 1);
    if (estado.aba !== 'arvore' || estado.previaPendente || estado.animacao) return;
    estado.previaPendente = true;
    requestAnimationFrame(() => { estado.previaPendente = false; desenharArvore(); });
  }

  function mudarOrigem(lat, lon, nome) {
    catalogo.definirOrigem(lat, lon);
    estado.origemNome = nome;
    marcadorOrigem.setLatLng([lat, lon]);
    recalcularPosicoes();
    atualizarMapa();
    desenharDetalhes();
    desenharAbaAtual();
  }

  // ================================================================ desenho: painel esquerdo

  function recalcularPosicoes() {
    estado.posicaoDe.clear();
    let i = 0;
    for (const { valor } of catalogo.indiceDistancia) estado.posicaoDe.set(valor.id, i++);
    const controle = $('#controle-nivel');
    controle.max = String(catalogo.nivelMaximoOcupado);
    if (estado.nivel > catalogo.nivelMaximoOcupado) estado.nivel = catalogo.nivelMaximoOcupado;
    controle.value = String(estado.nivel);
    $('#texto-origem').textContent = `${estado.origemNome} (${Geo.formatarCoordenada(catalogo.origem.lat, catalogo.origem.lon)})`;
  }

  function desenharCategorias() {
    const itens = catalogo.categorias.paraArray();
    const ul = $('#lista-categorias');
    const ultima = catalogo.categorias.ultimaOperacao;
    ul.style.height = `${itens.length * 34}px`;
    const existentes = new Map([...ul.children].map((li) => [li.dataset.chave, li]));
    for (const item of itens) {
      let li = existentes.get(item.chave);
      if (!li) {
        li = document.createElement('li');
        li.dataset.chave = item.chave;
        li.innerHTML = '<button type="button"><span class="simbolo"></span><span class="rotulo"></span><span class="secundario"></span></button>';
        li.querySelector('button').addEventListener('click', () => selecionarCategoria(item.chave));
        li.style.transform = `translateY(${item.posicao * 34}px)`;
        ul.appendChild(li);
      }
      li.style.setProperty('--cor', item.valor.cor);
      li.style.transform = `translateY(${item.posicao * 34}px)`;
      li.classList.toggle('ativo', item.chave === catalogo.categoriaAtiva);
      li.classList.toggle('recem-movido', Boolean(ultima && ultima.chave === item.chave && ultima.de !== ultima.para));
      li.querySelector('.simbolo').textContent = item.valor.simbolo;
      li.querySelector('.rotulo').textContent = item.valor.rotulo;
      li.querySelector('.secundario').textContent = numero(item.valor.quantidade);
      li.querySelector('button').setAttribute('aria-pressed', String(item.chave === catalogo.categoriaAtiva));
    }
    $('#custo-mtf').textContent = catalogo.categorias.custoMedio().toFixed(2).replace('.', ',');
  }

  function atualizarMapa() {
    const contagem = catalogo.indiceDistancia.contagemPorNivel();
    $('#saida-nivel').textContent = `${estado.nivel}: ${numero(contagem[estado.nivel] ?? 0)} locais no nível`;
    $('#saida-raio-min').textContent = textoRaio(estado.raioMin);
    $('#saida-raio-max').textContent = textoRaio(estado.raioMax);

    // A CONSULTA: faixa da skip list restrita ao nível de detalhe (S4)
    estado.exibidos = catalogo.consultarMapa({ nivel: estado.nivel, raioMinKm: estado.raioMin, raioKm: estado.raioMax });

    camadaLocais.clearLayers();
    for (const local of estado.exibidos) {
      const m = L.circleMarker([local.lat, local.lon], {
        renderer: desenhista,
        radius: 3.5 + Math.min(local.nivel, 8) * 1.1,
        color: '#ffffff',
        weight: 1,
        fillColor: catalogo.corDaCategoria(local.categoria),
        fillOpacity: 0.92,
      });
      m.bindTooltip(local.nome, { direction: 'top', offset: [0, -6] });
      m.on('click', () => abrirLocal(local.id, { voar: false }));
      m.on('mouseover', () => previsualizarLocal(local.id));
      camadaLocais.addLayer(m);
    }

    camadaAnel.clearLayers();
    const centro = [catalogo.origem.lat, catalogo.origem.lon];
    if (estado.raioMax !== Infinity) {
      L.circle(centro, { radius: estado.raioMax * 1000, color: '#9a6b3c', weight: 1.5, dashArray: '6 6', fill: false, interactive: false }).addTo(camadaAnel);
    }
    if (estado.raioMin > 0) {
      L.circle(centro, { radius: estado.raioMin * 1000, color: '#9a6b3c', weight: 1.5, dashArray: '2 5', fillColor: '#1c2a3a', fillOpacity: 0.06, interactive: false }).addTo(camadaAnel);
    }

    $('#contagem-mapa').textContent = `${numero(estado.exibidos.length)} locais`;
    desenharResultados();
  }

  function desenharResultados() {
    const LIMITE = 80;
    const ol = $('#lista-resultados');
    if (estado.exibidos.length === 0) {
      ol.innerHTML = '<li class="nota">Nenhum local neste anel e nível. Diminua o nível de detalhe ou aumente a distância máxima.</li>';
      return;
    }
    ol.innerHTML = estado.exibidos.slice(0, LIMITE).map((l) =>
      `<li class="${l.id === estado.selecionado ? 'selecionado' : ''}"><button type="button" data-id="${l.id}">` +
      `<span class="amostra" style="--cor:${catalogo.corDaCategoria(l.categoria)}"></span>` +
      `<span>${escapar(l.nome)}</span>` +
      `<span class="secundario">${Geo.formatarDistancia(l.distancia)} <span class="nivel" title="altura do nó na lista com saltos">N${l.nivel}</span></span>` +
      '</button></li>').join('') +
      (estado.exibidos.length > LIMITE ? `<li class="nota">Mais ${numero(estado.exibidos.length - LIMITE)} no mapa.</li>` : '');
  }

  $('#lista-resultados').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (b) abrirLocal(+b.dataset.id);
  });

  // ---------------------------------------------------------------- busca por prefixo
  let atrasoBusca = 0;
  let sugestoes = [];
  let marcada = -1;
  $('#campo-busca').addEventListener('input', (e) => {
    clearTimeout(atrasoBusca);
    atrasoBusca = setTimeout(() => pesquisar(e.target.value), 120);
  });
  $('#campo-busca').addEventListener('keydown', (e) => {
    if (!sugestoes.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      marcada = (marcada + (e.key === 'ArrowDown' ? 1 : -1) + sugestoes.length) % sugestoes.length;
      desenharSugestoes();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      abrirLocal(sugestoes[Math.max(0, marcada)].id);
    }
  });
  $('#sugestoes').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (b) abrirLocal(+b.dataset.id);
  });

  function pesquisar(texto) {
    sugestoes = catalogo.pesquisar(texto, 10);
    marcada = -1;
    const op = catalogo.indiceNomes.ultimaOperacao;
    if (!texto.trim()) {
      $('#nota-busca').textContent = 'A busca percorre a árvore afunilada de nomes.';
    } else if (op && op.tipo === 'prefixo') {
      $('#nota-busca').textContent = sugestoes.length
        ? `${sugestoes.length} ${sugestoes.length === 1 ? 'nome encontrado' : 'nomes encontrados'} com ${op.comparacoes} comparações; o primeiro subiu para a raiz.`
        : `Nenhum nome começa com “${texto.trim()}”.`;
    }
    desenharSugestoes();
    if (estado.aba === 'arvore') animarSplay();
  }

  function desenharSugestoes() {
    $('#sugestoes').innerHTML = sugestoes.map((l, i) =>
      `<li><button type="button" data-id="${l.id}" class="${i === marcada ? 'marcado' : ''}">` +
      `<span class="amostra" style="--cor:${catalogo.corDaCategoria(l.categoria)}"></span>` +
      `<span>${escapar(l.nome)}</span><span class="secundario">${escapar(l.uf)}</span></button></li>`).join('');
  }

  // ---------------------------------------------------------------- controles de exploração
  $('#controle-nivel').addEventListener('input', (e) => {
    estado.nivel = +e.target.value;
    atualizarMapa();
    if (estado.aba === 'saltos') desenharSaltosAtual();
  });
  const controleMin = $('#controle-raio-min');
  const controleMax = $('#controle-raio-max');
  function aoMudarRaio(origem) {
    if (+controleMin.value > +controleMax.value) {
      if (origem === 'min') controleMax.value = controleMin.value;
      else controleMin.value = controleMax.value;
    }
    estado.raioMin = raioDoControle(+controleMin.value);
    estado.raioMax = raioDoControle(+controleMax.value);
    atualizarMapa();
    if (estado.aba === 'saltos') desenharSaltosAtual();
  }
  controleMin.addEventListener('input', () => aoMudarRaio('min'));
  controleMax.addEventListener('input', () => aoMudarRaio('max'));

  // ================================================================ painel de detalhes

  function desenharDetalhes() {
    const painel = $('#painel-detalhes');
    const local = estado.selecionado === null ? null : catalogo.locais[estado.selecionado];
    if (!local) {
      painel.innerHTML =
        '<div class="detalhes-vazio"><h2>Escolha um local</h2>' +
        '<p>Clique num ponto do mapa, num item da lista à esquerda ou pesquise pelo nome. ' +
        'Os pontos maiores são os locais mais altos na lista com saltos: aparecem mesmo nos níveis de detalhe mais altos.</p></div>';
      return;
    }
    const cor = catalogo.corDaCategoria(local.categoria);
    const simbolo = (catalogo.categorias.espiar(local.categoria) || {}).simbolo || '';
    const arvore = catalogo.indiceNomes;
    const prof = arvore.profundidade(local.chaveNome);
    const foto = local.imagem
      ? `<img class="foto" src="${escapar(local.imagem)}" alt="Foto de ${escapar(local.nome)}" loading="lazy" referrerpolicy="no-referrer">`
      : '';
    const substituta = `<div class="foto-substituta" style="--cor:${cor}" ${local.imagem ? 'hidden' : ''} aria-hidden="true">${simbolo}</div>`;

    painel.innerHTML =
      foto + substituta +
      '<div class="ficha">' +
      `<h2>${escapar(local.nome)}</h2>` +
      `<p class="onde"><span class="selo" style="--cor:${cor}">${escapar(catalogo.rotuloDaCategoria(local.categoria))}</span>` +
      `${escapar([local.cidade, local.uf].filter(Boolean).join(', '))}</p>` +
      (local.descricao ? `<p class="descricao">${escapar(local.descricao)}</p>` : '') +
      '<dl>' +
      `<dt>Coordenadas</dt><dd>${Geo.formatarCoordenada(local.lat, local.lon)}</dd>` +
      `<dt>Distância da origem</dt><dd>${Geo.formatarDistancia(local.distancia)}</dd>` +
      `<dt>Relevância</dt><dd>${local.relevancia.toFixed(2).replace('.', ',')}</dd>` +
      '</dl>' +
      '<h3>Nas estruturas</h3><dl>' +
      `<dt>Lista com saltos, posição</dt><dd>${ordinal((estado.posicaoDe.get(local.id) ?? 0) + 1)} de ${numero(catalogo.locais.length)}</dd>` +
      `<dt>Lista com saltos, altura</dt><dd>nível ${local.nivel}</dd>` +
      `<dt>Árvore, profundidade</dt><dd>${prof === 0 ? '0 (raiz)' : prof}</dd>` +
      `<dt>Árvore, ordem alfabética</dt><dd>${ordinal(arvore.posicao(local.chaveNome) + 1)}</dd>` +
      '</dl>' +
      '<div class="acoes">' +
      '<button class="botao" type="button" id="botao-origem-local">Medir distâncias a partir daqui</button>' +
      (local.fonte ? `<a class="botao botao-discreto" href="${escapar(local.fonte)}" target="_blank" rel="noopener">Abrir no Wikidata</a>` : '') +
      '</div></div>';

    const img = painel.querySelector('img.foto');
    if (img) img.addEventListener('error', () => { img.remove(); painel.querySelector('.foto-substituta').hidden = false; });
    $('#botao-origem-local').addEventListener('click', () => mudarOrigem(local.lat, local.lon, local.nome));
  }

  function destacarSelecao(voar) {
    const local = catalogo.locais[estado.selecionado];
    if (!local) return;
    marcadorSelecao.setLatLng([local.lat, local.lon]).addTo(mapa);
    if (voar) mapa.flyTo([local.lat, local.lon], Math.max(mapa.getZoom(), 9), { duration: 0.8 });
  }

  // ================================================================ abas das estruturas

  document.querySelectorAll('.abas [role="tab"]').forEach((botao) => {
    botao.addEventListener('click', () => {
      estado.aba = botao.dataset.aba;
      document.querySelectorAll('.abas [role="tab"]').forEach((b) => b.setAttribute('aria-selected', String(b === botao)));
      document.querySelectorAll('.painel-aba').forEach((p) => { p.hidden = p.dataset.painel !== estado.aba; });
      desenharAbaAtual();
    });
  });

  function desenharAbaAtual() {
    if (estado.aba === 'lista') desenharListaAtual();
    else if (estado.aba === 'saltos') desenharSaltosAtual();
    else desenharArvore();
  }

  // ---------------------------------------------------------------- aba: lista de categorias
  function desenharListaAtual() {
    const op = catalogo.categorias.ultimaOperacao;
    let texto = 'Lista simplesmente encadeada. Clique numa categoria (aqui ou no painel à esquerda) para movê-la ao início; abrir um local faz a categoria dele subir uma posição.';
    if (op && op.encontrado) {
      const rotulo = escapar(catalogo.rotuloDaCategoria(op.chave));
      if (op.politica === 'mover ao início') {
        texto = op.de === op.para
          ? `<b>${rotulo}</b> já estava no início (logo após o nó fixo). Busca sequencial: ${op.comparacoes} comparações.`
          : `Acesso direto a <b>${rotulo}</b>: busca sequencial com ${op.comparacoes} comparações, depois o nó saiu da posição ${op.de} e foi religado na posição ${op.para}, logo após o nó fixo (mover ao início).`;
      } else if (op.politica === 'transposição') {
        texto = op.de === op.para
          ? `Acesso indireto a <b>${rotulo}</b> (um local dela foi aberto). O nó já está colado ao nó fixo, então não sobe mais.`
          : `Acesso indireto a <b>${rotulo}</b> (um local dela foi aberto): transposição da posição ${op.de} para ${op.para}, trocando de lugar só com o vizinho anterior.`;
      } else {
        texto = `<b>${rotulo}</b> é um nó fixo: é acessado (${op.comparacoes} comparação) mas nunca sai do lugar.`;
      }
    }
    $('#explicacao-lista').innerHTML = texto;
    const area = $('#desenho-lista');
    desenharLista(area, catalogo.categorias.paraArray(), {
      ultima: op,
      ativa: catalogo.categoriaAtiva,
      aoClicar: selecionarCategoria,
    });
    // rola até o ponto de onde o nó saiu, para a viagem dele ficar visível
    if (op && op.encontrado) area.scrollTo({ left: Math.max(0, 96 + op.para * 174 - 160), behavior: 'smooth' });
  }

  // ---------------------------------------------------------------- aba: lista com saltos
  /** O último nó do caminho é o predecessor do primeiro nó do anel. */
  function inicioDoAnel(caminho) {
    const ultimo = caminho[caminho.length - 1];
    return ultimo && ultimo.valor ? estado.posicaoDe.get(ultimo.valor.id) + 1 : 0;
  }

  function desenharSaltosAtual() {
    const lista = catalogo.indiceDistancia;
    const op = lista.ultimaConsulta;
    let texto = '';
    if (op && op.tipo === 'busca') {
      const local = catalogo.locais[estado.selecionado];
      texto = `Busca por <b>${escapar(local ? local.nome : '')}</b>, a ${Geo.formatarDistancia(local ? local.distancia : 0)}: ` +
        `${op.comparacoes} comparações descendo do nível ${lista.nivelAtual} ao 0, em vez de até ${numero(lista.tamanho)} numa lista comum. ` +
        'Em amarelo, o percurso.';
    } else if (op && op.tipo === 'faixa') {
      texto = `Consulta do mapa: locais com altura ≥ <b>${op.nivel}</b> entre ${textoRaio(estado.raioMin)} e ${textoRaio(estado.raioMax)}. ` +
        `A descida até o início do anel custou ${op.comparacoesDescida} comparações; depois foram percorridos ${numero(op.nosPercorridos)} nós só do nível ${op.nivel}` +
        ` (${numero(op.retornados)} da categoria escolhida). Os níveis em tom escuro são os exibidos no mapa.`;
    }
    $('#explicacao-saltos').innerHTML = texto;
    desenharSaltos($('#desenho-saltos'), lista, {
      nivelVisivel: estado.nivel,
      posicaoDe: estado.posicaoDe,
      caminho: lista.ultimoCaminho,
      alvoId: op && op.tipo === 'busca' ? estado.selecionado : null,
      posicaoCentro: op && op.tipo === 'faixa' ? inicioDoAnel(lista.ultimoCaminho) : undefined,
      janela: 16,
      rotulo: (v) => v.nome,
      distancia: (v) => Geo.formatarDistancia(v.distancia),
      aoClicar: (v) => abrirLocal(v.id),
    });
  }

  // ---------------------------------------------------------------- aba: árvore afunilada
  const nomeDaChave = (chave) => (catalogo.localDaChave(chave) || { nome: String(chave) }).nome;
  const descreverPasso = (p) => {
    if (p.tipo === 'zig') return `zig: ${nomeDaChave(p.no)} sobe sobre ${nomeDaChave(p.pai)}`;
    return `${p.tipo}: ${nomeDaChave(p.no)} sobe sobre ${nomeDaChave(p.pai)} e ${nomeDaChave(p.avo)}`;
  };

  function explicarArvore() {
    const arvore = catalogo.indiceNomes;
    const op = arvore.ultimaOperacao;
    const altura = arvore.altura();
    let texto = `Árvore com ${numero(arvore.tamanho)} nomes e altura ${altura}.`;
    if (op && op.passos) {
      const contagem = op.passos.reduce((c, p) => ({ ...c, [p.tipo]: (c[p.tipo] || 0) + 1 }), {});
      const resumo = Object.entries(contagem).map(([t, n]) => `${n} ${t}`).join(', ') || 'nenhuma rotação';
      const nome = op.alvo ? escapar(nomeDaChave(op.alvo)) : '';
      if (op.tipo === 'busca') {
        texto = `Abrir <b>${nome}</b>: estava na profundidade ${op.profundidadeAntes} e subiu à raiz em ${op.passos.length} passos (${resumo}). Altura da árvore agora: ${altura}.`;
      } else if (op.tipo === 'splay parcial') {
        texto = `Mouse sobre <b>${nome}</b>: splay parcial de ${op.passos.length} passo (${resumo}), da profundidade ${op.profundidadeAntes} para ${arvore.profundidade(op.alvo)}. Um clique o levaria à raiz.`;
      } else if (op.tipo === 'prefixo') {
        texto = op.encontrado
          ? `Busca pelo prefixo “${escapar(op.chave)}”: um único splay levou <b>${nome}</b>, o primeiro nome em ordem alfabética, à raiz (${resumo}). Os demais resultados vieram por sucessor em ordem.`
          : `Nenhum nome começa com “${escapar(op.chave)}”. O último nó visitado, <b>${nome}</b>, foi levado à raiz.`;
      } else if (op.tipo === 'construção balanceada') {
        texto = `Árvore inicial construída balanceada a partir dos ${numero(arvore.tamanho)} nomes ordenados (altura ${altura}). Abra ou pesquise locais para vê-la se reorganizar.`;
      }
    }
    $('#explicacao-arvore').innerHTML = texto;
    const passos = op && op.passos ? op.passos : [];
    $('#registro-rotacoes').innerHTML = passos.map((p, i) => `<li data-i="${i}">${i + 1}. ${escapar(descreverPasso(p))}</li>`).join('');
    return passos;
  }

  function desenharArvore(etapa) {
    const arvore = catalogo.indiceNomes;
    const prof = +$('#profundidade-arvore').value;
    const op = arvore.ultimaOperacao;
    const passos = explicarArvore();
    const envolvidos = new Set();
    passos.forEach((p) => { envolvidos.add(p.pai); if (p.avo) envolvidos.add(p.avo); });
    const topo = etapa ? etapa.topo : arvore.topo(prof);
    desenharArvoreSVG($('#desenho-arvore'), topo, {
      rotulo: (v) => v.nome,
      cor: (v) => catalogo.corDaCategoria(v.categoria),
      emMovimento: op ? op.alvo : undefined,
      envolvidos,
      aoClicar: (v) => abrirLocal(v.id),
    });
    if (etapa) {
      document.querySelectorAll('#registro-rotacoes li').forEach((li) => li.classList.toggle('atual', etapa.indice !== null && +li.dataset.i === etapa.indice));
    }
  }
  /** Reproduz as fotografias gravadas durante o splay (A4), passo a passo. */
  function animarSplay() {
    const arvore = catalogo.indiceNomes;
    const etapas = arvore.etapas.slice();
    clearInterval(estado.animacao);
    estado.animacao = null;
    const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (etapas.length <= 1 || reduzir) { desenharArvore(); return; }
    let i = 0;
    const mostrar = () => {
      desenharArvore({ topo: etapas[i].topo, indice: i === 0 ? null : i - 1 });
      i++;
      if (i >= etapas.length) { clearInterval(estado.animacao); estado.animacao = null; }
    };
    mostrar();
    estado.animacao = setInterval(mostrar, 750);
  }

  $('#profundidade-arvore').addEventListener('change', (e) => {
    catalogo.indiceNomes.capturarEtapas = +e.target.value;
    desenharArvore();
  });
  $('#botao-repetir').addEventListener('click', animarSplay);
  catalogo.indiceNomes.capturarEtapas = +$('#profundidade-arvore').value;

  // ================================================================ diálogo e redimensionamento
  $('#botao-sobre').addEventListener('click', () => $('#dialogo-sobre').showModal());
  let atrasoRedimensionar = 0;
  window.addEventListener('resize', () => {
    clearTimeout(atrasoRedimensionar);
    atrasoRedimensionar = setTimeout(() => { mapa.invalidateSize(); if (estado.aba === 'saltos') desenharSaltosAtual(); }, 150);
  });

  // ================================================================ início
  // Nível inicial: o mais baixo que mostra no máximo ~400 locais no Brasil todo
  recalcularPosicoes();
  const contagem = catalogo.indiceDistancia.contagemPorNivel();
  estado.nivel = Math.max(0, contagem.findIndex((c) => c <= 400));
  $('#controle-nivel').value = String(estado.nivel);
  desenharCategorias();
  atualizarMapa();
  desenharDetalhes();
  desenharAbaAtual();

  // expõe para depuração no console do navegador
  self.explorador = { catalogo, estado, mapa };
})();
