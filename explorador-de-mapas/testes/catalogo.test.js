const test = require('node:test');
const assert = require('node:assert/strict');
const Catalogo = require('../src/app/Catalogo.js');
const Geo = require('../src/util/geo.js');

const brutos = [
  { nome: 'Recife', categoria: 'cidade', lat: -8.05, lon: -34.9, relevancia: 0.9 },
  { nome: 'Praia de Boa Viagem', categoria: 'praia', lat: -8.12, lon: -34.89, relevancia: 0.6 },
  { nome: 'Olinda', categoria: 'cidade', lat: -8.01, lon: -34.85, relevancia: 0.8 },
  { nome: 'Museu do Homem do Nordeste', categoria: 'museu', lat: -8.03, lon: -34.92, relevancia: 0.4 },
  { nome: 'São Paulo', categoria: 'cidade', lat: -23.55, lon: -46.63, relevancia: 1 },
];

test('consultas do mapa respeitam raio, nível e categoria', () => {
  const c = new Catalogo(brutos, { origem: { lat: -8.05, lon: -34.9 } });
  assert.equal(c.consultarMapa({ raioKm: 50 }).length, 4);
  assert.equal(c.consultarMapa().length, 5);
  c.selecionarCategoria('cidade');
  assert.deepEqual(c.consultarMapa({ raioKm: 50 }).map((l) => l.nome), ['Recife', 'Olinda']);
  const L = 2;
  const esperado = c.locais.filter((l) => l.categoria === 'cidade' && l.nivel >= L).length;
  assert.equal(c.consultarMapa({ nivel: L }).length, esperado);
});

test('selecionar categoria e abrir local reorganizam a lista de categorias', () => {
  const c = new Catalogo(brutos);
  const ordem = () => c.categorias.paraArray().map((n) => n.chave);
  assert.deepEqual(ordem(), ['todas', 'cidade', 'praia', 'museu']);
  c.selecionarCategoria('museu');
  assert.deepEqual(ordem(), ['todas', 'museu', 'cidade', 'praia']);
  c.abrirLocal(1); // praia → transposição
  assert.deepEqual(ordem(), ['todas', 'museu', 'praia', 'cidade']);
});

test('abrir local leva o nome à raiz; pesquisa ignora acentos', () => {
  const c = new Catalogo(brutos);
  c.abrirLocal(4);
  assert.equal(c.indiceNomes.raiz.valor.nome, 'São Paulo');
  assert.deepEqual(c.pesquisar('sao').map((l) => l.nome), ['São Paulo']);
  assert.deepEqual(c.pesquisar('PRAIA').map((l) => l.nome), ['Praia de Boa Viagem']);
});

test('mudar a origem reordena a skip list mas preserva os níveis', () => {
  const c = new Catalogo(brutos, { origem: { lat: -8.05, lon: -34.9 } });
  const niveis = c.locais.map((l) => l.nivel);
  c.definirOrigem(-23.55, -46.63);
  assert.deepEqual(c.locais.map((l) => l.nivel), niveis);
  assert.equal(c.consultarMapa({ raioKm: 10 })[0].nome, 'São Paulo');
});

test('haversine: Recife–São Paulo ≈ 2.130 km', () => {
  const d = Geo.distanciaKm(-8.05, -34.9, -23.55, -46.63);
  assert.ok(Math.abs(d - 2130) < 40, String(d));
});
