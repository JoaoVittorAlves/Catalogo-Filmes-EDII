# 07 – Roteiro de apresentação

Duração sugerida: **12 a 15 minutos**. Cada bloco traz o que fazer na tela e o que dizer.

## Preparação (antes de começar)

- [ ] Rodar `python3 scripts/gerar_base_wikidata.py` em casa, com antecedência, para ter a base grande com fotos. Testar a página com ela.
- [ ] Levar também a versão só com a base semente, caso a internet da sala falhe (basta renomear `dados/locais.js`).
- [ ] Servir com `python3 -m http.server 8000` e abrir `http://localhost:8000`.
- [ ] Recarregar a página logo antes de apresentar, para começar com as estruturas no estado inicial.
- [ ] Deixar um terminal aberto com `npm test` e `npm run benchmark` já executados.
- [ ] Zoom do navegador em 90%, se a tela do projetor for pequena.

## 1. Abertura (1 min)

**Tela:** aplicação recém-carregada.

**Falar:** "Este é um explorador de locais do Brasil, com X mil locais vindos do Wikidata. Cada parte da tela é controlada por uma estrutura de dados que nós implementamos: o painel de categorias é uma lista com movimentação ao início, o mapa é uma lista com saltos e a pesquisa é uma árvore afunilada. O painel de baixo mostra essas estruturas funcionando ao vivo."

Apontar o cabeçalho: número de locais e tempo de montagem das estruturas.

## 2. Lista com movimentação ao início (3 min)

**Tela:** aba "Lista de categorias".

1. Clicar em **Ilhas** (última da lista).
   **Falar:** "Busca sequencial de 11 comparações; o nó foi desligado e religado no início. Mas repare: ele foi para a posição 1, e não para a 0. 'Todas as categorias' é um nó **fixo**: essa é nossa primeira modificação. O início lógico passa a ser logo depois do bloco de nós fixos."
2. Clicar em **Museus**, depois em **Praias**. Mostrar o painel esquerdo se reorganizando junto.
3. Abrir um **teatro** no mapa ou na lista à esquerda.
   **Falar:** "Abrir um local é um acesso **indireto** à categoria dele. Aqui usamos transposição: Teatros subiu só uma posição. Fizemos isso para que abrir locais variados não embaralhe o painel que o usuário acabou de organizar. É a segunda modificação: a política depende do tipo de acesso."
4. Apontar o **custo médio** no painel esquerdo.

## 3. Lista com saltos (4 min)

**Tela:** aba "Lista com saltos", categoria "Todas".

1. **Falar:** "Todos os locais estão no nível 0 desta lista, ordenados pela distância até a mira. Cada ponto da visão geral é um nó. O tamanho do ponto no mapa é a altura do nó."
2. Mover o **nível de detalhe** de 0 até 5, devagar.
   **Falar:** "Os níveis da lista com saltos viraram os níveis de detalhe do mapa. Para isso, mudamos o sorteio da altura: na versão clássica é cara ou coroa, então o nível 5 seria uma amostra aleatória. Na nossa versão, a chance de subir depende da relevância do local, e os muito famosos têm uma altura mínima garantida. Por isso, no nível alto sobram as capitais e os pontos conhecidos."
3. Arrastar a **mira** para outra cidade.
   **Falar:** "Mudar a origem reconstrói a lista com as novas distâncias. Mas os mesmos locais continuam em cada nível: o sorteio usa uma semente fixa por local, então a altura é uma propriedade do local, e não da última reconstrução."
4. Colocar a **distância mínima** em ~300 km e a máxima em ~800 km.
   **Falar:** "A consulta do mapa é uma modificação da busca: em vez de descer até o nível 0, ela para no nível de detalhe escolhido e percorre só aquele nível. O texto mostra: tantas comparações para descer e só tantos nós percorridos. O custo acompanha o tamanho da resposta, e não o tamanho da base."
5. Abrir um local e mostrar o **caminho amarelo** na visão geral e no detalhe das torres.

## 4. Árvore afunilada (4 min)

