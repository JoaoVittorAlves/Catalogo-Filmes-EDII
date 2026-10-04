#!/usr/bin/env node
/**
 * Experimentos que comparam as versões CLÁSSICAS com as MODIFICADAS.
 * Usa locais sintéticos (posições aleatórias dentro do retângulo do Brasil)
 * para poder testar com qualquer tamanho de base.
 *
 *   node scripts/benchmark.js            # 50.000 locais
 *   node scripts/benchmark.js 200000     # outro tamanho
 *
 * Os números variam um pouco de máquina para máquina; as PROPORÇÕES é que
 * importam para o relatório.
 */
'use strict';
const ListaComSaltos = require('../src/estruturas/ListaComSaltos.js');
const ArvoreAfunilada = require('../src/estruturas/ArvoreAfunilada.js');
const ListaMoverParaInicio = require('../src/estruturas/ListaMoverParaInicio.js');
const Geo = require('../src/util/geo.js');

const N = parseInt(process.argv[2] || '50000', 10);
const aleatorio = ListaComSaltos.mulberry32(2026);
const tempo = (f) => { const t = process.hrtime.bigint(); const r = f(); return [r, Number(process.hrtime.bigint() - t) / 1e6]; };
const linha = (...c) => console.log(c.map((x, i) => String(x).padEnd(i === 0 ? 52 : 20)).join(''));
/** Mediana de várias execuções (reduz o ruído do JIT e do coletor de lixo). */
const mediana = (f, vezes = 25) => {
  const ts = [];
  let r;
  for (let i = 0; i < vezes; i++) { const [x, t] = tempo(f); r = x; ts.push(t); }
  ts.sort((a, b) => a - b);
  return [r, ts[vezes >> 1]];
};

// relevância com cauda longa (poucos locais famosos, muitos obscuros)
const locais = Array.from({ length: N }, (_, id) => ({
  id,
  nome: `local ${id.toString(36)}`,
  lat: -33 + aleatorio() * 38,
  lon: -73 + aleatorio() * 39,
  relevancia: Math.pow(aleatorio(), 3),
}));
const origem = { lat: -15.79, lon: -47.88 };
for (const l of locais) l.d = Geo.distanciaKm(origem.lat, origem.lon, l.lat, l.lon);

console.log(`\n=== ${N.toLocaleString('pt-BR')} locais sintéticos ===\n`);

// --------------------------------------------------------------- SKIP LIST
console.log('LISTA COM SALTOS');
const montar = (sortear) => {
  const s = new ListaComSaltos({ nivelMaximo: 16, comparar: ListaComSaltos.compararDistanciaId, sortearNivel: sortear });
  for (const l of locais) l.nivel = s.inserir({ d: l.d, id: l.id }, l).nivel;
  return s;
};
const [classica, tClassica] = tempo(() => montar(undefined));
const [modificada, tModificada] = tempo(() => montar(ListaComSaltos.sorteadorPorRelevancia({ nivelMaximo: 16 })));
linha('', 'clássica', 'modificada');
linha('tempo de montagem (ms)', tClassica.toFixed(0), tModificada.toFixed(0));
linha('altura (nível máximo ocupado)', classica.nivelAtual, modificada.nivelAtual);

const relevanciaMedia = (s, L) => {
  const r = s.faixaNoNivel({ d: 0, id: -Infinity }, { d: Infinity, id: Infinity }, L);
  return r.length ? (r.reduce((a, x) => a + x.valor.relevancia, 0) / r.length).toFixed(3) : '-';
};
for (const L of [0, 3, 6]) linha(`relevância média dos locais no nível ${L}`, relevanciaMedia(classica, L), relevanciaMedia(modificada, L));

let comp = [0, 0];
for (let i = 0; i < 2000; i++) {
  const l = locais[Math.floor(aleatorio() * N)];
  classica.buscar({ d: l.d, id: l.id }); comp[0] += classica.ultimaConsulta.comparacoes;
  modificada.buscar({ d: l.d, id: l.id }); comp[1] += modificada.ultimaConsulta.comparacoes;
}
linha('comparações médias por busca', (comp[0] / 2000).toFixed(1), (comp[1] / 2000).toFixed(1));
linha('(busca linear numa lista comum: ~n/2)', Math.round(N / 2), '');

console.log('\nConsulta do mapa: anel 300–800 km, nível L (versão modificada)');
linha('nível L', 'retornados', 'ms faixaNoNivel', 'ms varrer tudo');
for (const L of [0, 2, 4, 6]) {
  const [r, t] = mediana(() => modificada.faixaNoNivel({ d: 300, id: -Infinity }, { d: 800, id: Infinity }, L));
  // alternativa ingênua: percorrer o nível 0 inteiro testando distância e altura
  const [, tl] = mediana(() => { const o = []; for (const x of modificada) if (x.chave.d >= 300 && x.chave.d <= 800 && x.nivel >= L) o.push(x); return o; });
  linha(String(L), r.length, t.toFixed(3), tl.toFixed(3));
}

