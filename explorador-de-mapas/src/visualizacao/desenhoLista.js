/**
 * Desenha a Lista com Movimentação ao Início como uma cadeia de nós
 * (cabeça → nó → nó → ∅). Os nós são elementos reaproveitados entre
 * desenhos e posicionados com transform; quando a ordem muda, a transição
 * CSS mostra o nó "viajando" até a nova posição.
 */
(function (raiz) {
  'use strict';

  const escapar = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const LARG = 140, PASSO = 174, TOPO = 40;

  /**
   * @param {HTMLElement} alvo
   * @param {Array} itens   resultado de ListaMoverParaInicio.paraArray()
   * @param {object} o      { ultima: ultimaOperacao, ativa: chave ativa, aoClicar(chave) }
   */
  function desenharLista(alvo, itens, o = {}) {
    let palco = alvo.querySelector('.palco-lista');
    if (!palco) {
      alvo.innerHTML = '<div class="palco-lista"><div class="cabeca-lista">cabeça</div><div class="setas-lista"></div><div class="fim-lista">∅</div></div>';
      palco = alvo.querySelector('.palco-lista');
    }
    const largura = 96 + itens.length * PASSO + 40;
    palco.style.width = `${largura}px`;

    // setas fixas entre as posições (a lista muda, as posições não)
    const setas = palco.querySelector('.setas-lista');
    setas.innerHTML = itens.map((_, i) => {
      const x = (i === 0 ? 72 : 96 + (i - 1) * PASSO + LARG);
      const w = (i === 0 ? 96 - 72 : PASSO - LARG);
      return `<span class="seta" style="left:${x}px;width:${w}px;top:${TOPO + 31}px"></span>`;
    }).join('') + `<span class="seta" style="left:${96 + (itens.length - 1) * PASSO + LARG}px;width:28px;top:${TOPO + 31}px"></span>`;
    palco.querySelector('.fim-lista').style.left = `${96 + itens.length * PASSO - (PASSO - LARG) + 30}px`;

    const existentes = new Map([...palco.querySelectorAll('.no-lista')].map((el) => [el.dataset.chave, el]));
    const vistos = new Set();
    for (const item of itens) {
      let el = existentes.get(item.chave);
      if (!el) {
        el = document.createElement('button');
        el.type = 'button';
        el.className = 'no-lista';
        el.dataset.chave = item.chave;
        el.style.transform = `translateX(${96 + item.posicao * PASSO}px)`;
        palco.appendChild(el);
        if (o.aoClicar) el.addEventListener('click', () => o.aoClicar(item.chave));
      }
      vistos.add(item.chave);
      el.style.setProperty('--cor', item.valor.cor);
      el.classList.toggle('fixo', item.fixo);
      el.classList.toggle('ativo', item.chave === o.ativa);
      el.classList.toggle('movido', Boolean(o.ultima && o.ultima.chave === item.chave && o.ultima.de !== o.ultima.para));
      el.style.top = `${TOPO}px`;
      el.style.transform = `translateX(${96 + item.posicao * PASSO}px)`;
      el.innerHTML =
        `<span class="pos">${item.posicao}</span>` +
        `<span class="rotulo">${escapar(item.valor.rotulo)}</span>` +
        `<span class="dados">${item.valor.quantidade} locais</span>` +
        `<span class="dados">${item.acessos} ${item.acessos === 1 ? 'acesso' : 'acessos'}</span>`;
      el.setAttribute('aria-label', `${item.valor.rotulo}, posição ${item.posicao}`);
    }
    for (const [chave, el] of existentes) if (!vistos.has(chave)) el.remove();
  }

  raiz.desenharLista = desenharLista;
})(typeof self !== 'undefined' ? self : this);
