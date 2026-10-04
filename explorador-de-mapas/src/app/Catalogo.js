/**
 * ============================================================================
 *  CATÁLOGO — camada de modelo que integra as três estruturas de dados
 * ============================================================================
 *
 *  Não conhece nada de HTML ou do mapa: recebe os dados brutos, monta as
 *  estruturas e expõe as OPERAÇÕES DE NEGÓCIO que a interface chama.
 *
 *     Funcionalidade da interface         Estrutura que a implementa
 *     ---------------------------------   ----------------------------------------
 *     painel de categorias (ordem)        ListaMoverParaInicio  (linear)
 *     escolher categoria                  acessar(cat, 'direto')   → mover ao início
 *     abrir um local                      acessar(cat, 'indireto') → transposição
 *     locais no mapa / nível de detalhe   ListaComSaltos.faixaNoNivel(0, raio, L)
 *     mover a origem                      reconstrução da ListaComSaltos
 *     pesquisar por nome (autocompletar)  ArvoreAfunilada.buscarPorPrefixo
 *     abrir um local                      ArvoreAfunilada.buscar (splay completo)
 *     passar o mouse num marcador         ArvoreAfunilada.buscar (splay parcial)
 *
 *  Os locais ficam armazenados nas estruturas: a Skip List guarda todos no
 *  nível 0 (índice espacial) e a Splay Tree guarda todos pelo nome (índice
 *  textual). O vetor `locais` serve apenas como carga inicial e como acesso
 *  direto por id (índice numérico).
 */