// --------------------------------------------------------------- SPLAY
console.log('\nÁRVORE AFUNILADA (carga de navegação: 80% dos acessos em 50 locais)');
const pares = locais.map((l) => ({ chave: `${l.nome}\u0000${l.id}`, valor: l })).sort((a, b) => (a.chave < b.chave ? -1 : 1));
const quentes = Array.from({ length: 50 }, () => pares[Math.floor(aleatorio() * N)].chave);
const sorteiaAcesso = () => (aleatorio() < 0.8 ? quentes[Math.floor(aleatorio() * 50)] : pares[Math.floor(aleatorio() * N)].chave);

const porInsercao = new ArvoreAfunilada();
const [, tIns] = tempo(() => { for (const p of pares) porInsercao.inserir(p.chave, p.valor); });
const balanceada = new ArvoreAfunilada();
const [, tBal] = tempo(() => balanceada.construirBalanceada(pares));
linha('', 'inserção ordenada', 'construção (A5)');
linha('tempo de montagem (ms)', tIns.toFixed(0), tBal.toFixed(0));
linha('altura inicial', porInsercao.altura(), balanceada.altura());
const primeiro = pares[0].chave;
porInsercao.estatisticas.comparacoes = 0; porInsercao.buscar(primeiro);
balanceada.estatisticas.comparacoes = 0; balanceada.buscar(primeiro);
linha('comparações no 1º acesso ao menor nome', porInsercao.ultimaOperacao.comparacoes, balanceada.ultimaOperacao.comparacoes);

const medirCarga = (arvore, maxPassos) => {
  let c = 0;
  for (let i = 0; i < 20000; i++) { arvore.buscar(sorteiaAcesso(), { maxPassos }); c += arvore.ultimaOperacao.comparacoes; }
  return (c / 20000).toFixed(1);
};
const a1 = new ArvoreAfunilada(); a1.construirBalanceada(pares);
const a2 = new ArvoreAfunilada(); a2.construirBalanceada(pares);
console.log('');
linha('comparações médias por acesso', 'splay completo', 'splay parcial 1');
linha('(árvore balanceada sem splay: ~log2 n = ' + Math.round(Math.log2(N)) + ')', medirCarga(a1, Infinity), medirCarga(a2, 1));

// mouse "varrendo" 300 locais aleatórios: quanto a forma do topo é destruída?
const topoQuente = (a) => quentes.reduce((s, k) => s + a.profundidade(k), 0) / quentes.length;
const b1 = new ArvoreAfunilada(); b1.construirBalanceada(pares);
const b2 = new ArvoreAfunilada(); b2.construirBalanceada(pares);
for (let i = 0; i < 3000; i++) { const k = quentes[i % 50]; b1.buscar(k); b2.buscar(k); }
const antes = [topoQuente(b1), topoQuente(b2)];
for (let i = 0; i < 300; i++) { const k = pares[Math.floor(aleatorio() * N)].chave; b1.buscar(k); b2.buscar(k, { maxPassos: 1 }); }
linha('prof. média dos 50 favoritos antes da varredura', antes[0].toFixed(1), antes[1].toFixed(1));
linha('... depois de passar o mouse em 300 locais', topoQuente(b1).toFixed(1) + ' (completo)', topoQuente(b2).toFixed(1) + ' (parcial)');

// prefixo
const pref = new ArvoreAfunilada(); pref.construirBalanceada(pares);
const [res, tPref] = tempo(() => pref.buscarPorPrefixo('local a', 10));
linha('busca por prefixo "local a" (10 resultados)', `${tPref.toFixed(2)} ms`, `${pref.ultimaOperacao.passos.length} passos de splay`);
void res;

// --------------------------------------------------------------- MTF
console.log('\nLISTA COM MOVIMENTAÇÃO AO INÍCIO (11 categorias, 1 fixa)');
const cats = ['cidade', 'praia', 'museu', 'parque', 'monumento', 'igreja', 'cachoeira', 'teatro', 'forte', 'ilha'];
const pesos = [1, 2, 4, 8, 16, 1, 1, 2, 1, 30]; // preferência do usuário pelas últimas da lista
const total = pesos.reduce((a, b) => a + b, 0);
const sorteiaCat = () => { let r = aleatorio() * total; for (let i = 0; i < cats.length; i++) { r -= pesos[i]; if (r < 0) return cats[i]; } return cats[0]; };
const nova = () => { const l = new ListaMoverParaInicio(); l.inserir('todas', {}, { fixo: true }); cats.forEach((c) => l.inserir(c, {})); return l; };
const estatica = nova(), so = nova(), hibrida = nova(), transp = nova();
for (let i = 0; i < 20000; i++) {
  const c = sorteiaCat();
  estatica._buscar(c); estatica.estatisticas.acessos++; estatica.estatisticas.comparacoes += estatica._buscar(c).comparacoes;
  so.acessar(c, 'direto');
  transp.acessar(c, 'indireto');
  hibrida.acessar(c, aleatorio() < 0.3 ? 'direto' : 'indireto');
}
linha('política', 'comparações/acesso');
linha('ordem fixa (sem reorganizar)', estatica.custoMedio().toFixed(2));
linha('mover ao início (clássico + nó fixo)', so.custoMedio().toFixed(2));
linha('só transposição', transp.custoMedio().toFixed(2));
linha('híbrida (30% direto, 70% indireto)', hibrida.custoMedio().toFixed(2));
console.log('');
