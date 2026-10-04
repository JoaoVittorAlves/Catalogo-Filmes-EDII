/**
 * ============================================================================
 *  ÁRVORE AFUNILADA (Splay Tree) — versão modificada para navegação
 * ============================================================================
 *
 *  Estrutura HIERÁRQUICA que indexa TODOS os locais pelo NOME. Toda vez que o
 *  usuário pesquisa ou abre um local, ele é levado à raiz por rotações. Por
 *  isso, o "topo" da árvore é, literalmente, o conjunto de locais em que o
 *  usuário está trabalhando agora — e é esse topo que a interface desenha.
 *
 *  ALGORITMO CLÁSSICO (splay ascendente / bottom-up)
 *  ------------------------------------------------
 *  Após acessar o nó x, repete-se até x virar raiz:
 *    ZIG      — o pai de x é a raiz: uma rotação simples.
 *    ZIG-ZIG  — x e o pai são filhos do mesmo lado: gira-se primeiro o pai,
 *               depois x.
 *    ZIG-ZAG  — x e o pai são filhos de lados opostos: gira-se x duas vezes.
 *  Custo amortizado O(log n) por operação.
 *
 *  MODIFICAÇÕES FEITAS PARA A APLICAÇÃO
 *  ------------------------------------
 *  (A1) SPLAY PARCIAL (limitado a k passos): passar o mouse sobre um marcador
 *       é um interesse "fraco". Nesse caso o nó sobe apenas k passos
 *       (zig/zig-zig/zig-zag) em direção à raiz, em vez de ir até ela.
 *       O clique (interesse "forte") faz o splay completo. Isso evita que uma
 *       simples passada do mouse por dezenas de marcadores destrua a forma da
 *       árvore construída pelos acessos reais. É a mesma ideia da política
 *       híbrida da lista de categorias (mover ao início × transposição).
 *
 *  (A2) BUSCA POR PREFIXO com um único splay: para o autocompletar, acha-se o
 *       menor nome ≥ prefixo, faz-se splay apenas DELE e, a partir daí, os
 *       resultados seguintes são obtidos por sucessor em-ordem. Uma consulta
 *       inteira custa um único splay + k sucessores.
 *
 *  (A3) Nós aumentados com TAMANHO da subárvore (mantido nas rotações) e
 *       contador de ACESSOS. O tamanho permite desenhar "+N locais" nas
 *       subárvores recolhidas da visualização e calcular a posição em ordem
 *       alfabética (rank) em O(altura).
 *
 *  (A4) Registro de ROTAÇÕES: cada splay devolve a sequência de passos
 *       (tipo, nó, pai, avô), exibida e animada na interface.
 *
 *  (A5) CONSTRUÇÃO INICIAL BALANCEADA: inserir milhares de nomes já ordenados
 *       numa splay tree gera uma "lista" de altura n. Como a splay tree não
 *       impõe forma, construímos a árvore inicial a partir do vetor ordenado
 *       pelo ponto médio (O(n)), e a partir daí ela evolui pelos acessos.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.ArvoreAfunilada = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class NoAfunilado {
    constructor(chave, valor) {
      this.chave = chave;
      this.valor = valor;
      this.esq = null;
      this.dir = null;
      this.pai = null;
      this.tamanho = 1;  // (A3)
      this.acessos = 0;  // (A3)
    }
  }

  const compararTexto = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const tam = (n) => (n === null ? 0 : n.tamanho);

  class ArvoreAfunilada {
    constructor(comparar = compararTexto) {
      this.comparar = comparar;
      this.raiz = null;
      this.ultimaOperacao = null;
      this.estatisticas = { operacoes: 0, rotacoes: 0, comparacoes: 0 };
      // (A4) Se > 0, cada splay guarda "fotografias" do topo da árvore (até essa
      // profundidade) antes e depois de cada passo, para a animação da interface.
      this.capturarEtapas = 0;
      this.etapas = [];
    }

    get tamanho() { return tam(this.raiz); }

    // ================================================================ rotações
    _atualizar(n) { n.tamanho = 1 + tam(n.esq) + tam(n.dir); }

    /** Rotaciona x sobre o seu pai (x sobe um nível). */
    _rotacionar(x) {
      const p = x.pai;
      const g = p.pai;
      if (p.esq === x) {          // rotação à direita
        p.esq = x.dir;
        if (x.dir) x.dir.pai = p;
        x.dir = p;
      } else {                    // rotação à esquerda
        p.dir = x.esq;
        if (x.esq) x.esq.pai = p;
        x.esq = p;
      }
      p.pai = x;
      x.pai = g;
      if (g === null) this.raiz = x;
      else if (g.esq === p) g.esq = x;
      else g.dir = x;
      this._atualizar(p);
      this._atualizar(x);
      this.estatisticas.rotacoes++;
    }

    /**
     * Splay ascendente. (A1) maxPassos limita quantos passos são executados.
     * (A4) Retorna a lista de passos executados.
     */
    _splay(x, maxPassos = Infinity) {
      const passos = [];
      const capturar = this.capturarEtapas > 0;
      this.etapas = capturar ? [{ passo: null, topo: this.topo(this.capturarEtapas) }] : [];
      while (x.pai !== null && passos.length < maxPassos) {
        const p = x.pai;
        const g = p.pai;
        if (g === null) {
          passos.push({ tipo: 'zig', no: x.chave, pai: p.chave });
          this._rotacionar(x);
        } else if ((g.esq === p) === (p.esq === x)) {
          passos.push({ tipo: 'zig-zig', no: x.chave, pai: p.chave, avo: g.chave });
          this._rotacionar(p);
          this._rotacionar(x);
        } else {
          passos.push({ tipo: 'zig-zag', no: x.chave, pai: p.chave, avo: g.chave });
          this._rotacionar(x);
          this._rotacionar(x);
        }
        if (capturar) this.etapas.push({ passo: passos[passos.length - 1], topo: this.topo(this.capturarEtapas) });
      }
      return passos;
    }

    /** Desce na árvore sem reorganizá-la. */
    _localizar(chave) {
      let atual = this.raiz, ultimo = null, comparacoes = 0, profundidade = 0;
      while (atual !== null) {
        ultimo = atual;
        comparacoes++;
        const c = this.comparar(chave, atual.chave);
        if (c === 0) return { no: atual, ultimo, comparacoes, profundidade };
        atual = c < 0 ? atual.esq : atual.dir;
        profundidade++;
      }
      return { no: null, ultimo, comparacoes, profundidade };
    }

    _registrar(op) {
      this.estatisticas.operacoes++;
      this.estatisticas.comparacoes += op.comparacoes ?? 0;
      this.ultimaOperacao = op;
    }

    // ============================================================== operações

    /**
     * Busca com splay.
     * @param {*} chave
     * @param {object} [opcoes] { maxPassos: número de passos de splay (A1) }
     */
    buscar(chave, opcoes = {}) {
      const maxPassos = opcoes.maxPassos ?? Infinity;
      const { no, ultimo, comparacoes, profundidade } = this._localizar(chave);
      const alvo = no ?? ultimo;
      let passos = [];
      if (alvo !== null) {
        if (no !== null) no.acessos++;
        passos = this._splay(alvo, maxPassos);
      }
      this._registrar({
        tipo: maxPassos === Infinity ? 'busca' : 'splay parcial',
        chave, encontrado: no !== null, profundidadeAntes: profundidade,
        passos, comparacoes, alvo: alvo ? alvo.chave : null,
      });
      return no ? no.valor : null;
    }

    /** Leitura SEM splay (para exibir dados sem "contar" como acesso). */
    espiar(chave) {
      const { no } = this._localizar(chave);
      return no ? no.valor : null;
    }

    /** Profundidade atual de uma chave (−1 se ausente), sem reorganizar. */
    profundidade(chave) {
      const r = this._localizar(chave);
      return r.no ? r.profundidade : -1;
    }

    inserir(chave, valor) {
      if (this.raiz === null) {
        this.raiz = new NoAfunilado(chave, valor);
        this._registrar({ tipo: 'inserção', chave, passos: [], comparacoes: 0 });
        return;
      }
      let atual = this.raiz, pai = null, c = 0, comparacoes = 0;
      while (atual !== null) {
        pai = atual;
        comparacoes++;
        c = this.comparar(chave, atual.chave);
        if (c === 0) {           // já existe: atualiza e faz splay
          atual.valor = valor;
          const passos = this._splay(atual);
          this._registrar({ tipo: 'atualização', chave, passos, comparacoes });
          return;
        }
        atual = c < 0 ? atual.esq : atual.dir;
      }
      const novo = new NoAfunilado(chave, valor);
      novo.pai = pai;
      if (c < 0) pai.esq = novo; else pai.dir = novo;
      for (let a = pai; a !== null; a = a.pai) a.tamanho++;
      const passos = this._splay(novo);
      this._registrar({ tipo: 'inserção', chave, passos, comparacoes });
    }

    remover(chave) {
      const { no } = this._localizar(chave);
      if (no === null) return false;
      this._splay(no);                       // leva o nó à raiz
      const esq = no.esq, dir = no.dir;
      if (esq) esq.pai = null;
      if (dir) dir.pai = null;
      if (esq === null) {
        this.raiz = dir;
      } else {
        this.raiz = esq;                     // splay do máximo da subárvore esquerda
        let max = esq;
        while (max.dir !== null) max = max.dir;
        this._splay(max);
        max.dir = dir;
        if (dir) dir.pai = max;
        this._atualizar(max);
      }
      this._registrar({ tipo: 'remoção', chave, passos: [], comparacoes: 0 });
      return true;
    }

    /**
     * (A2) Busca por prefixo com UM splay.
     * @param {string} prefixo
     * @param {number} limite  máximo de resultados
     * @param {function} [prefixoDe] extrai da chave o texto a comparar
     */
    buscarPorPrefixo(prefixo, limite = 10, prefixoDe = (k) => String(k)) {
      // 1) menor chave ≥ prefixo (limite inferior), sem reorganizar ainda
      let atual = this.raiz, candidato = null, ultimo = null, comparacoes = 0;
      while (atual !== null) {
        ultimo = atual;
        comparacoes++;
        if (this.comparar(atual.chave, prefixo) >= 0) { candidato = atual; atual = atual.esq; }
        else atual = atual.dir;
      }
      // 2) coleta por sucessor em-ordem
      const resultados = [];
      for (let n = candidato; n !== null && resultados.length < limite; n = this._sucessor(n)) {
        if (!prefixoDe(n.chave).startsWith(prefixo)) break;
        resultados.push(n.valor);
      }
      // 3) um único splay: do primeiro resultado (ou do último nó visitado)
      const alvo = resultados.length > 0 ? candidato : ultimo;
      const passos = alvo ? this._splay(alvo) : [];
      this._registrar({
        tipo: 'prefixo', chave: prefixo, encontrado: resultados.length > 0,
        passos, comparacoes, alvo: alvo ? alvo.chave : null,
      });
      return resultados;
    }

    /** (A3) Posição em ordem (0 = primeiro alfabeticamente), sem splay. */
    posicao(chave) {
      let atual = this.raiz, rank = 0;
      while (atual !== null) {
        const c = this.comparar(chave, atual.chave);
        if (c < 0) atual = atual.esq;
        else if (c > 0) { rank += tam(atual.esq) + 1; atual = atual.dir; }
        else return rank + tam(atual.esq);
      }
      return -1;
    }

    /** (A5) Constrói uma árvore perfeitamente balanceada a partir de pares ORDENADOS. */
    construirBalanceada(paresOrdenados) {
      const construir = (ini, fim, pai) => {
        if (ini > fim) return null;
        const meio = (ini + fim) >>> 1;
        const n = new NoAfunilado(paresOrdenados[meio].chave, paresOrdenados[meio].valor);
        n.pai = pai;
        n.esq = construir(ini, meio - 1, n);
        n.dir = construir(meio + 1, fim, n);
        this._atualizar(n);
        return n;
      };
      for (let i = 1; i < paresOrdenados.length; i++) {
        if (this.comparar(paresOrdenados[i - 1].chave, paresOrdenados[i].chave) >= 0) {
          throw new Error('construirBalanceada exige chaves estritamente ordenadas');
        }
      }
      this.raiz = construir(0, paresOrdenados.length - 1, null);
      this.ultimaOperacao = { tipo: 'construção balanceada', passos: [], comparacoes: 0 };
    }

    /** Altura da árvore (iterativo, para não estourar a pilha). */
    altura() {
      if (this.raiz === null) return -1;
      let nivel = [this.raiz], h = -1;
      while (nivel.length) {
        h++;
        const prox = [];
        for (const n of nivel) { if (n.esq) prox.push(n.esq); if (n.dir) prox.push(n.dir); }
        nivel = prox;
      }
      return h;
    }

    /** Percurso em ordem (iterativo). */
    emOrdem() {
      const saida = [], pilha = [];
      let atual = this.raiz;
      while (atual !== null || pilha.length) {
        while (atual !== null) { pilha.push(atual); atual = atual.esq; }
        atual = pilha.pop();
        saida.push({ chave: atual.chave, valor: atual.valor });
        atual = atual.dir;
      }
      return saida;
    }

    /**
     * Cópia do TOPO da árvore até `profundidadeMaxima`, para desenhar.
     * Subárvores cortadas viram { recolhido: true, tamanho }.
     */
    topo(profundidadeMaxima = 4) {
      const copiar = (n, prof) => {
        if (n === null) return null;
        if (prof > profundidadeMaxima) return { recolhido: true, tamanho: n.tamanho };
        return {
          chave: n.chave, valor: n.valor, tamanho: n.tamanho, acessos: n.acessos,
          esq: copiar(n.esq, prof + 1), dir: copiar(n.dir, prof + 1),
        };
      };
      return copiar(this.raiz, 0);
    }

    /** Verifica ordem, ponteiros de pai e tamanhos (usado nos testes). */
    validar() {
      const pilha = [[this.raiz, null]];
      let anterior = null;
      for (const { chave } of this.emOrdem()) {
        if (anterior !== null && this.comparar(anterior, chave) >= 0) return 'ordem violada';
        anterior = chave;
      }
      while (pilha.length) {
        const [n, pai] = pilha.pop();
        if (n === null) continue;
        if (n.pai !== pai) return `ponteiro pai incorreto em ${n.chave}`;
        if (n.tamanho !== 1 + tam(n.esq) + tam(n.dir)) return `tamanho incorreto em ${n.chave}`;
        pilha.push([n.esq, n], [n.dir, n]);
      }
      return null;
    }

    // ---------------------------------------------------------------- auxiliar
    _sucessor(n) {
      if (n.dir !== null) {
        let m = n.dir;
        while (m.esq !== null) m = m.esq;
        return m;
      }
      let filho = n, pai = n.pai;
      while (pai !== null && pai.dir === filho) { filho = pai; pai = pai.pai; }
      return pai;
    }
  }

  ArvoreAfunilada.compararTexto = compararTexto;
  return ArvoreAfunilada;
});
