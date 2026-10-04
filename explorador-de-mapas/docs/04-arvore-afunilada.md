# 04 – Árvore Afunilada (Splay Tree)

Arquivo: `src/estruturas/ArvoreAfunilada.js` · Testes: `testes/arvore-afunilada.test.js`

## Papel na aplicação

É o **índice textual**: todos os locais ficam numa árvore binária de busca ordenada pelo nome normalizado (minúsculas, sem acentos). Ela atende a pesquisa por nome e o "abrir local".

Como cada acesso leva o local à raiz, o **topo da árvore é, literalmente, o histórico de navegação**: os locais abertos por último estão perto da raiz. A aba "Árvore afunilada" desenha esse topo e anima as rotações a cada acesso.

A chave é `"nome normalizado" + "\0" + id`. O caractere `\0` é menor que qualquer letra, então "rio\0..." vem antes de "rio branco\0...", e nomes repetidos ficam distintos pelo id.

## O algoritmo clássico (splay ascendente)

Depois de acessar o nó x, aplicam-se passos até x virar a raiz. Sendo p o pai de x e g o avô:

| Caso | Situação | Ação |
|---|---|---|
| **zig** | p é a raiz | rotação simples de x |
| **zig-zig** | x e p são filhos do mesmo lado | rotaciona p sobre g, depois x sobre p |
| **zig-zag** | x e p são filhos de lados opostos | rotaciona x sobre p, depois x sobre g |

```
splay(x):
    enquanto x.pai ≠ nulo:
        p ← x.pai; g ← p.pai
        se g = nulo:                         rotacionar(x)              # zig
        senão se (g.esq = p) = (p.esq = x):  rotacionar(p); rotacionar(x)  # zig-zig
        senão:                               rotacionar(x); rotacionar(x)  # zig-zag
```

A busca faz o splay no nó encontrado ou, se a chave não existir, no último nó visitado. A inserção faz o splay no novo nó, e a remoção leva o nó à raiz e junta as duas subárvores. O custo **amortizado** é O(log n) por operação (análise de potencial de Sleator e Tarjan). A estrutura também tem a propriedade do **conjunto de trabalho**: acessar um elemento usado recentemente é barato, o que combina com a navegação por mapas.

A implementação usa ponteiros para o pai, o que permite identificar os três casos sem recursão.

## Modificações

### A1 – Splay parcial (limitado a k passos)

**Problema.** Na interface, passar o mouse sobre um ponto mostra o nome dele e indica um interesse fraco. Se cada passagem do mouse fizesse um splay completo, arrastar o cursor pelo mapa levaria dezenas de locais aleatórios à raiz e destruiria o histórico construído pelos cliques.

**Modificação.** `_splay(x, maxPassos)` para depois de `maxPassos` passos (cada passo é um zig, zig-zig ou zig-zag inteiro, preservando a correção das rotações):

```
splay(x, maxPassos):
    passos ← 0
    enquanto x.pai ≠ nulo e passos < maxPassos:
        (zig | zig-zig | zig-zag como no clássico)
        passos ← passos + 1
```

| Interação | Chamada | Efeito |
|---|---|---|
| clique (interesse forte) | `buscar(chave)` | splay completo: vai à raiz |
| mouse por cima (interesse fraco) | `buscar(chave, { maxPassos: 1 })` | sobe um passo (1 ou 2 níveis) |

A árvore continua sendo uma árvore de busca válida a cada passo, porque só rotações são usadas. A garantia amortizada do splay completo não vale para os acessos parciais, mas eles são só um sinal de interesse: o local nunca precisa ser encontrado por eles. O benefício medido aparece em [06-experimentos.md](06-experimentos.md): depois de passar o mouse sobre 300 locais aleatórios, os 50 favoritos continuam na profundidade média 5,7 com o splay parcial, contra 12,0 com o splay completo.

É a mesma ideia da política híbrida da lista de categorias (M2): o acesso forte reorganiza muito e o acesso fraco reorganiza pouco.

### A2 – Busca por prefixo com um único splay

**Problema.** O autocompletar precisa de todos os nomes que começam com o texto digitado. Fazer uma busca com splay para cada resultado custaria k splays e deixaria na raiz o último resultado, e não o mais provável.

**Modificação.**

```
buscarPorPrefixo(prefixo, limite):
    # 1. limite inferior: menor chave ≥ prefixo, descendo SEM reorganizar
    candidato ← nulo; x ← raiz
    enquanto x ≠ nulo:
        se x.chave ≥ prefixo: candidato ← x; x ← x.esq
        senão: x ← x.dir
    # 2. coleta por sucessor em ordem, enquanto o nome começar com o prefixo
    n ← candidato
    enquanto n ≠ nulo e |resultados| < limite e n.chave começa com prefixo:
        resultados.adiciona(n); n ← sucessor(n)
    # 3. um único splay: no primeiro resultado (ou no último nó visitado)
    splay(candidato)
```

