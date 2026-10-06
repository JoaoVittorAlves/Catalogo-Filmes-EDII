# Explorador de Mapas

Projeto da disciplina de Estrutura de Dados e Algoritmos II.

A aplicação permite visualizar uma base de 2.580 pontos de interesse do
Nordeste brasileiro (praias, museus, igrejas, parques, monumentos etc.).
As estruturas de dados são usadas tanto para organizar os dados quanto para
implementar funcionalidades visíveis ao usuário.

## Estruturas utilizadas

| Estrutura | Tipo | Papel na aplicação |
|---|---|---|
| Lista com Movimentação ao Início | linear | Categorias, na ordem das mais recentemente acessadas |
| Skip List | linear com níveis | Locais ordenados pela distância até um ponto de referência; os níveis controlam o detalhamento do mapa |
| Splay Tree (Árvore Afunilada) | hierárquica | Cache e histórico dos locais acessados; o último acessado fica na raiz |

### 1. Lista com Movimentação ao Início

Guarda as categorias de locais. Quando o usuário clica em uma categoria:

- ela é movida para o início da lista;
- o contador de acessos dela é incrementado;
- o mapa passa a mostrar só os locais da categoria.

Os botões aparecem na ordem da lista.

### 2. Skip List

**Chave:** `(distância em km até o ponto de referência, id)`.

- A distância é calculada com a fórmula de Haversine
  (`Local.distancia_km`).
- O `id` desempata locais à mesma distância.
- O ponto de referência começa no centro de João Pessoa. Ao clicar no mapa,
  o ponto muda e a Skip List é reconstruída: 2.580 inserções, em cerca de
  40 ms.

**Uso na interface:**

- o slider "Nível" escolhe qual nível da lista é exibido no mapa;
- os sliders "De/Até" escolhem o intervalo de distância.

### 3. Splay Tree

Funciona como **cache** dos locais acessados recentemente, com o `id` como
chave. Ao clicar em "Ver local":

1. a aplicação procura o local primeiro na Splay Tree;
2. se ele estiver lá (acerto no cache), a lista com os 2.580 locais não é
   consultada;
3. se não estiver (falha no cache), ele é buscado na lista completa, por
   busca linear, e inserido na árvore.

Nos dois casos o splay leva o local até a raiz. A interface mostra:

- se o local veio do cache ou da base;
- a árvore;
- o número de acessos de cada nó;
- as rotações feitas (zig, zig-zig, zig-zag).

## Modificações nos algoritmos clássicos

### Skip List: nível definido pela relevância

- **Na versão clássica,** o nível de cada nó é sorteado (moeda com p = 1/2).
- **Na nossa versão,** `inserir(chave, valor, nivel)` aceita um nível fixo.
  Sem esse parâmetro, o sorteio clássico continua funcionando.
- **Como o nível é escolhido** (`definir_niveis_por_relevancia` em
  `app.py`):
  - os locais são ordenados pela relevância, que é o número de Wikipédias
    com artigo sobre o local;
  - os 50% mais relevantes vão ao nível 1 ou acima;
  - os 25% mais relevantes, ao nível 2 ou acima;
  - os 12,5% mais relevantes, ao nível 3 ou acima;
  - os 6,25% mais relevantes, ao nível 4.
- **Por quê:**
  - Mantemos a mesma proporção esperada da versão clássica (cada nível tem
    cerca de metade dos nós do nível abaixo: 2580 → 1290 → 645 → 323 →
    162).
  - O que muda é **quem** sobe: os níveis altos passam a funcionar como o
    "zoom" de um mapa real, mostrando só os locais mais importantes.
  - No modelo clássico, o nível 4 mostraria locais aleatórios.
- **Custo da busca (medido em 500 buscas):**

  | Configuração | Passos em média | Pior caso |
  |---|---|---|
  | Nossa (relevância, 5 níveis) | 95,5 | 175 |
  | Clássica (sorteio, 5 níveis) | 92,3 | 177 |
  | Clássica (sorteio, 12 níveis) | 22,9 | 36 |
  | Lista simples | 1.290 | 2.580 |

  Definir o nível pela relevância não piora a busca. O limite de 5 níveis
  (`max_nivel = 4`, um por nível de zoom) é que impede o O(log n): para
  2.580 locais seriam necessários uns 11 níveis.
- **Observação:** muitos locais têm a mesma relevância. O empate é
  resolvido pelo `id`.

### Skip List: busca por intervalo de distância em um nível

`buscar_intervalo(minimo, maximo, nivel)` funciona em duas etapas.

1. **Descida:** igual à busca clássica, desce do nível mais alto até o
   nível escolhido, procurando o último nó com distância menor que
   `minimo`. Seria O(log n) com níveis suficientes; com nossos 5 níveis,
   custa em média uns 95 passos (veja a tabela acima).
2. **Varredura:** percorre apenas o nível escolhido enquanto a distância
   for menor ou igual a `maximo`.

**Retorno:** os locais encontrados e o caminho da descida. Os nós desse
caminho aparecem destacados em amarelo na visualização da Skip List.

**Exemplo:** do centro de João Pessoa, buscar locais entre 100 e 200 km
visita 14 nós na descida. Uma lista simples precisaria passar pelos 164
locais mais próximos antes de chegar aos 100 km.

### Splay Tree: cache com capacidade limitada