(function (raiz, fabrica) {
  if (typeof module === 'object' && module.exports) {
    module.exports = fabrica(
      require('../estruturas/ListaMoverParaInicio.js'),
      require('../estruturas/ListaComSaltos.js'),
      require('../estruturas/ArvoreAfunilada.js'),
      require('../util/geo.js'),
    );
  } else {
    raiz.Catalogo = fabrica(raiz.ListaMoverParaInicio, raiz.ListaComSaltos, raiz.ArvoreAfunilada, raiz.Geo);
  }
})(typeof self !== 'undefined' ? self : this, function (ListaMoverParaInicio, ListaComSaltos, ArvoreAfunilada, Geo) {
  'use strict';

  const CATEGORIAS_PADRAO = [
    { chave: 'cidade',    rotulo: 'Cidades',     cor: '#3d5a80', simbolo: '◼' },
    { chave: 'praia',     rotulo: 'Praias',      cor: '#1f9bb0', simbolo: '≈' },
    { chave: 'museu',     rotulo: 'Museus',      cor: '#8e4a9c', simbolo: '▣' },
    { chave: 'parque',    rotulo: 'Parques',     cor: '#3f8a4f', simbolo: '♣' },
    { chave: 'monumento', rotulo: 'Monumentos',  cor: '#b5562b', simbolo: '▲' },
    { chave: 'igreja',    rotulo: 'Igrejas',     cor: '#7a6a3a', simbolo: '✚' },
    { chave: 'cachoeira', rotulo: 'Cachoeiras',  cor: '#2f6fd1', simbolo: '⌇' },
    { chave: 'teatro',    rotulo: 'Teatros',     cor: '#c0395b', simbolo: '◐' },
    { chave: 'forte',     rotulo: 'Fortes',      cor: '#5b5b5b', simbolo: '⛫' },
    { chave: 'ilha',      rotulo: 'Ilhas',       cor: '#0f8a76', simbolo: '◍' },
  ];
  const TODAS = 'todas';
  const NIVEL_MAXIMO = 10;

  class Catalogo {
    /**
     * @param {Array} brutos  registros { nome, categoria, cidade, uf, lat, lon, relevancia, descricao, imagem, fonte }
     * @param {object} [opcoes] { categorias, origem: {lat, lon} }
     */
    constructor(brutos, opcoes = {}) {
      this.definicoes = opcoes.categorias ?? CATEGORIAS_PADRAO;
      this.locais = this._normalizarRegistros(brutos);

      // ---------- estrutura linear: categorias com movimentação ao início
      this.categorias = new ListaMoverParaInicio();
      this.categorias.inserir(TODAS, { rotulo: 'Todas as categorias', cor: '#24324a', simbolo: '✱', quantidade: this.locais.length }, { fixo: true });
      for (const def of this.definicoes) {
        const quantidade = this.locais.filter((l) => l.categoria === def.chave).length;
        if (quantidade > 0) this.categorias.inserir(def.chave, { ...def, quantidade });
      }
      this.categoriaAtiva = TODAS;

      // ---------- estrutura hierárquica: índice por nome (splay tree)
      this.indiceNomes = new ArvoreAfunilada();
      const pares = this.locais
        .map((l) => ({ chave: l.chaveNome, valor: l }))
        .sort((a, b) => ArvoreAfunilada.compararTexto(a.chave, b.chave));
      this.indiceNomes.construirBalanceada(pares); // (A5)

      // ---------- skip list: índice por distância à origem
      this.sortearNivel = ListaComSaltos.sorteadorPorRelevancia({ nivelMaximo: NIVEL_MAXIMO }); // (S2 + S3)
      this.indiceDistancia = new ListaComSaltos({
        nivelMaximo: NIVEL_MAXIMO,
        comparar: ListaComSaltos.compararDistanciaId, // (S1)
        sortearNivel: this.sortearNivel,
      });
      const origem = opcoes.origem ?? { lat: -15.7939, lon: -47.8828 };
      this.definirOrigem(origem.lat, origem.lon);
    }

    _normalizarRegistros(brutos) {
      return brutos
        .filter((r) => Number.isFinite(+r.lat) && Number.isFinite(+r.lon) && r.nome)
        .map((r, id) => {
          const nome = String(r.nome).trim();
          return {
            id,
            nome,
            categoria: r.categoria,
            cidade: r.cidade ?? '',
            uf: r.uf ?? '',
            lat: +r.lat,
            lon: +r.lon,
            relevancia: Math.min(1, Math.max(0, +r.relevancia || 0)),
            descricao: r.descricao ?? '',
            imagem: r.imagem ?? null,
            fonte: r.fonte ?? null,
            chaveNome: `${Geo.normalizar(nome)}\u0000${String(id).padStart(7, '0')}`,
            nivel: 0,       // preenchido pela skip list
            distancia: 0,   // preenchido pela skip list
          };
        });
    }

    // ===================================================== operações de negócio

    /** Move a origem e RECONSTRÓI a skip list (S1). Alturas não mudam (S3). */
    definirOrigem(lat, lon) {
      this.origem = { lat, lon };
      this.indiceDistancia.limpar();
      for (const local of this.locais) {
        local.distancia = Geo.distanciaKm(lat, lon, local.lat, local.lon);
        const no = this.indiceDistancia.inserir({ d: local.distancia, id: local.id }, local);
        local.nivel = no.nivel;
      }
    }

    get nivelMaximoOcupado() { return this.indiceDistancia.nivelAtual; }

    /** Escolha explícita de categoria: mover ao início (M2, acesso direto). */
    selecionarCategoria(chave) {
      const valor = this.categorias.acessar(chave, 'direto');
      if (valor !== null) this.categoriaAtiva = chave;
      return valor;
    }

    /**
     * Locais exibidos no mapa: anel [raioMin, raioMax] restrito ao nível L (S4),
     * filtrado pela categoria ativa.
     */
    consultarMapa({ nivel = 0, raioMinKm = 0, raioKm = Infinity, limite = 5000 } = {}) {
      const cat = this.categoriaAtiva;
      const filtro = cat === TODAS ? null : (l) => l.categoria === cat;
      return this.indiceDistancia.faixaNoNivel(
        { d: raioMinKm, id: -Infinity }, { d: raioKm, id: Infinity }, nivel, filtro, limite,
      ).map((r) => r.valor);
    }

    /**
     * Abrir um local (interesse forte):
     *  - splay COMPLETO do nome na árvore (A1);
     *  - transposição da categoria na lista (M2, acesso indireto);
     *  - busca do local na skip list, registrando o caminho (S5).
     */
    abrirLocal(id) {
      const local = this.locais[id];
      if (!local) return null;
      this.indiceNomes.buscar(local.chaveNome);
      this.categorias.acessar(local.categoria, 'indireto');
      this.indiceDistancia.buscar({ d: local.distancia, id: local.id });
      return local;
    }

    /** Recupera o local a partir de uma chave da árvore ("nome\0id"). */
    localDaChave(chaveNome) {
      return this.locais[parseInt(String(chaveNome).split('\u0000')[1], 10)] ?? null;
    }

    /** Pré-visualização (mouse por cima): splay PARCIAL de k passos (A1). */
    previsualizarLocal(id, passos = 1) {
      const local = this.locais[id];
      if (!local) return null;
      this.indiceNomes.buscar(local.chaveNome, { maxPassos: passos });
      return local;
    }

    /** Autocompletar pelo nome: um único splay por consulta (A2). */
    pesquisar(texto, limite = 12) {
      const prefixo = Geo.normalizar(texto);
      if (!prefixo) return [];
      return this.indiceNomes.buscarPorPrefixo(prefixo, limite);
    }

    corDaCategoria(chave) {
      const v = this.categorias.espiar(chave);
      return v ? v.cor : '#555';
    }

    rotuloDaCategoria(chave) {
      const v = this.categorias.espiar(chave);
      return v ? v.rotulo : chave;
    }
  }

  Catalogo.TODAS = TODAS;
  Catalogo.CATEGORIAS_PADRAO = CATEGORIAS_PADRAO;
  return Catalogo;
});