O custo é a profundidade do limite inferior, mais um splay, mais k sucessores (O(k) amortizado ao percorrer em ordem). Os resultados já saem em ordem alfabética. O primeiro resultado vai para a raiz, e por isso a próxima tecla digitada (que refina o mesmo prefixo) tende a ser respondida perto da raiz.

### A3 – Nós aumentados com tamanho da subárvore

Cada nó guarda `tamanho` (número de nós da sua subárvore) e `acessos`. O tamanho é atualizado em O(1) dentro de cada rotação (`_atualizar` no pai e depois no nó que subiu) e ao longo do caminho de inserção. Ele permite:

- desenhar as subárvores recolhidas da visualização como "+N", indicando quantos locais estão escondidos ali;
- calcular a posição alfabética de um local (`posicao`) em O(profundidade), sem percorrer a árvore. A ficha do local mostra esse valor.

### A4 – Registro de rotações e fotografias para animação

Cada splay devolve a lista de passos `{ tipo, no, pai, avo }`, guardada em `ultimaOperacao`. Quando `capturarEtapas = p > 0`, o splay também guarda uma cópia do topo da árvore (até a profundidade p) antes do primeiro passo e depois de cada passo. Como `topo(p)` copia no máximo 2^(p+1) nós, isso custa O(2^p) por passo e independe de n.

A interface reproduz essas fotografias a cada 750 ms: o usuário vê o nó subir passo a passo, com a rotação atual destacada na lista de passos ("2. zig-zag: Recife sobe sobre Olinda e Natal"). A animação respeita a preferência do sistema por movimento reduzido.

### A5 – Construção inicial balanceada

**Problema.** A splay tree não tem regra de forma. Inserir milhares de nomes já ordenados (o caso natural ao carregar uma base) produz uma "lista" de altura n − 1. A primeira busca pelo menor nome custaria n comparações.

**Modificação.** `construirBalanceada(paresOrdenados)` monta a árvore pelo ponto médio, recursivamente, em O(n):

```
construir(ini, fim, pai):
    se ini > fim: devolve nulo
    meio ← (ini + fim) / 2
    n ← novo nó(pares[meio]); n.pai ← pai
    n.esq ← construir(ini, meio − 1, n)
    n.dir ← construir(meio + 1, fim, n)
    atualizar tamanho de n
    devolve n
```

O resultado tem altura ⌊log₂ n⌋ e é uma splay tree válida, porque qualquer árvore de busca é. A partir daí ela evolui só pelos acessos. Com 50.000 nomes, a altura inicial cai de 49.999 para 15.

## Complexidade

| Operação | Custo |
|---|---|
| `buscar`, `inserir`, `remover` (splay completo) | O(log n) amortizado |
| `buscar` com `maxPassos = k` | O(profundidade) para localizar + O(k) rotações |
| `buscarPorPrefixo` com k resultados | O(log n) amortizado + O(k) |
| `posicao` (rank) | O(profundidade), sem reorganizar |
| `construirBalanceada` | O(n) |
| `topo(p)` | O(2^p) |
| `altura` | O(n) (só para exibição) |

## O que mostrar na interface

1. Abra a aba "Árvore afunilada" e digite "praia". O primeiro nome em ordem alfabética sobe à raiz, com a animação dos passos.
2. Clique numa praia da lista de sugestões: veja de que profundidade ela veio e quantos zig, zig-zig e zig-zag foram necessários.
3. Abra dois ou três locais e observe que eles ficam juntos no topo, como um histórico.
4. Passe o mouse sobre alguns pontos do mapa: os nomes sobem só um passo. Desligue a opção no painel esquerdo e compare.

## Testes que comprovam as modificações

- `inserção e busca levam o nó à raiz (clássico)`
- `casos zig, zig-zig e zig-zag são identificados`
- `(A1) splay parcial sobe só k passos`
- `(A2) busca por prefixo devolve em ordem e faz um único splay`
- `(A3) tamanhos corretos e posição em ordem` (500 inserções e 300 splays parciais, verificando ordem, ponteiros de pai e tamanhos)
- `(A4) captura de etapas para animação`
- `(A5) construção balanceada tem altura logarítmica` (10.000 nós → altura 13)
- `remoção mantém a árvore válida`
- `topo() recolhe subárvores profundas`
