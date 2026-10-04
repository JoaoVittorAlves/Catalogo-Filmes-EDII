/**
 * Desenha o TOPO da Árvore Afunilada em SVG.
 * Recebe a cópia produzida por ArvoreAfunilada.topo(profundidade): nós reais
 * têm { chave, valor, tamanho, acessos, esq, dir } e subárvores cortadas têm
 * { recolhido: true, tamanho }.
 */
(function (raiz) {
  'use strict';

  const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const encurtar = (t, n) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);

  /**
   * @param {HTMLElement} alvo     elemento que recebe o SVG
   * @param {object|null} topo     resultado de topo()
   * @param {object} opcoes
   *   - rotulo(valor) → texto do nó
   *   - cor(valor)    → cor do nó
   *   - emMovimento   → chave do nó que está subindo (destaque forte)
   *   - envolvidos    → Set de chaves envolvidas nas rotações (destaque leve)
   *   - aoClicar(valor)
   */
  function desenharArvore(alvo, topo, opcoes = {}) {
    const rotulo = opcoes.rotulo ?? ((v) => String(v));
    const cor = opcoes.cor ?? (() => '#3d5a80');
    const envolvidos = opcoes.envolvidos ?? new Set();

    if (topo === null) {
      alvo.innerHTML = '<p class="vazio">A árvore está vazia.</p>';
      return;
    }

    // 1) posições: x pela ordem simétrica (em-ordem), y pela profundidade
    const nos = [];
    const recolhidos = [];
    let indice = 0, profMax = 0;
    (function posicionar(n, prof, pai, lado) {
      if (n === null) return;
      if (n.recolhido) { recolhidos.push({ n, prof, pai, lado }); return; }
      posicionar(n.esq, prof + 1, n, 'esq');
      n._x = indice++;
      n._y = prof;
      profMax = Math.max(profMax, prof);
      nos.push({ n, pai });
      posicionar(n.dir, prof + 1, n, 'dir');
    })(topo, 0, null, null);

    const largNo = 112, altNivel = 70, margem = 16, altCaixa = 38;
    const largura = Math.max(indice * largNo + margem * 2, 320);
    const temRecolhidos = recolhidos.length > 0;
    const altura = (profMax + 1) * altNivel + margem * 2 + (temRecolhidos ? 30 : 0);
    const X = (n) => margem + n._x * largNo + largNo / 2;
    const Y = (prof) => margem + prof * altNivel + altCaixa / 2;

    const partes = [];
    partes.push(`<svg class="svg-arvore" width="${largura}" height="${altura}" viewBox="0 0 ${largura} ${altura}" role="img" aria-label="Topo da árvore afunilada">`);

    // 2) arestas
    for (const { n, pai } of nos) {
      if (pai) partes.push(`<line class="aresta" x1="${X(pai)}" y1="${Y(pai._y) + altCaixa / 2}" x2="${X(n)}" y2="${Y(n._y) - altCaixa / 2}"/>`);
    }
    for (const { n, prof, pai, lado } of recolhidos) {
      const x = X(pai) + (lado === 'esq' ? -largNo * 0.28 : largNo * 0.28);
      const y = Y(prof);
      partes.push(`<line class="aresta aresta-recolhida" x1="${X(pai)}" y1="${Y(pai._y) + altCaixa / 2}" x2="${x}" y2="${y - 10}"/>`);
      partes.push(`<g class="recolhido"><path d="M${x} ${y - 10} L${x - 14} ${y + 12} L${x + 14} ${y + 12} Z"/>` +
        `<text x="${x}" y="${y + 26}">+${n.tamanho}</text></g>`);
    }

    // 3) nós
    for (const { n } of nos) {
      const x = X(n), y = Y(n._y);
      const classes = ['no'];
      if (n._y === 0) classes.push('no-raiz');
      if (opcoes.emMovimento !== undefined && n.chave === opcoes.emMovimento) classes.push('no-movendo');
      else if (envolvidos.has(n.chave)) classes.push('no-envolvido');
      const texto = rotulo(n.valor);
      partes.push(
        `<g class="${classes.join(' ')}" data-chave="${escapar(n.chave)}" tabindex="0">` +
        `<title>${escapar(texto)} — subárvore com ${n.tamanho} nós, ${n.acessos} acessos</title>` +
        `<rect x="${x - largNo / 2 + 5}" y="${y - altCaixa / 2}" width="${largNo - 10}" height="${altCaixa}" rx="5"/>` +
        `<rect class="faixa" x="${x - largNo / 2 + 5}" y="${y - altCaixa / 2}" width="4" height="${altCaixa}" fill="${cor(n.valor)}"/>` +
        `<text class="nome" x="${x + 2}" y="${y - 3}">${escapar(encurtar(texto, 15))}</text>` +
        `<text class="meta" x="${x + 2}" y="${y + 12}">${n.tamanho} nós, ${n.acessos} ac.</text>` +
        `</g>`,
      );
    }
    partes.push('</svg>');
    alvo.innerHTML = partes.join('');

    if (opcoes.aoClicar) {
      const porChave = new Map(nos.map(({ n }) => [String(n.chave), n.valor]));
      alvo.querySelectorAll('g.no').forEach((g) => {
        const acionar = () => opcoes.aoClicar(porChave.get(g.dataset.chave));
        g.addEventListener('click', acionar);
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); acionar(); } });
      });
    }

    // mantém a raiz visível no centro da área de rolagem
    const raizX = X(topo);
    alvo.scrollLeft = Math.max(0, raizX - alvo.clientWidth / 2);
  }

  raiz.desenharArvore = desenharArvore;
})(typeof self !== 'undefined' ? self : this);
