# Alterações: Splay Tree como cache e correção do registro de rotações

Este documento descreve o que mudou nesta etapa, por que mudou e como
explicar cada mudança na apresentação.

## Resumo

| O que | Arquivo | Tipo |
|---|---|---|
| Splay Tree passa a ser o cache da rota `/api/local/<id>` | `estruturas/splay_tree.py`, `app.py` | funcionalidade |
| A tela informa se o local veio do cache ou da base | `static/script.js` | interface |
| Registro das rotações corrigido (um nome por passo) | `estruturas/splay_tree.py` | correção |
| Testes da Splay Tree atualizados: de 15 para 18 testes | `tests/test_estruturas.py` | testes |
| Afirmação "busca O(log n)" da Skip List corrigida com medições | `README.md`, apresentação, documento | documentação |
| README, apresentação (v1 e nova v2) e documento atualizados | `README.md`, `apresentacao/` | documentação |

---

## 1. Splay Tree como cache

### O problema

A Splay Tree guardava o histórico de locais acessados, mas **não era usada
para encontrar nada**. A rota `/api/local/<id>` achava o local por busca
linear na lista `LOCAIS` e só depois chamava `splay_tree.acessar()`. Sem a
árvore, a aplicação funcionaria igual. Ela era só uma visualização.

### A solução

A rota agora consulta a Splay Tree **primeiro**. A busca linear só acontece
quando o local não está na árvore.

```text
Clique em "Ver local"
        │
        ▼
splay_tree.acessar(id, buscar_na_base)
        │
        ├── está na árvore? ── sim ──► splay + contador++     (origem: "cache")
        │                              a base NÃO é consultada
        │
        └── não ──► buscar_na_base(id)  (busca linear, O(n))
                    inserir na árvore    (origem: "base")
                    capacidade > 15? remove a folha mais profunda
```

Nos dois casos o local termina na raiz.

### O que mudou no código

**`estruturas/splay_tree.py`**
- `acessar(chave, valor)` virou `acessar(chave, carregar)`.
  `carregar` é uma função que busca o local na base. Ela só é chamada na
  falha do cache.
- Novo atributo `ultima_origem`, que vale `"cache"` ou `"base"`.
- Se `carregar` devolver `None` (local inexistente), nada é inserido e
  `acessar` devolve `None`.
- Saiu o caso especial da "árvore vazia": `buscar()` já devolve `None`
  nesse caso, e `inserir()` cria a raiz.

**`app.py`**
- A busca linear foi para a função `buscar_na_base(local_id)`.
- `api_local` chama `splay_tree.acessar(local_id, buscar_na_base)` e
  devolve também o campo `"origem"`.

**`static/script.js`**
- O painel da Splay Tree mostra "Encontrado no cache (Splay Tree): a base
  não foi consultada" ou "Não estava no cache: buscado na base e inserido
  na árvore".

### Por que a Splay Tree serve como cache

- **Localidade temporal:** quem navega num mapa volta aos mesmos lugares.
  O splay deixa o que foi acessado há pouco perto da raiz, então reabrir um
  local recente custa poucas comparações.
- **Custo amortizado O(log k):** k é o número de nós da árvore (no máximo
  15). Isso é bem menor que a busca linear O(n) em 2.580 locais.
- **Tamanho limitado:** cache tem tamanho fixo. Isso justifica o limite de
  15 nós e o descarte da folha mais profunda, que já existiam.

### Limitações (para responder com honestidade)

- Com 2.580 locais, a diferença de tempo não é perceptível para o usuário.
  O ganho é de modelo: a estrutura passa a ter um papel real na aplicação.
- A falha no cache continua custando O(n). Uma busca por `id` em O(1) seria
  possível com um dicionário, mas a proposta do trabalho é usar as
  estruturas vistas em aula.

---

## 2. Correção do registro das rotações

### O problema

