# 03 – Lista com Saltos (Skip List)

Arquivo: `src/estruturas/ListaComSaltos.js` · Testes: `testes/lista-com-saltos.test.js`

## Papel na aplicação

É o **índice principal** dos locais. Todos ficam no nível 0, ordenados pela distância até a origem (a mira no mapa). Os níveis superiores viram os **níveis de detalhe** do mapa: no nível L aparecem só os locais cuja torre alcança L.

Essa é a ideia central do projeto: a hierarquia de níveis da lista com saltos é a mesma hierarquia de generalização de um mapa (num mapa do país aparecem as capitais; ao aproximar, as cidades menores).

## O algoritmo clássico

Cada nó tem uma torre de ponteiros `proximos[0..h]`. A altura h é sorteada no momento da inserção:

```
sortearNivel():
    h ← 0
    enquanto h < nivelMaximo e aleatório() < 1/2: h ← h + 1
    devolve h
```

O nível i é uma lista ordenada com os nós de altura ≥ i. Cerca de n/2^i nós estão no nível i.

**Busca.** Começa no nível mais alto da cabeça. Em cada nível, avança enquanto o próximo nó for menor que a chave; quando não pode mais avançar, desce um nível.

```
descer(chave):
    x ← cabeça
    para i de nivelAtual até 0:
        enquanto x.proximos[i] ≠ nulo e x.proximos[i].chave < chave:
            x ← x.proximos[i]
        atualizar[i] ← x            # último nó < chave no nível i
    devolve x, atualizar
```

**Inserção.** Desce guardando `atualizar[]`, sorteia a altura h e religa os ponteiros dos níveis 0 a h. **Remoção** é o inverso.

Busca, inserção e remoção custam **O(log n) esperado**, com espaço esperado O(n).

## Modificações

### S1 – Chave composta e reconstrução pela origem

**Problema.** Muitos locais têm a mesma distância até a origem (por exemplo, pontos com as mesmas coordenadas). A lista clássica exige chaves distintas.

**Modificação.** A chave é o par `{ d, id }`, comparado primeiro pela distância e, em empate, pelo id:

```js
const compararDistanciaId = (a, b) => (a.d - b.d) || (a.id - b.id);
```

O comparador é injetável (`new ListaComSaltos({ comparar })`). Para consultas de faixa, os limites usam `id: -Infinity` e `id: +Infinity`, o que inclui todos os locais com a distância exata do limite.

Quando a origem muda, `Catalogo.definirOrigem` recalcula as distâncias e reconstrói a lista: O(n log n).

### S2 – Altura por relevância (promoção ponderada com piso)

**Problema.** Na versão clássica, a altura é pura sorte. O nível 6 seria uma amostra aleatória de locais: uma praia desconhecida teria a mesma chance que o Cristo Redentor de aparecer na "visão resumida" do mapa.

**Modificação.** Cada local tem relevância r ∈ [0, 1] (na base do Wikidata, calculada pelo número de artigos na Wikipédia). A probabilidade de promoção depende de r, e locais muito relevantes começam de uma altura mínima:

```
p(r)    = pMin + (pMax − pMin) · r                    # padrão: 0,25 + 0,5·r
piso(r) = ⌊pisoMaximo · (r − limiar) / (1 − limiar)⌋  se r > limiar, senão 0
                                                      # padrão: pisoMaximo = 3, limiar = 0,6

sortearNivel(local):
    h ← piso(r)
    enquanto h < nivelMaximo e aleatório() < p(r): h ← h + 1
    devolve h
```

| Relevância r | p(r) | piso | Altura esperada (piso + p/(1−p)) |
|---|---|---|---|
| 0,0 | 0,25 | 0 | 0,33 |
| 0,5 | 0,50 | 0 | 1,0 |
| 0,8 | 0,65 | 1 | 2,9 |
| 1,0 | 0,75 | 3 | 6,0 |

**A complexidade continua O(log n) esperado.** O argumento da análise clássica só precisa de duas coisas: que a probabilidade de promoção seja limitada por uma constante menor que 1 (aqui, no máximo 0,75) e que a altura máxima seja O(log n). O piso acrescenta no máximo 3 níveis e só a uma fração pequena dos nós. O que muda é a **constante**: ver a discussão em [06-experimentos.md](06-experimentos.md).

