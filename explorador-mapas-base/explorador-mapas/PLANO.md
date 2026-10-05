# Plano de implementação: próximas etapas do Explorador de Mapas

Este documento descreve o que foi criado e alterado no projeto-base para
cumprir as "Próximas etapas sugeridas" do README.

## Contexto

O projeto-base (Flask + Leaflet) já tinha as três estruturas funcionando na
forma clássica:

- **Lista com Movimentação ao Início (MTF)** para as categorias;
- **Skip List** com chave provisória (`id`) e níveis sorteados;
- **Splay Tree** com todos os locais.

A base tinha apenas 12 locais. Como os algoritmos não tinham sido
modificados, a nota máxima seria 8,0. Esta etapa:

- amplia a base com dados reais do Wikidata (região Nordeste);
- troca a chave da Skip List por uma chave geográfica;
- implementa modificações justificadas nos algoritmos;
- melhora a visualização e adiciona filtros;
- cria testes.

Tudo foi mantido simples para que possa ser explicado na apresentação.

## Resumo dos arquivos

| Arquivo | Situação | O que muda |
|---|---|---|
| `scripts/baixar_dados.py` | **novo** | Baixa os locais do Wikidata e gera `dados/locais.json` |
| `dados/locais.json` | alterado | Base ampliada (Nordeste, milhares de locais) |
| `modelos/local.py` | alterado | Campo `relevancia` e distância por Haversine |
| `estruturas/skip_list.py` | alterado | Nível por relevância e busca por intervalo de distância |
| `estruturas/splay_tree.py` | alterado | Histórico com capacidade, contador de acessos e registro de rotações |
| `estruturas/lista_mov_inicio.py` | alterado | Contador de acessos por categoria |
| `app.py` | alterado | Ponto de referência, filtros e novas rotas |
| `templates/index.html` | alterado | Campo de busca, slider de raio e áreas de visualização |
| `static/script.js` | alterado | Filtros, árvore em SVG, Skip List destacada e clique no mapa |
| `static/style.css` | alterado | Estilos das novas visualizações |
| `tests/test_estruturas.py` | **novo** | Testes das três estruturas com `unittest` |
| `README.md` | alterado | Fonte de dados, chave, modificações, testes e processo |

---

## 1. Base de dados (etapas 2 e 8)

**`scripts/baixar_dados.py`** usa apenas a biblioteca padrão do Python
(`urllib` e `json`).

- Consulta o SPARQL do Wikidata (`https://query.wikidata.org/sparql`) uma vez
  por estado do Nordeste. Consultar estado por estado evita timeout.
- Tipos buscados e as categorias correspondentes:
  - praia → Praias;
  - museu → Museus e cultura;
  - parque → Parques;
  - praça → Praças;
  - monumento e forte → Monumentos históricos;
  - igreja → Igrejas;
  - farol e atração turística → Pontos turísticos;
  - cachoeira e ilha → Natureza.
- Campos salvos:
  - nome;
  - categoria;
  - cidade;
  - UF;
  - latitude e longitude;
  - descrição;
  - imagem (miniatura do Wikimedia Commons);
  - **`relevancia`**: número de sitelinks, ou seja, quantas Wikipédias têm
    artigo sobre o local.
- Remove itens duplicados e itens sem coordenada.
- Grava `dados/locais.json`. O arquivo fica no repositório, então a aplicação
  não depende de internet para carregar os dados.

**`modelos/local.py`** ganha o campo `relevancia` (opcional, com valor padrão 0).

## 2. Chave geográfica da Skip List (etapa 3)

- A distância é calculada pela fórmula de Haversine
  (`Local.distancia_km(lat, lon)`).
- **Chave = `(distância até o ponto de referência, id)`**. O `id` desempata
  locais que estão à mesma distância.
- O ponto de referência padrão é o centro de João Pessoa. O usuário pode
  **clicar no mapa** para escolher outro ponto, e a Skip List é reconstruída
  em O(n log n).

## 3. Modificações nos algoritmos (etapas 4 e 5)

### Skip List

1. **O nível vem da relevância, e não de um sorteio.**
   - `inserir(chave, valor, nivel=None)`: sem `nivel`, mantém o sorteio
     clássico; com `nivel`, usa o valor recebido.
   - Os locais são ordenados por relevância e recebem o nível por faixa:
     - os 50% mais relevantes chegam ao nível 1 ou acima;
     - os 25% mais relevantes, ao nível 2 ou acima;
     - os 12,5% mais relevantes, ao nível 3 ou acima;
     - os 6,25% mais relevantes, ao nível 4.
   - A proporção é a mesma da Skip List clássica com p = 0,5, então a busca
     continua O(log n). O que muda é **quem** sobe: os níveis altos funcionam
     como um "zoom" que mostra só os locais mais importantes.
2. **Busca por intervalo de distância no nível escolhido.**
   - `buscar_intervalo(d_min, d_max, nivel)` desce pelos níveis até o primeiro
     nó com distância ≥ `d_min`, em O(log n).
   - Depois percorre apenas o nível pedido até passar de `d_max`.
   - Devolve os locais encontrados e o **caminho percorrido**, que a interface
     destaca.

### Splay Tree

1. **A árvore começa vazia e funciona como histórico de acessos.**
   - `acessar(chave, valor)`: se o local já está na árvore, faz o splay e
     incrementa o contador de acessos.
   - Se o local não está na árvore, ele é inserido, e a inserção já leva o
     nó para a raiz.
