const test = require('node:test');
const assert = require('node:assert/strict');
const Lista = require('../src/estruturas/ListaMoverParaInicio.js');

const chaves = (l) => l.paraArray().map((n) => n.chave);

test('inserção comum entra no fim (comportamento clássico)', () => {
  const l = new Lista();
  ['a', 'b', 'c'].forEach((k) => l.inserir(k, k));
  assert.deepEqual(chaves(l), ['a', 'b', 'c']);
});

test('acesso direto move ao início (clássico, sem nós fixos)', () => {
  const l = new Lista();
  ['a', 'b', 'c', 'd'].forEach((k) => l.inserir(k, k));
  l.acessar('c', 'direto');
  assert.deepEqual(chaves(l), ['c', 'a', 'b', 'd']);
  assert.equal(l.ultimaOperacao.de, 2);
  assert.equal(l.ultimaOperacao.para, 0);
  l.acessar('d');
  assert.deepEqual(chaves(l), ['d', 'c', 'a', 'b']);
});

test('(M1) nós fixos nunca saem do topo e o "início" vem depois deles', () => {
  const l = new Lista();
  l.inserir('a', 1); l.inserir('b', 2);
  l.inserir('TODAS', 0, { fixo: true });
  l.inserir('c', 3);
  assert.deepEqual(chaves(l), ['TODAS', 'a', 'b', 'c']);
  l.acessar('c', 'direto');
  assert.deepEqual(chaves(l), ['TODAS', 'c', 'a', 'b']);
  l.acessar('TODAS', 'direto');
  assert.deepEqual(chaves(l), ['TODAS', 'c', 'a', 'b']);
  l.acessar('c', 'direto'); // já está no início lógico
  assert.deepEqual(chaves(l), ['TODAS', 'c', 'a', 'b']);
});

test('(M2) acesso indireto faz transposição e não ultrapassa nó fixo', () => {
  const l = new Lista();
  l.inserir('F', 0, { fixo: true });
  ['a', 'b', 'c'].forEach((k) => l.inserir(k, k));
  l.acessar('c', 'indireto');
  assert.deepEqual(chaves(l), ['F', 'a', 'c', 'b']);
  l.acessar('c', 'indireto');
  assert.deepEqual(chaves(l), ['F', 'c', 'a', 'b']);
  l.acessar('c', 'indireto'); // vizinho anterior é fixo: fica onde está
  assert.deepEqual(chaves(l), ['F', 'c', 'a', 'b']);
});

test('transposição na cabeça real da lista (sem nós fixos)', () => {
  const l = new Lista();
  ['a', 'b'].forEach((k) => l.inserir(k, k));
  l.acessar('b', 'indireto');
  assert.deepEqual(chaves(l), ['b', 'a']);
});

test('(M3) contadores e custo médio', () => {
  const l = new Lista();
  ['a', 'b', 'c'].forEach((k) => l.inserir(k, k));
  l.acessar('c'); // 3 comparações
  l.acessar('c'); // 1 comparação
  assert.equal(l.custoMedio(), 2);
  assert.equal(l.paraArray()[0].acessos, 2);
  assert.equal(l.acessar('x'), null);
});

test('aleatório: lista continua sendo uma permutação válida', () => {
  const l = new Lista();
  l.inserir('F1', 0, { fixo: true }); l.inserir('F2', 0, { fixo: true });
  const ks = 'abcdefghij'.split('');
  ks.forEach((k) => l.inserir(k, k));
  for (let i = 0; i < 500; i++) {
    const k = Math.random() < 0.1 ? 'F2' : ks[Math.floor(Math.random() * ks.length)];
    l.acessar(k, Math.random() < 0.5 ? 'direto' : 'indireto');
    const atual = chaves(l);
    assert.deepEqual(atual.slice(0, 2), ['F1', 'F2']);
    assert.deepEqual([...atual].sort(), [...ks, 'F1', 'F2'].sort());
  }
});
