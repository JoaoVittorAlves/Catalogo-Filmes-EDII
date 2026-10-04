/**
 * ============================================================================
 *  LISTA COM MOVIMENTAÇÃO AO INÍCIO (Move-To-Front List) — versão modificada
 * ============================================================================
 *
 *  Estrutura LINEAR usada no Explorador de Mapas para organizar as CATEGORIAS
 *  (praias, museus, parques...). A ordem da lista é exatamente a ordem em que
 *  as categorias aparecem no painel lateral e na legenda do mapa.
 *
 *  ALGORITMO CLÁSSICO
 *  ------------------
 *  Lista simplesmente encadeada. Ao acessar (buscar) um elemento, ele é
 *  removido de sua posição e reinserido na cabeça da lista. Elementos usados
 *  com frequência tendem a ficar perto do início, reduzindo o custo médio da
 *  busca sequencial.
 *
 *  MODIFICAÇÕES FEITAS PARA A APLICAÇÃO
 *  ------------------------------------
 *  (M1) Nós FIXOS (âncoras): alguns nós (ex.: "Todas as categorias") ficam
 *       sempre no topo. O "início" passa a ser a primeira posição DEPOIS do
 *       bloco de nós fixos. Nós fixos nunca se movem e nunca são ultrapassados.
 *
 *  (M2) Política HÍBRIDA conforme o TIPO de acesso:
 *       - acesso 'direto'   (usuário clicou na categoria)  → mover ao início;
 *       - acesso 'indireto' (usuário abriu um LOCAL daquela categoria)
 *                                                          → transposição
 *         (o nó troca de lugar apenas com o vizinho anterior).
 *       Assim, a categoria escolhida explicitamente sobe na hora, enquanto o
 *       interesse "implícito" sobe devagar, sem bagunçar a ordem do usuário.
 *
 *  (M3) Instrumentação: cada nó guarda seu contador de acessos e a lista
 *       registra a última operação (posição de origem/destino, comparações),
 *       usada pela interface para animar e explicar o movimento.
 *
 *  Complexidade: busca O(n), mover ao início O(1) após a busca,
 *  transposição O(1) após a busca (guardamos o "anteanterior" durante a busca).
 *
 *  O arquivo funciona no navegador (expõe window.ListaMoverParaInicio) e no
 *  Node.js (module.exports), o que permite rodar os testes automatizados.
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) module.exports = fabrica();
  else raiz.ListaMoverParaInicio = fabrica();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  class NoLista {
    constructor(chave, valor, fixo) {
      this.chave = chave;     // identificador único (ex.: "praia")
      this.valor = valor;     // carga útil (ex.: { rotulo, cor, quantidade })
      this.fixo = fixo;       // (M1) nó âncora que nunca se move
      this.acessos = 0;       // (M3) quantas vezes foi acessado
      this.proximo = null;
    }
  }

  class ListaMoverParaInicio {
    constructor() {
      this.cabeca = null;
      this.tamanho = 0;
      this.ultimaOperacao = null;
      this.estatisticas = { acessos: 0, comparacoes: 0 };
    }

    /**
     * Insere um novo elemento.
     * - nós comuns entram no FIM (como no algoritmo clássico);
     * - nós fixos entram logo após o último nó fixo (M1), mantendo o
     *   invariante: "todos os nós fixos formam um bloco contíguo no início".
     */
    inserir(chave, valor, opcoes = {}) {
      if (this.contem(chave)) throw new Error(`Chave duplicada: ${chave}`);
      const novo = new NoLista(chave, valor, Boolean(opcoes.fixo));

      if (novo.fixo) {
        const ultimoFixo = this._ultimoFixo();
        if (ultimoFixo === null) {
          novo.proximo = this.cabeca;
          this.cabeca = novo;
        } else {
          novo.proximo = ultimoFixo.proximo;
          ultimoFixo.proximo = novo;
        }
      } else if (this.cabeca === null) {
        this.cabeca = novo;
      } else {
        let atual = this.cabeca;
        while (atual.proximo !== null) atual = atual.proximo;
        atual.proximo = novo;
      }
      this.tamanho++;
      return novo;
    }

    /** Verifica existência SEM reorganizar a lista (não conta como acesso). */
    contem(chave) {
      for (let p = this.cabeca; p !== null; p = p.proximo) if (p.chave === chave) return true;
      return false;
    }

    /** Lê o valor SEM reorganizar a lista. */
    espiar(chave) {
      for (let p = this.cabeca; p !== null; p = p.proximo) if (p.chave === chave) return p.valor;
      return null;
    }

    /**
     * ACESSO com reorganização (operação principal).
     * @param {*} chave  chave procurada
     * @param {'direto'|'indireto'} tipo  (M2) define a política aplicada
     * @returns o valor do nó, ou null se não existir
     */
    acessar(chave, tipo = 'direto') {
      const busca = this._buscar(chave);
      this.estatisticas.acessos++;
      this.estatisticas.comparacoes += busca.comparacoes;

      if (busca.no === null) {
        this.ultimaOperacao = { chave, tipo, encontrado: false, comparacoes: busca.comparacoes };
        return null;
      }

      busca.no.acessos++;
      let novaPosicao = busca.posicao;
      let politica = 'nenhuma (nó fixo)';

      if (!busca.no.fixo) {
        if (tipo === 'direto') {
          novaPosicao = this._moverParaInicio(busca);
          politica = 'mover ao início';
        } else {
          novaPosicao = this._transpor(busca);
          politica = 'transposição';
        }
      }

      this.ultimaOperacao = {
        chave, tipo, politica, encontrado: true,
        de: busca.posicao, para: novaPosicao, comparacoes: busca.comparacoes,
      };
      return busca.no.valor;
    }

    /** Remove um nó (comuns ou fixos). */
    remover(chave) {
      const b = this._buscar(chave);
      if (b.no === null) return false;
      if (b.anterior === null) this.cabeca = b.no.proximo;
      else b.anterior.proximo = b.no.proximo;
      this.tamanho--;
      return true;
    }

    /** Custo médio (comparações por acesso) — exibido na interface. */
    custoMedio() {
      const { acessos, comparacoes } = this.estatisticas;
      return acessos === 0 ? 0 : comparacoes / acessos;
    }

    /** Fotografia da lista para a visualização. */
    paraArray() {
      const saida = [];
      let i = 0;
      for (let p = this.cabeca; p !== null; p = p.proximo, i++) {
        saida.push({ posicao: i, chave: p.chave, valor: p.valor, fixo: p.fixo, acessos: p.acessos });
      }
      return saida;
    }

    // ------------------------------------------------------------------ privados

    /** Busca sequencial guardando anterior e anteanterior (necessários em M2). */
    _buscar(chave) {
      let anteAnterior = null, anterior = null, atual = this.cabeca;
      let posicao = 0, comparacoes = 0;
      while (atual !== null) {
        comparacoes++;
        if (atual.chave === chave) return { no: atual, anterior, anteAnterior, posicao, comparacoes };
        anteAnterior = anterior;
        anterior = atual;
        atual = atual.proximo;
        posicao++;
      }
      return { no: null, anterior: null, anteAnterior: null, posicao: -1, comparacoes };
    }

    _ultimoFixo() {
      let ultimo = null;
      for (let p = this.cabeca; p !== null && p.fixo; p = p.proximo) ultimo = p;
      return ultimo;
    }

    _quantidadeFixos() {
      let n = 0;
      for (let p = this.cabeca; p !== null && p.fixo; p = p.proximo) n++;
      return n;
    }

    /**
     * (M1) Mover ao início RESPEITANDO os nós fixos.
     * O destino é logo depois do último nó fixo, e não a cabeça da lista.
     */
    _moverParaInicio({ no, anterior }) {
      const limite = this._ultimoFixo();       // null se não há nós fixos
      if (anterior === limite) return this._quantidadeFixos(); // já está no "início"

      // 1) desliga o nó da posição atual (anterior != null aqui)
      anterior.proximo = no.proximo;
      // 2) religa logo após o bloco fixo
      if (limite === null) {
        no.proximo = this.cabeca;
        this.cabeca = no;
      } else {
        no.proximo = limite.proximo;
        limite.proximo = no;
      }
      return this._quantidadeFixos();
    }

    /**
     * (M2) Transposição: troca o nó com o anterior, sem ultrapassar nós fixos.
     *   antes:  anteAnterior → anterior → no → resto
     *   depois: anteAnterior → no → anterior → resto
     */
    _transpor({ no, anterior, anteAnterior, posicao }) {
      if (anterior === null || anterior.fixo) return posicao;
      anterior.proximo = no.proximo;
      no.proximo = anterior;
      if (anteAnterior === null) this.cabeca = no;
      else anteAnterior.proximo = no;
      return posicao - 1;
    }
  }

  return ListaMoverParaInicio;
});