2. **A capacidade é limitada, e a folha mais profunda é descartada.**
   - `SplayTree(capacidade=15)`. Quando a árvore passa do limite, a folha de
     maior profundidade é removida.
   - Justificativa: o splay sobe os nós acessados e empurra os pouco usados
     para baixo. Por isso a folha mais funda é uma boa aproximação do "menos
     recentemente usado", sem precisar de outra estrutura.
   - Isso também mantém a árvore pequena o bastante para ser desenhada na tela.
3. **As rotações ficam registradas.** O splay grava a sequência de casos
   aplicados (zig, zig-zig, zig-zag) em `ultimas_rotacoes`, e a interface
   mostra essa sequência.

### Lista MTF

- Ganha um contador de acessos por categoria, mostrado na interface. O
  algoritmo de movimentação ao início continua o clássico.

## 4. Backend (`app.py`)

- `construir_skip_list(ref_lat, ref_lon)` recalcula as chaves e insere os
  locais com o nível vindo da relevância.
- `GET /api/locais?nivel=&categoria=&busca=&raio=`:
  - chama `buscar_intervalo(0, raio, nivel)`;
  - filtra o resultado por categoria e por trecho do nome;
  - devolve os locais e o caminho percorrido.
- `POST /api/referencia` recebe `{lat, lon}` e reconstrói a Skip List.
- `GET /api/categoria/<c>` aciona a lista MTF e devolve as categorias com os
  contadores.
- `GET /api/local/<id>` aciona a Splay Tree e devolve o local, a árvore e as
  rotações aplicadas.
- `GET /api/skip-list` devolve os níveis truncados, porque o nível 0 tem
  milhares de nós.

## 5. Interface (etapas 6 e 7)

A interface continua com HTML, CSS e JS, como no projeto-base. Para manter
tudo simples, os arquivos existentes receberam apenas edições pontuais e não
foram reescritos.

- **Filtros:**
  - busca por nome;
  - intervalo de distância, com sliders "De" e "Até";
  - categoria;
  - nível da Skip List.
- **Por que existe o slider "De":** com o intervalo sempre começando em
  0 km, a descida da Skip List não andava. Com uma distância mínima, a
  interface mostra o salto em O(log n) até o início do intervalo.
- **Mapa:** usa `circleMarker` com renderização em canvas para suportar
  milhares de pontos. Um marcador vermelho mostra o ponto de referência.
- **Splay Tree:**
  - mantida a visualização em texto do projeto-base (sem SVG, por
    simplicidade);
  - cada nó mostra o número de acessos;
  - acima da árvore aparecem as rotações do último splay e o nó removido,
    quando houver.
- **Skip List:**
  - uma linha por nível, com a distância de cada nó e o total de nós;
  - mostra os primeiros 30 nós de cada nível;
  - os nós da descida da última busca aparecem em amarelo.
- **Categorias:**
  - aparecem na ordem da lista MTF, com o contador de acessos;
  - o botão "Todas" limpa o filtro.

## Observações da execução

- O Python desta máquina recusou o certificado do Wikidata (repositório de
  certificados desatualizado). Por isso o script usa o pacote `certifi`,
  quando ele está instalado.
- Foi criado o ambiente `.venv` (com `flask` e `certifi`), como o README
  recomenda.
- Foi adicionado um `.gitignore` para `.venv/` e `__pycache__/`.
- A base gerada tem 2.580 locais, dos quais 915 têm imagem.

## 6. Testes (etapas 1 e 9)

Os testes ficam em `tests/test_estruturas.py`, com `unittest`.

- **MTF:**
  - o elemento acessado vai para o início;
  - a ordem dos demais elementos se mantém;
  - o contador é incrementado.
- **Skip List:**
  - o nível 0 está ordenado e contém todos os locais;
  - cada nível é um subconjunto do nível abaixo;
  - um nó inserido com nível fixo fica nesse nível;
  - `buscar_intervalo` retorna o mesmo resultado de um filtro por força bruta.
- **Splay Tree:**
  - o elemento acessado fica na raiz;
  - a árvore mantém a propriedade de árvore binária de busca;
  - o tamanho nunca passa da capacidade;
  - os contadores de acesso estão corretos.

## 7. Documentação

O `README.md` será atualizado com:

- a fonte de dados e como regenerar a base;
- a definição da chave da Skip List;
- a seção "Modificações nos algoritmos";
- como rodar os testes;
- um breve registro do processo de desenvolvimento.

## Verificação

1. Rodar os testes:

   ```powershell
   python -m unittest discover tests
   ```

   Todos devem passar.
2. Gerar a base:

   ```powershell
   python scripts/baixar_dados.py
   ```

   O script deve gerar mais de 1.000 locais e imprimir a contagem por estado e
   categoria.
3. Rodar `python app.py`, abrir `http://127.0.0.1:5000` e conferir no
   navegador:
   - níveis: o nível 0 mostra todos os locais, e os níveis altos mostram só
     os mais relevantes;
   - raio e referência: o raio limita os pontos, e um clique no mapa muda o
     ponto de referência;
   - categorias: clicar em uma categoria a leva para o topo da lista e
     incrementa o contador;
   - árvore: selecionar locais faz a árvore crescer até 15 nós, com o local
     acessado na raiz.
