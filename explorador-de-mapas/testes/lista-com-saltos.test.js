const test = require('node:test');
const assert = require('node:assert/strict');
const SL = require('../src/estruturas/ListaComSaltos.js');

test('inserção, busca e remoção clássicas', () => {
  const s = new SL();
  const valores = Array.from({ length: 300 }, (_, i) => i * 3);
  for (const v of [...valores].sort(() => Math.random() - 0.5)) s.inserir(v, `v${v}`);
  assert.equal(s.tamanho, 300);
  assert.equal(s.validar(), null);
  assert.deepEqual([...s].map((n) => n.chave), valores);
  assert.equal(s.buscar(30), 'v30');
  assert.equal(s.buscar(31), null);
  assert.ok(s.remover(30));
  assert.equal(s.buscar(30), null);
  assert.equal(s.validar(), null);
});

test('(S1) chave composta desempata distâncias iguais', () => {
  const s = new SL({ comparar: SL.compararDistanciaId });
  s.inserir({ d: 5, id: 2 }, 'b');
  s.inserir({ d: 5, id: 1 }, 'a');
  s.inserir({ d: 1, id: 9 }, 'z');
  assert.deepEqual([...s].map((n) => n.valor), ['z', 'a', 'b']);
});

test('(S2) locais relevantes ocupam níveis mais altos em média', () => {
  const sortear = SL.sorteadorPorRelevancia({ nivelMaximo: 12 });
  let somaAlta = 0, somaBaixa = 0;
  for (let i = 0; i < 4000; i++) {
    somaAlta += sortear({ id: `a${i}`, relevancia: 1 });
    somaBaixa += sortear({ id: `b${i}`, relevancia: 0 });
  }
  // esperado: piso + p/(1-p) → 3 + 3 = 6 para r=1 e ~0,33 para r=0 (sem piso)
  assert.ok(somaAlta / 4000 > 5.5, `média alta = ${somaAlta / 4000}`);
  assert.ok(somaBaixa / 4000 < 0.5, `média baixa = ${somaBaixa / 4000}`);
});

test('(S2) piso: só locais acima do limiar ganham altura mínima', () => {
  const sortear = SL.sorteadorPorRelevancia({ pisoMaximo: 3, limiar: 0.6 });
  for (let i = 0; i < 2000; i++) assert.ok(sortear({ id: i, relevancia: 1 }) >= 3);
  for (let i = 0; i < 2000; i++) assert.ok(sortear({ id: i, relevancia: 0.8 }) >= 1);
  const zeros = Array.from({ length: 2000 }, (_, i) => sortear({ id: i, relevancia: 0.5 })).filter((n) => n === 0).length;
  assert.ok(zeros > 600, `com r = 0,5 deve haver nós de altura 0 (houve ${zeros})`);
});

test('(S3) a altura de um local é estável entre reconstruções', () => {
  const sortear = SL.sorteadorPorRelevancia();
  const local = { id: 42, relevancia: 0.7 };
  const n = sortear(local);
  for (let i = 0; i < 10; i++) assert.equal(sortear(local), n);
});

test('(S4) faixa no nível L devolve exatamente os nós de altura ≥ L na faixa', () => {
  const s = new SL({ comparar: SL.compararDistanciaId, sortearNivel: SL.sorteadorPorRelevancia() });
  const itens = [];
  for (let id = 0; id < 2000; id++) {
    const item = { id, relevancia: Math.random(), d: Math.random() * 1000 };
    const no = s.inserir({ d: item.d, id }, item);
    item.nivel = no.nivel;
    itens.push(item);
  }
  assert.equal(s.validar(), null);
  for (const L of [0, 1, 2, 3, 5]) {
    const r = s.faixaNoNivel({ d: 100, id: -Infinity }, { d: 400, id: Infinity }, L);
    const esperado = itens
      .filter((i) => i.d >= 100 && i.d <= 400 && i.nivel >= L)
      .sort((a, b) => a.d - b.d || a.id - b.id)
      .map((i) => i.id);
    assert.deepEqual(r.map((x) => x.valor.id), esperado, `nível ${L}`);
  }
});

test('(S4) filtro e limite na faixa', () => {
  const s = new SL();
  for (let i = 0; i < 100; i++) s.inserir(i, { par: i % 2 === 0, i });
  const r = s.faixaNoNivel(10, 30, 0, (v) => v.par, 5);
  assert.deepEqual(r.map((x) => x.chave), [10, 12, 14, 16, 18]);
});

test('(S5) caminho de busca é registrado e a descida é logarítmica', () => {
  const s = new SL();
  for (let i = 0; i < 4096; i++) s.inserir(i, i);
  s.buscar(3000);
  assert.ok(s.ultimoCaminho.length > 0);
  assert.ok(s.ultimaConsulta.comparacoes < 120, `comparações = ${s.ultimaConsulta.comparacoes}`);
});
