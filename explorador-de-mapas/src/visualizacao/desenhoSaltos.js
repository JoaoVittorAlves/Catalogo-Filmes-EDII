/**
 * Desenha a Lista com Saltos em duas partes:
 *  1) VISÃO GERAL: uma linha por nível; cada ponto é um nó, posicionado pela
 *     sua ordem no nível 0 (do mais próximo ao mais distante da origem).
 *     O percurso da última busca aparece como uma linha sobre os níveis.
 *  2) DETALHE: a representação clássica (torres e ponteiros) de uma janela
 *     de nós consecutivos, centrada no local selecionado.
 */
(function (raiz) {
  'use strict';

  const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const encurtar = (t, n) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

  /**
   * @param {HTMLElement} alvo
   * @param {ListaComSaltos} lista
   * @param {object} o
   *   - nivelVisivel  nível de detalhe escolhido no mapa
   *   - posicaoDe     Map(id → posição no nível 0)
   *   - caminho       lista.ultimoCaminho
   *   - alvoId        id do local procurado (ou null)
   *   - posicaoCentro posição (nível 0) em torno da qual abrir o detalhe
   *   - janela        quantidade de colunas no detalhe
   *   - rotulo(valor), distancia(valor)
   *   - aoClicar(valor)
   */
  function desenharSaltos(alvo, lista, o) {
    const n = lista.tamanho;
    if (n === 0) { alvo.innerHTML = '<p class="vazio">A lista está vazia.</p>'; return; }
    const topoNivel = lista.nivelAtual;
    const L = o.nivelVisivel;
    const larguraUtil = Math.max(alvo.clientWidth - 24, 640);
    const partes = [];

    // ------------------------------------------------------------ visão geral
    const margemEsq = 64, altLinha = 10, topoGeral = 18;
    const largGeral = larguraUtil - margemEsq - 12;
    const xDe = (pos) => margemEsq + (n === 1 ? 0 : (pos / (n - 1)) * largGeral);
    const yGeral = (nivel) => topoGeral + (topoNivel - nivel) * altLinha;
    const alturaGeral = topoGeral + (topoNivel + 1) * altLinha + 8;

    const contagem = lista.contagemPorNivel();
    const geral = [];
    for (let i = topoNivel; i >= 0; i--) {
      const ativo = i >= L;
      const y = yGeral(i);
      geral.push(`<text class="rotulo-nivel${ativo ? ' ativo' : ''}" x="4" y="${y + 3.5}">N${i}: ${contagem[i]}</text>`);
      geral.push(`<line class="trilho${ativo ? ' ativo' : ''}" x1="${margemEsq}" y1="${y}" x2="${margemEsq + largGeral}" y2="${y}"/>`);
      if (contagem[i] > 700) {
        geral.push(`<rect class="faixa-densa${ativo ? ' ativo' : ''}" x="${margemEsq}" y="${y - 3}" width="${largGeral}" height="6"/>`);
      } else {
        const pontos = [];
        for (let p = lista.cabeca.proximos[i]; p !== null; p = p.proximos[i]) {
          pontos.push(`M${xDe(o.posicaoDe.get(p.valor.id)).toFixed(1)} ${y}h0.01`);
        }
        geral.push(`<path class="pontos${ativo ? ' ativo' : ''}" d="${pontos.join('')}"/>`);
      }
    }

    // percurso da última busca
    const caminho = o.caminho ?? [];
    if (caminho.length) {
      const pts = [[margemEsq - 10, yGeral(caminho[0].nivel)]];
      for (const passo of caminho) {
        const x = passo.valor ? xDe(o.posicaoDe.get(passo.valor.id)) : margemEsq - 10;
        const y = yGeral(passo.nivel);
        const [ux, uy] = pts[pts.length - 1];
        if (y !== uy) pts.push([ux, y]);
        if (x !== ux || y !== uy) pts.push([x, y]);
      }
      if (o.alvoId !== null && o.alvoId !== undefined && o.posicaoDe.has(o.alvoId)) {
        const [ux, uy] = pts[pts.length - 1];
        const xa = xDe(o.posicaoDe.get(o.alvoId));
        if (uy !== yGeral(0)) pts.push([ux, yGeral(0)]);
        pts.push([xa, yGeral(0)]);
        geral.push(`<circle class="alvo-geral" cx="${xa}" cy="${yGeral(0)}" r="5"/>`);
      }
      geral.push(`<polyline class="percurso" points="${pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}"/>`);
    }

    // ------------------------------------------------------------ detalhe
    const janela = o.janela ?? 16;
    const posAlvo = o.posicaoCentro ?? (o.alvoId !== null && o.alvoId !== undefined && o.posicaoDe.has(o.alvoId) ? o.posicaoDe.get(o.alvoId) : 0);
    const inicio = Math.max(0, Math.min(n - janela, posAlvo - Math.floor(janela / 3)));
    const colunas = [];
    {
      let p = lista.cabeca.proximos[0], k = 0;
      while (p !== null && k < inicio) { p = p.proximos[0]; k++; }
      while (p !== null && colunas.length < janela) { colunas.push(p); p = p.proximos[0]; }
    }
    const fim = inicio + colunas.length - 1;
    geral.push(`<rect class="janela" x="${xDe(inicio) - 3}" y="${topoGeral - 8}" width="${Math.max(6, xDe(fim) - xDe(inicio) + 6)}" height="${(topoNivel + 1) * altLinha + 2}" rx="3"/>`);

    const visitados = new Set(caminho.map((c) => `${c.valor ? c.valor.id : 'cabeca'}:${c.nivel}`));
    const largCol = 70, altCaixa = 13, sep = 3;
    const topoDet = alturaGeral + 26;
    const xCol = (j) => 40 + (j + 1) * largCol + (inicio > 0 ? 26 : 0); // j = −1 é a cabeça
    // só desenha os níveis que interessam à janela (a maior torre dela + 1)
    const nivelDet = Math.min(topoNivel, Math.max(0, ...colunas.map((c) => c.nivel)) + 1);
    const yDet = (nivel) => topoDet + (nivelDet - nivel) * (altCaixa + sep);
    const baseDet = yDet(0) + altCaixa;
    const alturaTotal = baseDet + 44;
    const largTotal = Math.max(larguraUtil, xCol(colunas.length) + 30);
    const indiceColuna = new Map(colunas.map((c, j) => [c, j]));

    const det = [];
    det.push(`<text class="titulo-detalhe" x="20" y="${topoDet - 12}">Detalhe: nós ${inicio + 1} a ${fim + 1} de ${n}` +
      (nivelDet < topoNivel ? `, níveis 0 a ${nivelDet} (acima disso nenhum nó desta janela tem altura)` : '') + '</text>');

    // cabeça
    for (let i = 0; i <= nivelDet; i++) {
      const vis = visitados.has(`cabeca:${i}`) ? ' visitado' : '';
      det.push(`<rect class="caixa cabeca${vis}" x="${xCol(-1) - 22}" y="${yDet(i)}" width="44" height="${altCaixa}" rx="3"/>`);
    }
    det.push(`<text class="legenda-coluna" x="${xCol(-1)}" y="${baseDet + 14}">cabeça</text>`);
    if (inicio > 0) det.push(`<text class="reticencias" x="${xCol(-1) + largCol / 2 + 13}" y="${baseDet - 4}">…</text>`);

    // ponteiros
    const ponteiro = (de, j, i, alvoNo) => {
      const x1 = (j === -1 ? xCol(-1) + 22 : xCol(j) + 22);
      const y = yDet(i) + altCaixa / 2;
      if (alvoNo === null) {
        det.push(`<text class="nulo" x="${x1 + 8}" y="${y + 4}">∅</text>`);
        return;
      }
      const k = indiceColuna.get(alvoNo);
      const ativo = i >= L ? ' ativo' : '';
      if (k === undefined) {
        const x2 = (j === -1 && inicio > 0) ? xCol(0) - 30 : largTotal - 10;
        det.push(`<line class="ponteiro saindo${ativo}" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>`);
      } else {
        det.push(`<line class="ponteiro${ativo}" x1="${x1}" y1="${y}" x2="${xCol(k) - 24}" y2="${y}" marker-end="url(#seta)"/>`);
      }
    };
    for (let i = 0; i <= nivelDet; i++) ponteiro(lista.cabeca, -1, i, lista.cabeca.proximos[i]);

    // torres
    colunas.forEach((no, j) => {
      const x = xCol(j);
      const ehAlvo = no.valor.id === o.alvoId;
      det.push(`<g class="torre${ehAlvo ? ' torre-alvo' : ''}${no.nivel >= L ? ' visivel' : ''}" data-id="${no.valor.id}" tabindex="0">`);
      det.push(`<title>${escapar(o.rotulo(no.valor))}: altura ${no.nivel}, ${escapar(o.distancia(no.valor))}</title>`);
      for (let i = 0; i <= no.nivel; i++) {
        const vis = visitados.has(`${no.valor.id}:${i}`) ? ' visitado' : '';
        det.push(`<rect class="caixa${vis}" x="${x - 22}" y="${yDet(i)}" width="44" height="${altCaixa}" rx="3"/>`);
      }
      det.push(`<text class="legenda-coluna" x="${x}" y="${baseDet + 14}">${escapar(encurtar(o.rotulo(no.valor), 11))}</text>`);
      det.push(`<text class="legenda-distancia" x="${x}" y="${baseDet + 28}">${escapar(o.distancia(no.valor))}</text>`);
      det.push('</g>');
      for (let i = 0; i <= no.nivel; i++) ponteiro(no, j, i, no.proximos[i]);
    });

    partes.push(`<svg class="svg-saltos" width="${largTotal}" height="${alturaTotal}" viewBox="0 0 ${largTotal} ${alturaTotal}" role="img" aria-label="Lista com saltos">`);
    partes.push('<defs><marker id="seta" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8 z" class="ponta-seta"/></marker></defs>');
    partes.push(`<text class="titulo-detalhe" x="4" y="10">Visão geral: todos os ${n} nós, do mais próximo ao mais distante</text>`);
    partes.push(...geral, ...det, '</svg>');
    alvo.innerHTML = partes.join('');

    if (o.aoClicar) {
      const porId = new Map(colunas.map((c) => [String(c.valor.id), c.valor]));
      alvo.querySelectorAll('g.torre').forEach((g) => {
        const acionar = () => o.aoClicar(porId.get(g.dataset.id));
        g.addEventListener('click', acionar);
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); acionar(); } });
      });
    }
  }

  raiz.desenharSaltos = desenharSaltos;
})(typeof self !== 'undefined' ? self : this);