Em `_splay`, depois de um passo **zig-zig** ou **zig-zag**, o código
registrava também um `"zig"` para a segunda rotação. Um único passo
zig-zig aparecia na tela como `zig-zig → zig`. Isso está errado: zig-zig e
zig-zag são casos de **duas rotações** que contam como **um passo só**.

### A correção

Cada chamada de `_splay` registra **um** nome:
- uma variável `passo` começa como `"zig"`;
- vira `"zig-zig"` ou `"zig-zag"` se a rotação dupla acontecer;
- é registrada uma única vez, antes da última rotação.

A única exceção: quando só a primeira rotação de um zig-zig chega a
acontecer, porque a chave não existe e não há neto, o passo é registrado
como `"zig"`.

---

## 3. Testes

Rodar a partir da pasta `explorador-mapas`:

```powershell
python -m unittest discover tests -v
```

Resultado: **18 testes, todos passando**.

| Teste novo ou alterado | O que verifica |
|---|---|
| Todos os testes da Splay Tree | passam a chamar `acessar(chave, base)` com uma função de carga |
| `test_cache_so_consulta_a_base_na_falha` | a base é consultada só no primeiro acesso de cada local; o segundo vem do cache |
| `test_local_inexistente_nao_entra_na_arvore` | `carregar` devolve `None`, então nada é inserido |
| `test_registro_zig_zig` | uma árvore em linha gera exatamente `["zig-zig"]` |
| `test_registro_zig_e_zig_zag` | árvore montada à mão: gera `["zig-zag"]` e depois `["zig"]` |

---

## 4. Demonstração e números

As telas da demonstração foram recapturadas com `apresentacao/capturar_demo.py`.
Os sliders de distância passaram a ir até **500 km** (mudança feita no
`index.html`), então os números da tela inicial mudaram:

| Tela | Locais exibidos |
|---|---|
| Início (nível 0, até 500 km de João Pessoa) | 894 |
| Nível 4 (até 500 km) | 63 |
| Praias (até 500 km) | 96 |
| De 100 a 200 km | 247 |
| Salvador, até 30 km | 308 |

A Skip List continua com todos os 2.580 locais. O que mudou foi só o raio
máximo do filtro.

Sequência da demonstração da Splay Tree: seis locais novos (falhas no
cache) e depois o Farol do Cabo Branco de novo. O Farol, que estava a
quatro níveis de profundidade, vem do cache e sobe para a raiz com
`zig-zag → zig-zig`.

---

## 5. Correção de uma afirmação sobre a Skip List

O README, a apresentação e o documento diziam que, com o nível definido
pela relevância, "a busca continua O(log n)". Medimos o custo real em 500
buscas:

| Configuração | Passos em média | Pior caso |
|---|---|---|
| Nossa (relevância, 5 níveis) | 95,5 | 175 |
| Clássica (sorteio, 5 níveis) | 92,3 | 177 |
| Clássica (sorteio, 12 níveis) | 22,9 | 36 |
| Lista simples | 1.290 | 2.580 |

- **A relevância não piora a busca:** 95 contra 92 passos com sorteio e a
  mesma altura.
- **O que impede o O(log n) é o limite de 5 níveis** (`max_nivel = 4`),
  escolhido porque cada nível é um nível de zoom do mapa. Para 2.580
  locais, seriam necessários uns 11 níveis.
- Mesmo assim, a busca é cerca de 13 vezes mais barata que numa lista
  simples.

O código não mudou. Só o texto foi corrigido no README, na apresentação e
no documento. Se quiserem o O(log n) de volta, basta aumentar `MAX_NIVEL`
em `app.py` (e o máximo do slider de nível em `index.html`). Os níveis de
zoom passariam a ter outros tamanhos.

---

## 6. Como explicar em uma frase

> "A Splay Tree é o cache dos locais que o usuário abriu: antes de procurar
> nos 2.580 locais, a aplicação procura na árvore. Como o splay mantém os
> locais recentes perto da raiz, reabrir um local é barato, e o limite de
> 15 nós com descarte da folha mais profunda faz o papel da política de
> substituição do cache."