### S3 – Altura estável (sorteio com semente por local)

**Problema.** Mover a origem reconstrói a lista. Com `Math.random()`, cada reconstrução sortearia novas alturas, e o conjunto de locais exibido em cada nível de detalhe mudaria a cada clique, confundindo o usuário.

**Modificação.** O gerador pseudoaleatório (Mulberry32) é semeado com um hash (FNV-1a) do `id` do local:

```js
const aleatorio = mulberry32(hash32(local.id));
```

O sorteio continua tendo boa distribuição estatística, mas é **determinístico por local**: o mesmo local sempre recebe a mesma altura. A altura vira uma propriedade do local (exibida na ficha como "Lista com saltos, altura"), e não um acidente da última reconstrução.

### S4 – Consulta de faixa restrita a um nível

**Problema.** O mapa precisa de "todos os locais de altura ≥ L num anel de raio mínimo a raio máximo". A forma óbvia seria percorrer o nível 0 inteiro e filtrar pela altura, o que custa O(n).

**Modificação.** `faixaNoNivel(min, max, L, filtro, limite)` **interrompe a descida no nível L** em vez de ir até 0, e então percorre apenas a lista do nível L:

```
faixaNoNivel(min, max, L):
    x ← descer(min) parando no nível L     # O(log n) esperado
    p ← x.proximos[L]
    enquanto p ≠ nulo e p.chave ≤ max:
        se filtro(p.valor): resultado.adiciona(p)
        p ← p.proximos[L]                  # salta os nós de altura < L
    devolve resultado
```

Isso funciona porque o nível L contém exatamente os nós de altura ≥ L, em ordem. O custo é **O(log n + k_L)**, onde k_L é o número de nós do nível L dentro do anel, e não o número total de locais no anel.

No catálogo, o filtro é a categoria ativa (vinda da lista com movimentação ao início). É assim que as três escolhas do usuário (categoria, nível e anel) se combinam numa única consulta.

### S5 – Caminho registrado

Cada busca ou consulta grava `ultimoCaminho` (os nós visitados e em que nível) e `ultimaConsulta` (comparações, nós percorridos e retornados). A aba "Lista com saltos" desenha o caminho em amarelo, tanto na visão geral quanto no detalhe com torres e ponteiros, e a explicação compara o número de comparações com o de uma lista comum.

Ao abrir um local, o catálogo faz uma busca exata pela chave `{ d, id }` dele só para registrar o caminho. Assim o usuário vê como o local seria encontrado a partir da cabeça.

## Complexidade

| Operação | Custo esperado |
|---|---|
| `buscar`, `inserir`, `remover` | O(log n) |
| `faixaNoNivel(min, max, L)` | O(log n + k_L) |
| reconstrução (mudar a origem) | O(n log n) |
| `contagemPorNivel` | O(n) (soma das listas de todos os níveis, cerca de 2n) |
| espaço | O(n) |

## O que mostrar na interface

1. No nível de detalhe 0 aparecem todos os locais. Suba para 3 ou 4: sobram as capitais e os pontos mais conhecidos.
2. Mova a mira para outra cidade: as distâncias mudam, mas os mesmos locais continuam em cada nível (S3).
3. Coloque a distância mínima em ~300 km e mude o nível: a explicação mostra o custo da descida e quantos nós foram percorridos só naquele nível (S4).
4. Abra um local e veja na aba o caminho amarelo descendo da cabeça até ele (S5).

## Testes que comprovam as modificações

- `inserção, busca e remoção clássicas` (300 chaves embaralhadas e verificação dos invariantes)
- `(S1) chave composta desempata distâncias iguais`
- `(S2) locais relevantes ocupam níveis mais altos em média` (4.000 sorteios)
- `(S2) piso: só locais acima do limiar ganham altura mínima`
- `(S3) a altura de um local é estável entre reconstruções`
- `(S4) faixa no nível L devolve exatamente os nós de altura ≥ L na faixa` (2.000 locais, comparados a um filtro de força bruta)
- `(S4) filtro e limite na faixa`
- `(S5) caminho de busca é registrado e a descida é logarítmica`
