/**
 * ============================================================================
 *  LISTA COM SALTOS (Skip List) — versão modificada para exploração geográfica
 * ============================================================================
 *
 *  É o ÍNDICE PRINCIPAL de locais do Explorador de Mapas. Todos os locais da
 *  base ficam no nível 0, ordenados pela DISTÂNCIA até um ponto de origem
 *  escolhido pelo usuário. Os níveis superiores funcionam como "níveis de
 *  detalhe" do mapa: quanto mais alto o nível, menos locais (e mais
 *  importantes) são mostrados.
 *
 *  ALGORITMO CLÁSSICO
 *  ------------------
 *  Cada nó recebe uma altura sorteada por "cara ou coroa" (p = 1/2). Os nós do
 *  nível i formam uma lista ordenada que "pula" sobre os nós dos níveis
 *  inferiores. Busca, inserção e remoção custam O(log n) esperado.
 *
 *  MODIFICAÇÕES FEITAS PARA A APLICAÇÃO
 *  ------------------------------------
 *  (S1) Chave composta e reconstruível: a chave é { d: distância, id }. O id
 *       desempata locais à mesma distância. Quando o usuário move a origem,
 *       a lista é reconstruída com as novas distâncias.
 *
 *  (S2) Altura por RELEVÂNCIA (promoção ponderada com piso): em vez de
 *       p fixo = 1/2, cada local é promovido com probabilidade
 *              p(r) = pMin + (pMax − pMin) · r ,  r ∈ [0, 1]
 *       onde r é a relevância do local, e a contagem começa de um PISO que
 *       só vale para os locais muito relevantes (r acima do limiar):
 *              piso(r) = ⌊pisoMaximo · (r − limiar) / (1 − limiar)⌋ , se r > limiar
 *              piso(r) = 0                                          , caso contrário
 *       Locais famosos tendem a ficar nos níveis altos (e nunca abaixo do
 *       piso), de modo que a "visão resumida" mostra o que importa.
 *       Com pMin = 0,25 e pMax = 0,75 a média de p continua 1/2; o piso só
 *       afeta a pequena fração de locais muito relevantes, então a altura
 *       esperada continua O(log n) e a complexidade é preservada.
 *
 *  (S3) Altura ESTÁVEL (sorteio determinístico): o gerador pseudoaleatório é
 *       semeado pelo id do local. Ao reconstruir a lista para uma nova origem,
 *       cada local mantém a mesma altura — o nível de detalhe é uma
 *       propriedade do local, e não um acidente da última reconstrução.
 *
 *  (S4) Consulta de FAIXA POR NÍVEL: faixaNoNivel(min, max, L) desce pelos
 *       níveis como na busca clássica, mas PARA no nível L (em vez de 0) e
 *       percorre apenas a lista daquele nível. É isso que alimenta o mapa:
 *       "todos os locais do nível ≥ L num raio de R km da origem".
 *       Custo: O(log n + k_L), onde k_L é o número de nós do nível L na faixa.
 *
 *  (S5) Caminho de busca registrado: cada consulta guarda os nós visitados,
 *       por nível, para que a interface desenhe o percurso da busca.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.ListaComSaltos = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class NoSalto {
    constructor(chave, valor, nivel) {
      this.chave = chave;
      this.valor = valor;
      this.proximos = new Array(nivel + 1).fill(null); // proximos[i] = sucessor no nível i
    }
    get nivel() { return this.proximos.length - 1; }
  }

  /** Comparador padrão: chaves numéricas simples. */
  const compararNumeros = (a, b) => a - b;

  /** Comparador da aplicação (S1): distância e, em empate, id. */
  const compararDistanciaId = (a, b) => (a.d - b.d) || (a.id - b.id);

  // ------------------------------------------------ gerador determinístico (S3)
  function hash32(texto) {
    // FNV-1a de 32 bits
    let h = 0x811c9dc5;
    const s = String(texto);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }
  function mulberry32(semente) {
    let a = semente >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class ListaComSaltos {
    /**
     * @param {object} opcoes
     * @param {number}   opcoes.nivelMaximo  maior nível permitido
     * @param {function} opcoes.comparar     comparador de chaves
     * @param {function} opcoes.sortearNivel (valor) => nível; padrão = moeda p=1/2
     */
    constructor(opcoes = {}) {
      this.nivelMaximo = opcoes.nivelMaximo ?? 12;
      this.comparar = opcoes.comparar ?? compararNumeros;
      this.sortearNivel = opcoes.sortearNivel ?? (() => this._nivelClassico());
      this.limpar();
    }

    limpar() {
      this.cabeca = new NoSalto(null, null, this.nivelMaximo); // sentinela
      this.nivelAtual = 0;   // maior nível efetivamente ocupado
      this.tamanho = 0;
      this.ultimoCaminho = [];
      this.ultimaConsulta = null;
    }

    _nivelClassico() {
      let n = 0;
      while (n < this.nivelMaximo && Math.random() < 0.5) n++;
      return n;
    }

    /**
     * (S2 + S3) Fábrica de sorteador por relevância e determinístico.
     * @param {object} cfg { pMin, pMax, pisoMaximo, limiar, nivelMaximo, relevancia(valor), semente(valor) }
     */
    static sorteadorPorRelevancia(cfg = {}) {
      const pMin = cfg.pMin ?? 0.25;
      const pMax = cfg.pMax ?? 0.75;
      const pisoMaximo = cfg.pisoMaximo ?? 3;
      const limiar = cfg.limiar ?? 0.6;
      const nivelMaximo = cfg.nivelMaximo ?? 12;
      const relevancia = cfg.relevancia ?? ((v) => v.relevancia ?? 0);
      const semente = cfg.semente ?? ((v) => v.id);
      return function (valor) {
        const r = Math.min(1, Math.max(0, relevancia(valor)));
        const p = pMin + (pMax - pMin) * r;
        const aleatorio = mulberry32(hash32(semente(valor)));
        const piso = r > limiar ? Math.floor((pisoMaximo * (r - limiar)) / (1 - limiar) + 1e-9) : 0;
        let nivel = Math.min(nivelMaximo, piso); // começa do piso, não de zero
        while (nivel < nivelMaximo && aleatorio() < p) nivel++;
        return nivel;
      };
    }

    /**
     * Desce pela estrutura até o nível `nivelParada`, registrando o caminho.
     * Devolve o vetor `atualizar`, onde atualizar[i] é o último nó do nível i
     * cuja chave é MENOR que `chave` (exatamente como no algoritmo clássico).
     */
    _descer(chave, nivelParada = 0) {
      const atualizar = new Array(this.nivelMaximo + 1).fill(this.cabeca);
      const caminho = [];
      let comparacoes = 0;
      let x = this.cabeca;
      for (let i = this.nivelAtual; i >= nivelParada; i--) {
        while (x.proximos[i] !== null) {
          comparacoes++;
          if (this.comparar(x.proximos[i].chave, chave) < 0) {
            x = x.proximos[i];
            caminho.push({ nivel: i, chave: x.chave, valor: x.valor });
          } else break;
        }
        atualizar[i] = x;
        caminho.push({ nivel: i, chave: x.chave, valor: x.valor, desceu: true });
      }
      return { x, atualizar, caminho, comparacoes };
    }

    /** Inserção clássica, usando o sorteador configurado (S2/S3). */
    inserir(chave, valor, nivelForcado) {
      const { x, atualizar } = this._descer(chave, 0);
      const candidato = x.proximos[0];
      if (candidato !== null && this.comparar(candidato.chave, chave) === 0) {
        candidato.valor = valor; // chave repetida: atualiza
        return candidato;
      }
      const nivel = Math.min(this.nivelMaximo, nivelForcado ?? this.sortearNivel(valor));
      if (nivel > this.nivelAtual) {
        for (let i = this.nivelAtual + 1; i <= nivel; i++) atualizar[i] = this.cabeca;
        this.nivelAtual = nivel;
      }
      const novo = new NoSalto(chave, valor, nivel);
      for (let i = 0; i <= nivel; i++) {
        novo.proximos[i] = atualizar[i].proximos[i];
        atualizar[i].proximos[i] = novo;
      }
      this.tamanho++;
      return novo;
    }

    /** Busca exata (registra o caminho em ultimoCaminho). */
    buscar(chave) {
      const { x, caminho, comparacoes } = this._descer(chave, 0);
      const candidato = x.proximos[0];
      const achou = candidato !== null && this.comparar(candidato.chave, chave) === 0;
      this.ultimoCaminho = caminho;
      this.ultimaConsulta = { tipo: 'busca', comparacoes, encontrado: achou };
      return achou ? candidato.valor : null;
    }

    remover(chave) {
      const { x, atualizar } = this._descer(chave, 0);
      const alvo = x.proximos[0];
      if (alvo === null || this.comparar(alvo.chave, chave) !== 0) return false;
      for (let i = 0; i <= alvo.nivel; i++) {
        if (atualizar[i].proximos[i] === alvo) atualizar[i].proximos[i] = alvo.proximos[i];
      }
      while (this.nivelAtual > 0 && this.cabeca.proximos[this.nivelAtual] === null) this.nivelAtual--;
      this.tamanho--;
      return true;
    }

    /**
     * (S4) Consulta de faixa restrita a um nível.
     * Retorna os valores com min ≤ chave ≤ max cujos nós têm altura ≥ nivel.
     * @param {*} min, max  limites (chaves)
     * @param {number} nivel  nível de detalhe (0 = tudo)
     * @param {function} [filtro] predicado opcional sobre o valor (ex.: categoria)
     * @param {number} [limite] quantidade máxima de resultados
     */
    faixaNoNivel(min, max, nivel = 0, filtro = null, limite = Infinity) {
      const L = Math.max(0, Math.min(nivel, this.nivelAtual));
      const { x, caminho, comparacoes } = this._descer(min, L);
      const resultado = [];
      let passos = 0;
      let p = x.proximos[L];
      while (p !== null && this.comparar(p.chave, max) <= 0 && resultado.length < limite) {
        passos++;
        if (filtro === null || filtro(p.valor)) resultado.push({ chave: p.chave, valor: p.valor, nivel: p.nivel });
        p = p.proximos[L];
      }
      this.ultimoCaminho = caminho;
      this.ultimaConsulta = {
        tipo: 'faixa', nivel: L, comparacoesDescida: comparacoes,
        nosPercorridos: passos, retornados: resultado.length,
      };
      return resultado;
    }

    /** Primeiros k elementos (do nível 0) — os k mais próximos da origem. */
    primeiros(k) {
      const saida = [];
      for (let p = this.cabeca.proximos[0]; p !== null && saida.length < k; p = p.proximos[0]) {
        saida.push({ chave: p.chave, valor: p.valor, nivel: p.nivel });
      }
      return saida;
    }

    /** Quantidade de nós em cada nível (para a legenda e estatísticas). */
    contagemPorNivel() {
      const contagem = [];
      for (let i = 0; i <= this.nivelAtual; i++) {
        let n = 0;
        for (let p = this.cabeca.proximos[i]; p !== null; p = p.proximos[i]) n++;
        contagem.push(n);
      }
      return contagem;
    }

    /** Percorre o nível 0 em ordem. */
    *[Symbol.iterator]() {
      for (let p = this.cabeca.proximos[0]; p !== null; p = p.proximos[0]) yield { chave: p.chave, valor: p.valor, nivel: p.nivel };
    }

    /** Verifica os invariantes (usado nos testes). */
    validar() {
      for (let i = 0; i <= this.nivelAtual; i++) {
        let anterior = null;
        for (let p = this.cabeca.proximos[i]; p !== null; p = p.proximos[i]) {
          if (p.nivel < i) return `nó de altura ${p.nivel} encadeado no nível ${i}`;
          if (anterior !== null && this.comparar(anterior.chave, p.chave) >= 0) return `desordem no nível ${i}`;
          anterior = p;
        }
      }
      return null;
    }
  }

  ListaComSaltos.compararNumeros = compararNumeros;
  ListaComSaltos.compararDistanciaId = compararDistanciaId;
  ListaComSaltos.hash32 = hash32;
  ListaComSaltos.mulberry32 = mulberry32;
  return ListaComSaltos;
});
