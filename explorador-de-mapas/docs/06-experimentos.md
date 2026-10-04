# 06 – Experimentos: versões clássicas × modificadas

Script: `scripts/benchmark.js` (`npm run benchmark`).

O script gera **50.000 locais sintéticos** espalhados pelo retângulo que contém o Brasil, com relevância de cauda longa (r = u³, u uniforme em [0, 1]: poucos locais famosos e muitos obscuros, como na base real). Usar dados sintéticos permite repetir o experimento com qualquer tamanho (`node scripts/benchmark.js 200000`). O gerador tem semente fixa, então os números de contagem se repetem exatamente; os tempos em milissegundos variam com a máquina e são a mediana de 25 execuções.

Os números abaixo são de uma execução de referência.

## Lista com Saltos

| Medida | Clássica (p = 1/2) | Modificada (S2 + S3) |
|---|---|---|
| Tempo de montagem | 161 ms | 265 ms |
| Altura (nível máximo ocupado) | 15 | 16 |
| Relevância média dos locais no nível 0 | 0,251 | 0,251 |
| Relevância média dos locais no nível 3 | 0,252 | **0,653** |
| Relevância média dos locais no nível 6 | 0,243 | **0,818** |
| Comparações médias por busca exata | 30,9 | 44,3 |
| Busca linear numa lista comum (≈ n/2) | 25.000 | 25.000 |

**Interpretação.**

O objetivo da modificação S2 foi alcançado. Na versão clássica, todos os níveis têm a mesma relevância média da base (≈ 0,25): o nível 6 é só uma amostra ao acaso. Na versão modificada, quanto mais alto o nível, mais relevantes os locais, que é exatamente o que um mapa precisa para a "visão resumida".

**Há um custo, e ele deve ser apresentado.** A busca exata faz cerca de 43% mais comparações (44 contra 31). O motivo: como a maioria dos locais tem relevância baixa, a probabilidade média de promoção fica perto de 0,25 + 0,5 × 0,25 ≈ 0,375, e não 0,5. Há menos nós nos níveis intermediários, então a busca anda mais em cada nível. O custo continua **O(log n)**: muda só a constante. Mesmo assim, são 44 comparações contra 25.000 numa lista comum.

A montagem fica mais lenta (265 contra 161 ms) por causa do gerador com semente e do hash por local (S3). Ela acontece uma vez por mudança de origem, o que é imperceptível na interface.

Uma alternativa para recuperar a constante seria ajustar `pMin` e `pMax` para que a **média ponderada** pela distribuição real da relevância fosse 1/2. Os parâmetros ficam expostos em `sorteadorPorRelevancia` para esse tipo de ajuste.

### Consulta do mapa: anel de 300 a 800 km

| Nível L | Locais retornados | `faixaNoNivel` (S4) | Percorrer o nível 0 inteiro e filtrar |
|---|---|---|---|
| 0 | 4.809 | 0,692 ms | 4,700 ms |
| 2 | 997 | 0,092 ms | 4,747 ms |
| 4 | 290 | 0,016 ms | 4,532 ms |
| 6 | 119 | 0,006 ms | 4,681 ms |

**Interpretação.** O custo da alternativa ingênua é sempre o mesmo, porque ela examina todos os 50.000 nós. O custo de `faixaNoNivel` acompanha o tamanho da **resposta** (O(log n + k_L)): quanto mais alto o nível de detalhe, mais barata a consulta. No nível 6 a diferença passa de 700 vezes. Mesmo no nível 0, em que todos os locais do anel são devolvidos, a consulta é cerca de 7 vezes mais rápida porque pula direto para o início do anel e para no fim dele.

## Árvore Afunilada

Carga de navegação: 80% dos acessos se concentram em 50 locais "favoritos" e 20% caem em locais quaisquer.

### Construção inicial (A5)

| Medida | Inserção dos nomes em ordem | Construção balanceada |
|---|---|---|
| Tempo de montagem | 33 ms | 15 ms |
| Altura inicial | **49.999** | **15** |
| Comparações no 1º acesso ao menor nome | 50.000 | 15 |

**Interpretação.** Inserir nomes ordenados numa splay tree é o pior caso da estrutura: cada novo nome vira raiz e a árvore anterior fica pendurada à esquerda. O custo amortizado garante que isso se paga ao longo de muitos acessos, mas o primeiro usuário pagaria a conta inteira. A construção balanceada elimina esse pico sem violar nenhuma propriedade da splay tree.

### Splay completo × splay parcial (A1)

| Medida | Splay completo | Splay parcial (1 passo) |
|---|---|---|
| Comparações médias por acesso (carga 80/20) | 9,6 | 11,7 |
| Profundidade média dos 50 favoritos antes de passar o mouse | 5,6 | 5,6 |
| ... depois de passar o mouse sobre 300 locais aleatórios | **12,0** | **5,7** |

**Interpretação.**

- Os dois estão abaixo de log₂ n ≈ 16, que seria o custo de uma árvore balanceada estática. Isso mostra a propriedade de conjunto de trabalho da splay tree: os favoritos ficam perto da raiz.
- Como mecanismo de acesso, o splay completo é melhor (9,6 contra 11,7 comparações). Por isso **o clique continua usando o splay completo**.
- O splay parcial existe para outro cenário: o interesse fraco. Passar o mouse sobre 300 locais aleatórios com splay completo empurra os favoritos de 5,6 para 12,0 de profundidade, mais que o dobro. Com splay parcial eles praticamente não se movem (5,7). É essa a propriedade que a interface precisa: o histórico de cliques sobrevive à movimentação do mouse.

### Busca por prefixo (A2)

Com 10 resultados, a busca pelo prefixo "local a" levou cerca de 0,3 ms e fez **um** splay de 6 passos. A versão ingênua (uma busca com splay por resultado) faria 10 splays e deixaria na raiz o último resultado.

## Lista com Movimentação ao Início

Carga: 20.000 acessos com preferência concentrada em categorias que começam no **fim** da lista (o pior caso para a ordem inicial).

| Política | Comparações por acesso |
|---|---|
| Ordem fixa (sem reorganizar) | 8,07 |
| Mover ao início (com nó fixo, M1) | 4,08 |
| Só transposição | 3,63 |
| Híbrida (30% direto, 70% indireto, M2) | 3,86 |

**Interpretação.** Qualquer reorganização reduz o custo à metade em relação à ordem fixa. Com probabilidades estáveis, a transposição é a mais barata, como prevê a teoria. Mover ao início reage mais rápido a mudanças de interesse, mas oscila mais. A política híbrida fica entre as duas no custo e tem a vantagem que motivou a modificação: o painel responde **na hora** a um clique explícito, mas não se embaralha a cada local aberto.

## Como reproduzir

```bash
npm run benchmark
node scripts/benchmark.js 200000
```

Para o relatório, vale rodar com 10.000, 50.000 e 200.000 locais e mostrar que as comparações da lista com saltos e da árvore crescem de forma logarítmica, enquanto a alternativa linear cresce na proporção de n.
