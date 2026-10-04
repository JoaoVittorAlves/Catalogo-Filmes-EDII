# 02 – Lista com Movimentação ao Início

Arquivo: `src/estruturas/ListaMoverParaInicio.js` · Testes: `testes/lista-mover-para-inicio.test.js`

## Papel na aplicação

Guarda as **categorias** de locais. A ordem da lista é exatamente a ordem do painel de categorias e da aba "Lista de categorias". Quem usa muito "Praias" e "Museus" passa a vê-las no topo, sem precisar configurar nada.

## O algoritmo clássico

A lista é simplesmente encadeada. A busca é sequencial a partir da cabeça. Quando um elemento é **acessado**, ele é desligado da sua posição e religado na cabeça:

```
acessar(chave):
    anterior ← nulo; atual ← cabeça
    enquanto atual ≠ nulo e atual.chave ≠ chave:
        anterior ← atual; atual ← atual.próximo
    se atual = nulo: devolve nulo
    se anterior ≠ nulo:              # já não está na cabeça
        anterior.próximo ← atual.próximo
        atual.próximo ← cabeça
        cabeça ← atual
    devolve atual.valor
```

A busca custa O(i), onde i é a posição do elemento. A reorganização custa O(1) depois da busca. A ideia é que elementos acessados com frequência fiquem perto da cabeça, reduzindo o custo médio. Sleator e Tarjan mostraram que esse custo nunca passa do dobro do custo da melhor ordem estática possível.

Uma variante clássica é a **transposição**: o elemento acessado só troca de lugar com o vizinho anterior. Ela sobe mais devagar e é mais estável.

## Modificações

### M1 – Nós fixos (âncoras)

**Problema.** A opção "Todas as categorias" precisa ficar sempre no topo, como numa interface comum. Na versão clássica, qualquer acesso a outra categoria a empurraria para baixo.

**Modificação.** Cada nó tem o campo `fixo`. Invariante: **todos os nós fixos formam um bloco contíguo no começo da lista**. Para manter o invariante:

- um nó fixo é inserido logo após o último nó fixo, e não no fim;
- o "início" para onde os nós comuns se movem passa a ser a posição seguinte ao último nó fixo;
- a transposição não troca um nó comum com um nó fixo;
- acessar um nó fixo conta como acesso, mas não o move.

```
moverParaInicio(nó, anterior):
    limite ← último nó fixo (ou nulo)
    se anterior = limite: devolve           # já está no início lógico
    anterior.próximo ← nó.próximo           # desliga
    se limite = nulo:
        nó.próximo ← cabeça; cabeça ← nó
    senão:
        nó.próximo ← limite.próximo; limite.próximo ← nó   # religa após o bloco fixo
```

`_ultimoFixo()` percorre só o bloco fixo, que tem tamanho constante (1 nó na aplicação). A complexidade continua O(1) depois da busca.

### M2 – Política híbrida conforme o tipo de acesso

**Problema.** Há dois tipos de interesse por uma categoria:

- **direto**: o usuário clica em "Museus" no painel;
- **indireto**: o usuário abre o "MASP", que é um museu, sem ter escolhido a categoria.

Se os dois tipos movessem ao início, a lista ficaria instável: abrir alguns locais variados embaralharia o painel que o usuário acabou de organizar.

**Modificação.** `acessar(chave, tipo)` aplica uma política diferente para cada tipo:

| Tipo | Política | Efeito |
|---|---|---|
| `'direto'` | mover ao início (com M1) | sobe na hora |
| `'indireto'` | transposição | sobe uma posição por acesso |

Para fazer a transposição em O(1), a busca guarda **três** ponteiros (`anteAnterior`, `anterior`, `atual`), e não dois:

```
transpor(nó, anterior, anteAnterior, posição):
    se anterior = nulo ou anterior.fixo: devolve posição   # não ultrapassa âncora
    anterior.próximo ← nó.próximo
    nó.próximo ← anterior
    se anteAnterior = nulo: cabeça ← nó
    senão: anteAnterior.próximo ← nó
    devolve posição − 1
```

```
antes:   … → anteAnterior → anterior → nó → resto
depois:  … → anteAnterior → nó → anterior → resto
```

No catálogo: `selecionarCategoria` usa `'direto'` e `abrirLocal` usa `'indireto'`.

### M3 – Instrumentação

Cada nó tem um contador `acessos`, e a lista registra em `ultimaOperacao` a chave acessada, o tipo de acesso, a política aplicada, a posição de origem e de destino e o número de comparações. A interface usa esse registro para:

- escrever a explicação da aba ("Acesso indireto a Ilhas: transposição da posição 10 para 9...");
- destacar em amarelo o nó que se moveu, no painel e na aba;
- mostrar o custo médio (comparações por acesso) no painel de categorias.

## Complexidade

| Operação | Custo |
|---|---|
| `acessar` (busca) | O(i), i = posição do elemento |
| mover ao início, depois da busca | O(f), f = número de nós fixos (constante) |
| transposição, depois da busca | O(1) |
| `inserir` (fim) | O(n) |
| `paraArray` | O(n) |

Com 11 categorias, n é pequeno. O interesse aqui é o **comportamento** que a estrutura dá à interface. O custo médio medido aparece em [06-experimentos.md](06-experimentos.md).

## O que mostrar na interface

1. Clique em "Ilhas": o nó viaja da posição 10 para a posição 1, e "Todas" não sai do lugar.
2. Abra uma praia no mapa: "Praias" sobe só uma posição.
3. Repita com outra praia: sobe mais uma, até encostar no nó fixo.
4. Observe o custo médio no painel cair à medida que as categorias favoritas sobem.

## Testes que comprovam as modificações

- `acesso direto move ao início (clássico, sem nós fixos)`
- `(M1) nós fixos nunca saem do topo e o "início" vem depois deles`
- `(M2) acesso indireto faz transposição e não ultrapassa nó fixo`
- `(M3) contadores e custo médio`
- `aleatório: lista continua sendo uma permutação válida` (500 acessos misturados, verificando o invariante a cada passo)