1. **A árvore começa vazia e funciona como cache.**
   `acessar(chave, carregar)` recebe a função que busca o local na base:
   - se o local já está na árvore, faz o splay, incrementa o contador de
     acessos e **não chama** `carregar`;
   - se não está, chama `carregar(chave)` (busca linear em `app.py`) e
     insere o local (a inserção também deixa o nó na raiz).

   Isso usa a propriedade central da Splay Tree: o que foi acessado há
   pouco fica perto da raiz, então reabrir um local recente custa pouco.
2. **A capacidade é limitada** (15 nós). Ao passar do limite, a folha mais
   profunda é removida. A ideia vem da própria splay:
   - os nós acessados sobem para perto da raiz;
   - os nós não acessados são empurrados para baixo;
   - logo, a folha mais profunda é uma boa aproximação do "menos
     recentemente usado", sem precisar de nenhuma estrutura extra.

   Isso também mantém a árvore pequena o bastante para ser exibida na tela.
3. **Registro das rotações.** O splay anota cada passo (`zig`, `zig-zig`
   ou `zig-zag`) em `ultimas_rotacoes`, para mostrar ao usuário o que
   aconteceu. Um zig-zig ou zig-zag tem duas rotações, mas é registrado
   como um único passo.

### Lista com Movimentação ao Início

O algoritmo é o clássico. Foi acrescentado apenas um contador de acessos
por nó, exibido nos botões.

## Fonte de dados

**Fonte:** [Wikidata](https://www.wikidata.org), por meio do serviço SPARQL
(`https://query.wikidata.org/sparql`).

**Como a base é gerada:** o script `scripts/baixar_dados.py` faz uma
consulta por estado do Nordeste, buscando itens que:

- são de um dos tipos escolhidos (praia, museu, teatro, parque, praça,
  monumento, forte, igreja, catedral, capela, farol, atração turística,
  cachoeira, ilha, lago, laguna);
- têm coordenadas (P625);
- estão localizados (P131) no estado consultado.

**Campos salvos para cada local:**

- nome;
- categoria;
- cidade;
- estado;
- coordenadas;
- descrição;
- imagem (Wikimedia Commons, P18);
- relevância (número de sitelinks).

**Resultado:**

- 2.580 locais;
- 915 locais com imagem;
- por estado: BA 802, CE 515, PE 255, PI 225, MA 222, RN 203, PB 163,
  AL 108 e SE 87.

**Licenças:**

- dados do Wikidata: CC0;
- imagens: cada arquivo do Wikimedia Commons tem a própria licença,
  indicada na página do arquivo.

Para regenerar a base, rode a partir da pasta `explorador-mapas`:

```powershell
python scripts/baixar_dados.py
```

> Se aparecer erro de certificado SSL, instale o `certifi`
> (`pip install certifi`). O script usa esse pacote automaticamente.

## Estrutura do projeto

```text
explorador-mapas/
├── app.py                  # rotas Flask e montagem das estruturas
├── estruturas/
│   ├── lista_mov_inicio.py
│   ├── skip_list.py
│   └── splay_tree.py
├── modelos/
│   └── local.py            # Local + distância (Haversine)
├── dados/
│   └── locais.json         # base gerada a partir do Wikidata
├── scripts/
│   └── baixar_dados.py     # gera dados/locais.json
├── tests/
│   └── test_estruturas.py  # testes das três estruturas
├── templates/
│   └── index.html
├── static/
│   ├── style.css
│   └── script.js
├── PLANO.md                # plano desta etapa de desenvolvimento
└── README.md
```

## Como executar

Recomendado: Python 3.11 ou superior.

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install flask
python app.py
```

Depois abra `http://127.0.0.1:5000`.

## Testes

```powershell
python -m unittest discover tests -v
```

Os 18 testes verificam:

- **Lista com Movimentação ao Início:**
  - movimentação ao início;
  - ordem dos demais elementos;
  - contadores.
- **Skip List:**
  - nível 0 ordenado e completo;
  - cada nível é subconjunto do nível abaixo;
  - nível fixo;
  - `buscar_intervalo` igual a um filtro por força bruta.
- **Splay Tree:**
  - acessado vai para a raiz;
  - propriedade de árvore de busca;
  - capacidade respeitada;
  - contadores;
  - o cache só consulta a base quando o local não está na árvore;
  - local inexistente não entra na árvore;
  - registro de zig, zig-zig e zig-zag (um nome por passo).

## Processo de desenvolvimento

1. Projeto-base com as três estruturas na forma clássica e 12 locais de
   exemplo.
2. Testes isolados das estruturas e implementação das modificações
   descritas acima.
3. Script de coleta do Wikidata e geração da base do Nordeste.
4. Troca da chave provisória (`id`) da Skip List pela chave geográfica.
5. Novas rotas no `app.py` e filtros na interface:
   - busca por nome;
   - intervalo de distância;
   - categoria;
   - nível;
   - ponto de referência ao clicar no mapa.
6. Melhoria das visualizações:
   - Skip List com distância, total de nós e caminho destacado;
   - Splay Tree com contadores e rotações.
7. Splay Tree passa a funcionar como cache da rota `/api/local/<id>` e o
   registro das rotações é corrigido (detalhes em `ALTERACOES.md`).

O desenvolvimento contou com o auxílio de LLM (Claude), como permitido no
enunciado.
