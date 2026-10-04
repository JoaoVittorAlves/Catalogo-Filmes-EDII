const test = require('node:test');
const assert = require('node:assert/strict');
const Arvore = require('../src/estruturas/ArvoreAfunilada.js');

const nums = (a, b) => a - b;

test('inserção e busca levam o nó à raiz (clássico)', () => {
  const t = new Arvore(nums);
  [50, 30, 70, 20, 40, 60, 80].forEach((k) => t.inserir(k, `v${k}`));
  assert.equal(t.validar(), null);
  assert.equal(t.buscar(20), 'v20');
  assert.equal(t.raiz.chave, 20);
  assert.equal(t.buscar(65), null);
  assert.equal(t.validar(), null);
});

test('casos zig, zig-zig e zig-zag são identificados', () => {
  const t = new Arvore(nums);
  t.construirBalanceada([1, 2, 3, 4, 5, 6, 7].map((k) => ({ chave: k, valor: k })));
  // raiz 4; 2 e 6 no nível 1; 1,3,5,7 no nível 2
  t.buscar(2);
  assert.deepEqual(t.ultimaOperacao.passos.map((p) => p.tipo), ['zig']);
  t.construirBalanceada([1, 2, 3, 4, 5, 6, 7].map((k) => ({ chave: k, valor: k })));
  t.buscar(1);
  assert.deepEqual(t.ultimaOperacao.passos.map((p) => p.tipo), ['zig-zig']);
  t.construirBalanceada([1, 2, 3, 4, 5, 6, 7].map((k) => ({ chave: k, valor: k })));
  t.buscar(3);
  assert.deepEqual(t.ultimaOperacao.passos.map((p) => p.tipo), ['zig-zag']);
  assert.equal(t.validar(), null);
});

test('(A1) splay parcial sobe só k passos', () => {
  const t = new Arvore(nums);
  t.construirBalanceada(Array.from({ length: 127 }, (_, i) => ({ chave: i, valor: i })));
  const antes = t.profundidade(0); // 6
  t.buscar(0, { maxPassos: 1 });
  assert.equal(t.ultimaOperacao.passos.length, 1);
  assert.equal(t.profundidade(0), antes - 2); // um zig-zig = 2 níveis
  assert.notEqual(t.raiz.chave, 0);
  t.buscar(0);
  assert.equal(t.raiz.chave, 0);
  assert.equal(t.validar(), null);
});

test('(A2) busca por prefixo devolve em ordem e faz um único splay', () => {
  const t = new Arvore();
  const nomes = ['recife', 'rio branco', 'rio de janeiro', 'rio grande', 'salvador', 'porto alegre', 'rio'];
  nomes.forEach((n) => t.inserir(n, n));
  const r = t.buscarPorPrefixo('rio', 10);
  assert.deepEqual(r, ['rio', 'rio branco', 'rio de janeiro', 'rio grande']);
  assert.equal(t.raiz.chave, 'rio');
  assert.deepEqual(t.buscarPorPrefixo('rio ', 2), ['rio branco', 'rio de janeiro']);
  assert.deepEqual(t.buscarPorPrefixo('zz'), []);
  assert.equal(t.validar(), null);
});

test('(A3) tamanhos corretos e posição em ordem', () => {
  const t = new Arvore(nums);
  for (let i = 0; i < 500; i++) t.inserir((i * 7919) % 1000, i);
  for (let i = 0; i < 300; i++) t.buscar(Math.floor(Math.random() * 1000), { maxPassos: 1 + (i % 3) });
  assert.equal(t.validar(), null);
  const ordem = t.emOrdem().map((n) => n.chave);
  assert.equal(t.posicao(ordem[123]), 123);
  assert.equal(t.tamanho, ordem.length);
});

test('remoção mantém a árvore válida', () => {
  const t = new Arvore(nums);
  const ks = Array.from({ length: 200 }, (_, i) => i);
  ks.forEach((k) => t.inserir(k, k));
  for (const k of ks.filter((k) => k % 3 === 0)) assert.ok(t.remover(k));
  assert.equal(t.validar(), null);
  assert.equal(t.tamanho, 200 - 67);
  assert.equal(t.remover(3), false);
});

test('(A5) construção balanceada tem altura logarítmica', () => {
  const t = new Arvore(nums);
  t.construirBalanceada(Array.from({ length: 10000 }, (_, i) => ({ chave: i, valor: i })));
  assert.equal(t.altura(), 13);
  assert.equal(t.validar(), null);
});

test('topo() recolhe subárvores profundas', () => {
  const t = new Arvore(nums);
  t.construirBalanceada(Array.from({ length: 31 }, (_, i) => ({ chave: i, valor: i })));
  const topo = t.topo(1);
  assert.equal(topo.esq.esq.recolhido, true);
  assert.equal(topo.esq.esq.tamanho, 7);
});

test('(A4) captura de etapas para animação', () => {
  const t = new Arvore(nums);
  t.construirBalanceada(Array.from({ length: 15 }, (_, i) => ({ chave: i, valor: i })));
  t.capturarEtapas = 3;
  t.buscar(0);
  assert.equal(t.etapas.length, t.ultimaOperacao.passos.length + 1);
  assert.equal(t.etapas[0].topo.chave, 7);
  assert.equal(t.etapas[t.etapas.length - 1].topo.chave, 0);
});