**Tela:** aba "Árvore afunilada", profundidade 3.

1. **Falar:** "Todos os nomes estão numa árvore binária de busca. Ela foi construída balanceada a partir dos nomes ordenados: inserir milhares de nomes em ordem numa splay tree gera uma lista de altura n. Essa é uma das modificações."
2. Digitar **"rio"** na pesquisa.
   **Falar:** "A busca por prefixo acha o menor nome maior ou igual a 'rio', faz **um único** splay nele e pega os demais por sucessor em ordem. Veja a animação: zig-zag, zig-zig..."
3. Clicar em um resultado e depois em outros dois locais no mapa.
   **Falar:** "Cada clique é um splay completo até a raiz. Repare que o topo da árvore vira o histórico de navegação: os três locais que abrimos estão aqui em cima."
4. Passar o mouse sobre vários pontos do mapa.
   **Falar:** "Passar o mouse é um interesse fraco, então fazemos um splay **parcial**, de um passo só. Se fosse completo, varrer o mapa com o mouse destruiria o histórico. No benchmark, depois de passar o mouse sobre 300 locais, os favoritos ficaram na profundidade 5,7 com o parcial e foram para 12 com o completo."
5. Apontar na ficha do local a **profundidade** e a **ordem alfabética**, calculada com o tamanho de subárvore guardado em cada nó.

## 5. Ideia que une tudo (1 min)

**Falar:** "As três estruturas seguem o mesmo princípio: **interesse forte reorganiza muito; interesse fraco reorganiza pouco**. Na lista de categorias, clique é mover ao início e abrir um local é transposição. Na árvore, clique é splay completo e mouse é splay parcial. Na lista com saltos, a relevância decide quanto cada local sobe."

## 6. Testes e experimentos (1–2 min)

**Tela:** terminal.

1. `npm test`: "29 testes; cada modificação tem pelo menos um teste próprio, comparando com uma solução de força bruta quando faz sentido."
2. `npm run benchmark`: mostrar três números.
   - Consulta do mapa no nível 6: cerca de 0,006 ms, contra 4,7 ms percorrendo tudo.
   - Altura inicial da árvore: 15, contra 49.999.
   - Favoritos depois de passar o mouse: 5,7 contra 12.
3. Mostrar o custo com honestidade: "A modificação da lista com saltos tem um preço: a busca exata faz cerca de 44 comparações, contra 31 na clássica. Continua O(log n); trocamos uma constante pela utilidade dos níveis."

## Perguntas prováveis

**"Por que não usar uma AVL para os nomes?"**
A AVL garantiria O(log n) no pior caso, mas não traria o comportamento de histórico: na splay tree, os locais acessados recentemente ficam perto da raiz e são mais baratos de acessar de novo. Além disso, o topo da árvore é exibido na interface como esse histórico.

**"O splay parcial não quebra a análise amortizada?"**
A garantia amortizada vale para a sequência de acessos com splay completo. Os parciais são só um sinal de interesse e nunca são usados para localizar um item de fato. A árvore continua uma árvore de busca válida, porque só há rotações. Os testes verificam ordem, ponteiros de pai e tamanhos depois de centenas de splays parciais.

**"A promoção por relevância não desbalanceia a lista com saltos?"**
A probabilidade de promoção fica sempre entre 0,25 e 0,75, então o número esperado de níveis continua O(log n) e o de nós por nível decresce geometricamente. O piso afeta só os poucos locais muito relevantes (acima de 0,6) e acrescenta no máximo 3 níveis. O benchmark mostra a altura 16 contra 15 da clássica, com 50.000 locais.

**"Por que a lista de categorias é tão pequena?"**
Ela tem poucas entradas porque o objetivo é o comportamento: a ordem é a própria interface. A implementação é genérica e foi testada com sequências aleatórias longas.

**"De onde vêm os dados?"**
Do Wikidata, pelo script `gerar_base_wikidata.py`: locais do Brasil com coordenadas, descrição e foto do Commons. A relevância é o logaritmo do número de artigos em Wikipédias, normalizado.
